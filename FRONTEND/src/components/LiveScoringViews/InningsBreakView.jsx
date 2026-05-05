import React from 'react'; 

export default function InningsBreakView({   
  scorecard, tossSetup, setTossSetup, startSecondInnings, getPlayerName 
}) {   
  return (     
    <div className="max-w-md mx-auto bg-slate-900 p-6 rounded-2xl border border-yellow-500/50 shadow-2xl animate-fadeIn mt-8 text-center">       
      <h2 className="text-3xl font-black text-yellow-500 mb-2 uppercase tracking-widest">Innings Break</h2>       
      <p className="text-white text-lg mb-6">Target: <span className="font-black text-2xl">{scorecard?.targetscore || 0}</span></p>              
      
      <div className="space-y-4 text-left bg-slate-950 p-4 rounded-xl border border-slate-800 mb-6">         
        <p className="text-slate-400 text-sm font-bold border-b border-slate-800 pb-2 mb-4">Setup Innings 2 Openers</p>                  
        
        <select onChange={(e) => setTossSetup({...tossSetup, striker_id: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-white">           
          <option value="">New Striker...</option>           
          {scorecard.batting.filter(b => b.batter_id !== tossSetup.nonStriker_id).map(b => (
            <option key={b.batter_id} value={b.batter_id}>{getPlayerName(b.batter_id)}</option>
          ))}         
        </select>         
        
        <select onChange={(e) => setTossSetup({...tossSetup, nonStriker_id: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-white">           
          <option value="">New Non-Striker...</option>           
          {scorecard.batting.filter(b => b.batter_id !== tossSetup.striker_id).map(b => (
            <option key={b.batter_id} value={b.batter_id}>{getPlayerName(b.batter_id)}</option>
          ))}         
        </select>                  
        
        <select onChange={(e) => setTossSetup({...tossSetup, bowler_id: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-white">           
          <option value="">Opening Bowler...</option>           
          {scorecard.bowling.map(b => (
            <option key={b.bowler_id} value={b.bowler_id}>{getPlayerName(b.bowler_id)}</option>
          ))}         
        </select>       
      </div>       
      
      <button onClick={startSecondInnings} className="w-full bg-green-600 text-white font-black py-4 rounded-xl uppercase tracking-widest shadow-lg">Start 2nd Innings</button>     
    </div>   
  ); 
}