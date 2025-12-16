const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const League = require('../models/League');
const Player = require('../models/Player');

// POST /teams - create a team for the authenticated user. Body: { name, roster: [playerIds], leagueId? }
router.post('/', auth, async (req, res) => {
  try{
    const { name, roster, leagueId } = req.body;
    // Map roster entries: only accept ObjectId strings (we no longer use sleeperId)
    let mappedRoster = [];
    if(Array.isArray(roster)){
      const mongoose = require('mongoose');
      for(const r of roster){
        if(typeof r === 'string' && mongoose.Types.ObjectId.isValid(r)){
          mappedRoster.push(r);
        } else {
          return res.status(400).json({ error: 'Roster entries must be valid Player _id strings' });
        }
      }
    }

    const teamObj = { name: name || 'My Team', owner: req.user.id, roster: mappedRoster };

    if(leagueId){
      const league = await League.findById(leagueId);
      if(!league) return res.status(404).json({error:'League not found'});
      league.teams.push(teamObj);
      await league.save();
      return res.json({ok:true, league});
    }

    // create a new league with this single team
    const league = new League({ name: `${req.user.email || 'User'} League`, teams: [teamObj] });
    await league.save();
    res.json({ok:true, league});
  } catch(err){
    console.error('Create team error', err);
    res.status(500).json({error:'Server error'});
  }
});

module.exports = router;

// PATCH /teams/:teamId - update team's roster and/or lock state (owner only)
router.patch('/:teamId', auth, async (req, res) => {
  try{
    const { teamId } = req.params;
    const { roster, locked } = req.body;
    const mongoose = require('mongoose');

    if(typeof roster !== 'undefined'){
      if(!Array.isArray(roster)) return res.status(400).json({ error: 'Roster must be an array of Player _id strings' });
      for(const r of roster){
        if(!(typeof r === 'string' && mongoose.Types.ObjectId.isValid(r))) return res.status(400).json({ error: 'Roster entries must be valid Player _id strings' });
      }
    }

    // Find league containing the team
    const league = await League.findOne({ 'teams._id': teamId });
    if(!league) return res.status(404).json({ error: 'Team not found' });

    const team = league.teams.id(teamId);
    if(!team) return res.status(404).json({ error: 'Team not found' });
    // Only owner can update
    if(String(team.owner) !== String(req.user.id)) return res.status(403).json({ error: 'Forbidden' });

    if(typeof roster !== 'undefined') team.roster = roster;
    // if caller provided week-specific lock, update per-week locks array
    if(typeof locked !== 'undefined' && typeof req.body.week !== 'undefined'){
      const weekNum = Number(req.body.week);
      const existing = team.locks && team.locks.find(l => Number(l.week) === weekNum);
      if(existing) existing.locked = Boolean(locked);
      else team.locks = team.locks.concat([{ week: weekNum, locked: Boolean(locked) }]);
    } else if(typeof locked !== 'undefined') {
      // backwards-compatible single locked flag
      team.locked = Boolean(locked);
    }

    await league.save();
    const updated = await League.findById(league._id).populate('teams.owner', 'email displayName').populate('teams.roster');
    // broadcast lineup/lock change to league room
    try{
      const io = req.app.get('io');
      if(io) io.to(String(league._id)).emit('lineup:update', { leagueId: league._id, teamId, week: req.body.week });
    }catch(e){ console.warn('Socket emit failed', e); }
    res.json({ ok:true, league: updated });
  } catch(err){
    console.error('Update team roster/lock error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /teams/:teamId/lock - shortcut to set lock state
router.patch('/:teamId/lock', auth, async (req, res) => {
  try{
    const { teamId } = req.params;
    const { locked } = req.body;
    const { week } = req.body;
    const league = await League.findOne({ 'teams._id': teamId });
    if(!league) return res.status(404).json({ error: 'Team not found' });
    const team = league.teams.id(teamId);
    if(!team) return res.status(404).json({ error: 'Team not found' });
    if(String(team.owner) !== String(req.user.id)) return res.status(403).json({ error: 'Forbidden' });
    if(typeof week !== 'undefined'){
      const w = Number(week);
      const existing = team.locks && team.locks.find(l => Number(l.week) === w);
      if(existing) existing.locked = Boolean(locked);
      else team.locks = team.locks.concat([{ week: w, locked: Boolean(locked) }]);
    } else {
      team.locked = Boolean(locked);
    }
    await league.save();
    const updated = await League.findById(league._id).populate('teams.owner', 'email displayName').populate('teams.roster');
    try{
      const io = req.app.get('io');
      if(io) io.to(String(league._id)).emit('lineup:update', { leagueId: league._id, teamId, week });
    }catch(e){ console.warn('Socket emit failed', e); }
    res.json({ ok:true, league: updated });
  } catch(err){
    console.error('Set team lock error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

