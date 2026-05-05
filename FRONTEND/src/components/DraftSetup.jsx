import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Calendar, MapPin, UserCheck, CheckCircle2, Loader2 } from 'lucide-react';
import adminAxios from '../utils/axiosConfig';


export default function DraftSetup() {
  const navigate = useNavigate();
  
  // ---------------------------------------------------------
  // COMPONENT STATE
  // ---------------------------------------------------------
  const [players, setPlayers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [matchDoc, setMatchDoc] = useState({
    date: '',
    venue: 'Pune Turf Club',
    captains: { teamA_id: '', teamB_id: '' }
  });

  // ---------------------------------------------------------
  // REAL API CALLS
  // ---------------------------------------------------------
  // 1. Fetch Players from DB on Load
  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const response = await adminAxios.get('/getplayer');
        setPlayers(response.data);
      } catch (error) {
        console.error("❌ Error fetching players:", error);
        alert("Failed to load players. Ensure backend is running.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlayers();
  }, []);

  // ---------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------
  const handleCreateMatch = async (e) => {
    e.preventDefault();
    
    // Validations
    if (!matchDoc.captains.teamA_id || !matchDoc.captains.teamB_id) {
      return alert("Please select both captains!");
    }
    if (!matchDoc.date) {
      return alert("Please select a date and time!");
    }

    setIsSaving(true);

    // Find the actual player objects for the names (Notice we use _id now)
    const capA = players.find(p => p._id === matchDoc.captains.teamA_id);
    const capB = players.find(p => p._id === matchDoc.captains.teamB_id);

    // Create the final match object 
    // (We do NOT send an _id here, MongoDB will generate it automatically)
    const newMatch = {
      date: matchDoc.date,
      venue: matchDoc.venue,
      teamAName: `${capA.name}'s XI`,
      teamBName: `${capB.name}'s XI`,
      captains: { 
        teamA_id: capA._id, 
        teamB_id: capB._id 
      }
    };

    try {
      // POST to backend
      const response = await adminAxios.post('/create-match', newMatch);
      console.log("✅ Match saved to DB:", response.data);

      setIsSaving(false);
      alert("Match Scheduled Successfully!");
      navigate('/admin'); // Return to Dashboard

    } catch (error) {
      console.error("❌ Failed to save match:", error);
      const errorMessage = error.response?.data?.error || "Error scheduling match. Ensure backend is running.";
      alert(errorMessage);
      setIsSaving(false);
    }
  };

  // Dynamically filter available captains (Notice we use _id now)
  const availableForCaptainA = players.filter(p => p._id !== matchDoc.captains.teamB_id);
  const availableForCaptainB = players.filter(p => p._id !== matchDoc.captains.teamA_id);

  // ---------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------
  return (
    <div className="animate-fadeIn max-w-2xl mx-auto">
      
      <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
        <h2 className="text-2xl font-black text-white">Schedule New Match</h2>
        <button onClick={() => navigate('/admin')} className="text-slate-400 hover:text-white transition bg-slate-800 p-2 rounded-full">
          <X className="w-5 h-5"/>
        </button>
      </div>

      <div className="bg-slate-900 p-6 md:p-8 rounded-2xl border border-slate-800 shadow-2xl relative overflow-hidden">
        
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-slate-900/80 z-10 flex flex-col items-center justify-center backdrop-blur-sm">
            <Loader2 className="w-8 h-8 text-yellow-500 animate-spin mb-2" />
            <p className="text-slate-400 font-bold text-sm">Loading Roster...</p>
          </div>
        )}

        <form className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Captain A Selection */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 focus-within:border-yellow-500 transition-colors">
              <label className="block text-xs font-bold text-yellow-500 mb-2 uppercase tracking-wider flex items-center">
                <UserCheck className="w-4 h-4 mr-2" /> Captain A
              </label>
              <select 
                value={matchDoc.captains.teamA_id} 
                onChange={(e) => setMatchDoc({...matchDoc, captains: {...matchDoc.captains, teamA_id: e.target.value}})} 
                className="w-full bg-transparent text-white focus:outline-none cursor-pointer"
                disabled={isLoading}
              >
                <option value="" className="bg-slate-900 text-slate-400">Select Captain A...</option>
                {availableForCaptainA.map(p => (
                  <option key={p._id} value={p._id} className="bg-slate-900">{p.name}</option>
                ))}
              </select>
            </div>

            {/* Captain B Selection */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 focus-within:border-blue-400 transition-colors">
              <label className="block text-xs font-bold text-blue-400 mb-2 uppercase tracking-wider flex items-center">
                <UserCheck className="w-4 h-4 mr-2" /> Captain B
              </label>
              <select 
                value={matchDoc.captains.teamB_id} 
                onChange={(e) => setMatchDoc({...matchDoc, captains: {...matchDoc.captains, teamB_id: e.target.value}})} 
                className="w-full bg-transparent text-white focus:outline-none cursor-pointer"
                disabled={isLoading}
              >
                <option value="" className="bg-slate-900 text-slate-400">Select Captain B...</option>
                {availableForCaptainB.map(p => (
                  <option key={p._id} value={p._id} className="bg-slate-900">{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Date Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider flex items-center">
                <Calendar className="w-4 h-4 mr-2" /> Date & Time
              </label>
              <input 
                type="datetime-local" 
                value={matchDoc.date} 
                onChange={(e) => setMatchDoc({...matchDoc, date: e.target.value})} 
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:outline-none focus:border-yellow-500" 
                style={{ colorScheme: 'dark' }} 
                required
              />
            </div>
            
            {/* Venue Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider flex items-center">
                <MapPin className="w-4 h-4 mr-2" /> Venue
              </label>
              <input 
                type="text" 
                value={matchDoc.venue} 
                onChange={(e) => setMatchDoc({...matchDoc, venue: e.target.value})} 
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:outline-none focus:border-yellow-500" 
                placeholder="e.g., Pune Turf Club"
                required
              />
            </div>
          </div>

          <button 
            type="button" 
            onClick={handleCreateMatch}
            disabled={isSaving || isLoading}
            className={`w-full font-black py-4 rounded-xl shadow-lg uppercase tracking-widest mt-6 flex justify-center items-center transition-transform
              ${isSaving ? 'bg-yellow-600 text-slate-300 cursor-not-allowed' : 'bg-yellow-500 text-slate-900 hover:bg-yellow-400 active:scale-95'}`}
          >
            {isSaving ? (
              <>Saving to DB...</>
            ) : (
              <><CheckCircle2 className="w-5 h-5 mr-2" /> Schedule Match</>
            )}
          </button>

        </form>
      </div>
    </div>
  );
}