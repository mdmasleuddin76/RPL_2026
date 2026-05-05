import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Save, User, UploadCloud } from 'lucide-react';
import adminAxios from '../utils/axiosConfig';

// Define your backend URL here

export default function AddPlayer() {
  const navigate = useNavigate();
  
  // ---------------------------------------------------------
  // COMPONENT STATE
  // ---------------------------------------------------------
  const [newPlayer, setNewPlayer] = useState({ 
    name: '', 
    role: 'Batsman',
    battingStyle: 'Right Hand Bat',
    bowlingStyle: 'Right Arm Fast'
  });
  
  const [imagePreview, setImagePreview] = useState(null);
  // NEW: We need a state to hold the actual file object!
  const [selectedFile, setSelectedFile] = useState(null); 
  const [isSaving, setIsSaving] = useState(false);

  // ---------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // 1. Save the actual file object for the API request
      setSelectedFile(file); 

      // 2. Create the preview for the UI
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddPlayer = async (e) => {
    e.preventDefault();
    if (!newPlayer.name) return alert('Player Name is required!');
    
    setIsSaving(true); 

    // NEW: Create a FormData object instead of standard JSON
    const formData = new FormData();
    formData.append('name', newPlayer.name);
    formData.append('role', newPlayer.role);
    formData.append('battingStyle', newPlayer.battingStyle);
    formData.append('bowlingStyle', newPlayer.bowlingStyle);

    // If the user selected an image, append it! The key MUST match your backend ('image')
    if (selectedFile) {
      formData.append('image', selectedFile);
    }

    try {
      // Send the request. Axios will automatically detect FormData 
      // and set the header to 'multipart/form-data'
      const response = await adminAxios.post('/add-player', formData);

      console.log("✅ Successfully saved to DB:", response.data);

      // Clean up & Redirect on Success
      setIsSaving(false);
      setNewPlayer({ name: '', role: 'Batsman', battingStyle: 'Right Hand Bat', bowlingStyle: 'Right Arm Fast' });
      setImagePreview(null);
      setSelectedFile(null); // Clear the file state
      
      alert(`${newPlayer.name} successfully added to database!`);
      navigate('/admin'); 

    } catch (error) {
      console.error("❌ Failed to save player:", error);
      
      const errorMessage = error.response?.data?.error || error.response?.data?.message || "Error saving player to the database.";
      alert(errorMessage);
      
      setIsSaving(false); 
    }
  };

  // ---------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------
  return (
    <div className="max-w-2xl mx-auto bg-slate-900 p-6 md:p-8 rounded-2xl border border-slate-800 animate-fadeIn shadow-2xl">
      <div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
        <h2 className="text-xl md:text-2xl font-black text-white flex items-center">
          <User className="w-6 h-6 mr-2 text-yellow-500" /> Add Tournament Player
        </h2>
        <button onClick={() => navigate('/admin')} className="text-slate-400 hover:text-white transition bg-slate-800 p-2 rounded-full">
          <X className="w-5 h-5"/>
        </button>
      </div>

      <form onSubmit={handleAddPlayer} className="space-y-6">
        
        {/* Name & Role Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Player Name *</label>
            <input 
              type="text" 
              value={newPlayer.name} 
              onChange={(e) => setNewPlayer({...newPlayer, name: e.target.value})} 
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500 transition" 
              placeholder="e.g., Nasir" 
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Base Role</label>
            <select 
              value={newPlayer.role} 
              onChange={(e) => setNewPlayer({...newPlayer, role: e.target.value})} 
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500 transition"
            >
              <option>Batsman</option>
              <option>Bowler</option>
              <option>All-Rounder</option>
              <option>Wicketkeeper</option>
            </select>
          </div>
        </div>

        {/* Batting & Bowling Styles Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Batting Style</label>
            <select 
              value={newPlayer.battingStyle} 
              onChange={(e) => setNewPlayer({...newPlayer, battingStyle: e.target.value})} 
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-yellow-500 focus:outline-none transition"
            >
              <option>Right Hand Bat</option>
              <option>Left Hand Bat</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Bowling Style</label>
            <select 
              value={newPlayer.bowlingStyle} 
              onChange={(e) => setNewPlayer({...newPlayer, bowlingStyle: e.target.value})} 
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-yellow-500 focus:outline-none transition"
            >
              <option>Right Arm Fast</option>
              <option>Right Arm Medium</option>
              <option>Right Arm Off Spin</option>
              <option>Right Arm Leg Spin</option>
              <option>Left Arm Fast</option>
              <option>Left Arm Orthodox</option>
              <option>Left Arm Chinaman</option>
              <option>None</option>
            </select>
          </div>
        </div>

        {/* File Upload Section */}
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Player Photo</label>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-slate-950 border-2 border-slate-800 overflow-hidden flex items-center justify-center shrink-0 shadow-lg">
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-slate-700" />
              )}
            </div>
            <div className="flex-1">
              <label className="cursor-pointer bg-slate-950 border-2 border-dashed border-slate-700 hover:border-yellow-500 hover:bg-slate-900 transition flex items-center justify-center px-4 py-3 rounded-xl text-sm font-medium text-slate-300 w-full group">
                <UploadCloud className="w-5 h-5 mr-2 text-slate-500 group-hover:text-yellow-500 transition" />
                {imagePreview ? 'Change Photo' : 'Upload Image (Phone/PC)'}
                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              </label>
              <p className="text-[10px] text-slate-500 mt-1.5 ml-1 font-medium">Leave empty to auto-generate an avatar.</p>
            </div>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={isSaving}
          className={`w-full font-black p-4 rounded-xl shadow-lg transition transform uppercase tracking-widest text-sm flex justify-center items-center
            ${isSaving ? 'bg-yellow-600 text-slate-300 cursor-not-allowed' : 'bg-yellow-500 text-slate-900 hover:bg-yellow-400 active:scale-95'}`}
        >
          {isSaving ? 'Saving to DB...' : <><Save className="w-5 h-5 mr-2" /> Save to Database</>}
        </button>
      </form>
    </div>
  );
}