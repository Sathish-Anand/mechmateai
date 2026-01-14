import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const LoadingScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Image
          source={require('../../assets/logo_heart_black.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
        <Text style={styles.logoText}>Mechmate AI</Text>
        <ActivityIndicator size="large" color="#2C8AA6" style={styles.loader} />
        <Text style={styles.loadingText}>Loading...</Text>
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  logoImage: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2C8AA6', // Teal color from logo
    marginBottom: 30,
  },
  loader: {
    marginVertical: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#bdc3c7',
    marginTop: 20,
  },
});

export default LoadingScreen;