import React from 'react';
import { Trophy } from 'lucide-react';

export default function MatchEndView({
  selectedMatch, teamA, teamB, getCapA_Id, getCapB_Id, submitMatchResult
}) {
  return (
    <div className="max-w-md mx-auto bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-2xl animate-fadeIn mt-8 text-center">
      <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
      <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-widest">Match Complete</h2>
      
      <div className="space-y-4 text-left mt-8">
        <select id="wincap" className="w-full bg-slate-950 border border-slate-800 rounded p-4 text-white">
          <option value="">Winning Captain...</option>
          <option value={getCapA_Id()}>{selectedMatch.teamAName}</option>
          <option value={getCapB_Id()}>{selectedMatch.teamBName}</option>
        </select>
        <select id="motm" className="w-full bg-slate-950 border border-slate-800 rounded p-4 text-white">
          <option value="">Man of the Match...</option>
          {teamA.concat(teamB).map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
        </select>
      </div>

      <button onClick={submitMatchResult} className="w-full mt-8 bg-yellow-500 text-slate-900 font-black py-4 rounded-xl uppercase tracking-widest shadow-lg">Save Result & Close</button>
    </div>
  );
}