import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Trophy, Flame, MapPin, Loader2, Activity, ChevronRight, Clock } from 'lucide-react';
import axios from 'axios';
import Header from '../components/Header';
import Footer from '../components/Footer';

const API_URL = import.meta.env.VITE_USER_API;

export default function Home() {
  const navigate = useNavigate();
  const [matches, setMatches] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        const [matchesRes, statsRes] = await Promise.all([
          axios.get(`${API_URL}/getmatch`),
          axios.get(`${API_URL}/stats`)
        ]);
        setMatches(matchesRes.data);
        setStats(statsRes.data);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching home data:", error);
        setIsLoading(false);
      }
    };
    fetchHomeData();
  }, []);

  if (isLoading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="w-8 h-8 text-yellow-500 animate-spin" /></div>;

  // --- 1. SORT AND CATEGORIZE MATCHES ---
  const liveMatches = matches.filter(m => m.status === 'LIVE' || m.status === 'INNINGS_BREAK');
  
  const completedMatches = matches
    .filter(m => m.status === 'COMPLETED')
    .sort((a, b) => new Date(b.date) - new Date(a.date)); // Newest first
    
  const scheduledMatches = matches
    .filter(m => m.status === 'SCHEDULED')
    .sort((a, b) => new Date(a.date) - new Date(b.date)); // Soonest first

  // Highlight Priority: 1. Live Match -> 2. Most Recent Completed Match -> 3. Next Scheduled
  const highlightMatch = liveMatches[0] || completedMatches[0] || scheduledMatches[0];

  // Remove the highlight match from the lists below to prevent duplication
  const upcomingList = scheduledMatches.filter(m => m._id !== highlightMatch?._id);
  const completedList = completedMatches.filter(m => m._id !== highlightMatch?._id);
  const otherLiveList = liveMatches.filter(m => m._id !== highlightMatch?._id);

  // --- 2. FORMATTERS & PARSERS ---
  const getMatchResultText = (match) => {
    if (match.status !== 'COMPLETED' || !match.matchResult) return null;
    const teamACapId = typeof match.captains?.teamA_id === 'object' ? match.captains.teamA_id._id : match.captains?.teamA_id;
    const teamBCapId = typeof match.captains?.teamB_id === 'object' ? match.captains.teamB_id._id : match.captains?.teamB_id;
    
    if (match.matchResult.includes(teamACapId)) return `${match.teamAName} won`;
    if (match.matchResult.includes(teamBCapId)) return `${match.teamBName} won`;
    return "Match completed";
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex flex-col">
      <Header />
      
      <main className="flex-grow max-w-2xl w-full mx-auto px-3 sm:px-4 py-6 md:py-8 space-y-8 animate-fadeIn pb-12">
        
        {/* =========================================
            0. WELCOME / INTRO TEXT
        ========================================= */}
        <section className="text-center px-2">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tighter uppercase mb-2">
            Rajwan Premier League <span className="text-yellow-500">2026</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-medium max-w-md mx-auto leading-relaxed">
            Welcome to the ultimate cricket showdown in Pune. Track live scores, explore player statistics, and catch every moment of the tournament right here.
          </p>
        </section>

        {/* =========================================
            1. FEATURED MATCH (LIVE OR RECENT)
        ========================================= */}
        {highlightMatch && (
          <section>
            <div className="flex items-center justify-between mb-2 px-1">
              <h2 className="text-[11px] sm:text-xs font-black text-slate-400 uppercase tracking-widest flex items-center">
                {highlightMatch.status === 'LIVE' || highlightMatch.status === 'INNINGS_BREAK' ? (
                  <><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse mr-1.5"></span> Live Match</>
                ) : highlightMatch.status === 'COMPLETED' ? (
                  <><Trophy className="w-3.5 h-3.5 mr-1.5 text-yellow-500"/> Featured Result</>
                ) : (
                  <><Calendar className="w-3.5 h-3.5 mr-1.5 text-blue-400"/> Up Next</>
                )}
              </h2>
            </div>

            <div 
              onClick={() => ['LIVE', 'COMPLETED', 'INNINGS_BREAK'].includes(highlightMatch.status) && navigate(`/match/${highlightMatch._id}`)}
              className={`bg-slate-900 border rounded-xl p-4 shadow-xl transition relative overflow-hidden
                ${['LIVE', 'COMPLETED', 'INNINGS_BREAK'].includes(highlightMatch.status) ? 'cursor-pointer hover:bg-slate-800/80 border-slate-700/80' : 'border-slate-800'}`}
            >
              {highlightMatch.status === 'LIVE' && <div className="absolute top-0 left-0 right-0 h-0.5 bg-red-500"></div>}
              {highlightMatch.status === 'COMPLETED' && <div className="absolute top-0 left-0 right-0 h-0.5 bg-green-500"></div>}
              
              <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium mb-3">
                <span className="flex items-center"><Calendar className="w-3 h-3 mr-1" /> {formatDate(highlightMatch.date)} • {formatTime(highlightMatch.date)}</span>
                <span className="truncate max-w-[120px] flex items-center ml-2"><MapPin className="w-3 h-3 mr-1 shrink-0"/> <span className="truncate">{highlightMatch.venue}</span></span>
              </div>

              <div className="flex justify-between items-center mb-2">
                <h3 className="text-base sm:text-lg font-black text-white truncate w-[42%]">{highlightMatch.teamAName}</h3>
                <span className="text-[10px] font-black italic text-slate-600 uppercase">VS</span>
                <h3 className="text-base sm:text-lg font-black text-white truncate w-[42%] text-right">{highlightMatch.teamBName}</h3>
              </div>

              {highlightMatch.status === 'COMPLETED' ? (
                 <div className="mt-4 pt-3 border-t border-slate-800/50 text-[11px] font-bold text-green-500 flex items-center">
                   {getMatchResultText(highlightMatch)}
                 </div>
              ) : (
                <div className="mt-4 pt-3 border-t border-slate-800/50 flex items-center justify-between">
                  <span className={`inline-block px-2.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest
                    ${highlightMatch.status === 'LIVE' ? 'text-red-500 bg-red-500/10 border border-red-500/20' : 
                      highlightMatch.status === 'INNINGS_BREAK' ? 'text-yellow-500 bg-yellow-500/10 border border-yellow-500/20' : 
                      'text-blue-400 bg-blue-400/10 border border-blue-400/20'}`}>
                    {highlightMatch.status.replace('_', ' ')}
                  </span>
                  
                  {['LIVE', 'INNINGS_BREAK'].includes(highlightMatch.status) && (
                    <span className="text-[10px] font-bold text-blue-400 flex items-center">Match Center <ChevronRight className="w-3.5 h-3.5 ml-0.5"/></span>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Any OTHER live matches (Fallback list) */}
        {otherLiveList.length > 0 && (
          <div className="bg-slate-900 border border-red-900/30 rounded-xl overflow-hidden shadow-sm divide-y divide-slate-800/50">
            {otherLiveList.map(m => (
              <div key={m._id} onClick={() => navigate(`/match/${m._id}`)} className="p-3.5 hover:bg-slate-800/50 cursor-pointer flex justify-between items-center transition">
                <div className="flex-1">
                   <div className="text-[10px] text-red-500 font-bold mb-1 flex items-center uppercase tracking-wider"><Activity className="w-3 h-3 mr-1.5 animate-pulse"/> Match in Progress</div>
                   <div className="text-sm font-bold text-slate-200">{m.teamAName} <span className="text-slate-600 font-normal text-xs mx-1">v</span> {m.teamBName}</div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
              </div>
            ))}
          </div>
        )}

        {/* =========================================
            2. UPCOMING MATCHES (TIGHT LIST)
        ========================================= */}
        {upcomingList.length > 0 && (
          <section>
            <h2 className="text-[11px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mb-3 px-1 flex items-center">
              <Calendar className="w-3.5 h-3.5 mr-1.5 text-blue-400"/> Scheduled Matches
            </h2>
            
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm divide-y divide-slate-800/50">
              {upcomingList.map(m => (
                <div key={m._id} className="p-3.5 opacity-90 flex justify-between items-center">
                  <div className="flex-1">
                     <div className="text-[13px] sm:text-sm font-bold text-slate-200 mb-1.5">
                       {m.teamAName} <span className="text-slate-600 font-normal text-[10px] sm:text-xs mx-1">v</span> {m.teamBName}
                     </div>
                     <div className="text-[10px] text-slate-500 font-medium flex items-center gap-3">
                       <span className="flex items-center"><Calendar className="w-3 h-3 mr-1 text-slate-600"/>{formatDate(m.date)}</span>
                       <span className="flex items-center"><Clock className="w-3 h-3 mr-1 text-slate-600"/>{formatTime(m.date)}</span>
                     </div>
                  </div>
                  <div className="text-[9px] text-blue-400 border border-blue-400/20 bg-blue-400/5 uppercase font-bold px-2 py-1 rounded shrink-0 ml-2">Scheduled</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* =========================================
            3. COMPLETED MATCHES (TIGHT LIST)
        ========================================= */}
        {completedList.length > 0 && (
          <section>
            <h2 className="text-[11px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mb-3 px-1 flex items-center">
              <Trophy className="w-3.5 h-3.5 mr-1.5 text-green-500"/> Recent Results
            </h2>
            
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm divide-y divide-slate-800/50">
              {completedList.map(m => (
                <div key={m._id} onClick={() => navigate(`/match/${m._id}`)} className="p-3.5 hover:bg-slate-800/50 cursor-pointer transition flex flex-col group">
                  <div className="flex justify-between items-center mb-1.5">
                     <div className="text-[13px] sm:text-sm font-bold text-slate-200">
                       {m.teamAName} <span className="text-slate-600 font-normal text-[10px] sm:text-xs mx-1">v</span> {m.teamBName}
                     </div>
                     <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-white transition-colors shrink-0" />
                  </div>
                  <div className="flex justify-between items-center">
                     <div className="text-[10px] text-slate-500 font-medium">{formatDate(m.date)}</div>
                     <div className="text-[10px] font-bold text-green-500 uppercase tracking-wider">{getMatchResultText(m)}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* =========================================
            4. TOURNAMENT STATS (COMPACT GRID)
        ========================================= */}
        {stats && (
          <section className="pt-2">
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="text-[11px] sm:text-xs font-black text-slate-400 uppercase tracking-widest flex items-center">
                <Flame className="w-4 h-4 mr-1.5 text-orange-500"/> Tournament Leaders
              </h2>
              <button onClick={() => navigate('/stats')} className="text-[9px] font-bold text-blue-400 hover:text-blue-300 uppercase tracking-wider transition-colors border border-blue-400/30 bg-blue-400/10 px-2 py-1 rounded">
                View All
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              
              {/* Most Runs */}
              <div onClick={() => navigate('/stats?tab=mostRuns')} className="bg-slate-900 border border-slate-800 rounded-xl p-3 sm:p-4 cursor-pointer hover:bg-slate-800/80 transition flex flex-col justify-between">
                <p className="text-[9px] uppercase tracking-widest font-bold text-orange-500 mb-1.5">Most Runs</p>
                {stats.mostRuns?.[0] ? (
                  <div>
                    <p className="text-slate-200 font-bold text-[11px] sm:text-xs truncate">{stats.mostRuns[0].name}</p>
                    <p className="text-xl sm:text-2xl font-black text-white mt-0.5 leading-none">{stats.mostRuns[0].runs}</p>
                  </div>
                ) : <p className="text-[10px] text-slate-600 italic">No data</p>}
              </div>

              {/* Most Wickets */}
              <div onClick={() => navigate('/stats?tab=mostWickets')} className="bg-slate-900 border border-slate-800 rounded-xl p-3 sm:p-4 cursor-pointer hover:bg-slate-800/80 transition flex flex-col justify-between">
                <p className="text-[9px] uppercase tracking-widest font-bold text-purple-400 mb-1.5">Most Wickets</p>
                {stats.mostWickets?.[0] ? (
                  <div>
                    <p className="text-slate-200 font-bold text-[11px] sm:text-xs truncate">{stats.mostWickets[0].name}</p>
                    <p className="text-xl sm:text-2xl font-black text-white mt-0.5 leading-none">{stats.mostWickets[0].w}</p>
                  </div>
                ) : <p className="text-[10px] text-slate-600 italic">No data</p>}
              </div>

              {/* Highest Score */}
              <div onClick={() => navigate('/stats?tab=highestScore')} className="bg-slate-900 border border-slate-800 rounded-xl p-3 sm:p-4 cursor-pointer hover:bg-slate-800/80 transition flex flex-col justify-between">
                <p className="text-[9px] uppercase tracking-widest font-bold text-blue-400 mb-1.5">Highest Score</p>
                {stats.highestScore?.[0] ? (
                  <div>
                    <p className="text-slate-200 font-bold text-[11px] sm:text-xs truncate">{stats.highestScore[0].name}</p>
                    <p className="text-xl sm:text-2xl font-black text-white mt-0.5 leading-none">{stats.highestScore[0].hs}</p>
                  </div>
                ) : <p className="text-[10px] text-slate-600 italic">No data</p>}
              </div>

              {/* Most Sixes */}
              <div onClick={() => navigate('/stats?tab=most6s')} className="bg-slate-900 border border-slate-800 rounded-xl p-3 sm:p-4 cursor-pointer hover:bg-slate-800/80 transition flex flex-col justify-between">
                <p className="text-[9px] uppercase tracking-widest font-bold text-green-400 mb-1.5">Most Sixes</p>
                {stats.most6s?.[0] ? (
                  <div>
                    <p className="text-slate-200 font-bold text-[11px] sm:text-xs truncate">{stats.most6s[0].name}</p>
                    <p className="text-xl sm:text-2xl font-black text-white mt-0.5 leading-none">{stats.most6s[0].sixes}</p>
                  </div>
                ) : <p className="text-[10px] text-slate-600 italic">No data</p>}
              </div>

            </div>
          </section>
        )}

      </main>
      <Footer />
    </div>
  );
}