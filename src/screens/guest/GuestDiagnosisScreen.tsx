import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  Linking,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
// Guest diagnosis now requires sign-up for security reasons
// import { groqService } from '../../services/groqService';
// import { freeYouTubeService } from '../../services/freeYouTubeService';
// import { partsService } from '../../services/partsService';

const GuestDiagnosisScreen = () => {
  const [formData, setFormData] = useState({
    make: '',
    model: '',
    year: '',
    odometer: '',
    email: '',
    issueDescription: '',
  });
  const [loading, setLoading] = useState(false);
  const [diagnosisResult, setDiagnosisResult] = useState<any>(null);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation<any>();

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDiagnosis = async () => {
    if (!formData.make || !formData.model || !formData.year || !formData.email || !formData.issueDescription) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      // Create vehicle object for limited guest features
      const vehicleData = {
        make: formData.make,
        model: formData.model,
        year: parseInt(formData.year),
        odometer: parseInt(formData.odometer) || 0,
      };

      console.log('Getting limited guest diagnosis (YouTube + Parts only)...');

      // Import services for guest diagnosis
      const { freeYouTubeService } = require('../../services/freeYouTubeService');

      // Get YouTube videos (no AI required - just keyword search)
      const youtubeVideos = await freeYouTubeService.getDiagnosticVideos(
        formData.make,
        formData.model,
        parseInt(formData.year),
        formData.issueDescription
      );

      // Generate simple parts recommendations based on issue keywords
      const partRecommendations = generateGuestPartRecommendations(formData.issueDescription, vehicleData);

      // Create limited guest diagnosis result
      const guestDiagnosisResult = {
        id: `guest-diagnosis-${Date.now()}`,
        ai_response: null, // No AI for guests
        youtube_videos: youtubeVideos.slice(0, 2), // Limit to 2 videos for guests
        product_links: partRecommendations.slice(0, 2), // Limit to 2 parts for guests
        status: 'COMPLETED',
        created_at: new Date().toISOString()
      };

      setDiagnosisResult(guestDiagnosisResult);

      console.log('Guest diagnosis completed successfully (limited features)');

    } catch (error: any) {
      console.error('Error getting guest diagnosis:', error);
      Alert.alert('Error', error.message || 'Failed to get repair recommendations');
    } finally {
      setLoading(false);
    }
  };

  const openLink = (url: string) => {
    Linking.openURL(url);
  };

  const handleViewFullResults = () => {
    setShowSignupModal(true);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Reset diagnosis result to allow fresh diagnosis
      setDiagnosisResult(null);
      // Reset form partially to allow user to re-enter if needed
      // Keep the form data as is for user convenience
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Helper function to generate basic part recommendations for guests based on keywords
  const generateGuestPartRecommendations = (issueDescription: string, vehicle: any) => {
    const issue = issueDescription.toLowerCase();
    const parts = [];

    // Generate Google Shopping URLs for parts
    const generateGoogleShoppingURL = (vehicleInfo: any, partName: string) => {
      const vehicleString = `${vehicleInfo.year} ${vehicleInfo.make} ${vehicleInfo.model}`;
      const searchQuery = `${vehicleString} ${partName}`;
      return `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(searchQuery)}`;
    };

    // Enhanced keyword-based part recommendations with better matching
    if (issue.includes('engine') || issue.includes('rough idle') || issue.includes('misfire') || issue.includes('stall') || issue.includes('hesitat')) {
      parts.push({
        id: 'part_1',
        name: 'Spark Plugs',
        price: '$15-$45',
        searchUrl: generateGoogleShoppingURL(vehicle, 'spark plugs')
      });
      parts.push({
        id: 'part_2',
        name: 'Ignition Coil',
        price: '$50-$150',
        searchUrl: generateGoogleShoppingURL(vehicle, 'ignition coil')
      });
    } else if (issue.includes('brake') || issue.includes('squeal') || issue.includes('grinding') || issue.includes('stopping') || issue.includes('pedal')) {
      parts.push({
        id: 'part_1',
        name: 'Brake Pads',
        price: '$25-$75',
        searchUrl: generateGoogleShoppingURL(vehicle, 'brake pads')
      });
      parts.push({
        id: 'part_2',
        name: 'Brake Rotors',
        price: '$40-$120',
        searchUrl: generateGoogleShoppingURL(vehicle, 'brake rotors')
      });
    } else if (issue.includes('battery') || issue.includes('starting') || issue.includes('start') || issue.includes('electrical') || issue.includes('dead') || issue.includes('won\'t start')) {
      parts.push({
        id: 'part_1',
        name: 'Car Battery',
        price: '$80-$200',
        searchUrl: generateGoogleShoppingURL(vehicle, 'car battery')
      });
      parts.push({
        id: 'part_2',
        name: 'Starter Motor',
        price: '$150-$400',
        searchUrl: generateGoogleShoppingURL(vehicle, 'starter motor')
      });
    } else if (issue.includes('oil') || issue.includes('leak') || issue.includes('change') || issue.includes('maintenance')) {
      parts.push({
        id: 'part_1',
        name: 'Oil Filter',
        price: '$5-$15',
        searchUrl: generateGoogleShoppingURL(vehicle, 'oil filter')
      });
      parts.push({
        id: 'part_2',
        name: 'Motor Oil',
        price: '$20-$50',
        searchUrl: generateGoogleShoppingURL(vehicle, 'motor oil')
      });
    } else if (issue.includes('tire') || issue.includes('tyre') || issue.includes('wheel') || issue.includes('flat')) {
      parts.push({
        id: 'part_1',
        name: 'Tire',
        price: '$60-$200',
        searchUrl: generateGoogleShoppingURL(vehicle, 'tire')
      });
      parts.push({
        id: 'part_2',
        name: 'Tire Repair Kit',
        price: '$10-$30',
        searchUrl: generateGoogleShoppingURL(vehicle, 'tire repair kit')
      });
    } else if (issue.includes('cooling') || issue.includes('overheat') || issue.includes('coolant') || issue.includes('radiator') || issue.includes('temperature')) {
      parts.push({
        id: 'part_1',
        name: 'Coolant',
        price: '$10-$25',
        searchUrl: generateGoogleShoppingURL(vehicle, 'coolant')
      });
      parts.push({
        id: 'part_2',
        name: 'Radiator',
        price: '$100-$300',
        searchUrl: generateGoogleShoppingURL(vehicle, 'radiator')
      });
    } else if (issue.includes('transmission') || issue.includes('gear') || issue.includes('shift') || issue.includes('clutch')) {
      parts.push({
        id: 'part_1',
        name: 'Transmission Fluid',
        price: '$15-$40',
        searchUrl: generateGoogleShoppingURL(vehicle, 'transmission fluid')
      });
      parts.push({
        id: 'part_2',
        name: 'Transmission Filter',
        price: '$20-$60',
        searchUrl: generateGoogleShoppingURL(vehicle, 'transmission filter')
      });
    } else if (issue.includes('suspension') || issue.includes('shock') || issue.includes('strut') || issue.includes('bounce') || issue.includes('rough ride')) {
      parts.push({
        id: 'part_1',
        name: 'Shock Absorber',
        price: '$40-$120',
        searchUrl: generateGoogleShoppingURL(vehicle, 'shock absorber')
      });
      parts.push({
        id: 'part_2',
        name: 'Strut',
        price: '$60-$180',
        searchUrl: generateGoogleShoppingURL(vehicle, 'strut')
      });
    } else if (issue.includes('noise') || issue.includes('sound') || issue.includes('rattle') || issue.includes('squeaking')) {
      // For noise issues, suggest common noise-causing parts
      if (issue.includes('belt') || issue.includes('squeal')) {
        parts.push({
          id: 'part_1',
          name: 'Serpentine Belt',
          price: '$20-$50',
          searchUrl: generateGoogleShoppingURL(vehicle, 'serpentine belt')
        });
      } else {
        parts.push({
          id: 'part_1',
          name: 'Motor Mount',
          price: '$30-$100',
          searchUrl: generateGoogleShoppingURL(vehicle, 'motor mount')
        });
      }
      parts.push({
        id: 'part_2',
        name: 'Air Filter',
        price: '$10-$25',
        searchUrl: generateGoogleShoppingURL(vehicle, 'air filter')
      });
    } else if (issue.includes('light') || issue.includes('headlight') || issue.includes('bulb') || issue.includes('electrical')) {
      parts.push({
        id: 'part_1',
        name: 'Headlight Bulb',
        price: '$15-$60',
        searchUrl: generateGoogleShoppingURL(vehicle, 'headlight bulb')
      });
      parts.push({
        id: 'part_2',
        name: 'Fuse',
        price: '$1-$10',
        searchUrl: generateGoogleShoppingURL(vehicle, 'automotive fuse')
      });
    } else {
      // More intelligent default based on common maintenance items
      parts.push({
        id: 'part_1',
        name: 'Air Filter',
        price: '$10-$25',
        searchUrl: generateGoogleShoppingURL(vehicle, 'air filter')
      });
      parts.push({
        id: 'part_2',
        name: 'Spark Plugs',
        price: '$15-$45',
        searchUrl: generateGoogleShoppingURL(vehicle, 'spark plugs')
      });
    }

    return parts.slice(0, 2); // Return max 2 parts for guests
  };

  const renderGuestDiagnosisResults = () => {
    if (!diagnosisResult) return null;

    return (
      <View style={styles.resultsSection}>
        <Text style={styles.sectionTitle}>🔍 Guest Diagnosis Results</Text>

        {/* Guest Feature Notice */}
        <View style={styles.guestNotice}>
          <Text style={styles.guestNoticeText}>
            🎁 Guest Preview: 2 YouTube videos + 2 part recommendations
          </Text>
          <Text style={styles.guestNoticeSubtext}>
            Sign up for full AI diagnosis with detailed analysis and unlimited results
          </Text>
        </View>

        {/* No AI Response for guests - skip this section since ai_response is always null for guests */}

        {/* Limited YouTube Videos */}
        {diagnosisResult.youtube_videos && diagnosisResult.youtube_videos.length > 0 && (
          <View style={styles.videoSection}>
            <Text style={styles.cardTitle}>📺 Repair Videos (Limited)</Text>
            <Text style={styles.sectionSubtitle}>2 of {diagnosisResult.youtube_videos.length} videos shown</Text>
            {diagnosisResult.youtube_videos.map((video: any) => (
              <TouchableOpacity
                key={video.id}
                style={styles.videoCard}
                onPress={() => openLink(video.url)}
                activeOpacity={0.8}
              >
                <View style={styles.videoContent}>
                  <View style={styles.videoIcon}>
                    <Text style={styles.playIcon}>▶️</Text>
                  </View>
                  <View style={styles.videoInfo}>
                    <Text style={styles.videoTitle}>{video.title}</Text>
                    <Text style={styles.videoDescription}>
                      {video.channelTitle || 'YouTube'} • {video.description?.substring(0, 60)}...
                    </Text>
                  </View>
                  <View style={styles.videoAction}>
                    <Text style={styles.linkText}>Watch →</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.moreVideosButton}
              onPress={handleViewFullResults}
            >
              <Text style={styles.moreVideosText}>🔒 Sign up to see all repair videos</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Limited Parts */}
        {diagnosisResult.product_links && diagnosisResult.product_links.length > 0 && (
          <View style={styles.productsSection}>
            <Text style={styles.cardTitle}>🛒 Parts Preview (Limited)</Text>
            <Text style={styles.sectionSubtitle}>2 of {diagnosisResult.product_links.length} parts shown</Text>
            {diagnosisResult.product_links.map((product: any) => (
              <TouchableOpacity
                key={product.id}
                style={styles.limitedProductCard}
                onPress={() => openLink(product.searchUrl)}
                activeOpacity={0.8}
              >
                <View style={styles.productContent}>
                  <View style={styles.productInfo}>
                    <Text style={styles.productName}>{product.name}</Text>
                    <Text style={styles.productDescription}>
                      Tap to search Google Shopping
                    </Text>
                  </View>
                  <View style={styles.productPricing}>
                    <Text style={styles.productPrice}>{product.price}</Text>
                    <Text style={styles.productEstimate}>Estimated</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.morePartsButton}
              onPress={handleViewFullResults}
            >
              <Text style={styles.morePartsText}>🔒 Sign up for detailed parts recommendations</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
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
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Guest Diagnosis</Text>
          <Text style={styles.subtitle}>Get a quick diagnosis without signing up</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.sectionTitle}>Vehicle Details</Text>

          <TextInput
            style={styles.input}
            placeholder="Make (e.g., Toyota, Honda)"
            placeholderTextColor="#95a5a6"
            value={formData.make}
            onChangeText={(value) => updateField('make', value)}
          />

          <TextInput
            style={styles.input}
            placeholder="Model (e.g., Camry, Civic)"
            placeholderTextColor="#95a5a6"
            value={formData.model}
            onChangeText={(value) => updateField('model', value)}
          />

          <TextInput
            style={styles.input}
            placeholder="Year (e.g., 2018)"
            placeholderTextColor="#95a5a6"
            value={formData.year}
            onChangeText={(value) => updateField('year', value)}
            keyboardType="numeric"
          />

          <TextInput
            style={styles.input}
            placeholder="Odometer reading (optional)"
            placeholderTextColor="#95a5a6"
            value={formData.odometer}
            onChangeText={(value) => updateField('odometer', value)}
            keyboardType="numeric"
          />

          <Text style={styles.sectionTitle}>Contact & Issue</Text>

          <TextInput
            style={styles.input}
            placeholder="Email address"
            placeholderTextColor="#95a5a6"
            value={formData.email}
            onChangeText={(value) => updateField('email', value)}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextInput
            style={styles.textArea}
            placeholder="Describe the issue you're experiencing..."
            placeholderTextColor="#95a5a6"
            value={formData.issueDescription}
            onChangeText={(value) => updateField('issueDescription', value)}
            multiline
            numberOfLines={6}
          />
        </View>

        {/* Disabled Photo/Video Upload */}
        <View style={styles.disabledMediaSection}>
          <Text style={styles.label}>Attach Photos/Videos</Text>
          <Text style={styles.mediaHint}>Photos and videos help our AI provide more accurate diagnosis</Text>

          <View style={styles.mediaButtons}>
            <TouchableOpacity
              style={styles.disabledMediaButton}
              disabled={true}
              activeOpacity={1}
            >
              <Text style={styles.disabledMediaButtonText}>📸 Add Photo</Text>
              <Text style={styles.premiumOnlyText}>MechMate users only</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.disabledMediaButton}
              disabled={true}
              activeOpacity={1}
            >
              <Text style={styles.disabledMediaButtonText}>🎥 Add Video</Text>
              <Text style={styles.premiumOnlyText}>MechMate users only</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            ⚠️ Guest results are limited. Sign up for full diagnosis with detailed repair guides and parts recommendations.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.diagnoseButton, loading && styles.disabledButton]}
          onPress={handleDiagnosis}
          disabled={loading}
        >
          <Text style={styles.diagnoseButtonText}>
            {loading ? 'Analyzing...' : '🔍 Get Diagnosis'}
          </Text>
        </TouchableOpacity>

        {/* Show loading indicator */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2C8AA6" />
            <Text style={styles.loadingText}>Getting AI diagnosis...</Text>
          </View>
        )}

        {/* Diagnosis Results */}
        {renderGuestDiagnosisResults()}

        {/* Signup Modal */}
        <Modal
          visible={showSignupModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowSignupModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>🚀 Get Full Diagnosis</Text>
              <Text style={styles.modalText}>
                Sign up to unlock:
              </Text>
              <View style={styles.featuresList}>
                <Text style={styles.featureItem}>• Complete detailed diagnosis</Text>
                <Text style={styles.featureItem}>• All possible causes & solutions</Text>
                <Text style={styles.featureItem}>• Step-by-step repair guides</Text>
                <Text style={styles.featureItem}>• All YouTube repair videos</Text>
                <Text style={styles.featureItem}>• Complete parts recommendations</Text>
                <Text style={styles.featureItem}>• Vehicle logbook & history</Text>
              </View>

              <TouchableOpacity
                style={styles.signupButton}
                onPress={() => {
                  setShowSignupModal(false);
                  navigation.navigate('Register');
                }}
              >
                <Text style={styles.signupButtonText}>Sign Up Now</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.loginButton}
                onPress={() => {
                  setShowSignupModal(false);
                  navigation.navigate('Login');
                }}
              >
                <Text style={styles.loginButtonText}>Already have an account? Login</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowSignupModal(false)}
              >
                <Text style={styles.modalCloseText}>Maybe Later</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
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
    paddingVertical: 20,
  },
  header: {
    marginBottom: 30,
  },
  backButton: {
    color: '#2C8AA6', // Teal color from logo
    fontSize: 16,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ecf0f1',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#bdc3c7',
  },
  form: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ecf0f1',
    marginVertical: 15,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ecf0f1',
    marginBottom: 10,
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
  textArea: {
    backgroundColor: '#34495e',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 15,
    fontSize: 16,
    color: '#ecf0f1',
    textAlignVertical: 'top',
    minHeight: 120,
    marginVertical: 8,
  },
  disclaimer: {
    backgroundColor: '#f39c12',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
  },
  disclaimerText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  diagnoseButton: {
    backgroundColor: '#2C8AA6', // Teal color from logo
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  diagnoseButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  // Loading styles
  loadingContainer: {
    alignItems: 'center',
    marginVertical: 30,
  },
  loadingText: {
    color: '#bdc3c7',
    fontSize: 16,
    marginTop: 10,
  },
  // Results Section
  resultsSection: {
    marginTop: 30,
    marginBottom: 30,
  },
  aiResponseCard: {
    backgroundColor: '#2c3e50',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ecf0f1',
    marginBottom: 10,
  },
  // Urgency Banner
  urgencyBanner: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginBottom: 15,
    alignItems: 'center',
  },
  urgencyCRITICAL: {
    backgroundColor: '#e74c3c',
    borderColor: '#c0392b',
    borderWidth: 1,
  },
  urgencyHIGH: {
    backgroundColor: '#f39c12',
    borderColor: '#e67e22',
    borderWidth: 1,
  },
  urgencyMEDIUM: {
    backgroundColor: '#f1c40f',
    borderColor: '#f39c12',
    borderWidth: 1,
  },
  urgencyLOW: {
    backgroundColor: '#2ecc71',
    borderColor: '#27ae60',
    borderWidth: 1,
  },
  urgencyText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  // Blurred content
  blurredContent: {
    position: 'relative',
    marginBottom: 15,
  },
  blurredText: {
    fontSize: 16,
    color: '#bdc3c7',
    lineHeight: 24,
  },
  blurOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(44, 62, 80, 0.8)',
    borderRadius: 4,
  },
  // Info Cards
  infoCards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    gap: 10,
  },
  infoCard: {
    flex: 1,
    backgroundColor: '#34495e',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  infoCardTitle: {
    fontSize: 12,
    color: '#95a5a6',
    marginBottom: 4,
    textAlign: 'center',
  },
  infoCardValue: {
    fontSize: 14,
    color: '#ecf0f1',
    fontWeight: '600',
    textAlign: 'center',
  },
  // Hidden Section
  hiddenSection: {
    backgroundColor: '#34495e',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#95a5a6',
  },
  hiddenSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#95a5a6',
    marginBottom: 10,
  },
  hiddenSectionText: {
    fontSize: 14,
    color: '#95a5a6',
    textAlign: 'center',
    marginBottom: 15,
    lineHeight: 20,
  },
  upgradeButton: {
    backgroundColor: '#E55A4F', // Orange color from logo
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Video Section
  videoSection: {
    backgroundColor: '#2c3e50',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#95a5a6',
    marginBottom: 15,
    fontStyle: 'italic',
  },
  videoCard: {
    backgroundColor: '#34495e',
    borderRadius: 6,
    padding: 12,
    marginBottom: 10,
  },
  videoContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  videoIcon: {
    marginRight: 12,
  },
  playIcon: {
    fontSize: 20,
  },
  videoInfo: {
    flex: 1,
  },
  videoTitle: {
    fontSize: 14,
    color: '#ecf0f1',
    marginBottom: 2,
  },
  videoDescription: {
    fontSize: 12,
    color: '#95a5a6',
  },
  videoAction: {
    alignItems: 'flex-end',
  },
  linkText: {
    fontSize: 12,
    color: '#F4B942', // Yellow color from logo
    fontWeight: '500',
  },
  moreVideosButton: {
    backgroundColor: '#34495e',
    borderRadius: 6,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#F4B942',
  },
  moreVideosText: {
    color: '#F4B942', // Yellow color from logo
    fontSize: 12,
    fontWeight: '500',
  },
  // Products Section
  productsSection: {
    backgroundColor: '#2c3e50',
    borderRadius: 8,
    padding: 15,
  },
  limitedProductCard: {
    backgroundColor: '#34495e',
    borderRadius: 6,
    padding: 12,
    marginBottom: 10,
  },
  productContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    color: '#ecf0f1',
    marginBottom: 2,
  },
  productDescription: {
    fontSize: 12,
    color: '#95a5a6',
  },
  productPricing: {
    alignItems: 'flex-end',
  },
  productPrice: {
    fontSize: 14,
    color: '#2ecc71',
    fontWeight: '600',
    marginBottom: 2,
  },
  productEstimate: {
    fontSize: 10,
    color: '#95a5a6',
  },
  morePartsButton: {
    backgroundColor: '#34495e',
    borderRadius: 6,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#E55A4F',
  },
  morePartsText: {
    color: '#E55A4F', // Orange color from logo
    fontSize: 12,
    fontWeight: '500',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#2c3e50',
    borderRadius: 15,
    padding: 25,
    width: '90%',
    maxHeight: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ecf0f1',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    color: '#bdc3c7',
    marginBottom: 20,
    textAlign: 'center',
  },
  featuresList: {
    alignSelf: 'stretch',
    marginBottom: 25,
  },
  featureItem: {
    fontSize: 14,
    color: '#bdc3c7',
    marginVertical: 4,
    paddingLeft: 10,
  },
  signupButton: {
    backgroundColor: '#E55A4F', // Orange color from logo
    borderRadius: 8,
    paddingVertical: 15,
    paddingHorizontal: 30,
    alignItems: 'center',
    marginBottom: 15,
    width: '100%',
  },
  signupButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: '#2C8AA6', // Teal color from logo
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 30,
    alignItems: 'center',
    marginBottom: 15,
    width: '100%',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  modalCloseButton: {
    paddingVertical: 10,
  },
  modalCloseText: {
    color: '#95a5a6',
    fontSize: 14,
  },
  // Disabled media section
  disabledMediaSection: {
    backgroundColor: '#2c3e50',
    borderRadius: 8,
    padding: 20,
    marginBottom: 30,
    opacity: 0.6,
  },
  mediaHint: {
    color: '#95a5a6',
    fontSize: 14,
    marginBottom: 15,
    textAlign: 'center',
  },
  mediaButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  disabledMediaButton: {
    flex: 1,
    backgroundColor: '#34495e',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#95a5a6',
    opacity: 0.5,
  },
  disabledMediaButtonText: {
    color: '#95a5a6',
    fontSize: 16,
    fontWeight: '600',
  },
  premiumOnlyText: {
    color: '#95a5a6',
    fontSize: 10,
    marginTop: 2,
    fontStyle: 'italic',
  },
  // Guest Notice Styles
  guestNotice: {
    backgroundColor: '#2C8AA6',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    alignItems: 'center',
  },
  guestNoticeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 5,
  },
  guestNoticeSubtext: {
    color: '#ecf0f1',
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default GuestDiagnosisScreen;