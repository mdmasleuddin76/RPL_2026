import React from 'react'; 
import { Calendar, PlayCircle } from 'lucide-react'; 

export default function MatchListView({ matches, handleSelectMatch }) {   
  return (     
    <div className="max-w-4xl mx-auto animate-fadeIn mt-8 px-4">       
      <h2 className="text-2xl font-black text-white mb-6">Select Match to Score</h2>       
      <div className="grid gap-4">         
        {matches.map(match => (           
          <div key={match._id} onClick={() => handleSelectMatch(match)} className="bg-slate-900 border border-slate-800 p-6 rounded-xl hover:border-yellow-500/50 cursor-pointer transition shadow-lg flex justify-between items-center">             
            <div>               
              <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest 
                ${match.status === 'LIVE' ? 'bg-red-600 text-white animate-pulse' : 
                  match.status === 'INNINGS_BREAK' ? 'bg-yellow-500 text-slate-900 animate-pulse' : 
                  'bg-slate-800 text-slate-400'}`}>
                {match.status.replace('_', ' ')}
              </span>               
              <h3 className="text-xl font-bold text-white mt-3">{match.teamAName || 'Team A'} vs {match.teamBName || 'Team B'}</h3>               
              <p className="text-sm text-slate-400 mt-1 flex items-center"><Calendar className="w-4 h-4 mr-2"/> {new Date(match.date).toLocaleDateString()}</p>             
            </div>             
            <PlayCircle className={`w-10 h-10 ${match.status === 'LIVE' || match.status === 'INNINGS_BREAK' ? 'text-red-500' : 'text-slate-600'} transition`} />           
          </div>         
        ))}       
      </div>     
    </div>   
  ); 
}