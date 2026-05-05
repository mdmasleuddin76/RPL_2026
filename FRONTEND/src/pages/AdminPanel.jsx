import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from '../components/Header';

// Import our sub-pages
import AdminDashboard from '../components/AdminDashboard';
import AddPlayer from '../components/AddPlayer';
import DraftSetup from '../components/DraftSetup';
import LiveScoring from './LiveScoring';

export default function AdminPanel() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-yellow-500">
      <Header />
      
      <main className="max-w-7xl mx-auto pt-8 pb-20 px-4">
        {/* NESTED ROUTES: Clean routing with no prop passing */}
        <Routes>
          <Route path="/" element={<AdminDashboard />} />
          <Route path="/add-player" element={<AddPlayer />} />
          <Route path="/draft" element={<DraftSetup />} />
          <Route path="/live" element={<LiveScoring />} />
        </Routes>
      </main>
    </div>
  );
}