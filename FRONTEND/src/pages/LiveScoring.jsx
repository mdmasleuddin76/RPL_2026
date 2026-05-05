import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import adminAxios from '../utils/axiosConfig';

// Import Views
import MatchListView from '../components/LiveScoringViews/MatchListView';
import DraftSquadsView from '../components/LiveScoringViews/DraftSquadsView';
import TossSetupView from '../components/LiveScoringViews/TossSetupView';
import ScoringDashboardView from '../components/LiveScoringViews/ScoringDashboardView';
import InningsBreakView from '../components/LiveScoringViews/InningsBreakView';
import MatchEndView from '../components/LiveScoringViews/MatchEndView';

const API_URL = '/'; 

export default function LiveScoring() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [players, setPlayers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [playersRes, matchesRes] = await Promise.all([
          adminAxios.get(`/getplayer`),
          adminAxios.get(`/getmatch`)
        ]);
        setPlayers(playersRes.data); 
        setMatches(matchesRes.data);
        setIsLoading(false);
      } catch (error) {
        console.error("Failed to load data", error);
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  const [viewState, setViewState] = useState('list'); 
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [draftPool, setDraftPool] = useState([]);
  const [teamA, setTeamA] = useState([]);
  const [teamB, setTeamB] = useState([]);
  const [tossSetup, setTossSetup] = useState({ wonBy_id: '', decision: '', striker_id: '', nonStriker_id: '', bowler_id: '' });
  
  const [scorecard, setScorecard] = useState(null);
  const [activeExtra, setActiveExtra] = useState(null); 
  const [isOverModalOpen, setIsOverModalOpen] = useState(false);
  const [isWicketModalOpen, setIsWicketModalOpen] = useState(false);
  const [isEditPlayersModalOpen, setIsEditPlayersModalOpen] = useState(false);
  const [wicketDetails, setWicketDetails] = useState({ type: 'BOWLED', fielder_id: '', dismissedBatter_id: '', nextBatter_id: '', runsScored: 0 });
  const [nextBowlerId, setNextBowlerId] = useState('');
  
  // UPGRADED EDIT SETUP STATE
  const [editSetup, setEditSetup] = useState({ type: 'MISTAKE', striker_id: '', nonStriker_id: '', bowler_id: '', wicketType: 'RUN_OUT', dismissedBatter_id: '', nextBatter_id: '', fielder_id: '' });

  const getPlayerName = (id) => players.find(p => p._id === id)?.name || 'Unknown';
  const getCapA_Id = () => selectedMatch?.captains?.teamA_id?._id || selectedMatch?.captains?.teamA_id;
  const getCapB_Id = () => selectedMatch?.captains?.teamB_id?._id || selectedMatch?.captains?.teamB_id;

  let battingSquad = [];
  let fieldingSquad = [];

  if (viewState === 'toss' && tossSetup.wonBy_id && tossSetup.decision) {
    const batsFirst = (tossSetup.wonBy_id === getCapA_Id() && tossSetup.decision === 'BAT') || 
                      (tossSetup.wonBy_id === getCapB_Id() && tossSetup.decision === 'BOWL') ? 'A' : 'B';
    battingSquad = batsFirst === 'A' ? teamA : teamB;
    fieldingSquad = batsFirst === 'A' ? teamB : teamA;
  } else if (scorecard) {
    const isTeamABatting = scorecard.battingCaptain_id === getCapA_Id();
    battingSquad = isTeamABatting ? teamA : teamB;
    fieldingSquad = isTeamABatting ? teamB : teamA;
  }

  const currentOverNumber = scorecard ? Math.floor(scorecard.overs) : 0;
  const currentBallInOver = scorecard ? Math.round((scorecard.overs % 1) * 10) + 1 : 1;

  const handleSelectMatch = async (match) => {
    setSelectedMatch(match);
    const capA_id = match.captains?.teamA_id?._id || match.captains?.teamA_id;
    const capB_id = match.captains?.teamB_id?._id || match.captains?.teamB_id;

    if (match.status === 'LIVE' || match.status === 'INNINGS_BREAK') {
      setIsLoading(true);
      const res = await adminAxios.get(`/getActiveScorecard/${match._id}`); 
      setScorecard(res.data);
      setTeamA(players.filter(p => match.squadA_player_ids.includes(p._id)));
      setTeamB(players.filter(p => match.squadB_player_ids.includes(p._id)));
      setIsLoading(false);
      setViewState(match.status === 'LIVE' ? 'scoring' : 'inningsBreak');
    } else if (match.status === 'SCHEDULED') {
      setTeamA([players.find(p => p._id === capA_id)].filter(Boolean));
      setTeamB([players.find(p => p._id === capB_id)].filter(Boolean));
      setDraftPool(players.filter(p => p._id !== capA_id && p._id !== capB_id));
      setViewState('draft');
    }
  };

  const assignToTeam = (player, team) => {
    if (team === 'A') setTeamA([...teamA, player]);
    if (team === 'B') setTeamB([...teamB, player]);
    setDraftPool(draftPool.filter(p => p._id !== player._id));
  };

  const removeFromTeam = (player, team) => {
    if (team === 'A') setTeamA(teamA.filter(p => p._id !== player._id));
    if (team === 'B') setTeamB(teamB.filter(p => p._id !== player._id));
    setDraftPool([...draftPool, player]);
  };

  const handleStartMatch = async () => {
    if (!tossSetup.striker_id || !tossSetup.nonStriker_id || !tossSetup.bowler_id || !tossSetup.wonBy_id) return alert("Complete all setups!");
    try {
      setIsLoading(true);
      const res = await adminAxios.post(`/start-match`, {
        match_id: selectedMatch._id, squadA_player_ids: teamA.map(p => p._id), squadB_player_ids: teamB.map(p => p._id),
        toss: { wonBy_id: tossSetup.wonBy_id, decision: tossSetup.decision }, striker_id: tossSetup.striker_id, nonStriker_id: tossSetup.nonStriker_id, bowler_id: tossSetup.bowler_id
      });
      setScorecard(res.data);
      setIsLoading(false);
      setViewState('scoring');
    } catch (err) { setIsLoading(false); }
  };

  const handleScoreBall = async (runsBtnValue) => {
    if (isProcessing) return; // Prevent double clicks
    setIsProcessing(true);    // Lock the UI
    let calculatedRunsFromBat = runsBtnValue;
    let calculatedExtraRuns = 0;
    if (activeExtra) {
      calculatedRunsFromBat = 0;
      calculatedExtraRuns = runsBtnValue; 
    }
    const payload = {
      match_id: selectedMatch._id,
      inningsNumber: scorecard.inningsNumber,
      overNumber: currentOverNumber,
      ballNumberInOver: currentBallInOver,
      batter_id: scorecard.activePlayers.striker_id,
      bowler_id: scorecard.activePlayers.bowler_id,
      runsFromBat: calculatedRunsFromBat,
      extras: { type: activeExtra, runs: calculatedExtraRuns },
      isWicket: false,
      wicketDetails: null
    };
    try {
      const res = await adminAxios.post(`/ballevent`, payload);
      setScorecard(res.data); 
      setActiveExtra(null); 
      if (Number.isInteger(res.data.overs) && res.data.overs > 0) setIsOverModalOpen(true);
    } catch (err) { console.error(err); }
    finally {
      setIsProcessing(false); // Unlock the UI
    }
  };

  const handleWicketSubmit = async () => {
    if (!wicketDetails.dismissedBatter_id) return alert("Select dismissed batter!");
    if (!wicketDetails.nextBatter_id) return alert("Select incoming batter or 'ALL OUT'!");
    try {
      const ballRes = await adminAxios.post(`/ballevent`, {
        match_id: selectedMatch._id, inningsNumber: scorecard.inningsNumber, overNumber: currentOverNumber, ballNumberInOver: currentBallInOver,
        batter_id: scorecard.activePlayers.striker_id, bowler_id: scorecard.activePlayers.bowler_id, runsFromBat: wicketDetails.runsScored || 0,
        extras: { type: null, runs: 0 }, isWicket: true, wicketDetails: { type: wicketDetails.type, batter_id: wicketDetails.dismissedBatter_id, fielder_id: wicketDetails.fielder_id || null }
      });
      
      if (wicketDetails.nextBatter_id === 'ALL_OUT') {
        const activePlayersUpdate = {
          activePlayers: {
            ...ballRes.data.activePlayers,
            striker_id: wicketDetails.dismissedBatter_id === ballRes.data.activePlayers.striker_id ? null : ballRes.data.activePlayers.striker_id,
            nonStriker_id: wicketDetails.dismissedBatter_id === ballRes.data.activePlayers.nonStriker_id ? null : ballRes.data.activePlayers.nonStriker_id,
          }
        };
        const scoreRes = await adminAxios.put(`/update-scorecard`, { match_id: selectedMatch._id, ...activePlayersUpdate });
        setScorecard(scoreRes.data); 
        setIsWicketModalOpen(false);
        handleEndInningsClick(true);
      } else {
        const activePlayersUpdate = {
          activePlayers: {
            ...ballRes.data.activePlayers,
            striker_id: wicketDetails.dismissedBatter_id === ballRes.data.activePlayers.striker_id ? wicketDetails.nextBatter_id : ballRes.data.activePlayers.striker_id,
            nonStriker_id: wicketDetails.dismissedBatter_id === ballRes.data.activePlayers.nonStriker_id ? wicketDetails.nextBatter_id : ballRes.data.activePlayers.nonStriker_id,
          }
        };
        const scoreRes = await adminAxios.put(`/update-scorecard`, { match_id: selectedMatch._id, ...activePlayersUpdate });
        setScorecard(scoreRes.data); 
        setIsWicketModalOpen(false);
        if (Number.isInteger(scoreRes.data.overs) && scoreRes.data.overs > 0) setIsOverModalOpen(true);
      }
    } catch (err) { console.error(err); }
  };

  const handleUndoLastBall = async () => {
    if (!window.confirm("Are you sure you want to delete the last ball? This will revert the scorecard.")) return;
    try {
      const res = await adminAxios.post(`/undo-last-ball`, { match_id: selectedMatch._id, inningsNumber: scorecard.inningsNumber });
      setScorecard(res.data); 
    } catch (err) {
      alert("Error undoing ball: No balls left to undo.");
    }
  };

  const handleNextBowlerSubmit = async () => {
    try {
      const res = await adminAxios.put(`/update-scorecard`, { match_id: selectedMatch._id, activePlayers: { ...scorecard.activePlayers, bowler_id: nextBowlerId } });
      setScorecard(res.data); setIsOverModalOpen(false); setNextBowlerId('');
    } catch (err) {}
  };

  const handleSwapStrike = async () => {
    try {
      const res = await adminAxios.put(`/update-scorecard`, { match_id: selectedMatch._id, activePlayers: { ...scorecard.activePlayers, striker_id: scorecard.activePlayers.nonStriker_id, nonStriker_id: scorecard.activePlayers.striker_id } });
      setScorecard(res.data);
    } catch (err) {}
  };

  // --- TAB 1: MY MISTAKE (Uses standard update-scorecard) ---
  const handleEditPlayersSubmit = async () => {
    try {
      const activePlayersUpdate = {
        striker_id: editSetup.striker_id,
        nonStriker_id: editSetup.nonStriker_id,
        bowler_id: editSetup.bowler_id
      };
      const res = await adminAxios.put(`/update-scorecard`, { match_id: selectedMatch._id, activePlayers: activePlayersUpdate });
      setScorecard(res.data); 
      setIsEditPlayersModalOpen(false);
    } catch (err) {
      console.error(err);
      alert("Failed to update active players.");
    }
  };

  // --- TAB 2: LATE WICKET (Uses retroactive-correction) ---
  const handleRetroactiveSubmit = async () => {
    if (!editSetup.dismissedBatter_id || !editSetup.nextBatter_id) {
        return alert("Please select the dismissed batter and incoming batter.");
    }
    try {
      const payload = {
        match_id: selectedMatch._id,
        correctionType: 'WICKET',
        wicketDetails: {
          type: editSetup.wicketType,
          dismissedBatter_id: editSetup.dismissedBatter_id,
          nextBatter_id: editSetup.nextBatter_id,
          fielder_id: editSetup.fielder_id
        }
      };
      const res = await adminAxios.post(`/retroactive-correction`, payload);
      setScorecard(res.data); 
      setIsEditPlayersModalOpen(false);
      
      if (res.data.wickets >= 10) {
          handleEndInningsClick(true);
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to apply correction.");
    }
  };

  const handleEndInningsClick = async (skipPrompt = false) => {
    if (skipPrompt !== true) {
      if (!window.confirm("Do you want to end inning ??")) return;
    }
    try {
      setIsLoading(true);
      if (scorecard.inningsNumber === 1) {
        const res = await adminAxios.post(`/endining`, { match_id: selectedMatch._id });
        setScorecard(res.data); 
        setViewState('inningsBreak');
      } else {
        setViewState('matchEnd');
      }
      setIsLoading(false);
    } catch (err) {
       setIsLoading(false);
    }
  };

  const startSecondInnings = async () => {
    try {
      setIsLoading(true);
      const res = await adminAxios.post(`/start-second-inning`, { 
        match_id: selectedMatch._id, striker_id: tossSetup.striker_id, nonStriker_id: tossSetup.nonStriker_id, bowler_id: tossSetup.bowler_id 
      });
      setScorecard(res.data); 
      setIsLoading(false); 
      setViewState('scoring');
    } catch (err) {
       setIsLoading(false); 
    }
  };

  const submitMatchResult = async () => {
    const motm = document.getElementById('motm').value;
    const winCap = document.getElementById('wincap').value;
    try {
      await adminAxios.post(`/completedMatch`, { match_id: selectedMatch._id, manOfTheMatch_id: motm, winningCaptain_id: winCap });
      navigate('/admin');
    } catch (err) {}
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-950"><Loader2 className="w-10 h-10 text-yellow-500 animate-spin" /></div>;
  
  if (viewState === 'list') return <MatchListView matches={matches} handleSelectMatch={handleSelectMatch} />;
  if (viewState === 'draft') return <DraftSquadsView selectedMatch={selectedMatch} teamA={teamA} teamB={teamB} draftPool={draftPool} getCapA_Id={getCapA_Id} getCapB_Id={getCapB_Id} assignToTeam={assignToTeam} removeFromTeam={removeFromTeam} setViewState={setViewState} />;
  if (viewState === 'toss') return <TossSetupView selectedMatch={selectedMatch} tossSetup={tossSetup} setTossSetup={setTossSetup} getPlayerName={getPlayerName} getCapA_Id={getCapA_Id} getCapB_Id={getCapB_Id} battingSquad={battingSquad} fieldingSquad={fieldingSquad} handleStartMatch={handleStartMatch} />;
  
  if (viewState === 'scoring') return <ScoringDashboardView 
    scorecard={scorecard} activeExtra={activeExtra} setActiveExtra={setActiveExtra} handleScoreBall={handleScoreBall} 
    isOverModalOpen={isOverModalOpen} setIsOverModalOpen={setIsOverModalOpen} nextBowlerId={nextBowlerId} setNextBowlerId={setNextBowlerId} handleNextBowlerSubmit={handleNextBowlerSubmit} 
    isWicketModalOpen={isWicketModalOpen} setIsWicketModalOpen={setIsWicketModalOpen} wicketDetails={wicketDetails} setWicketDetails={setWicketDetails} handleWicketSubmit={handleWicketSubmit} 
    isEditPlayersModalOpen={isEditPlayersModalOpen} setIsEditPlayersModalOpen={setIsEditPlayersModalOpen} editSetup={editSetup} setEditSetup={setEditSetup} 
    handleEditPlayersSubmit={handleEditPlayersSubmit} handleRetroactiveSubmit={handleRetroactiveSubmit} 
    handleUndoLastBall={handleUndoLastBall} handleEndInningsClick={handleEndInningsClick} handleSwapStrike={handleSwapStrike} getPlayerName={getPlayerName} battingSquad={battingSquad} fieldingSquad={fieldingSquad}
  />;
  
  if (viewState === 'inningsBreak') return <InningsBreakView scorecard={scorecard} tossSetup={tossSetup} setTossSetup={setTossSetup} fieldingSquad={fieldingSquad} battingSquad={battingSquad} startSecondInnings={startSecondInnings} getPlayerName={getPlayerName} />;
  if (viewState === 'matchEnd') return <MatchEndView selectedMatch={selectedMatch} teamA={teamA} teamB={teamB} getCapA_Id={getCapA_Id} getCapB_Id={getCapB_Id} submitMatchResult={submitMatchResult} />;
  return null;
}