import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { StripeProvider } from '@stripe/stripe-react-native';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';

// Stripe publishable key (you can move this to env config later)
const STRIPE_PUBLISHABLE_KEY = 'pk_test_51SqtewRQg4El5TTrqih4l2LAHEiKv0NLBZCS74kxM5tzsvL3Toj6e4QDZlcURQ3gmxr72Y6dDYooQEuIe0gk1And00nospOCSX';

export default function App() {
  console.log('💰 App: Initializing with Stripe publishable key:', STRIPE_PUBLISHABLE_KEY ? 'Present' : 'Missing');

  return (
    <SafeAreaProvider>
      <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
        <AuthProvider>
          <NavigationContainer>
            <AppNavigator />
            <StatusBar style="auto" />
          </NavigationContainer>
        </AuthProvider>
      </StripeProvider>
    </SafeAreaProvider>
  );
}
