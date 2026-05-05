// ================================
// models/Player.js
// ================================
import mongoose from 'mongoose';

const playerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },

  role: {
    type: String,
    required: true
  },

  battingStyle: {
    type: String,
    default: ''
  },

  bowlingStyle: {
    type: String,
    default: ''
  },

  avatarUrl: {
    type: String,
    default: ''
  },

  tournamentStats: {
    matchesPlayed: {
      type: Number,
      default: 0
    },

    runsScored: {
      type: Number,
      default: 0
    },

    ballsFaced: {
      type: Number,
      default: 0
    },

    fours: {
      type: Number,
      default: 0
    },

    sixes: {
      type: Number,
      default: 0
    },

    wicketsTaken: {
      type: Number,
      default: 0
    },

    oversBowled: {
      type: Number,
      default: 0
    },

    highestScore: {
      type: Number,
      default: 0
    },

    runsConceded: {
      type: Number,
      default: 0
    },

    catches: {
      type: Number,
      default: 0
    },
  }
});

const Player = mongoose.model('Player', playerSchema);

export default Player;