import mongoose from 'mongoose';

const matchSchema = new mongoose.Schema({
  // _id is removed so Mongoose auto-generates an ObjectId

  status: {
    type: String,
    enum: ['SCHEDULED', 'LIVE', 'COMPLETED','INNINGS_BREAK'],
    default: 'SCHEDULED'
  },

  teamAName: String,
  teamBName: String,

  date: Date,
  venue: String,

  captains: {
    teamA_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player'
    },
    teamB_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player'
    }
  },

  squadA_player_ids: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player'
    }
  ],

  squadB_player_ids: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player'
    }
  ],

  toss: {
    wonBy_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player'
    },
    decision: {
      type: String,
      enum: ['BAT', 'BOWL']
    }
  },
  matchResult: {
    type: String,
    default: ''
  },
  manOfTheMatch_id: {
    type: Number,
    ref: 'Player',
    default: null
  }
});

const Match = mongoose.model('Match', matchSchema);

export default Match;