import Scorecard from '../models/Scorecard.js';
import BallEvent from '../models/BallEvent.js';
import Player from '../models/Player.js';
import { updateScorecardCache } from '../services/cacheService.js';

// ---------------------------------------------------------
// 1. GET ACTIVE SCORECARD
// ---------------------------------------------------------
export const getActiveScorecard = async (req, res) => {
  try {
    const { match_id } = req.params;

    // Find the scorecard with the highest inningsNumber for this match
    const scorecard = await Scorecard.findOne({ match_id }).sort({ inningsNumber: -1 });

    if (!scorecard) {
      return res.status(404).json({ message: "No active scorecard found for this match" });
    }

    res.status(200).json(scorecard);
  } catch (error) {
    console.error("Error fetching active scorecard:", error);
    res.status(500).json({ message: "Server error fetching scorecard" });
  }
};

// ---------------------------------------------------------
// 2. UPDATE SCORECARD (Lineup Changes, Swaps, Next Bowler)
// ---------------------------------------------------------
export const updateScorecard = async (req, res) => {
  try {
    const { match_id, inningsNumber, activePlayers } = req.body;

    let query = { match_id };
    if (inningsNumber) {
      query.inningsNumber = inningsNumber;
    }
    
    const scorecard = await Scorecard.findOne(query).sort({ inningsNumber: -1 });

    if (!scorecard) {
      return res.status(404).json({ message: "Scorecard not found" });
    }

    const previousBowlerId = scorecard.activePlayers?.bowler_id?.toString();
    
    // CAPTURE OLD BATTERS BEFORE WE OVERWRITE THEM
    const oldStrikerId = scorecard.activePlayers?.striker_id?.toString();
    const oldNonStrikerId = scorecard.activePlayers?.nonStriker_id?.toString();

    // 2. Update the activePlayers object
    if (activePlayers) {
      if (activePlayers.striker_id !== undefined) scorecard.activePlayers.striker_id = activePlayers.striker_id;
      if (activePlayers.nonStriker_id !== undefined) scorecard.activePlayers.nonStriker_id = activePlayers.nonStriker_id;
      if (activePlayers.bowler_id !== undefined) scorecard.activePlayers.bowler_id = activePlayers.bowler_id;

      if (previousBowlerId && previousBowlerId !== activePlayers.bowler_id.toString()) {
        scorecard.currentOverTimeline = [];
      }

      const newStrikerId = scorecard.activePlayers.striker_id?.toString();
      const newNonStrikerId = scorecard.activePlayers.nonStriker_id?.toString();

      // Helper function to safely update batter statuses
      const syncBatterStatus = (batter_id, targetStatus) => {
        if (!batter_id) return;
        const batter = scorecard.batting.find(b => b.batter_id && b.batter_id.toString() === batter_id.toString());
        
        // Never overwrite an 'OUT' status during a mistake fix
        if (batter && batter.status !== 'OUT') {
          batter.status = targetStatus;
        }
      };

      // 3. REVERT: If the old batters are no longer on the pitch, set them back to YET_TO_BAT
      if (oldStrikerId && oldStrikerId !== newStrikerId && oldStrikerId !== newNonStrikerId) {
        syncBatterStatus(oldStrikerId, 'YET_TO_BAT');
      }
      if (oldNonStrikerId && oldNonStrikerId !== newStrikerId && oldNonStrikerId !== newNonStrikerId) {
        syncBatterStatus(oldNonStrikerId, 'YET_TO_BAT');
      }

      // 4. ACTIVATE: Set the current pitch players to BATTING
      syncBatterStatus(newStrikerId, 'BATTING');
      syncBatterStatus(newNonStrikerId, 'BATTING');
    }

    const updatedScorecard = await scorecard.save();
    updateScorecardCache(match_id).catch(console.error); // PUSH TO REDIS
    res.status(200).json(updatedScorecard);
  } catch (error) {
    console.error("Error updating scorecard:", error);
    res.status(500).json({ message: "Server error updating scorecard" });
  }
};

export const applyRetroactiveCorrection = async (req, res) => {
  try {
    const { match_id, correctionType, wicketDetails } = req.body;

    // Fetch the active scorecard
    const scorecard = await Scorecard.findOne({ match_id }).sort({ inningsNumber: -1 });
    if (!scorecard) return res.status(404).json({ message: "Scorecard not found" });

    if (correctionType === 'WICKET') {
      // 1. Find the exact LAST ball bowled in this innings
      const lastBall = await BallEvent.findOne({ 
        match_id, 
        inningsNumber: scorecard.inningsNumber 
      }).sort({ _id: -1 }); // Sort by newest first

      if (!lastBall) {
        return res.status(400).json({ message: "No balls bowled yet to apply a wicket to." });
      }

      if (lastBall.isWicket) {
        return res.status(400).json({ message: "The last ball is already marked as a wicket." });
      }

      // 2. Update the BallEvent in the database
      lastBall.isWicket = true;
      lastBall.wicketDetails = {
        type: wicketDetails.type,
        batter_id: wicketDetails.dismissedBatter_id,
        fielder_id: wicketDetails.fielder_id || null
      };
      await lastBall.save();

      // 3. Apply the Wicket to the Team Scorecard
      scorecard.wickets += 1;

      // 4. Update the Dismissed Batter's stats
      const batterToDismiss = scorecard.batting.find(b => b.batter_id.toString() === wicketDetails.dismissedBatter_id.toString());
      if (batterToDismiss) {
        batterToDismiss.status = 'OUT';
        batterToDismiss.dismissalText = wicketDetails.type === 'RUN_OUT' ? 'run out' : 'stumped';
      }

      // 5. Update the Bowler's stats (CRUCIAL: Use lastBall.bowler_id, NOT the current active bowler)
      if (wicketDetails.type === 'STUMPED') {
        const actualBowler = scorecard.bowling.find(b => b.bowler_id.toString() === lastBall.bowler_id.toString());
        if (actualBowler) {
          actualBowler.wickets = (actualBowler.wickets || 0) + 1;
        }
      }

      // 6. Update Active Players (Bring in the new batter)
      if (scorecard.activePlayers.striker_id.toString() === wicketDetails.dismissedBatter_id.toString()) {
        scorecard.activePlayers.striker_id = wicketDetails.nextBatter_id;
      } else if (scorecard.activePlayers.nonStriker_id.toString() === wicketDetails.dismissedBatter_id.toString()) {
        scorecard.activePlayers.nonStriker_id = wicketDetails.nextBatter_id;
      }

      // Ensure the incoming batter's status is officially set to BATTING
      const incomingBatter = scorecard.batting.find(b => b.batter_id.toString() === wicketDetails.nextBatter_id.toString());
      if (incomingBatter) incomingBatter.status = 'BATTING';

      // 7. Update the Timeline String for the UI (Append '+W')
      if (scorecard.currentOverTimeline && scorecard.currentOverTimeline.length > 0) {
        const lastTimelineIndex = scorecard.currentOverTimeline.length - 1;
        if (!scorecard.currentOverTimeline[lastTimelineIndex].endsWith('W')) {
           scorecard.currentOverTimeline[lastTimelineIndex] += '+W';
        }
      }

      // 8. Update Fielding Stats (Most Catches Leaderboard)
      if (wicketDetails.fielder_id) {
        await Player.findByIdAndUpdate(wicketDetails.fielder_id, {
           $inc: { 'tournamentStats.catches': 1 }
        });
      }

      const updatedScorecard = await scorecard.save();
      updateScorecardCache(match_id).catch(console.error); // PUSH TO REDIS
      return res.status(200).json(updatedScorecard);
    }

  } catch (error) {
    console.error("Error applying retroactive correction:", error);
    res.status(500).json({ message: "Server error applying correction" });
  }
};