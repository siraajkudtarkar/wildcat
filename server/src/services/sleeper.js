// Simple Sleeper API integration for season 2025 week stats.
// Uses public Sleeper endpoints to fetch player metadata and weekly stats.

const SEASON = 2025;

let fetchFn = global.fetch;
try{
  if(!fetchFn){
    // node-fetch v2 uses require
    // eslint-disable-next-line global-require
    fetchFn = require('node-fetch');
  }
} catch(err){
  console.warn('node-fetch not installed and global.fetch not available; sleeper fetches will fail', err);
}

async function fetchWeekStats(week = 1, season = SEASON){
  if(!fetchFn){
    console.error('No fetch available to call Sleeper API');
    return [];
  }
  try{
    // Fetch player metadata (may be large) and weekly stats. We'll attempt a few recent seasons
    const playersResp = await fetchFn('https://api.sleeper.app/v1/players/nfl');
    const playersJson = playersResp && playersResp.ok ? await playersResp.json() : {};

    // Try the requested season first, then fallback seasons (season-1, season-2)
    const seasonsToTry = [season, season - 1, season - 2];
    let statsJson = null;
    let usedSeason = null;
    for(const s of seasonsToTry){
      try{
        const statsUrl = `https://api.sleeper.app/v1/stats/nfl/${s}/regular/${week}`;
        const statsResp = await fetchFn(statsUrl);
        if(statsResp && statsResp.ok){
          const candidate = await statsResp.json();
          // require non-empty
          if(candidate && ((Array.isArray(candidate) && candidate.length > 0) || (typeof candidate === 'object' && Object.keys(candidate).length > 0))){
            statsJson = candidate;
            usedSeason = s;
            break;
          }
        }
      } catch(e){
        // continue
      }
    }

    if(!statsJson){
      // nothing found
      return [];
    }

    // Map results: statsJson may be an object keyed by sleeper_id or an array.
    const result = [];
    if(Array.isArray(statsJson)){
      for(const s of statsJson){
        const pid = s.player_id || s.player || s.sleeper_id || s.id;
        const playerMeta = playersJson[pid] || {};
        result.push({
          sleeperId: pid,
          name: playerMeta.full_name || playerMeta.display_name || (playerMeta && playerMeta.name) || pid,
          position: playerMeta.position || s.position || null,
          team: playerMeta.team || s.team || null,
          fantasyPoints: s.fantasy_points ?? s.fantasy_points_ppr ?? s.ppr ?? 0,
          raw: s,
          season: usedSeason
        });
      }
    } else if(typeof statsJson === 'object'){
      for(const [pid, s] of Object.entries(statsJson)){
        const playerMeta = playersJson[pid] || {};
        result.push({
          sleeperId: pid,
          name: playerMeta.full_name || playerMeta.display_name || (playerMeta && playerMeta.name) || pid,
          position: playerMeta.position || s.position || null,
          team: playerMeta.team || s.team || null,
          fantasyPoints: s.fantasy_points ?? s.fantasy_points_ppr ?? s.ppr ?? 0,
          raw: s,
          season: usedSeason
        });
      }
    }

    // Return array sorted by fantasyPoints desc
    result.sort((a,b) => (b.fantasyPoints || 0) - (a.fantasyPoints || 0));
    return result;
  } catch(err){
    console.error('Sleeper fetch error', err);
    return [];
  }
}

async function fetchAllPlayers(){
  if(!fetchFn){
    console.error('No fetch available to call Sleeper API');
    return {};
  }
  try{
    const resp = await fetchFn('https://api.sleeper.app/v1/players/nfl');
    if(!resp.ok) return {};
    const json = await resp.json();
    return json || {};
  } catch(err){
    console.error('fetchAllPlayers error', err);
    return {};
  }
}

module.exports = { fetchWeekStats, fetchAllPlayers };
