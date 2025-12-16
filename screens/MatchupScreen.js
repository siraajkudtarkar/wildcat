import React, {useEffect, useRef, useState} from 'react';
import {View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity, Alert} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import io from 'socket.io-client';
import serverClient, { BASE as API_BASE } from '../api/serverClient';
import Theme, { colors, Icon } from '../styles/Theme';
import PrimaryButton from '../components/PrimaryButton';

export default function MatchupScreen({navigation, user}){
  const [loading, setLoading] = useState(true);
  const [week, setWeek] = useState(1);
  const MAX_WEEK = 5;
  const [players, setPlayers] = useState([]);
  const [matchup, setMatchup] = useState(null);
  const [error, setError] = useState(null);
  const [localTeams, setLocalTeams] = useState(null);
  const [locked, setLocked] = useState([]); // per-team lock state
  const [bets, setBets] = useState({}); // playerId -> 'none'|'over'|'under'
  const [currentUser, setCurrentUser] = useState(user || null);
  const socketRef = useRef(null);

  const getUserId = (u) => (u && (u._id || u.id || u.userId));
  // Share bets per-device/week so both logged-in accounts see the same adjusted scores
  const betsKey = (_uid, wk) => `wildcat_bets_shared_${wk}`;

  useEffect(() => {
    let mounted = true;
    (async () => {
      if(user){
        setCurrentUser(user);
        return;
      }
      try{
        const storedUser = await AsyncStorage.getItem('wildcat_user');
        if(storedUser && mounted){
          setCurrentUser(JSON.parse(storedUser));
        }
      } catch(err){
        console.warn('Failed to load stored user', err);
      }
    })();
    return () => { mounted = false; };
  }, [user]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try{
        const saved = await AsyncStorage.getItem(betsKey(getUserId(currentUser), week));
        if(mounted){
          setBets(saved ? JSON.parse(saved) : {});
        }
      } catch(err){
        console.warn('Failed to load saved bets', err);
        if(mounted) setBets({});
      }
    })();
    return () => { mounted = false; };
  }, [week, currentUser]);

  useEffect(() => {
    const socket = io(API_BASE, { transports:['websocket'], forceNew:true });
    socketRef.current = socket;

    const handleLineup = (payload) => {
      if(payload && typeof payload.week !== 'undefined' && Number(payload.week) !== Number(week)) return;
      loadWeek(week, true);
    };
    const handleScore = (payload) => {
      if(payload && typeof payload.week !== 'undefined' && Number(payload.week) !== Number(week)) return;
      loadWeek(week, true);
    };

    socket.on('lineup:update', handleLineup);
    socket.on('score:update', handleScore);

    return () => {
      socket.off('lineup:update', handleLineup);
      socket.off('score:update', handleScore);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [week]);

  const loadWeek = async (wk, mounted = true) => {
    setLoading(true);
    try{
      const matchup = await serverClient.getDemoMatchup(wk);
      if(!mounted) return;
      const all = [];
      matchup.teams.forEach(t=>{
        const starters = (Array.isArray(t.starters) && t.starters.length) ? t.starters : (Array.isArray(t.roster) ? t.roster.slice(0,6) : []);
        const bench = (Array.isArray(t.bench) && t.bench.length) ? t.bench : (Array.isArray(t.roster) ? t.roster.slice(6) : []);
        starters.forEach(p=> all.push({...p, teamName: t.name, role:'starter'}));
        bench.forEach(p=> all.push({...p, teamName: t.name, role:'bench'}));
        t._computedStarters = starters;
        t._computedBench = bench;
      });
      setPlayers(all);
      setMatchup(matchup);
      if(socketRef.current && matchup?.leagueId){
        socketRef.current.emit('join-league', { leagueId: matchup.leagueId });
      }
      setLocalTeams(matchup.teams.map(t => ({
        id: t.id,
        name: t.name,
        owner: t.owner,
        starters: [...(t._computedStarters || t.starters || [])],
        bench: [...(t._computedBench || t.bench || [])],
        startersTotal: t.startersTotal || 0,
        benchTotal: t.benchTotal || 0,
        total: t.total || 0
      })));
      const serverLocked = matchup.teams.map(t => Boolean(t.locked));
      setLocked(serverLocked);
    } catch(err){
      console.warn('Failed to load matchup', err);
      if(mounted) setError(err.message || String(err));
    } finally{
      if(mounted) setLoading(false);
    }
  };

  useEffect(()=>{
    let mounted = true;
    loadWeek(week, mounted);
    return ()=>{ mounted=false };
  },[week]);

  if(loading) return (
    <View style={styles.center}><ActivityIndicator size="large"/></View>
  );

  if(error) return (
    <View style={styles.center}><Text style={{color:'red'}}>Error loading matchup: {error}</Text></View>
  );

  const myUserId = getUserId(currentUser);

  const isMyTeam = (team) => {
    if(!team) return false;
    const ownerId = team.owner && (team.owner._id || team.owner.id || team.owner);
    return myUserId && ownerId && String(ownerId) === String(myUserId);
  };

  const renderPlayer = ({item}) => (
    <View style={styles.playerRow}>
      <View style={{flex:1}}>
        <Text style={styles.name}>{item.name} <Text style={styles.pos}>({item.position})</Text></Text>
        { typeof item.projectedPoints === 'number' ? (
          <Text style={styles.proj}>Proj: {(item.projectedPoints||0).toFixed(2)} pts</Text>
        ) : null }
      </View>
      { /* show points only when locked */ }
      { item.fantasyPoints != null && showPointsForPlayer(item) ? (
        <Text style={styles.points}> Adjusted: {(item.fantasyPoints||0).toFixed(2)} pts</Text>
      ) : null }
    </View>
  );

  const resultsReady = () => {
    // Results unlock when every team has locked; bets default to 'none' if missing
    if(!Array.isArray(locked) || locked.length === 0) return false;
    return locked.every(Boolean);
  };

  // If matchup available, render two team columns with starters and bench + totals
  const showPointsForPlayer = (player) => {
    if(!localTeams) return false;
    // find team index
    const idx = localTeams.findIndex(t => t.name === player.teamName || String(t.id) === String(player.teamId));
    if(idx < 0) return false;
    // Reveal points only when ALL teams locked and all bets are placed
    return resultsReady();
  };

  const toggleMove = (teamIndex, playerId) => {
    // move between starters and bench for the given teamIndex
    if(!localTeams) return;
    const team = localTeams[teamIndex];
    if(!isMyTeam(team)){
      Alert.alert('Not your team', 'You can only edit your own lineup.');
      return;
    }
    if(locked[teamIndex]) return; // can't move when locked
    // apply change locally and persist roster order (starters then bench) to server
    const copy = localTeams.map(t => ({...t, starters:[...t.starters], bench:[...t.bench]}));
    const teamCopy = copy[teamIndex];
    const inStarIdx = teamCopy.starters.findIndex(p => String(p._id) === String(playerId));
    if(inStarIdx >= 0){
      const [p] = teamCopy.starters.splice(inStarIdx,1);
      teamCopy.bench.push(p);
    } else {
      // Enforce max 3 starters
      if(teamCopy.starters.length >= 3){
        // Error checking
        Alert.alert('Too many starters', 'You can only have 3 starters. Bench another player before starting this one.');
        return;
      }
      const inBenchIdx = teamCopy.bench.findIndex(p => String(p._id) === String(playerId));
      if(inBenchIdx >= 0){
        const [p] = teamCopy.bench.splice(inBenchIdx,1);
        teamCopy.starters.push(p);
      }
    }
    setLocalTeams(copy);
    // build new roster order: starters first then bench
    const newRoster = copy[teamIndex].starters.map(p => String(p._id)).concat(copy[teamIndex].bench.map(p => String(p._id)));
    (async ()=>{
      try{
        await serverClient.updateTeamRoster(copy[teamIndex].id, newRoster, { week });
      } catch(err){
        console.warn('Failed to persist roster change', err);
        // revert local change by reloading matchup
        try{
          const refreshed = await serverClient.getDemoMatchup(week);
          setMatchup(refreshed);
          setLocalTeams(refreshed.teams.map(t => ({ id: t.id, name: t.name, owner: t.owner, starters:[...(t.starters||[])], bench:[...(t.bench||[])], startersTotal: t.startersTotal||0, benchTotal: t.benchTotal||0, total: t.total||0 })));
          setLocked(refreshed.teams.map(t => Boolean(t.locked)));
        } catch(e){ console.warn('Failed to refresh matchup', e) }
      }
    })();
  };

  const toggleLock = (teamIndex) => {
    const team = localTeams && localTeams[teamIndex];
    if(!team) return;
    if(!isMyTeam(team)){
      Alert.alert('Not your team', 'You can only lock your own lineup.');
      return;
    }
    if(locked[teamIndex]){
      Alert.alert('Lineup locked', 'Locked lineups cannot be unlocked.');
      return;
    }
    // only allow locking when exactly 3 starters
    if(!team.starters || team.starters.length !== 3){
      Alert.alert('Invalid lineup', 'You must have exactly 3 starters to lock your lineup.');
      return;
    }
    const newLocked = [...locked];
    newLocked[teamIndex] = true;
    setLocked(newLocked);
    (async ()=>{
      try{
        await serverClient.updateTeamRoster(team.id, undefined, { locked: true, week });
      } catch(err){
        console.warn('Failed to persist lock change', err);
        // revert
        const reverted = [...newLocked]; reverted[teamIndex] = false;
        setLocked(reverted);
      }
    })();
  };

  // const computeStarterTotal = (team) => {
  //   const starters = team.starters || [];
  //   return starters.reduce((s,p)=> s + (getAdjustedPoints(p) || 0), 0);
  // };

  const getAdjustedPoints = (player) => {
    const base = Number(player?.fantasyPoints || 0);
    const bet = bets[String(player._id)] || 'none';
    // no projectedPoints => no bet effect
    if(!bet || bet === 'none' || typeof player.projectedPoints !== 'number') return base;
    // only apply after all teams locked and all bets placed (results known)
    if(!resultsReady()) return base;
    const proj = Number(player.projectedPoints || 0);
    let correct = false;
    if(bet === 'over') correct = base > proj;
    else if(bet === 'under') correct = base < proj;
    const mult = correct ? 1.5 : (1/1.5);
    return base * mult;
  };

  const isBetCorrect = (player) => {
    const bet = bets[String(player._id)] || 'none';
    if(!bet || bet === 'none' || typeof player.projectedPoints !== 'number') return null;
    if(!resultsReady()) return null;
    const base = Number(player?.fantasyPoints || 0);
    const proj = Number(player.projectedPoints || 0);
    if(bet === 'over') return base > proj;
    if(bet === 'under') return base < proj;
    return null;
  };

  const persistBets = async (nextBets) => {
    try{
      await AsyncStorage.setItem(betsKey(getUserId(currentUser), week), JSON.stringify(nextBets));
    } catch(err){
      console.warn('Failed to save bets', err);
    }
  };

  const setBetForPlayer = (playerId, val) => {
    setBets(prev => {
      const next = {...prev, [String(playerId)]: val};
      persistBets(next);
      return next;
    });
  };

  if(matchup){
    const allLocked = Array.isArray(locked) && locked.length > 0 && locked.every(Boolean);
    const ready = resultsReady();
    // compute adjusted totals per team (starters only)
    // Apply bet-adjusted totals so scoring stays consistent with bet effects
    const adjustedTotals = (localTeams || []).map(t => {
      const starters = t.starters || [];
      return starters.reduce((s,p) => s + (getAdjustedPoints(p) || 0), 0);
    });
    // keep teams side-by-side on all screen sizes per request

    return (
      <View style={styles.container}>
        <View style={styles.topHeader}>
          <View style={styles.topLeft}>
            <Icon name="football" size={26} color={colors.accent} />
            <Text style={styles.title}> Week {week}</Text>
          </View>
          <View style={styles.topActions}>
            <PrimaryButton title="Prev" onPress={() => setWeek(w => Math.max(1, w-1))} style={{paddingHorizontal:10, paddingVertical:6, marginRight:8}} disabled={week<=1} />
            <PrimaryButton title="Next" onPress={() => setWeek(w => Math.min(MAX_WEEK, w+1))} style={{paddingHorizontal:10, paddingVertical:6}} disabled={week>=MAX_WEEK} />
          </View>
        </View>
        <ScrollView style={{flex:1}} contentContainerStyle={{paddingBottom:40}}>
        <View style={styles.teamsRow}>
          {localTeams && localTeams.map((team, idx) => {
            const mine = isMyTeam(team);
            const teamLocked = locked[idx];
            const betDisabled = ready || teamLocked || !mine;

            return (
              <View key={team.id} style={styles.teamBox}>
                <View style={styles.teamHeader}>
                  <View style={styles.teamNameRow}>
                    <Text style={styles.teamTitle}>{team.name}</Text>
                    { ready && adjustedTotals.length > 1 ?(()=>{
                      const otherIdx = idx === 0 ? 1 : 0;
                      const mineTotal = adjustedTotals[idx] || 0;
                      const other = adjustedTotals[otherIdx] || 0;
                      const isTie = Math.abs(mineTotal - other) < 0.0001;
                      const isWin = mineTotal > other && !isTie;
                      return (
                        <Text style={[styles.resultBadge, isWin ? styles.resultWin : isTie ? styles.resultTie : styles.resultLose]}>
                          {isTie ? 'T' : (isWin ? 'W' : 'L')}
                        </Text>
                      );
                    })() : null }
                  </View>
                  <View style={styles.teamTotalWrap}>
                    <Text style={styles.teamTotal}>{ready ? (adjustedTotals[idx]||0).toFixed(2)+' pts' : '--'}</Text>
                  </View>
                </View>
                <Text style={styles.teamCounts}> Starters </Text>

                <View>
                  {team.starters.map(item => (
                    <View key={String(item._id)} style={styles.playerRowDetailed}>
                      <View style={{flex:1, paddingHorizontal:8, justifyContent:'center'}}>
                        <View style={styles.playerHeader}>
                          <View style={styles.nameCol}>
                            <Text style={styles.name}>{item.name}</Text>
                            <Text style={styles.pos}>{item.position}</Text>
                          </View>
                        </View>
                        <Text style={styles.proj}>Proj: {(item.projectedPoints||0).toFixed(2)} pts</Text>
                        { ready ? (
                          <Text style={styles.rawPoints}>Raw: {item.fantasyPoints != null ? (item.fantasyPoints||0).toFixed(2)+' pts' : '--'}</Text>
                        ) : null }
                        <View style={[styles.betRow, {marginTop:10}]}> 
                          <TouchableOpacity disabled={betDisabled} onPress={() => setBetForPlayer(item._id, 'none')} style={[styles.betBtn, betDisabled && styles.betDisabled, bets[String(item._id)] === 'none' && styles.betActive]}>
                            <Text style={styles.small}>None (1.00x)</Text>
                          </TouchableOpacity>
                          <TouchableOpacity disabled={betDisabled} onPress={() => setBetForPlayer(item._id, 'over')} style={[styles.betBtn, betDisabled && styles.betDisabled, bets[String(item._id)] === 'over' && styles.betActive]}>
                            <Text style={styles.small}>Over (1.50x)</Text>
                          </TouchableOpacity>
                          <TouchableOpacity disabled={betDisabled} onPress={() => setBetForPlayer(item._id, 'under')} style={[styles.betBtn, betDisabled && styles.betDisabled, bets[String(item._id)] === 'under' && styles.betActive]}>
                            <Text style={styles.small}>Under (0.75x)</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                      <View style={styles.controls}>
                        { ready ? (
                          <View style={styles.adjustedInline}>
                            <Text style={styles.adjustedPoints}>{getAdjustedPoints(item).toFixed(2)} pts</Text>
                            {(() => {
                              const res = isBetCorrect(item);
                              if(res === true) return <Text style={[styles.betResult, styles.betResultWin]}> ✓</Text>;
                              if(res === false) return <Text style={[styles.betResult, styles.betResultLose]}> ✕</Text>;
                              return null;
                            })()}
                          </View>
                        ) : (
                          <View style={styles.adjustedInline}>
                            <PrimaryButton title="Bench" disabled={!mine || teamLocked} onPress={() => toggleMove(idx, item._id)} style={styles.inlineButton} />
                          </View>
                        ) }
                      </View>
                    </View>
                  ))}
                </View>
                <View style={styles.divider} />
                <Text style={styles.teamCounts}>Bench</Text>
                <View>
                  {team.bench.map(item => (
                    <View key={String(item._id)} style={styles.playerRowDetailed}>
                      <View style={{flex:1, paddingHorizontal:8, justifyContent:'center'}}>
                        <View style={styles.playerHeader}>
                          <View style={styles.nameCol}>
                            <Text style={styles.name}>{item.name}</Text>
                            <Text style={styles.pos}>{item.position}</Text>
                          </View>
                        </View>
                        <Text style={styles.proj}>Proj: {(item.projectedPoints||0).toFixed(2)} pts</Text>
                        { ready ? (
                          <Text style={styles.rawPoints}>Raw: {item.fantasyPoints != null ? (item.fantasyPoints||0).toFixed(2)+' pts' : '--'}</Text>
                        ) : null }
                        <View style={[styles.betRow, {marginTop:10}]}> 
                          <TouchableOpacity disabled={betDisabled} onPress={() => setBetForPlayer(item._id, 'none')} style={[styles.betBtn, betDisabled && styles.betDisabled, bets[String(item._id)] === 'none' && styles.betActive]}>
                            <Text style={styles.small}>None (1.00x)</Text>
                          </TouchableOpacity>
                          <TouchableOpacity disabled={betDisabled} onPress={() => setBetForPlayer(item._id, 'over')} style={[styles.betBtn, betDisabled && styles.betDisabled, bets[String(item._id)] === 'over' && styles.betActive]}>
                            <Text style={styles.small}>Over (1.50x)</Text>
                          </TouchableOpacity>
                          <TouchableOpacity disabled={betDisabled} onPress={() => setBetForPlayer(item._id, 'under')} style={[styles.betBtn, betDisabled && styles.betDisabled, bets[String(item._id)] === 'under' && styles.betActive]}>
                            <Text style={styles.small}>Under (0.75x)</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                      <View style={styles.controls}>
                        { ready ? (
                          <View style={styles.adjustedInline}>
                            <Text style={styles.adjustedPoints}>{getAdjustedPoints(item).toFixed(2)} pts</Text>
                            {(() => {
                              const res = isBetCorrect(item);
                              if(res === true) return <Text style={[styles.betResult, styles.betResultWin]}> ✓</Text>;
                              if(res === false) return <Text style={[styles.betResult, styles.betResultLose]}> ✕</Text>;
                              return null;
                            })()}
                          </View>
                        ) : (
                          <View style={styles.adjustedInline}>
                            <PrimaryButton title="Start" disabled={team.starters.length >= 3 || !mine || teamLocked} onPress={() => toggleMove(idx, item._id)} style={styles.inlineButton} />
                          </View>
                        ) }
                      </View>
                    </View>
                  ))}
                </View>
                <View style={{height:8}} />
                <PrimaryButton title={teamLocked ? 'Locked' : mine ? 'Lock Lineup' : 'Opponent'} disabled={teamLocked || !mine} onPress={() => toggleLock(idx)} style={{width:'100%'}} />
              </View>
            );
          })}
        </View>
        </ScrollView>
      </View>
    )
  }

  return (
    <View style={styles.center}><Text>No matchup data</Text></View>
  )
}

const styles = StyleSheet.create({
  container: {flex:1, padding:12, backgroundColor:colors.bg},
  center: {flex:1, justifyContent:'center', alignItems:'center'},
  title: {fontSize:24, fontWeight:'700', marginBottom:0, marginLeft:8, textAlign:'center', lineHeight:28},

  topHeader: {flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:12, flexWrap:'nowrap'},
  topLeft: {flexDirection:'row', alignItems:'center', flexShrink:1},
  topActions: {flexDirection:'row', alignItems:'center', flexShrink:0},

  // Teams layout: stack vertically for mobile readability
  teamsRow: {flexDirection:'column', justifyContent:'flex-start'},
  teamBox: {
    width:'100%',
    marginVertical:8,
    borderWidth:1,
    borderColor:colors.border,
    padding:12,
    borderRadius:10,
    backgroundColor:colors.card,
    shadowColor: colors.dark,
    shadowOpacity:0.05,
    shadowRadius:6,
    elevation:2
  },
  teamTitle: {fontWeight:'700', marginBottom:0, marginRight:8, fontSize:20, color:colors.dark},
  teamHeader: {flexDirection:'row', alignItems:'center', justifyContent:'space-between', flexWrap:'nowrap'},
  teamNameRow: {flexDirection:'row', alignItems:'center', flexShrink:1},
  teamTotalWrap: {alignItems:'flex-end'},

  // Simple player row (compact)
  playerRow: {paddingVertical:10, marginBottom:6, borderBottomWidth:1, borderColor:'#fafafa', flexDirection:'row', justifyContent:'space-between', alignItems:'center'},

  // Detailed player card used in starters/bench lists
  playerRowDetailed: {
    paddingVertical:12,
    paddingHorizontal:10,
    marginBottom:12,
    borderRadius:8,
    backgroundColor:colors.surface,
    flexDirection:'row',
    alignItems:'center',
    minHeight:72,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
    borderWidth:1,
    borderColor:colors.border
  },

  playerHeader: {flexDirection:'row', alignItems:'center', marginBottom:4},
  nameCol: {flex:1, marginRight:12, minWidth:0},
  name: {fontWeight:'500', fontSize:16, color:colors.dark, lineHeight:20, flexShrink:1},
  small: {fontSize:12, color:colors.muted, marginTop:2},
  pos: {fontWeight:'600', color:colors.muted, fontSize:12},
  points: {fontWeight:'900', fontSize:16, color:colors.dark},

  // Projected points text
  proj: {fontSize:11, color:colors.muted, marginTop:2},

  // Right-side controls column for each player (buttons, adjusted points)
  controls: {width:110, alignItems:'flex-end', justifyContent:'flex-start'},

  // Divider between starters and bench
  divider: {height:1, backgroundColor: colors.border, marginVertical:10},

  // Betting row/buttons
  betRow: {flexDirection:'row', alignItems:'center', marginTop:8},
  betBtn: {paddingHorizontal:10, paddingVertical:6, borderWidth:1, borderColor:colors.border, borderRadius:6, marginLeft:8, backgroundColor:colors.card},
  betActive: {backgroundColor:'#e6f5ff', borderColor:'#39f'},
  betDisabled: {opacity:0.5},
  adjustedInline: {flexDirection:'row', alignItems:'center', justifyContent:'flex-end', width:'100%', minHeight:32},
  inlineButton: {paddingHorizontal:14, marginBottom:16, marginRight:4},
  adjustedPoints: {fontWeight:'600', fontSize:18, color:colors.accent},
  rawPoints: {fontSize:11, color:colors.muted, marginTop:2},
  teamTotal: {fontWeight:'800', fontSize:20, color:colors.dark},
  teamCounts: {fontSize:11, color:colors.accent, fontWeight:'500', margin:4, marginLeft:6},
  resultBadge: {marginLeft:8, paddingHorizontal:8, paddingVertical:4, borderRadius:12, color:'#fff', fontWeight:'700'},
  resultWin: {backgroundColor: '#2ecc71', color:'#fff'},
  resultLose: {backgroundColor: '#e74c3c', color:'#fff'},
  resultTie: {backgroundColor: '#95a5a6', color:'#fff'},
  betResult: {fontSize:16, marginLeft:6, fontWeight:'800'},
  betResultWin: {color:'#2ecc71'},
  betResultLose: {color:'#e74c3c'}
});
