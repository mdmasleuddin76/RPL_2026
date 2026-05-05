import mongoose from 'mongoose';

const scorecardSchema = new mongoose.Schema({
  // _id is removed so Mongoose auto-generates an ObjectId

  match_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match',
    required: true
  },

  inningsNumber: {
    type: Number,
    required: true
  },

  battingCaptain_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player'
  },
  targetscore: {
    type: Number,
    default: 0
  },
  score: {
    type: Number,
    default: 0
  },

  wickets: {
    type: Number,
    default: 0
  },

  overs: {
    type: Number,
    default: 0
  }, 

  runRate: {
    type: String,
    default: '0.00'
  },

  currentOverTimeline: [
    {
      type: String
    }
  ],

  extras: {
    total: {
      type: Number,
      default: 0
    },
    wides: {
      type: Number,
      default: 0
    },
    noBalls: {
      type: Number,
      default: 0
    },
    legByes: {
      type: Number,
      default: 0
    },
    byes: {
      type: Number,
      default: 0
    }
  },

  activePlayers: {
    striker_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player'
    },
    nonStriker_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player'
    },
    bowler_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player'
    }
  },

  batting: [
    {
      batter_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Player'
      },
      status: {
        type: String,
        enum: ['BATTING', 'OUT', 'YET_TO_BAT'],
        default: 'YET_TO_BAT'
      },
      runs: {
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
      strikeRate: {
        type: String,
        default: '0.00'
      },
      dismissalText: {
        type: String,
        default: ''
      }
    }
  ],

  bowling: [
    {
      bowler_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Player'
      },
      overs: {
        type: String,
        default: '0.0'
      },
      maidens: {
        type: Number,
        default: 0
      },
      runsConceded: {
        type: Number,
        default: 0
      },
      wickets: {
        type: Number,
        default: 0
      },
      economyRate: {
        type: String,
        default: '0.00'
      }
    }
  ]
});

const Scorecard = mongoose.model('Scorecard', scorecardSchema);

export default Scorecard;