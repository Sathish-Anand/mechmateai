import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../utils/supabase';
import { diagnosisService } from '../../services/diagnosisService';
import { vehicleService } from '../../services/vehicleService';

interface AccountScreenProps {
  navigation: any;
}

const AccountScreen: React.FC<AccountScreenProps> = ({ navigation }) => {
  const { user, refreshUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Statistics state
  const [statistics, setStatistics] = useState({
    diagnosesCount: 0,
    vehiclesCount: 0,
    completedDiagnoses: 0,
    loading: true,
  });

  // Usage tracking state
  const [usageInfo, setUsageInfo] = useState({
    usage: { daily_used: 0, weekly_used: 0, total_used: 0 },
    limits: { daily: 1, weekly: 5 },
    planType: 'Basic',
    loading: true,
  });

  // Form state
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    date_of_birth: user?.date_of_birth ? new Date(user.date_of_birth) : null,
  });

  // Load statistics on component mount
  useEffect(() => {
    if (user?.id) {
      fetchStatistics();
      fetchUsageInfo();
    }
  }, [user?.id]);

  const fetchStatistics = async () => {
    try {
      setStatistics(prev => ({ ...prev, loading: true }));

      const [diagnosesCount, vehiclesCount, completedDiagnoses] = await Promise.all([
        diagnosisService.getUserDiagnosisCount(),
        vehicleService.getUserVehicleCount(),
        diagnosisService.getUserCompletedDiagnosisCount(),
      ]);

      setStatistics({
        diagnosesCount,
        vehiclesCount,
        completedDiagnoses,
        loading: false,
      });
    } catch (error) {
      console.error('Error fetching account statistics:', error);
      setStatistics(prev => ({ ...prev, loading: false }));
    }
  };

  const fetchUsageInfo = async () => {
    try {
      setUsageInfo(prev => ({ ...prev, loading: true }));
      const info = await diagnosisService.getUserUsageInfo();
      setUsageInfo({
        ...info,
        loading: false,
      });
    } catch (error) {
      console.error('Error fetching usage info:', error);
      setUsageInfo(prev => ({ ...prev, loading: false }));
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }

    setLoading(true);
    try {
      const updateData: any = {
        name: formData.name.trim(),
        phone: formData.phone.trim() || null,
        date_of_birth: formData.date_of_birth
          ? formData.date_of_birth.toISOString().split('T')[0]
          : null,
      };

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user?.id);

      if (error) throw error;

      await refreshUser();
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Reset form data
    setFormData({
      name: user?.name || '',
      phone: user?.phone || '',
      date_of_birth: user?.date_of_birth ? new Date(user.date_of_birth) : null,
    });
    setIsEditing(false);
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return 'Not set';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleUpgradePress = () => {
    // Navigate back to main tabs and then to Plans tab
    navigation.navigate('MainTabs', { screen: 'Plans' });
  };

  const calculateAge = (birthDate: Date | null): string => {
    if (!birthDate) return 'Not set';
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return `${age - 1} years old`;
    }
    return `${age} years old`;
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setFormData({ ...formData, date_of_birth: selectedDate });
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refreshUser(),
        fetchStatistics(),
        fetchUsageInfo(),
      ]);

      // Update form data with refreshed user data
      setFormData({
        name: user?.name || '',
        phone: user?.phone || '',
        date_of_birth: user?.date_of_birth ? new Date(user.date_of_birth) : null,
      });
    } catch (error) {
      console.error('Error refreshing user data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#2C8AA6']} // Teal color from logo
            tintColor="#2C8AA6" // iOS
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Account Settings</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Profile Picture Section */}
        <View style={styles.profileSection}>
          <View style={styles.profilePicture}>
            {user?.name ? (
              <Text style={styles.profileInitials}>
                {getInitials(user.name)}
              </Text>
            ) : (
              <Image
                source={require('../../../assets/logo_round_white.png')}
                style={styles.profileLogo}
                resizeMode="contain"
              />
            )}
          </View>
          <Text style={styles.profileEmail}>{user?.email}</Text>
          <View style={styles.planBadge}>
            <Text style={styles.planText}>{user?.plan_type || 'Basic'} Plan</Text>
          </View>
        </View>

        {/* Account Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Account Information</Text>
            {!isEditing && (
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => setIsEditing(true)}
              >
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Full Name</Text>
            {isEditing ? (
              <TextInput
                style={styles.textInput}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="Enter your full name"
                placeholderTextColor="#95a5a6"
              />
            ) : (
              <Text style={styles.fieldValue}>{user?.name || 'Not set'}</Text>
            )}
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Phone Number</Text>
            {isEditing ? (
              <TextInput
                style={styles.textInput}
                value={formData.phone}
                onChangeText={(text) => setFormData({ ...formData, phone: text })}
                placeholder="Enter your phone number"
                placeholderTextColor="#95a5a6"
                keyboardType="phone-pad"
              />
            ) : (
              <Text style={styles.fieldValue}>{user?.phone || 'Not set'}</Text>
            )}
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Date of Birth</Text>
            {isEditing ? (
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.dateButtonText}>
                  {formatDate(formData.date_of_birth)}
                </Text>
              </TouchableOpacity>
            ) : (
              <View>
                <Text style={styles.fieldValue}>
                  {formatDate(user?.date_of_birth ? new Date(user.date_of_birth) : null)}
                </Text>
                {user?.date_of_birth && (
                  <Text style={styles.ageText}>
                    {calculateAge(new Date(user.date_of_birth))}
                  </Text>
                )}
              </View>
            )}
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Email Address</Text>
            <Text style={styles.fieldValue}>{user?.email}</Text>
            <Text style={styles.fieldNote}>Email cannot be changed</Text>
          </View>

          {isEditing && (
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancel}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, loading && styles.disabledButton]}
                onPress={handleSave}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Account Statistics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Statistics</Text>

          <View style={styles.statsContainer}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                {statistics.loading ? (
                  <ActivityIndicator color="#2C8AA6" size="small" />
                ) : (
                  <Text style={styles.statValue}>{statistics.diagnosesCount}</Text>
                )}
                <Text style={styles.statLabel}>Total Diagnoses</Text>
              </View>
              <View style={styles.statItem}>
                {statistics.loading ? (
                  <ActivityIndicator color="#2C8AA6" size="small" />
                ) : (
                  <Text style={styles.statValue}>{statistics.completedDiagnoses}</Text>
                )}
                <Text style={styles.statLabel}>Completed</Text>
              </View>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                {statistics.loading ? (
                  <ActivityIndicator color="#2C8AA6" size="small" />
                ) : (
                  <Text style={styles.statValue}>{statistics.vehiclesCount}</Text>
                )}
                <Text style={styles.statLabel}>Vehicles Added</Text>
              </View>
              <View style={styles.statItem}>
                {statistics.loading ? (
                  <ActivityIndicator color="#2C8AA6" size="small" />
                ) : (
                  <Text style={styles.statValue}>{user?.created_at ? Math.floor((new Date().getTime() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 0}</Text>
                )}
                <Text style={styles.statLabel}>Days Member</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Usage Tracking */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Usage Tracking</Text>

          {usageInfo.loading ? (
            <View style={styles.usageLoadingContainer}>
              <ActivityIndicator color="#2C8AA6" size="small" />
              <Text style={styles.usageLoadingText}>Loading usage data...</Text>
            </View>
          ) : (
            <View style={styles.usageStats}>
              <View style={styles.usageRow}>
                <Text style={styles.usageLabel}>Daily:</Text>
                <Text style={styles.usageValue}>
                  {usageInfo.usage.daily_used}/{
                    (usageInfo.planType === 'Performance' || usageInfo.planType === 'Ultimate')
                      ? usageInfo.limits.weekly
                      : (usageInfo.limits.daily === 999 ? '∞' : usageInfo.limits.daily)
                  }
                </Text>
                <View style={styles.usageBar}>
                  <View
                    style={[
                      styles.usageProgress,
                      {
                        width: (usageInfo.planType === 'Performance' || usageInfo.planType === 'Ultimate')
                          ? `${Math.min((usageInfo.usage.daily_used / usageInfo.limits.weekly) * 100, 100)}%`
                          : (usageInfo.limits.daily === 999 ? '5%' :
                             `${Math.min((usageInfo.usage.daily_used / usageInfo.limits.daily) * 100, 100)}%`)
                      }
                    ]}
                  />
                </View>
              </View>

              <View style={styles.usageRow}>
                <Text style={styles.usageLabel}>
                  {usageInfo.planType === 'Performance' || usageInfo.planType === 'Ultimate' ? 'Monthly:' : 'Weekly:'}
                </Text>
                <Text style={styles.usageValue}>
                  {usageInfo.usage.weekly_used}/{usageInfo.limits.weekly}
                </Text>
                <View style={styles.usageBar}>
                  <View
                    style={[
                      styles.usageProgress,
                      {
                        width: `${Math.min((usageInfo.usage.weekly_used / usageInfo.limits.weekly) * 100, 100)}%`
                      }
                    ]}
                  />
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Plan Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Plan</Text>

          <View style={styles.planInfo}>
            <View style={styles.planHeader}>
              <Text style={styles.planName}>{user?.plan_type || 'Basic'} Plan</Text>
              {user?.plan_type === 'Ultimate' ? (
                <View style={styles.ultimateBadge}>
                  <Text style={styles.ultimateText}>Premium ✨</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.upgradeBadge}
                  onPress={handleUpgradePress}
                >
                  <Text style={styles.upgradeText}>Upgrade</Text>
                </TouchableOpacity>
              )}
            </View>

            <Text style={styles.planDescription}>
              {user?.plan_type === 'Basic' && 'Free plan with basic features'}
              {user?.plan_type === 'Essential' && '$5/day with full diagnosis features'}
              {user?.plan_type === 'Performance' && '$20/month with 50 diagnoses, no daily limits'}
              {user?.plan_type === 'Ultimate' && '$50/month with 200 diagnoses, video uploads, all premium features'}
            </Text>
          </View>
        </View>

        {/* Date Picker Modal */}
        {showDatePicker && (
          <DateTimePicker
            value={formData.date_of_birth || new Date()}
            mode="date"
            display="default"
            onChange={onDateChange}
            maximumDate={new Date()}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a2332',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 0, // No top padding below nav
    paddingBottom: 20,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonText: {
    color: '#2C8AA6',
    fontSize: 16,
    fontWeight: '500',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ecf0f1',
  },
  placeholder: {
    width: 50,
  },
  profileSection: {
    alignItems: 'center',
    paddingTop: 10, // Reduced top padding
    paddingBottom: 20,
    marginBottom: 30,
  },
  profilePicture: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2C8AA6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileInitials: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  profileLogo: {
    width: 50,
    height: 50,
  },
  profileEmail: {
    color: '#bdc3c7',
    fontSize: 16,
    marginBottom: 8,
  },
  planBadge: {
    backgroundColor: '#2C8AA6',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  planText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#2c3e50',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ecf0f1',
  },
  editButton: {
    backgroundColor: '#2C8AA6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: {
    color: '#bdc3c7',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  fieldValue: {
    color: '#ecf0f1',
    fontSize: 16,
  },
  fieldNote: {
    color: '#95a5a6',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
  textInput: {
    backgroundColor: '#34495e',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#ecf0f1',
    borderWidth: 1,
    borderColor: '#34495e',
  },
  dateButton: {
    backgroundColor: '#34495e',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#34495e',
  },
  dateButtonText: {
    color: '#ecf0f1',
    fontSize: 16,
  },
  ageText: {
    color: '#2C8AA6',
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 10,
  },
  cancelButton: {
    backgroundColor: '#95a5a6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#27ae60',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  statsContainer: {
    gap: 15,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    backgroundColor: '#34495e',
    borderRadius: 8,
    padding: 15,
    flex: 1,
    marginHorizontal: 5,
  },
  statValue: {
    color: '#2C8AA6',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    color: '#bdc3c7',
    fontSize: 14,
  },
  planInfo: {
    backgroundColor: '#34495e',
    borderRadius: 8,
    padding: 16,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  planName: {
    color: '#ecf0f1',
    fontSize: 18,
    fontWeight: '600',
  },
  upgradeBadge: {
    backgroundColor: '#e74c3c',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  upgradeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  ultimateBadge: {
    backgroundColor: '#F4B942',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ultimateText: {
    color: '#1a2332',
    fontSize: 12,
    fontWeight: '700',
  },
  planDescription: {
    color: '#bdc3c7',
    fontSize: 14,
  },
  // Usage Tracking Styles
  usageLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  usageLoadingText: {
    color: '#bdc3c7',
    fontSize: 14,
    marginLeft: 10,
  },
  usageStats: {
    gap: 15,
  },
  usageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  usageLabel: {
    color: '#bdc3c7',
    fontSize: 14,
    fontWeight: '500',
    minWidth: 60,
  },
  usageValue: {
    color: '#ecf0f1',
    fontSize: 14,
    fontWeight: '600',
    minWidth: 50,
  },
  usageBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#34495e',
    borderRadius: 4,
    overflow: 'hidden',
  },
  usageProgress: {
    height: '100%',
    backgroundColor: '#2C8AA6',
    borderRadius: 4,
  },
});

export default AccountScreen;