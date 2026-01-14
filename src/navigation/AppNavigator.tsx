import React from 'react';
import { Text, View } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useRoute } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';

// Auth Screens
import LandingScreen from '../screens/LandingScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import EmailVerificationScreen from '../screens/auth/EmailVerificationScreen';

// Main App Screens
import HomeScreen from '../screens/main/HomeScreen';
import DiagnosisScreen from '../screens/main/DiagnosisScreen';
import LogbookScreen from '../screens/main/LogbookScreen';
import GarageScreen from '../screens/main/GarageScreen';
import PlansScreen from '../screens/main/PlansScreen';
import AccountScreen from '../screens/main/AccountScreen';

// Guest Screens
import GuestDiagnosisScreen from '../screens/guest/GuestDiagnosisScreen';

// Components
import LoadingScreen from '../components/LoadingScreen';
import TopNavigation from '../components/TopNavigation';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const AuthNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Landing" component={LandingScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
      <Stack.Screen name="GuestDiagnosis" component={GuestDiagnosisScreen} />
    </Stack.Navigator>
  );
};


const MainTabsWrapper = ({ navigation }: any) => {
  const [currentTab, setCurrentTab] = React.useState('Home');

  const getTitleForRoute = (routeName: string) => {
    switch (routeName) {
      case 'Home':
        return 'MechMate AI';
      case 'Garage':
        return 'Garage';
      case 'Diagnosis':
        return 'Diagnosis';
      case 'Logbook':
        return 'Logbook';
      case 'Plans':
        return 'Premium';
      default:
        return 'MechMate AI';
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <TopNavigation
        onAccountPress={() => navigation.navigate('Account')}
        title={getTitleForRoute(currentTab)}
        layout="center"
      />
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#2c3e50',
            borderTopColor: '#34495e',
          },
          tabBarActiveTintColor: '#2C8AA6',
          tabBarInactiveTintColor: '#95a5a6',
        }}
        screenListeners={{
          state: (e) => {
            const state = e.data.state;
            if (state) {
              const routeName = state.routes[state.index].name;
              setCurrentTab(routeName);
            }
          }
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            title: 'Home',
            tabBarIcon: ({ focused }) => (
              <Text style={{ fontSize: 22 }}>{focused ? '🏠' : '🏡'}</Text>
            ),
          }}
        />
        <Tab.Screen
          name="Garage"
          component={GarageScreen}
          options={{
            title: 'Garage',
            tabBarIcon: ({ focused }) => (
              <Text style={{ fontSize: 22 }}>{focused ? '🚗' : '🚙'}</Text>
            ),
          }}
        />
        <Tab.Screen
          name="Diagnosis"
          component={DiagnosisScreen}
          options={{
            title: 'Diagnose',
            tabBarIcon: ({ focused }) => (
              <Text style={{ fontSize: 22 }}>{focused ? '🔍' : '🛠️'}</Text>
            ),
          }}
        />
        <Tab.Screen
          name="Logbook"
          component={LogbookScreen}
          options={{
            title: 'Logbook',
            tabBarIcon: ({ focused }) => (
              <Text style={{ fontSize: 22 }}>{focused ? '📖' : '📔'}</Text>
            ),
          }}
        />
        <Tab.Screen
          name="Plans"
          component={PlansScreen}
          options={{
            title: 'Premium',
            tabBarIcon: ({ focused }) => (
              <Text style={{ fontSize: 22 }}>{focused ? '💍' : '💎'}</Text>
            ),
          }}
        />
      </Tab.Navigator>
    </View>
  );
};

const MainStackNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabsWrapper} />
      <Stack.Screen
        name="Account"
        component={AccountScreen}
        options={{
          headerShown: false,
          presentation: 'modal'
        }}
      />
    </Stack.Navigator>
  );
};

const AppNavigator = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <Stack.Screen name="MainStack" component={MainStackNavigator} />
      ) : (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;