import React from 'react';
import { X, ArrowRight, ArrowLeft } from 'lucide-react';

export default function DraftSquadsView({ 
  selectedMatch, teamA, teamB, draftPool, getCapA_Id, getCapB_Id, assignToTeam, removeFromTeam, setViewState 
}) {
  return (
    <div className="animate-fadeIn max-w-5xl mx-auto mt-8 px-4">
      <h2 className="text-2xl font-black text-white mb-6 text-center">Step 1: Draft Squads</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-lg">
          <div className="bg-slate-950 p-3 text-center font-bold text-yellow-500 border-b border-slate-800">
            {selectedMatch.teamAName || 'Team A'} ({teamA.length})
          </div>
          <ul className="p-2 space-y-2 min-h-[300px]">
            {teamA.map(p => (
              <li key={p._id} className="bg-slate-800 p-2 rounded text-white text-sm flex justify-between items-center">
                <span>{p.name} {p._id === getCapA_Id() && '(C)'}</span>
                {p._id !== getCapA_Id() && (
                  <button onClick={() => removeFromTeam(p, 'A')} className="text-red-400 hover:text-red-300 p-1"><X className="w-4 h-4"/></button>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-lg">
          <div className="bg-slate-950 p-3 text-center font-bold text-white border-b border-slate-800">Available Pool</div>
          <ul className="p-2 space-y-2 h-[400px] overflow-y-auto">
            {draftPool.map(p => (
              <li key={p._id} className="bg-slate-800 p-2 rounded flex justify-between items-center text-sm">
                <button onClick={() => assignToTeam(p, 'A')} className="text-yellow-500 p-1"><ArrowLeft className="w-4 h-4"/></button>
                <span className="text-white font-bold">{p.name}</span>
                <button onClick={() => assignToTeam(p, 'B')} className="text-blue-400 p-1"><ArrowRight className="w-4 h-4"/></button>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-lg">
          <div className="bg-slate-950 p-3 text-center font-bold text-blue-400 border-b border-slate-800">
            {selectedMatch.teamBName || 'Team B'} ({teamB.length})
          </div>
          <ul className="p-2 space-y-2 min-h-[300px]">
            {teamB.map(p => (
              <li key={p._id} className="bg-slate-800 p-2 rounded text-white text-sm flex justify-between items-center">
                <span>{p.name} {p._id === getCapB_Id() && '(C)'}</span>
                {p._id !== getCapB_Id() && (
                  <button onClick={() => removeFromTeam(p, 'B')} className="text-red-400 hover:text-red-300 p-1"><X className="w-4 h-4"/></button>
                )}
              </li>
            ))}
          </ul>
        </div>

      </div>
      <button onClick={() => setViewState('toss')} className="w-full mt-6 bg-yellow-500 text-slate-900 font-black py-4 rounded-xl">Proceed to Toss</button>
    </div>
  );
}