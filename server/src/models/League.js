const mongoose = require('mongoose');

const TeamSchema = new mongoose.Schema({
  name: String,
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  roster: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }],
  locked: { type: Boolean, default: false },
  locks: { type: [{ week: Number, locked: Boolean }], default: [] }
});

const LeagueSchema = new mongoose.Schema({
  name: String,
  teams: [TeamSchema],
  createdAt: {type: Date, default: Date.now}
});

module.exports = mongoose.model('League', LeagueSchema);
