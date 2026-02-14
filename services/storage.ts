import { initializeApp } from 'firebase/app';
import { 
    getFirestore, 
    collection, 
    doc, 
    addDoc, 
    updateDoc, 
    deleteDoc,
    onSnapshot, 
    getDoc, 
    query, 
    orderBy 
} from 'firebase/firestore';
import { 
    Tournament, 
    Team, 
    Match, 
    MatchStatus, 
    ScoreState, 
    RegistrationStatus, 
    TournamentFormat, 
    RoundRobinType, 
    MatchDependency 
} from '../types';

// ==================================================================
// ⚙️ CONFIGURATION
// ==================================================================

// Hardcoded configuration provided by user
const firebaseConfig = {
  apiKey: "AIzaSyB8JUYv4EMtbe_K-8A8_nxdZu-VJXbVSgw",
  authDomain: "tournament-scoring-app-7dff5.firebaseapp.com",
  projectId: "tournament-scoring-app-7dff5",
  storageBucket: "tournament-scoring-app-7dff5.firebasestorage.app",
  messagingSenderId: "620668510760",
  appId: "1:620668510760:web:2d037b31f2034e3da64b1d"
};

let db: any = null;
let isMock = false;

try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    console.log("🔥 Connected to Firebase Firestore");
} catch (e) {
    console.error("Firebase Init Error:", e);
    console.warn("⚠️ Falling back to Mock Storage due to error");
    isMock = true;
}

export const isConfigured = !isMock;

// ------------------------------------------------------------------
// UTILS
// ------------------------------------------------------------------
// Firestore crashes if 'undefined' is passed in an object. 
// This helper strips undefined fields and converts undefined in arrays to null (via JSON behavior).
const cleanData = (data: any) => {
    return JSON.parse(JSON.stringify(data));
};

// ------------------------------------------------------------------
// MOCK STORAGE STATE (Fallback)
// ------------------------------------------------------------------
let mockTournaments: Tournament[] = [];
const listeners: ((data: Tournament[]) => void)[] = [];
const tournamentListeners: {id: string, cb: (data: Tournament | null) => void}[] = [];

const notifyMock = () => {
    listeners.forEach(l => l(JSON.parse(JSON.stringify(mockTournaments))));
    tournamentListeners.forEach(tl => {
        const t = mockTournaments.find(tour => tour.id === tl.id);
        tl.cb(t ? JSON.parse(JSON.stringify(t)) : null);
    });
};

// ------------------------------------------------------------------
// SHARED LOGIC
// ------------------------------------------------------------------
const genId = () => Math.random().toString(36).substr(2, 9);
const initialScore: ScoreState = {
  p1Points: '0', p2Points: '0', p1Games: 0, p2Games: 0, p1Sets: 0, p2Sets: 0,
  p1SetScores: [], p2SetScores: [], currentSet: 1, isTiebreak: false, history: []
};

const createMatchObject = (tId: string, name: string, round: number, stage: 'GROUP'|'BRACKET'|'PLAYOFF', timeOffset: number, court: string, t1?: string, t2?: string): Match => ({
    id: genId(), tournamentId: tId, team1Id: t1 || '', team2Id: t2 || '',
    stage, round, roundName: name, court,
    scheduledTime: new Date(new Date().getTime() + (timeOffset * 60 * 60 * 1000)).toISOString(),
    status: MatchStatus.SCHEDULED, score: JSON.parse(JSON.stringify(initialScore))
});

const parseDependency = (sourceStr: string): MatchDependency | undefined => {
    if (!sourceStr) return undefined;
    const parts = sourceStr.split(':');
    if (parts[0] === 'GROUP') return { sourceType: 'GROUP_RANK', sourceId: parts[1], rank: parseInt(parts[2]) };
    if (parts[0] === 'MATCH') return { sourceType: 'MATCH_WINNER', sourceId: parts[1] };
    return undefined;
};

export const calculateSchedule = (t: Tournament, knockoutConfig?: any[]): Match[] => {
  const acceptedTeams = (t.teams || []).filter(tm => tm.status === RegistrationStatus.ACCEPTED);
  
  let matches: Match[] = knockoutConfig ? [...(t.matches || [])] : [];
  
  // Safe court access
  const availableCourts = (t.courts && t.courts.length > 0) ? t.courts : ["Court 1"];

  // If no manual config, generate automatic structure
  if ((!knockoutConfig || knockoutConfig.length === 0)) {
      let timeOffset = 0;
      if (t.format === TournamentFormat.ROUND_ROBIN) {
        const groups: Record<string, Team[]> = {};
        if (t.rrType === RoundRobinType.GROUPS) {
            acceptedTeams.forEach(team => {
                const gId = team.groupId || "A";
                if (!groups[gId]) groups[gId] = [];
                groups[gId].push(team);
            });
        } else { groups["A"] = acceptedTeams; }
        
        const loops = t.rrType === RoundRobinType.DOUBLE ? 2 : 1;
        Object.keys(groups).sort().forEach(gId => {
            const groupTeams = groups[gId];
            for (let l = 0; l < loops; l++) {
                for (let i = 0; i < groupTeams.length; i++) {
                    for (let j = i + 1; j < groupTeams.length; j++) {
                        matches.push({
                            ...createMatchObject(t.id, `Group ${gId} - R${l+1}`, 1, 'GROUP', timeOffset, availableCourts[matches.length % availableCourts.length], groupTeams[i].id, groupTeams[j].id),
                            group: gId
                        });
                        timeOffset++;
                    }
                }
            }
        });
      } else {
          // Bracket Logic (Single/Double Elim)
          // Always generate full tree if teams exist
          if (acceptedTeams.length >= 2) {
              const rounds = Math.ceil(Math.log2(acceptedTeams.length));
              const totalBracketSize = Math.pow(2, rounds); 
              let currentRoundTeams: (string | undefined)[] = [...acceptedTeams.map(t => t.id)].sort(() => 0.5 - Math.random());
              while (currentRoundTeams.length < totalBracketSize) currentRoundTeams.push(undefined);
              
              let previousRoundMatches: Match[] = [];
              for (let r = 1; r <= rounds; r++) {
                  let roundName = r === rounds ? "Grand Final" : r === rounds - 1 ? "Semi Final" : r === rounds - 2 ? "Quarter Final" : `Round of ${Math.pow(2, rounds - r + 1)}`;
                  const matchesInRound = Math.pow(2, rounds - r);
                  const currentRoundObjs: Match[] = [];
                  for (let m = 0; m < matchesInRound; m++) {
                      let t1, t2, dep1, dep2;
                      if (r === 1) {
                          t1 = currentRoundTeams[m * 2];
                          t2 = currentRoundTeams[m * 2 + 1];
                      } else {
                          const m1 = previousRoundMatches[m * 2];
                          const m2 = previousRoundMatches[m * 2 + 1];
                          dep1 = { sourceType: 'MATCH_WINNER', sourceId: m1.id };
                          dep2 = { sourceType: 'MATCH_WINNER', sourceId: m2.id };
                      }
                      const newMatch = createMatchObject(t.id, roundName, r, 'BRACKET', timeOffset, availableCourts[0], t1, t2);
                      if (dep1) newMatch.team1Dependency = dep1 as MatchDependency;
                      if (dep2) newMatch.team2Dependency = dep2 as MatchDependency;
                      currentRoundObjs.push(newMatch);
                      matches.push(newMatch);
                      timeOffset++;
                      if (r > 1) {
                          previousRoundMatches[m * 2].nextMatchId = newMatch.id;
                          previousRoundMatches[m * 2 + 1].nextMatchId = newMatch.id;
                      }
                  }
                  previousRoundMatches = currentRoundObjs;
              }
          }
      }
  } 

  if (knockoutConfig && knockoutConfig.length > 0) {
      knockoutConfig.forEach(cfg => {
          matches.push({
            id: genId(), tournamentId: t.id, stage: 'PLAYOFF', round: 10, roundName: cfg.name, court: cfg.court,
            scheduledTime: cfg.scheduledTime, status: MatchStatus.SCHEDULED, score: JSON.parse(JSON.stringify(initialScore)),
            team1Dependency: parseDependency(cfg.t1Source), team2Dependency: parseDependency(cfg.t2Source)
          });
      });
  }
  return matches;
};

export const advanceBracket = (allMatches: Match[], completedMatch: Match, winnerId: string): Match[] => {
    return allMatches.map(m => {
        if (completedMatch.nextMatchId && m.id === completedMatch.nextMatchId) {
             if (m.team1Dependency?.sourceId === completedMatch.id) return { ...m, team1Id: winnerId };
             if (m.team2Dependency?.sourceId === completedMatch.id) return { ...m, team2Id: winnerId };
             if (!m.team1Id) return { ...m, team1Id: winnerId };
             if (!m.team2Id) return { ...m, team2Id: winnerId };
        }
        if (m.team1Dependency?.sourceId === completedMatch.id) return { ...m, team1Id: winnerId };
        if (m.team2Dependency?.sourceId === completedMatch.id) return { ...m, team2Id: winnerId };
        return m;
    });
};

const calculateStats = (teams: Team[], matches: Match[], format: TournamentFormat): Team[] => {
    if (format !== TournamentFormat.ROUND_ROBIN) return teams;
    let updatedTeams = teams.map(t => ({...t, matchesPlayed: 0, wins: 0, losses: 0, points: 0, setsWon: 0, setsLost: 0}));
    matches.filter(m => m.status === MatchStatus.COMPLETED && m.stage === 'GROUP').forEach(match => {
         const winner = updatedTeams.find(tm => tm.id === match.winnerTeamId);
         const loser = updatedTeams.find(tm => tm.id === (match.winnerTeamId === match.team1Id ? match.team2Id : match.team1Id));
         if (winner && loser) {
             winner.matchesPlayed!++; winner.wins!++; winner.points = (winner.points || 0) + 3;
             const wSets = match.winnerTeamId === match.team1Id ? match.score.p1Sets : match.score.p2Sets;
             const lSets = match.winnerTeamId === match.team1Id ? match.score.p2Sets : match.score.p1Sets;
             winner.setsWon = (winner.setsWon || 0) + wSets; winner.setsLost = (winner.setsLost || 0) + lSets;
             loser.matchesPlayed!++; loser.losses!++;
             loser.setsWon = (loser.setsWon || 0) + lSets; loser.setsLost = (loser.setsLost || 0) + wSets;
         }
    });
    return updatedTeams;
};

// ------------------------------------------------------------------
// EXPORT FUNCTIONS (HYBRID)
// ------------------------------------------------------------------

export const subscribeToTournaments = (cb: (data: Tournament[]) => void) => {
    if (db) {
        const q = query(collection(db, "tournaments"), orderBy("createdAt", "desc"));
        return onSnapshot(q, (snapshot: any) => {
            const tours = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Tournament));
            cb(tours);
        });
    } else {
        // Mock
        cb(JSON.parse(JSON.stringify(mockTournaments)));
        listeners.push(cb);
        return () => { const idx = listeners.indexOf(cb); if (idx > -1) listeners.splice(idx, 1); };
    }
};

export const subscribeToTournament = (id: string, cb: (data: Tournament | null) => void) => {
    if (db) {
        const docRef = doc(db, "tournaments", id);
        return onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                cb({ id: docSnap.id, ...(docSnap.data() as any) } as Tournament);
            } else {
                cb(null);
            }
        });
    } else {
        // Mock
        const t = mockTournaments.find(x => x.id === id) || null;
        cb(t ? JSON.parse(JSON.stringify(t)) : null);
        const listener = { id, cb };
        tournamentListeners.push(listener);
        return () => { const idx = tournamentListeners.indexOf(listener); if (idx > -1) tournamentListeners.splice(idx, 1); };
    }
};

export const createTournament = async (t: any) => {
    const newT: any = { 
        ...t, 
        teams: [], 
        matches: [], 
        status: 'ACTIVE', 
        createdAt: new Date().toISOString() 
    };
    if (db) {
        const docRef = await addDoc(collection(db, "tournaments"), cleanData(newT));
        return docRef.id;
    } else {
        newT.id = genId();
        mockTournaments = [newT, ...mockTournaments];
        notifyMock();
        return newT.id;
    }
};

export const deleteTournament = async (tId: string) => {
    if (db) {
        await deleteDoc(doc(db, "tournaments", tId));
    } else {
        mockTournaments = mockTournaments.filter(t => t.id !== tId);
        notifyMock();
    }
};

export const updateTournament = async (tId: string, data: Partial<Tournament>) => {
    if (db) {
        await updateDoc(doc(db, "tournaments", tId), cleanData(data));
    } else {
        const t = mockTournaments.find(x => x.id === tId);
        if (t) {
            Object.assign(t, data);
            notifyMock();
        }
    }
};

export const registerTeam = async (tId: string, team: any) => {
    const newTeam = { ...team, id: genId(), status: RegistrationStatus.PENDING, registeredAt: new Date().toISOString() };
    if (db) {
        const tRef = doc(db, "tournaments", tId);
        const snap = await getDoc(tRef);
        if (snap.exists()) {
            const tData = snap.data() as Tournament;
            await updateDoc(tRef, cleanData({ teams: [...tData.teams, newTeam] }));
        }
    } else {
        const t = mockTournaments.find(x => x.id === tId);
        if (t) { t.teams.push(newTeam); notifyMock(); }
    }
};

export const updateTeamStatus = async (tId: string, teamId: string, status: string) => {
    if (db) {
        const tRef = doc(db, "tournaments", tId);
        const snap = await getDoc(tRef);
        if (snap.exists()) {
            const tData = snap.data() as Tournament;
            const updatedTeams = tData.teams.map(tm => tm.id === teamId ? { ...tm, status: status as RegistrationStatus } : tm);
            await updateDoc(tRef, cleanData({ teams: updatedTeams }));
        }
    } else {
        const t = mockTournaments.find(x => x.id === tId);
        if (t) {
            t.teams = t.teams.map(tm => tm.id === teamId ? { ...tm, status: status as RegistrationStatus } : tm);
            notifyMock();
        }
    }
};

export const assignTeamGroup = async (tId: string, teamId: string, groupId: string) => {
    if (db) {
        const tRef = doc(db, "tournaments", tId);
        const snap = await getDoc(tRef);
        if (snap.exists()) {
            const tData = snap.data() as Tournament;
            const updatedTeams = tData.teams.map(tm => tm.id === teamId ? { ...tm, groupId } : tm);
            await updateDoc(tRef, cleanData({ teams: updatedTeams }));
        }
    } else {
        const t = mockTournaments.find(x => x.id === tId);
        if (t) {
            t.teams = t.teams.map(tm => tm.id === teamId ? { ...tm, groupId } : tm);
            notifyMock();
        }
    }
};

export const generateSchedule = async (tId: string, knockoutConfig?: any[]) => {
    if (db) {
        const tRef = doc(db, "tournaments", tId);
        const snap = await getDoc(tRef);
        if (snap.exists()) {
            const tData = snap.data() as Tournament;
            const matches = calculateSchedule(tData, knockoutConfig);
            await updateDoc(tRef, cleanData({ matches }));
        }
    } else {
        const t = mockTournaments.find(x => x.id === tId);
        if (t) {
            t.matches = calculateSchedule(t, knockoutConfig);
            notifyMock();
        }
    }
};

export const updateMatchDetails = async (tId: string, mId: string, updates: Partial<Match>) => {
    if (db) {
        const tRef = doc(db, "tournaments", tId);
        const snap = await getDoc(tRef);
        if (snap.exists()) {
            const tData = snap.data() as Tournament;
            const updatedMatches = tData.matches.map(m => m.id === mId ? { ...m, ...updates } : m);
            await updateDoc(tRef, cleanData({ matches: updatedMatches }));
        }
    } else {
        const t = mockTournaments.find(x => x.id === tId);
        if (t) {
            t.matches = t.matches.map(m => m.id === mId ? { ...m, ...updates } : m);
            notifyMock();
        }
    }
};

export const updateMatchScore = async (tId: string, mId: string, newScore: ScoreState, status: MatchStatus, winnerId?: string) => {
    if (db) {
        const tRef = doc(db, "tournaments", tId);
        const snap = await getDoc(tRef);
        if (snap.exists()) {
            const t = snap.data() as Tournament;
            let updatedMatches = t.matches.map(m => {
                if (m.id === mId) return { ...m, score: newScore, status, winnerTeamId: winnerId };
                return m;
            });
            const match = updatedMatches.find(m => m.id === mId);
            if (status === MatchStatus.COMPLETED && winnerId && match) {
                updatedMatches = advanceBracket(updatedMatches, match, winnerId);
            }
            const updatedTeams = calculateStats(t.teams, updatedMatches, t.format);
            await updateDoc(tRef, cleanData({ matches: updatedMatches, teams: updatedTeams }));
        }
    } else {
        const t = mockTournaments.find(x => x.id === tId);
        if (t) {
            let updatedMatches = t.matches.map(m => {
                if (m.id === mId) return { ...m, score: newScore, status, winnerTeamId: winnerId };
                return m;
            });
            const match = updatedMatches.find(m => m.id === mId);
            if (status === MatchStatus.COMPLETED && winnerId && match) {
                updatedMatches = advanceBracket(updatedMatches, match, winnerId);
            }
            const updatedTeams = calculateStats(t.teams, updatedMatches, t.format);
            t.matches = updatedMatches;
            t.teams = updatedTeams;
            notifyMock();
        }
    }
};

export const addRefereeTag = async (tId: string, mId: string, tag: string) => {
    if (db) {
        const tRef = doc(db, "tournaments", tId);
        const snap = await getDoc(tRef);
        if (snap.exists()) {
            const tData = snap.data() as Tournament;
            const updatedMatches = tData.matches.map(m => m.id === mId ? { ...m, refereeNotes: [...(m.refereeNotes || []), tag] } : m);
            await updateDoc(tRef, cleanData({ matches: updatedMatches }));
        }
    } else {
        const t = mockTournaments.find(x => x.id === tId);
        if (t) {
            t.matches = t.matches.map(m => m.id === mId ? { ...m, refereeNotes: [...(m.refereeNotes || []), tag] } : m);
            notifyMock();
        }
    }
};