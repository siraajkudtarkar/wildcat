import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const DEFAULT_PORT = 4000;

function deriveBase(){
  // 1) explicit override via Expo env or extra
  const override = (process.env.EXPO_PUBLIC_API_BASE) || (Constants?.expoConfig?.extra?.apiBase) || (Constants?.manifest?.extra?.apiBase);
  if(override && typeof override === 'string') return override;

  // 2) If running under Expo, try to use the debugger host IP (works for LAN/tunnel)
  try{
    const dbg = Constants?.manifest && (Constants.manifest.debuggerHost || Constants.manifest.hostUri);
    if(dbg && typeof dbg === 'string'){
      const host = dbg.split(':')[0];
      if(host && host !== 'localhost' && host !== '127.0.0.1') return `http://${host}:${DEFAULT_PORT}`;
    }
  }catch(e){ /* ignore */ }

  // 3) Android emulator mapping
  if(Platform.OS === 'android') return `http://10.0.2.2:${DEFAULT_PORT}`;

  // 4) Default to localhost (works for iOS simulator and web if server is local)
  return `http://localhost:${DEFAULT_PORT}`;
}

const BASE = deriveBase();
// Debug: print resolved base so we can verify the app's network target in Metro/device logs
try{ console.log('[serverClient] BASE =', BASE); }catch(e){/* ignore */}

async function getSleeperWeek(week = 1){
  const res = await fetch(`${BASE}/sleeper/week/${week}`);
  if(!res.ok) throw new Error('Failed to fetch sleeper week');
  return res.json();
}
// fetch persisted players from server (default: metadata players week:0)
async function getPlayers({ limit = 30, all = false, week } = {}){
  const qs = [];
  if(limit) qs.push(`limit=${limit}`);
  if(all) qs.push(`all=true`);
  if(typeof week !== 'undefined') qs.push(`week=${week}`);
  const url = `${BASE}/players${qs.length ? `?${qs.join('&')}` : ''}`;
  const res = await fetch(url);
  if(!res.ok) throw new Error('Failed to fetch players');
  return res.json();
}
// request server to import sleeper week into DB
export async function importSleeperWeek(week = 1){
  const res = await fetch(`${BASE}/sleeper/import/week/${week}`, {method:'POST'});
  if(!res.ok) throw new Error('Failed to import sleeper week');
  return res.json();
}

export async function importAllPlayers(){
  const res = await fetch(`${BASE}/sleeper/import/all`, {method:'POST'});
  if(!res.ok) throw new Error('Failed to import all players');
  return res.json();
}

export async function importTopPlayers(n = 30, week = 1){
  const res = await fetch(`${BASE}/sleeper/import/top/${n}?week=${week}`, {method:'POST'});
  if(!res.ok) throw new Error('Failed to import top players');
  return res.json();
}

export async function getDemoMatchup(week = 1){
  const res = await fetch(`${BASE}/matchups/demo/week/${week}`);
  if(!res.ok) throw new Error('Failed to fetch demo matchup');
  return res.json();
}

export async function createTeam({name, roster, leagueId}){
  const token = await AsyncStorage.getItem('wildcat_token');
  const res = await fetch(`${BASE}/teams`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({name, roster, leagueId})
  });
  if(!res.ok) throw new Error('Failed to create team');
  return res.json();
}

export async function getLeagues(){
  const token = await AsyncStorage.getItem('wildcat_token');
  const res = await fetch(`${BASE}/leagues`, { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
  if(!res.ok) throw new Error('Failed to fetch leagues');
  return res.json();
}

export async function updateTeamRoster(teamId, roster, opts = {}){
  const token = await AsyncStorage.getItem('wildcat_token');
  const body = {};
  if(typeof roster !== 'undefined') body.roster = roster;
  if(typeof opts.locked !== 'undefined') body.locked = Boolean(opts.locked);
  if(typeof opts.week !== 'undefined') body.week = Number(opts.week);
  const res = await fetch(`${BASE}/teams/${teamId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body)
  });
  if(!res.ok) throw new Error('Failed to update team roster');
  return res.json();
}

export { BASE };
export default { getSleeperWeek, importSleeperWeek, getDemoMatchup, createTeam, getPlayers, importAllPlayers, importTopPlayers, getLeagues, updateTeamRoster, BASE };
