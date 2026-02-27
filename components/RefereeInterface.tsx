import React, { useState, useEffect } from 'react';
import { subscribeToTournaments, updateMatchScore, addRefereeTag, triggerBroadcastEvent } from '../services/storage';
import { addPoint } from '../services/scoreEngine';
import { Match, MatchStatus, Tournament, SponsorTier } from '../types';
import { Lock, Play, RotateCcw, Award, Check, X, Trophy, ChevronRight, Edit2 } from 'lucide-react';

export const RefereeInterface: React.FC = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [passcode, setPasscode] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  
  // Winner Banner State
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToTournaments((data) => setTournaments(data));
    return () => unsubscribe();
  }, []);

  // Authentication
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTournament && passcode === selectedTournament.refereePasscode) {
      setAuthenticated(true);
    } else {
      alert("Invalid Passcode");
    }
  };

  // 1. Tournament Selection
  if (!selectedTournament) {
      return (
          <div className="pb-20 max-w-2xl mx-auto">
              <h1 className="text-2xl font-bold text-white mb-6 text-center">Select Tournament to Referee</h1>
              <div className="space-y-4">
                  {tournaments.map(t => (
                      <button 
                        key={t.id} 
                        onClick={() => setSelectedTournament(t)}
                        className="w-full bg-[#0F213A] p-6 rounded-xl border border-gray-800 hover:border-[#E67E50] flex justify-between items-center group transition-all text-left"
                      >
                          <div className="font-bold text-lg text-white group-hover:text-[#E67E50]">{t.name}</div>
                          <ChevronRight className="text-gray-600 group-hover:text-white" />
                      </button>
                  ))}
                  {tournaments.length === 0 && <p className="text-gray-500 text-center">No active tournaments.</p>}
              </div>
          </div>
      );
  }

  if (!authenticated) {
    return (
      <div className="max-w-md mx-auto mt-10 md:mt-20 p-6 md:p-8 bg-[#0F213A] rounded-2xl border border-gray-800">
        <button onClick={() => setSelectedTournament(null)} className="mb-6 text-gray-500 hover:text-white flex items-center gap-1 text-sm">
            &larr; Back
        </button>
        <div className="flex justify-center mb-6">
            <div className="h-12 w-12 bg-[#E67E50]/20 rounded-full flex items-center justify-center text-[#E67E50]">
                <Lock size={24} />
            </div>
        </div>
        <h2 className="text-xl font-bold text-center text-white mb-2">Referee Access</h2>
        <p className="text-center text-gray-400 text-sm mb-6">{selectedTournament.name}</p>
        <form onSubmit={handleLogin}>
          <input 
            type="password"
            placeholder="Passcode"
            className="w-full bg-[#0A1628] border border-gray-700 rounded-lg p-3 text-white mb-4 text-center tracking-widest text-lg focus:outline-none focus:border-[#E67E50]"
            value={passcode}
            onChange={e => setPasscode(e.target.value)}
          />
          <button className="w-full bg-[#E67E50] text-white font-bold py-3 rounded-xl hover:bg-[#ff8f5d]">
            Enter
          </button>
        </form>
      </div>
    );
  }

  // Match List View
  if (!selectedMatch) {
    const matches = selectedTournament.matches.sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime());
    return (
      <div className="max-w-3xl mx-auto pb-20">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl md:text-2xl font-bold text-white">Scheduled Matches</h2>
            <button onClick={() => { setAuthenticated(false); setPasscode(''); }} className="text-sm text-gray-500 hover:text-white">Logout</button>
        </div>
        
        <div className="space-y-4">
          {matches.map(m => {
             const t1 = selectedTournament.teams.find(t => t.id === m.team1Id);
             const t2 = selectedTournament.teams.find(t => t.id === m.team2Id);
             if (!t1 || !t2) return null; // Skip placeholder matches

             return (
               <div key={m.id} onClick={() => setSelectedMatch(m)} className="bg-[#0F213A] p-4 rounded-xl border border-gray-800 hover:border-[#E67E50] cursor-pointer transition-colors group">
                 <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-medium text-[#E67E50] px-2 py-1 bg-[#E67E50]/10 rounded uppercase tracking-wider">{m.court}</span>
                    <span className="text-xs text-gray-500">{new Date(m.scheduledTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                 </div>
                 <div className="flex justify-between items-center">
                    <div className="text-base md:text-lg font-bold text-white">{t1.name} vs {t2.name}</div>
                    {m.status === MatchStatus.IN_PROGRESS && <div className="animate-pulse w-2 h-2 bg-green-500 rounded-full"></div>}
                    {m.status === MatchStatus.COMPLETED && <div className="text-xs bg-gray-700 px-2 py-1 rounded text-gray-300">Complete</div>}
                 </div>
                 <div className="text-sm text-gray-500 mt-1">{m.roundName}</div>
               </div>
             )
          })}
          {matches.length === 0 && <div className="text-gray-500 text-center">No matches scheduled with valid teams.</div>}
        </div>
      </div>
    );
  }

  return (
    <div>
        {showBanner && selectedMatch.winnerTeamId ? (
            <WinnerBanner 
                match={selectedMatch} 
                tournamentName={selectedTournament.name}
                teams={selectedTournament.teams}
                sponsors={selectedTournament.sponsors}
                onClose={() => { setShowBanner(false); setSelectedMatch(null); }} 
            />
        ) : (
            <ScoringControl 
                match={selectedMatch} 
                teams={selectedTournament.teams} 
                tournamentId={selectedTournament.id}
                onUpdate={(m: Match) => {
                    updateMatchScore(selectedTournament.id, m.id, m.score, m.status, m.winnerTeamId);
                    setSelectedMatch(m);
                }}
                onBack={() => setSelectedMatch(null)}
                onShowBanner={() => setShowBanner(true)}
            />
        )}
    </div>
  );
};

// Internal Component for Match Scoring
const ScoringControl = ({ match, teams, tournamentId, onUpdate, onBack, onShowBanner }: any) => {
    const t1 = teams.find((t: any) => t.id === match.team1Id);
    const t2 = teams.find((t: any) => t.id === match.team2Id);
    const [localScore, setLocalScore] = useState(match.score);
    const [status, setStatus] = useState(match.status);

    const handlePoint = (team: 1 | 2, playerIdx: 1 | 2) => {
        if (status === MatchStatus.COMPLETED) return;
        if (status === MatchStatus.SCHEDULED) setStatus(MatchStatus.IN_PROGRESS);

        const newScore = addPoint(localScore, team, playerIdx);
        setLocalScore(newScore);
        
        // Check for match winner logic based on sets
        // Simple Padel: Best of 3 sets (First to 2 sets)
        let winnerId = undefined;
        let newStatus = status === MatchStatus.SCHEDULED ? MatchStatus.IN_PROGRESS : status;

        if (newScore.p1Sets === 2) {
            newStatus = MatchStatus.COMPLETED;
            winnerId = t1.id;
        } else if (newScore.p2Sets === 2) {
            newStatus = MatchStatus.COMPLETED;
            winnerId = t2.id;
        }

        onUpdate({ ...match, score: newScore, status: newStatus, winnerTeamId: winnerId });
        if (winnerId) setStatus(MatchStatus.COMPLETED);
    };

    const handleTag = (tag: string) => {
        addRefereeTag(tournamentId, match.id, tag);
        alert(`Tag "${tag}" added!`);
    };

    return (
        <div className="max-w-4xl mx-auto pb-20">
            <button onClick={onBack} className="mb-4 text-sm text-gray-500 hover:text-white flex items-center gap-1">
                &larr; Back
            </button>
            
            {/* Scoreboard Header */}
            <div className="bg-[#0F213A] rounded-2xl border border-gray-800 p-4 md:p-6 mb-4 md:mb-6">
                <div className="flex justify-between text-gray-400 text-xs md:text-sm mb-4 uppercase tracking-wider">
                    <span>{match.roundName}</span>
                    <span>{match.court}</span>
                </div>
                
                {/* Score Display - Responsive Stack */}
                <div className="flex flex-col md:grid md:grid-cols-[1fr_auto_1fr] gap-4 md:gap-8 items-center">
                    {/* Team 1 (Top/Left) */}
                    <div className="text-center md:text-right w-full">
                        <div className="text-xl md:text-2xl font-bold text-white mb-1 truncate">{t1.name}</div>
                        <div className="text-xs md:text-sm text-gray-500 truncate">{t1.player1.name} / {t1.player2.name}</div>
                    </div>
                    
                    {/* Scores (Center) */}
                    <div className="flex w-full md:w-auto gap-2 md:gap-4 items-center justify-center bg-[#0A1628] px-4 py-3 md:px-6 md:py-4 rounded-xl border border-gray-700">
                        <div className="text-center">
                            <div className="text-[10px] md:text-xs text-gray-500 mb-1">SETS</div>
                            <div className="text-xl md:text-2xl font-bold text-white">{localScore.p1Sets}-{localScore.p2Sets}</div>
                        </div>
                        <div className="h-6 md:h-8 w-[1px] bg-gray-700"></div>
                         <div className="text-center">
                            <div className="text-[10px] md:text-xs text-gray-500 mb-1">GAMES</div>
                            <div className="text-xl md:text-2xl font-bold text-white">{localScore.p1Games}-{localScore.p2Games}</div>
                        </div>
                         <div className="h-6 md:h-8 w-[1px] bg-gray-700"></div>
                        <div className="text-center min-w-[50px] md:min-w-[60px]">
                            <div className="text-[10px] md:text-xs text-[#E67E50] mb-1 font-bold">POINTS</div>
                            <div className="text-3xl md:text-4xl font-mono font-bold text-[#E67E50]">
                                {localScore.isTiebreak ? `${localScore.p1Points}-${localScore.p2Points}` : `${localScore.p1Points}-${localScore.p2Points}`}
                            </div>
                        </div>
                    </div>

                    {/* Team 2 (Bottom/Right) */}
                    <div className="text-center md:text-left w-full">
                        <div className="text-xl md:text-2xl font-bold text-white mb-1 truncate">{t2.name}</div>
                        <div className="text-xs md:text-sm text-gray-500 truncate">{t2.player1.name} / {t2.player2.name}</div>
                    </div>
                </div>
            </div>

            {/* Controls */}
            {status !== MatchStatus.COMPLETED ? (
                <div className="grid grid-cols-2 gap-3 md:gap-6">
                    {/* Team 1 Controls */}
                    <div className="flex flex-col gap-3">
                         <div className="text-center text-indigo-300 font-bold text-sm md:text-base truncate">{t1.name}</div>
                         <button 
                            onClick={() => handlePoint(1, 1)}
                            className="bg-indigo-600/90 active:bg-indigo-700 active:scale-95 transition-all rounded-xl p-3 md:p-6 shadow-lg border border-indigo-500/30 group"
                        >
                            <div className="text-center">
                                <div className="text-indigo-200 text-[10px] uppercase tracking-wider mb-1">Point</div>
                                <div className="text-base md:text-xl font-bold text-white truncate">{t1.player1.name.split(' ')[0]}</div>
                            </div>
                        </button>
                        <button 
                            onClick={() => handlePoint(1, 2)}
                            className="bg-indigo-600/90 active:bg-indigo-700 active:scale-95 transition-all rounded-xl p-3 md:p-6 shadow-lg border border-indigo-500/30 group"
                        >
                            <div className="text-center">
                                <div className="text-indigo-200 text-[10px] uppercase tracking-wider mb-1">Point</div>
                                <div className="text-base md:text-xl font-bold text-white truncate">{t1.player2.name.split(' ')[0]}</div>
                            </div>
                        </button>
                    </div>

                    {/* Team 2 Controls */}
                    <div className="flex flex-col gap-3">
                         <div className="text-center text-emerald-300 font-bold text-sm md:text-base truncate">{t2.name}</div>
                         <button 
                            onClick={() => handlePoint(2, 1)}
                            className="bg-emerald-600/90 active:bg-emerald-700 active:scale-95 transition-all rounded-xl p-3 md:p-6 shadow-lg border border-emerald-500/30 group"
                        >
                            <div className="text-center">
                                <div className="text-emerald-200 text-[10px] uppercase tracking-wider mb-1">Point</div>
                                <div className="text-base md:text-xl font-bold text-white truncate">{t2.player1.name.split(' ')[0]}</div>
                            </div>
                        </button>
                         <button 
                            onClick={() => handlePoint(2, 2)}
                            className="bg-emerald-600/90 active:bg-emerald-700 active:scale-95 transition-all rounded-xl p-3 md:p-6 shadow-lg border border-emerald-500/30 group"
                        >
                            <div className="text-center">
                                <div className="text-emerald-200 text-[10px] uppercase tracking-wider mb-1">Point</div>
                                <div className="text-base md:text-xl font-bold text-white truncate">{t2.player2.name.split(' ')[0]}</div>
                            </div>
                        </button>
                    </div>
                </div>
            ) : (
                <div className="text-center py-8 bg-[#0F213A] rounded-2xl border border-green-900/50 mt-4">
                    <Award size={48} className="mx-auto text-green-500 mb-4" />
                    <h3 className="text-xl md:text-2xl font-bold text-white mb-2">Match Completed</h3>
                    <p className="text-gray-400 mb-6">Winner: {match.winnerTeamId === t1.id ? t1.name : t2.name}</p>
                    <div className="flex flex-col md:flex-row gap-4 justify-center">
                        <button onClick={onShowBanner} className="bg-[#E67E50] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#ff8f5d] w-full md:w-auto">
                            Generate Winner Banner
                        </button>
                    </div>
                </div>
            )}

            {/* Quick Comments */}
             <div className="mt-8 mb-8">
                <h4 className="text-sm font-medium text-gray-400 mb-3 uppercase tracking-wider">Referee Comments</h4>
                <div className="flex flex-wrap gap-2">
                    {["Excellent Serve", "Great Defense", "Powerful Smash", "Nice Net Play", "Clutch Performance", "Fair Play"].map(tag => (
                        <button key={tag} onClick={() => handleTag(tag)} className="px-3 py-2 bg-[#0A1628] border border-gray-700 rounded-lg text-xs md:text-sm text-gray-300 hover:border-[#E67E50] hover:text-[#E67E50]">
                            {tag}
                        </button>
                    ))}
                </div>
            </div>

            {/* Broadcast Control Panel */}
            <div className="mt-8 mb-20 md:mb-0 border-t border-gray-800 pt-8">
                <h4 className="text-sm font-medium text-indigo-400 mb-3 uppercase tracking-wider flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    Broadcast Overlays
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <button 
                        onClick={() => triggerBroadcastEvent(tournamentId, match.id, {
                            id: Date.now().toString(),
                            type: 'TOMBSTONE',
                            message: 'MATCH POINT',
                            timestamp: Date.now(),
                            duration: 5000
                        })}
                        className="px-3 py-3 bg-red-900/20 border border-red-500/30 rounded-lg text-xs md:text-sm text-red-400 hover:bg-red-900/40 font-bold uppercase"
                    >
                        Match Point
                    </button>
                    <button 
                        onClick={() => triggerBroadcastEvent(tournamentId, match.id, {
                            id: Date.now().toString(),
                            type: 'TOMBSTONE',
                            message: 'SET POINT',
                            timestamp: Date.now(),
                            duration: 5000
                        })}
                        className="px-3 py-3 bg-orange-900/20 border border-orange-500/30 rounded-lg text-xs md:text-sm text-orange-400 hover:bg-orange-900/40 font-bold uppercase"
                    >
                        Set Point
                    </button>
                    <button 
                        onClick={() => triggerBroadcastEvent(tournamentId, match.id, {
                            id: Date.now().toString(),
                            type: 'TOMBSTONE',
                            message: 'BREAK POINT',
                            timestamp: Date.now(),
                            duration: 5000
                        })}
                        className="px-3 py-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg text-xs md:text-sm text-yellow-400 hover:bg-yellow-900/40 font-bold uppercase"
                    >
                        Break Point
                    </button>
                    <button 
                        onClick={() => triggerBroadcastEvent(tournamentId, match.id, {
                            id: Date.now().toString(),
                            type: 'VIOLATOR',
                            message: 'NEXT MATCH',
                            subMessage: 'COMING UP SHORTLY',
                            timestamp: Date.now(),
                            duration: 8000
                        })}
                        className="px-3 py-3 bg-blue-900/20 border border-blue-500/30 rounded-lg text-xs md:text-sm text-blue-400 hover:bg-blue-900/40 font-bold uppercase"
                    >
                        Next Match
                    </button>
                </div>
            </div>
        </div>
    )
}

// Winner Banner Component
const WinnerBanner = ({ match, tournamentName, teams, sponsors, onClose }: any) => {
    const winner = teams.find((t: any) => t.id === match.winnerTeamId);
    
    // Filter Sponsors (No Silver)
    const displaySponsors = sponsors?.filter((s: any) => typeof s !== 'string' && s.tier !== SponsorTier.SILVER) || [];

    return (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-2 md:p-4 overflow-y-auto">
             <div className="w-full max-w-4xl bg-gradient-to-br from-[#0A1628] to-[#1a2c47] border border-[#E67E50] rounded-2xl md:rounded-3xl p-6 md:p-12 relative overflow-hidden text-center shadow-[0_0_100px_rgba(230,126,80,0.2)]">
                {/* Close Button */}
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white bg-black/20 p-2 rounded-full"><X size={24}/></button>
                
                {/* Decorative Elements */}
                <div className="absolute top-0 left-0 w-full h-2 bg-[#E67E50]"></div>
                <Trophy className="absolute top-10 left-10 text-[#E67E50]/10 w-32 h-32 md:w-64 md:h-64" />

                {/* Content */}
                <div className="relative z-10 flex flex-col items-center">
                    <div className="text-[#E67E50] font-bold tracking-[0.3em] uppercase mb-2 md:mb-4 text-xs md:text-sm">Match Winner</div>
                    <h1 className="text-4xl md:text-8xl font-black text-white italic tracking-tighter mb-6 md:mb-6 drop-shadow-2xl break-words w-full">
                        {winner.name.toUpperCase()}
                    </h1>
                    
                    <div className="flex flex-col md:flex-row justify-center gap-6 md:gap-12 mb-8 md:mb-12 w-full">
                        <div className="text-center flex flex-row md:flex-col items-center justify-center gap-4 md:gap-0">
                            <div className="w-20 h-20 md:w-32 md:h-32 bg-gray-800 rounded-full md:mb-4 border-4 border-[#E67E50] flex items-center justify-center overflow-hidden relative shrink-0">
                                {winner.player1.photoUrl ? (
                                    <img src={winner.player1.photoUrl} alt={winner.player1.name} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-2xl md:text-4xl">👤</span>
                                )}
                            </div>
                            <div className="text-lg md:text-xl font-bold text-white text-left md:text-center">
                                {winner.player1.name}
                                <div className="text-xs text-gray-400 md:hidden">Player 1</div>
                            </div>
                        </div>
                         <div className="text-center flex flex-row md:flex-col items-center justify-center gap-4 md:gap-0">
                            <div className="w-20 h-20 md:w-32 md:h-32 bg-gray-800 rounded-full md:mb-4 border-4 border-[#E67E50] flex items-center justify-center overflow-hidden relative shrink-0">
                                 {winner.player2.photoUrl ? (
                                    <img src={winner.player2.photoUrl} alt={winner.player2.name} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-2xl md:text-4xl">👤</span>
                                )}
                            </div>
                            <div className="text-lg md:text-xl font-bold text-white text-left md:text-center">
                                {winner.player2.name}
                                <div className="text-xs text-gray-400 md:hidden">Player 2</div>
                            </div>
                        </div>
                    </div>

                    <div className="inline-block bg-[#0F213A]/80 backdrop-blur border border-gray-700 rounded-xl px-4 py-3 md:px-8 md:py-4 mb-6 md:mb-8 w-full md:w-auto">
                        <div className="text-xs md:text-sm text-gray-400 uppercase tracking-widest mb-1">{tournamentName}</div>
                        <div className="text-lg md:text-2xl font-bold text-white">{match.roundName}</div>
                        <div className="text-base md:text-xl text-[#E67E50] font-bold">Score: {match.score.p1Sets} - {match.score.p2Sets}</div>
                    </div>

                    <div className="flex flex-wrap justify-center gap-2 mb-8">
                         {match.refereeNotes?.map((tag: string) => (
                             <span key={tag} className="px-2 py-1 md:px-3 md:py-1 bg-[#E67E50] text-white text-[10px] md:text-xs font-bold rounded-full uppercase">{tag}</span>
                         ))}
                    </div>

                    {/* Sponsor Footer (Gold/Platinum/Title only) */}
                    {displaySponsors.length > 0 && (
                        <div className="border-t border-white/10 pt-4 w-full">
                            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-3">Sponsored By</p>
                            <div className="flex flex-wrap justify-center items-center gap-6">
                                {displaySponsors.map((s: any, i: number) => (
                                    <img key={i} src={s.logo} className="h-8 md:h-12 object-contain grayscale opacity-70" />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
             </div>
             <div className="absolute bottom-4 text-gray-500 text-xs text-center w-full px-4">Screenshot to save</div>
        </div>
    )
}