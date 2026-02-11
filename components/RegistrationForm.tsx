import React, { useState, useRef, useEffect } from 'react';
import { subscribeToTournaments, registerTeam } from '../services/storage';
import { Tournament } from '../types';
import { User, Phone, Mail, Users, CheckCircle, Camera, ChevronRight, MapPin } from 'lucide-react';

export const RegistrationForm: React.FC = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    teamName: '',
    p1Name: '', p1Phone: '', p1Email: '', p1Photo: '',
    p2Name: '', p2Phone: '', p2Email: '', p2Photo: ''
  });

  const p1FileInputRef = useRef<HTMLInputElement>(null);
  const p2FileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = subscribeToTournaments((data) => setTournaments(data));
    return () => unsubscribe();
  }, []);

  // Helper to compress and convert image to base64
  const processImage = (file: File, callback: (base64: string) => void) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const MAX_WIDTH = 300;
            const scaleSize = MAX_WIDTH / img.width;
            canvas.width = MAX_WIDTH;
            canvas.height = img.height * scaleSize;
            
            if (ctx) {
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                callback(canvas.toDataURL('image/jpeg', 0.7));
            }
        };
        img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, player: 'p1' | 'p2') => {
    if (e.target.files && e.target.files[0]) {
        processImage(e.target.files[0], (base64) => {
            if (player === 'p1') setFormData(prev => ({ ...prev, p1Photo: base64 }));
            else setFormData(prev => ({ ...prev, p2Photo: base64 }));
        });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTournament) return;
    setLoading(true);
    
    try {
        await registerTeam(selectedTournament.id, {
            name: formData.teamName,
            player1: { 
                name: formData.p1Name, 
                phone: formData.p1Phone, 
                email: formData.p1Email, 
                verified: true,
                photoUrl: formData.p1Photo 
            },
            player2: { 
                name: formData.p2Name, 
                phone: formData.p2Phone, 
                email: formData.p2Email, 
                verified: true,
                photoUrl: formData.p2Photo
            }
        });
        setSubmitted(true);
    } catch (err) {
        alert("Error registering team.");
        console.error(err);
    }
    setLoading(false);
  };

  if (!selectedTournament) {
      return (
          <div className="pb-20 max-w-2xl mx-auto">
              <h1 className="text-3xl font-bold text-white mb-6 text-center">Tournament Registration</h1>
              <p className="text-gray-400 text-center mb-8">Choose an active tournament to join.</p>
              
              <div className="space-y-4">
                  {tournaments.length === 0 && <p className="text-center text-gray-500">No tournaments available.</p>}
                  {tournaments.map(t => (
                      <button 
                        key={t.id} 
                        onClick={() => setSelectedTournament(t)}
                        className="w-full bg-[#0F213A] p-6 rounded-xl border border-gray-800 hover:border-[#E67E50] flex justify-between items-center group transition-all text-left"
                      >
                          <div className="flex-1">
                              <div className="font-bold text-lg text-white group-hover:text-[#E67E50] mb-1">{t.name}</div>
                              {/* Highlighted Venue */}
                              <div className="inline-flex items-center gap-1 bg-[#E67E50]/20 text-[#E67E50] px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider mb-2">
                                  <MapPin size={12} /> {t.venue || "Venue TBD"}
                              </div>
                              <div className="text-sm text-gray-400 flex flex-wrap gap-x-4">
                                  <span>Entry: <span className="text-white font-medium">{t.currency || 'PKR'} {t.entryFee}</span></span>
                                  <span>• {t.format.replace('_', ' ')}</span>
                                  {t.organizer && <span>• Org: {t.organizer}</span>}
                              </div>
                          </div>
                          <ChevronRight className="text-gray-600 group-hover:text-white" />
                      </button>
                  ))}
              </div>
          </div>
      )
  }

  if (submitted) {
    return (
        <div className="max-w-md mx-auto mt-10 text-center p-8 bg-[#0F213A] rounded-2xl border border-green-900/50">
            <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Registration Received!</h2>
            <p className="text-gray-400">
                Team <span className="text-[#E67E50]">{formData.teamName}</span> has been submitted for approval. 
            </p>
            <button 
                onClick={() => { setSubmitted(false); setSelectedTournament(null); setFormData({ teamName: '', p1Name: '', p1Phone: '', p1Email: '', p1Photo: '', p2Name: '', p2Phone: '', p2Email: '', p2Photo: '' })}}
                className="mt-8 text-sm text-gray-500 hover:text-white underline"
            >
                Back to Tournaments
            </button>
        </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto pb-20">
      <button onClick={() => setSelectedTournament(null)} className="text-gray-500 hover:text-white mb-6 flex items-center gap-1">
          &larr; Choose Different Tournament
      </button>

      <div className="text-center mb-8 md:mb-10">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Join {selectedTournament.name}</h1>
        <div className="flex flex-col items-center gap-1">
             <div className="inline-flex items-center gap-1 text-[#E67E50] font-bold uppercase text-sm mb-1">
                 <MapPin size={14} /> {selectedTournament.venue || "Venue TBD"}
             </div>
             <p className="text-gray-400 text-sm md:text-base">
                Entry: {selectedTournament.currency || 'PKR'} {selectedTournament.entryFee} • {selectedTournament.format.replace('_', ' ')}
             </p>
             {selectedTournament.organizer && <p className="text-gray-500 text-xs">Organized by {selectedTournament.organizer}</p>}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
        {/* Team Info */}
        <div className="bg-[#0F213A] p-4 md:p-6 rounded-2xl border border-gray-800">
          <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
            <Users className="text-[#E67E50]" size={20} /> Team Details
          </h3>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Team Name</label>
            <input 
              required
              value={formData.teamName}
              onChange={e => setFormData({...formData, teamName: e.target.value})}
              className="w-full bg-[#0A1628] border border-gray-700 rounded-lg p-3 text-white focus:border-[#E67E50] focus:outline-none"
              placeholder="e.g. The Match Up Pros"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Player 1 */}
            <div className="bg-[#0F213A] p-4 md:p-6 rounded-2xl border border-gray-800">
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-medium text-white flex items-center gap-2">
                        <User className="text-[#E67E50]" size={20} /> Player 1
                    </h3>
                    <div 
                        onClick={() => p1FileInputRef.current?.click()}
                        className="w-12 h-12 rounded-full bg-[#0A1628] border border-dashed border-gray-600 flex items-center justify-center cursor-pointer hover:border-[#E67E50] overflow-hidden"
                    >
                        {formData.p1Photo ? (
                            <img src={formData.p1Photo} alt="P1" className="w-full h-full object-cover" />
                        ) : (
                            <Camera size={16} className="text-gray-500" />
                        )}
                        <input 
                            type="file" 
                            ref={p1FileInputRef} 
                            onChange={(e) => handleImageChange(e, 'p1')} 
                            className="hidden" 
                            accept="image/*"
                        />
                    </div>
                </div>
                <div className="space-y-4">
                    <Input label="Full Name" value={formData.p1Name} onChange={(v: string) => setFormData({...formData, p1Name: v})} icon={<User size={16}/>} />
                    <Input label="Phone" value={formData.p1Phone} onChange={(v: string) => setFormData({...formData, p1Phone: v})} icon={<Phone size={16}/>} />
                    <Input label="Email" value={formData.p1Email} onChange={(v: string) => setFormData({...formData, p1Email: v})} icon={<Mail size={16}/>} />
                </div>
            </div>

            {/* Player 2 */}
            <div className="bg-[#0F213A] p-4 md:p-6 rounded-2xl border border-gray-800">
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-medium text-white flex items-center gap-2">
                        <User className="text-[#E67E50]" size={20} /> Player 2
                    </h3>
                    <div 
                        onClick={() => p2FileInputRef.current?.click()}
                        className="w-12 h-12 rounded-full bg-[#0A1628] border border-dashed border-gray-600 flex items-center justify-center cursor-pointer hover:border-[#E67E50] overflow-hidden"
                    >
                        {formData.p2Photo ? (
                            <img src={formData.p2Photo} alt="P2" className="w-full h-full object-cover" />
                        ) : (
                            <Camera size={16} className="text-gray-500" />
                        )}
                        <input 
                            type="file" 
                            ref={p2FileInputRef} 
                            onChange={(e) => handleImageChange(e, 'p2')} 
                            className="hidden" 
                            accept="image/*"
                        />
                    </div>
                </div>
                <div className="space-y-4">
                    <Input label="Full Name" value={formData.p2Name} onChange={(v: string) => setFormData({...formData, p2Name: v})} icon={<User size={16}/>} />
                    <Input label="Phone" value={formData.p2Phone} onChange={(v: string) => setFormData({...formData, p2Phone: v})} icon={<Phone size={16}/>} />
                    <Input label="Email" value={formData.p2Email} onChange={(v: string) => setFormData({...formData, p2Email: v})} icon={<Mail size={16}/>} />
                </div>
            </div>
        </div>

        <button 
          disabled={loading}
          className="w-full bg-[#E67E50] hover:bg-[#ff8f5d] text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Submitting...' : 'Submit Registration'}
        </button>
      </form>
    </div>
  );
};

// Simple Input Component
const Input = ({ label, value, onChange, icon, type = "text" }: any) => (
  <div>
    <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">{label}</label>
    <div className="relative">
      <div className="absolute left-3 top-3.5 text-gray-500">
        {icon}
      </div>
      <input 
        type={type}
        className="w-full bg-[#0A1628] border border-gray-700 rounded-lg py-3 pl-10 pr-4 text-white focus:border-[#E67E50] focus:outline-none focus:ring-1 focus:ring-[#E67E50] transition-all"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  </div>
);
