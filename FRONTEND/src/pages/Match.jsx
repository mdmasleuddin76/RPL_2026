import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Activity, Users, List, PlayCircle, Clock, Loader2 } from 'lucide-react';
import axios from 'axios';
import Header from '../components/Header';
import Footer from '../components/Footer';

const API_URL = import.meta.env.VITE_USER_API;
const ADMIN_API = import.meta.env.VITE_ADMIN_API; 
const POLLING_INTERVAL = parseInt(import.meta.env.VITE_POLLING_INTERVAL_MS) || 30000;

export default function MatchPage() {
  const { matchId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const currentTab = searchParams.get('tab') || 'live';

  const [isLoading, setIsLoading] = useState(true);
  const [scorecards, setScorecards] = useState([]);
  const [oversData, setOversData] = useState([]);
  const [matchInfo, setMatchInfo] = useState(null);
  const [allPlayers, setAllPlayers] = useState([]);

  // ========================================================
  // 1. INITIAL LOAD (Runs exactly ONCE)
  // ========================================================
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Fetch Match & Players first (Static data)
        const [matchListRes, playerListRes] = await Promise.all([
          axios.get(`${API_URL}/getmatch`),
          axios.get(`${ADMIN_API}/getplayer`) 
        ]);
        setMatchInfo(matchListRes.data.find(m => m._id === matchId));
        setAllPlayers(playerListRes.data);

        // Fetch Scorecard (Always needed for the hero section and Live tab)
        const scoreRes = await axios.get(`${API_URL}/getcompletescorecard/${matchId}`);
        setScorecards(Array.isArray(scoreRes.data) ? scoreRes.data : [scoreRes.data]);

        // 🔥 LAZY LOAD: Only fetch full overs history if they load the page directly on ?tab=overs
        if (currentTab === 'overs') {
          const oversRes = await axios.get(`${API_URL}/overs/${matchId}`);
          setOversData(oversRes.data?.overs || []);
        }

        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching initial match details:", error);
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, [matchId]); 

  // ========================================================
  // 2. DYNAMIC POLLER & TAB SWITCHER 
  // ========================================================
  useEffect(() => {
    let intervalId;

    const fetchUpdates = async () => {
      try {
        // ALWAYS update scorecard
        const scoreRes = await axios.get(`${API_URL}/getcompletescorecard/${matchId}`);
        setScorecards(Array.isArray(scoreRes.data) ? scoreRes.data : [scoreRes.data]);

        // 🔥 LAZY LOAD: Only hit the DB for overs if the user is actively looking at the Overs tab
        if (currentTab === 'overs') {
          const oversRes = await axios.get(`${API_URL}/overs/${matchId}`);
          setOversData(oversRes.data?.overs || []);
        }
      } catch (error) {
        console.error("Error polling match updates:", error);
      }
    };

    // If the component is fully loaded, trigger a fetch immediately when they click a new tab
    if (!isLoading) {
      fetchUpdates();
    }

    // Start polling every 45s ONLY if the match isn't completed
    if (matchInfo?.status !== 'COMPLETED' && ['live', 'scorecard', 'overs'].includes(currentTab)) {
      intervalId = setInterval(fetchUpdates, POLLING_INTERVAL);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [matchId, currentTab, matchInfo?.status, isLoading]);

  const handleTabChange = (tab) => setSearchParams({ tab });

  if (isLoading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="w-10 h-10 text-yellow-500 animate-spin" /></div>;
  if (scorecards.length === 0) return <div className="min-h-screen bg-slate-950 text-white text-center pt-20">Match data not found.</div>;

  // --- ROBUST ID COMPARER ---
  const getId = (val) => {
    if (!val) return null;
    if (typeof val === 'object' && val._id) return String(val._id);
    return String(val);
  };

  const getPlayerName = (obj) => obj?.playerName || obj?.batter_id?.name || obj?.bowler_id?.name || obj?.name || 'Unknown';

  const activeScorecard = scorecards[scorecards.length - 1];
  const sortedScorecards = [...scorecards].sort((a, b) => b.inningsNumber - a.inningsNumber);

  const strStats = activeScorecard.batting?.find(b => getId(b.batter_id) === getId(activeScorecard.activePlayers?.striker_id)) || {};
  const nonStrStats = activeScorecard.batting?.find(b => getId(b.batter_id) === getId(activeScorecard.activePlayers?.nonStriker_id)) || {};
  const bwlStats = activeScorecard.bowling?.find(b => getId(b.bowler_id) === getId(activeScorecard.activePlayers?.bowler_id)) || {};

  const teamACapId = getId(matchInfo?.captains?.teamA_id);
  const teamBCapId = getId(matchInfo?.captains?.teamB_id);

  let tossString = "Toss information not available";
  if (matchInfo?.toss?.wonBy_id) {
    const wonById = getId(matchInfo.toss.wonBy_id);
    const tossWinnerName = wonById === teamACapId ? matchInfo.teamAName : matchInfo.teamBName;
    tossString = `${tossWinnerName} won the toss and elected to ${matchInfo.toss.decision === 'BAT' ? 'bat' : 'bowl'} first`;
  }

  let rrr = '0.00';
  if (activeScorecard.targetscore > 0) {
    const runsNeeded = activeScorecard.targetscore - activeScorecard.score;
    const [overs, balls] = String(activeScorecard.overs || '0.0').split('.').map(Number);
    const ballsBowled = (overs * 6) + (balls || 0);
    const ballsRemaining = 120 - ballsBowled; 
    if (ballsRemaining > 0) {
      rrr = ((runsNeeded / ballsRemaining) * 6).toFixed(2);
    }
  }

  const activeBattingTeamId = getId(activeScorecard.battingCaptain_id);
  const activeBattingTeamName = activeBattingTeamId === teamACapId ? matchInfo?.teamAName : matchInfo?.teamBName;

  // --- DYNAMIC STATUS BANNER ---
  let statusBanner = "MATCH DETAILS";
  let statusColor = "text-yellow-500";
  
  if (matchInfo?.status === 'LIVE') {
    statusBanner = "🔴 LIVE";
    statusColor = "text-red-500 animate-pulse";
  } else if (matchInfo?.status === 'INNINGS_BREAK') {
    statusBanner = "⏳ INNINGS BREAK";
    statusColor = "text-yellow-500";
  } else if (matchInfo?.status === 'COMPLETED') {
    let winningTeamName = matchInfo?.teamAName || 'UNKNOWN TEAM';
    if (matchInfo?.matchResult) {
      if (matchInfo.matchResult.includes(teamACapId)) winningTeamName = matchInfo?.teamAName;
      else if (matchInfo.matchResult.includes(teamBCapId)) winningTeamName = matchInfo?.teamBName;
    }
    statusBanner = `🏆 MATCH COMPLETED • WON BY ${winningTeamName?.toUpperCase()}`;
    statusColor = "text-green-500";
  }

  // ---------------------------------------------------------
  // TAB COMPONENTS 
  // ---------------------------------------------------------
  const RenderLiveTab = () => (
    <div className="space-y-4 animate-fadeIn pb-10">
      <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-lg overflow-hidden">
        <table className="w-full text-left text-slate-300">
          <thead className="bg-[#0f172a] text-slate-400 text-[10px] uppercase tracking-wider border-b border-slate-800">
            <tr>
              <th className="px-2 sm:px-4 py-2 font-semibold w-[40%]">Batter</th>
              <th className="px-1 py-2 text-center font-semibold">R</th>
              <th className="px-1 py-2 text-center font-semibold">B</th>
              <th className="px-1 py-2 text-center font-semibold">4s</th>
              <th className="px-1 py-2 text-center font-semibold">6s</th>
              <th className="px-2 py-2 text-right font-semibold">SR</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            <tr>
              <td className="px-2 sm:px-4 py-2 text-[11px] sm:text-sm font-bold text-yellow-500 flex items-center break-words leading-tight">
                <span className="truncate max-w-[80px] sm:max-w-none">{getPlayerName(strStats)}</span> 
                <Activity className="w-3 h-3 ml-1.5 text-yellow-500 animate-pulse shrink-0"/>
              </td>
              <td className="px-1 py-2 text-center font-black text-white text-[11px] sm:text-sm">{strStats.runs || 0}</td>
              <td className="px-1 py-2 text-center text-slate-400 text-[11px] sm:text-sm">{strStats.ballsFaced || 0}</td>
              <td className="px-1 py-2 text-center text-slate-400 text-[11px] sm:text-sm">{strStats.fours || 0}</td>
              <td className="px-1 py-2 text-center text-slate-400 text-[11px] sm:text-sm">{strStats.sixes || 0}</td>
              <td className="px-2 py-2 text-right text-slate-400 text-xs sm:text-sm">{strStats.strikeRate || '0.00'}</td>
            </tr>
            <tr>
              <td className="px-2 sm:px-4 py-2 text-[11px] sm:text-sm font-medium text-slate-300 truncate">
                <span className="truncate max-w-[100px] sm:max-w-none">{getPlayerName(nonStrStats)}</span>
              </td>
              <td className="px-1 py-2 text-center font-bold text-white text-[11px] sm:text-sm">{nonStrStats.runs || 0}</td>
              <td className="px-1 py-2 text-center text-slate-400 text-[11px] sm:text-sm">{nonStrStats.ballsFaced || 0}</td>
              <td className="px-1 py-2 text-center text-slate-400 text-[11px] sm:text-sm">{nonStrStats.fours || 0}</td>
              <td className="px-1 py-2 text-center text-slate-400 text-[11px] sm:text-sm">{nonStrStats.sixes || 0}</td>
              <td className="px-2 py-2 text-right text-slate-400 text-xs sm:text-sm">{nonStrStats.strikeRate || '0.00'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-lg overflow-hidden p-1 sm:p-2">
        <table className="w-full text-left text-slate-300 mb-3 sm:mb-4">
          <thead className="bg-[#0f172a] text-slate-400 text-[10px] uppercase tracking-wider rounded-md">
            <tr>
              <th className="px-2 py-2 font-semibold w-[40%]">Bowler</th>
              <th className="px-1 py-2 text-center font-semibold">O</th>
              <th className="px-1 py-2 text-center font-semibold">M</th>
              <th className="px-1 py-2 text-center font-semibold">R</th>
              <th className="px-1 py-2 text-center font-semibold">W</th>
              <th className="px-2 py-2 text-right font-semibold">ECO</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="px-2 py-2.5 font-bold text-slate-200 flex items-center truncate">
                <span className="truncate max-w-[80px] sm:max-w-none">{getPlayerName(bwlStats)}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 ml-1.5 animate-pulse shrink-0"></span>
              </td>
              <td className="px-1 py-2.5 text-center text-slate-300">{bwlStats.overs || '0.0'}</td>
              <td className="px-1 py-2.5 text-center text-slate-400">{bwlStats.maidens || 0}</td>
              <td className="px-1 py-2.5 text-center text-slate-300">{bwlStats.runsConceded || 0}</td>
              <td className="px-1 py-2.5 text-center font-black text-red-400">{bwlStats.wickets || 0}</td>
              <td className="px-2 py-2.5 text-right text-slate-400 text-xs sm:text-sm">{bwlStats.economyRate || '0.00'}</td>
            </tr>
          </tbody>
        </table>
        
        {/* THIS USES currentOverTimeline AS YOU REQUESTED (No /overs call needed!) */}
        <div className="border-t border-slate-800 pt-3 px-2 flex items-center gap-3">
          <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest shrink-0">This Over:</span>
          <div className="flex gap-1 overflow-x-auto hide-scrollbar flex-grow pb-1">
            {activeScorecard.currentOverTimeline?.length === 0 && <span className="text-xs text-slate-600 italic">Waiting for ball...</span>}
            {activeScorecard.currentOverTimeline?.map((ball, i) => (
              <span key={i} className={`px-2 py-1 rounded text-[10px] sm:text-xs font-mono font-bold shrink-0 shadow-sm
                ${ball.includes('W') && !ball.includes('WD') ? 'bg-red-500 text-white' : 
                  ball === '4' || ball === '6' ? 'bg-green-500 text-white' : 
                  'bg-slate-800 text-slate-300 border border-slate-700'}`}>
                {ball}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const RenderScorecardTab = () => (
    <div className="space-y-6 animate-fadeIn pb-10">
      {sortedScorecards.map((sc) => {
        const battedPlayers = sc.batting?.filter(b => b.status !== 'YET_TO_BAT') || [];
        const yetToBat = sc.batting?.filter(b => b.status === 'YET_TO_BAT') || [];
        const activeBowlers = sc.bowling?.filter(b => b.overs !== '0.0' || b.runsConceded > 0) || [];
        
        const inningsTeamId = getId(sc.battingCaptain_id);
        const isTeamA = inningsTeamId === teamACapId;
        const inningsTeamName = isTeamA ? matchInfo?.teamAName : matchInfo?.teamBName;

        return (
          <div key={sc.inningsNumber} className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="bg-[#0f172a] px-3 sm:px-4 py-3 border-b border-slate-800 flex justify-between items-center">
              <span className="text-white font-bold tracking-wide truncate pr-2 text-sm sm:text-base">{inningsTeamName} <span className="text-slate-500 text-[10px] sm:text-xs font-normal ml-1">Innings {sc.inningsNumber}</span></span>
              <span className="text-white font-black shrink-0 text-sm sm:text-base">{sc.score}-{sc.wickets} <span className="text-slate-400 font-medium text-[10px] sm:text-xs ml-0.5">({sc.overs} Ov)</span></span>
            </div>

            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/50 text-slate-500 text-[10px] uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-2 py-2 font-semibold w-[40%] sm:w-[45%]">Batter</th>
                  <th className="px-1 py-2 text-center font-semibold">R</th>
                  <th className="px-1 py-2 text-center font-semibold">B</th>
                  <th className="px-1 py-2 text-center font-semibold">4s</th>
                  <th className="px-1 py-2 text-center font-semibold">6s</th>
                  <th className="px-2 py-2 text-right font-semibold">SR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {battedPlayers.map((batter, idx) => (
                  <tr key={idx} className={batter.status === 'BATTING' ? 'bg-slate-800/30' : ''}>
                    <td className="px-2 py-2 sm:py-2.5">
                      <p className={`font-medium truncate max-w-[110px] sm:max-w-none ${batter.status === 'BATTING' ? 'text-blue-400' : 'text-slate-200'}`}>
                        {getPlayerName(batter)}
                        {batter.status === 'BATTING' && <span className="text-yellow-500 text-[10px] ml-1 font-bold uppercase">*</span>}
                      </p>
                      <p className="text-[9px] sm:text-[10px] text-slate-500 mt-0.5 truncate max-w-[110px] sm:max-w-[200px]">{batter.dismissalText || 'batting'}</p>
                    </td>
                    <td className="px-1 py-2 text-center font-bold text-white text-[11px] sm:text-sm">{batter.runs}</td>
                    <td className="px-1 py-2 text-center text-slate-400 text-[11px] sm:text-sm">{batter.ballsFaced}</td>
                    <td className="px-1 py-2 text-center text-slate-400 text-[11px] sm:text-sm">{batter.fours}</td>
                    <td className="px-1 py-2 text-center text-slate-400 text-[11px] sm:text-sm">{batter.sixes}</td>
                    <td className="px-2 py-2 text-right text-slate-400 text-[10px] sm:text-xs">{batter.strikeRate}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="bg-slate-900/50 border-t border-slate-800 px-3 sm:px-4 py-2 sm:py-3 text-[11px] sm:text-xs md:text-sm">
              <div className="flex items-center mb-1">
                <span className="font-bold text-slate-300 w-12 sm:w-16">Extras</span>
                <span className="font-bold text-white">{sc.extras?.total || 0}</span>
                <span className="text-slate-500 text-[9px] sm:text-xs ml-2">(b {sc.extras?.byes || 0}, lb {sc.extras?.legByes || 0}, w {sc.extras?.wides || 0}, nb {sc.extras?.noBalls || 0}, p 0)</span>
              </div>
              <div className="flex items-center mt-2">
                <span className="font-bold text-slate-300 w-12 sm:w-16">Total</span>
                <span className="font-bold text-white">{sc.score}</span>
                <span className="text-slate-500 text-[9px] sm:text-xs ml-2">({sc.wickets} wkts, {sc.overs} Ov)</span>
              </div>
            </div>

            {yetToBat.length > 0 && (
              <div className="bg-slate-900 border-t border-slate-800 px-3 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-xs">
                <span className="font-bold text-slate-300">Yet to Bat: </span>
                <span className="text-blue-400 leading-relaxed">{yetToBat.map(p => getPlayerName(p)).join(', ')}</span>
              </div>
            )}

            <div className="border-t border-slate-800">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-[#0f172a] text-slate-500 text-[10px] uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-2 py-2 font-semibold w-[40%] sm:w-[50%]">Bowler</th>
                    <th className="px-1 py-2 text-center font-semibold">O</th>
                    <th className="px-1 py-2 text-center font-semibold">M</th>
                    <th className="px-1 py-2 text-center font-semibold">R</th>
                    <th className="px-1 py-2 text-center font-semibold">W</th>
                    <th className="px-2 py-2 text-right font-semibold">ECO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {activeBowlers.map((bowler, idx) => (
                    <tr key={idx}>
                      <td className="px-2 py-2 sm:py-2.5 font-medium text-blue-400 truncate max-w-[100px] sm:max-w-none">{getPlayerName(bowler)}</td>
                      <td className="px-1 py-2 text-center text-slate-300">{bowler.overs}</td>
                      <td className="px-1 py-2 text-center text-slate-400">{bowler.maidens || 0}</td>
                      <td className="px-1 py-2 text-center text-slate-300">{bowler.runsConceded}</td>
                      <td className="px-1 py-2 text-center font-bold text-white">{bowler.wickets}</td>
                      <td className="px-2 py-2 text-right text-slate-400 text-[10px] sm:text-xs">{bowler.economyRate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );

  const RenderOversTab = () => {
    const innings2Overs = oversData.filter(o => o.innings === 2);
    const innings1Overs = oversData.filter(o => o.innings === 1);

    const renderInningsOvers = (oversList, inningsNum) => {
      if (!oversList || oversList.length === 0) return null;
      return (
        <div className="mb-8">
          <h3 className="text-yellow-500 font-black tracking-wide uppercase mb-3 px-1 text-sm">Innings {inningsNum}</h3>
          <div className="space-y-3 sm:space-y-4">
            {oversList.map((over, idx) => (
              <div key={idx} className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-sm">
                <div className="bg-[#0f172a] px-3 py-2 border-b border-slate-800 flex justify-between items-center">
                  <span className="text-slate-300 font-bold text-[11px] sm:text-xs">
                    Over {over['over number']} <span className="text-slate-600 font-normal mx-1.5">|</span> <span className="text-blue-400 font-medium">{over['bowler name']}</span>
                  </span>
                </div>
                <div className="px-3 py-2.5 flex gap-1.5 overflow-x-auto hide-scrollbar">
                  {over.overstimeline?.map((ball, i) => (
                    <div key={i} className={`flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-bold text-[10px] md:text-xs shadow-sm
                      ${ball.includes('W') && !ball.includes('WD') ? 'bg-red-500 text-white' : 
                        ball === '4' || ball === '6' ? 'bg-green-500 text-white' : 
                        ball === '0' ? 'bg-slate-800 text-slate-400 border border-slate-700' : 'bg-slate-700 text-white'}`}
                    >
                      {ball}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    };

    return (
      <div className="animate-fadeIn pb-10">
        {oversData.length === 0 && <p className="text-center text-slate-500 py-10 text-sm">No overs recorded yet.</p>}
        {renderInningsOvers(innings2Overs, 2)}
        {renderInningsOvers(innings1Overs, 1)}
      </div>
    );
  };

  const RenderSquadsTab = () => {
    const getNames = (ids) => ids?.map(id => allPlayers.find(p => p._id === id)?.name || 'Unknown Player') || [];

    return (
      <div className="grid grid-cols-2 gap-2 sm:gap-4 animate-fadeIn pb-10">
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-lg">
          <div className="bg-[#0f172a] px-2 py-3 border-b border-slate-800 text-white font-bold text-center text-[10px] sm:text-xs uppercase tracking-wider break-words">
            {matchInfo?.teamAName || 'Team A'}
          </div>
          <ul className="divide-y divide-slate-800/50">
            {getNames(matchInfo?.squadA_player_ids).map((player, idx) => (
              <li key={idx} className="px-2 py-3 text-[10px] sm:text-xs text-slate-300 text-center hover:bg-slate-800/30 transition break-words whitespace-normal leading-tight">{player}</li>
            ))}
          </ul>
        </div>
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-lg">
          <div className="bg-[#0f172a] px-2 py-3 border-b border-slate-800 text-white font-bold text-center text-[10px] sm:text-xs uppercase tracking-wider break-words">
            {matchInfo?.teamBName || 'Team B'}
          </div>
          <ul className="divide-y divide-slate-800/50">
            {getNames(matchInfo?.squadB_player_ids).map((player, idx) => (
              <li key={idx} className="px-2 py-3 text-[10px] sm:text-xs text-slate-300 text-center hover:bg-slate-800/30 transition break-words whitespace-normal leading-tight">{player}</li>
            ))}
          </ul>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex flex-col">
      <Header />
      
      <div className="bg-slate-900 border-b border-slate-800 shadow-xl">
        <div className="flex items-center justify-between px-3 sm:px-4 py-4 max-w-4xl mx-auto">
          <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-white transition p-1">
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          <div className="text-center flex-1">
             <h2 className="text-xs sm:text-sm md:text-base font-black text-white tracking-widest uppercase truncate px-2">{matchInfo?.teamAName} vs {matchInfo?.teamBName}</h2>
             <p className={`text-[9px] sm:text-[10px] font-bold uppercase mt-1 tracking-wider ${statusColor}`}>{statusBanner}</p>
          </div>
          <div className="w-5 sm:w-6"></div>
        </div>

        <div className="px-3 sm:px-4 pb-5 pt-1 max-w-3xl mx-auto flex flex-col items-center justify-center text-center relative">
          <div className="mb-3">
            <h1 className="text-6xl sm:text-7xl md:text-8xl font-black text-white tracking-tighter drop-shadow-md leading-none">
              {activeScorecard.score}<span className="text-4xl sm:text-5xl md:text-6xl text-slate-500 font-bold">/{activeScorecard.wickets}</span>
            </h1>
            <p className="text-slate-400 font-medium text-[10px] sm:text-xs md:text-sm mt-2 tracking-wide uppercase break-words px-4">
              {activeBattingTeamName} Innings
            </p>
          </div>
          
          <div className="flex flex-wrap justify-center items-center gap-1.5 sm:gap-3 text-[10px] sm:text-xs font-medium mt-1">
            <span className="bg-slate-950/50 text-slate-300 px-3 sm:px-4 py-1.5 rounded-md border border-slate-800 shadow-inner">
              Overs: <span className="text-white font-bold">{activeScorecard.overs}</span>
            </span>
            <span className="bg-slate-950/50 text-slate-300 px-3 sm:px-4 py-1.5 rounded-md border border-slate-800 shadow-inner">
              CRR: <span className="text-white font-bold">{activeScorecard.runRate}</span>
            </span>
            
            {activeScorecard.targetscore > 0 && matchInfo?.status !== 'COMPLETED' && (
              <>
                <span className="bg-slate-950/50 text-slate-300 px-3 sm:px-4 py-1.5 rounded-md border border-yellow-500/30 shadow-inner text-yellow-500">
                  Target: <span className="font-bold">{activeScorecard.targetscore}</span>
                </span>
                <span className="bg-red-500/10 text-red-400 px-3 sm:px-4 py-1.5 rounded-md border border-red-500/30 shadow-inner">
                  REQ: <span className="font-bold">{rrr}</span>
                </span>
              </>
            )}
          </div>
          <p className="text-slate-400 text-[9px] sm:text-[10px] md:text-xs mt-4 font-medium bg-slate-800/40 px-4 py-2 rounded-full border border-slate-800/50 shadow-sm leading-tight max-w-full break-words">{tossString}</p>
        </div>

        <div className="flex overflow-x-auto hide-scrollbar border-t border-slate-800 bg-[#0f172a] max-w-4xl mx-auto">
          <button onClick={() => handleTabChange('live')} className={`flex-1 py-3 text-[10px] sm:text-xs md:text-sm font-bold tracking-wider uppercase whitespace-nowrap px-3 sm:px-6 transition-colors border-b-2 ${currentTab === 'live' ? 'text-yellow-500 border-yellow-500 bg-slate-800/50' : 'text-slate-500 border-transparent hover:text-slate-300'}`}>
            Live
          </button>
          <button onClick={() => handleTabChange('scorecard')} className={`flex-1 py-3 text-[10px] sm:text-xs md:text-sm font-bold tracking-wider uppercase whitespace-nowrap px-3 sm:px-6 transition-colors border-b-2 ${currentTab === 'scorecard' ? 'text-yellow-500 border-yellow-500 bg-slate-800/50' : 'text-slate-500 border-transparent hover:text-slate-300'}`}>
            Scorecard
          </button>
          <button onClick={() => handleTabChange('overs')} className={`flex-1 py-3 text-[10px] sm:text-xs md:text-sm font-bold tracking-wider uppercase whitespace-nowrap px-3 sm:px-6 transition-colors border-b-2 ${currentTab === 'overs' ? 'text-yellow-500 border-yellow-500 bg-slate-800/50' : 'text-slate-500 border-transparent hover:text-slate-300'}`}>
            Overs
          </button>
          <button onClick={() => handleTabChange('squads')} className={`flex-1 py-3 text-[10px] sm:text-xs md:text-sm font-bold tracking-wider uppercase whitespace-nowrap px-3 sm:px-6 transition-colors border-b-2 ${currentTab === 'squads' ? 'text-yellow-500 border-yellow-500 bg-slate-800/50' : 'text-slate-500 border-transparent hover:text-slate-300'}`}>
            Squads
          </button>
        </div>
      </div>

      <main className="flex-grow max-w-4xl w-full mx-auto px-2 sm:px-4 py-4 md:py-6">
        {currentTab === 'live' && <RenderLiveTab />}
        {currentTab === 'scorecard' && <RenderScorecardTab />}
        {currentTab === 'overs' && <RenderOversTab />}
        {currentTab === 'squads' && <RenderSquadsTab />}
      </main>
      
      <Footer />
    </div>
  );
}