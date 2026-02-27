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
    getDocs,
    writeBatch,
    query, 
    orderBy,
    deleteField
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
    MatchDependency,
    Sponsor
} from '../types';

// ==================================================================
// ⚙️ CONFIGURATION
// ==================================================================

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
const cleanData = (data: any) => {
    const seen = new WeakMap();

    const clone = (obj: any): any => {
        if (obj === null || typeof obj !== 'object') {
            return obj === undefined ? null : obj;
        }
        if (obj instanceof Date) return obj.toISOString();
        if (obj instanceof RegExp) return obj.toString();

        // Safety blocks
        if (obj.nodeType || obj.$$typeof || (obj.constructor && obj.constructor.name && (obj.constructor.name.startsWith('_') || obj.constructor.name === 'SyntheticBaseEvent'))) {
            return null; 
        }

        if (seen.has(obj)) return null;
        seen.set(obj, true);

        if (Array.isArray(obj)) return obj.map(item => clone(item));

        const output: any = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                const val = clone(obj[key]);
                if (val !== undefined) output[key] = val;
            }
        }
        return output;
    };

    return clone(data);
};

const deepClone = <T>(obj: T): T => {
    return cleanData(obj) as T;
};

// ------------------------------------------------------------------
// MOCK STORAGE STATE
// ------------------------------------------------------------------
let mockTournaments: Tournament[] = [];
const listeners: ((data: Tournament[]) => void)[] = [];
const tournamentListeners: {id: string, cb: (data: Tournament | null) => void}[] = [];

const notifyMock = () => {
    const safeData = cleanData(mockTournaments);
    listeners.forEach(l => l(safeData));
    tournamentListeners.forEach(tl => {
        const t = safeData.find((tour: Tournament) => tour.id === tl.id);
        tl.cb(t ? t : null);
    });
};

const genId = () => Math.random().toString(36).substr(2, 9);
const initialScore: ScoreState = {
  p1Points: '0', p2Points: '0', p1Games: 0, p2Games: 0, p1Sets: 0, p2Sets: 0,
  p1SetScores: [], p2SetScores: [], currentSet: 1, isTiebreak: false, history: []
};

const createMatchObject = (tId: string, name: string, round: number, stage: 'GROUP'|'BRACKET'|'PLAYOFF', timeOffset: number, court: string, t1?: string, t2?: string): Match => ({
    id: genId(), tournamentId: tId, team1Id: t1 || '', team2Id: t2 || '',
    stage, round, roundName: name, court,
    scheduledTime: new Date(new Date().getTime() + (timeOffset * 60 * 60 * 1000)).toISOString(),
    status: MatchStatus.SCHEDULED, score: deepClone(initialScore)
});

// ------------------------------------------------------------------
// HELPERS
// ------------------------------------------------------------------

// Helper to save sponsors to sub-collection
const saveSponsorsToSubCollection = async (tId: string, sponsors: Sponsor[]) => {
    if (!db) return;
    const batch = writeBatch(db);
    const sponsorsCollection = collection(db, "tournaments", tId, "sponsors");
    
    // Get existing to find deletions
    const existingSnaps = await getDocs(sponsorsCollection);
    const existingIds = existingSnaps.docs.map(d => d.id);
    const newIds = sponsors.map(s => s.id);

    // Delete removed sponsors
    existingSnaps.docs.forEach(d => {
        if (!newIds.includes(d.id)) {
            batch.delete(d.ref);
        }
    });

    // Set/Update new sponsors
    sponsors.forEach(s => {
        // Ensure ID
        const id = s.id || genId();
        const ref = doc(sponsorsCollection, id);
        batch.set(ref, { ...s, id }, { merge: true });
    });

    await batch.commit();
};

// ------------------------------------------------------------------
// EXPORT FUNCTIONS
// ------------------------------------------------------------------

export const subscribeToTournaments = (cb: (data: Tournament[]) => void) => {
    if (db) {
        const q = query(collection(db, "tournaments"), orderBy("createdAt", "desc"));
        return onSnapshot(q, (snapshot: any) => {
            // Note: List view doesn't fetch heavy sponsor data (subcollection) for performance
            const tours = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Tournament));
            cb(tours);
        });
    } else {
        const safeData = cleanData(mockTournaments);
        cb(safeData);
        listeners.push(cb);
        return () => { const idx = listeners.indexOf(cb); if (idx > -1) listeners.splice(idx, 1); };
    }
};

export const subscribeToTournament = (id: string, cb: (data: Tournament | null) => void) => {
    if (db) {
        let tData: Tournament | null = null;
        let sData: Sponsor[] = [];
        
        // Listener 1: Main Tournament Data
        const unsubT = onSnapshot(doc(db, "tournaments", id), (snap) => {
            if (snap.exists()) {
                tData = { id: snap.id, ...snap.data() } as Tournament;
                // If matches are in the main doc, use them initially
                if (tData.matches) {
                    // We will overwrite this with subcollection data if available
                }
                emit();
            } else {
                tData = null;
                emit();
            }
        });

        // Listener 2: Sponsors Subcollection
        const unsubS = onSnapshot(collection(db, "tournaments", id, "sponsors"), (snap) => {
            sData = snap.docs.map(d => ({ id: d.id, ...d.data() } as Sponsor));
            emit();
        });

        // Listener 3: Matches Subcollection (Real-time optimization)
        const unsubM = onSnapshot(collection(db, "tournaments", id, "matches"), (snap) => {
            const matches = snap.docs.map(d => ({ id: d.id, ...d.data() } as Match));
            if (matches.length > 0) {
                // If we have subcollection matches, they take precedence
                if (tData) {
                    tData.matches = matches;
                    emit();
                }
            }
        });

        const emit = () => {
            if (tData) {
                // Combine main data with fetched sponsors
                // Note: tData.matches might be from main doc or subcollection (handled above)
                cb({ ...tData, sponsors: sData });
            } else {
                cb(null);
            }
        };

        return () => { unsubT(); unsubS(); unsubM(); };
    } else {
        const t = mockTournaments.find(x => x.id === id) || null;
        cb(t ? cleanData(t) : null);
        const listener = { id, cb };
        tournamentListeners.push(listener);
        return () => { const idx = tournamentListeners.indexOf(listener); if (idx > -1) tournamentListeners.splice(idx, 1); };
    }
};

export const createTournament = async (t: any) => {
    // Extract sponsors and matches to save separately
    const { sponsors, matches, ...mainData } = t;

    const newT: any = { 
        ...mainData, 
        teams: [], 
        // We don't save matches in the main doc anymore to keep it light
        matches: [], 
        status: 'ACTIVE', 
        createdAt: new Date().toISOString() 
    };

    if (db) {
        // Save main doc
        const docRef = await addDoc(collection(db, "tournaments"), cleanData(newT));
        
        // Save sponsors to subcollection
        if (sponsors && sponsors.length > 0) {
            await saveSponsorsToSubCollection(docRef.id, sponsors);
        }

        // Save matches to subcollection (if any generated initially)
        if (matches && matches.length > 0) {
            const batch = writeBatch(db);
            const matchesCol = collection(db, "tournaments", docRef.id, "matches");
            matches.forEach((m: Match) => {
                const mRef = doc(matchesCol, m.id);
                batch.set(mRef, cleanData(m));
            });
            await batch.commit();
        }

        return docRef.id;
    } else {
        newT.id = genId();
        // For mock, we keep sponsors and matches inline
        if (sponsors) newT.sponsors = sponsors;
        if (matches) newT.matches = matches;
        mockTournaments = [newT, ...mockTournaments];
        notifyMock();
        return newT.id;
    }
};

export const updateTournament = async (tId: string, data: Partial<Tournament>) => {
    // Extract sponsors and matches
    const { sponsors, matches, ...mainData } = data;

    if (db) {
        const tRef = doc(db, "tournaments", tId);
        
        // Update main doc
        if (Object.keys(mainData).length > 0) {
            // Also explicitly delete 'sponsors' field if it exists on the main doc to cleanup legacy data
            const cleanUpdate = { ...cleanData(mainData), sponsors: deleteField() };
            await updateDoc(tRef, cleanUpdate);
        } else {
            // Even if no main data update, ensure we clean legacy sponsors
             await updateDoc(tRef, { sponsors: deleteField() });
        }

        // Handle Sponsors Subcollection update if sponsors array is provided
        if (sponsors) {
            await saveSponsorsToSubCollection(tId, sponsors);
        }

        // Handle Matches Subcollection update if matches array is provided (e.g. from generateSchedule or manual update)
        // Note: Usually we update specific matches, but if a full list is provided, we might want to sync it.
        // For now, let's assume updateTournament is mostly for settings/metadata.
    } else {
        const t = mockTournaments.find(x => x.id === tId);
        if (t) {
            Object.assign(t, mainData);
            if (sponsors) t.sponsors = sponsors;
            if (matches) t.matches = matches;
            notifyMock();
        }
    }
};

export const deleteTournament = async (tId: string) => {
    if (db) {
        await deleteDoc(doc(db, "tournaments", tId));
        // Note: Subcollections are not automatically deleted in Firestore. 
    } else {
        mockTournaments = mockTournaments.filter(t => t.id !== tId);
        notifyMock();
    }
};

export const registerTeam = async (tId: string, team: any) => {
    const newTeam = { ...team, id: genId(), status: RegistrationStatus.PENDING, registeredAt: new Date().toISOString() };
    if (db) {
        const tRef = doc(db, "tournaments", tId);
        const snap = await getDoc(tRef);
        if (snap.exists()) {
            const tData = snap.data() as Tournament;
            await updateDoc(tRef, cleanData({ teams: [...(tData.teams||[]), newTeam] }));
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
            const updatedTeams = (tData.teams || []).map(tm => tm.id === teamId ? { ...tm, status: status as RegistrationStatus } : tm);
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
            const updatedTeams = (tData.teams || []).map(tm => tm.id === teamId ? { ...tm, groupId } : tm);
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
            // Need to fetch existing matches from subcollection to respect existing state if needed
            // But generateSchedule usually overwrites.
            const matches = calculateSchedule(tData, knockoutConfig);
            
            // Save to subcollection
            const batch = writeBatch(db);
            const matchesCol = collection(db, "tournaments", tId, "matches");
            
            // Delete existing (optional, but good for clean regen)
            const existing = await getDocs(matchesCol);
            existing.forEach(d => batch.delete(d.ref));

            matches.forEach(m => {
                const mRef = doc(matchesCol, m.id);
                batch.set(mRef, cleanData(m));
            });
            
            await batch.commit();
            
            // Update main doc to clear legacy matches array if it exists
            await updateDoc(tRef, { matches: [] });
        }
    } else {
        const t = mockTournaments.find(x => x.id === tId);
        if (t) {
            t.matches = calculateSchedule(t, knockoutConfig);
            notifyMock();
        }
    }
};

// ...

export const updateMatchDetails = async (tId: string, mId: string, updates: Partial<Match>) => {
    if (db) {
        // Update specific match doc in subcollection
        const mRef = doc(db, "tournaments", tId, "matches", mId);
        await updateDoc(mRef, cleanData(updates));
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
        const mRef = doc(db, "tournaments", tId, "matches", mId);
        
        // 1. Update the match score directly (Fast)
        await updateDoc(mRef, cleanData({ 
            score: newScore, 
            status, 
            winnerTeamId: winnerId,
            // Trigger a score update event automatically
            activeBroadcastEvent: {
                id: genId(),
                type: 'SCORE_UPDATE',
                timestamp: Date.now(),
                duration: 3000
            }
        }));

        // 2. If match completed, handle bracket advancement (Slower, can be async)
        if (status === MatchStatus.COMPLETED && winnerId) {
            // We need to fetch all matches to calculate advancement
            // This is heavy, but only happens on match completion
            const matchesSnap = await getDocs(collection(db, "tournaments", tId, "matches"));
            const allMatches = matchesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Match));
            const match = allMatches.find(m => m.id === mId);
            
            if (match) {
                const updatedMatches = advanceBracket(allMatches, match, winnerId);
                
                // Save updated matches (only the ones that changed)
                const batch = writeBatch(db);
                updatedMatches.forEach(m => {
                    if (m.id !== mId) { // Skip current match as we already updated it
                        // Check if it actually changed? For now just save to be safe
                        const mRef = doc(db, "tournaments", tId, "matches", m.id);
                        batch.set(mRef, cleanData(m), { merge: true });
                    }
                });
                await batch.commit();
            }
            
            // Update stats on teams (Main Doc)
            const tRef = doc(db, "tournaments", tId);
            const tSnap = await getDoc(tRef);
            if (tSnap.exists()) {
                const t = tSnap.data() as Tournament;
                const updatedTeams = calculateStats(t.teams, allMatches, t.format);
                await updateDoc(tRef, cleanData({ teams: updatedTeams }));
            }
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

export const triggerBroadcastEvent = async (tId: string, mId: string, event: any) => {
    if (db) {
        const mRef = doc(db, "tournaments", tId, "matches", mId);
        await updateDoc(mRef, {
            activeBroadcastEvent: cleanData(event)
        });
    } else {
        // Mock implementation
        const t = mockTournaments.find(x => x.id === tId);
        if (t) {
            const m = t.matches.find(m => m.id === mId);
            if (m) {
                m.activeBroadcastEvent = event;
                notifyMock();
            }
        }
    }
};

// ... (calculateStats and addRefereeTag need similar updates)

export const addRefereeTag = async (tId: string, mId: string, tag: string) => {
    if (db) {
        const mRef = doc(db, "tournaments", tId, "matches", mId);
        const snap = await getDoc(mRef);
        if (snap.exists()) {
            const mData = snap.data() as Match;
            await updateDoc(mRef, cleanData({ refereeNotes: [...(mData.refereeNotes || []), tag] }));
        }
    } else {
        const t = mockTournaments.find(x => x.id === tId);
        if (t) {
            t.matches = t.matches.map(m => m.id === mId ? { ...m, refereeNotes: [...(m.refereeNotes || []), tag] } : m);
            notifyMock();
        }
    }
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
