import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';

const EmailVerificationScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const email = route.params?.email || 'your email';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>📧</Text>
        </View>

        <Text style={styles.title}>Check Your Email</Text>

        <Text style={styles.subtitle}>
          We've sent a verification link to:
        </Text>

        <Text style={styles.email}>{email}</Text>

        <View style={styles.instructionsContainer}>
          <Text style={styles.instructions}>
            1. Check your email inbox (and spam folder)
          </Text>
          <Text style={styles.instructions}>
            2. Click the verification link in the email
          </Text>
          <Text style={styles.instructions}>
            3. Return here and tap "Go to Login"
          </Text>
        </View>

        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.loginButtonText}>Go to Login</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate('Landing')}
        >
          <Text style={styles.backButtonText}>← Back to Home</Text>
        </TouchableOpacity>

        <View style={styles.helpContainer}>
          <Text style={styles.helpText}>
            Didn't receive the email? Check your spam folder or try registering again.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a2332',
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    paddingVertical: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 30,
  },
  icon: {
    fontSize: 64,
    textAlign: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ecf0f1',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#bdc3c7',
    textAlign: 'center',
    marginBottom: 10,
  },
  email: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C8AA6',
    textAlign: 'center',
    marginBottom: 30,
  },
  instructionsContainer: {
    marginBottom: 30,
    alignSelf: 'stretch',
  },
  instructions: {
    fontSize: 16,
    color: '#bdc3c7',
    marginVertical: 5,
    paddingLeft: 10,
  },
  loginButton: {
    backgroundColor: '#E55A4F',
    borderRadius: 8,
    paddingVertical: 15,
    paddingHorizontal: 40,
    marginVertical: 20,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 30,
  },
  backButtonText: {
    color: '#2C8AA6',
    fontSize: 16,
  },
  helpContainer: {
    backgroundColor: '#34495e',
    borderRadius: 8,
    padding: 15,
    marginTop: 20,
  },
  helpText: {
    color: '#95a5a6',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default EmailVerificationScreen;