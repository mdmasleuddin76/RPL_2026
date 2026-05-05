import React from 'react';
import { Trophy, BarChart2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-slate-800/80 shadow-sm">
      {/* max-w-4xl keeps it perfectly aligned with your Match and Home page feeds */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center h-16 md:h-20">
          
          {/* Logo Section - Clickable to go Home */}
          <div 
            onClick={() => navigate('/')}
            className="flex items-center space-x-3 cursor-pointer group"
          >
            <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 p-2 md:p-2.5 rounded-lg shadow-lg shadow-yellow-500/20 group-hover:scale-105 transition-transform duration-300">
              <Trophy className="h-5 w-5 md:h-6 md:w-6 text-slate-950" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl md:text-2xl font-black text-white tracking-wider leading-none">RPL</span>
              <span className="text-[10px] md:text-xs font-bold text-yellow-500 tracking-widest uppercase mt-0.5">Rajwan 2026</span>
            </div>
          </div>

          {/* Action Button - Just Stats! */}
          <div className="flex items-center">
            <button 
              onClick={() => navigate('/stats')}
              className={`flex items-center px-4 md:px-5 py-2 rounded-full font-bold text-xs md:text-sm transition-all duration-300 shadow-lg border 
              ${location.pathname === '/stats' 
                ? 'bg-yellow-500 text-slate-950 border-yellow-500 shadow-yellow-500/20' 
                : 'bg-slate-900 text-yellow-500 border-slate-700 hover:border-yellow-500 hover:bg-slate-800'}`}
            >
              <BarChart2 className="w-4 h-4 mr-1.5 md:mr-2" />
              Stats
            </button>
          </div>

        </div>
      </div>
    </header>
  );
}