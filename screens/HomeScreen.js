import React, { useEffect, useState } from 'react';
import {View, Text, Button, FlatList, StyleSheet, TouchableOpacity, Modal, Alert} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import serverClient from '../api/serverClient';
import Theme, { colors, Icon } from '../styles/Theme';

export default function HomeScreen({navigation, onSignOut, user}){
  const [league, setLeague] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [swapModal, setSwapModal] = useState({ visible:false, teamId:null, replaceIndex: null });

  const myUserId = user && (user._id || user.id || user.userId);

  useEffect(() => { fetchData(); }, []);

  async function fetchData(){
    setLoading(true);
    try{
      const [pl, leagues] = await Promise.all([
        serverClient.getPlayers({ limit: 200 }),
        serverClient.getLeagues()
      ]);
      setPlayers(pl || []);
      // choose first league where user is present
      if(Array.isArray(leagues) && leagues.length) setLeague(leagues[0]);
    } catch(err){
      console.warn('Home fetch error', err);
      Alert.alert('Error', 'Failed to load league or players');
    } finally{ setLoading(false); }
  }

  function openSwap(teamId, index){
    const team = league?.teams?.find(t => String(t._id) === String(teamId));
    const ownerId = team && team.owner && (team.owner._id || team.owner.id || team.owner);
    if(!myUserId || !ownerId || String(ownerId) !== String(myUserId)){
      Alert.alert('Not your team', 'You can only swap players on your own roster.');
      return;
    }
    setSwapModal({ visible:true, teamId, replaceIndex: index });
  }

  async function doSwap(newPlayer){
    const { teamId, replaceIndex } = swapModal;
    if(!league) return;
    const team = league.teams.find(t => String(t._id) === String(teamId));
    if(!team) return;
    const ownerId = team.owner && (team.owner._id || team.owner.id || team.owner);
    if(!myUserId || !ownerId || String(ownerId) !== String(myUserId)){
      Alert.alert('Not your team', 'You can only swap players on your own roster.');
      return;
    }
    const newRoster = team.roster.map(r => String(r._id || r));
    newRoster[replaceIndex] = String(newPlayer._id);
    try{
      await serverClient.updateTeamRoster(teamId, newRoster);
      await fetchData();
      setSwapModal({ visible:false, teamId:null, replaceIndex:null });
    } catch(err){
      console.warn('Swap failed', err);
      Alert.alert('Error','Failed to swap player');
    }
  }

  if(!league) return (
    <View style={styles.container}>
      <View style={styles.header}><Icon name="whistle" size={28} color={colors.accent} /><Text style={styles.title}>No league found</Text></View>
      <Text style={{marginTop:8, color:colors.muted}}>You don't currently have a league or team. You can sign out and sign up, or view the demo matchup.</Text>
      <View style={{height:12}} />
      <Button color={colors.accent} title="Sign out" onPress={() => { if(typeof onSignOut === 'function') onSignOut(); else navigation.replace('Login'); }} />
      <View style={{height:8}} />
      <Button color={colors.accent} title="View Demo Matchup" onPress={() => navigation.navigate('Matchup')} />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}><Icon name="trophy" size={28} color={colors.accent} /><Text style={styles.title}>{league.name}</Text></View>
      <FlatList
        data={league.teams}
        keyExtractor={(t) => String(t._id)}
        renderItem={({item:team}) => {
          const ownerId = team.owner && (team.owner._id || team.owner.id || team.owner);
          const canEdit = myUserId && ownerId && String(ownerId) === String(myUserId);
          return (
            <View style={styles.teamRow}>
              <View style={{flexDirection:'row', alignItems:'center', justifyContent:'space-between'}}>
                <View>
                  <Text style={styles.teamName}>{team.name}</Text>
                  <Text style={styles.teamOwners}>{(team.owner && team.owner.displayName) || (team.owner && team.owner.email)}</Text>
                  {canEdit ? <Text style={styles.tagMine}>Your team</Text> : null}
                </View>
              </View>
              <FlatList
                data={team.roster}
                keyExtractor={(p) => String(p._id)}
                renderItem={({item:pl, index}) => (
                  <View style={styles.playerRow}>
                    <Text>{pl.name} — {pl.position}</Text>
                    {canEdit ? (
                      <TouchableOpacity onPress={() => openSwap(team._id, index)}>
                        <Text style={{color: colors.accent}}>Swap</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                )}
              />
            </View>
          );
        }}
      />

      <Modal visible={swapModal.visible} animationType='slide'>
        <SafeAreaView style={{flex:1, padding:16, backgroundColor:colors.bg}} edges={['top','left','right']}>
          <View style={{flexDirection:'row', alignItems:'center', marginBottom:8}}>
            <Icon name="swap-horizontal" size={22} color={colors.accent} />
            <Text style={{fontSize:18, fontWeight:'700', marginLeft:8, color:colors.dark}}>Choose replacement player</Text>
          </View>
          <FlatList
            data={players.filter(p => {
              // exclude players already on any roster in this league
              const allRosterIds = league.teams.flatMap(t => t.roster.map(r => String(r._id || r)));
              return !allRosterIds.includes(String(p._id));
            })}
            keyExtractor={p => String(p._id)}
            renderItem={({item}) => (
              <TouchableOpacity style={{padding:12, borderBottomWidth:1, borderColor:colors.border, backgroundColor:colors.card}} onPress={() => doSwap(item)}>
                <Text style={{fontWeight:'600', color:colors.dark}}>{item.name}</Text>
                <Text style={{color:colors.muted}}>{item.position}</Text>
              </TouchableOpacity>
            )}
          />
          <View style={{height:12}} />
          <Button color={colors.accent} title="Close" onPress={() => setSwapModal({ visible:false, teamId:null, replaceIndex:null })} />
        </SafeAreaView>
      </Modal>

      <View style={{height:12}} />
      <Button color={colors.accent} title="Sign out" onPress={() => { if(typeof onSignOut === 'function') onSignOut(); else navigation.replace('Login'); }} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {flex:1, padding:12, backgroundColor:colors.bg},
  header: {flexDirection:'row', alignItems:'center', marginBottom:12},
  title: {fontSize:22, fontWeight:'700', marginLeft:8, color:colors.dark},
  subtitle: {fontSize:18, fontWeight:'600', marginTop:12, color:colors.dark},
  teamRow: {padding:12, borderBottomWidth:1, borderColor:colors.border, backgroundColor:colors.card, marginBottom:8, borderRadius:8},
  teamName: {fontWeight:'700', color:colors.dark},
  teamOwners: {color:colors.muted},
  tagMine: {color: colors.accent, fontWeight:'700', fontSize:12, marginTop:2},
  tagViewOnly: {color: colors.muted, fontSize:12, marginTop:2},
  playerRow: {padding:8, borderBottomWidth:1, borderColor:'#fafafa'}
});
