const express = require('express');
const router = express.Router();
const League = require('../models/League');
const auth = require('../middleware/auth');

// GET /leagues - list leagues where the user has a team
router.get('/', auth, async (req, res) => {
  try {
    const leagues = await League.find({ 'teams.owner': req.user.id })
      .populate('teams.owner', 'email displayName')
      .populate('teams.roster');
    res.json(leagues);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /leagues/public - developer helper: return first league without auth
router.get('/public', async (req, res) => {
  try {
    const league = await League.findOne({}).populate('teams.owner', 'email displayName').populate('teams.roster');
    if(!league) return res.status(404).json({ error: 'No league found' });
    res.json(league);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /leagues - create a new league with at least one team owned by the requester
router.post('/', auth, async (req, res) => {
  try {
    const { name, teams } = req.body;
    const defaultTeams = (teams && teams.length)
      ? teams.map(t => ({ name: t.name || 'Team', owner: req.user.id, roster: t.roster || [] }))
      : [{ name: 'My Team', owner: req.user.id, roster: [] }];

    const league = new League({ name: name || 'New League', teams: defaultTeams });
    await league.save();
    const saved = await League.findById(league._id).populate('teams.owner', 'email displayName').populate('teams.roster');
    res.json(saved);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
