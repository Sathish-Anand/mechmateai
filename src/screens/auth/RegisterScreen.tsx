import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';

const RegisterScreen = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    password: '',
    confirmPassword: '',
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation<any>();
  const { register } = useAuth();

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) {
      setSelectedDate(date);
      const formattedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD format
      updateField('dateOfBirth', formattedDate);
    }
  };

  const showDatePickerModal = () => {
    setShowDatePicker(true);
  };

  const handleRegister = async () => {
    // Basic frontend validation
    if (!formData.name || !formData.email || !formData.phone || !formData.dateOfBirth || !formData.password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      console.log('Starting registration for:', formData.email);
      await register({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        dateOfBirth: formData.dateOfBirth,
        password: formData.password,
      });

      console.log('Registration successful, waiting for auto-navigation to home');
      // User will be automatically navigated to home screen by AuthContext
    } catch (error: any) {
      console.log('Registration error:', error.message);
      Alert.alert('Registration Failed', error.message || 'Please try again');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.logoContainer}>
          <Image
            source={require('../../../assets/logo_no_background_square.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join MechMate AI today</Text>

        <TextInput
          style={styles.input}
          placeholder="Full Name"
          placeholderTextColor="#95a5a6"
          value={formData.name}
          onChangeText={(value) => updateField('name', value)}
        />

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#95a5a6"
          value={formData.email}
          onChangeText={(value) => updateField('email', value)}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Phone Number"
          placeholderTextColor="#95a5a6"
          value={formData.phone}
          onChangeText={(value) => updateField('phone', value)}
          keyboardType="phone-pad"
        />

        <TouchableOpacity style={styles.dateInput} onPress={showDatePickerModal}>
          <Text style={[styles.dateText, !formData.dateOfBirth && styles.placeholderText]}>
            {formData.dateOfBirth ? new Date(formData.dateOfBirth).toLocaleDateString() : 'Date of Birth'}
          </Text>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
            maximumDate={new Date()}
            minimumDate={new Date(1940, 0, 1)}
          />
        )}

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#95a5a6"
          value={formData.password}
          onChangeText={(value) => updateField('password', value)}
          secureTextEntry
        />

        <TextInput
          style={styles.input}
          placeholder="Confirm Password"
          placeholderTextColor="#95a5a6"
          value={formData.confirmPassword}
          onChangeText={(value) => updateField('confirmPassword', value)}
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.disabledButton]}
          onPress={handleRegister}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Creating Account...' : 'Create Account'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.linkText}>← Back to Home</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a2332',
  },
  scrollContent: {
    paddingHorizontal: 30,
    paddingVertical: 50,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: {
    width: 100,
    height: 100,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ecf0f1',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#bdc3c7',
    textAlign: 'center',
    marginBottom: 40,
  },
  input: {
    backgroundColor: '#34495e',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 15,
    marginVertical: 8,
    fontSize: 16,
    color: '#ecf0f1',
  },
  button: {
    backgroundColor: '#E55A4F', // Orange color from logo
    borderRadius: 8,
    paddingVertical: 15,
    marginVertical: 20,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  linkText: {
    color: '#F4B942', // Yellow color from logo
    fontSize: 16,
  },
  dateInput: {
    backgroundColor: '#34495e',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 15,
    marginVertical: 8,
    justifyContent: 'center',
  },
  dateText: {
    fontSize: 16,
    color: '#ecf0f1',
  },
  placeholderText: {
    color: '#95a5a6',
  },
});

export default RegisterScreen;