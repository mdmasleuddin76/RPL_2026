import React, { useState, useEffect } from 'react';
import { Loader2, Trophy, Medal } from 'lucide-react';
import axios from 'axios';
import Header from '../components/Header';
import Footer from '../components/Footer';

const API_URL = import.meta.env.VITE_USER_API;

export default function Stats() {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('mostRuns');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get(`${API_URL}/stats`);
        setStats(res.data);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching stats:", error);
        setIsLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (isLoading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="w-10 h-10 text-yellow-500 animate-spin" /></div>;
  if (!stats) return <div className="min-h-screen bg-slate-950 text-white text-center pt-20">No Stats Available.</div>;

  // --- CRICBUZZ STYLE DYNAMIC COLUMNS ---
  const tabConfig = {
    mostRuns: { title: "Most Runs", role: "Batter", headers: ['M', 'R', 'SR'], keys: ['m', 'runs', 'sr'] },
    highestScore: { title: "Highest Score", role: "Batter", headers: ['M', 'R', 'HS'], keys: ['m', 'runs', 'hs'] },
    bestStrikeRate: { title: "Best Strike Rate", role: "Batter", headers: ['M', 'R', 'SR'], keys: ['m', 'runs', 'sr'] },
    most4s: { title: "Most 4s", role: "Batter", headers: ['M', 'R', '4s'], keys: ['m', 'runs', 'fours'] },
    most6s: { title: "Most 6s", role: "Batter", headers: ['M', 'R', '6s'], keys: ['m', 'runs', 'sixes'] },
    mostWickets: { title: "Most Wickets", role: "Bowler", headers: ['M', 'O', 'W', 'ECO'], keys: ['m', 'o', 'w', 'econ'] },
    bestBowlingAverage: { title: "Best Bowling Average", role: "Bowler", headers: ['M', 'W', 'AVG'], keys: ['m', 'w', 'avg'] },
    bestEconomy: { title: "Best Economy", role: "Bowler", headers: ['M', 'O', 'W', 'ECO'], keys: ['m', 'o', 'w', 'econ'] },
    
    // NEW: Fielding Stat
    mostCatches: { title: "Most Catches", role: "Fielder", headers: ['M', 'C'], keys: ['m', 'catches'] },
  };

  const currentConfig = tabConfig[activeTab];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex flex-col">
      <Header />
      
      <main className="flex-grow max-w-4xl w-full mx-auto px-4 py-8 animate-fadeIn">
        <div className="text-center mb-8">
          <Trophy className="w-10 h-10 md:w-12 md:h-12 text-yellow-500 mx-auto mb-3" />
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-wider uppercase">Tournament Stats</h1>
        </div>

        {/* DROPDOWN SELECTOR */}
        <div className="bg-slate-900 p-2 rounded-xl border border-slate-800 mb-6 shadow-lg max-w-md mx-auto">
          <select 
            value={activeTab} 
            onChange={(e) => setActiveTab(e.target.value)}
            className="w-full bg-slate-950 text-white font-bold tracking-wider uppercase p-3.5 md:p-4 rounded-lg outline-none border border-slate-700 cursor-pointer text-sm md:text-base"
          >
            <optgroup label="Batting Stats">
              <option value="mostRuns">Most Runs</option>
              <option value="highestScore">Highest Scores</option>
              <option value="bestStrikeRate">Best Batting Strike Rate</option>
              <option value="most4s">Most Fours</option>
              <option value="most6s">Most Sixes</option>
            </optgroup>
            <optgroup label="Bowling Stats">
              <option value="mostWickets">Most Wickets</option>
              <option value="bestBowlingAverage">Best Bowling Average</option>
              <option value="bestEconomy">Best Bowling Economy</option>
            </optgroup>
            <optgroup label="Fielding Stats">
              <option value="mostCatches">Most Catches</option>
            </optgroup>
          </select>
        </div>

        {/* CLEAN CRICBUZZ STYLE TABLE */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          <table className="w-full text-left text-sm md:text-base text-slate-300">
            
            <thead className="bg-[#0f172a] text-slate-400 text-xs md:text-sm uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-4 w-12 text-center">#</th>
                <th className="px-2 py-4 font-semibold">{currentConfig.role}</th>
                
                {/* Dynamically render ONLY the specific headers needed for this tab */}
                {currentConfig.headers.map((header, idx) => (
                  <th key={idx} className="px-3 py-4 text-right font-semibold">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/50">
              {stats[activeTab]?.map((player, index) => (
                <tr key={player.id} className="hover:bg-slate-800/30 transition">
                  
                  {/* Rank Icon */}
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center items-center">
                      {index === 0 ? <Medal className="w-5 h-5 text-yellow-400"/> : 
                       index === 1 ? <Medal className="w-5 h-5 text-slate-300"/> : 
                       index === 2 ? <Medal className="w-5 h-5 text-amber-700"/> : 
                       <span className="font-bold text-slate-500">{index + 1}</span>}
                    </div>
                  </td>
                  
                  {/* Player Name */}
                  <td className="px-2 py-4 font-bold text-blue-400 whitespace-nowrap">{player.name}</td>

                  {/* Dynamically render ONLY the specific stats needed for this tab */}
                  {currentConfig.keys.map((key, idx) => {
                    // Make the final/target column pop with yellow color
                    const isTargetStat = 
                      (activeTab === 'mostRuns' && key === 'runs') ||
                      (activeTab === 'mostWickets' && key === 'w') ||
                      (activeTab === 'bestStrikeRate' && key === 'sr') ||
                      (activeTab === 'bestEconomy' && key === 'econ') ||
                      (activeTab === 'highestScore' && key === 'hs') ||
                      (activeTab === 'bestBowlingAverage' && key === 'avg') ||
                      (activeTab === 'most4s' && key === 'fours') ||
                      (activeTab === 'most6s' && key === 'sixes') ||
                      (activeTab === 'mostCatches' && key === 'catches');

                    let displayValue = player[key];
                    // Format decimals cleanly
                    if (key === 'sr' || key === 'econ' || key === 'avg') {
                       displayValue = Number(displayValue).toFixed(2);
                    }

                    return (
                      <td 
                        key={idx} 
                        className={`px-3 py-4 text-right ${isTargetStat ? 'font-black text-yellow-500 text-base md:text-lg' : 'font-medium text-slate-300'}`}
                      >
                        {displayValue}
                      </td>
                    );
                  })}
                </tr>
              ))}
              
              {(!stats[activeTab] || stats[activeTab].length === 0) && (
                <tr>
                  <td colSpan={currentConfig.headers.length + 2} className="px-6 py-10 text-center text-slate-500">
                    No stats available yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      <Footer />
    </div>
  );
}