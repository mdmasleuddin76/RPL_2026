import BallEvent from '../models/BallEvent.js';
import Scorecard from '../models/Scorecard.js';
import { updateScorecardCache } from '../services/cacheService.js';

// =========================================================
// HELPER: RECALCULATE SCORECARD FROM ALL BALLS
// =========================================================
const recalculateScorecard = async (match_id, inningsNumber) => {
  const scorecard = await Scorecard.findOne({ match_id, inningsNumber });
  if (!scorecard) throw new Error("Scorecard not found");

  const allBalls = await BallEvent.find({ match_id, inningsNumber }).sort({ overNumber: 1, ballNumberInOver: 1, timestamp: 1 });

  // 1. Reset Scorecard Aggregates
  scorecard.score = 0;
  scorecard.wickets = 0;
  scorecard.extras = { total: 0, wides: 0, noBalls: 0, legByes: 0, byes: 0 };
  scorecard.currentOverTimeline = [];
  
  let totalLegalBalls = 0;
  
  // Reset all player stats (Set everyone to YET_TO_BAT so incoming batters are cleared properly on undo)
  scorecard.batting.forEach(b => {
    b.runs = 0; b.ballsFaced = 0; b.fours = 0; b.sixes = 0; b.dismissalText = '';
    b.status = 'YET_TO_BAT'; 
  });
  
  scorecard.bowling.forEach(b => {
    b.overs = '0.0'; b.maidens = 0; b.runsConceded = 0; b.wickets = 0;
    b._legalBalls = 0; 
  });

  // 2. Playback Every Ball to rebuild stats
  for (const ball of allBalls) {
    const isLegalBall = !['WD', 'NB'].includes(ball.extras?.type);
    
    let teamRunsThisBall = ball.runsFromBat;
    if (ball.extras && ball.extras.type) {
      if (ball.extras.type === 'WD' || ball.extras.type === 'NB') teamRunsThisBall += 1; 
      teamRunsThisBall += ball.extras.runs; 
    }
    scorecard.score += teamRunsThisBall;

    let timelineStr = ball.runsFromBat.toString();
    if (ball.extras && ball.extras.type) timelineStr = `${ball.runsFromBat > 0 && ['WD', 'NB'].includes(ball.extras.type) ? ball.runsFromBat : ''}${ball.extras.type}`;
    if (ball.isWicket) timelineStr = 'W';

    const ballsInCurrentOver = totalLegalBalls % 6;
    if (ballsInCurrentOver === 0 && isLegalBall) {
      scorecard.currentOverTimeline = []; 
    }
    scorecard.currentOverTimeline.push(timelineStr);

    if (isLegalBall) totalLegalBalls += 1;
    if (ball.isWicket) scorecard.wickets += 1;

    // --- Update Batter Stats ---
    const batter = scorecard.batting.find(b => b.batter_id.toString() === ball.batter_id.toString());
    if (batter) {
      if (!['WD'].includes(ball.extras?.type)) batter.ballsFaced += 1;
      
      if (!['WD', 'LB', 'B'].includes(ball.extras?.type)) {
        batter.runs += ball.runsFromBat;
        if (ball.runsFromBat === 4) batter.fours += 1;
        if (ball.runsFromBat === 6) batter.sixes += 1;
      }
      if(['NB'].includes(ball.extras?.type)) {
        batter.runs += ball.extras.runs; 
        if(ball.extras.runs === 4) batter.fours += 1;
        if(ball.extras.runs === 6) batter.sixes += 1;
      }
      if (ball.isWicket && ball.wicketDetails.batter_id.toString() === batter.batter_id.toString()) {
        batter.status = 'OUT';
        batter.dismissalText = ball.wicketDetails.type;
      }
      if (batter.ballsFaced > 0) batter.strikeRate = ((batter.runs / batter.ballsFaced) * 100).toFixed(2);
    }

    // --- Update Bowler Stats ---
    const bowler = scorecard.bowling.find(b => b.bowler_id.toString() === ball.bowler_id.toString());
    if (bowler) {
      if (isLegalBall) bowler._legalBalls += 1;
      if (!['LB', 'B'].includes(ball.extras?.type)) bowler.runsConceded += teamRunsThisBall;
      if (ball.isWicket && ['BOWLED', 'CAUGHT', 'LBW', 'STUMPED'].includes(ball.wicketDetails?.type)) bowler.wickets += 1;

      const oversCompleted = Math.floor(bowler._legalBalls / 6);
      const ballsRemaining = bowler._legalBalls % 6;
      bowler.overs = `${oversCompleted}.${ballsRemaining}`;
      if (bowler._legalBalls > 0) bowler.economyRate = ((bowler.runsConceded / bowler._legalBalls) * 6).toFixed(2);
    }
  }

  // 3. Finalize Match Level Stats
  const teamOversCompleted = Math.floor(totalLegalBalls / 6);
  const teamBallsRemaining = totalLegalBalls % 6;
  scorecard.overs = parseFloat(`${teamOversCompleted}.${teamBallsRemaining}`);
  if (totalLegalBalls > 0) scorecard.runRate = ((scorecard.score / totalLegalBalls) * 6).toFixed(2);

  scorecard.bowling.forEach(b => delete b._legalBalls);

  // 4. Force Active Players to 'BATTING' status
  // This guarantees that the two players on the pitch are properly marked, even if one hasn't faced a ball yet.
  const activeStrikerId = scorecard.activePlayers.striker_id?.toString();
  const activeNonStrikerId = scorecard.activePlayers.nonStriker_id?.toString();

  scorecard.batting.forEach(b => {
    if ((b.batter_id.toString() === activeStrikerId || b.batter_id.toString() === activeNonStrikerId) && b.status !== 'OUT') {
      b.status = 'BATTING';
    }
  });

  return await scorecard.save();
};

// =========================================================
// API: 1. RECORD A BALL (INCREMENTAL UPDATE)
// =========================================================
export const recordBall = async (req, res) => {
  try {
    const newBall = new BallEvent(req.body);
    await newBall.save();

    const scorecard = await Scorecard.findOne({ match_id: req.body.match_id, inningsNumber: req.body.inningsNumber });
    if (!scorecard) return res.status(404).json({ message: "Scorecard not found" });

    const isLegalBall = !['WD', 'NB'].includes(req.body.extras?.type);
    let teamRunsThisBall = req.body.runsFromBat || 0;
    if (req.body.extras && req.body.extras.type) {
      if (['WD', 'NB'].includes(req.body.extras.type)) teamRunsThisBall += 1; 
      teamRunsThisBall += (req.body.extras.runs || 0); 
    }

    scorecard.score += teamRunsThisBall;
    if (req.body.isWicket) scorecard.wickets += 1;

    if (req.body.extras && req.body.extras.type) {
      scorecard.extras.total += (req.body.extras.runs || 0) + (['WD', 'NB'].includes(req.body.extras.type) ? 1 : 0);
      if (req.body.extras.type === 'WD') scorecard.extras.wides += (req.body.extras.runs || 0) + 1;
      if (req.body.extras.type === 'NB') scorecard.extras.noBalls += 1;
      if (req.body.extras.type === 'LB') scorecard.extras.legByes += req.body.extras.runs;
      if (req.body.extras.type === 'B') scorecard.extras.byes += req.body.extras.runs;
    }

    let currentOvers = Math.floor(scorecard.overs);
    let currentBalls = Math.round((scorecard.overs % 1) * 10);

    if (currentBalls === 0 && isLegalBall) {
      scorecard.currentOverTimeline = [];
    }

    let timelineStr = req.body.runsFromBat.toString();
    if (req.body.extras?.type) timelineStr = `${req.body.runsFromBat > 0 && ['WD', 'NB'].includes(req.body.extras.type) ? req.body.runsFromBat : ''}${req.body.extras.type}`;
    if (req.body.isWicket) timelineStr = 'W';
    scorecard.currentOverTimeline.push(timelineStr);

    if (isLegalBall) {
      currentBalls += 1;
      if (currentBalls === 6) { currentOvers += 1; currentBalls = 0; }
    }
    
    scorecard.overs = parseFloat(`${currentOvers}.${currentBalls}`);
    const totalLegalBalls = (currentOvers * 6) + currentBalls;
    if (totalLegalBalls > 0) scorecard.runRate = ((scorecard.score / totalLegalBalls) * 6).toFixed(2);

    const batter = scorecard.batting.find(b => b.batter_id.toString() === req.body.batter_id.toString());
    if (batter) {
      if (!['WD'].includes(req.body.extras?.type)) batter.ballsFaced += 1;
      if (!['WD', 'LB', 'B'].includes(req.body.extras?.type)) {
        batter.runs += req.body.runsFromBat;
        if (req.body.runsFromBat === 4) batter.fours += 1;
        if (req.body.runsFromBat === 6) batter.sixes += 1;
      }
      if(['NB'].includes(req.body.extras?.type)) {
        batter.runs += req.body.extras.runs; 
        if(req.body.extras.runs === 4) batter.fours += 1;
        if(req.body.extras.runs === 6) batter.sixes += 1;
      }
      if (req.body.isWicket && req.body.wicketDetails?.batter_id?.toString() === batter.batter_id.toString()) {
        batter.status = 'OUT';
        batter.dismissalText = req.body.wicketDetails.type;
      }
      if (batter.ballsFaced > 0) batter.strikeRate = ((batter.runs / batter.ballsFaced) * 100).toFixed(2);
    }

    const bowler = scorecard.bowling.find(b => b.bowler_id.toString() === req.body.bowler_id.toString());
    if (bowler) {
      let bOvers = Math.floor(parseFloat(bowler.overs || 0));
      let bBalls = Math.round((parseFloat(bowler.overs || 0) % 1) * 10);
      
      if (isLegalBall) {
        bBalls += 1;
        if (bBalls === 6) { bOvers += 1; bBalls = 0; }
      }
      bowler.overs = `${bOvers}.${bBalls}`;

      if (!['LB', 'B'].includes(req.body.extras?.type)) bowler.runsConceded += teamRunsThisBall;
      if (req.body.isWicket && ['BOWLED', 'CAUGHT', 'LBW', 'STUMPED'].includes(req.body.wicketDetails?.type)) bowler.wickets += 1;
      
      const bTotalBalls = (bOvers * 6) + bBalls;
      if (bTotalBalls > 0) bowler.economyRate = ((bowler.runsConceded / bTotalBalls) * 6).toFixed(2);
    }

    let runsForRotation = req.body.runsFromBat;
    if (['B', 'LB','WD','NB'].includes(req.body.extras?.type)) runsForRotation = req.body.extras.runs;
    
    const shouldSwapFromRuns = (runsForRotation % 2 !== 0);
    const overEnded = (currentBalls === 0 && isLegalBall);

    if (shouldSwapFromRuns !== overEnded) {
      const temp = scorecard.activePlayers.striker_id;
      scorecard.activePlayers.striker_id = scorecard.activePlayers.nonStriker_id;
      scorecard.activePlayers.nonStriker_id = temp;
    }
    await scorecard.save();
    updateScorecardCache(req.body.match_id).catch(console.error); // PUSH TO REDIS
    res.status(200).json(scorecard);
  } catch (error) {
    console.error("Error recording ball:", error);
    res.status(500).json({ message: "Server error recording ball" });
  }
};

// =========================================================
// API: 2. UNDO LAST BALL (Rewinds Time)
// =========================================================
export const undoLastBall = async (req, res) => {
  try {
    const { match_id, inningsNumber } = req.body;

    const lastBall = await BallEvent.findOne({ match_id, inningsNumber }).sort({ timestamp: -1 });
    if (!lastBall) return res.status(404).json({ message: "No balls left to undo" });

    const scorecard = await Scorecard.findOne({ match_id, inningsNumber });

    // --- 1. REWIND THE BOWLER ---
    // If we undo a ball, the bowler who bowled it must be back on strike. 
    // This perfectly overrides any new bowler selected from the "End of Over" modal!
    scorecard.activePlayers.bowler_id = lastBall.bowler_id;

    // --- 2. REWIND THE BATTERS ---
    const currentStriker = scorecard.activePlayers.striker_id?.toString();
    const currentNonStriker = scorecard.activePlayers.nonStriker_id?.toString();
    const strikerWhoFacedBall = lastBall.batter_id.toString();

    if (lastBall.isWicket) {
        const dismissedBatter = lastBall.wicketDetails.batter_id.toString();
        
        // If a wicket fell, the UI swapped the dismissed batter for a NEW batter.
        // We need to overwrite the NEW batter with the DISMISSED batter, resurrecting them.
        if (strikerWhoFacedBall === dismissedBatter) {
            // The striker got out. The UI replaced the striker.
            scorecard.activePlayers.striker_id = dismissedBatter;
        } else {
            // The non-striker got out (e.g. run out).
            // The striker survived, so they should still be the striker.
            scorecard.activePlayers.striker_id = strikerWhoFacedBall;
            // Overwrite the non-striker slot with the resurrected batter.
            scorecard.activePlayers.nonStriker_id = dismissedBatter;
        }
    } else {
        // Normal ball. No one got out. 
        // We just need to make sure they are on the correct ends if they ran a 1 or 3.
        scorecard.activePlayers.striker_id = strikerWhoFacedBall;
        scorecard.activePlayers.nonStriker_id = (currentStriker === strikerWhoFacedBall) 
            ? currentNonStriker 
            : currentStriker;
    }

    // Save the completely restored player positions
    await scorecard.save();

    // --- 3. DELETE BALL & RECALCULATE STATS ---
    await BallEvent.findByIdAndDelete(lastBall._id);

    // This mathematically rebuilds the score, overs, and timeline without messing up the players we just fixed!
    const updatedScorecard = await recalculateScorecard(match_id, inningsNumber);
    updateScorecardCache(match_id).catch(console.error); // PUSH TO REDIS
    res.status(200).json(updatedScorecard);
  } catch (error) {
    console.error("Error undoing ball:", error);
    res.status(500).json({ message: "Server error undoing ball" });
  }
};