import {useState} from 'react';
import {View, Text, TextInput, TouchableOpacity, StyleSheet, Alert} from 'react-native';
import Theme, { colors, Icon } from '../styles/Theme';
import authClient from '../api/authClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PrimaryButton from '../components/PrimaryButton';

export default function LoginScreen({navigation, onLogin}){
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try{
      // call server auth
      const res = await authClient.login({email, password});
      // res: { token, user }
      if(res?.token){
        await AsyncStorage.setItem('wildcat_token', res.token);
        await AsyncStorage.setItem('wildcat_user', JSON.stringify(res.user));
        if(typeof onLogin === 'function'){
          onLogin(res.user);
        } else {
          navigation.replace('Home');
        }
      } else {
        Alert.alert('Login failed', res?.error || 'Unknown error');
      }
    } catch(err){
      Alert.alert('Error', err.message || String(err));
    } finally{
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Icon name="football" size={26} color={colors.accent} />
        <Text style={styles.title}>Wildcat Fantasy</Text>
      </View>
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
        title={loading ? 'Logging in...' : 'Login'}
        onPress={handleLogin}
        disabled={loading}
        style={styles.primary}
      />
      <TouchableOpacity onPress={() => navigation.navigate('Signup')} style={styles.linkBtn}>
        <Text style={styles.linkTxt}>Sign up</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {flex:1, padding:20, justifyContent:'center', backgroundColor:colors.bg},
  header: {flexDirection:'row', alignItems:'center', justifyContent:'center', marginBottom:12},
  title: {fontSize:20, fontWeight:'700', textAlign:'center', marginLeft:8, color:colors.dark},
  input: {borderWidth:1, borderColor:colors.border, padding:12, borderRadius:6, marginBottom:12, backgroundColor:colors.card},
  primary: {marginTop:4, marginBottom:12},
  linkBtn: {alignSelf:'center'},
  linkTxt: {color: colors.accent, fontWeight:'700'}
});
