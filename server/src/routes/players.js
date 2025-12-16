const express = require('express');
const router = express.Router();
const Player = require('../models/Player');

// public: list players. Query params: week, limit, all=true
router.get('/', async (req, res) => {
  try{
    const limit = Number(req.query.limit) || 200;
    const all = req.query.all === 'true' || req.query.all === '1';
    const weekParam = req.query.week;

    if(all){
      const players = await Player.find({}).limit(limit).lean();
      return res.json(players);
    }

    if(typeof weekParam !== 'undefined'){
      const week = Number(weekParam) || 1;
      const players = await Player.find({week}).limit(limit).lean();
      return res.json(players);
    }

    // Default behavior changed: prefer seeded/game data (weeklyStats.week === 1) if present.
    const seededCount = await Player.countDocuments({ 'weeklyStats.week': 1 });
    if(seededCount > 0){
      const players = await Player.find({ 'weeklyStats.week': 1 }).limit(limit).lean();
      return res.json(players);
    }

    // Fallback: return persisted metadata players (week:0) or empty
    const players = await Player.find({week:0}).limit(limit).lean();
    res.json(players);
  } catch(err){
    console.error('Players list error', err);
    res.status(500).json({error:'Failed to list players'});
  }
});

module.exports = router;
