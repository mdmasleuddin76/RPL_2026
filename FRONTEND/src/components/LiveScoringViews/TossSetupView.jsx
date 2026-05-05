import React from 'react';

export default function TossSetupView({
  selectedMatch, tossSetup, setTossSetup, getPlayerName, getCapA_Id, getCapB_Id, battingSquad, fieldingSquad, handleStartMatch
}) {
  return (
    <div className="max-w-md mx-auto bg-slate-900 p-6 rounded-2xl border border-slate-800 animate-fadeIn mt-8">
      <h2 className="text-xl font-black text-white mb-6 text-center">Step 2: Toss & Openers</h2>
      <div className="space-y-4">
        
        <select onChange={e => setTossSetup({...tossSetup, wonBy_id: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-white">
          <option value="">Toss Won By...</option>
          <option value={getCapA_Id()}>{getPlayerName(getCapA_Id())} ({selectedMatch.teamAName})</option>
          <option value={getCapB_Id()}>{getPlayerName(getCapB_Id())} ({selectedMatch.teamBName})</option>
        </select>
        
        <select onChange={e => setTossSetup({...tossSetup, decision: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-white">
          <option value="">Decision...</option>
          <option value="BAT">Bat First</option>
          <option value="BOWL">Bowl First</option>
        </select>
        
        {tossSetup.wonBy_id && tossSetup.decision && (
          <div className="border-t border-slate-800 my-4 pt-4 animate-fadeIn">
            <label className="text-slate-400 text-xs font-bold mb-2 block">Select Openers</label>
            
            <select onChange={(e) => setTossSetup({...tossSetup, striker_id: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-white mb-2">
              <option value="">Striker (Batting Team)...</option>
              {battingSquad.filter(p => p._id !== tossSetup.nonStriker_id).map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
            
            <select onChange={(e) => setTossSetup({...tossSetup, nonStriker_id: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-white mb-2">
              <option value="">Non-Striker (Batting Team)...</option>
              {battingSquad.filter(p => p._id !== tossSetup.striker_id).map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
            
            <select onChange={(e) => setTossSetup({...tossSetup, bowler_id: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-white">
              <option value="">Opening Bowler (Fielding Team)...</option>
              {fieldingSquad.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </div>
        )}
      </div>
      <button onClick={handleStartMatch} className="w-full mt-6 bg-green-600 text-white font-black py-4 rounded-xl">Start Match</button>
    </div>
  );
}