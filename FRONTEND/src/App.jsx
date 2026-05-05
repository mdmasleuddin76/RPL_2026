import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Import your page components
import Home from './pages/Home';
import MatchPage from './pages/Match';
import Stats from './pages/Stats';
import AdminPanel from './pages/AdminPanel';
import Login from './pages/Login'; // Make sure to create this file!

// ========================================================
// SECURITY: PROTECTED ROUTE WRAPPER
// ========================================================
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('adminToken');
  
  if (!token) {
    // Kick them to the login page if they don't have a valid token
    return <Navigate to="/login" replace />;
  }

  // If they have the token, let them into the admin panel
  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* =========================================
            PUBLIC ROUTES (Anyone can access)
        ========================================= */}
        <Route path="/" element={<Home />} />
        <Route path="/match/:matchId" element={<MatchPage />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/login" element={<Login />} /> 
        
        {/* =========================================
            SECURE ADMIN ROUTE (Requires Login)
        ========================================= */}
        {/* We wrap your existing AdminPanel component inside the security wrapper */}
        <Route 
          path="/admin/*" 
          element={
            <ProtectedRoute>
              <AdminPanel />
            </ProtectedRoute>
          } 
        />

        {/* =========================================
            404 CATCH-ALL ROUTE
        ========================================= */}
        <Route 
          path="*" 
          element={
            <div className="min-h-screen flex items-center justify-center bg-slate-950 text-yellow-500 font-bold text-2xl text-center px-4">
              404 - Delivery outside the off-stump! Page not found.
            </div>
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;