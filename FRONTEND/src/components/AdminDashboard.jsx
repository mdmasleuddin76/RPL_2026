import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Users, PlayCircle } from 'lucide-react';

export default function AdminDashboard() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 text-center mb-8 shadow-lg">
        <h2 className="text-2xl font-black text-white">Admin Dashboard</h2>
        <p className="text-slate-400">Manage the RPL Tournament Backend</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: Player Management */}
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 text-center hover:border-yellow-500/50 transition">
          <Users className="w-10 h-10 text-yellow-500 mx-auto mb-3" />
          <h3 className="text-xl font-bold text-white mb-2">Player Database</h3>
          <p className="text-xs text-slate-400 mb-4">Add or manage tournament players.</p>
          <button 
            onClick={() => navigate('/admin/add-player')} 
            className="w-full bg-slate-800 text-yellow-500 px-4 py-3 rounded-xl font-bold hover:bg-slate-700 transition active:scale-95"
          >
            Add New Player
          </button>
        </div>
        
        {/* Card 2: Match Drafting */}
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 text-center hover:border-blue-500/50 transition">
          <Shield className="w-10 h-10 text-blue-500 mx-auto mb-3" />
          <h3 className="text-xl font-bold text-white mb-2">Match Scheduling</h3>
          <p className="text-xs text-slate-400 mb-4">Set dates, venues, and assign captains.</p>
          <button 
            onClick={() => navigate('/admin/draft')} 
            className="w-full bg-blue-600 text-white px-4 py-3 rounded-xl font-bold hover:bg-blue-500 transition active:scale-95"
          >
            Schedule Match
          </button>
        </div>

        {/* Card 3: The Scoring Hub */}
        <div className="bg-slate-900 p-6 rounded-2xl border border-red-500/50 text-center shadow-[0_0_15px_rgba(220,38,38,0.2)] transition hover:scale-105">
          <PlayCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h3 className="text-xl font-bold text-white mb-2">Match Scoring</h3>
          <p className="text-xs text-slate-400 mb-4">Select a match, draft squads, and start scoring.</p>
          <button 
            onClick={() => navigate('/admin/live')} 
            className="w-full bg-red-600 text-white px-4 py-3 rounded-xl font-black hover:bg-red-500 animate-pulse active:scale-95 tracking-widest uppercase text-sm shadow-lg shadow-red-600/30"
          >
            Go To Scoring Hub
          </button>
        </div>

      </div>
    </div>
  );
}