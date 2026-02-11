import React from 'react';
import { Trophy, Activity, Users, LogOut } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange }) => {
  return (
    <div className="min-h-screen bg-[#0A1628] text-gray-100 flex flex-col md:flex-row pb-20 md:pb-0">
      {/* Sidebar (Desktop) / Bottom Nav (Mobile) */}
      <nav className="fixed bottom-0 left-0 w-full md:static md:w-20 lg:w-64 md:h-screen bg-[#0F213A] border-t md:border-t-0 md:border-r border-gray-800 flex md:flex-col items-center justify-between md:justify-start py-2 md:py-4 z-50 transition-all duration-300 ease-in-out group px-4 md:px-2 shadow-[0_-5px_20px_rgba(0,0,0,0.3)] md:shadow-none">
        
        {/* Logo Area - Hidden on Mobile to save space, or moved to top header in main content if needed. Keeping it simple for now. */}
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
           <NavItem 
            icon={<LogOut />} 
            label="Admin" 
            active={activeTab === 'admin'} 
            onClick={() => onTabChange('admin')} 
          />
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 md:h-screen relative">
         {/* Mobile Header Logo */}
         <div className="md:hidden flex items-center gap-3 mb-6 sticky top-0 bg-[#0A1628]/95 backdrop-blur z-40 py-2 border-b border-gray-800/50 -mx-4 px-4">
             <div className="h-8 w-8 bg-white rounded-lg grid grid-cols-3 gap-[2px] p-[4px] shadow-lg">
                {[...Array(9)].map((_, i) => (
                    <span key={i} className="w-full h-full bg-[#1C3144] rounded-full" />
                ))}
             </div>
             <span className="text-xl font-bold text-white">Match Up</span>
         </div>

        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
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