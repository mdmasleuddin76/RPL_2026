import React from 'react';
import { Trophy, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-950 relative overflow-hidden mt-auto">
      {/* Subtle fading top border */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-slate-800 to-transparent"></div>
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-10 pb-8">
        <div className="flex flex-col items-center justify-center gap-4">
          
          {/* Subtle Logo / Brand */}
          <div className="flex items-center space-x-2 opacity-80">
            <Trophy className="h-4 w-4 md:h-5 md:w-5 text-slate-500" />
            <span className="text-base md:text-lg font-black text-slate-400 tracking-widest uppercase">
              RPL 2026
            </span>
          </div>

          {/* Clean Tagline */}
          <p className="text-center text-[11px] md:text-xs text-slate-500 max-w-sm px-4">
            The ultimate cricket experience. Track live scores, player stats, and match highlights.
          </p>

        </div>

        {/* Bottom Credits */}
        <div className="mt-8 pt-6 border-t border-slate-900 flex flex-col items-center gap-2 text-[10px] md:text-[11px] text-slate-600 uppercase tracking-wider">
          <p className="flex items-center font-bold">
            Built with <Heart className="h-3 w-3 text-red-500 mx-1.5 animate-pulse" /> for the Fantastic 4 & Crew
          </p>
          <p className="font-medium opacity-70">© 2026 Rajwan Premier League</p>
        </div>
        
      </div>
    </footer>
  );
}