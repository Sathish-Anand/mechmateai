import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

const LandingScreen = () => {
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Image
            source={require('../../assets/logo_no_background_square.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.subtitle}>
            Your AI-powered vehicle health assistant
          </Text>
        </View>

        {/* Main Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.primaryButtonText}>Login</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.secondaryButtonText}>Sign Up</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.guestButton]}
            onPress={() => navigation.navigate('GuestDiagnosis')}
          >
            <Text style={styles.guestButtonText}>Try Diagnosis (Guest)</Text>
          </TouchableOpacity>
        </View>

        {/* Features */}
        <View style={styles.featuresContainer}>
          <Text style={styles.featuresTitle}>Features:</Text>
          <View style={styles.featuresList}>
            <Text style={styles.featureItem}>• AI-powered vehicle diagnosis</Text>
            <Text style={styles.featureItem}>• Maintenance logbook</Text>
            <Text style={styles.featureItem}>• Vehicle management</Text>
            <Text style={styles.featureItem}>• YouTube repair guides</Text>
            <Text style={styles.featureItem}>• Parts recommendations</Text>
          </View>
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
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 50,
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#bdc3c7',
    textAlign: 'center',
    lineHeight: 24,
  },
  actionsContainer: {
    marginBottom: 40,
  },
  button: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    marginVertical: 8,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#2C8AA6', // Teal color from logo
  },
  secondaryButton: {
    backgroundColor: '#E55A4F', // Orange color from logo
  },
  guestButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#F4B942', // Yellow color from logo
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  guestButtonText: {
    color: '#F4B942', // Yellow color from logo to match border
    fontSize: 16,
    fontWeight: '600',
  },
  featuresContainer: {
    alignItems: 'center',
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ecf0f1',
    marginBottom: 15,
  },
  featuresList: {
    alignSelf: 'stretch',
  },
  featureItem: {
    color: '#bdc3c7',
    fontSize: 14,
    marginVertical: 4,
    paddingLeft: 10,
  },
});

export default LandingScreen;