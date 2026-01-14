import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { diagnosisService } from '../../services/diagnosisService';
import { supabase } from '../../utils/supabase';

const PlansScreen = () => {
  const { user, refreshUser } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);

  // Usage state
  const [usageInfo, setUsageInfo] = useState({
    usage: { daily_used: 0, weekly_used: 0, total_used: 0 },
    limits: { daily: 1, weekly: 5 },
    planType: 'Basic',
    loading: true,
  });

  // Load usage info on component mount
  useEffect(() => {
    if (user?.id) {
      fetchUsageInfo();
    }
  }, [user?.id]);

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

  const handlePlanSelection = async (planName: string) => {
    if (planName === usageInfo.planType) {
      Alert.alert('Current Plan', 'This is already your current plan.');
      return;
    }

    if (planName === 'Basic') {
      Alert.alert('Downgrade Not Available', 'Please contact support to downgrade your plan.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ plan_type: planName })
        .eq('id', user?.id);

      if (error) throw error;

      await Promise.all([
        refreshUser(),
        fetchUsageInfo(),
      ]);

      Alert.alert('Success', `Successfully upgraded to ${planName} plan!`);
    } catch (error) {
      console.error('Error updating plan:', error);
      Alert.alert('Error', 'Failed to update plan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refreshUser(),
        fetchUsageInfo(),
      ]);
    } catch (error) {
      console.error('Error refreshing plans:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const plans = [
    {
      name: 'Basic',
      price: '$0',
      billing: '',
      billingNote: 'Always free',
      limit: '1 diagnosis per day, 5 per week',
      features: ['Basic vehicle diagnosis', 'Guest mode access', 'Basic maintenance tips', 'Community support']
    },
    {
      name: 'Essential',
      price: '$5',
      billing: '/day',
      billingNote: 'Pay per day',
      limit: '10 diagnoses per day, 70 per week',
      features: ['Full diagnosis reports', 'Logbook access', 'YouTube integration', 'Email support', 'Maintenance reminders']
    },
    {
      name: 'Performance',
      price: '$20',
      billing: '/month',
      billingNote: 'Monthly billing',
      limit: 'No daily limits - 50 per month',
      features: ['Advanced diagnostics', 'Full monthly flexibility', 'Priority support', 'All diagnosis features', 'Advanced analytics']
    },
    {
      name: 'Ultimate',
      price: '$50',
      billing: '/month',
      billingNote: 'Monthly billing',
      limit: 'No daily limits - 200 per month',
      features: ['Premium diagnostics', 'Maximum flexibility', '24/7 priority support', 'All features included', 'Fleet management', 'Custom reports']
    },
  ];

  return (
    <View style={styles.container}>
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
        <Text style={styles.title}>Premium Plans</Text>
        <Text style={styles.subtitle}>Choose the plan that works for you</Text>

        <View style={styles.plansContainer}>
          {plans.map((plan, index) => {
            const isCurrentPlan = plan.name === usageInfo.planType;
            const isPopular = plan.name === 'Essential';

            return (
              <View key={index} style={[
                styles.planCard,
                isPopular && styles.popularPlan,
                isCurrentPlan && styles.currentPlan
              ]}>
                {isPopular && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularText}>POPULAR</Text>
                  </View>
                )}
                {isCurrentPlan && (
                  <View style={styles.currentPlanBadge}>
                    <Text style={styles.currentPlanText}>CURRENT</Text>
                  </View>
                )}
                <Text style={styles.planName}>{plan.name}</Text>
                <View style={styles.priceContainer}>
                  <Text style={styles.planPrice}>
                    {plan.price}
                    {plan.billing && <Text style={styles.billingPeriod}>{plan.billing}</Text>}
                  </Text>
                  {plan.billingNote && (
                    <Text style={styles.planBilling}>{plan.billingNote}</Text>
                  )}
                </View>
                <Text style={styles.planLimit}>{plan.limit}</Text>

                <View style={styles.featuresContainer}>
                  {plan.features.map((feature, fIndex) => (
                    <Text key={fIndex} style={styles.feature}>• {feature}</Text>
                  ))}
                </View>

                <TouchableOpacity
                  style={[
                    styles.selectButton,
                    isCurrentPlan && styles.currentPlanButton,
                    loading && styles.disabledButton
                  ]}
                  onPress={() => handlePlanSelection(plan.name)}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.selectButtonText}>
                      {isCurrentPlan ? 'Current Plan' : 'Select Plan'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        <View style={styles.usageContainer}>
          <Text style={styles.usageTitle}>Current Usage</Text>

          {usageInfo.loading ? (
            <ActivityIndicator color="#2C8AA6" size="small" style={{ marginVertical: 10 }} />
          ) : (
            <View style={styles.usageStats}>
              <View style={styles.usageRow}>
                <Text style={styles.usageLabel}>Daily:</Text>
                <Text style={styles.usageValue}>
                  {usageInfo.usage.daily_used}/{usageInfo.limits.daily === 999 ? '∞' : usageInfo.limits.daily}
                </Text>
                <View style={styles.usageBar}>
                  <View
                    style={[
                      styles.usageProgress,
                      {
                        width: usageInfo.limits.daily === 999 ? '5%' :
                               `${Math.min((usageInfo.usage.daily_used / usageInfo.limits.daily) * 100, 100)}%`
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

              <View style={styles.planRow}>
                <Text style={styles.usageLabel}>Plan:</Text>
                <Text style={styles.planValue}>{usageInfo.planType}</Text>
              </View>
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
  content: {
    paddingHorizontal: 20,
    paddingTop: 0, // No top padding below nav
    paddingBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ecf0f1',
    textAlign: 'center',
    marginTop: 10, // Minimal top margin
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#bdc3c7',
    textAlign: 'center',
    marginBottom: 20, // Reduced bottom margin
  },
  plansContainer: {
    marginBottom: 30,
  },
  planCard: {
    backgroundColor: '#2c3e50',
    borderRadius: 12,
    padding: 20,
    marginVertical: 10,
    position: 'relative',
  },
  popularPlan: {
    borderWidth: 2,
    borderColor: '#f39c12',
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 20,
    backgroundColor: '#f39c12',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  currentPlan: {
    borderWidth: 2,
    borderColor: '#27ae60',
  },
  currentPlanBadge: {
    position: 'absolute',
    top: -10,
    left: 20,
    backgroundColor: '#27ae60',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  currentPlanText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  planName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ecf0f1',
    marginBottom: 5,
  },
  priceContainer: {
    marginBottom: 5,
  },
  planPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C8AA6',
  },
  billingPeriod: {
    fontSize: 16,
    fontWeight: 'normal',
    color: '#95a5a6',
  },
  planBilling: {
    fontSize: 12,
    color: '#95a5a6',
    marginTop: 2,
  },
  planLimit: {
    fontSize: 14,
    color: '#95a5a6',
    marginBottom: 15,
  },
  featuresContainer: {
    marginBottom: 20,
  },
  feature: {
    color: '#bdc3c7',
    fontSize: 14,
    marginVertical: 2,
  },
  selectButton: {
    backgroundColor: '#2C8AA6',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  selectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  currentPlanButton: {
    backgroundColor: '#95a5a6',
  },
  disabledButton: {
    opacity: 0.6,
  },
  usageContainer: {
    backgroundColor: '#34495e',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  usageTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ecf0f1',
    marginBottom: 10,
  },
  usageStats: {
    width: '100%',
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
    backgroundColor: '#2C8AA6',
    borderRadius: 4,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 10,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#2c3e50',
  },
  planValue: {
    color: '#2C8AA6',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PlansScreen;