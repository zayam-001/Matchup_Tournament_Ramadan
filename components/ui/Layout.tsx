import React, { useState } from 'react';
import { Trophy, Activity, Users, LogOut, MessageCircle, ClipboardList, Lock, ExternalLink } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange }) => {
  const [showOrganizerForm, setShowOrganizerForm] = useState(false);

  return (
    <div className="min-h-screen bg-[#0A1628] text-gray-100 flex flex-col md:flex-row pb-0 md:pb-0">
      {/* Sidebar (Desktop) / Bottom Nav (Mobile) */}
      <nav className="fixed bottom-0 left-0 w-full md:static md:w-20 lg:w-64 md:h-screen bg-[#0F213A] border-t md:border-t-0 md:border-r border-gray-800 flex md:flex-col items-center justify-between md:justify-start py-2 md:py-4 z-50 transition-all duration-300 ease-in-out group px-4 md:px-2 shadow-[0_-5px_20px_rgba(0,0,0,0.3)] md:shadow-none">
        
        {/* Logo Area */}
        <div className="hidden md:flex flex-col items-center mb-8 px-4 w-full">
          {/* Match Up Logo Icon */}
          <div className="h-12 w-12 bg-white rounded-xl grid grid-cols-3 gap-[3px] p-[6px] shadow-lg shrink-0 transition-transform duration-300 hover:rotate-[5deg] hover:scale-105">
            {[...Array(9)].map((_, i) => (
                <span 
                    key={i} 
                    className="w-full h-full bg-[#1C3144] rounded-full"
                    style={{ 
                        animation: 'logoPulse 2s ease-in-out infinite',
                        animationDelay: `${i * 0.1}s` 
                    }}
                />
            ))}
          </div>
          
          <span 
            className="text-2xl font-bold tracking-tight hidden lg:block md:group-hover:block text-white whitespace-nowrap overflow-hidden transition-all duration-300 mt-3"
            style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}
          >
            Match Up
          </span>
        </div>

        {/* Navigation Items */}
        <div className="flex flex-row md:flex-col w-full justify-around md:justify-start gap-1 md:gap-2">
          <NavItem 
            icon={<Activity />} 
            label="Live" 
            active={activeTab === 'live'} 
            onClick={() => onTabChange('live')} 
          />
          <NavItem 
            icon={<Users />} 
            label="Register" 
            active={activeTab === 'register'} 
            onClick={() => onTabChange('register')} 
          />
           <NavItem 
            icon={<Trophy />} 
            label="Referee" 
            active={activeTab === 'referee'} 
            onClick={() => onTabChange('referee')} 
          />
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto h-screen relative flex flex-col">
         {/* Mobile Header Logo */}
         <div className="md:hidden flex items-center gap-3 mb-0 sticky top-0 bg-[#0A1628]/95 backdrop-blur z-40 py-4 px-4 border-b border-gray-800/50">
             <div className="h-8 w-8 bg-white rounded-lg grid grid-cols-3 gap-[2px] p-[4px] shadow-lg">
                {[...Array(9)].map((_, i) => (
                    <span key={i} className="w-full h-full bg-[#1C3144] rounded-full" />
                ))}
             </div>
             <span className="text-xl font-bold text-white">Match Up</span>
         </div>

        <div className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
          {children}
        </div>

        {/* Compact Footer */}
        <footer className="bg-[#0F213A] border-t border-gray-800/50 mt-auto mb-20 md:mb-0 py-6">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
              
              {/* Left: Copyright & Links (Minimal) */}
              <div className="flex flex-col md:flex-row items-center gap-3 md:gap-6 text-xs text-gray-500 order-2 md:order-1">
                 <span>© {new Date().getFullYear()} Match Up</span>
                 <div className="hidden md:block w-1 h-1 bg-gray-700 rounded-full"></div>
                 <div className="flex items-center gap-4">
                    <button 
                        onClick={() => onTabChange('privacy')}
                        className="hover:text-white transition-colors"
                    >
                        Privacy Policy
                    </button>
                    <button 
                        onClick={() => setShowOrganizerForm(true)}
                        className="hover:text-[#E67E50] transition-colors"
                    >
                        Become an Organizer
                    </button>
                    <button 
                         onClick={() => onTabChange('admin')}
                         className="hover:text-white transition-colors flex items-center gap-1"
                    >
                        <Lock size={10} /> Admin
                    </button>
                 </div>
              </div>

              {/* Right: Prominent Community Button */}
              <a 
                href="https://chat.whatsapp.com/FmeRv7o6ZtH1iApVom78pG" 
                target="_blank" 
                rel="noreferrer"
                className="order-1 md:order-2 flex items-center gap-2 bg-[#25D366] text-[#0F213A] px-5 py-2.5 rounded-full font-bold text-sm hover:bg-[#20bd5a] transition-all hover:scale-105 shadow-lg shadow-green-900/20"
              >
                <MessageCircle size={18} fill="currentColor" className="text-[#0F213A]" />
                <span>Join Community</span>
              </a>

          </div>
        </footer>
      </main>

      {/* Organizer Request Modal */}
      {showOrganizerForm && (
          <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-[#0F213A] rounded-2xl w-full max-w-md border border-gray-700 p-8 relative shadow-2xl">
                  <button onClick={() => setShowOrganizerForm(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-transform hover:rotate-90"><LogOut size={20} className="rotate-45" /></button>
                  
                  <div className="flex items-center gap-3 mb-6">
                      <div className="bg-[#E67E50]/20 p-3 rounded-xl text-[#E67E50]">
                          <ClipboardList size={24} />
                      </div>
                      <div>
                          <h2 className="text-2xl font-bold text-white">Join as Organizer</h2>
                          <p className="text-gray-400 text-xs uppercase tracking-wider font-bold">Partner with Match Up</p>
                      </div>
                  </div>
                  
                  <p className="text-gray-300 text-sm mb-6 leading-relaxed">
                      Submit your details below to start hosting professional tournaments on the Match Up platform.
                  </p>
                  
                  <form className="space-y-4" onSubmit={(e) => {
                      e.preventDefault();
                      alert("Request received! We will contact you shortly.");
                      setShowOrganizerForm(false);
                  }}>
                      <div className="space-y-4">
                        <input required type="text" placeholder="Full Name" className="w-full bg-[#0A1628] border border-gray-700 rounded-xl p-3.5 text-white placeholder-gray-500 focus:border-[#E67E50] focus:ring-1 focus:ring-[#E67E50] outline-none transition-all" />
                        <input required type="email" placeholder="Email Address" className="w-full bg-[#0A1628] border border-gray-700 rounded-xl p-3.5 text-white placeholder-gray-500 focus:border-[#E67E50] focus:ring-1 focus:ring-[#E67E50] outline-none transition-all" />
                        <div className="grid grid-cols-2 gap-4">
                            <input required type="tel" placeholder="Phone" className="w-full bg-[#0A1628] border border-gray-700 rounded-xl p-3.5 text-white placeholder-gray-500 focus:border-[#E67E50] focus:ring-1 focus:ring-[#E67E50] outline-none transition-all" />
                            <input required type="text" placeholder="CNIC" className="w-full bg-[#0A1628] border border-gray-700 rounded-xl p-3.5 text-white placeholder-gray-500 focus:border-[#E67E50] focus:ring-1 focus:ring-[#E67E50] outline-none transition-all" />
                        </div>
                        <textarea required placeholder="Tell us about your organization plans..." className="w-full bg-[#0A1628] border border-gray-700 rounded-xl p-3.5 text-white placeholder-gray-500 focus:border-[#E67E50] focus:ring-1 focus:ring-[#E67E50] outline-none h-28 resize-none transition-all"></textarea>
                      </div>
                      
                      <button type="submit" className="w-full bg-[#E67E50] hover:bg-[#ff8f5d] text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-orange-500/20 mt-2">
                          Submit Request
                      </button>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

const NavItem = ({ icon, label, active, onClick }: any) => (
  <button
    onClick={onClick}
    className={`flex flex-col md:flex-row items-center md:gap-3 p-2 md:p-3 rounded-xl transition-all duration-200 flex-1 md:flex-none justify-center md:justify-center md:group-hover:justify-start lg:justify-start
      ${active 
        ? 'bg-[#E67E50]/10 md:bg-[#E67E50] text-[#E67E50] md:text-white md:shadow-lg md:shadow-orange-500/20' 
        : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
  >
    <div className={`shrink-0 transition-transform duration-200 ${active ? 'scale-110 md:scale-100' : ''}`}>
        {React.cloneElement(icon, { size: active ? 24 : 20 })}
    </div>
    <span className={`text-[10px] md:text-base font-medium mt-1 md:mt-0 md:hidden lg:block md:group-hover:block whitespace-nowrap overflow-hidden`}>{label}</span>
  </button>
);