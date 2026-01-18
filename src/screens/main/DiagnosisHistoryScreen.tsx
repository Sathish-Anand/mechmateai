import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { diagnosisService } from '../../services/diagnosisService';
import { useAuth } from '../../context/AuthContext';
import { Database } from '../../utils/supabase';

type Diagnosis = Database['public']['Tables']['diagnoses']['Row'];

const DiagnosisHistoryScreen = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<Diagnosis | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [userPlan, setUserPlan] = useState('Basic');

  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    // Set user plan
    setUserPlan(user?.plan_type || 'Basic');
    loadDiagnoses();
  }, [user]);

  const loadDiagnoses = async (isRefresh = false, pageNum = 0) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else if (pageNum === 0) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const offset = pageNum * ITEMS_PER_PAGE;
      const newDiagnoses = await diagnosisService.getUserDiagnoses(ITEMS_PER_PAGE, offset, userPlan);

      if (isRefresh || pageNum === 0) {
        setDiagnoses(newDiagnoses);
        setPage(0);
      } else {
        setDiagnoses(prev => [...prev, ...newDiagnoses]);
      }

      // Check if has more based on plan limits
      let hasMoreItems = newDiagnoses.length === ITEMS_PER_PAGE;
      if (userPlan === 'Basic') {
        // Limited to 1 diagnosis total
        const totalLoaded = (pageNum * ITEMS_PER_PAGE) + newDiagnoses.length;
        hasMoreItems = hasMoreItems && totalLoaded < 1;
      } else if (userPlan === 'Essential' || userPlan === 'Performance') {
        // Limited to 5 diagnoses total
        const totalLoaded = (pageNum * ITEMS_PER_PAGE) + newDiagnoses.length;
        hasMoreItems = hasMoreItems && totalLoaded < 5;
      }
      setHasMore(hasMoreItems);

      if (!isRefresh && pageNum > 0) {
        setPage(pageNum);
      }

    } catch (error) {
      console.error('Error loading diagnoses:', error);
      Alert.alert('Error', 'Failed to load diagnosis history. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      loadDiagnoses(false, page + 1);
    }
  };

  const handleRefresh = () => {
    loadDiagnoses(true);
  };

  const handleViewDetails = async (id: string) => {
    try {
      setLoadingDetails(true);
      const diagnosis = await diagnosisService.getDiagnosis(id);
      if (diagnosis) {
        setSelectedDiagnosis(diagnosis);
        setModalVisible(true);
      }
    } catch (error) {
      console.error('Error loading diagnosis details:', error);
      Alert.alert('Error', 'Failed to load diagnosis details.');
    } finally {
      setLoadingDetails(false);
    }
  };

  const getDiagnosisTitle = (item: Diagnosis) => {
    if (item.ai_response?.title) {
      return item.ai_response.title;
    }
    return `${item.make} ${item.model} (${item.year}) - ${item.issue_description?.substring(0, 50)}...`;
  };

  const getTitleColor = (item: Diagnosis) => {
    if (item.ai_response?.urgencyLevel === 'CRITICAL') return '#e74c3c';
    if (item.ai_response?.urgencyLevel === 'HIGH') return '#f39c12';
    if (item.ai_response?.urgencyLevel === 'MEDIUM') return '#f1c40f';
    if (item.ai_response?.urgencyLevel === 'LOW') return '#27ae60';
    return '#ecf0f1';
  };

  const renderFormattedText = (text: string) => {
    if (!text) return null;

    const parts = text.split(/(\*\*.*?\*\*)/g);
    return (
      <Text style={styles.detailText}>
        {parts.map((part, index) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return (
              <Text key={index} style={styles.boldText}>
                {part.slice(2, -2)}
              </Text>
            );
          }
          return part;
        })}
      </Text>
    );
  };

  const renderFormattedTextWithTealLabels = (text: string) => {
    if (!text) return null;

    const parts = text.split(/(\*\*.*?\*\*)/g);
    return (
      <Text style={styles.detailText}>
        {parts.map((part, index) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return (
              <Text key={index} style={styles.tealBoldText}>
                {part.slice(2, -2)}
              </Text>
            );
          }
          return part;
        })}
      </Text>
    );
  };

  const renderDiagnosisItem = ({ item }: { item: Diagnosis }) => (
    <TouchableOpacity
      style={styles.diagnosisItem}
      onPress={() => handleViewDetails(item.id)}
      disabled={loadingDetails}
    >
      <View style={styles.diagnosisInfo}>
        <Text style={[styles.diagnosisTitle, { color: getTitleColor(item) }]}>
          {getDiagnosisTitle(item)}
        </Text>
        <Text style={styles.diagnosisSubtitle}>
          {item.make || 'Unknown Vehicle'}: {new Date(item.created_at).toLocaleDateString()} at {new Date(item.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
        </Text>
        {item.ai_response?.estimatedCost && (
          <Text style={styles.costText}>
            💰 {item.ai_response.estimatedCost}
          </Text>
        )}
      </View>
      <View style={styles.arrow}>
        <Text style={styles.arrowText}>›</Text>
      </View>
    </TouchableOpacity>
  );

  const handleUpgradePrompt = () => {
    const limitText = userPlan === 'Basic' ? '1 diagnosis' : '5 diagnosis history entries';
    Alert.alert(
      '🎯 Upgrade to See More',
      `Your ${userPlan} plan is limited to ${limitText}. Upgrade to Ultimate for unlimited history access and advanced features.`,
      [
        {
          text: 'Upgrade Now',
          onPress: () => navigation.navigate('Plans'),
        },
        {
          text: 'Maybe Later',
          style: 'cancel'
        }
      ]
    );
  };

  const renderLoadingFooter = () => {
    if (loadingMore) {
      return (
        <View style={styles.loadingFooter}>
          <ActivityIndicator color="#2C8AA6" size="small" />
          <Text style={styles.loadingText}>Loading more...</Text>
        </View>
      );
    }

    // Show upgrade prompt for users who have reached their limit
    const showUpgradePrompt = !hasMore && (
      (userPlan === 'Basic' && diagnoses.length >= 1) ||
      ((userPlan === 'Essential' || userPlan === 'Performance') && diagnoses.length >= 5)
    );

    if (showUpgradePrompt) {
      const limitText = userPlan === 'Basic' ? '1 diagnosis' : '5 diagnoses';
      return (
        <View style={styles.upgradeFooter}>
          <Text style={styles.upgradeFooterTitle}>📈 Want to see more?</Text>
          <Text style={styles.upgradeFooterText}>
            You've reached your {userPlan} plan limit of {limitText}.
            Upgrade to Ultimate for unlimited history access.
          </Text>
          <TouchableOpacity
            style={styles.upgradeFooterButton}
            onPress={handleUpgradePrompt}
          >
            <Text style={styles.upgradeFooterButtonText}>⚡ Upgrade Now</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
            <Text style={styles.headerButtonText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Diagnosis History</Text>
          <TouchableOpacity style={styles.headerButton} onPress={() => navigation.navigate('MainTabs', { screen: 'Home' })}>
            <Text style={styles.headerButtonText}>🏠 Home</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2C8AA6" />
          <Text style={styles.loadingText}>Loading diagnosis history...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
          <Text style={styles.headerButtonText}>‹ Back</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Diagnosis History</Text>
          {userPlan === 'Basic' && (
            <Text style={styles.headerSubtitle}>
              {userPlan} Plan: {diagnoses.length}/1 diagnosis
            </Text>
          )}
          {(userPlan === 'Essential' || userPlan === 'Performance') && (
            <Text style={styles.headerSubtitle}>
              {userPlan} Plan: {diagnoses.length}/5 diagnoses
            </Text>
          )}
          {userPlan === 'Ultimate' && (
            <Text style={styles.headerSubtitle}>
              Ultimate Plan: Unlimited access
            </Text>
          )}
        </View>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.navigate('MainTabs', { screen: 'Home' })}>
          <Text style={styles.headerButtonText}>🏠 Home</Text>
        </TouchableOpacity>
      </View>

      {/* Diagnosis List */}
      <FlatList
        data={diagnoses}
        renderItem={renderDiagnosisItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#2C8AA6']}
            tintColor="#2C8AA6"
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={renderLoadingFooter}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>🔍 No diagnosis history found</Text>
            <Text style={styles.emptySubtext}>Your completed diagnoses will appear here</Text>
          </View>
        }
      />

      {/* Details Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.modalCloseText}>✕ Close</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Diagnosis Details</Text>
            <View style={styles.modalSpacer} />
          </View>

          <ScrollView style={styles.modalContent} contentContainerStyle={styles.modalContentContainer}>
            {selectedDiagnosis && (
              <>
                <Text style={styles.modalDate}>
                  📅 {new Date(selectedDiagnosis.created_at).toLocaleDateString()} at {new Date(selectedDiagnosis.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </Text>

                {/* Vehicle Info */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>🚗 Vehicle Information</Text>
                  <Text style={styles.modalVehicleText}>
                    {selectedDiagnosis.year} {selectedDiagnosis.make} {selectedDiagnosis.model}
                  </Text>
                  {selectedDiagnosis.registration && (
                    <Text style={styles.modalDetailText}>Registration: {selectedDiagnosis.registration}</Text>
                  )}
                  {selectedDiagnosis.odometer && (
                    <Text style={styles.modalDetailText}>Odometer: {selectedDiagnosis.odometer.toLocaleString()} km</Text>
                  )}
                </View>

                {/* Issue Description */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>❓ Issue Description</Text>
                  <Text style={styles.modalDetailText}>{selectedDiagnosis.issue_description}</Text>
                </View>

                {/* AI Response */}
                {selectedDiagnosis.ai_response && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>🤖 AI Diagnosis</Text>

                    {/* Urgency Banner */}
                    {selectedDiagnosis.ai_response.urgencyLevel && (
                      <View style={[styles.urgencyBanner, styles[`urgency${selectedDiagnosis.ai_response.urgencyLevel}`]]}>
                        <Text style={styles.urgencyText}>
                          {selectedDiagnosis.ai_response.urgencyLevel === 'CRITICAL' && '🚨 CRITICAL'}
                          {selectedDiagnosis.ai_response.urgencyLevel === 'HIGH' && '⚠️ HIGH PRIORITY'}
                          {selectedDiagnosis.ai_response.urgencyLevel === 'MEDIUM' && '🟡 MEDIUM PRIORITY'}
                          {selectedDiagnosis.ai_response.urgencyLevel === 'LOW' && '🟢 LOW PRIORITY'}
                        </Text>
                      </View>
                    )}

                    {/* Key Info Cards */}
                    <View style={styles.infoCards}>
                      {selectedDiagnosis.ai_response.estimatedCost && (
                        <View style={styles.infoCard}>
                          <Text style={styles.infoCardTitle}>💰 Estimated Cost</Text>
                          <Text style={styles.infoCardValue}>{selectedDiagnosis.ai_response.estimatedCost}</Text>
                        </View>
                      )}
                      {selectedDiagnosis.ai_response.difficulty && (
                        <View style={styles.infoCard}>
                          <Text style={styles.infoCardTitle}>🔧 Difficulty</Text>
                          <Text style={styles.infoCardValue}>
                            {(selectedDiagnosis.ai_response.difficulty || 'Unknown').replace('_', ' ')}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Diagnosis Title */}
                    {selectedDiagnosis.ai_response.title && (
                      <Text style={styles.modalDiagnosisTitle}>{selectedDiagnosis.ai_response.title}</Text>
                    )}

                    {/* Main Diagnosis */}
                    {renderFormattedText(selectedDiagnosis.ai_response.diagnosis)}

                    {/* Common Causes */}
                    {selectedDiagnosis.ai_response.commonCauses && (
                      <>
                        <Text style={styles.modalSubTitle}>🔍 Common Causes:</Text>
                        <View style={styles.commonCausesContainer}>
                          {renderFormattedTextWithTealLabels(selectedDiagnosis.ai_response.commonCauses)}
                        </View>
                      </>
                    )}

                    {/* Step-by-step Routine */}
                    {selectedDiagnosis.ai_response.stepByStepRoutine && (
                      <>
                        <Text style={styles.modalSubTitle}>🔧 Step-by-step Routine:</Text>
                        <View style={styles.stepByStepContainer}>
                          {renderFormattedTextWithTealLabels(selectedDiagnosis.ai_response.stepByStepRoutine)}
                        </View>
                      </>
                    )}

                    {/* Prevention Tips */}
                    {selectedDiagnosis.ai_response.prevention && (
                      <>
                        <Text style={styles.modalSubTitle}>🛡️ Prevention Tips:</Text>
                        <View style={styles.preventionContainer}>
                          {renderFormattedTextWithTealLabels(selectedDiagnosis.ai_response.prevention)}
                        </View>
                      </>
                    )}
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a2332',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#2c3e50',
    borderBottomWidth: 1,
    borderBottomColor: '#34495e',
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
  },
  headerButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  headerButtonText: {
    color: '#2C8AA6',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ecf0f1',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#95a5a6',
    marginTop: 2,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#bdc3c7',
    fontSize: 16,
    marginTop: 10,
  },
  listContainer: {
    padding: 20,
  },
  diagnosisItem: {
    backgroundColor: '#34495e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  diagnosisInfo: {
    flex: 1,
  },
  diagnosisTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  diagnosisSubtitle: {
    fontSize: 14,
    color: '#bdc3c7',
    marginBottom: 4,
  },
  costText: {
    fontSize: 14,
    color: '#2C8AA6',
    fontWeight: '500',
  },
  arrow: {
    marginLeft: 10,
  },
  arrowText: {
    color: '#95a5a6',
    fontSize: 24,
    fontWeight: '300',
  },
  loadingFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    gap: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    color: '#95a5a6',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#7f8c8d',
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#1a2332',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#2c3e50',
    borderBottomWidth: 1,
    borderBottomColor: '#34495e',
  },
  modalCloseText: {
    color: '#e74c3c',
    fontSize: 16,
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ecf0f1',
  },
  modalSpacer: {
    width: 60,
  },
  modalContent: {
    flex: 1,
  },
  modalContentContainer: {
    padding: 20,
  },
  modalDate: {
    fontSize: 16,
    color: '#95a5a6',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalSection: {
    marginBottom: 24,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ecf0f1',
    marginBottom: 12,
  },
  modalVehicleText: {
    fontSize: 16,
    color: '#ecf0f1',
    fontWeight: '600',
    marginBottom: 8,
  },
  modalDetailText: {
    fontSize: 14,
    color: '#bdc3c7',
    lineHeight: 20,
    marginBottom: 4,
  },
  modalDiagnosisTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ecf0f1',
    marginBottom: 12,
  },
  modalSubTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ecf0f1',
    marginTop: 16,
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#bdc3c7',
    lineHeight: 20,
    marginBottom: 8,
  },
  boldText: {
    fontWeight: 'bold',
    color: '#ecf0f1',
  },
  tealBoldText: {
    fontWeight: 'bold',
    color: '#2C8AA6',
  },

  // Urgency Banner
  urgencyBanner: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  urgencyCRITICAL: {
    backgroundColor: '#c0392b',
  },
  urgencyHIGH: {
    backgroundColor: '#e67e22',
  },
  urgencyMEDIUM: {
    backgroundColor: '#f39c12',
  },
  urgencyLOW: {
    backgroundColor: '#27ae60',
  },
  urgencyText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },

  // Info Cards
  infoCards: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  infoCard: {
    flex: 1,
    backgroundColor: '#2c3e50',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  infoCardTitle: {
    fontSize: 12,
    color: '#95a5a6',
    marginBottom: 4,
  },
  infoCardValue: {
    fontSize: 14,
    color: '#ecf0f1',
    fontWeight: '600',
    textAlign: 'center',
  },

  // Section Containers
  commonCausesContainer: {
    backgroundColor: '#2c3e50',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  stepByStepContainer: {
    backgroundColor: '#2c3e50',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  preventionContainer: {
    backgroundColor: '#2c3e50',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },

  // Upgrade Footer Styles
  upgradeFooter: {
    backgroundColor: '#34495e',
    borderRadius: 12,
    padding: 20,
    margin: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F4B942',
  },
  upgradeFooterTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F4B942',
    marginBottom: 10,
    textAlign: 'center',
  },
  upgradeFooterText: {
    fontSize: 14,
    color: '#bdc3c7',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 15,
  },
  upgradeFooterButton: {
    backgroundColor: '#2C8AA6',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderWidth: 2,
    borderColor: '#F4B942',
  },
  upgradeFooterButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
});

export default DiagnosisHistoryScreen;