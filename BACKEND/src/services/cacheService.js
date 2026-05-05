import Scorecard from '../models/Scorecard.js';
import redisClient from '../utils/redis.js';

export const updateScorecardCache = async (match_id) => {
  try {
    // 1. Fetch from DB with full population
    const scorecards = await Scorecard.find({ match_id })
      .sort({ inningsNumber: 1 })
      .populate('batting.batter_id', 'name')
      .populate('bowling.bowler_id', 'name')
      .populate('activePlayers.striker_id', 'name')
      .populate('activePlayers.nonStriker_id', 'name')
      .populate('activePlayers.bowler_id', 'name')
      .lean();

    if (!scorecards || scorecards.length === 0) return null;

    // 2. Format exactly as the user API expects
    const formattedScorecards = scorecards.map(scorecard => {
      scorecard.batting = scorecard.batting.map(b => ({
        ...b,
        playerName: b.batter_id?.name || 'Unknown'
      }));
      scorecard.bowling = scorecard.bowling.map(b => ({
        ...b,
        playerName: b.bowler_id?.name || 'Unknown'
      }));
      scorecard.activePlayers = {
        ...scorecard.activePlayers,
        strikerName: scorecard.activePlayers.striker_id?.name,
        nonStrikerName: scorecard.activePlayers.nonStriker_id?.name,
        bowlerName: scorecard.activePlayers.bowler_id?.name
      };
      return scorecard;
    });

    // 3. Push to Redis (Expires after 12 hours to save memory)
    try {
      if (redisClient.isOpen) {
        await redisClient.setEx(`scorecard:${match_id}`, 43200, JSON.stringify(formattedScorecards));
      }
    } catch (err) {
      console.error("Redis Set Error:", err);
    }

    return formattedScorecards;
  } catch (error) {
    console.error("Error updating scorecard cache:", error);
    return null;
  }
};