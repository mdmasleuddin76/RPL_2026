import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ArrowRight, ArrowLeft, PlayCircle, Calendar, RefreshCcw, Loader2, Trophy, Edit2 } from 'lucide-react';

// POINT THIS TO YOUR REAL BACKEND URL
const API_BASE_URL = 'http://localhost:3000/api'; 

export default function LiveScoring() {
  const navigate = useNavigate();
  
  // ---------------------------------------------------------
  // 1. DATA FETCHING ON MOUNT
  // ---------------------------------------------------------
  const [isLoading, setIsLoading] = useState(true);
  const [players, setPlayers] = useState([]);
  const [matches, setMatches] = useState([]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Fetch real data from your backend
        const [playersRes, matchesRes] = await Promise.all([
          fetch(`${API_BASE_URL}/players`),
          fetch(`${API_BASE_URL}/matches`)
        ]);
        
        const playersData = await playersRes.json();
        const matchesData = await matchesRes.json();
        
        setPlayers(playersData);
        setMatches(matchesData);
        setIsLoading(false);
      } catch (error) {
        console.error("Failed to load initial data", error);
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  // ---------------------------------------------------------
  // 2. ROUTING & SETUP STATES
  // ---------------------------------------------------------
  const [viewState, setViewState] = useState('list'); 
  const [selectedMatch, setSelectedMatch] = useState(null);

  const [draftPool, setDraftPool] = useState([]);
  const [teamA, setTeamA] = useState([]);
  const [teamB, setTeamB] = useState([]);
  const [tossSetup, setTossSetup] = useState({ wonBy_id: '', decision: '', striker_id: '', nonStriker_id: '', bowler_id: '' });

  // ---------------------------------------------------------
  // 3. THE SCORECARD STATE (Matches your DB JSON exactly)
  // ---------------------------------------------------------
  const [scorecard, setScorecard] = useState(null);
  const [activeExtra, setActiveExtra] = useState(null); // 'WD', 'NB', 'LB', 'B'
  
  // Modals
  const [isOverModalOpen, setIsOverModalOpen] = useState(false);
  const [isWicketModalOpen, setIsWicketModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false); 
  
  // Forms State
  const [wicketDetails, setWicketDetails] = useState({ type: 'BOWLED', fielder_id: '', nextBatter_id: '' });
  const [nextBowlerId, setNextBowlerId] = useState('');
  const [editSetup, setEditSetup] = useState({ striker_id: '', nonStriker_id: '', bowler_id: '' });

  // Helpers to fetch names from IDs
  const getPlayerName = (id) => players.find(p => p._id === id)?.name || 'Unknown';
  
  // Active Match Context
  const isBattingFirst = scorecard?.inningsNumber === 1;
  // Determine squad arrays based on who is batting
  const battingSquad = scorecard?.battingCaptain_id === selectedMatch?.captains.teamA_id ? teamA : teamB;
  const fieldingSquad = scorecard?.battingCaptain_id === selectedMatch?.captains.teamA_id ? teamB : teamA;

  // ---------------------------------------------------------
  // WORKFLOW HANDLERS (API DRIVEN)
  // ---------------------------------------------------------
  const handleSelectMatch = async (match) => {
    setSelectedMatch(match);
    if (match.status === 'LIVE') {
      setIsLoading(true);
      // Fetch the active scorecard from backend
      const res = await fetch(`${API_BASE_URL}/matches/${match._id}/scorecard/active`);
      const data = await res.json();
      setScorecard(data);
      setIsLoading(false);
      setViewState('scoring');
    } else if (match.status === 'SCHEDULED') {
      const capA = players.find(p => p._id === match.captains.teamA_id);
      const capB = players.find(p => p._id === match.captains.teamB_id);
      setTeamA(capA ? [capA] : []);
      setTeamB(capB ? [capB] : []);
      setDraftPool(players.filter(p => p._id !== match.captains.teamA_id && p._id !== match.captains.teamB_id));
      setViewState('draft');
    }
  };

  const assignToTeam = (player, team) => {
    if (team === 'A') setTeamA([...teamA, player]);
    if (team === 'B') setTeamB([...teamB, player]);
    setDraftPool(draftPool.filter(p => p._id !== player._id));
  };

  const handleFinishDraft = async () => {
    // Save draft to backend
    await fetch(`${API_BASE_URL}/matches/${selectedMatch._id}/draft`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ squadA_player_ids: teamA.map(p=>p._id), squadB_player_ids: teamB.map(p=>p._id) })
    });
    setViewState('toss');
  };

  const handleStartMatch = async () => {
    if (!tossSetup.striker_id || !tossSetup.nonStriker_id || !tossSetup.bowler_id || !tossSetup.wonBy_id) {
      return alert("Complete the toss setup!");
    }
    
    // Send Toss and Openers to Backend. Backend generates the initial Scorecard JSON!
    const res = await fetch(`${API_BASE_URL}/matches/${selectedMatch._id}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tossSetup)
    });
    
    const initialScorecard = await res.json();
    setScorecard(initialScorecard);
    setViewState('scoring');
  };

  // ---------------------------------------------------------
  // CORE SCORING LOGIC (Sends BallEvent, gets Scorecard back)
  // ---------------------------------------------------------
  const handleScoreBall = async (runsBtnValue) => {
    // Construct the EXACT JSON schema you designed for BallEvents
    const ballEvent = {
      match_id: selectedMatch._id,
      inningsNumber: scorecard.inningsNumber,
      overNumber: Math.floor(scorecard.overs) + 1,
      batter_id: scorecard.activePlayers.striker_id,
      bowler_id: scorecard.activePlayers.bowler_id,
      runsFromBat: runsBtnValue,
      extras: {
        type: activeExtra, 
        runs: activeExtra ? (activeExtra === 'WD' || activeExtra === 'NB' ? 1 : runsBtnValue) : 0
      },
      isWicket: false,
      wicketDetails: { type: null, fielder_id: null, batterOut_id: null }
    };

    try {
      const response = await fetch(`${API_BASE_URL}/matches/${selectedMatch._id}/ball`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ballEvent)
      });
      const updatedScorecard = await response.json();
      
      setScorecard(updatedScorecard);
      setActiveExtra(null);

      // Check if Backend indicates Over is complete (e.g., timeline resets or overs is a whole number)
      if (updatedScorecard.currentOverTimeline.length === 0 && updatedScorecard.overs > 0) {
        setIsOverModalOpen(true);
      }
    } catch (error) {
      console.error("API Error saving ball:", error);
    }
  };

  const handleWicketSubmit = async () => {
    const ballEvent = {
      match_id: selectedMatch._id,
      inningsNumber: scorecard.inningsNumber,
      batter_id: scorecard.activePlayers.striker_id,
      bowler_id: scorecard.activePlayers.bowler_id,
      runsFromBat: 0,
      extras: { type: null, runs: 0 },
      isWicket: true,
      wicketDetails: {
        type: wicketDetails.type,
        fielder_id: wicketDetails.fielder_id || null,
        batterOut_id: scorecard.activePlayers.striker_id,
        nextBatter_id: wicketDetails.nextBatter_id // Pass next batter to backend so it updates Scorecard
      }
    };

    const response = await fetch(`${API_BASE_URL}/matches/${selectedMatch._id}/ball`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ballEvent)
    });
    const updatedScorecard = await response.json();
    
    setScorecard(updatedScorecard);
    setIsWicketModalOpen(false);

    // If backend returns 10 wickets, automatically trigger innings end
    if (updatedScorecard.wickets === 10) {
      handleEndInningsClick();
    }
  };

  const handleNextBowlerSubmit = async () => {
    const response = await fetch(`${API_BASE_URL}/matches/${selectedMatch._id}/scorecard/bowler`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bowler_id: nextBowlerId })
    });
    setScorecard(await response.json());
    setIsOverModalOpen(false);
    setNextBowlerId('');
  };

  const handleSwapStrike = async () => {
    const response = await fetch(`${API_BASE_URL}/matches/${selectedMatch._id}/scorecard/swap-strike`, { method: 'PUT' });
    setScorecard(await response.json());
  };

  const handleEditPlayersSubmit = async () => {
    const response = await fetch(`${API_BASE_URL}/matches/${selectedMatch._id}/scorecard/active-players`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editSetup)
    });
    setScorecard(await response.json());
    setIsEditModalOpen(false);
  };

  // --- INNINGS MANAGEMENT ---
  const handleEndInningsClick = async () => {
    if (scorecard.inningsNumber === 1) {
      setViewState('inningsBreak');
    } else {
      setViewState('matchEnd');
    }
  };

  const startSecondInnings = async () => {
    const res = await fetch(`${API_BASE_URL}/matches/${selectedMatch._id}/innings/2`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tossSetup) // sending new openers
    });
    setScorecard(await res.json());
    setViewState('scoring');
  };

  const submitMatchResult = async (resultData) => {
    await fetch(`${API_BASE_URL}/matches/${selectedMatch._id}/end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(resultData)
    });
    navigate('/admin');
  };

  // =========================================================
  // HELPER TO EXTRACT STATS FROM BACKEND SCORECARD ARRAY
  // =========================================================
  const getStrikerStats = () => scorecard?.batting.find(b => b.batter_id === scorecard.activePlayers.striker_id) || {};
  const getNonStrikerStats = () => scorecard?.batting.find(b => b.batter_id === scorecard.activePlayers.nonStriker_id) || {};
  const getBowlerStats = () => scorecard?.bowling.find(b => b.bowler_id === scorecard.activePlayers.bowler_id) || {};

  // =========================================================
  // RENDERS
  // =========================================================
  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-950"><Loader2 className="w-10 h-10 text-yellow-500 animate-spin" /></div>;

  if (viewState === 'list') {
    return (
      <div className="max-w-4xl mx-auto animate-fadeIn mt-8 px-4">
        <h2 className="text-2xl font-black text-white mb-6">Select Match to Score</h2>
        <div className="grid gap-4">
          {matches.map(match => (
            <div key={match._id} onClick={() => handleSelectMatch(match)} className="bg-slate-900 border border-slate-800 p-6 rounded-xl hover:border-yellow-500/50 cursor-pointer transition shadow-lg">
              <div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest ${match.status === 'LIVE' ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-800 text-slate-400'}`}>
                  {match.status}
                </span>
                <h3 className="text-xl font-bold text-white mt-3">{match.teamAName} vs {match.teamBName}</h3>
                <p className="text-sm text-slate-400 mt-1 flex items-center"><Calendar className="w-4 h-4 mr-2"/> {match.date}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (viewState === 'draft') {
    return (
      <div className="animate-fadeIn max-w-5xl mx-auto mt-8 px-4">
        <h2 className="text-2xl font-black text-white mb-6 text-center">Step 1: Draft Squads</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-lg">
            <div className="bg-slate-950 p-3 text-center font-bold text-yellow-500 border-b border-slate-800">{selectedMatch.teamAName} ({teamA.length})</div>
            <ul className="p-2 space-y-2 min-h-[300px]">
              {teamA.map(p => <li key={p._id} className="bg-slate-800 p-2 rounded text-white text-sm">{p.name}</li>)}
            </ul>
          </div>
          <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-lg">
            <div className="bg-slate-950 p-3 text-center font-bold text-white border-b border-slate-800">Pool ({draftPool.length})</div>
            <ul className="p-2 space-y-2 h-[400px] overflow-y-auto">
              {draftPool.map(p => (
                <li key={p._id} className="bg-slate-800 p-2 rounded flex justify-between items-center text-sm">
                  <button onClick={() => assignToTeam(p, 'A')} className="text-yellow-500 hover:text-slate-900 p-1"><ArrowLeft className="w-4 h-4"/></button>
                  <span className="text-white font-bold">{p.name}</span>
                  <button onClick={() => assignToTeam(p, 'B')} className="text-blue-400 hover:text-slate-900 p-1"><ArrowRight className="w-4 h-4"/></button>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-lg">
            <div className="bg-slate-950 p-3 text-center font-bold text-blue-400 border-b border-slate-800">{selectedMatch.teamBName} ({teamB.length})</div>
            <ul className="p-2 space-y-2 min-h-[300px]">
              {teamB.map(p => <li key={p._id} className="bg-slate-800 p-2 rounded text-white text-sm">{p.name}</li>)}
            </ul>
          </div>
        </div>
        <button onClick={handleFinishDraft} className="w-full mt-6 bg-yellow-500 text-slate-900 font-black py-4 rounded-xl">Confirm Squads</button>
      </div>
    );
  }

  if (viewState === 'toss') {
    return (
      <div className="max-w-md mx-auto bg-slate-900 p-6 rounded-2xl border border-slate-800 animate-fadeIn mt-8">
        <h2 className="text-xl font-black text-white mb-6 text-center">Step 2: Toss & Openers</h2>
        <div className="space-y-4">
          <select onChange={e => setTossSetup({...tossSetup, wonBy_id: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-white">
            <option value="">Toss Won By...</option>
            <option value={selectedMatch.captains.teamA_id}>{selectedMatch.teamAName}</option>
            <option value={selectedMatch.captains.teamB_id}>{selectedMatch.teamBName}</option>
          </select>
          <select onChange={e => setTossSetup({...tossSetup, decision: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-white">
            <option value="">Decision...</option>
            <option value="BAT">Bat First</option>
            <option value="BOWL">Bowl First</option>
          </select>
          <div className="border-t border-slate-800 my-4 pt-4">
            <select onChange={(e) => setTossSetup({...tossSetup, striker_id: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-white mb-2">
              <option value="">Striker...</option>
              {teamA.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
            <select onChange={(e) => setTossSetup({...tossSetup, nonStriker_id: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-white mb-2">
              <option value="">Non-Striker...</option>
              {teamA.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
            <select onChange={(e) => setTossSetup({...tossSetup, bowler_id: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-white">
              <option value="">Opening Bowler...</option>
              {teamB.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </div>
        </div>
        <button onClick={handleStartMatch} className="w-full mt-6 bg-green-600 text-white font-black py-4 rounded-xl">Start Match</button>
      </div>
    );
  }

  // --- THE MASTER SCORING UI (Backend Provides Data) ---
  if (viewState === 'scoring' && scorecard) {
    const strStats = getStrikerStats();
    const nonStrStats = getNonStrikerStats();
    const bwlStats = getBowlerStats();

    return (
      <div className="max-w-md mx-auto bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl animate-fadeIn mt-4 relative">
        
        {/* OVERLAY MODALS */}
        {isOverModalOpen && (
          <div className="absolute inset-0 bg-slate-950/95 z-50 flex flex-col items-center justify-center p-6 backdrop-blur-sm">
            <h2 className="text-2xl font-black text-yellow-500 mb-2">End of Over!</h2>
            <p className="text-slate-400 mb-6 text-center">Score: {scorecard.score}/{scorecard.wickets} | Overs: {scorecard.overs}</p>
            <select onChange={(e) => setNextBowlerId(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white mb-4">
              <option value="">Select Next Bowler...</option>
              {fieldingSquad.filter(p => p._id !== scorecard.activePlayers.bowler_id).map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
            <button onClick={handleNextBowlerSubmit} disabled={!nextBowlerId} className="w-full bg-yellow-500 text-slate-900 font-black py-4 rounded-xl disabled:opacity-50">Start Next Over</button>
          </div>
        )}

        {isWicketModalOpen && (
          <div className="absolute inset-0 bg-slate-950/95 z-50 flex flex-col items-center justify-center p-6 backdrop-blur-sm">
            <h2 className="text-3xl font-black text-red-500 mb-4 tracking-widest uppercase">Wicket!</h2>
            <div className="w-full space-y-4">
              <select onChange={(e) => setWicketDetails({...wicketDetails, type: e.target.value})} className="w-full bg-slate-900 border border-red-500/30 rounded p-3 text-white">
                <option value="BOWLED">Bowled</option><option value="CAUGHT">Caught</option><option value="RUN_OUT">Run Out</option><option value="LBW">LBW</option><option value="STUMPED">Stumped</option>
              </select>
              {(['CAUGHT', 'RUN_OUT', 'STUMPED'].includes(wicketDetails.type)) && (
                <select onChange={(e) => setWicketDetails({...wicketDetails, fielder_id: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-white">
                  <option value="">Fielder...</option>
                  {fieldingSquad.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                </select>
              )}
              
              <select onChange={(e) => setWicketDetails({...wicketDetails, nextBatter_id: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-white">
                <option value="">Incoming Batter...</option>
                {battingSquad.filter(p => p._id !== scorecard.activePlayers.striker_id && p._id !== scorecard.activePlayers.nonStriker_id).map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
              
              <div className="flex gap-3 pt-4">
                <button onClick={() => setIsWicketModalOpen(false)} className="flex-1 bg-slate-800 text-white font-bold py-3 rounded">Cancel</button>
                <button onClick={handleWicketSubmit} disabled={!wicketDetails.nextBatter_id && scorecard.wickets < 9} className="flex-1 bg-red-600 text-white font-black py-3 rounded disabled:opacity-50">Confirm Out</button>
              </div>
            </div>
          </div>
        )}

        {isEditModalOpen && (
          <div className="absolute inset-0 bg-slate-950/95 z-50 flex flex-col items-center justify-center p-6 backdrop-blur-sm">
            <h2 className="text-2xl font-black text-yellow-500 mb-4 tracking-widest uppercase">Edit Lineup</h2>
            <div className="w-full space-y-4 text-left">
              <select value={editSetup.striker_id} onChange={(e) => setEditSetup({...editSetup, striker_id: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-white">
                {battingSquad.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
              <select value={editSetup.nonStriker_id} onChange={(e) => setEditSetup({...editSetup, nonStriker_id: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-white">
                {battingSquad.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
              <select value={editSetup.bowler_id} onChange={(e) => setEditSetup({...editSetup, bowler_id: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-white">
                {fieldingSquad.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setIsEditModalOpen(false)} className="flex-1 bg-slate-800 text-white font-bold py-3 rounded">Cancel</button>
                <button onClick={handleEditPlayersSubmit} className="flex-1 bg-yellow-500 text-slate-900 font-black py-3 rounded">Save</button>
              </div>
            </div>
          </div>
        )}

        {/* HEADER */}
        <div className="bg-slate-950 p-4 flex justify-between items-center border-b border-slate-800">
          <span className="text-xs font-bold text-slate-400">Innings {scorecard.inningsNumber}</span>
          <span className="bg-red-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest animate-pulse">Live</span>
          <button onClick={handleEndInningsClick} className="text-[10px] font-bold bg-slate-800 text-slate-300 px-2 py-1 rounded hover:text-white">Declare / End</button>
        </div>
        
        {/* SCOREBOARD */}
        <div className="p-6 text-center bg-slate-900/80 border-b border-slate-800">
          <h2 className="text-6xl font-black text-white mb-1">{scorecard.score}<span className="text-4xl text-slate-500">/{scorecard.wickets}</span></h2>
          <div className="flex justify-center gap-2 mt-2">
            <span className="text-yellow-500 text-xs font-bold uppercase tracking-widest bg-slate-950 px-3 py-1 rounded-full border border-slate-800">Overs: {scorecard.overs}</span>
            <span className="text-slate-400 text-xs font-bold uppercase tracking-widest bg-slate-950 px-3 py-1 rounded-full border border-slate-800">CRR: {scorecard.runRate}</span>
          </div>
        </div>

        {/* INDIVIDUAL PLAYER STATS */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 relative">
          <div className="absolute right-4 top-2 flex gap-2 z-10">
            <button onClick={handleSwapStrike} className="bg-slate-800 border border-slate-700 p-1.5 rounded-md text-slate-400 hover:text-yellow-500 transition"><RefreshCcw className="w-3.5 h-3.5" /></button>
            <button onClick={() => { setEditSetup(scorecard.activePlayers); setIsEditModalOpen(true); }} className="bg-slate-800 border border-slate-700 p-1.5 rounded-md text-slate-400 hover:text-blue-400 transition"><Edit2 className="w-3.5 h-3.5" /></button>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs mt-4">
            <div>
              <p className="text-slate-500 font-bold uppercase mb-2 border-b border-slate-800 pb-1">Batters</p>
              <div className="flex justify-between items-center mb-1">
                <span className="text-yellow-500 font-bold truncate">▶ {getPlayerName(scorecard.activePlayers.striker_id)}</span>
                <span className="text-white font-mono">{strStats.runs}<span className="text-slate-500 text-[10px]">({strStats.ballsFaced})</span></span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 pl-4 truncate">{getPlayerName(scorecard.activePlayers.nonStriker_id)}</span>
                <span className="text-slate-400 font-mono">{nonStrStats.runs}<span className="text-slate-600 text-[10px]">({nonStrStats.ballsFaced})</span></span>
              </div>
            </div>
            
            <div className="pl-2 border-l border-slate-800/50">
              <p className="text-slate-500 font-bold uppercase mb-2 border-b border-slate-800 pb-1 flex justify-between">Bowler</p>
              <div className="flex justify-between items-center text-sm">
                <span className="text-white font-bold truncate max-w-[80px]">{getPlayerName(scorecard.activePlayers.bowler_id)}</span>
                <span className="font-mono text-slate-300 text-[11px]">{bwlStats.overs}-0-{bwlStats.runsConceded}-{bwlStats.wickets}</span>
              </div>
              <div className="flex gap-1 mt-2 overflow-x-auto hide-scrollbar pb-1">
                 {scorecard.currentOverTimeline.map((ball, i) => (
                   <span key={i} className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 ${ball.includes('W') ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-300'}`}>{ball}</span>
                 ))}
              </div>
            </div>
          </div>
        </div>

        {/* THE ACTION PAD */}
        <div className="p-5 bg-slate-900">
          <div className="flex justify-between gap-2 mb-4">
            {['WD', 'NB', 'LB', 'B'].map(extra => (
              <button key={extra} onClick={() => setActiveExtra(activeExtra === extra ? null : extra)} className={`flex-1 py-2 rounded-lg font-black text-xs transition border uppercase tracking-widest ${activeExtra === extra ? 'bg-yellow-500 text-slate-900 border-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.3)]' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>{extra}</button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[0, 1, 2, 3, 4, 6].map(runs => (
              <button key={runs} onClick={() => handleScoreBall(runs)} className="py-5 rounded-xl font-black text-3xl active:scale-95 bg-slate-800 text-white border border-slate-700 hover:bg-slate-700 shadow-md">{runs}</button>
            ))}
          </div>
          <button onClick={() => setIsWicketModalOpen(true)} className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white font-black py-4 rounded-xl shadow-[0_0_15px_rgba(220,38,38,0.3)] active:scale-95 uppercase tracking-widest text-xl">WICKET OUT!</button>
        </div>
      </div>
    );
  }

  // --- VIEW: INNINGS BREAK ---
  if (viewState === 'inningsBreak') {
    return (
      <div className="max-w-md mx-auto bg-slate-900 p-6 rounded-2xl border border-yellow-500/50 shadow-2xl animate-fadeIn mt-8 text-center">
        <h2 className="text-3xl font-black text-yellow-500 mb-2 uppercase tracking-widest">Innings Break</h2>
        
        <div className="space-y-4 text-left bg-slate-950 p-4 rounded-xl border border-slate-800 mb-6">
          <p className="text-slate-400 text-sm font-bold border-b border-slate-800 pb-2 mb-4">Setup Innings 2 Openers</p>
          <select onChange={(e) => setTossSetup({...tossSetup, striker_id: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-white">
            <option value="">New Striker...</option>
            {fieldingSquad.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
          </select>
          <select onChange={(e) => setTossSetup({...tossSetup, nonStriker_id: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-white">
            <option value="">New Non-Striker...</option>
            {fieldingSquad.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
          </select>
          <select onChange={(e) => setTossSetup({...tossSetup, bowler_id: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-white">
            <option value="">Opening Bowler...</option>
            {battingSquad.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
          </select>
        </div>

        <button onClick={startSecondInnings} className="w-full bg-green-600 text-white font-black py-4 rounded-xl uppercase tracking-widest shadow-lg">Start 2nd Innings</button>
      </div>
    );
  }

  // --- VIEW: MATCH END ---
  if (viewState === 'matchEnd') {
    return (
      <div className="max-w-md mx-auto bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-2xl animate-fadeIn mt-8 text-center">
        <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-widest">Match Complete</h2>
        
        <div className="space-y-4 text-left mt-8">
          <select id="motm" className="w-full bg-slate-950 border border-slate-800 rounded p-4 text-white">
            <option value="">Man of the Match...</option>
            {players.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
          </select>
        </div>

        <button onClick={() => submitMatchResult({ manOfTheMatch_id: document.getElementById('motm').value })} className="w-full mt-8 bg-yellow-500 text-slate-900 font-black py-4 rounded-xl uppercase tracking-widest shadow-lg">Save Match Result</button>
      </div>
    );
  }

  return null;
}