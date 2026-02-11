import React, { useState, useEffect } from 'react';
import { subscribeToTournaments, subscribeToTournament } from '../services/storage';
import { MatchStatus, Tournament, TournamentFormat, RoundRobinType } from '../types';
import { Clock, Trophy, ChevronRight, Grid } from 'lucide-react';

export const LiveScoreboard: React.FC = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);
  const [activeTournament, setActiveTournament] = useState<Tournament | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToTournaments((data: Tournament[]) => setTournaments(data));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (selectedTournamentId) {
        const unsubscribe = subscribeToTournament(selectedTournamentId, (data: Tournament | null) => setActiveTournament(data));
        return () => unsubscribe();
    }
  }, [selectedTournamentId]);

  if (!selectedTournamentId) return <TournamentList tournaments={tournaments} onSelect={setSelectedTournamentId} />;
  if (!activeTournament) return <div className="text-center p-10 text-gray-500">Loading...</div>;

  const liveMatches = activeTournament.matches.filter(m => m.status === MatchStatus.IN_PROGRESS);

  return (
    <div className="pb-20 max-w-5xl mx-auto">
        <button onClick={() => setSelectedTournamentId(null)} className="text-gray-500 hover:text-white mb-6 flex items-center gap-1">&larr; Back</button>
        
        <div className="flex items-center gap-2 mb-6">
            <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse"></div>
            <h2 className="text-2xl font-bold text-white">Live Matches</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {liveMatches.length === 0 && <p className="text-gray-500 col-span-2 text-center py-10 bg-[#0F213A] rounded-2xl">No matches currently live.</p>}
            {liveMatches.map(m => <LiveCard key={m.id} match={m} teams={activeTournament.teams} />)}
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
             <div className="space-y-4">
                 <h3 className="text-xl font-bold text-white mb-4">Upcoming</h3>
                 {activeTournament.matches.filter(m => m.status === MatchStatus.SCHEDULED).map(m => <ScheduleRow key={m.id} match={m} teams={activeTournament.teams} />)}
             </div>
             {activeTournament.format === TournamentFormat.ROUND_ROBIN && (
                 <div>
                     <h3 className="text-xl font-bold text-white mb-4">Standings</h3>
                     <StandingsTable teams={activeTournament.teams} tournament={activeTournament} />
                 </div>
             )}
        </div>
    </div>
  );
};

// --- COMPONENTS ---

const TournamentList = ({tournaments, onSelect}: any) => (
    <div className="pb-20">
        <h1 className="text-3xl font-bold text-white mb-8 text-center">Live Tournaments</h1>
        <div className="grid gap-4 max-w-2xl mx-auto">
            {tournaments.map((t: Tournament) => (
                <button key={t.id} onClick={() => onSelect(t.id)} className="bg-[#0F213A] p-6 rounded-2xl border border-gray-800 flex justify-between items-center hover:border-[#E67E50] text-left w-full group">
                    <div><h3 className="text-xl font-bold text-white group-hover:text-[#E67E50]">{t.name}</h3></div>
                    <ChevronRight className="text-gray-600 group-hover:text-white" />
                </button>
            ))}
        </div>
    </div>
);

const LiveCard = ({ match, teams }: any) => {
    const t1 = teams.find((t: any) => t.id === match.team1Id);
    const t2 = teams.find((t: any) => t.id === match.team2Id);

    // Default set scores for display (Padel usually 3 sets max)
    const displaySets1 = [...match.score.p1SetScores || []];
    const displaySets2 = [...match.score.p2SetScores || []];
    // Push current games to the end for display
    if (match.status === MatchStatus.IN_PROGRESS) {
        displaySets1.push(match.score.p1Games);
        displaySets2.push(match.score.p2Games);
    }

    return (
        <div className="bg-[#1A2234] rounded-2xl p-6 border border-gray-800 shadow-xl relative overflow-hidden">
             <div className="flex justify-between items-center mb-6">
                 <span className="text-gray-400 text-sm uppercase tracking-wider font-medium">{match.roundName}</span>
                 <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded animate-pulse">LIVE</span>
             </div>

             <div className="grid grid-cols-[1fr_auto] gap-4 items-center">
                 {/* Teams */}
                 <div className="space-y-6">
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs text-gray-400">T</div>
                        <span className="text-xl font-bold text-white truncate">{t1?.name}</span>
                     </div>
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs text-gray-400">T</div>
                        <span className="text-xl font-bold text-white truncate">{t2?.name}</span>
                     </div>
                 </div>

                 {/* Set Scores */}
                 <div className="flex gap-2">
                     {/* Render 3 slots max */}
                     {[0, 1, 2].map(i => {
                         const s1 = displaySets1[i] !== undefined ? displaySets1[i] : '-';
                         const s2 = displaySets2[i] !== undefined ? displaySets2[i] : '-';
                         const isCurrent = i === displaySets1.length - 1;
                         
                         return (
                            <div key={i} className={`flex flex-col gap-4 w-8 md:w-10 text-center ${isCurrent ? 'bg-[#E67E50] text-white rounded-lg py-1' : 'text-gray-500'}`}>
                                <span className="text-lg md:text-xl font-bold">{s1}</span>
                                <span className="text-lg md:text-xl font-bold">{s2}</span>
                            </div>
                         )
                     })}
                 </div>
             </div>

             {/* Current Game Points */}
             <div className="mt-8 pt-6 border-t border-gray-700/50 text-center">
                 <div className="text-gray-500 text-xs uppercase tracking-widest mb-2">Current Game</div>
                 <div className="text-4xl md:text-5xl font-mono font-bold text-[#E67E50]">
                     {match.score.p1Points} - {match.score.p2Points}
                 </div>
             </div>
        </div>
    )
};

const ScheduleRow = ({ match, teams }: any) => {
    const t1 = teams.find((t: any) => t.id === match.team1Id)?.name || 'TBD';
    const t2 = teams.find((t: any) => t.id === match.team2Id)?.name || 'TBD';
    return (
        <div className="bg-[#0F213A] p-4 rounded-xl border border-gray-800 flex justify-between items-center">
            <div>
                <div className="text-[#E67E50] text-xs font-bold uppercase mb-1">{match.roundName}</div>
                <div className="text-white font-medium">{t1} vs {t2}</div>
            </div>
            <div className="text-right text-gray-500 text-xs">
                <div>{new Date(match.scheduledTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                <div className="bg-gray-800 px-2 py-0.5 rounded mt-1 inline-block">{match.court}</div>
            </div>
        </div>
    )
}

const StandingsTable = ({ teams, tournament }: any) => {
    // Group teams by group ID
    const groups = teams.reduce((acc: any, team: any) => {
        const gid = team.groupId || 'General';
        if (!acc[gid]) acc[gid] = [];
        acc[gid].push(team);
        return acc;
    }, {});

    const groupKeys = Object.keys(groups).sort();

    return (
        <div className="space-y-6">
            {groupKeys.map(gId => (
                <div key={gId} className="bg-[#0F213A] rounded-xl border border-gray-800 overflow-hidden">
                    {(tournament.rrType === RoundRobinType.GROUPS || groupKeys.length > 1) && (
                        <div className="bg-[#0A1628] px-4 py-2 border-b border-gray-800 font-bold text-[#E67E50]">
                            Group {gId}
                        </div>
                    )}
                    <table className="w-full text-sm text-left">
                        <thead className="bg-[#0A1628] text-gray-400 text-xs uppercase">
                            <tr>
                                <th className="px-4 py-3">Team</th>
                                <th className="px-4 py-3 text-center">W</th>
                                <th className="px-4 py-3 text-center">L</th>
                                <th className="px-4 py-3 text-center">Pts</th>
                            </tr>
                        </thead>
                        <tbody>
                            {groups[gId].sort((a: any, b: any) => (b.points || 0) - (a.points || 0)).map((t: any, i: number) => (
                                <tr key={t.id} className="border-b border-gray-800 hover:bg-[#132640]">
                                    <td className="px-4 py-3 text-white flex items-center gap-2"><span className="text-gray-500 w-4">{i+1}.</span> {t.name}</td>
                                    <td className="px-4 py-3 text-center text-green-500">{t.wins || 0}</td>
                                    <td className="px-4 py-3 text-center text-red-500">{t.losses || 0}</td>
                                    <td className="px-4 py-3 text-center font-bold text-[#E67E50]">{t.points || 0}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ))}
        </div>
    );
};
