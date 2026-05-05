import Match from '../models/Match.js';
import Scorecard from '../models/Scorecard.js';
import BallEvent from '../models/BallEvent.js';
import Player from '../models/Player.js';
import { updateScorecardCache } from '../services/cacheService.js';
import redisClient from '../utils/redis.js';

// =========================================================
// 1. GET ALL MATCHES (For Home Page)
// =========================================================
export const getUserMatches = async (req, res) => {
  try {
    const matches = await Match.find()
      .populate('captains.teamA_id', 'name')
      .populate('captains.teamB_id', 'name')
      .sort({ date: -1 }); // Newest first

    res.status(200).json(matches);
  } catch (error) {
    console.error("Error fetching user matches:", error);
    res.status(500).json({ message: "Server error fetching matches" });
  }
};

// =========================================================
// 2. GET COMPLETE SCORECARD (For Match Page)
// =========================================================
export const getCompleteScorecard = async (req, res) => {
  try {
    const { match_id } = req.params;

    // 1. FAST PATH: Check Redis Cache First
    try {
      if (redisClient.isOpen) {
        const cachedData = await redisClient.get(`scorecard:${match_id}`);
        if (cachedData) {
          return res.status(200).json(JSON.parse(cachedData)); // Lightning fast response
        }
      }
    } catch (err) {
      console.error("Redis Get Error:", err);
    }

    // 2. CACHE MISS: Build it, Cache it, Return it
    const formattedScorecards = await updateScorecardCache(match_id);
    
    if (!formattedScorecards) {
      return res.status(404).json({ message: "Scorecards not found" });
    }

    res.status(200).json(formattedScorecards);
  } catch (error) {
    console.error("Error fetching complete scorecard:", error);
    res.status(500).json({ message: "Server error fetching scorecard" });
  }
};

// =========================================================
// 3. GET OVERS HISTORY (For Overs Tab)
// =========================================================
export const getOversHistory = async (req, res) => {
    try {
      const { match_id } = req.params;
  
      // 1. Fetch all balls for this match, sorted by newest first
      const allBalls = await BallEvent.find({ match_id })
        .sort({ inningsNumber: -1, overNumber: -1, ballNumberInOver: 1 })
        .populate('bowler_id', 'name');
  
      // 2. Group the balls by over using a Map
      const oversMap = {};
  
      allBalls.forEach(ball => {
        // Create a unique key for each over
        const key = `${ball.inningsNumber}-${ball.overNumber}`;
  
        if (!oversMap[key]) {
          oversMap[key] = {
            "innings": ball.inningsNumber,             // <-- ADDED: Track innings
            "over number": ball.overNumber + 1,       // <-- ADDED: +1 to start overs at 1 instead of 0
            "bowler name": ball.bowler_id?.name || "Unknown Bowler",
            "overstimeline": []
          };
        }
  
        // Generate the timeline string (e.g., 'W', '1WD', '4')
        let timelineStr = ball.runsFromBat.toString();
        if (ball.extras && ball.extras.type) {
          timelineStr = `${ball.runsFromBat > 0 && ['WD', 'NB'].includes(ball.extras.type) ? ball.runsFromBat : ''}${ball.extras.type}`;
        }
        if (ball.isWicket) timelineStr = 'W';
  
        oversMap[key].overstimeline.push(timelineStr);
      });
  
      // Convert map back to an array
      const oversArray = Object.values(oversMap);
  
      res.status(200).json({ overs: oversArray });
    } catch (error) {
      console.error("Error fetching overs history:", error);
      res.status(500).json({ message: "Server error fetching overs history" });
    }
  };

// =========================================================
// 4. GET TOURNAMENT STATS (Cricbuzz Style Leaderboards)
// =========================================================
export const getTournamentStats = async (req, res) => {
  try {
    // Fetch players who have played at least 1 match
    const players = await Player.find({ 'tournamentStats.matchesPlayed': { $gt: 0 } });

    // Helper to safely convert "Overs.Balls" string to total balls
    const oversToBalls = (overStr) => {
      const parts = String(overStr || "0.0").split('.');
      return (parseInt(parts[0]) || 0) * 6 + (parseInt(parts[1]) || 0);
    };

    // Calculate all derived stats and format keys cleanly
    const enrichedPlayers = players.map(p => {
      const stats = p.tournamentStats;
      
      const strikeRate = stats.ballsFaced > 0 ? ((stats.runsScored / stats.ballsFaced) * 100).toFixed(2) : "0.00";
      
      const totalBalls = oversToBalls(stats.oversBowled);
      const economy = totalBalls > 0 ? ((stats.runsConceded / totalBalls) * 6).toFixed(2) : "0.00";
      
      const bowlingAvg = stats.wicketsTaken > 0 ? (stats.runsConceded / stats.wicketsTaken).toFixed(2) : "999.00";

      return {
        id: p._id,
        name: p.name,
        m: stats.matchesPlayed,
        
        // Batting
        runs: stats.runsScored || 0,
        balls: stats.ballsFaced || 0,
        hs: stats.highestScore || 0,
        sr: parseFloat(strikeRate),
        fours: stats.fours || 0,
        sixes: stats.sixes || 0,
        
        // Bowling
        w: stats.wicketsTaken || 0,
        o: stats.oversBowled || "0.0",
        totalBallsBowled: totalBalls, // Added this to easily check minimum overs
        rc: stats.runsConceded || 0,
        econ: parseFloat(economy),
        avg: parseFloat(bowlingAvg),

        // Fielding (NEW ADDITION)
        catches: stats.catches || 0
      };
    });

    const getTop = (arr, key, order = 'desc') => {
      return [...arr]
        .sort((a, b) => order === 'desc' ? b[key] - a[key] : a[key] - b[key])
        .slice(0, 10); // Top 10 players
    };

    // --- UPDATED FILTERS ---
    const battersWithRuns = enrichedPlayers.filter(p => p.runs > 0);
    
    // For Average: You MUST have taken at least 1 wicket (otherwise Math divides by 0)
    const validAverageBowlers = enrichedPlayers.filter(p => p.w > 0); 
    
    // For Economy: You just need to have bowled at least 1 full over (6 balls)
    const validEconomyBowlers = enrichedPlayers.filter(p => p.totalBallsBowled >= 6); 

    const statsResponse = {
      mostRuns: getTop(enrichedPlayers, 'runs'),
      highestScore: getTop(enrichedPlayers, 'hs'),
      
      // Changed from >= 10 balls to > 0 balls so your test data shows up!
      bestStrikeRate: getTop(battersWithRuns.filter(p => p.balls > 5), 'sr'), 
      
      most4s: getTop(enrichedPlayers, 'fours'),
      most6s: getTop(enrichedPlayers, 'sixes'),
      mostWickets: getTop(enrichedPlayers, 'w'),
      
      // Best Average still needs a wicket, but Best Economy now just needs 1 over bowled
      bestBowlingAverage: getTop(validAverageBowlers, 'avg', 'asc'), 
      bestEconomy: getTop(validEconomyBowlers, 'econ', 'asc'),
      
      // Most Catches (NEW ADDITION)
      mostCatches: getTop(enrichedPlayers, 'catches')
    };

    res.status(200).json(statsResponse);
  } catch (error) {
    console.error("Error fetching tournament stats:", error);
    res.status(500).json({ message: "Server error fetching tournament stats" });
  }
};