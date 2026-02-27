import { ScoreState } from "../types";

const POINTS = ['0', '15', '30', '40'];

// Manual Clone helper to be safe
const cloneScore = (s: ScoreState): ScoreState => ({
    p1Points: s.p1Points,
    p2Points: s.p2Points,
    p1Games: s.p1Games,
    p2Games: s.p2Games,
    p1Sets: s.p1Sets,
    p2Sets: s.p2Sets,
    p1SetScores: [...(s.p1SetScores || [])],
    p2SetScores: [...(s.p2SetScores || [])],
    currentSet: s.currentSet,
    isTiebreak: s.isTiebreak,
    history: [...(s.history || [])]
});

export const addPoint = (currentScore: ScoreState, team: 1 | 2, playerIdx: 1 | 2): ScoreState => {
  const nextScore = cloneScore(currentScore);
  
  // Record history: T<TeamNumber>P<PlayerNumber>
  if (!nextScore.history) nextScore.history = [];
  nextScore.history.push(`T${team}P${playerIdx}`);

  // Helper to get opponent
  const opponent = team === 1 ? 2 : 1;
  const pPoints = team === 1 ? 'p1Points' : 'p2Points';
  const oPoints = opponent === 1 ? 'p1Points' : 'p2Points';
  
  const pGames = team === 1 ? 'p1Games' : 'p2Games';
  const oGames = opponent === 1 ? 'p1Games' : 'p2Games';

  const pSets = team === 1 ? 'p1Sets' : 'p2Sets';
  
  if (nextScore.isTiebreak) {
    // Tiebreak Logic: 1, 2, 3... First to 7, win by 2
    let pScore = parseInt(nextScore[pPoints]);
    let oScore = parseInt(nextScore[oPoints]);
    pScore++;
    nextScore[pPoints] = pScore.toString();
    
    if (pScore >= 7 && pScore - oScore >= 2) {
      // Win Set (Tiebreak)
      nextScore[pGames]++; // Increment games to show 7-6 or similar
      
      // SAVE SET SCORE BEFORE RESET
      if (!nextScore.p1SetScores) nextScore.p1SetScores = [];
      if (!nextScore.p2SetScores) nextScore.p2SetScores = [];
      nextScore.p1SetScores.push(nextScore.p1Games);
      nextScore.p2SetScores.push(nextScore.p2Games);

      nextScore[pSets]++;
      
      // Reset for next set
      resetSet(nextScore);
    }
    return nextScore;
  }

  // Normal Game Logic
  const currentP = nextScore[pPoints];
  const currentO = nextScore[oPoints];

  if (currentP === '40') {
    if (currentO === '40') {
      // Deuce -> Advantage
      nextScore[pPoints] = 'AD';
    } else if (currentO === 'AD') {
      // Opponent had Advantage -> Back to Deuce
      nextScore[oPoints] = '40';
    } else {
      // Win Game
      winGame(nextScore, team);
    }
  } else if (currentP === 'AD') {
    // Win Game
    winGame(nextScore, team);
  } else {
    // 0 -> 15 -> 30 -> 40
    const idx = POINTS.indexOf(currentP);
    nextScore[pPoints] = POINTS[idx + 1];
  }

  return nextScore;
};

const winGame = (score: ScoreState, team: 1 | 2) => {
  score.p1Points = '0';
  score.p2Points = '0';
  
  const pGames = team === 1 ? 'p1Games' : 'p2Games';
  const oGames = team === 1 ? 'p2Games' : 'p1Games';
  const pSets = team === 1 ? 'p1Sets' : 'p2Sets';

  score[pGames]++;

  const myGames = score[pGames];
  const otherGames = score[oGames];

  // Set Win Logic: First to 6, win by 2
  if (myGames === 6 && otherGames <= 4) {
    recordSetHistory(score);
    score[pSets]++;
    resetSet(score);
  } else if (myGames === 7) {
     recordSetHistory(score);
     score[pSets]++;
     resetSet(score);
  } else if (myGames === 6 && otherGames === 6) {
    // Tiebreaker trigger
    score.isTiebreak = true;
    score.p1Points = '0';
    score.p2Points = '0'; // Tiebreak points start at 0 (displayed as integers usually)
  }
};

const recordSetHistory = (score: ScoreState) => {
    if (!score.p1SetScores) score.p1SetScores = [];
    if (!score.p2SetScores) score.p2SetScores = [];
    score.p1SetScores.push(score.p1Games);
    score.p2SetScores.push(score.p2Games);
};

const resetSet = (score: ScoreState) => {
  score.p1Games = 0;
  score.p2Games = 0;
  score.p1Points = '0';
  score.p2Points = '0';
  score.currentSet++;
  score.isTiebreak = false;
};