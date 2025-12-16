import { BASE } from './serverClient';

async function signup({email, password, displayName, teamName, roster} = {}){
  const body = { email, password, displayName };
  if(typeof teamName !== 'undefined') body.teamName = teamName;
  if(Array.isArray(roster) && roster.length) body.roster = roster;
  const res = await fetch(`${BASE}/auth/signup`, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(body)
  });
  if(!res.ok) throw new Error('Signup failed');
  return res.json();
}

async function login({email, password}){
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({email, password})
  });
  if(!res.ok) throw new Error('Login failed');
  return res.json();
}

export default { signup, login };
