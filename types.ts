export enum TournamentFormat {
  SINGLE_ELIMINATION = 'SINGLE_ELIMINATION',
  DOUBLE_ELIMINATION = 'DOUBLE_ELIMINATION',
  ROUND_ROBIN = 'ROUND_ROBIN'
}

export enum RoundRobinType {
  SINGLE = 'SINGLE', // Play once
  DOUBLE = 'DOUBLE', // Play twice
  GROUPS = 'GROUPS'  // Divide into groups
}

export enum SkillLevel {
  NEWCOMER = 'NEWCOMER',
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
  PROFESSIONAL = 'PROFESSIONAL'
}

export enum MatchStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED'
}

export enum RegistrationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED'
}

export interface Player {
  name: string;
  phone: string;
  email: string;
  photoUrl?: string;
  verified: boolean;
}

export interface Team {
  id: string;
  name: string;
  player1: Player;
  player2: Player;
  status: RegistrationStatus;
  registeredAt: string;
  groupId?: string; // "A", "B", etc.
  // Stats
  matchesPlayed?: number;
  wins?: number; 
  losses?: number; 
  points?: number;
  setsWon?: number;
  setsLost?: number;
}

export interface ScoreState {
  p1Points: string;
  p2Points: string;
  p1Games: number;
  p2Games: number;
  p1Sets: number;
  p2Sets: number;
  p1SetScores: number[]; // History of sets: [6, 4, 2]
  p2SetScores: number[]; // History of sets: [4, 6, 6]
  currentSet: number;
  isTiebreak: boolean;
  history: string[];
}

export interface MatchDependency {
  sourceType: 'MATCH_WINNER' | 'MATCH_LOSER' | 'GROUP_RANK';
  sourceId: string; // Match ID or Group ID (e.g., "A")
  rank?: number; // For Group rank (e.g., 1 for 1st place)
}

export interface Match {
  id: string;
  tournamentId: string;
  team1Id?: string;
  team2Id?: string;
  stage?: 'GROUP' | 'PLAYOFF' | 'BRACKET';
  group?: string; 
  round: number; 
  roundName: string;
  court: string;
  scheduledTime: string;
  status: MatchStatus;
  score: ScoreState;
  winnerTeamId?: string;
  refereeNotes?: string[];
  
  // Progression Logic
  nextMatchId?: string; // Where the winner goes
  loserNextMatchId?: string; // Where the loser goes (Double Elim)
  
  // Dependency (How do teams get HERE?)
  team1Dependency?: MatchDependency;
  team2Dependency?: MatchDependency;
}

export interface Tournament {
  id: string;
  name: string;
  format: TournamentFormat;
  rrType?: RoundRobinType; 
  groupSize?: number; // e.g. 4 teams per group
  skillLevel: SkillLevel;
  maxTeams: number;
  entryFee: number;
  currency: string; // 'PKR' | 'USD'
  venue: string;
  organizer?: string;
  prizeMoney: number;
  refereePasscode: string;
  courts: string[]; 
  registrationDeadline: string;
  teams: Team[];
  matches: Match[];
  sponsors?: string[]; // Array of base64 logos
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED';
}

export interface GlobalState {
  tournaments: Tournament[];
  currentTournamentId: string | null;
}