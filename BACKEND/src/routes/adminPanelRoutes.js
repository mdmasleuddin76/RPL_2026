import express from 'express';
const router = express.Router();
import { protectAdmin } from '../middleware/authMiddleware.js'; // <-- Import middleware
import { loginAdmin } from '../controllers/adminAuthController.js'; // <-- Import login controller

import upload from '../middleware/upload.js';

// ================================
// PLAYER CONTROLLERS
// ================================
import {
  getPlayers,
  addPlayer
} from '../controllers/playerController.js';

// ================================
// MATCH CONTROLLERS
// ================================
import {
  getMatches,
  startMatch,
  completeMatch,
  endInning,
  createMatch,
  startSecondInning
} from '../controllers/matchController.js';

// ================================
// SCORECARD CONTROLLERS
// ================================
import {
  getActiveScorecard,
  updateScorecard,
  applyRetroactiveCorrection
} from '../controllers/scorecardController.js';

// ================================
// BALL EVENT CONTROLLERS
// ================================
import {
  recordBall,
  undoLastBall
} from '../controllers/ballEventController.js';

// ================================
// NEW: USER CONTROLLERS
// ================================
import {
  getUserMatches,
  getCompleteScorecard,
  getOversHistory,
  getTournamentStats
} from '../controllers/userController.js';



router.post('/api/admin/login', loginAdmin);
router.get('/api/admin/getmatch', getMatches);

// =====================================================
// ADMIN: PLAYER MANAGEMENT
// =====================================================
router.get('/api/admin/getplayer', getPlayers);
router.use('/api/admin', protectAdmin);
router.post('/api/admin/add-player', upload.single('image'), addPlayer);

// =====================================================
// ADMIN: MATCH MANAGEMENT
// =====================================================
router.post('/api/admin/create-match', createMatch);
router.post('/api/admin/start-match', startMatch);
router.post('/api/admin/endining', endInning);
router.post('/api/admin/start-second-inning', startSecondInning);
router.post('/api/admin/completedMatch', completeMatch);

// =====================================================
// ADMIN: SCORECARD MANAGEMENT
// =====================================================
router.get('/api/admin/getActiveScorecard/:match_id', getActiveScorecard);
router.put('/api/admin/update-scorecard', updateScorecard);

// =====================================================
// ADMIN: BALL EVENT MANAGEMENT
// =====================================================
router.post('/api/admin/ballevent', recordBall);
router.post('/api/admin/undo-last-ball', undoLastBall);
router.post('/api/admin/retroactive-correction', applyRetroactiveCorrection);

// =====================================================
// NEW: PUBLIC USER ROUTES
// =====================================================
// 1. Get all matches for the home page
router.get('/api/user/getmatch', getUserMatches);

// 2. Get the full populated scorecard for a specific match
router.get('/api/user/getcompletescorecard/:match_id', getCompleteScorecard);

// 3. Get the over-by-over timeline for a specific match
router.get('/api/user/overs/:match_id', getOversHistory);

// 4. Get tournament leaderboards (Orange cap, Purple cap, Sixes)
router.get('/api/user/stats', getTournamentStats);

export default router;