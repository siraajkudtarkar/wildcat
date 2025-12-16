import {useState} from 'react';
import {View, Text, TextInput, StyleSheet, Alert, TouchableOpacity} from 'react-native';
import { colors, Icon } from '../styles/Theme';
// import mockApi from '../api/mockApi';
import authClient from '../api/authClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import serverClient from '../api/serverClient';
import { Modal, ScrollView } from 'react-native';
import PrimaryButton from '../components/PrimaryButton';

export default function SignupScreen({navigation, onSignup}){
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [showPlayerPicker, setShowPlayerPicker] = useState(false);
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const [selectedRoster, setSelectedRoster] = useState([]);

  const handleSignup = async () => {
    setLoading(true);
    try{
      const rosterIds = selectedRoster.map(p => String(p._id));
      const res = await authClient.signup({email, password, displayName: email, teamName, roster: rosterIds});
      if(res?.token){
        await AsyncStorage.setItem('wildcat_token', res.token);
        await AsyncStorage.setItem('wildcat_user', JSON.stringify(res.user));
        // If server returned created league, you can store/use it as needed
        if(typeof onSignup === 'function'){
          onSignup(res.user);
        } else {
          navigation.replace('Home');
        }
      } else {
        Alert.alert('Signup failed', res?.error || 'Unknown error');
      }
    } catch(err){
      Alert.alert('Error', err.message || String(err));
    } finally{
      setLoading(false);
    }
  }

  const openPlayerPicker = async () => {
    setShowPlayerPicker(true);
    try{
      // Fetch persisted players (top 30 metadata by default)
      const data = await serverClient.getPlayers({limit:30});
      setAvailablePlayers(data || []);
    } catch(err){
      console.warn('Failed to load players', err);
    }
  };

  const toggleSelectPlayer = (player) => {
    setSelectedRoster(prev => {
      const id = String(player._id || player.id || player.name);
      const exists = prev.find(p => String(p._id || p.id || p.name) === id);
      if(exists) return prev.filter(p => String(p._id || p.id || p.name) !== id);
      if(prev.length >= 6) return prev; // max 6
      return [...prev, player];
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Icon name="account-plus" size={30} color={colors.accent} />
        <Text style={styles.title}>Create account</Text>
      </View>
      <TextInput
        value={teamName}
        onChangeText={setTeamName}
        placeholder="Team name (optional)"
        style={styles.input}
      />
      <TouchableOpacity onPress={openPlayerPicker} style={{marginBottom:12}}>
        <Text style={{color:colors.accent}}>Pick players for your team (max 6)</Text>
      </TouchableOpacity>
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        style={styles.input}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        style={styles.input}
        secureTextEntry={true}
      />
      <PrimaryButton
        title={loading ? 'Creating...' : 'Create account'}
        onPress={handleSignup}
        disabled={loading}
        style={styles.primary}
      />

      <Modal visible={showPlayerPicker} animationType="slide">
        <View style={{flex:1, padding:12}}>
          <Text style={{fontSize:18, fontWeight:'700'}}>Select up to 6 players</Text>
          <ScrollView style={{marginTop:12}}>
            {availablePlayers.map(p => {
              const id = p._id || p.id || p.name;
              const selected = selectedRoster.find(sp => String(sp._id || sp.id || sp.name) === String(id));
              return (
                <TouchableOpacity key={id} onPress={() => toggleSelectPlayer(p)} style={{padding:10, borderBottomWidth:1, borderColor:'#eee', flexDirection:'row', justifyContent:'space-between'}}>
                  <Text>{p.name} ({p.position})</Text>
                  <Text style={{color: selected ? '#007AFF' : '#666'}}>{selected ? 'Selected' : 'Tap to select'}</Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>
          <View style={{flexDirection:'row', justifyContent:'space-between', paddingVertical:12}}>
            <PrimaryButton title="Done" onPress={() => setShowPlayerPicker(false)} style={{flex:1, marginRight:8}} />
            <PrimaryButton title="Clear" onPress={() => setSelectedRoster([])} style={{flex:1, marginLeft:8, backgroundColor: colors.card}} textStyle={{color: colors.dark}} />
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {flex:1, padding:20, justifyContent:'center', backgroundColor:colors.bg},
  header: {flexDirection:'row', alignItems:'center', justifyContent:'center', marginBottom:12},
  title: {fontSize:22, fontWeight:'700', textAlign:'center', marginLeft:8, color:colors.dark},
  input: {borderWidth:1, borderColor:colors.border, padding:12, borderRadius:6, marginBottom:12, backgroundColor:colors.card},
  primary: {marginTop:4, marginBottom:12}
});
