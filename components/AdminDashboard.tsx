import React, { useState, useEffect } from 'react';
import { TournamentFormat, SkillLevel, Tournament, RegistrationStatus, RoundRobinType, Team, Match } from '../types';
import { createTournament, deleteTournament, updateTournament, subscribeToTournaments, subscribeToTournament, updateTeamStatus, generateSchedule, assignTeamGroup, updateMatchDetails } from '../services/storage';
import { Check, X, Calendar, Users, Trophy, PlayCircle, Lock, RefreshCcw, ChevronLeft, Plus, ChevronRight, Grid, ArrowRight, Settings, Edit3, MapPin, DollarSign, Database, Trash2, Mail, Phone, Hash, AlertTriangle, Loader2 } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);
  const [activeTournament, setActiveTournament] = useState<Tournament | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Tournament | null>(null);
  
  // Wizard States
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [view, setView] = useState<'OVERVIEW' | 'GROUPS' | 'SCHEDULE' | 'KNOCKOUT'>('OVERVIEW');

  // Session Check on Mount
  useEffect(() => {
    const session = localStorage.getItem('admin_session');
    if (session) {
        const { timestamp } = JSON.parse(session);
        // 30 Minutes Expiry
        if (Date.now() - timestamp < 30 * 60 * 1000) {
            setIsAuthenticated(true);
        } else {
            localStorage.removeItem('admin_session');
        }
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
        const unsubscribe = subscribeToTournaments((data: Tournament[]) => setTournaments(data));
        return () => unsubscribe();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (selectedTournamentId) {
        const unsubscribe = subscribeToTournament(selectedTournamentId, (data: Tournament | null) => setActiveTournament(data));
        return () => unsubscribe();
    } else {
        setActiveTournament(null);
    }
  }, [selectedTournamentId]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginEmail === 'zayam@test.com' && loginPassword === 'Test123!@#') {
        setIsAuthenticated(true);
        localStorage.setItem('admin_session', JSON.stringify({ timestamp: Date.now() }));
    } else {
        alert("Invalid credentials. Please use the testing account.");
    }
  };

  const handleDeleteTournament = (e: React.MouseEvent, t: Tournament) => {
      e.stopPropagation();
      const teams = t.teams || [];
      const acceptedTeams = teams.filter(team => team.status === RegistrationStatus.ACCEPTED).length;
      
      if (acceptedTeams >= 2) {
          alert("Cannot delete tournament with 2 or more active teams.");
          return;
      }
      setDeleteTarget(t);
  };

  const confirmDelete = async () => {
      if (!deleteTarget) return;
      try {
          await deleteTournament(deleteTarget.id);
          if (selectedTournamentId === deleteTarget.id) {
             setSelectedTournamentId(null);
          }
          setDeleteTarget(null);
      } catch (err) {
          console.error("Delete failed:", err);
          alert("Failed to delete tournament. Please try again.");
      }
  };

  const handleEditTournament = (e: React.MouseEvent, t: Tournament) => {
      e.stopPropagation();
      setEditingId(t.id);
      setIsCreating(true);
  };

  if (!isAuthenticated) {
    return (
        <div className="max-w-md mx-auto mt-10 md:mt-20 p-6 md:p-8 bg-[#0F213A] rounded-2xl border border-gray-800 shadow-2xl mx-4">
            <h2 className="text-2xl font-bold text-center text-white mb-8">Admin Portal</h2>
            <form onSubmit={handleLogin} className="space-y-4">
                <input type="email" className="w-full bg-[#0A1628] border border-gray-700 rounded-xl p-3 text-white" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="admin@matchup.com" />
                <input type="password" className="w-full bg-[#0A1628] border border-gray-700 rounded-xl p-3 text-white" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="••••••••" />
                <button className="w-full bg-[#E67E50] text-white font-bold py-4 rounded-xl mt-4">Sign In</button>
            </form>
        </div>
    );
  }

  if (isCreating) {
      const editData = editingId ? tournaments.find(t => t.id === editingId) : null;
      return <CreateTournamentWizard initialData={editData} onCancel={() => { setIsCreating(false); setEditingId(null); }} onCreate={(id) => { setIsCreating(false); setSelectedTournamentId(id); setEditingId(null); }} />;
  }

  if (!selectedTournamentId) {
      return (
          <div className="pb-20">
              <div className="flex justify-between items-center mb-8">
                  <h1 className="text-3xl font-bold text-white">Tournaments</h1>
                  <button onClick={() => setIsCreating(true)} className="bg-[#E67E50] text-white px-4 py-2 rounded-lg flex items-center gap-2"><Plus size={20}/> New</button>
              </div>
              <div className="grid gap-4">
                {tournaments.map(t => (
                    <div key={t.id} className="bg-[#0F213A] p-6 rounded-xl border border-gray-800 flex justify-between items-center group">
                        <div onClick={() => setSelectedTournamentId(t.id)} className="cursor-pointer flex-1">
                            <h3 className="text-xl font-bold text-white group-hover:text-[#E67E50] transition-colors">{t.name}</h3>
                            <div className="text-gray-400">{t.format.replace('_', ' ')} • {(t.teams || []).length} Teams</div>
                        </div>
                        <div className="flex items-center gap-2">
                             <button onClick={(e) => handleEditTournament(e, t)} className="p-2 text-gray-500 hover:text-white"><Edit3 size={18}/></button>
                             {(t.teams || []).filter(x => x.status === RegistrationStatus.ACCEPTED).length < 2 && (
                                <button onClick={(e) => handleDeleteTournament(e, t)} className="p-2 text-gray-500 hover:text-red-500"><Trash2 size={18}/></button>
                             )}
                             <button onClick={() => setSelectedTournamentId(t.id)}><ChevronRight className="text-gray-600 group-hover:text-white"/></button>
                        </div>
                    </div>
                ))}
              </div>
              <DeleteConfirmationModal target={deleteTarget} onCancel={() => setDeleteTarget(null)} onConfirm={confirmDelete} />
          </div>
      )
  }

  if (!activeTournament) return <div>Loading...</div>;

  return (
      <div className="pb-20">
          <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                  <button onClick={() => setSelectedTournamentId(null)} className="text-gray-500 hover:text-white"><ChevronLeft/></button>
                  <h1 className="text-2xl font-bold text-white">{activeTournament.name}</h1>
              </div>
              <div className="flex gap-2">
                  <button onClick={(e) => handleEditTournament(e, activeTournament)} className="p-2 bg-gray-800 rounded-lg text-white hover:bg-gray-700"><Edit3 size={18}/></button>
                  {(activeTournament.teams || []).filter(x => x.status === RegistrationStatus.ACCEPTED).length < 2 && (
                       <button onClick={(e) => handleDeleteTournament(e, activeTournament)} className="p-2 bg-gray-800 rounded-lg text-red-400 hover:bg-red-900/20"><Trash2 size={18}/></button>
                  )}
              </div>
          </div>
          
          {/* Tabs */}
          <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
              <TabButton active={view === 'OVERVIEW'} onClick={() => setView('OVERVIEW')} label="Overview" icon={<Users size={16}/>} />
              {activeTournament.format === TournamentFormat.ROUND_ROBIN && activeTournament.rrType === RoundRobinType.GROUPS && (
                  <TabButton active={view === 'GROUPS'} onClick={() => setView('GROUPS')} label="Groups" icon={<Grid size={16}/>} />
              )}
              <TabButton active={view === 'SCHEDULE'} onClick={() => setView('SCHEDULE')} label="Schedule" icon={<Calendar size={16}/>} />
              <TabButton active={view === 'KNOCKOUT'} onClick={() => setView('KNOCKOUT')} label="Knockouts" icon={<Trophy size={16}/>} />
          </div>

          {view === 'OVERVIEW' && <OverviewTab tournament={activeTournament} />}
          {view === 'GROUPS' && <GroupAssignmentTab tournament={activeTournament} />}
          {view === 'SCHEDULE' && <ScheduleTab tournament={activeTournament} />}
          {view === 'KNOCKOUT' && <KnockoutTab tournament={activeTournament} />}
          
          <DeleteConfirmationModal target={deleteTarget} onCancel={() => setDeleteTarget(null)} onConfirm={confirmDelete} />
      </div>
  );
};

// --- SUB-COMPONENTS ---

const DeleteConfirmationModal = ({ target, onCancel, onConfirm }: any) => {
    if (!target) return null;
    return (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onCancel}>
            <div className="bg-[#0F213A] rounded-2xl w-full max-w-md border border-red-900/50 p-6 relative shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex flex-col items-center text-center">
                    <div className="h-14 w-14 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mb-4">
                        <AlertTriangle size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Delete Tournament?</h3>
                    <p className="text-gray-400 text-sm mb-6">
                        Are you sure you want to delete <span className="text-white font-bold">"{target.name}"</span>? 
                        This action cannot be undone.
                    </p>
                    <div className="flex gap-3 w-full">
                        <button 
                            onClick={onCancel}
                            className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-medium py-3 rounded-xl transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={onConfirm}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-red-900/20"
                        >
                            Delete Forever
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const TabButton = ({ active, onClick, label, icon }: any) => (
    <button onClick={onClick} className={`px-4 py-2 rounded-lg flex items-center gap-2 whitespace-nowrap ${active ? 'bg-[#E67E50] text-white' : 'bg-[#0F213A] text-gray-400 border border-gray-800'}`}>
        {icon} {label}
    </button>
);

const CreateTournamentWizard = ({ initialData, onCancel, onCreate }: any) => {
    const [step, setStep] = useState(1);
    const [data, setData] = useState(initialData ? {
        ...initialData,
        courts: initialData.courts.join(', ')
    } : {
        name: '', 
        format: TournamentFormat.SINGLE_ELIMINATION, 
        rrType: RoundRobinType.SINGLE, 
        groupSize: 4,
        skillLevel: SkillLevel.INTERMEDIATE, 
        maxTeams: 8, 
        entryFee: 5000, 
        currency: 'PKR',
        venue: '',
        organizer: '',
        refereePasscode: '1234', 
        courts: 'Court 1', 
        registrationDeadline: ''
    });

    const handleCreateOrUpdate = async () => {
        const payload = { ...data, courts: data.courts.split(',').map((s: string) => s.trim()) };
        if (initialData) {
            await updateTournament(initialData.id, payload);
            onCreate(initialData.id);
        } else {
            const id = await createTournament(payload);
            onCreate(id);
        }
    };

    return (
        <div className="bg-[#0F213A] p-8 rounded-2xl border border-gray-800 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-6">{initialData ? 'Edit' : 'Create'} Tournament (Step {step}/2)</h2>
            {step === 1 ? (
                <div className="space-y-4">
                    <Input label="Tournament Name" value={data.name} onChange={(v: string) => setData({...data, name: v})} />
                    <Input label="Venue Name" value={data.venue} onChange={(v: string) => setData({...data, venue: v})} icon={<MapPin size={16}/>} />
                    <Input label="Organized By (Optional)" value={data.organizer} onChange={(v: string) => setData({...data, organizer: v})} />
                    
                    <div>
                        <label className="block text-gray-400 text-sm mb-1">Format</label>
                        <select className="w-full bg-[#0A1628] p-3 rounded-lg text-white border border-gray-700" value={data.format} onChange={(e) => setData({...data, format: e.target.value as any})}>
                            <option value="SINGLE_ELIMINATION">Single Elimination</option>
                            <option value="DOUBLE_ELIMINATION">Double Elimination</option>
                            <option value="ROUND_ROBIN">Round Robin</option>
                        </select>
                    </div>
                    {data.format === 'ROUND_ROBIN' && (
                        <div className="grid grid-cols-2 gap-4 bg-[#0A1628] p-4 rounded-xl">
                            <div>
                                <label className="block text-gray-400 text-sm mb-1">Type</label>
                                <select className="w-full bg-[#0F213A] p-3 rounded-lg text-white" value={data.rrType} onChange={(e) => setData({...data, rrType: e.target.value as any})}>
                                    <option value="SINGLE">Single RR (Play once)</option>
                                    <option value="DOUBLE">Double RR (Play twice)</option>
                                    <option value="GROUPS">Group Stage</option>
                                </select>
                            </div>
                            {data.rrType === 'GROUPS' && (
                                <Input label="Teams per Group" type="number" value={data.groupSize} onChange={(v: string) => setData({...data, groupSize: parseInt(v)})} />
                            )}
                        </div>
                    )}
                    <button onClick={() => setStep(2)} className="w-full bg-[#E67E50] text-white py-3 rounded-lg mt-4 font-bold">Next</button>
                </div>
            ) : (
                <div className="space-y-4">
                     <div className="grid grid-cols-2 gap-4">
                         <Input label="Max Teams" type="number" value={data.maxTeams} onChange={(v: string) => setData({...data, maxTeams: parseInt(v)})} />
                         <div>
                             <label className="block text-gray-400 text-sm mb-1">Currency</label>
                             <select className="w-full bg-[#0A1628] p-3 rounded-lg text-white border border-gray-700 focus:border-[#E67E50] outline-none" value={data.currency} onChange={(e) => setData({...data, currency: e.target.value})}>
                                 <option value="PKR">PKR (Rs)</option>
                                 <option value="USD">USD ($)</option>
                             </select>
                         </div>
                     </div>
                     <Input 
                        label="Entry Fee" 
                        type="number" 
                        value={data.entryFee} 
                        onChange={(v: string) => setData({...data, entryFee: parseInt(v)})} 
                        icon={data.currency === 'USD' ? <DollarSign size={16}/> : <span className="text-xs font-bold text-gray-500 uppercase">Rs</span>} 
                     />
                     <Input label="Courts (comma sep)" value={data.courts} onChange={(v: string) => setData({...data, courts: v})} />
                     <Input label="Referee Passcode" value={data.refereePasscode} onChange={(v: string) => setData({...data, refereePasscode: v})} />
                     <div className="flex gap-4 mt-6">
                         <button onClick={() => setStep(1)} className="flex-1 bg-gray-700 text-white py-3 rounded-lg">Back</button>
                         <button onClick={handleCreateOrUpdate} className="flex-1 bg-[#E67E50] text-white py-3 rounded-lg font-bold">{initialData ? 'Update' : 'Create'}</button>
                     </div>
                </div>
            )}
            <button onClick={onCancel} className="mt-4 text-gray-500 text-sm w-full text-center">Cancel</button>
        </div>
    );
};

const Input = ({ label, value, onChange, type="text", icon }: any) => (
    <div>
        <label className="block text-gray-400 text-sm mb-1">{label}</label>
        <div className="relative">
            {icon && (
                <div className="absolute left-3 top-0 bottom-0 flex items-center justify-center text-gray-500 pointer-events-none min-w-[20px]">
                    {icon}
                </div>
            )}
            <input 
                type={type} 
                className={`w-full bg-[#0A1628] border border-gray-700 rounded-lg p-3 text-white focus:border-[#E67E50] outline-none transition-colors ${icon ? 'pl-10' : ''}`} 
                value={value} 
                onChange={e => onChange(e.target.value)} 
            />
        </div>
    </div>
);

const TeamDetailCard: React.FC<{ team: Team, actions?: React.ReactNode }> = ({ team, actions }) => {
    const [expanded, setExpanded] = useState(false);
    return (
        <div className="bg-[#0A1628] rounded-lg mb-2 overflow-hidden border border-gray-700/50 hover:border-[#E67E50]/50 transition-colors">
            <div className="flex justify-between items-center p-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
                <span className="text-white font-medium">{team.name}</span>
                <div className="flex items-center gap-2">
                    {actions}
                    <ChevronRight size={16} className={`text-gray-500 transition-transform ${expanded ? 'rotate-90' : ''}`} />
                </div>
            </div>
            {expanded && (
                <div className="p-3 bg-[#081220] border-t border-gray-800 text-sm space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <div className="text-gray-500 text-xs uppercase font-bold">Player 1</div>
                            <div className="flex items-center gap-2 text-white"><Users size={14}/> {team.player1.name}</div>
                            <div className="flex items-center gap-2 text-gray-400"><Phone size={14}/> {team.player1.phone}</div>
                            <div className="flex items-center gap-2 text-gray-400"><Mail size={14}/> {team.player1.email}</div>
                        </div>
                        <div className="space-y-1">
                            <div className="text-gray-500 text-xs uppercase font-bold">Player 2</div>
                            <div className="flex items-center gap-2 text-white"><Users size={14}/> {team.player2.name}</div>
                            <div className="flex items-center gap-2 text-gray-400"><Phone size={14}/> {team.player2.phone}</div>
                            <div className="flex items-center gap-2 text-gray-400"><Mail size={14}/> {team.player2.email}</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const OverviewTab = ({ tournament }: { tournament: Tournament }) => {
    const pending = (tournament.teams || []).filter(t => t.status === RegistrationStatus.PENDING);
    const accepted = (tournament.teams || []).filter(t => t.status === RegistrationStatus.ACCEPTED);
    
    return (
        <div className="space-y-8">
            {/* Tournament Details Card */}
            <div className="bg-[#0A1628] p-4 rounded-xl border border-gray-700 flex flex-wrap gap-4 text-sm text-gray-400">
                <div className="flex items-center gap-2"><MapPin size={16} className="text-[#E67E50]"/> {tournament.venue}</div>
                <div className="flex items-center gap-2">
                    {tournament.currency === 'USD' ? <DollarSign size={16} className="text-[#E67E50]"/> : <span className="text-[#E67E50] font-bold">Rs</span>} 
                    {tournament.entryFee}
                </div>
                {tournament.organizer && <div className="flex items-center gap-2"><Users size={16} className="text-[#E67E50]"/> Org: {tournament.organizer}</div>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-[#0F213A] p-6 rounded-2xl border border-gray-800">
                    <h3 className="font-bold text-white mb-4">Pending ({pending.length})</h3>
                    {pending.map(t => (
                        <TeamDetailCard 
                            key={t.id} 
                            team={t} 
                            actions={
                                <>
                                    <button onClick={(e) => { e.stopPropagation(); updateTeamStatus(tournament.id, t.id, 'ACCEPTED'); }} className="p-1 bg-green-500/20 text-green-500 rounded hover:bg-green-500/30 transition-colors"><Check size={16}/></button>
                                    <button onClick={(e) => { e.stopPropagation(); updateTeamStatus(tournament.id, t.id, 'REJECTED'); }} className="p-1 bg-red-500/20 text-red-500 rounded hover:bg-red-500/30 transition-colors"><X size={16}/></button>
                                </>
                            } 
                        />
                    ))}
                    {pending.length === 0 && <p className="text-gray-500 text-sm">No pending registrations.</p>}
                </div>
                <div className="bg-[#0F213A] p-6 rounded-2xl border border-gray-800">
                    <h3 className="font-bold text-white mb-4">Accepted ({accepted.length})</h3>
                    {accepted.map(t => (
                        <TeamDetailCard 
                            key={t.id} 
                            team={t} 
                            actions={<span className="text-xs text-green-500 bg-green-500/10 px-2 py-1 rounded">Ready</span>} 
                        />
                    ))}
                     {accepted.length === 0 && <p className="text-gray-500 text-sm">No teams accepted yet.</p>}
                </div>
            </div>

            {/* Standings Section for Round Robin */}
            {tournament.format === TournamentFormat.ROUND_ROBIN && (
                 <div>
                     <h3 className="text-xl font-bold text-white mb-4">Current Standings</h3>
                     <StandingsTable teams={tournament.teams || []} tournament={tournament} />
                 </div>
            )}
             {/* Visual Bracket for Elimination Formats */}
            {(tournament.format === TournamentFormat.SINGLE_ELIMINATION || tournament.format === TournamentFormat.DOUBLE_ELIMINATION) && (
                <div>
                    <h3 className="text-xl font-bold text-white mb-4">Tournament Bracket</h3>
                    <BracketView matches={tournament.matches || []} teams={tournament.teams || []} />
                </div>
            )}
        </div>
    )
}

const BracketView = ({ matches, teams }: any) => {
    // Basic Bracket Visualization
    // Group matches by round
    const rounds: Record<string, Match[]> = {};
    matches.forEach((m: Match) => {
        if (!rounds[m.round]) rounds[m.round] = [];
        rounds[m.round].push(m);
    });

    const roundKeys = Object.keys(rounds).sort((a,b) => parseInt(a) - parseInt(b));
    if (roundKeys.length === 0) return <p className="text-gray-500">No bracket generated yet.</p>;

    return (
        <div className="overflow-x-auto pb-4">
            <div className="flex gap-8 min-w-max">
                {roundKeys.map(r => (
                    <div key={r} className="flex flex-col justify-around gap-4 min-w-[200px]">
                        <h4 className="text-center text-[#E67E50] font-bold text-sm mb-2">{rounds[r][0].roundName}</h4>
                        {rounds[r].map(m => {
                             const t1 = teams.find((t: any) => t.id === m.team1Id);
                             const t2 = teams.find((t: any) => t.id === m.team2Id);
                             return (
                                 <div key={m.id} className="bg-[#0A1628] border border-gray-700 rounded p-2 text-xs relative">
                                     <div className={`p-1 mb-1 rounded flex justify-between ${m.winnerTeamId === m.team1Id ? 'bg-green-900/30 text-green-400' : 'text-gray-300'}`}>
                                         <span>{t1?.name || 'TBD'}</span>
                                         {m.status === 'COMPLETED' && <span className="font-bold">{m.score.p1Sets}</span>}
                                     </div>
                                     <div className={`p-1 rounded flex justify-between ${m.winnerTeamId === m.team2Id ? 'bg-green-900/30 text-green-400' : 'text-gray-300'}`}>
                                         <span>{t2?.name || 'TBD'}</span>
                                         {m.status === 'COMPLETED' && <span className="font-bold">{m.score.p2Sets}</span>}
                                     </div>
                                     {/* Connector lines could go here with SVG but simple flex is safer for now */}
                                 </div>
                             )
                        })}
                    </div>
                ))}
            </div>
        </div>
    )
};

const StandingsTable = ({ teams, tournament }: any) => {
    // Check if groups exist
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

const GroupAssignmentTab = ({ tournament }: { tournament: Tournament }) => {
    const teams = (tournament.teams || []).filter(t => t.status === RegistrationStatus.ACCEPTED);
    const groupSize = tournament.groupSize || 4;
    const numGroups = Math.ceil(teams.length / groupSize);
    
    // Group Math Check
    const isValid = teams.length > 0 && teams.length % numGroups === 0;

    return (
        <div className="bg-[#0F213A] p-6 rounded-2xl border border-gray-800">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-white">Group Assignments</h3>
                {!isValid && <div className="text-red-400 text-sm">Warning: Teams cannot be divided equally. {teams.length} teams / {groupSize} per group.</div>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {teams.map(team => (
                    <div key={team.id} className="flex items-center justify-between bg-[#0A1628] p-4 rounded-xl">
                        <span className="text-white font-medium">{team.name}</span>
                        <select 
                            className="bg-[#0F213A] text-white border border-gray-700 rounded px-2 py-1"
                            value={team.groupId || 'A'}
                            onChange={(e) => assignTeamGroup(tournament.id, team.id, e.target.value)}
                        >
                            {Array.from({length: numGroups}).map((_, i) => {
                                const gId = String.fromCharCode(65 + i); 
                                return <option key={gId} value={gId}>Group {gId}</option>;
                            })}
                        </select>
                    </div>
                ))}
            </div>
        </div>
    )
}

const ScheduleTab = ({ tournament }: { tournament: Tournament }) => {
    const [editingMatch, setEditingMatch] = useState<Match | null>(null);
    const [generating, setGenerating] = useState(false);

    const handleGenerate = async () => {
        if ((tournament.matches || []).length > 0) {
             const confirm = window.confirm("Existing matches found. 'OK' to overwite/reset schedule, 'Cancel' to keep existing (useful if manually adding next rounds).");
             if (!confirm) return;
        }
        
        setGenerating(true);
        try {
            await generateSchedule(tournament.id);
        } catch(e) {
            console.error(e);
            alert("Failed to generate schedule. Ensure you have accepted teams.");
        } finally {
            setGenerating(false);
        }
    };

    const handleSaveEdit = async () => {
        if (!editingMatch) return;
        await updateMatchDetails(tournament.id, editingMatch.id, { 
            scheduledTime: editingMatch.scheduledTime,
            court: editingMatch.court
        });
        setEditingMatch(null);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between gap-4">
                <h3 className="text-xl font-bold text-white">Match Schedule</h3>
                <div className="flex gap-2">
                    <button onClick={handleGenerate} disabled={generating} className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors">
                        {generating ? <Loader2 size={16} className="animate-spin"/> : <RefreshCcw size={16}/>} 
                        {generating ? 'Generating...' : 'Auto-Schedule'}
                    </button>
                </div>
            </div>

            <div className="grid gap-3">
                {(tournament.matches || []).sort((a,b) => a.scheduledTime.localeCompare(b.scheduledTime)).map(m => {
                    const t1 = (tournament.teams || []).find(t => t.id === m.team1Id)?.name || 'TBD';
                    const t2 = (tournament.teams || []).find(t => t.id === m.team2Id)?.name || 'TBD';
                    return (
                        <div key={m.id} className="bg-[#0F213A] p-4 rounded-xl border border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
                            <div className="flex-1">
                                <div className="text-[#E67E50] text-xs font-bold uppercase">{m.roundName} {m.group ? `(GRP ${m.group})` : ''}</div>
                                <div className="text-white font-medium text-lg">{t1} vs {t2}</div>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-400">
                                <span>{new Date(m.scheduledTime).toLocaleString()}</span>
                                <span className="bg-[#0A1628] px-2 py-1 rounded border border-gray-700">{m.court}</span>
                                <button onClick={() => setEditingMatch(m)} className="text-white hover:text-[#E67E50]"><Edit3 size={18}/></button>
                            </div>
                        </div>
                    )
                })}
                {(tournament.matches || []).length === 0 && (
                    <div className="text-center py-10 text-gray-500 border border-dashed border-gray-800 rounded-xl">
                        No matches scheduled yet. Use Auto-Schedule to generate.
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            {editingMatch && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
                    <div className="bg-[#0F213A] p-6 rounded-2xl w-full max-w-md border border-gray-700">
                        <h3 className="text-xl font-bold text-white mb-4">Edit Match</h3>
                        <div className="space-y-4">
                            <Input label="Date & Time" type="datetime-local" value={editingMatch.scheduledTime.slice(0, 16)} onChange={(v: string) => setEditingMatch({...editingMatch, scheduledTime: v})} />
                            <Input label="Court" value={editingMatch.court} onChange={(v: string) => setEditingMatch({...editingMatch, court: v})} />
                            <div className="flex gap-4 mt-6">
                                <button onClick={() => setEditingMatch(null)} className="flex-1 bg-gray-700 text-white py-3 rounded-lg">Cancel</button>
                                <button onClick={handleSaveEdit} className="flex-1 bg-[#E67E50] text-white py-3 rounded-lg font-bold">Save</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

const KnockoutTab = ({ tournament }: { tournament: Tournament }) => {
    const [newMatch, setNewMatch] = useState({ name: 'Quarter Final 1', t1Source: '', t2Source: '', court: 'Center Court', scheduledTime: '' });

    const handleAddKnockout = async () => {
        const config = [{
            id: Math.random().toString(),
            name: newMatch.name,
            t1Source: newMatch.t1Source,
            t2Source: newMatch.t2Source,
            court: newMatch.court,
            scheduledTime: newMatch.scheduledTime || new Date().toISOString()
        }];
        await generateSchedule(tournament.id, config);
        alert("Knockout match added!");
    };

    return (
        <div className="bg-[#0F213A] p-6 rounded-2xl border border-gray-800">
             <h3 className="text-xl font-bold text-white mb-6">Knockout Match Builder</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                 <Input label="Round Name" value={newMatch.name} onChange={(v: string) => setNewMatch({...newMatch, name: v})} />
                 <div className="grid grid-cols-2 gap-4">
                    <Input label="Team 1 Source (e.g. GROUP:A:1)" value={newMatch.t1Source} onChange={(v: string) => setNewMatch({...newMatch, t1Source: v})} />
                    <Input label="Team 2 Source (e.g. GROUP:B:2)" value={newMatch.t2Source} onChange={(v: string) => setNewMatch({...newMatch, t2Source: v})} />
                 </div>
                 <Input label="Court" value={newMatch.court} onChange={(v: string) => setNewMatch({...newMatch, court: v})} />
                 <Input label="Time" type="datetime-local" value={newMatch.scheduledTime} onChange={(v: string) => setNewMatch({...newMatch, scheduledTime: v})} />
             </div>
             <button onClick={handleAddKnockout} className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700">Add Match to Schedule</button>
             
             <div className="mt-8 text-sm text-gray-500">
                 <p className="font-bold mb-2 text-white">Syntax Guide:</p>
                 <ul className="list-disc pl-5 space-y-1">
                     <li>Top of Group A: <code>GROUP:A:1</code></li>
                     <li>Runner up Group B: <code>GROUP:B:2</code></li>
                     <li>Winner of Match ID: <code>MATCH:[MatchID]:WINNER</code></li>
                 </ul>
             </div>
        </div>
    )
}