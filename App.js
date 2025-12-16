import { useState, useEffect } from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import HomeScreen from './screens/HomeScreen';
import MatchupScreen from './screens/MatchupScreen';
import LeaderboardScreen from './screens/LeaderboardScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
// import authClient from './api/authClient';
import { Icon, colors } from './styles/Theme';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs({user, onSignOut}){
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        headerShown:false,
        tabBarActiveTintColor: colors.dark,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
        tabBarIcon: ({color, size}) => {
          const name = route.name === 'Home' ? 'home' : route.name === 'Matchup' ? 'football' : 'podium';
          return <Icon name={name} size={size || 20} color={color} />;
        }
      })}
    >
      <Tab.Screen name="Home">
        {props => <HomeScreen {...props} user={user} onSignOut={onSignOut} />}
      </Tab.Screen>
      <Tab.Screen name="Matchup">
        {props => <MatchupScreen {...props} user={user} />}
      </Tab.Screen>
      <Tab.Screen name="Leaderboard" component={LeaderboardScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async ()=>{
      try{
        const storedUser = await AsyncStorage.getItem('wildcat_user');
        if(storedUser && mounted){
          try{
            setUser(JSON.parse(storedUser));
          }catch(e){
            console.warn('Failed to parse stored user', e);
          }
        }
      } catch(err){
        console.warn('Failed to load stored credentials', err);
      } finally{
        if(mounted) setLoading(false);
      }
    })();
    return ()=>{ mounted=false };
  }, []);

  if (loading) return null;

  const authHeaderOptions = {
    headerStyle:{ backgroundColor: colors.bg },
    headerTitleStyle:{ color: colors.dark },
    headerTintColor: colors.dark,
    headerShadowVisible:false
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{flex:1, backgroundColor: colors.bg}} edges={['top','left','right']}>
        <StatusBar backgroundColor={colors.bg} />
        <NavigationContainer>
          <Stack.Navigator
            screenOptions={user ? undefined : authHeaderOptions}
          >
            {user ? (
              <>
                <Stack.Screen name="Main" options={{headerShown:false}}>
                  {props => <MainTabs {...props} user={user} onSignOut={async () => { await AsyncStorage.removeItem('wildcat_token'); await AsyncStorage.removeItem('wildcat_user'); setUser(null); }} />}
                </Stack.Screen>
              </>
            ) : (
              <>
                <Stack.Screen name="Login">
                  {props => <LoginScreen {...props} onLogin={u => setUser(u)} />}
                </Stack.Screen>
                <Stack.Screen name="Signup">
                  {props => <SignupScreen {...props} onSignup={u => setUser(u)} />}
                </Stack.Screen>
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
