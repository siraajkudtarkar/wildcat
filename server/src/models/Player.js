const mongoose = require('mongoose');

const WeeklyStatSchema = new mongoose.Schema({
  season: { type: Number, required: true },
  week: { type: Number, required: true },
  fantasyPoints: { type: Number, default: null },
  projectedPoints: { type: Number, default: null }
}, { _id: false });

const PlayerSchema = new mongoose.Schema({
  name: String,
  position: String,
  team: String,
  // legacy convenience fields (may represent a specific week)
  week: Number,
  fantasyPoints: Number,
  // New: per-week stats (array of subdocuments). Use this to store week 1..N stats.
  weeklyStats: { type: [WeeklyStatSchema], default: [] }
});

module.exports = mongoose.model('Player', PlayerSchema);
