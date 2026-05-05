import Match from '../models/Match.js';
import Scorecard from '../models/Scorecard.js';
import Player from '../models/Player.js';
import { updateScorecardCache } from '../services/cacheService.js';

// ---------------------------------------------------------
// 1. GET ALL MATCHES
// ---------------------------------------------------------
export const getMatches = async (req, res) => {
  try {
    const matches = await Match.find()
      .populate('captains.teamA_id', 'name')
      .populate('captains.teamB_id', 'name')
      .sort({ date: -1 });
    res.status(200).json(matches);
  } catch (error) {
    console.error("Error fetching matches:", error);
    res.status(500).json({ message: "Server error fetching matches" });
  }
};

// ---------------------------------------------------------
// 2. CREATE MATCH
// ---------------------------------------------------------
export const createMatch = async (req, res) => {
  try {
    const { teamAName, teamBName, date, venue, captains } = req.body;

    const newMatch = new Match({
      status: 'SCHEDULED',
      teamAName,
      teamBName,
      date,
      venue,
      captains,
      squadA_player_ids: [],
      squadB_player_ids: [],
      toss: null
    });

    const savedMatch = await newMatch.save();
    res.status(201).json(savedMatch);
  } catch (error) {
    console.error("Error creating match:", error);
    res.status(500).json({ message: "Server error creating match" });
  }
};

// ---------------------------------------------------------
// 3. START MATCH (Creates Innings 1 Scorecard)
// ---------------------------------------------------------
// ---------------------------------------------------------
// 3. START MATCH (Creates Innings 1 Scorecard)
// ---------------------------------------------------------
export const startMatch = async (req, res) => {
  try {
    const { 
      match_id, 
      squadA_player_ids, 
      squadB_player_ids, 
      toss, 
      striker_id, 
      nonStriker_id, 
      bowler_id 
    } = req.body;

    // 1. Update Match details
    const match = await Match.findById(match_id);
    if (!match) return res.status(404).json({ message: "Match not found" });

    match.status = 'LIVE';
    match.squadA_player_ids = squadA_player_ids;
    match.squadB_player_ids = squadB_player_ids;
    match.toss = toss;
    await match.save();

    // 2. Determine Captains and Squads based on toss
    const teamA_id = match.captains.teamA_id.toString();
    const teamB_id = match.captains.teamB_id.toString();
    const tossWinner = toss.wonBy_id.toString();
    
    let battingCaptain_id;
    let bowlingCaptain_id;
    let battingSquadIds = [];
    let bowlingSquadIds = []; // <-- NEW: Track the bowling squad

    if (toss.decision === 'BAT') {
      battingCaptain_id = tossWinner;
      bowlingCaptain_id = tossWinner === teamA_id ? teamB_id : teamA_id;
      battingSquadIds = tossWinner === teamA_id ? squadA_player_ids : squadB_player_ids;
      bowlingSquadIds = tossWinner === teamA_id ? squadB_player_ids : squadA_player_ids; // NEW
    } else {
      battingCaptain_id = tossWinner === teamA_id ? teamB_id : teamA_id;
      bowlingCaptain_id = tossWinner;
      battingSquadIds = tossWinner === teamA_id ? squadB_player_ids : squadA_player_ids;
      bowlingSquadIds = tossWinner === teamA_id ? squadA_player_ids : squadB_player_ids; // NEW
    }

    // 3. EAGER LOAD: Pre-fill the Batting Array
    const fullBattingArray = battingSquadIds.map(id => {
      const isOpener = (id.toString() === striker_id.toString() || id.toString() === nonStriker_id.toString());
      return {
        batter_id: id,
        status: isOpener ? 'BATTING' : 'YET_TO_BAT',
        runs: 0, ballsFaced: 0, fours: 0, sixes: 0
      };
    });

    // 4. EAGER LOAD: Pre-fill the Bowling Array
    const fullBowlingArray = bowlingSquadIds.map(id => {
      return {
        bowler_id: id,
        overs: '0.0',
        maidens: 0,
        runsConceded: 0,
        wickets: 0
      };
    });

    // 5. Create Innings 1 Scorecard
    const initialScorecard = new Scorecard({
      match_id,
      inningsNumber: 1,
      battingCaptain_id,
      bowlingCaptain_id,
      activePlayers: {
        striker_id,
        nonStriker_id,
        bowler_id
      },
      batting: fullBattingArray, 
      bowling: fullBowlingArray // <-- Inject the full 11-man bowling lineup
    });

    const savedScorecard = await initialScorecard.save();
    updateScorecardCache(match_id).catch(console.error); // PUSH TO REDIS
    res.status(200).json(savedScorecard);
  } catch (error) {
    console.error("Error starting match:", error);
    res.status(500).json({ message: "Server error starting match" });
  }
};

// ---------------------------------------------------------
// 4. END INNINGS (Creates Innings 2 Scorecard)
// ---------------------------------------------------------
// ---------------------------------------------------------
// 4. END INNINGS (Creates Innings 2 Scorecard)
// ---------------------------------------------------------
export const endInning = async (req, res) => {
  try {
    const { match_id } = req.body;

    // 1. Fetch Innings 1 Scorecard to calculate target
    const innings1 = await Scorecard.findOne({ match_id, inningsNumber: 1 });
    if (!innings1) return res.status(404).json({ message: "Innings 1 not found" });

    const targetScore = innings1.score + 1;

    // 2. Update Match Status
    const match = await Match.findByIdAndUpdate(
      match_id, 
      { status: 'INNINGS_BREAK' },
      { new: true }
    );

    // 3. Determine Squads for Innings 2
    const teamA_id = match.captains.teamA_id.toString();
    const teamB_id = match.captains.teamB_id.toString();

    // If Team A was the batting captain in Innings 1, then Team B bats in Innings 2
    const isTeamABattingNow = innings1.battingCaptain_id.toString() !== teamA_id;

    const newBattingCaptain_id = isTeamABattingNow ? teamA_id : teamB_id;
    const newBowlingCaptain_id = isTeamABattingNow ? teamB_id : teamA_id;

    // Swap the squads
    const battingSquadIds = isTeamABattingNow ? match.squadA_player_ids : match.squadB_player_ids;
    const bowlingSquadIds = isTeamABattingNow ? match.squadB_player_ids : match.squadA_player_ids;

    // 4. EAGER LOAD: Pre-fill Batting Array (All set to YET_TO_BAT)
    const fullBattingArray = battingSquadIds.map(id => ({
      batter_id: id,
      status: 'YET_TO_BAT',
      runs: 0, 
      ballsFaced: 0, 
      fours: 0, 
      sixes: 0
    }));

    // 5. EAGER LOAD: Pre-fill Bowling Array
    const fullBowlingArray = bowlingSquadIds.map(id => ({
      bowler_id: id,
      overs: '0.0', 
      maidens: 0, 
      runsConceded: 0, 
      wickets: 0
    }));

    // 6. Create Innings 2 Scorecard
    const innings2 = new Scorecard({
      match_id,
      inningsNumber: 2,
      battingCaptain_id: newBattingCaptain_id,
      bowlingCaptain_id: newBowlingCaptain_id,
      targetscore: targetScore,
      score: 0,
      wickets: 0,
      overs: 0,
      activePlayers: { striker_id: null, nonStriker_id: null, bowler_id: null },
      batting: fullBattingArray, // <-- Injected here
      bowling: fullBowlingArray  // <-- Injected here
    });

    const savedInnings2 = await innings2.save();
    updateScorecardCache(req.body.match_id).catch(console.error); // PUSH TO REDIS
    res.status(200).json(savedInnings2);
  } catch (error) {
    console.error("Error ending innings:", error);
    res.status(500).json({ message: "Server error ending innings" });
  }
};
// ---------------------------------------------------------
// 5. COMPLETE MATCH & UPDATE ALL LIFETIME STATS
// ---------------------------------------------------------
export const completeMatch = async (req, res) => {
  try {
    const { match_id, manOfTheMatch_id, winningCaptain_id } = req.body;

    // 1. Update Match Document
    await Match.findByIdAndUpdate(match_id, {
      status: 'COMPLETED',
      matchResult: winningCaptain_id,
      manOfTheMatch_id
    });

    // 2. Fetch both Scorecards for this match
    const scorecards = await Scorecard.find({ match_id });
    
    if (!scorecards || scorecards.length === 0) {
      return res.status(404).json({ message: "No scorecards found to aggregate stats." });
    }

    // 3. Object to accumulate stats per player_id
    const playerStatsMap = {};

    // Helper function to initialize a player in the map
    const initPlayer = (id) => {
      if (!playerStatsMap[id]) {
        playerStatsMap[id] = {
          matchesPlayed: 1, // Will increment by 1 for this match
          runsScored: 0,
          ballsFaced: 0,
          fours: 0,
          sixes: 0,
          wicketsTaken: 0,
          ballsBowled: 0, // We calculate balls instead of 'overs' string to do math safely
          runsConceded: 0,
          highestScore: 0
        };
      }
    };

    // Helper to convert over string (e.g. "3.2") to total balls (20)
    const oversToBalls = (overStr) => {
      const parts = overStr.toString().split('.');
      const completedOvers = parseInt(parts[0]) || 0;
      const extraBalls = parseInt(parts[1]) || 0;
      return (completedOvers * 6) + extraBalls;
    };

    // 4. Aggregate data from scorecards
    for (const sc of scorecards) {
      // Tally Batting Stats
      for (const batter of sc.batting) {
        if (!batter.batter_id) continue;
        const pId = batter.batter_id.toString();
        initPlayer(pId);
        
        playerStatsMap[pId].runsScored += batter.runs;
        playerStatsMap[pId].ballsFaced += batter.ballsFaced;
        playerStatsMap[pId].fours += batter.fours;
        playerStatsMap[pId].sixes += batter.sixes;
        
        if (batter.runs > playerStatsMap[pId].highestScore) {
          playerStatsMap[pId].highestScore = batter.runs;
        }
      }

      // Tally Bowling Stats
      for (const bowler of sc.bowling) {
        if (!bowler.bowler_id) continue;
        const pId = bowler.bowler_id.toString();
        initPlayer(pId);

        playerStatsMap[pId].runsConceded += bowler.runsConceded;
        playerStatsMap[pId].wicketsTaken += bowler.wickets;
        playerStatsMap[pId].ballsBowled += oversToBalls(bowler.overs);
      }
    }

    // 5. Bulk Update Players in the Database
    const updatePromises = Object.keys(playerStatsMap).map(async (playerId) => {
      const stats = playerStatsMap[playerId];
      const player = await Player.findById(playerId);
      
      if (player) {
        // Update basic accumulation
        player.tournamentStats.matchesPlayed += 1;
        player.tournamentStats.runsScored += stats.runsScored;
        player.tournamentStats.ballsFaced += stats.ballsFaced;
        player.tournamentStats.fours += stats.fours;
        player.tournamentStats.sixes += stats.sixes;
        player.tournamentStats.wicketsTaken += stats.wicketsTaken;
        player.tournamentStats.runsConceded += stats.runsConceded;

        // Update Highest Score safely
        if (stats.highestScore > player.tournamentStats.highestScore) {
          player.tournamentStats.highestScore = stats.highestScore;
        }

        // Add new balls bowled to historic balls, then convert back to "Overs.Balls" string/float
        const historicBallsBowled = oversToBalls(player.tournamentStats.oversBowled || "0.0");
        const totalBalls = historicBallsBowled + stats.ballsBowled;
        
        const calcOvers = Math.floor(totalBalls / 6);
        const calcRemainingBalls = totalBalls % 6;
        player.tournamentStats.oversBowled = parseFloat(`${calcOvers}.${calcRemainingBalls}`);

        await player.save();
      }
    });

    await Promise.all(updatePromises);

    res.status(200).json({ message: "Match completed and all player stats updated successfully." });
  } catch (error) {
    console.error("Error completing match:", error);
    res.status(500).json({ message: "Server error completing match" });
  }
};

// ---------------------------------------------------------
// 4.5 START SECOND INNINGS (Updates Match to LIVE)
// ---------------------------------------------------------
export const startSecondInning = async (req, res) => {
  try {
    const { match_id, striker_id, nonStriker_id, bowler_id } = req.body;

    // 1. Update Match Status back to LIVE
    await Match.findByIdAndUpdate(match_id, { status: 'LIVE' });

    // 2. Find Innings 2 Scorecard and set the openers
    const scorecard = await Scorecard.findOne({ match_id, inningsNumber: 2 });
    if (!scorecard) return res.status(404).json({ message: "Innings 2 Scorecard not found" });

    scorecard.activePlayers = { striker_id, nonStriker_id, bowler_id };

    // 3. Mark the chosen openers as 'BATTING'
    scorecard.batting.forEach(b => {
      if (b.batter_id.toString() === striker_id.toString() || b.batter_id.toString() === nonStriker_id.toString()) {
        b.status = 'BATTING';
      }
    });

    const savedScorecard = await scorecard.save();
    updateScorecardCache(req.body.match_id).catch(console.error); // PUSH TO REDIS
    res.status(200).json(savedScorecard);
  } catch (error) {
    console.error("Error starting second inning:", error);
    res.status(500).json({ message: "Server error starting second inning" });
  }
};