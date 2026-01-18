import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../utils/supabase';
import { getSafeAreaPadding, getTouchableMinSize, getAndroidPerformanceProps } from '../../utils/androidHelpers';
import { diagnosisService } from '../../services/diagnosisService';

const HomeScreen = () => {
  const { user } = useAuth();
  const navigation = useNavigation<any>();

  // State management
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [defaultVehicle, setDefaultVehicle] = useState<any>(null);
  const [serviceReminder, setServiceReminder] = useState<any>(null);
  const [stats, setStats] = useState({
    totalVehicles: 0,
    thisMonthDiagnoses: 0,
    thisMonthServices: 0,
  });

  // Usage tracking state
  const [usageInfo, setUsageInfo] = useState({
    usage: { daily_used: 0, weekly_used: 0, total_used: 0 },
    limits: { daily: 1, weekly: 5 },
    planType: 'Basic',
    loading: true,
  });

  // Quick actions with navigation (reordered: View Garage, Diagnose Issue, Logbook)
  const quickActions = [
    {
      title: 'View Garage',
      icon: '🚗',
      action: () => navigation.navigate('Garage'),
      color: '#2C8AA6' // Teal color (1st tile)
    },
    {
      title: 'Diagnose Issue',
      icon: '🔍',
      action: () => navigation.navigate('Diagnosis'),
      color: '#E55A4F' // Red color (2nd tile)
    },
    {
      title: 'Logbook',
      icon: '📖',
      action: () => navigation.navigate('Logbook'),
      color: '#F4B942' // Yellow color (3rd tile)
    },
  ];

  // Fetch vehicle data and service history
  useEffect(() => {
    if (user?.id) {
      fetchDashboardData();
    }
  }, [user?.id]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchDefaultVehicle(),
        fetchStats(),
        fetchUsageInfo(),
      ]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
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

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Reset states
      setDefaultVehicle(null);
      setServiceReminder(null);

      // Fetch fresh data
      await Promise.all([
        fetchDefaultVehicle(),
        fetchStats(),
        fetchUsageInfo(),
      ]);
    } catch (error) {
      console.error('Error refreshing dashboard data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchDefaultVehicle = async () => {
    try {
      // Guard against undefined user ID
      if (!user?.id) {
        console.log('No user ID available, skipping vehicle fetch');
        return;
      }

      // Fetch default vehicle (or first vehicle if no default set)
      const { data: vehicles, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(1);

      if (error) throw error;

      if (vehicles && vehicles.length > 0) {
        const vehicle = vehicles[0];
        setDefaultVehicle(vehicle);
        await calculateServiceReminder(vehicle);
      }
    } catch (error) {
      console.error('Error fetching default vehicle:', error);
    }
  };

  const calculateServiceReminder = async (vehicle: any) => {
    try {
      // Fetch latest service entry
      const { data: services, error } = await supabase
        .from('logbook_entries')
        .select('*')
        .eq('vehicle_id', vehicle.id)
        .eq('service_type', 'MAINTENANCE')
        .order('date', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (services && services.length > 0) {
        const lastService = services[0];
        const lastServiceDate = new Date(lastService.date);
        const currentDate = new Date();
        const sixMonthsLater = new Date(lastServiceDate);
        sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);

        const odometerDiff = vehicle.odometer - (lastService.odometer || 0);
        const daysDiff = Math.ceil((sixMonthsLater.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));

        let serviceStatus = 'upcoming'; // 'overdue', 'urgent', 'upcoming'
        let dayCount = daysDiff;
        let displayText = '';
        let nextServiceDate = sixMonthsLater.toLocaleDateString();

        // Check if service is overdue (date-based or km-based)
        const dateBasedDue = daysDiff <= 0;
        const kmBasedDue = odometerDiff >= 6000;

        if (dateBasedDue || kmBasedDue) {
          serviceStatus = 'overdue';
          dayCount = Math.abs(daysDiff);
          displayText = 'OVERDUE';
          nextServiceDate = 'Schedule Now';
        } else if (daysDiff <= 10) {
          serviceStatus = 'urgent';
          dayCount = daysDiff;
          displayText = 'DAYS LEFT';
        } else {
          serviceStatus = 'upcoming';
          dayCount = daysDiff;
          displayText = 'DAYS LEFT';
        }

        setServiceReminder({
          vehicle,
          type: 'HAS_HISTORY',
          serviceStatus,
          dayCount,
          displayText,
          nextServiceDate,
          lastServiceDate: lastService.date,
          lastServiceOdometer: lastService.odometer,
          daysDiff,
          kmDiff: odometerDiff,
        });
      } else {
        // No service history
        setServiceReminder({
          vehicle,
          type: 'NO_HISTORY',
          serviceStatus: 'overdue',
          dayCount: 0,
          displayText: 'SERVICE NOW',
          nextServiceDate: 'Update Logbook',
          isOverdue: false,
        });
      }
    } catch (error) {
      console.error('Error calculating service reminder:', error);
    }
  };

  const fetchStats = async () => {
    try {
      // Guard against undefined user ID
      if (!user?.id) {
        console.log('No user ID available, skipping stats fetch');
        return;
      }

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      // Count total vehicles
      const { count: vehicleCount } = await supabase
        .from('vehicles')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Count this month's diagnoses
      const { count: diagnosesCount } = await supabase
        .from('diagnoses')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`)
        .lt('created_at', `${currentYear}-${String(currentMonth + 2).padStart(2, '0')}-01`);

      // Count this month's services
      const { count: servicesCount } = await supabase
        .from('logbook_entries')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('date', `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`)
        .lt('date', `${currentYear}-${String(currentMonth + 2).padStart(2, '0')}-01`);

      setStats({
        totalVehicles: vehicleCount || 0,
        thisMonthDiagnoses: diagnosesCount || 0,
        thisMonthServices: servicesCount || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const navigateToAddVehicle = () => {
    navigation.navigate('Garage', { showAddVehicle: true });
  };

  const navigateToAddService = () => {
    if (defaultVehicle) {
      navigation.navigate('Logbook', { vehicleId: defaultVehicle.id, showAddService: true });
    } else {
      Alert.alert('No Vehicle', 'Please add a vehicle first to record service history.');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2C8AA6" />
          <Text style={styles.loadingText}>Loading your dashboard...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#2C8AA6']}
            tintColor="#2C8AA6"
            title="Pull to refresh"
            titleColor="#bdc3c7"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.welcomeText}>Welcome back, {user?.name}!</Text>
          <Text style={styles.planText}>Plan: {user?.plan_type || 'Basic'}</Text>
        </View>

        {/* Vehicle & Service Section */}
        {defaultVehicle ? (
          <View style={styles.vehicleServiceContainer}>
            <View style={styles.splitContainer}>
              {/* Left Side - Vehicle Info */}
              <View style={styles.vehicleInfoSide}>
                <Text style={styles.vehicleMainTitle}>
                  {defaultVehicle.year} {defaultVehicle.make} {defaultVehicle.model}
                </Text>

                <View style={styles.vehicleDetailRow}>
                  <Text style={styles.vehicleDetailLabel}>Registration:</Text>
                  <Text style={styles.vehicleDetailValue}>{defaultVehicle.registration || 'Not set'}</Text>
                </View>

                <View style={styles.vehicleDetailRow}>
                  <Text style={styles.vehicleDetailLabel}>Odometer:</Text>
                  <Text style={styles.vehicleDetailValue}>
                    {defaultVehicle.odometer?.toLocaleString() || 0} km
                  </Text>
                </View>

                <View style={styles.vehicleMetaInfo}>
                  <View style={styles.vehicleTypeBadge}>
                    <Text style={styles.vehicleTypeBadgeText}>{defaultVehicle.vehicle_type || 'Car'}</Text>
                  </View>
                  <View style={styles.vehicleEngineBadge}>
                    <Text style={styles.vehicleEngineBadgeText}>{defaultVehicle.engine || 'Petrol'}</Text>
                  </View>
                </View>
              </View>

              {/* Right Side - Service Countdown Tile */}
              <View style={styles.serviceCountdownSide}>
                {serviceReminder && (
                  <View style={[
                    styles.serviceCountdownTile,
                    serviceReminder.serviceStatus === 'overdue' && styles.overdueCountdownTile,
                    serviceReminder.serviceStatus === 'urgent' && styles.urgentCountdownTile,
                    serviceReminder.serviceStatus === 'upcoming' && styles.upcomingCountdownTile,
                  ]}>
                    <Text style={styles.serviceReminderTitle}>Service Reminder</Text>
                    <Text style={styles.dayCountNumber}>{serviceReminder.dayCount}</Text>
                    <Text style={styles.dayCountLabel}>{serviceReminder.displayText}</Text>
                    <Text style={styles.serviceDateText}>
                      {serviceReminder.nextServiceDate}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.noVehicleContainer}>
            <Text style={styles.noVehicleIcon}>🚗</Text>
            <Text style={styles.noVehicleTitle}>No Vehicles Added</Text>
            <Text style={styles.noVehicleText}>
              Add your first vehicle to get started with maintenance tracking
            </Text>
            <TouchableOpacity style={styles.addVehicleButton} onPress={navigateToAddVehicle}>
              <Text style={styles.addVehicleButtonText}>+ Add Your First Vehicle</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {quickActions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.actionCard, { borderLeftColor: action.color }]}
                onPress={action.action}
              >
                <Text style={styles.actionIcon}>{action.icon}</Text>
                <Text style={styles.actionTitle}>{action.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>This Month</Text>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { borderLeftColor: '#2C8AA6' }]}>
              <Text style={styles.statNumber}>{stats.thisMonthDiagnoses}</Text>
              <Text style={styles.statLabel}>Diagnoses</Text>
            </View>
            <View style={[styles.statCard, { borderLeftColor: '#E55A4F' }]}>
              <Text style={styles.statNumber}>{stats.thisMonthServices}</Text>
              <Text style={styles.statLabel}>Services</Text>
            </View>
            <View style={[styles.statCard, { borderLeftColor: '#F4B942' }]}>
              <Text style={styles.statNumber}>{stats.totalVehicles}</Text>
              <Text style={styles.statLabel}>Vehicles</Text>
            </View>
          </View>
        </View>

        {/* Usage Tracking */}
        <View style={styles.usageContainer}>
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

              <TouchableOpacity
                style={styles.upgradeButton}
                onPress={() => navigation.navigate('Plans')}
              >
                <Text style={styles.upgradeButtonText}>
                  {usageInfo.planType === 'Basic' ? '⚡ Upgrade Plan' : '📊 View Plan Details'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a2332',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    color: '#bdc3c7',
    fontSize: 16,
    marginTop: 15,
  },
  header: {
    marginBottom: 30,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ecf0f1',
    marginBottom: 5,
  },
  planText: {
    fontSize: 16,
    color: '#2C8AA6',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ecf0f1',
    marginBottom: 15,
  },

  // Vehicle & Service Styles
  vehicleServiceContainer: {
    backgroundColor: '#34495e',
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
  },
  splitContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  vehicleInfoSide: {
    flex: 1,
    paddingRight: 15,
  },
  vehicleMainTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ecf0f1',
    marginBottom: 12,
  },
  vehicleDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  vehicleDetailLabel: {
    fontSize: 14,
    color: '#bdc3c7',
    fontWeight: '500',
  },
  vehicleDetailValue: {
    fontSize: 14,
    color: '#ecf0f1',
    fontWeight: '600',
  },
  vehicleMetaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  vehicleTypeBadge: {
    backgroundColor: '#E55A4F',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  vehicleTypeBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  vehicleEngineBadge: {
    backgroundColor: '#2C8AA6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  vehicleEngineBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },

  // Service Countdown Tile Styles
  serviceCountdownSide: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceCountdownTile: {
    backgroundColor: '#2c3e50',
    borderRadius: 12,
    borderLeftWidth: 4,
    padding: 16,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overdueCountdownTile: {
    borderLeftColor: '#f39c12', // Orange - matching logo
  },
  urgentCountdownTile: {
    borderLeftColor: '#F4B942', // Yellow
  },
  upcomingCountdownTile: {
    borderLeftColor: '#2C8AA6', // Teal
  },
  serviceReminderTitle: {
    fontSize: 10,
    fontWeight: '600',
    color: '#bdc3c7',
    textTransform: 'uppercase',
    marginBottom: 8,
    textAlign: 'center',
  },
  dayCountNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ecf0f1',
    marginBottom: 4,
  },
  dayCountLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#bdc3c7',
    textTransform: 'uppercase',
    marginBottom: 8,
    textAlign: 'center',
  },
  serviceDateText: {
    fontSize: 12,
    color: '#95a5a6',
    textAlign: 'center',
    fontWeight: '500',
  },
  noHistoryCard: {
    backgroundColor: '#34495e',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  noHistoryIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  noHistoryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ecf0f1',
    marginBottom: 10,
  },
  noHistoryText: {
    fontSize: 14,
    color: '#bdc3c7',
    textAlign: 'center',
    marginBottom: 15,
  },
  benefitsContainer: {
    alignSelf: 'stretch',
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  benefitText: {
    fontSize: 14,
    color: '#95a5a6',
    marginVertical: 3,
    textAlign: 'left',
  },
  addServiceButton: {
    backgroundColor: '#E55A4F',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  addServiceButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  reminderCard: {
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  upcomingCard: {
    backgroundColor: '#f39c12',
    borderColor: '#e67e22',
    borderWidth: 1,
  },
  overdueCard: {
    backgroundColor: '#e74c3c',
    borderColor: '#c0392b',
    borderWidth: 1,
  },
  reminderIcon: {
    fontSize: 30,
    marginBottom: 10,
  },
  reminderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  reminderSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '600',
  },
  reminderLastService: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 15,
  },
  suggestedServiceDate: {
    fontSize: 14,
    color: '#2C8AA6',
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 15,
  },
  viewDetailsButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 15,
  },
  viewDetailsButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },

  // No Vehicle Styles
  noVehicleContainer: {
    backgroundColor: '#34495e',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
    marginBottom: 30,
  },
  noVehicleIcon: {
    fontSize: 50,
    marginBottom: 15,
  },
  noVehicleTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ecf0f1',
    marginBottom: 10,
  },
  noVehicleText: {
    fontSize: 16,
    color: '#bdc3c7',
    textAlign: 'center',
    marginBottom: 20,
  },
  addVehicleButton: {
    backgroundColor: '#2C8AA6',
    borderRadius: 8,
    paddingVertical: 15,
    paddingHorizontal: 25,
  },
  addVehicleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Quick Actions
  quickActionsContainer: {
    marginBottom: 30,
  },
  actionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#34495e',
    borderRadius: 12,
    borderLeftWidth: 4,
    padding: 20,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 30,
    marginBottom: 10,
  },
  actionTitle: {
    color: '#ecf0f1',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Stats
  statsContainer: {
    marginBottom: 30,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#34495e',
    borderRadius: 12,
    borderLeftWidth: 4,
    padding: 20,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C8AA6',
    marginBottom: 5,
  },
  statLabel: {
    color: '#bdc3c7',
    fontSize: 12,
    fontWeight: 'bold',
  },

  // Usage Tracking
  usageContainer: {
    backgroundColor: '#34495e',
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
  },
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
    backgroundColor: '#2c3e50',
    borderRadius: 4,
    overflow: 'hidden',
  },
  usageProgress: {
    height: '100%',
    backgroundColor: '#E55A4F',
    borderRadius: 4,
  },
  upgradeButton: {
    backgroundColor: '#2C8AA6',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default HomeScreen;