import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import io from 'socket.io-client';
import serverClient, { BASE as API_BASE } from '../api/serverClient';
import { colors, Icon } from '../styles/Theme';

const MAX_WEEK = 5; // keep in sync with MatchupScreen

const betsKey = (wk) => `wildcat_bets_shared_${wk}`;

const getAdjustedPoints = (player, bet, resultsReady) => {
  const base = Number(player?.fantasyPoints || 0);
  if(!resultsReady) return base;
  const proj = (typeof player?.projectedPoints === 'number') ? Number(player.projectedPoints) : null;
  if(!proj || !bet || bet === 'none') return base;
  let correct = false;
  if(bet === 'over') correct = base > proj;
  else if(bet === 'under') correct = base < proj;
  const mult = correct ? 1.5 : (1/1.5);
  return base * mult;
};

function computeStandings(matchups, betsByWeek){
  // matchups: array of { week, teams }
  const teamsMap = new Map(); // id -> {name, wins, losses, ties, pf, pa}

  const getTeamTotal = (t, bets, resultsReady) => {
    // Only count starters' adjusted points for PF/PA
    const starters = Array.isArray(t.starters) && t.starters.length
      ? t.starters
      : Array.isArray(t._computedStarters) && t._computedStarters.length
        ? t._computedStarters
        : Array.isArray(t.roster) ? t.roster.slice(0,3) : [];
    return starters.reduce((s,p)=> s + getAdjustedPoints(p, bets?.[String(p._id)] || bets?.[String(p.id)], resultsReady), 0);
  };

  for(const m of matchups){
    if(!m || !Array.isArray(m.teams) || m.teams.length < 2) continue;
    // Only count weeks where all teams are locked (completed)
    const allLocked = m.teams.every(t => Boolean(t.locked));
    if(!allLocked) continue;
    const bets = betsByWeek?.[m.week] || {};
    // assume pairing by array order (demo matchup is 2 teams)
    const [a,b] = m.teams;
    const aTotal = getTeamTotal(a, bets, allLocked);
    const bTotal = getTeamTotal(b, bets, allLocked);

    const ensure = (team) => {
      if(!team) return null;
      const id = String(team.id || team._id || team.name);
      if(!teamsMap.has(id)){
        teamsMap.set(id, { id, name: team.name || 'Team', wins:0, losses:0, ties:0, pf:0, pa:0 });
      }
      return teamsMap.get(id);
    };

    const aRec = ensure(a);
    const bRec = ensure(b);
    if(!aRec || !bRec) continue;

    aRec.pf += aTotal; aRec.pa += bTotal;
    bRec.pf += bTotal; bRec.pa += aTotal;

    if(Math.abs(aTotal - bTotal) < 0.0001){
      aRec.ties += 1; bRec.ties += 1;
    } else if(aTotal > bTotal){
      aRec.wins += 1; bRec.losses += 1;
    } else {
      bRec.wins += 1; aRec.losses += 1;
    }
  }

  const list = Array.from(teamsMap.values());
  // sort by wins desc, then pf desc
  list.sort((x,y) => {
    if(y.wins !== x.wins) return y.wins - x.wins;
    return y.pf - x.pf;
  });
  return list;
}

export default function LeaderboardScreen(){
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [standings, setStandings] = useState([]);
  const socketRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try{
      const weeks = Array.from({length: MAX_WEEK}, (_,i)=> i+1);
      const matchups = [];
      const betsByWeek = {};
      for(const wk of weeks){
        try{
          const m = await serverClient.getDemoMatchup(wk);
          matchups.push({...m, week: wk});
          try{
            const stored = await AsyncStorage.getItem(betsKey(wk));
            betsByWeek[wk] = stored ? JSON.parse(stored) : {};
          } catch(err){ console.warn('Failed to load bets for week', wk, err); betsByWeek[wk] = {}; }
        } catch(err){
          console.warn('Failed to fetch matchup week', wk, err);
        }
      }
      const computed = computeStandings(matchups, betsByWeek);
      setStandings(computed);
    } catch(err){
      console.warn('Failed to load standings', err);
      setError(err.message || String(err));
    } finally{
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const socket = io(API_BASE, { transports:['websocket'], forceNew:true });
    socketRef.current = socket;

    const handleLineup = () => {
      // when lineups update/lock, refresh standings to reflect completed matchups
      load();
    };

    socket.on('lineup:update', handleLineup);

    return () => {
      socket.off('lineup:update', handleLineup);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [load]);

  if(loading) return <View style={styles.center}><ActivityIndicator size="large" /></View>;
  if(error) return <View style={styles.center}><Text style={{color:'red'}}>Error: {error}</Text></View>;

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
      <View style={styles.header}>
        <Icon name="podium" size={28} color={colors.accent} />
        <Text style={styles.title}>Leaderboard</Text>
      </View>
      <Text style={styles.sub}>Ranked by wins, tiebreaker: total fantasy points for. Based on matchups from weeks 1-{MAX_WEEK}.</Text>

      {standings.map((t, idx) => (
        <View key={t.id || idx} style={styles.row}>
          <View style={{flexDirection:'row', alignItems:'center'}}>
            <View style={styles.rankCircle}><Text style={styles.rankText}>{idx+1}</Text></View>
            <View>
              <Text style={styles.teamName}>{t.name}</Text>
              <Text style={styles.record}>{t.wins}-{t.losses}-{t.ties} record</Text>
            </View>
          </View>
          <View style={{alignItems:'flex-end'}}>
            <Text style={styles.metric}>PF: {t.pf.toFixed(2)}</Text>
            <Text style={styles.metric}>PA: {t.pa.toFixed(2)}</Text>
          </View>
        </View>
      ))}

      {standings.length === 0 && (
        <Text style={{color:colors.muted, marginTop:20}}>No teams available.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, padding:12, backgroundColor: colors.bg },
  center: { flex:1, justifyContent:'center', alignItems:'center' },
  header: { flexDirection:'row', alignItems:'center', marginBottom:8 },
  title: { fontSize:22, fontWeight:'800', marginLeft:8, color:colors.dark },
  sub: { color:colors.muted, marginBottom:12 },
  row: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', padding:12, backgroundColor: colors.card, borderRadius:10, borderWidth:1, borderColor:colors.border, marginBottom:10, shadowColor:'#000', shadowOpacity:0.03, shadowRadius:4, elevation:1 },
  rankCircle: { width:32, height:32, borderRadius:16, backgroundColor:colors.accentLight, alignItems:'center', justifyContent:'center', marginRight:10 },
  rankText: { color:'#fff', fontWeight:'800' },
  teamName: { fontWeight:'800', color:colors.dark },
  record: { color:colors.muted, fontSize:12 },
  metric: { color:colors.dark, fontWeight:'700', fontSize:12 }
});
