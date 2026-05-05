import React from 'react';
import { RefreshCcw, Edit2, RotateCcw } from 'lucide-react';

export default function ScoringDashboardView({
  scorecard, activeExtra, setActiveExtra, handleScoreBall,
  isOverModalOpen, setIsOverModalOpen, nextBowlerId, setNextBowlerId, handleNextBowlerSubmit,
  isWicketModalOpen, setIsWicketModalOpen, wicketDetails, setWicketDetails, handleWicketSubmit,
  isEditPlayersModalOpen, setIsEditPlayersModalOpen, editSetup, setEditSetup, 
  handleEditPlayersSubmit, handleRetroactiveSubmit, 
  handleUndoLastBall, handleEndInningsClick, handleSwapStrike, getPlayerName, battingSquad, fieldingSquad
}) {
  const striker = scorecard.batting.find(b => b.batter_id === scorecard.activePlayers.striker_id) || {};
  const nonStriker = scorecard.batting.find(b => b.batter_id === scorecard.activePlayers.nonStriker_id) || {};
  const bowler = scorecard.bowling.find(b => b.bowler_id === scorecard.activePlayers.bowler_id) || {};

  const yetToBatPlayers = scorecard.batting.filter(b => 
    b.status === 'YET_TO_BAT' && 
    b.batter_id !== scorecard.activePlayers.striker_id && 
    b.batter_id !== scorecard.activePlayers.nonStriker_id
  );

  const openCorrectionHub = () => {
    setEditSetup({ 
      type: 'MISTAKE', 
      striker_id: scorecard.activePlayers.striker_id, 
      nonStriker_id: scorecard.activePlayers.nonStriker_id, 
      bowler_id: scorecard.activePlayers.bowler_id, 
      wicketType: 'RUN_OUT', 
      dismissedBatter_id: '', 
      nextBatter_id: '', 
      fielder_id: '' 
    });
    setIsEditPlayersModalOpen(true);
  };

  return (
    <div className="max-w-md mx-auto bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl animate-fadeIn mt-4 relative">
      
      {/* MODAL: End of Over */}
      {isOverModalOpen && (
        <div className="absolute inset-0 bg-slate-950/95 z-50 flex flex-col items-center justify-center p-6">
          <h2 className="text-2xl font-black text-yellow-500 mb-2">End of Over!</h2>
          <p className="text-slate-400 mb-6 text-center">Score: {scorecard.score}/{scorecard.wickets} | Overs: {scorecard.overs}</p>
          <select onChange={(e) => setNextBowlerId(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white mb-4">
            <option value="">Select Next Bowler...</option>
            {fieldingSquad.filter(p => p._id !== scorecard.activePlayers.bowler_id).map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
          </select>
          <button onClick={handleNextBowlerSubmit} disabled={!nextBowlerId} className="w-full bg-yellow-500 text-slate-900 font-black py-4 rounded-xl disabled:opacity-50">Start Next Over</button>
        </div>
      )}

      {/* MODAL: Standard Wicket (Normal Flow) */}
      {isWicketModalOpen && (
        <div className="absolute inset-0 bg-slate-950/95 z-50 flex flex-col justify-center p-6 overflow-y-auto">
          <h2 className="text-3xl font-black text-red-500 mb-4 text-center tracking-widest uppercase">Wicket!</h2>
          <div className="w-full space-y-4">
            <select value={wicketDetails.type} onChange={(e) => setWicketDetails({...wicketDetails, type: e.target.value})} className="w-full bg-slate-900 border border-red-500/50 rounded p-3 text-white">
              <option value="BOWLED">Bowled</option>
              <option value="CAUGHT">Caught</option>
              <option value="LBW">LBW</option>
              <option value="RUN_OUT">Run Out</option>
              <option value="STUMPED">Stumped</option>
            </select>
            <div>
              <label className="text-xs text-slate-400 font-bold block mb-1">Dismissed Batter</label>
              <select onChange={(e) => setWicketDetails({...wicketDetails, dismissedBatter_id: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-white">
                <option value="">Select Who Got Out...</option>
                <option value={scorecard.activePlayers.striker_id}>{getPlayerName(scorecard.activePlayers.striker_id)} (Striker)</option>
                <option value={scorecard.activePlayers.nonStriker_id}>{getPlayerName(scorecard.activePlayers.nonStriker_id)} (Non-Striker)</option>
              </select>
            </div>
            {wicketDetails.type === 'RUN_OUT' && (
              <div>
                <label className="text-xs text-slate-400 font-bold block mb-1">Runs Completed Before Run Out</label>
                <input type="number" min="0" value={wicketDetails.runsScored} onChange={(e) => setWicketDetails({...wicketDetails, runsScored: parseInt(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-white" />
              </div>
            )}
            {(['CAUGHT', 'RUN_OUT', 'STUMPED'].includes(wicketDetails.type)) && (
              <select onChange={(e) => setWicketDetails({...wicketDetails, fielder_id: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-white">
                <option value="">Fielder (Optional)...</option>
                {fieldingSquad.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
            )}
            {scorecard.wickets < battingSquad.length - 2 && (
              <select onChange={(e) => setWicketDetails({...wicketDetails, nextBatter_id: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-white">
                {yetToBatPlayers.map(b => <option key={b.batter_id} value={b.batter_id}>{getPlayerName(b.batter_id)}</option>)}
                <option value="ALL_OUT" className="font-bold text-red-500 bg-slate-950">-- ALL OUT (End Innings) --</option>
              </select>
            )}
            <div className="flex gap-3 pt-4">
              <button onClick={() => setIsWicketModalOpen(false)} className="flex-1 bg-slate-800 text-white font-bold py-3 rounded">Cancel</button>
              <button onClick={handleWicketSubmit} className="flex-1 bg-red-600 text-white font-black py-3 rounded">Confirm Out</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Correction Hub (Edit Lineup & Retroactive Wickets) */}
      {isEditPlayersModalOpen && (
        <div className="absolute inset-0 bg-slate-950/95 z-50 flex flex-col items-center justify-center p-6 backdrop-blur-sm">
          <h2 className="text-2xl font-black text-yellow-500 mb-4 uppercase">Correction Hub</h2>
          
          <div className="w-full flex gap-2 mb-6">
            <button onClick={() => setEditSetup({...editSetup, type: 'MISTAKE'})} className={`flex-1 py-2 font-bold rounded-md transition ${editSetup.type === 'MISTAKE' ? 'bg-yellow-500 text-slate-900' : 'bg-slate-800 text-slate-400'}`}>My Mistake</button>
            <button onClick={() => setEditSetup({...editSetup, type: 'WICKET'})} className={`flex-1 py-2 font-bold rounded-md transition ${editSetup.type === 'WICKET' ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-400'}`}>Late Wicket</button>
          </div>

          <div className="w-full space-y-4 text-left">
            {editSetup.type === 'MISTAKE' ? (
              // UI FOR SIMPLE LINEUP SWAP
              <>
                <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 p-3 rounded text-[10px] text-center mb-2">
                  Use this to simply swap active players if you made a mistake clicking earlier.
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-bold block mb-1">Fix Striker</label>
                  <select value={editSetup.striker_id} onChange={(e) => setEditSetup({...editSetup, striker_id: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-white">
                    {battingSquad.filter(p => p._id !== editSetup.nonStriker_id).map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-bold block mb-1">Fix Non-Striker</label>
                  <select value={editSetup.nonStriker_id} onChange={(e) => setEditSetup({...editSetup, nonStriker_id: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-white">
                    {battingSquad.filter(p => p._id !== editSetup.striker_id).map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-bold block mb-1">Fix Bowler</label>
                  <select value={editSetup.bowler_id} onChange={(e) => setEditSetup({...editSetup, bowler_id: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-white">
                    {fieldingSquad.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                  </select>
                </div>
              </>
            ) : (
              // UI FOR LATE WICKET
              <>
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded text-[10px] text-center mb-2">
                  This applies a wicket to the <b>last ball</b> saved. Use this if a run-out happened on a No-Ball or Wide!
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-bold block mb-1">Wicket Type</label>
                  <select value={editSetup.wicketType} onChange={(e) => setEditSetup({...editSetup, wicketType: e.target.value})} className="w-full bg-slate-900 border border-red-500/50 rounded p-3 text-white">
                    <option value="RUN_OUT">Run Out</option>
                    <option value="STUMPED">Stumped</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-bold block mb-1">Who was out?</label>
                  <select value={editSetup.dismissedBatter_id} onChange={(e) => setEditSetup({...editSetup, dismissedBatter_id: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-white">
                    <option value="">Select Batter...</option>
                    <option value={scorecard.activePlayers.striker_id}>{getPlayerName(scorecard.activePlayers.striker_id)} (Striker)</option>
                    <option value={scorecard.activePlayers.nonStriker_id}>{getPlayerName(scorecard.activePlayers.nonStriker_id)} (Non-Striker)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-bold block mb-1">Fielder (Optional)</label>
                  <select value={editSetup.fielder_id} onChange={(e) => setEditSetup({...editSetup, fielder_id: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-white">
                    <option value="">Select Fielder...</option>
                    {fieldingSquad.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-bold block mb-1">Incoming Batter</label>
                  <select value={editSetup.nextBatter_id} onChange={(e) => setEditSetup({...editSetup, nextBatter_id: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-white">
                    <option value="">Select Next Batter...</option>
                    {yetToBatPlayers.map(b => <option key={b.batter_id} value={b.batter_id}>{getPlayerName(b.batter_id)}</option>)}
                  </select>
                </div>
              </>
            )}

            <div className="flex gap-3 pt-4">
              <button onClick={() => setIsEditPlayersModalOpen(false)} className="flex-1 bg-slate-800 text-white font-bold py-3 rounded">Cancel</button>
              
              {/* Dynamic Submit Button */}
              {editSetup.type === 'MISTAKE' ? (
                <button onClick={handleEditPlayersSubmit} className="flex-1 bg-yellow-500 text-slate-900 font-black py-3 rounded">Save Lineup</button>
              ) : (
                <button onClick={handleRetroactiveSubmit} className="flex-1 bg-red-600 text-white font-black py-3 rounded">Apply Wicket</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="bg-slate-950 p-4 flex justify-between items-center border-b border-slate-800">
        <span className="text-xs font-bold text-slate-400">Innings {scorecard.inningsNumber}</span>
        <span className="bg-red-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest animate-pulse">Live</span>
        <button onClick={handleEndInningsClick} className="text-[10px] font-bold bg-slate-800 text-slate-300 px-2 py-1 rounded border border-slate-700 hover:text-white transition">End Innings</button>
      </div>
      
      {/* SCOREBOARD */}
      <div className="p-6 text-center bg-slate-900/80 border-b border-slate-800 relative">
        <button onClick={handleUndoLastBall} className="absolute left-4 top-4 text-slate-500 hover:text-red-400 flex items-center gap-1 text-[10px] uppercase font-bold" title="Undo Last Ball">
          <RotateCcw className="w-3 h-3" /> Undo Ball
        </button>
        <h2 className="text-6xl font-black text-white mb-1 drop-shadow-md">{scorecard.score}<span className="text-4xl text-slate-500">/{scorecard.wickets}</span></h2>
        <div className="flex justify-center gap-2 mt-2">
          <span className="text-yellow-500 text-xs font-bold uppercase tracking-widest bg-slate-950 px-3 py-1 rounded-full border border-slate-800">Overs: {scorecard.overs}</span>
          {scorecard.targetscore > 0 && <span className="text-green-400 text-xs font-bold uppercase tracking-widest bg-slate-950 px-3 py-1 rounded-full border border-slate-800">Target: {scorecard.targetscore}</span>}
        </div>
      </div>

      {/* INDIVIDUAL PLAYER STATS */}
      <div className="p-4 bg-slate-950 border-b border-slate-800 relative">
        <div className="absolute right-4 top-2 flex gap-2 z-10">
          <button onClick={handleSwapStrike} className="bg-slate-800 border border-slate-700 p-1.5 rounded-md text-slate-400 hover:text-yellow-500 transition shadow-lg" title="Swap Strike"><RefreshCcw className="w-3.5 h-3.5" /></button>
          <button onClick={openCorrectionHub} className="bg-slate-800 border border-slate-700 p-1.5 rounded-md text-slate-400 hover:text-blue-400 transition shadow-lg" title="Correction Hub"><Edit2 className="w-3.5 h-3.5" /></button>
        </div>
        <div className="grid grid-cols-2 gap-4 text-xs mt-4">
          <div>
            <p className="text-slate-500 font-bold uppercase mb-2 border-b border-slate-800 pb-1">Batters</p>
            <div className="flex justify-between items-center mb-1">
              <span className="text-yellow-500 font-bold truncate max-w-[90px]">  {getPlayerName(scorecard.activePlayers.striker_id)}</span>
              <span className="text-white font-mono">{striker.runs || 0}<span className="text-slate-500 text-[10px]">({striker.ballsFaced || 0})</span></span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 pl-4 truncate max-w-[90px]">{getPlayerName(scorecard.activePlayers.nonStriker_id)}</span>
              <span className="text-slate-400 font-mono">{nonStriker.runs || 0}<span className="text-slate-600 text-[10px]">({nonStriker.ballsFaced || 0})</span></span>
            </div>
          </div>
          <div className="pl-2 border-l border-slate-800/50">
            <p className="text-slate-500 font-bold uppercase mb-2 border-b border-slate-800 pb-1 flex justify-between">Bowler <span>O-M-R-W</span></p>
            <div className="flex justify-between items-center text-sm">
              <span className="text-white font-bold truncate max-w-[80px]">{getPlayerName(scorecard.activePlayers.bowler_id)}</span>
              <span className="font-mono text-slate-300 text-[11px]">{bowler.overs || 0}-0-{bowler.runsConceded || 0}-{bowler.wickets || 0}</span>
            </div>
            <div className="flex gap-1 mt-2 overflow-x-auto hide-scrollbar pb-1">
              {scorecard.currentOverTimeline.map((ball, i) => (
                  <span key={i} className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 ${ball.includes('W') && !ball.includes('WD') ? 'bg-red-500 text-white' : ball.includes('4') || ball.includes('6') ? 'bg-green-500 text-white' : 'bg-slate-800 text-slate-300'}`}>{ball}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* THE ACTION PAD */}
      <div className="p-5 bg-slate-900">
        <div className="flex justify-between gap-2 mb-4">
          {['WD', 'NB', 'LB', 'B'].map(extra => (
              <button key={extra} onClick={() => setActiveExtra(activeExtra === extra ? null : extra)} className={`flex-1 py-2 rounded-lg font-black text-xs transition border uppercase tracking-widest ${activeExtra === extra ? 'bg-yellow-500 text-slate-900 border-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.3)]' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}`}>{extra}</button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[0, 1, 2, 3, 4, 6].map(runs => (
              <button key={runs} onClick={() => handleScoreBall(runs)} className={`py-5 rounded-xl font-black text-3xl active:scale-95 transition-transform shadow-md ${runs === 4 || runs === 6 ? 'bg-green-600/20 border-green-600/50 text-green-400 border hover:bg-green-600/30' : runs === 0 ? 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700' : 'bg-slate-800 text-white border border-slate-700 hover:bg-slate-700'}`}>{runs}</button>
          ))}
        </div>
        <button onClick={() => setIsWicketModalOpen(true)} className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white font-black py-4 rounded-xl shadow-[0_0_15px_rgba(220,38,38,0.3)] active:scale-95 uppercase tracking-widest text-xl transition-transform">WICKET OUT!</button>
      </div>
    </div>
  );
}