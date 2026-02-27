import React, { useState, useEffect } from 'react';
import { subscribeToTournaments, subscribeToTournament } from '../services/storage';
import { MatchStatus, Tournament, TournamentFormat, RoundRobinType, Team, Match, SponsorTier } from '../types';
import { ChevronRight, Trophy, History, Timer, MapPin, Award } from 'lucide-react';

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
  const completedMatches = activeTournament.matches
    .filter(m => m.status === MatchStatus.COMPLETED)
    .sort((a, b) => new Date(b.scheduledTime).getTime() - new Date(a.scheduledTime).getTime());
  
  const latestFinished = completedMatches.length > 0 ? completedMatches[0] : null;

  // Process Sponsors
  const sponsors = activeTournament.sponsors || [];
  const titleSponsor = sponsors.find((s: any) => typeof s !== 'string' && s.tier === SponsorTier.TITLE);
  // Gold and Platinum get Live Match placement
  const premiumSponsors = sponsors.filter((s: any) => typeof s !== 'string' && (s.tier === SponsorTier.GOLD || s.tier === SponsorTier.PLATINUM || s.tier === SponsorTier.TITLE));
  // All non-title sponsors go to marquee (including legacy strings)
  const marqueeSponsors = sponsors.filter((s: any) => typeof s === 'string' || s.tier !== SponsorTier.TITLE);

  return (
    <div className="pb-20 w-full animate-in fade-in duration-500">
        <style>{`
            @keyframes marquee {
                0% { transform: translateX(0); }
                100% { transform: translateX(-50%); }
            }
            .animate-marquee {
                display: inline-flex;
                animation: marquee 30s linear infinite;
            }
            .animate-marquee:hover {
                animation-play-state: paused;
            }
            
            /* Broadcast Animations */
            @keyframes slideUp {
                from { transform: translate(-50%, 100%); opacity: 0; }
                to { transform: translate(-50%, 0); opacity: 1; }
            }
            @keyframes slideRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            .animate-slide-up {
                animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
            .animate-slide-in-right {
                animation: slideRight 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
        `}</style>

        {/* Navigation / Back */}
        <div className="max-w-7xl mx-auto px-4 py-4">
            <button onClick={() => setSelectedTournamentId(null)} className="text-gray-400 hover:text-white flex items-center gap-2 transition-colors">
                &larr; Exit Spectator Mode
            </button>
        </div>

        {/* Spectator Header */}
        <div className="flex flex-col items-center justify-center text-center pt-4 pb-12 px-4 relative">
             <div className="flex items-center gap-3 mb-6">
                 <div className="h-14 w-14 bg-white rounded-2xl grid grid-cols-3 gap-[4px] p-[8px] shadow-2xl">
                    {[...Array(9)].map((_, i) => (
                        <span key={i} className="w-full h-full bg-[#1C3144] rounded-full" />
                    ))}
                 </div>
                 <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">Match Up</h1>
             </div>
             
             {/* Title Sponsor Placement - Dominant */}
             {titleSponsor && (
                 <div className="mb-4">
                     <p className="text-gray-500 text-[10px] uppercase tracking-[0.3em] mb-2">Presented By</p>
                     <img src={titleSponsor.logo} alt="Title Sponsor" className="h-20 md:h-28 object-contain mx-auto drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]" />
                 </div>
             )}

             <h2 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight drop-shadow-2xl">{activeTournament.name}</h2>
             
             <div className="flex flex-wrap justify-center gap-3 mb-8">
                 <span className="bg-[#E67E50]/10 border border-[#E67E50]/30 text-[#E67E50] px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest">
                     {activeTournament.format.replace('_', ' ')}
                 </span>
                 <span className="bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest">
                     {activeTournament.skillLevel}
                 </span>
                 <div className="bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-[#F59E0B] px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-2">
                     <Trophy size={14} /> Prize: {activeTournament.currency === 'USD' ? '$' : 'Rs'}{activeTournament.prizeMoney?.toLocaleString()}
                 </div>
             </div>

             {/* Marquee for other sponsors */}
             {marqueeSponsors.length > 0 && (
                <div className="w-full max-w-5xl overflow-hidden mb-12 relative border-y border-white/5 py-6 bg-white/[0.02] backdrop-blur-md">
                    <div className="whitespace-nowrap animate-marquee">
                        {[...marqueeSponsors, ...marqueeSponsors, ...marqueeSponsors].map((s: any, i) => (
                            <div key={i} className="inline-block mx-12 h-14">
                                <img src={typeof s === 'string' ? s : s.logo} className="h-full w-auto object-contain grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-500" alt="Sponsor" />
                            </div>
                        ))}
                    </div>
                </div>
             )}
        </div>

        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left/Main Column: Matches */}
            <div className="lg:col-span-2 space-y-10">
                
                {/* Live Section */}
                <section>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="h-3 w-3 bg-red-600 rounded-full animate-ping"></div>
                        <h2 className="text-2xl font-black text-white italic tracking-tight uppercase">Live Court Action</h2>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                        {liveMatches.length === 0 ? (
                            <div className="py-20 bg-[#0F213A]/50 rounded-3xl border-2 border-dashed border-gray-800 flex flex-col items-center justify-center text-center">
                                <Timer size={48} className="text-gray-700 mb-4" />
                                <p className="text-gray-500 text-lg font-bold">No active matches</p>
                                <p className="text-gray-600 text-sm">Waiting for the next serve...</p>
                            </div>
                        ) : (
                            liveMatches.map(m => <LiveCard key={m.id} match={m} teams={activeTournament.teams} sponsors={premiumSponsors} />)
                        )}
                    </div>
                </section>

                {/* Recently Finished Section */}
                {latestFinished && (
                    <section>
                        <div className="flex items-center gap-3 mb-6">
                            <History size={24} className="text-gray-400" />
                            <h2 className="text-2xl font-black text-white italic tracking-tight uppercase">Latest Result</h2>
                        </div>
                        <RecentMatchSummary match={latestFinished} teams={activeTournament.teams} />
                    </section>
                )}

                {/* Upcoming */}
                <section>
                    <h2 className="text-xl font-black text-gray-500 italic tracking-tight uppercase mb-6">Upcoming Schedule</h2>
                    <div className="grid gap-3">
                         {activeTournament.matches.filter(m => m.status === MatchStatus.SCHEDULED).slice(0, 5).map(m => <ScheduleRow key={m.id} match={m} teams={activeTournament.teams} />)}
                    </div>
                </section>
            </div>

            {/* Right Column: Standings & Sponsor Block */}
            <div className="space-y-10">
                {/* Featured Brand Section (Platinum) */}
                {sponsors.filter((s: any) => typeof s !== 'string' && s.tier === SponsorTier.PLATINUM).length > 0 && (
                     <section className="bg-gradient-to-br from-[#0F213A] to-[#162a45] rounded-3xl border border-white/5 p-8 text-center shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                        <h3 className="text-cyan-400 font-bold text-xs uppercase tracking-[0.2em] mb-6">Featured Partner</h3>
                        <div className="flex flex-wrap justify-center gap-6">
                            {sponsors.filter((s: any) => typeof s !== 'string' && s.tier === SponsorTier.PLATINUM).map((s: any, i: number) => (
                                <img key={i} src={s.logo} className="h-16 object-contain drop-shadow-lg" />
                            ))}
                        </div>
                     </section>
                )}

                <section>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-1.5 h-8 bg-indigo-600 rounded-full"></div>
                        <h2 className="text-2xl font-black text-white italic tracking-tight uppercase">Tournament Standings</h2>
                    </div>
                    <StandingsTable tournament={activeTournament} />
                </section>
            </div>

        </div>
    </div>
  );
};

// --- SUB-COMPONENTS ---

const BroadcastOverlay = ({ event }: { event: any }) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (!event) {
            setVisible(false);
            return;
        }

        const now = Date.now();
        const timeSince = now - event.timestamp;
        if (timeSince < event.duration) {
            setVisible(true);
            const timer = setTimeout(() => setVisible(false), event.duration - timeSince);
            return () => clearTimeout(timer);
        } else {
            setVisible(false);
        }
    }, [event]);

    if (!visible || !event) return null;

    if (event.type === 'TOMBSTONE') {
        return (
            <div className="absolute bottom-0 left-1/2 z-50 animate-slide-up">
                <div className="bg-gradient-to-t from-black to-gray-900 text-white px-12 py-4 rounded-t-xl border-t-4 border-[#E67E50] shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col items-center min-w-[300px]">
                    <div className="text-[#E67E50] font-black uppercase tracking-[0.3em] text-xs mb-1">UPDATE</div>
                    <div className="text-4xl font-black italic tracking-tighter uppercase">{event.message}</div>
                    {event.subMessage && <div className="text-gray-400 font-bold uppercase tracking-widest text-sm mt-1">{event.subMessage}</div>}
                </div>
            </div>
        );
    }

    if (event.type === 'VIOLATOR') {
        return (
            <div className="absolute top-20 right-0 z-50 animate-slide-in-right">
                <div className="bg-[#E67E50] text-white pl-8 pr-20 py-6 rounded-l-full shadow-[0_10px_40px_rgba(230,126,80,0.4)] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-full bg-black/10 skew-x-12 translate-x-16"></div>
                    <div className="relative z-10">
                        <div className="font-black uppercase tracking-[0.2em] text-xs text-red-900 mb-1">ATTENTION</div>
                        <div className="text-3xl font-black italic tracking-tighter uppercase">{event.message}</div>
                        {event.subMessage && <div className="text-white/80 font-bold uppercase tracking-widest text-xs mt-1">{event.subMessage}</div>}
                    </div>
                </div>
            </div>
        );
    }

    if (event.type === 'SCORE_UPDATE') {
        // Subtle flash or specific animation handled in LiveCard, but we can add a global effect here if needed
        return null; 
    }

    return null;
};

const TournamentList = ({tournaments, onSelect}: any) => (
    <div className="min-h-screen pt-20 px-4">
        <div className="max-w-4xl mx-auto">
            <h1 className="text-6xl font-black text-white mb-4 tracking-tighter italic">SPECTATOR<br/>LOBBY</h1>
            <p className="text-gray-400 text-xl mb-12 font-medium">Select an event to enter the live dashboard.</p>
            
            <div className="grid gap-6">
                {tournaments.map((t: Tournament) => (
                    <button key={t.id} onClick={() => onSelect(t.id)} className="text-left bg-[#0F213A] p-1 w-full rounded-3xl border border-gray-800 hover:border-[#E67E50] group transition-all overflow-hidden shadow-2xl">
                        <div className="bg-[#0A1628] rounded-[22px] p-6 md:p-8 flex justify-between items-center">
                            <div>
                                <h3 className="text-3xl font-black text-white group-hover:text-[#E67E50] mb-2 transition-colors">{t.name}</h3>
                                <div className="flex items-center gap-4 text-gray-500">
                                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full border border-white/5">
                                        <MapPin size={12}/> {t.venue || "Global Arena"}
                                    </div>
                                    <span className="text-gray-700">•</span>
                                    <span className="text-xs font-bold uppercase tracking-widest">{t.skillLevel}</span>
                                </div>
                            </div>
                            <div className="h-14 w-14 bg-gray-800 rounded-2xl flex items-center justify-center group-hover:bg-[#E67E50] group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
                                <ChevronRight className="text-gray-400 group-hover:text-white" size={28} />
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    </div>
);

const LiveCard = ({ match, teams, sponsors }: any) => {
    const t1 = teams.find((t: any) => t.id === match.team1Id);
    const t2 = teams.find((t: any) => t.id === match.team2Id);

    // Pick a random premium sponsor to display on this card if available
    const featuredSponsor = sponsors && sponsors.length > 0 ? sponsors[Math.floor(Math.random() * sponsors.length)] : null;

    // Score Update Animation
    const [scoreFlash, setScoreFlash] = useState(false);
    useEffect(() => {
        if (match.activeBroadcastEvent?.type === 'SCORE_UPDATE') {
            const now = Date.now();
            if (now - match.activeBroadcastEvent.timestamp < 2000) {
                setScoreFlash(true);
                const t = setTimeout(() => setScoreFlash(false), 500);
                return () => clearTimeout(t);
            }
        }
    }, [match.activeBroadcastEvent]);

    return (
        <div className={`bg-[#1A2234] rounded-[40px] p-8 md:p-10 border border-white/10 shadow-2xl relative overflow-hidden group transition-all duration-300 ${scoreFlash ? 'scale-[1.02] ring-4 ring-[#E67E50]/50' : ''}`}>
             {/* Broadcast Overlay Integration */}
             {match.activeBroadcastEvent && (
                 <div className="absolute inset-0 pointer-events-none z-50 flex items-center justify-center">
                     <BroadcastOverlay event={match.activeBroadcastEvent} />
                 </div>
             )}

             {/* Dynamic background effect */}
             <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2"></div>
             
             <div className="flex justify-between items-center mb-10 relative z-10">
                 <div className="flex flex-col">
                    <span className="text-indigo-400 text-xs font-black uppercase tracking-widest mb-1">{match.roundName}</span>
                    <span className="text-white text-xl font-black italic">{match.court}</span>
                 </div>
                 <div className="flex flex-col items-end">
                    <span className="bg-red-600 text-white text-[10px] font-black px-4 py-1.5 rounded-full animate-pulse shadow-lg shadow-red-600/40">LIVE ACTION</span>
                 </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-8 items-center relative z-10">
                 {/* Team 1 */}
                 <div className="flex flex-col items-center md:items-end text-center md:text-right">
                    <div className={`w-20 h-20 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 border-4 ${match.score.p1Sets > match.score.p2Sets ? 'border-[#E67E50]' : 'border-indigo-500/30'} p-1 mb-4 shadow-xl transition-colors duration-500`}>
                        {t1?.player1?.photoUrl ? <img src={t1.player1.photoUrl} className="w-full h-full rounded-full object-cover" /> : <div className="w-full h-full rounded-full flex items-center justify-center font-black text-gray-500">T1</div>}
                    </div>
                    <h3 className="text-2xl font-black text-white leading-tight mb-2">{t1?.name}</h3>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">{t1?.player1?.name} & {t1?.player2?.name}</p>
                 </div>

                 {/* Center Score */}
                 <div className="flex flex-col items-center px-8 border-x border-white/5 relative">
                    {/* Scorebug Flash Effect */}
                    {scoreFlash && <div className="absolute inset-0 bg-[#E67E50]/20 blur-xl animate-pulse rounded-full"></div>}
                    
                    <div className="text-6xl md:text-8xl font-black text-white tracking-tighter mb-4 flex items-center gap-6 relative z-10">
                        <span>{match.score.p1Games}</span>
                        <span className="text-white/20">:</span>
                        <span>{match.score.p2Games}</span>
                    </div>
                    <div className={`bg-[#E67E50] text-white px-6 py-2 rounded-xl font-black text-2xl tracking-tight shadow-xl shadow-orange-600/20 transform transition-transform duration-200 ${scoreFlash ? 'scale-110' : ''}`}>
                        {match.score.p1Points} - {match.score.p2Points}
                    </div>
                    <div className="mt-6 flex gap-2">
                        {match.score.p1SetScores.map((s: number, i: number) => (
                            <div key={i} className="bg-white/5 border border-white/10 rounded-lg px-3 py-1 flex flex-col items-center">
                                <span className="text-[8px] text-gray-500 font-black uppercase">Set {i+1}</span>
                                <span className="text-xs font-black text-white">{s}-{match.score.p2SetScores[i]}</span>
                            </div>
                        ))}
                    </div>
                 </div>

                 {/* Team 2 */}
                 <div className="flex flex-col items-center md:items-start text-center md:text-left">
                    <div className={`w-20 h-20 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 border-4 ${match.score.p2Sets > match.score.p1Sets ? 'border-[#E67E50]' : 'border-[#E67E50]/30'} p-1 mb-4 shadow-xl transition-colors duration-500`}>
                        {t2?.player1?.photoUrl ? <img src={t2.player1.photoUrl} className="w-full h-full rounded-full object-cover" /> : <div className="w-full h-full rounded-full flex items-center justify-center font-black text-gray-500">T2</div>}
                    </div>
                    <h3 className="text-2xl font-black text-white leading-tight mb-2">{t2?.name}</h3>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">{t2?.player1?.name} & {t2?.player2?.name}</p>
                 </div>
             </div>

             {/* Sponsor On Card */}
             {featuredSponsor && (
                 <div className="absolute bottom-4 right-6 opacity-30 grayscale group-hover:grayscale-0 group-hover:opacity-60 transition-all duration-500">
                     <img src={featuredSponsor.logo} className="h-8" />
                 </div>
             )}
        </div>
    )
};

const RecentMatchSummary = ({ match, teams }: any) => {
    const t1 = teams.find((t: any) => t.id === match.team1Id);
    const t2 = teams.find((t: any) => t.id === match.team2Id);
    const isT1Winner = match.winnerTeamId === t1?.id;

    return (
        <div className="bg-[#0F213A] rounded-3xl border border-white/5 p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-6 flex-1">
                <div className="flex flex-col items-center min-w-[80px]">
                    <div className={`text-2xl font-black ${isT1Winner ? 'text-green-500' : 'text-gray-500'}`}>{isT1Winner ? 'WIN' : 'LOST'}</div>
                    <div className="text-xs text-gray-600 font-bold uppercase tracking-widest">{match.roundName}</div>
                </div>
                <div>
                    <div className={`text-xl font-black ${isT1Winner ? 'text-white' : 'text-gray-500'}`}>{t1?.name}</div>
                    <div className="text-xs text-gray-600 font-bold uppercase">vs</div>
                    <div className={`text-xl font-black ${!isT1Winner ? 'text-white' : 'text-gray-500'}`}>{t2?.name}</div>
                </div>
            </div>

            <div className="flex gap-4 items-center">
                <div className="flex gap-2">
                    {match.score.p1SetScores.map((s: number, i: number) => (
                        <div key={i} className="flex flex-col items-center bg-black/30 rounded-xl px-4 py-3 border border-white/5">
                            <span className="text-[10px] text-gray-600 font-black mb-1">S{i+1}</span>
                            <div className="flex flex-col text-lg font-black leading-tight">
                                <span className={s > match.score.p2SetScores[i] ? 'text-white' : 'text-gray-600'}>{s}</span>
                                <span className={match.score.p2SetScores[i] > s ? 'text-white' : 'text-gray-600'}>{match.score.p2SetScores[i]}</span>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="bg-[#E67E50]/10 text-[#E67E50] p-4 rounded-2xl border border-[#E67E50]/20">
                    <Award size={32} />
                </div>
            </div>
        </div>
    );
};

const StandingsTable = ({ tournament }: { tournament: Tournament }) => {
    const { teams, matches, format } = tournament;
    
    // Calculate stats for all formats
    // We'll calculate a unified stat list for the spectator
    const stats = teams.map(team => {
        const teamMatches = matches.filter(m => 
            m.status === MatchStatus.COMPLETED && 
            (m.team1Id === team.id || m.team2Id === team.id)
        );
        const wins = teamMatches.filter(m => m.winnerTeamId === team.id).length;
        const losses = teamMatches.length - wins;
        
        // For RR, use points. For Elimination, calculate "Ranking Score" based on Round reached
        let pts = team.points || 0;
        if (format !== TournamentFormat.ROUND_ROBIN) {
            // Elimination ranking: Highest round reached
            const roundsReached = teamMatches.map(m => m.round);
            const maxRound = roundsReached.length > 0 ? Math.max(...roundsReached) : 0;
            // Weighted points: MaxRound reached * 10 + win percentage
            pts = maxRound * 10 + (teamMatches.length > 0 ? (wins / teamMatches.length) * 5 : 0);
        }

        return {
            id: team.id,
            name: team.name,
            group: team.groupId || 'A',
            wins,
            losses,
            pts: Math.floor(pts)
        };
    }).sort((a, b) => b.pts - a.pts);

    // Grouping by A/B if applicable
    const groups = stats.reduce((acc: any, s: any) => {
        const gid = s.group;
        if (!acc[gid]) acc[gid] = [];
        acc[gid].push(s);
        return acc;
    }, {});

    const groupKeys = Object.keys(groups).sort();

    return (
        <div className="space-y-8">
            {groupKeys.map(gId => (
                <div key={gId} className="animate-in slide-in-from-right duration-700">
                    <h3 className="text-[#E67E50] font-black text-sm uppercase tracking-[0.2em] mb-4 pl-1">GROUP {gId}</h3>
                    <div className="bg-[#0F213A] rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
                        <table className="w-full text-left">
                            <thead className="bg-white/5 text-[10px] text-gray-500 font-black uppercase tracking-widest border-b border-white/5">
                                <tr>
                                    <th className="px-6 py-4">Team</th>
                                    <th className="px-6 py-4 text-center">W</th>
                                    <th className="px-6 py-4 text-center">L</th>
                                    <th className="px-6 py-4 text-center">PTS</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {groups[gId].map((s: any, i: number) => (
                                    <tr key={s.id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="px-6 py-5 flex items-center gap-4">
                                            <span className="text-gray-700 font-black text-xs w-4">{i + 1}</span>
                                            <span className="text-white font-black tracking-tight">{s.name}</span>
                                        </td>
                                        <td className="px-6 py-5 text-center text-green-500 font-black text-lg">{s.wins}</td>
                                        <td className="px-6 py-5 text-center text-red-600 font-black text-lg">{s.losses}</td>
                                        <td className="px-6 py-5 text-center font-black text-2xl text-[#E67E50]">{s.pts}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ))}
        </div>
    );
};

const ScheduleRow = ({ match, teams }: any) => {
    const t1 = teams.find((t: any) => t.id === match.team1Id)?.name || 'TBD';
    const t2 = teams.find((t: any) => t.id === match.team2Id)?.name || 'TBD';
    return (
        <div className="bg-[#0F213A] p-6 rounded-2xl border border-white/5 flex justify-between items-center hover:bg-white/[0.02] transition-colors group">
            <div className="flex items-center gap-6">
                <div className="h-12 w-12 rounded-xl bg-black/20 flex flex-col items-center justify-center border border-white/5">
                    <span className="text-[10px] text-gray-600 font-black uppercase">Start</span>
                    <span className="text-white font-black text-sm">{new Date(match.scheduledTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                </div>
                <div>
                    <div className="text-indigo-400 text-[10px] font-black uppercase mb-1 tracking-wider">{match.roundName}</div>
                    <div className="text-white font-black text-lg group-hover:text-indigo-300 transition-colors">
                        {t1} <span className="text-gray-700 text-sm px-2 font-normal italic">vs</span> {t2}
                    </div>
                </div>
            </div>
            <div className="text-right">
                <div className="bg-indigo-500/10 text-indigo-400 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-500/20">
                    {match.court}
                </div>
            </div>
        </div>
    )
};
