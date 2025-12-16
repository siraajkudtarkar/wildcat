const express = require('express');
const router = express.Router();
const League = require('../models/League');
const Player = require('../models/Player');

// GET /matchups/demo/week/:week - compute matchup for first league in DB
router.get('/demo/week/:week', async (req, res) => {
  const week = Number(req.params.week) || 1;
  const season = Number(req.query.season) || undefined;
  try{
    const league = await League.findOne({}).populate('teams.owner', 'email displayName').populate('teams.roster');
    if(!league) return res.status(404).json({error:'No league found'});

    // for each team, split roster into starters (first 6) and bench (rest)
    const teams = [];
    for(const t of league.teams){
      // fetch roster player docs (t.roster may be populated docs or ObjectIds)
      const rosterIds = (t.roster || []).map(r => (r && r._id) ? String(r._id) : String(r));
      const rosterDocs = await Player.find({ _id: { $in: rosterIds } }).lean();
      // preserve order as in t.roster
      const rosterOrdered = rosterIds.map(id => rosterDocs.find(p => String(p._id) === String(id))).filter(Boolean);
      // for each player, pick fantasyPoints and projectedPoints from weeklyStats for requested week
      rosterOrdered.forEach(p => {
        let fp = null;
        let proj = null;
        if(Array.isArray(p.weeklyStats)){
          const match = p.weeklyStats.find(ws => Number(ws.week) === Number(week) && (typeof season === 'undefined' ? true : Number(ws.season) === Number(season)) );
          if(match) {
            fp = match.fantasyPoints;
            if(typeof match.projectedPoints === 'number') proj = match.projectedPoints;
          }
          // sanitize weeklyStats to only include the fields we want to expose
          p.weeklyStats = p.weeklyStats.map(ws => ({
            season: ws.season,
            week: ws.week,
            fantasyPoints: ws.fantasyPoints,
            projectedPoints: ws.projectedPoints
          }));
        }
        // normalize onto top-level field used by client and strip legacy unused fields
        p.fantasyPoints = (typeof fp === 'number') ? fp : (p.fantasyPoints || 0);
        p.projectedPoints = (typeof proj === 'number') ? proj : (p.projectedPoints || null);
        delete p.fantasyPointsPPR;
        delete p.raw;
      });
      // We persist lineup order as starters first, then bench. Show 3 starters.
      const starters = rosterOrdered.slice(0,3);
      const bench = rosterOrdered.slice(3);
      const startersTotal = starters.reduce((s,p)=> s + (p?.fantasyPoints || 0), 0);
      const benchTotal = bench.reduce((s,p)=> s + (p?.fantasyPoints || 0), 0);
      // determine lock state for requested week (if per-week locks exist)
      let lockedForWeek = Boolean(t.locked);
      if(Array.isArray(t.locks) && t.locks.length){
        const found = t.locks.find(l => Number(l.week) === Number(week));
        if(found) lockedForWeek = Boolean(found.locked);
      }
      teams.push({id: t._id, name: t.name, owner: t.owner, starters, bench, startersTotal, benchTotal, total: startersTotal + benchTotal, locked: lockedForWeek});
    }

    res.json({leagueId: league._id, leagueName: league.name, teams});
  } catch(err){
    console.error(err);
    res.status(500).json({error:'Server error'});
  }
});

module.exports = router;
