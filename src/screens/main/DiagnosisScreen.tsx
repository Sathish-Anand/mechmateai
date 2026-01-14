import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
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
  FlatList,
  Linking,
  Image,
  RefreshControl,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Video } from 'expo-av';
import { Picker } from '@react-native-picker/picker';
import { vehicleService } from '../../services/vehicleService';
import { diagnosisService } from '../../services/diagnosisService';
import { groqService } from '../../services/groqService';
import { freeYouTubeService } from '../../services/freeYouTubeService';
import { logbookService } from '../../services/logbookService';
import { partsService } from '../../services/partsService';
import { guestAnalyticsService } from '../../services/guestAnalyticsService';
import { useAuth } from '../../context/AuthContext';

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  variant?: string;
  registration: string;
  odometer: number;
  is_default: boolean;
}

interface DiagnosisResult {
  id: string;
  ai_response?: any;
  youtube_videos?: any[];
  product_links?: any[];
  status: string;
  created_at: string;
}

const DiagnosisScreen = () => {
  const { user } = useAuth();
  const [issueDescription, setIssueDescription] = useState('');
  const [obdiiCodes, setObdiiCodes] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [diagnosisResult, setDiagnosisResult] = useState<DiagnosisResult | null>(null);
  const [recentDiagnoses, setRecentDiagnoses] = useState<DiagnosisResult[]>([]);
  const [showVehiclePicker, setShowVehiclePicker] = useState(false);
  const [showDiagnosisModal, setShowDiagnosisModal] = useState(false);
  const [selectedHistoryDiagnosis, setSelectedHistoryDiagnosis] = useState<DiagnosisResult | null>(null);
  const [loadingHistoryDetails, setLoadingHistoryDetails] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Photo and video states
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

  // Guest analytics session ID - generate once per component mount
  const [guestSessionId] = useState(() => guestAnalyticsService.generateSessionId());

  // Collapsible sections state
  const [sectionsExpanded, setSectionsExpanded] = useState({
    aiDiagnosis: true,     // AI diagnosis expanded by default
    youtubeVideos: false,  // YouTube videos collapsed by default
    productLinks: false,   // Product links collapsed by default
  });

  // Modal collapsible sections state
  const [modalSectionsExpanded, setModalSectionsExpanded] = useState({
    aiDiagnosis: true,
    youtubeVideos: false,
    productLinks: false,
  });

  // Copy modal state
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copyText, setCopyText] = useState('');

  // Guest vehicle input (for non-authenticated users)
  const [guestVehicle, setGuestVehicle] = useState({
    make: '',
    model: '',
    year: new Date().getFullYear(),
    variant: ''
  });

  // Helper functions for collapsible sections
  const toggleSection = (section: string) => {
    setSectionsExpanded(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const toggleModalSection = (section: string) => {
    setModalSectionsExpanded(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Show diagnosis text for copying
  const showDiagnosisForCopy = (diagnosisData: any, vehicleInfo?: any) => {
    try {
      // Create formatted text for copying
      const vehicleDetails = vehicleInfo && vehicleInfo.year && vehicleInfo.make && vehicleInfo.model
        ? `${vehicleInfo.year} ${vehicleInfo.make} ${vehicleInfo.model}`.trim()
        : 'Vehicle Information Not Available';

      let copyableText = `🔧 MechmateAI Diagnosis Report\n`;
      copyableText += `═════════════════════════════════\n\n`;

      copyableText += `🚗 Vehicle: ${vehicleDetails}\n`;
      copyableText += `📅 Date: ${new Date().toLocaleDateString()}\n\n`;

      if (diagnosisData.title) {
        copyableText += `📋 Diagnosis: ${diagnosisData.title}\n\n`;
      }

      if (diagnosisData.urgencyLevel) {
        copyableText += `🚨 Priority: ${diagnosisData.urgencyLevel}\n\n`;
      }

      if (diagnosisData.estimatedCost) {
        copyableText += `💰 Estimated Cost: ${diagnosisData.estimatedCost}\n\n`;
      }

      if (diagnosisData.difficulty) {
        copyableText += `🔧 Difficulty: ${diagnosisData.difficulty.replace('_', ' ')}\n\n`;
      }

      // Add detailed diagnosis
      if (diagnosisData.diagnosis) {
        copyableText += `📝 Technical Analysis:\n`;
        copyableText += `${diagnosisData.diagnosis.replace(/\*\*([^*]+)\*\*/g, '$1')}\n\n`;
      }

      // Add only the detailed recommendations (no duplication)
      if (diagnosisData.recommendations && diagnosisData.recommendations.length > 0) {
        copyableText += `💡 Detailed Recommendations:\n`;
        diagnosisData.recommendations.forEach((rec: string, index: number) => {
          copyableText += `${index + 1}. ${rec}\n`;
        });
        copyableText += `\n`;
      }

      // Add prevention tips if available
      if (diagnosisData.prevention) {
        copyableText += `🛡️ Prevention Tips:\n`;
        copyableText += `${diagnosisData.prevention}\n\n`;
      }

      copyableText += `─────────────────────────────────\n`;
      copyableText += `Generated by MechmateAI - Professional automotive diagnosis powered by AI\n`;
      copyableText += `${new Date().toLocaleString()}\n`;

      setCopyText(copyableText);
      setShowCopyModal(true);
    } catch (error) {
      console.error('Failed to prepare diagnosis text:', error);
      Alert.alert('Error', 'Unable to prepare diagnosis text. Please try again.');
    }
  };

  // Helper function to render collapsible section header with copy button before arrow
  const renderCollapsibleHeader = (title: string, isExpanded: boolean, onToggle: () => void, count?: number, showCopyButton?: boolean, onCopy?: () => void) => (
    <View style={styles.collapsibleHeader}>
      <TouchableOpacity
        style={styles.collapsibleHeaderMain}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <Text style={styles.collapsibleTitle}>
          {title}
          {count !== undefined && (
            <Text style={styles.collapsibleCount}> ({count})</Text>
          )}
        </Text>

        {/* Copy button right after title, before arrow */}
        <View style={styles.headerActions}>
          {showCopyButton && onCopy && (
            <TouchableOpacity
              style={styles.copyButtonInline}
              onPress={onCopy}
              activeOpacity={0.7}
            >
              <Text style={styles.copyButtonText}>📋</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.collapsibleArrow}>
            {isExpanded ? '▼' : '▶'}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  // Helper function to render formatted text with bold support
  const renderFormattedText = (text: string) => {
    if (!text) return null;

    const parts = text.split(/(\*\*[^*]+\*\*)/g);

    return (
      <View style={styles.diagnosisTextContainer}>
        {parts.map((part, index) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            const boldText = part.slice(2, -2);
            return (
              <Text key={index} style={styles.sectionHeader}>
                {boldText}
              </Text>
            );
          }
          if (part.trim().length > 0) {
            return (
              <Text key={index} style={styles.sectionContent}>
                {part}
              </Text>
            );
          }
          return null;
        })}
      </View>
    );
  };

  // Reset form when user pulls to refresh
  const resetDiagnosisForm = () => {
    setIssueDescription('');
    setObdiiCodes('');
    setSelectedImages([]);
    setSelectedVideo(null);
    setDiagnosisResult(null);
    setShowDiagnosisModal(false);
    setSelectedHistoryDiagnosis(null);
    // Reset guest vehicle data
    setGuestVehicle({
      make: '',
      model: '',
      year: new Date().getFullYear(),
      variant: ''
    });
  };

  // Handle new diagnosis with confirmation
  const handleNewDiagnosis = () => {
    Alert.alert(
      'Start New Diagnosis',
      'This will clear your current diagnosis results and form. Are you sure you want to start over?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Start New',
          onPress: resetDiagnosisForm,
        },
      ]
    );
  };

  // Load vehicles on component mount and reset form
  useEffect(() => {
    // Reset all form data and results when component mounts
    resetDiagnosisForm();
    loadVehicles();
    loadRecentDiagnoses();
  }, []);

  // Track when signup prompt is shown to guests
  useEffect(() => {
    if (!user && diagnosisResult) {
      const hasMoreParts = diagnosisResult.product_links && diagnosisResult.product_links.length > 2;
      const hasMoreVideos = diagnosisResult.youtube_videos && diagnosisResult.youtube_videos.length > 2;

      if (hasMoreParts || hasMoreVideos) {
        // Track that signup prompt was shown
        guestAnalyticsService.trackGuestInteraction({
          sessionId: guestSessionId,
          interactionType: 'signup_prompt_view',
          additionalData: {
            extraParts: hasMoreParts ? diagnosisResult.product_links.length - 2 : 0,
            extraVideos: hasMoreVideos ? diagnosisResult.youtube_videos.length - 2 : 0
          }
        }).catch(error => {
          console.error('Failed to track signup prompt view:', error);
        });
      }
    }
  }, [user, diagnosisResult, guestSessionId]);

  // Reset form whenever the screen comes into focus (navigation back)
  useFocusEffect(
    useCallback(() => {
      // Reset the form when user navigates back to this screen
      resetDiagnosisForm();
    }, [])
  );

  const loadVehicles = async () => {
    try {
      setLoadingVehicles(true);

      // Skip vehicle loading for guest users
      if (!user) {
        setVehicles([]);
        setLoadingVehicles(false);
        return;
      }

      const userVehicles = await vehicleService.getUserVehicles();
      setVehicles(userVehicles);

      // Auto-select default vehicle if available
      const defaultVehicle = userVehicles.find(v => v.is_default);
      if (defaultVehicle) {
        setSelectedVehicleId(defaultVehicle.id);
      }
    } catch (error) {
      console.error('Error loading vehicles:', error);
      // For guests, this is expected - just set empty vehicles
      if (!user) {
        setVehicles([]);
      } else {
        Alert.alert('Error', 'Failed to load vehicles');
      }
    } finally {
      setLoadingVehicles(false);
    }
  };

  const loadRecentDiagnoses = async () => {
    try {
      const diagnoses = await diagnosisService.getUserDiagnoses(5, 0);
      setRecentDiagnoses(diagnoses);
    } catch (error) {
      console.error('Error loading recent diagnoses:', error);
    }
  };

  const handleDiagnosis = async () => {
    // Validation for authenticated users
    if (user && !selectedVehicleId) {
      Alert.alert('Error', 'Please select a vehicle');
      return;
    }

    // Validation for guest users
    if (!user && (!guestVehicle.make || !guestVehicle.model)) {
      Alert.alert('Error', 'Please enter your vehicle make and model');
      return;
    }

    if (!issueDescription.trim()) {
      Alert.alert('Error', 'Please describe the issue');
      return;
    }

    // Get vehicle data - either from selected vehicle or guest input
    let vehicleData;
    if (user) {
      const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);
      if (!selectedVehicle) {
        Alert.alert('Error', 'Invalid vehicle selection');
        return;
      }
      vehicleData = selectedVehicle;
    } else {
      // Create temporary vehicle object for guest
      vehicleData = {
        id: 'guest-vehicle',
        make: guestVehicle.make,
        model: guestVehicle.model,
        year: guestVehicle.year,
        variant: guestVehicle.variant,
        registration: 'N/A',
        odometer: 0,
        is_default: false
      };
    }

    setLoading(true);
    try {
      // Create diagnosis request
      const diagnosisRequest = {
        vehicleId: vehicleData.id,
        make: vehicleData.make,
        model: vehicleData.model,
        year: vehicleData.year,
        variant: vehicleData.variant,
        registration: vehicleData.registration,
        odometer: vehicleData.odometer,
        issueDescription: issueDescription.trim(),
      };

      // Create diagnosis (skip for guests - they don't save to database)
      let diagnosis;
      if (user) {
        diagnosis = await diagnosisService.createDiagnosis(diagnosisRequest);
      } else {
        // For guests, create a temporary diagnosis object
        diagnosis = {
          id: `guest-diagnosis-${Date.now()}`,
          created_at: new Date().toISOString()
        };
      }

      // Get real AI diagnosis from Gemini
      try {
        // Fetch recent logbook entries for this vehicle (skip for guests)
        let logbookEntries = [];
        if (user && vehicleData.id !== 'guest-vehicle') {
          logbookEntries = await logbookService.getVehicleLogbookEntries(vehicleData.id);
        }

        // Get AI diagnosis with service history context, OBDII codes, and visual evidence
        const aiDiagnosis = await groqService.getDiagnosis(
          {
            make: vehicleData.make,
            model: vehicleData.model,
            year: vehicleData.year,
            variant: vehicleData.variant,
            odometer: vehicleData.odometer,
            engine: vehicleData.engine,
            vehicle_type: vehicleData.vehicle_type,
            transmission: vehicleData.transmission,
            drivetrain: vehicleData.drivetrain
          },
          issueDescription.trim(),
          logbookEntries,
          obdiiCodes.trim(), // Add OBDII codes
          selectedImages, // Add photos
          selectedVideo // Add video
        );

        // Get YouTube videos using free search (no API required)
        const youtubeVideos = await freeYouTubeService.getEnhancedVideoRecommendations(
          vehicleData.make,
          vehicleData.model,
          vehicleData.year,
          aiDiagnosis,
          vehicleData.engine,
          obdiiCodes.trim()
        );

        // Generate real automotive parts recommendations using AI
        const detailedPartRecommendations = await groqService.generateDetailedPartRecommendations(
          {
            make: vehicleData.make,
            model: vehicleData.model,
            year: vehicleData.year,
            variant: vehicleData.variant,
            odometer: vehicleData.odometer,
            engine: vehicleData.engine,
            vehicle_type: vehicleData.vehicle_type,
            transmission: vehicleData.transmission,
            drivetrain: vehicleData.drivetrain
          },
          aiDiagnosis,
          obdiiCodes.trim() // Include OBDII codes for parts recommendations
        );

        // Use Groq's part recommendations directly (they already include search URLs and formatting)
        const productLinks = detailedPartRecommendations.map((part, index) => {
          console.log(`Processing part ${index + 1}:`, part);

          // Ensure part name exists and generate safe URL
          const partName = part.name || 'automotive part';
          const searchURL = generateGoogleShoppingURL(vehicleData, partName);

          // Additional URL validation
          if (!searchURL || typeof searchURL !== 'string') {
            console.error(`Invalid URL generated for part ${index + 1}:`, searchURL);
          }

          const productLink = {
            id: part.id || `part_${Math.random().toString().substr(2, 6)}`,
            name: partName,
            brand: part.brand || 'OEM',
            partNumber: part.partNumber || `P${Math.random().toString().substr(2, 6)}`,
            price: `$${Math.min(part.estimatedPrice?.min || 50, part.estimatedPrice?.max || 200)}-$${Math.max(part.estimatedPrice?.min || 50, part.estimatedPrice?.max || 200)}`,
            exactPrice: part.estimatedPrice || { min: 50, max: 200 },
            url: searchURL,
            image: part.image || null,
            category: part.category || 'general',
            priority: part.priority || 'medium',
            description: part.description || `Replacement ${partName.toLowerCase()} for your ${vehicleData.make} ${vehicleData.model}`,
            availability: part.availability || 'in-stock',
            specifications: part.specifications || []
          };

          console.log(`Generated product link ${index + 1}:`, {
            name: productLink.name,
            url: productLink.url,
            urlValid: !!(productLink.url && typeof productLink.url === 'string' && productLink.url.startsWith('http'))
          });

          return productLink;
        });

        // Update diagnosis with real AI results (skip for guests)
        if (user) {
          await diagnosisService.updateDiagnosisResponse(
            diagnosis.id,
            aiDiagnosis,
            youtubeVideos,
            productLinks
          );
        }

        // Set result for display
        setDiagnosisResult({
          id: diagnosis.id,
          ai_response: aiDiagnosis,
          youtube_videos: youtubeVideos,
          product_links: productLinks,
          status: 'COMPLETED',
          created_at: diagnosis.created_at
        });

        // Track guest diagnosis for analytics (only for non-authenticated users)
        if (!user) {
          try {
            await guestAnalyticsService.trackGuestDiagnosis({
              sessionId: guestSessionId,
              guestEmail: undefined, // Will be captured later if provided during signup
              make: vehicleData.make,
              model: vehicleData.model,
              year: vehicleData.year,
              variant: vehicleData.variant,
              issueDescription: issueDescription.trim(),
              partsShown: Math.min(2, productLinks.length),
              videosShown: Math.min(2, youtubeVideos.length),
              totalParts: productLinks.length,
              totalVideos: youtubeVideos.length,
              aiResponse: aiDiagnosis
            });

            // Store session for potential conversion tracking
            guestAnalyticsService.storeSessionForConversion(guestSessionId);
          } catch (error) {
            console.error('Failed to track guest diagnosis:', error);
            // Don't interrupt user experience if analytics fails
          }
        }

        // Reload recent diagnoses (skip for guests)
        if (user) {
          loadRecentDiagnoses();
        }

      } catch (error) {
        console.error('Error getting AI diagnosis:', error);
        // Mark diagnosis as failed (skip for guests)
        if (user) {
          await diagnosisService.markDiagnosisFailed(diagnosis.id);
        }
        Alert.alert(
          'AI Diagnosis Failed',
          'We encountered an issue getting your AI diagnosis. Please try again or check your internet connection.',
          [{ text: 'OK' }]
        );
      }

    } catch (error: any) {
      console.error('Error creating diagnosis:', error);
      Alert.alert('Error', error.message || 'Failed to create diagnosis');
    } finally {
      setLoading(false);
    }
  };

  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);

  const openLink = async (url: string) => {
    // Validate URL before attempting to open
    if (!url || typeof url !== 'string' || url.trim() === '') {
      console.error('Invalid URL provided to openLink:', url);
      Alert.alert('Error', 'Unable to open link. Please try again.');
      return;
    }

    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error('Failed to open URL:', url, error);
      Alert.alert('Error', 'Unable to open link. Please check your internet connection.');
    }
  };

  // Enhanced link opening with analytics tracking for guests
  const openPartLink = async (url: string, partName: string, position: number) => {
    // Validate URL before attempting to open
    if (!url || typeof url !== 'string' || url.trim() === '') {
      console.error('Invalid URL provided to openPartLink:', url);
      Alert.alert('Error', 'Unable to open link. Please try again.');
      return;
    }

    if (!user) {
      try {
        await guestAnalyticsService.trackGuestInteraction({
          sessionId: guestSessionId,
          interactionType: 'part_click',
          itemClicked: partName,
          itemPosition: position + 1 // Convert to 1-based indexing for business reporting
        });
      } catch (error) {
        console.error('Failed to track part click:', error);
      }
    }

    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error('Failed to open URL:', url, error);
      Alert.alert('Error', 'Unable to open link. Please check your internet connection.');
    }
  };

  const openVideoLink = async (url: string, videoTitle: string, position: number) => {
    // Validate URL before attempting to open
    if (!url || typeof url !== 'string' || url.trim() === '') {
      console.error('Invalid URL provided to openVideoLink:', url);
      Alert.alert('Error', 'Unable to open video link. Please try again.');
      return;
    }

    if (!user) {
      try {
        await guestAnalyticsService.trackGuestInteraction({
          sessionId: guestSessionId,
          interactionType: 'video_click',
          itemClicked: videoTitle,
          itemPosition: position + 1 // Convert to 1-based indexing for business reporting
        });
      } catch (error) {
        console.error('Failed to track video click:', error);
      }
    }

    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error('Failed to open video URL:', url, error);
      Alert.alert('Error', 'Unable to open video link. Please check your internet connection.');
    }
  };

  const handleViewPreviousDiagnosis = async (diagnosisId: string) => {
    setLoadingHistoryDetails(true);
    try {
      console.log('=== DIAGNOSIS MODAL DEBUG ===');
      console.log('Fetching diagnosis details for ID:', diagnosisId);

      // Fetch the full diagnosis details
      const fullDiagnosis = await diagnosisService.getDiagnosis(diagnosisId);
      console.log('Diagnosis data received:', JSON.stringify(fullDiagnosis, null, 2));

      if (fullDiagnosis) {
        console.log('Setting selectedHistoryDiagnosis with data structure:');
        console.log('- ID:', fullDiagnosis.id);
        console.log('- Created at:', fullDiagnosis.created_at);
        console.log('- Issue description:', fullDiagnosis.issue_description);
        console.log('- AI response exists:', !!fullDiagnosis.ai_response);
        console.log('- YouTube videos count:', fullDiagnosis.youtube_videos?.length || 0);
        console.log('- Product links count:', fullDiagnosis.product_links?.length || 0);

        setSelectedHistoryDiagnosis(fullDiagnosis);
        // Reset modal sections to default state (AI diagnosis expanded, others collapsed)
        setModalSectionsExpanded({
          aiDiagnosis: true,
          youtubeVideos: false,
          productLinks: false,
        });
        setShowDiagnosisModal(true);

        console.log('Modal state updated - showDiagnosisModal:', true);
        console.log('Selected diagnosis set:', !!fullDiagnosis);
      } else {
        console.log('No fullDiagnosis data received');
        Alert.alert('Not Found', 'This diagnosis could not be found.');
      }
    } catch (error) {
      console.error('Error fetching diagnosis details:', error);
      Alert.alert('Error', 'Failed to load diagnosis details. Please try again.');
    } finally {
      setLoadingHistoryDetails(false);
      console.log('=== END DIAGNOSIS MODAL DEBUG ===');
    }
  };

  const closeDiagnosisModal = () => {
    setShowDiagnosisModal(false);
    setSelectedHistoryDiagnosis(null);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Reset the form and clear diagnosis results when refreshing
      resetDiagnosisForm();

      await Promise.all([
        loadVehicles(),
        loadRecentDiagnoses()
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Photo and video handling functions
  const getPlanLimits = () => {
    const planType = user?.plan_type || 'Basic';

    switch (planType) {
      case 'Basic':
        return { maxImages: 1, maxVideos: 0, canUploadVideos: false };
      case 'Essential':
        return { maxImages: 10, maxVideos: 0, canUploadVideos: false };
      case 'Performance':
        return { maxImages: 10, maxVideos: 0, canUploadVideos: false };
      case 'Ultimate':
        return { maxImages: 10, maxVideos: 3, canUploadVideos: true };
      default:
        return { maxImages: 1, maxVideos: 0, canUploadVideos: false };
    }
  };

  const validateFileSize = async (uri: string): Promise<boolean> => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const sizeInMB = blob.size / (1024 * 1024);

      if (sizeInMB > 2) {
        Alert.alert(
          'File Too Large',
          `File size (${sizeInMB.toFixed(1)}MB) exceeds the 2MB limit. Please choose a smaller file.`
        );
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error checking file size:', error);
      return true; // Allow if we can't check size
    }
  };

  const requestPermissions = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (cameraStatus !== 'granted' || libraryStatus !== 'granted') {
      Alert.alert(
        'Permissions Required',
        'Camera and photo library permissions are needed to upload images and videos.'
      );
      return false;
    }
    return true;
  };

  const pickImage = async () => {
    const limits = getPlanLimits();

    // Check if user has reached image limit
    if (selectedImages.length >= limits.maxImages) {
      Alert.alert(
        'Image Limit Reached',
        `Your ${user?.plan_type || 'Basic'} plan allows up to ${limits.maxImages} image${limits.maxImages === 1 ? '' : 's'}. ${limits.maxImages === 1 ? 'Remove the current image to add a new one.' : 'Remove some images to add more.'}`
      );
      return;
    }

    const hasPermissions = await requestPermissions();
    if (!hasPermissions) return;

    Alert.alert(
      'Select Image',
      'Choose an option',
      [
        { text: 'Camera', onPress: () => takePhoto() },
        { text: 'Gallery', onPress: () => pickFromGallery() },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const takePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const isValidSize = await validateFileSize(result.assets[0].uri);
      if (isValidSize) {
        setSelectedImages(prev => [...prev, result.assets[0].uri]);
      }
    }
  };

  const pickFromGallery = async () => {
    const limits = getPlanLimits();
    const allowedCount = limits.maxImages - selectedImages.length;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: allowedCount > 1,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      const assetsToProcess = result.assets.slice(0, allowedCount);
      const validImages: string[] = [];

      for (const asset of assetsToProcess) {
        const isValidSize = await validateFileSize(asset.uri);
        if (isValidSize) {
          validImages.push(asset.uri);
        }
      }

      if (validImages.length > 0) {
        setSelectedImages(prev => [...prev, ...validImages]);
      }
    }
  };

  const pickVideo = async () => {
    const limits = getPlanLimits();

    // Check if user can upload videos (Ultimate plan only)
    if (!limits.canUploadVideos) {
      Alert.alert(
        'Video Upload Not Available',
        'Video upload is only available for Ultimate plan users. Upgrade your plan to upload videos.'
      );
      return;
    }

    // Check if user has reached video limit (3 for Ultimate)
    if (selectedVideo) {
      Alert.alert(
        'Video Limit Reached',
        'You can only upload 1 video at a time. Remove the current video to add a new one.'
      );
      return;
    }

    const hasPermissions = await requestPermissions();
    if (!hasPermissions) return;

    Alert.alert(
      'Select Video',
      'Choose an option',
      [
        { text: 'Camera', onPress: () => recordVideo() },
        { text: 'Gallery', onPress: () => pickVideoFromGallery() },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const recordVideo = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      videoMaxDuration: 10, // 10 seconds max
      quality: ImagePicker.UIImagePickerControllerQualityType.Medium,
    });

    if (!result.canceled && result.assets[0]) {
      const isValidSize = await validateFileSize(result.assets[0].uri);
      if (isValidSize) {
        setSelectedVideo(result.assets[0].uri);
      }
    }
  };

  const pickVideoFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      videoMaxDuration: 10, // 10 seconds max
      quality: ImagePicker.UIImagePickerControllerQualityType.Medium,
    });

    if (!result.canceled && result.assets[0]) {
      const isValidSize = await validateFileSize(result.assets[0].uri);
      if (isValidSize) {
        setSelectedVideo(result.assets[0].uri);
      }
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeVideo = () => {
    setSelectedVideo(null);
  };

  // Helper function to generate YouTube search URL
  const generateYouTubeSearchURL = (vehicle: Vehicle, issueDescription: string, searchType: string = 'repair') => {
    const vehicleInfo = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
    const cleanedIssue = issueDescription.toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ')     // Replace multiple spaces with single space
      .trim();

    const searchQuery = `${vehicleInfo} ${cleanedIssue} ${searchType}`;
    return `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;
  };

  // Helper function to generate Google Shopping URL
  const generateGoogleShoppingURL = (vehicle: any, partName: string) => {
    try {
      // Validate inputs
      if (!vehicle || !partName) {
        console.error('Invalid inputs to generateGoogleShoppingURL:', { vehicle, partName });
        return 'https://www.google.com/search?tbm=shop&q=automotive+parts';
      }

      const vehicleInfo = `${vehicle.year || ''} ${vehicle.make || ''} ${vehicle.model || ''} ${vehicle.variant || ''}`.trim();
      const cleanPartName = partName.trim() || 'automotive part';
      const searchQuery = `${vehicleInfo} ${cleanPartName}`.trim();

      // Ensure we have a valid search query
      if (!searchQuery || searchQuery.length < 3) {
        console.error('Generated search query too short:', searchQuery);
        return 'https://www.google.com/search?tbm=shop&q=automotive+parts';
      }

      const url = `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(searchQuery)}`;
      console.log('Generated shopping URL:', url);
      return url;
    } catch (error) {
      console.error('Error generating Google Shopping URL:', error);
      return 'https://www.google.com/search?tbm=shop&q=automotive+parts';
    }
  };

  // Helper function to generate more intelligent part recommendations based on issue description
  const generatePartRecommendations = (issueDescription: string, vehicle: Vehicle) => {
    const issue = issueDescription.toLowerCase();
    const parts = [];

    // Engine-related issues
    if (issue.includes('engine') || issue.includes('rough idle') || issue.includes('misfire') || issue.includes('stalling')) {
      parts.push('spark plugs', 'air filter', 'fuel filter', 'ignition coil');
    }

    // Brake-related issues
    if (issue.includes('brake') || issue.includes('squeal') || issue.includes('grinding') || issue.includes('stopping')) {
      parts.push('brake pads', 'brake rotors', 'brake fluid');
    }

    // Transmission issues
    if (issue.includes('transmission') || issue.includes('gear') || issue.includes('shifting') || issue.includes('clutch')) {
      parts.push('transmission fluid', 'transmission filter', 'clutch kit');
    }

    // Suspension issues
    if (issue.includes('suspension') || issue.includes('shock') || issue.includes('strut') || issue.includes('bounce')) {
      parts.push('shock absorbers', 'struts', 'suspension bushings');
    }

    // Battery/electrical issues
    if (issue.includes('battery') || issue.includes('electrical') || issue.includes('starting') || issue.includes('alternator')) {
      parts.push('car battery', 'alternator', 'starter motor');
    }

    // Cooling system issues
    if (issue.includes('overheat') || issue.includes('coolant') || issue.includes('radiator') || issue.includes('temperature')) {
      parts.push('radiator', 'coolant', 'water pump', 'thermostat');
    }

    // Oil-related issues
    if (issue.includes('oil') || issue.includes('leak') || issue.includes('pressure')) {
      parts.push('oil filter', 'motor oil', 'oil drain plug');
    }

    // Default parts if no specific issue detected
    if (parts.length === 0) {
      parts.push('air filter', 'oil filter', 'spark plugs', 'brake pads');
    }

    return parts.slice(0, 4); // Return max 4 parts
  };

  const renderDiagnosisResults = () => {
    if (!diagnosisResult || !diagnosisResult.ai_response) return null;

    return (
      <View style={styles.resultsSection}>
        <Text style={styles.sectionTitle}>🔍 Diagnosis Results</Text>

        {/* AI Response - Collapsible */}
        <View style={styles.aiResponseCard}>
          {renderCollapsibleHeader(
            '🤖 AI Diagnosis',
            sectionsExpanded.aiDiagnosis,
            () => toggleSection('aiDiagnosis'),
            undefined,
            true, // Show copy button
            () => showDiagnosisForCopy(diagnosisResult.ai_response, {
              year: selectedVehicle?.year || guestVehicle.year,
              make: selectedVehicle?.make || guestVehicle.make,
              model: selectedVehicle?.model || guestVehicle.model
            })
          )}

          {sectionsExpanded.aiDiagnosis && (
            <>
              {/* Urgency Level Banner */}
              {diagnosisResult.ai_response.urgencyLevel && (
                <View style={[styles.urgencyBanner, styles[`urgency${diagnosisResult.ai_response.urgencyLevel}`]]}>
                  <Text style={styles.urgencyText}>
                    {diagnosisResult.ai_response.urgencyLevel === 'CRITICAL' && '🚨 CRITICAL'}
                    {diagnosisResult.ai_response.urgencyLevel === 'HIGH' && '⚠️ HIGH PRIORITY'}
                    {diagnosisResult.ai_response.urgencyLevel === 'MEDIUM' && '🟡 MEDIUM PRIORITY'}
                    {diagnosisResult.ai_response.urgencyLevel === 'LOW' && '🟢 LOW PRIORITY'}
                  </Text>
                </View>
              )}

              {/* Diagnosis Title */}
              {diagnosisResult.ai_response.title && (
                <Text style={styles.diagnosisTitle}>{diagnosisResult.ai_response.title}</Text>
              )}

              {renderFormattedText(diagnosisResult.ai_response.diagnosis)}

              {/* Key Info Cards */}
              <View style={styles.infoCards}>
                {diagnosisResult.ai_response.estimatedCost && (
                  <View style={styles.infoCard}>
                    <Text style={styles.infoCardTitle}>💰 Estimated Cost</Text>
                    <Text style={styles.infoCardValue}>{diagnosisResult.ai_response.estimatedCost}</Text>
                  </View>
                )}
                {diagnosisResult.ai_response.difficulty && (
                  <View style={styles.infoCard}>
                    <Text style={styles.infoCardTitle}>🔧 Difficulty</Text>
                    <Text style={styles.infoCardValue}>
                      {diagnosisResult.ai_response.difficulty.replace('_', ' ')}
                    </Text>
                  </View>
                )}
              </View>

              {/* All Recommendations in One Clean List */}
              <Text style={styles.subTitle}>Detailed Recommendations:</Text>
              <View style={styles.recommendationsContainer}>
                {diagnosisResult.ai_response.recommendations && diagnosisResult.ai_response.recommendations.map((recommendation: string, index: number) => (
                  <View key={index} style={styles.recommendationItem}>
                    <Text style={styles.recommendationNumber}>{index + 1}.</Text>
                    <Text style={styles.recommendationText}>{recommendation}</Text>
                  </View>
                ))}
              </View>

              {/* Prevention Tips Section */}
              {diagnosisResult.ai_response.prevention && (
                <>
                  <Text style={styles.subTitle}>🛡️ Prevention Tips:</Text>
                  <View style={styles.preventionContainer}>
                    <Text style={styles.preventionText}>{diagnosisResult.ai_response.prevention}</Text>
                  </View>
                </>
              )}
            </>
          )}
        </View>

        {/* YouTube Videos - Collapsible */}
        {diagnosisResult.youtube_videos && diagnosisResult.youtube_videos.length > 0 && (
          <View style={styles.videoSection}>
            {renderCollapsibleHeader(
              '📺 Helpful Repair Videos',
              sectionsExpanded.youtubeVideos,
              () => toggleSection('youtubeVideos'),
              diagnosisResult.youtube_videos.length
            )}

            {sectionsExpanded.youtubeVideos && (
              <>
                <Text style={styles.sectionSubtitle}>Watch expert tutorials to fix your vehicle</Text>

            {/* Show first 2 videos for everyone (including guests) */}
            {diagnosisResult.youtube_videos.slice(0, 2).map((video: any, index: number) => (
              <TouchableOpacity
                key={video.id}
                style={styles.videoCard}
                onPress={() => openVideoLink(video.url, video.title, index)}
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

            {/* Show remaining videos only for authenticated users */}
            {user && diagnosisResult.youtube_videos.slice(2).map((video: any, index: number) => (
              <TouchableOpacity
                key={video.id}
                style={styles.videoCard}
                onPress={() => openVideoLink(video.url, video.title, index + 2)}
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

                {/* Guest signup prompt for videos - show if not authenticated and there are more than 2 videos */}
                {!user && diagnosisResult.youtube_videos.length > 2 && (
                  <View style={styles.guestVideoPrompt}>
                    <Text style={styles.guestVideoPromptText}>
                      🔐 <Text style={styles.guestVideoPromptBold}>
                        See {diagnosisResult.youtube_videos.length - 2} More Expert Repair Videos
                      </Text>
                    </Text>
                    <Text style={styles.guestVideoPromptSubtext}>
                      Get access to complete step-by-step repair tutorials from professional mechanics
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>
        )}

        {/* Product Links - Collapsible */}
        {diagnosisResult.product_links && diagnosisResult.product_links.length > 0 && (
          <View style={styles.productsSection}>
            {renderCollapsibleHeader(
              '🛒 Recommended Parts',
              sectionsExpanded.productLinks,
              () => toggleSection('productLinks'),
              diagnosisResult.product_links.length
            )}

            {sectionsExpanded.productLinks && (
              <>
                <Text style={styles.sectionSubtitle}>Find the right parts for your vehicle repair</Text>

            {/* Show first 2 parts for everyone (including guests) */}
            {diagnosisResult.product_links.slice(0, 2).map((product: any, index: number) => (
              <TouchableOpacity
                key={product.id}
                style={[
                  styles.productCard,
                  product.priority === 'high' && styles.highPriorityProduct
                ]}
                onPress={() => openPartLink(product.url, product.name, index)}
                activeOpacity={0.8}
              >
                <View style={styles.productContent}>
                  <View style={styles.productImageContainer}>
                    {product.image && (
                      <Image
                        source={{ uri: product.image }}
                        style={styles.productImage}
                        resizeMode="cover"
                      />
                    )}
                    {product.priority === 'high' && (
                      <View style={styles.priorityBadge}>
                        <Text style={styles.priorityText}>⚡</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.productInfo}>
                    <Text style={styles.productName}>{product.name}</Text>
                    {product.brand && (
                      <Text style={styles.productBrand}>Brand: {product.brand}</Text>
                    )}
                    {product.partNumber && (
                      <Text style={styles.productPartNumber}>Part #: {product.partNumber}</Text>
                    )}
                    <Text style={styles.productDescription}>
                      {product.description || 'Tap to search Google Shopping'}
                    </Text>
                    {product.availability && (
                      <Text style={[
                        styles.productAvailability,
                        product.availability === 'in-stock' && styles.inStock,
                        product.availability === 'limited' && styles.limitedStock,
                        product.availability === 'special-order' && styles.specialOrder
                      ]}>
                        {product.availability === 'in-stock' && '✅ In Stock'}
                        {product.availability === 'limited' && '⚠️ Limited Stock'}
                        {product.availability === 'special-order' && '📦 Special Order'}
                      </Text>
                    )}
                  </View>
                  <View style={styles.productPricing}>
                    <Text style={styles.productPrice}>{product.price}</Text>
                    <Text style={styles.productEstimate}>Estimated</Text>
                    <Text style={styles.linkText}>Shop →</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}

            {/* Show remaining parts only for authenticated users */}
            {user && diagnosisResult.product_links.slice(2).map((product: any, index: number) => (
              <TouchableOpacity
                key={product.id}
                style={[
                  styles.productCard,
                  product.priority === 'high' && styles.highPriorityProduct
                ]}
                onPress={() => openPartLink(product.url, product.name, index + 2)}
                activeOpacity={0.8}
              >
                <View style={styles.productContent}>
                  <View style={styles.productImageContainer}>
                    {product.image && (
                      <Image
                        source={{ uri: product.image }}
                        style={styles.productImage}
                        resizeMode="cover"
                      />
                    )}
                    {product.priority === 'high' && (
                      <View style={styles.priorityBadge}>
                        <Text style={styles.priorityText}>⚡</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.productInfo}>
                    <Text style={styles.productName}>{product.name}</Text>
                    {product.brand && (
                      <Text style={styles.productBrand}>Brand: {product.brand}</Text>
                    )}
                    {product.partNumber && (
                      <Text style={styles.productPartNumber}>Part #: {product.partNumber}</Text>
                    )}
                    <Text style={styles.productDescription}>
                      {product.description || 'Tap to search Google Shopping'}
                    </Text>
                    {product.availability && (
                      <Text style={[
                        styles.productAvailability,
                        product.availability === 'in-stock' && styles.inStock,
                        product.availability === 'limited' && styles.limitedStock,
                        product.availability === 'special-order' && styles.specialOrder
                      ]}>
                        {product.availability === 'in-stock' && '✅ In Stock'}
                        {product.availability === 'limited' && '⚠️ Limited Stock'}
                        {product.availability === 'special-order' && '📦 Special Order'}
                      </Text>
                    )}
                  </View>
                  <View style={styles.productPricing}>
                    <Text style={styles.productPrice}>{product.price}</Text>
                    <Text style={styles.productEstimate}>Estimated</Text>
                    <Text style={styles.linkText}>Shop →</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}

            {/* Guest signup prompt - show if not authenticated and there are more than 2 parts */}
            {!user && diagnosisResult.product_links.length > 2 && (
              <View style={styles.guestSignupPrompt}>
                <View style={styles.guestPromptHeader}>
                  <Text style={styles.guestPromptTitle}>🔐 See More Part Recommendations</Text>
                  <Text style={styles.guestPromptSubtitle}>
                    Get {diagnosisResult.product_links.length - 2} more expert part recommendations with detailed pricing and availability
                  </Text>
                </View>

                <View style={styles.guestPromptFeatures}>
                  <Text style={styles.guestPromptFeature}>✅ Complete parts list with OEM alternatives</Text>
                  <Text style={styles.guestPromptFeature}>💰 Real-time pricing from multiple vendors</Text>
                  <Text style={styles.guestPromptFeature}>📱 Save diagnosis history for future reference</Text>
                  <Text style={styles.guestPromptFeature}>🔧 Access to maintenance logbook</Text>
                </View>

                <TouchableOpacity
                  style={styles.guestSignupButton}
                  onPress={async () => {
                    // Track signup prompt click
                    try {
                      await guestAnalyticsService.trackGuestInteraction({
                        sessionId: guestSessionId,
                        interactionType: 'signup_prompt_click',
                        additionalData: {
                          promptLocation: 'parts_section',
                          extraPartsAvailable: diagnosisResult!.product_links.length - 2
                        }
                      });
                    } catch (error) {
                      console.error('Failed to track signup prompt click:', error);
                    }

                    // Navigate to signup screen - you'll need to implement this navigation
                    Alert.alert(
                      'Sign Up for Full Access',
                      'Create a free account to see all part recommendations, save your diagnosis history, and access advanced features.',
                      [
                        { text: 'Maybe Later', style: 'cancel' },
                        { text: 'Sign Up Free', onPress: () => {
                          // TODO: Navigate to signup screen
                          // navigation.navigate('Auth', { screen: 'SignUp' });
                        }}
                      ]
                    );
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.guestSignupButtonText}>🚀 Sign Up Free - See All Parts</Text>
                </TouchableOpacity>
              </View>
            )}

                <View style={styles.shoppingNote}>
                  <Text style={styles.noteText}>💡 Tip: Compare prices from multiple sellers for the best deals</Text>
                </View>
              </>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderRecentDiagnoses = () => {
    if (recentDiagnoses.length === 0) {
      return <Text style={styles.emptyText}>No recent diagnoses</Text>;
    }

    return (
      <FlatList
        data={recentDiagnoses}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          // Get title color based on AI response availability
          const getTitleColor = (diagnosis: any) => {
            return diagnosis.ai_response ? '#2ecc71' : '#e74c3c'; // Green if has response, red if no response
          };

          // Get diagnosis title from AI response or fallback
          const getDiagnosisTitle = (diagnosis: any) => {
            if (diagnosis.ai_response?.title) {
              return diagnosis.ai_response.title;
            }
            // Fallback: extract from issue description or use generic title
            if (diagnosis.issue_description) {
              const desc = diagnosis.issue_description.toLowerCase();
              if (desc.includes('engine')) return 'Engine Issue';
              if (desc.includes('brake')) return 'Brake Problem';
              if (desc.includes('oil')) return 'Oil Issue';
              if (desc.includes('battery')) return 'Battery Problem';
              if (desc.includes('transmission')) return 'Transmission Issue';
              if (desc.includes('noise')) return 'Noise Issue';
              if (desc.includes('vibration')) return 'Vibration Problem';
              if (desc.includes('leak')) return 'Fluid Leak';
              if (desc.includes('overheating')) return 'Overheating Problem';
              if (desc.includes('starting')) return 'Starting Issue';
            }
            return 'Vehicle Issue';
          };

          return (
            <View style={styles.historyItem}>
              <View style={styles.historyItemHeader}>
                <View style={styles.historyItemInfo}>
                  <Text style={[styles.historyTitle, { color: getTitleColor(item) }]}>
                    {getDiagnosisTitle(item)}
                  </Text>
                  <Text style={styles.historySubtitle}>
                    {item.make || 'Unknown Vehicle'}: {new Date(item.created_at).toLocaleDateString()}
                  </Text>
                </View>
                {item.ai_response && (
                  <TouchableOpacity
                    style={styles.viewDetailsButton}
                    onPress={() => handleViewPreviousDiagnosis(item.id)}
                    disabled={loadingHistoryDetails}
                  >
                    <Text style={styles.viewDetailsText}>
                      {loadingHistoryDetails ? 'Loading...' : 'View Details'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
        scrollEnabled={false}
      />
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#2C8AA6']} // Teal color from logo
            tintColor="#2C8AA6" // iOS
          />
        }
      >
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Vehicle Diagnosis</Text>
          {diagnosisResult && (
            <TouchableOpacity style={styles.newDiagnosisButton} onPress={handleNewDiagnosis}>
              <Text style={styles.newDiagnosisButtonText}>+ New Diagnosis</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.subtitle}>Describe your vehicle's issue for AI-powered analysis</Text>

        {/* Vehicle Selector - Different for guests vs authenticated users */}
        <View style={styles.vehicleSelector}>
          <Text style={styles.label}>Vehicle Information *</Text>

          {!user ? (
            /* Guest Vehicle Input */
            <View style={styles.guestVehicleInputs}>
              <View style={styles.vehicleRow}>
                <View style={styles.vehicleInputContainer}>
                  <Text style={styles.inputLabel}>Make *</Text>
                  <TextInput
                    style={[styles.vehicleInput, !guestVehicle.make && styles.textAreaError]}
                    placeholder="Toyota, Ford, BMW..."
                    placeholderTextColor="#95a5a6"
                    value={guestVehicle.make}
                    onChangeText={(text) => setGuestVehicle(prev => ({ ...prev, make: text }))}
                    autoCapitalize="words"
                  />
                </View>
                <View style={styles.vehicleInputContainer}>
                  <Text style={styles.inputLabel}>Model *</Text>
                  <TextInput
                    style={[styles.vehicleInput, !guestVehicle.model && styles.textAreaError]}
                    placeholder="Camry, F-150, X3..."
                    placeholderTextColor="#95a5a6"
                    value={guestVehicle.model}
                    onChangeText={(text) => setGuestVehicle(prev => ({ ...prev, model: text }))}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              <View style={styles.vehicleRow}>
                <View style={styles.vehicleInputContainer}>
                  <Text style={styles.inputLabel}>Year</Text>
                  <TextInput
                    style={styles.vehicleInput}
                    placeholder="2020"
                    placeholderTextColor="#95a5a6"
                    value={guestVehicle.year.toString()}
                    onChangeText={(text) => {
                      const year = parseInt(text) || new Date().getFullYear();
                      setGuestVehicle(prev => ({ ...prev, year }));
                    }}
                    keyboardType="numeric"
                    maxLength={4}
                  />
                </View>
                <View style={styles.vehicleInputContainer}>
                  <Text style={styles.inputLabel}>Variant</Text>
                  <TextInput
                    style={styles.vehicleInput}
                    placeholder="Optional"
                    placeholderTextColor="#95a5a6"
                    value={guestVehicle.variant}
                    onChangeText={(text) => setGuestVehicle(prev => ({ ...prev, variant: text }))}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              <View style={styles.guestVehicleNote}>
                <Text style={styles.guestNoteText}>
                  💡 Enter your vehicle details to get accurate diagnosis and parts recommendations
                </Text>
              </View>
            </View>
          ) : (
            /* Authenticated User Vehicle Selector */
            loadingVehicles ? (
              <ActivityIndicator style={styles.loader} color="#2C8AA6" />
            ) : vehicles.length === 0 ? (
              <View style={styles.noVehiclesContainer}>
                <Text style={styles.noVehiclesText}>No vehicles found. Please add a vehicle first.</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.dropdown, !selectedVehicleId && styles.dropdownError]}
                onPress={() => setShowVehiclePicker(true)}
              >
                <Text style={styles.dropdownText}>
                  {selectedVehicle
                    ? `${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model} (${selectedVehicle.registration})`
                    : 'Select a vehicle *'}
                </Text>
              </TouchableOpacity>
            )
          )}
        </View>

        {/* Issue Description */}
        <View style={styles.issueSection}>
          <Text style={styles.label}>Issue Description *</Text>
          <TextInput
            style={[styles.textArea, !issueDescription.trim() && styles.textAreaError]}
            placeholder="Describe the problem you're experiencing in detail..."
            placeholderTextColor="#95a5a6"
            value={issueDescription}
            onChangeText={setIssueDescription}
            multiline
            numberOfLines={6}
          />
        </View>

        {/* OBDII Codes */}
        <View style={styles.obdiiSection}>
          <Text style={styles.label}>OBDII Error Codes (Optional)</Text>
          <Text style={styles.obdiiHint}>Enter any error codes from your OBD scanner (e.g., P0300, P0420, B1234)</Text>
          <TextInput
            style={styles.obdiiInput}
            placeholder="P0300, P0420, B1234..."
            placeholderTextColor="#95a5a6"
            value={obdiiCodes}
            onChangeText={setObdiiCodes}
            autoCapitalize="characters"
          />
        </View>

        {/* Photo and Video Upload */}
        <View style={styles.mediaSection}>
          <Text style={styles.label}>Attach Photos/Videos (Optional)</Text>
          <Text style={styles.mediaHint}>Photos and videos help our AI provide more accurate diagnosis</Text>

          {(() => {
            const limits = getPlanLimits();
            return (
              <Text style={styles.planLimitText}>
                Your {user?.plan_type || 'Basic'} plan: {limits.maxImages} image{limits.maxImages === 1 ? '' : 's'}
                {limits.canUploadVideos ? ', 1 video (max 10 sec)' : ', no videos'}
              </Text>
            );
          })()}

          <View style={styles.mediaButtons}>
            <TouchableOpacity
              style={styles.mediaButton}
              onPress={pickImage}
              activeOpacity={0.7}
            >
              <Text style={styles.mediaButtonText}>📸 Add Photo</Text>
              <Text style={styles.photoLimitText}>({selectedImages.length}/{getPlanLimits().maxImages})</Text>
            </TouchableOpacity>

            {(() => {
              const limits = getPlanLimits();
              return limits.canUploadVideos ? (
                <TouchableOpacity
                  style={styles.mediaButton}
                  onPress={pickVideo}
                  activeOpacity={0.7}
                >
                  <Text style={styles.mediaButtonText}>🎥 Add Video</Text>
                  <Text style={styles.videoLimitText}>(Max 10 sec)</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.disabledMediaButton}
                  disabled={true}
                  activeOpacity={1}
                >
                  <Text style={styles.disabledMediaButtonText}>🎥 Add Video</Text>
                  <Text style={styles.premiumOnlyText}>Ultimate plan only</Text>
                </TouchableOpacity>
              );
            })()}
          </View>

          {/* Display selected images */}
          {selectedImages.length > 0 && (
            <View style={styles.selectedMedia}>
              <Text style={styles.selectedMediaTitle}>Selected Photos ({selectedImages.length})</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.imagePreviewContainer}
              >
                {selectedImages.map((imageUri, index) => (
                  <View key={index} style={styles.imagePreview}>
                    <Image source={{ uri: imageUri }} style={styles.previewImage} />
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeImage(index)}
                    >
                      <Text style={styles.removeButtonText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Display selected video */}
          {selectedVideo && (
            <View style={styles.selectedMedia}>
              <Text style={styles.selectedMediaTitle}>Selected Video</Text>
              <View style={styles.videoPreview}>
                <Video
                  source={{ uri: selectedVideo }}
                  style={styles.previewVideo}
                  useNativeControls
                  resizeMode="contain"
                  shouldPlay={false}
                />
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={removeVideo}
                >
                  <Text style={styles.removeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.diagnoseButton, loading && styles.disabledButton]}
          onPress={handleDiagnosis}
          disabled={loading || loadingVehicles}
        >
          <Text style={styles.diagnoseButtonText}>
            {loading ? 'Analyzing...' : '🔍 Get AI Diagnosis'}
          </Text>
        </TouchableOpacity>

        {/* Diagnosis Results */}
        {renderDiagnosisResults()}

        {/* Recent Diagnoses History */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Recent Diagnoses</Text>
          {renderRecentDiagnoses()}
        </View>

        {/* Vehicle Picker Modal */}
        <Modal
          visible={showVehiclePicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowVehiclePicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Vehicle</Text>
              <FlatList
                data={vehicles}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.vehicleItem,
                      selectedVehicleId === item.id && styles.selectedVehicle
                    ]}
                    onPress={() => {
                      setSelectedVehicleId(item.id);
                      setShowVehiclePicker(false);
                    }}
                  >
                    <Text style={styles.vehicleItemText}>
                      {item.year} {item.make} {item.model}
                      {item.is_default && ' (Default)'}
                    </Text>
                    <Text style={styles.vehicleItemSubtext}>
                      Registration: {item.registration}
                    </Text>
                  </TouchableOpacity>
                )}
              />
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowVehiclePicker(false)}
              >
                <Text style={styles.modalCloseText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Previous Diagnosis Details Modal */}
        <Modal
          visible={showDiagnosisModal}
          transparent={true}
          animationType="slide"
          onRequestClose={closeDiagnosisModal}
        >
          <View style={styles.diagnosisModalOverlay}>
            <View style={styles.diagnosisModalContent}>
              {/* Modal Header with X button */}
              <View style={styles.diagnosisModalHeader}>
                <Text style={styles.diagnosisModalTitle}>Previous Diagnosis</Text>
                <TouchableOpacity
                  style={styles.modalCloseX}
                  onPress={closeDiagnosisModal}
                >
                  <Text style={styles.modalCloseXText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Scrollable Content Container */}
              <View style={styles.diagnosisModalScrollContainer}>
                <ScrollView
                  style={styles.diagnosisModalScroll}
                  contentContainerStyle={styles.diagnosisModalScrollContent}
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled={true}
                >
                {selectedHistoryDiagnosis ? (
                  <View style={styles.modalDiagnosisContent}>

                    <Text style={styles.modalDiagnosisDate}>
                      📅 {new Date(selectedHistoryDiagnosis.created_at).toLocaleDateString()} at {new Date(selectedHistoryDiagnosis.created_at).toLocaleTimeString()}
                    </Text>

                    {/* Original Issue Description */}
                    <View style={styles.modalIssueCard}>
                      <Text style={styles.modalCardTitle}>🔧 Original Issue Description</Text>
                      <Text style={styles.modalIssueText}>
                        {selectedHistoryDiagnosis.issue_description || 'No issue description available'}
                      </Text>
                    </View>

                    {/* AI Response */}
                    {selectedHistoryDiagnosis.ai_response ? (
                      <>
                        <View style={styles.modalAiResponseCard}>
                          {renderCollapsibleHeader(
                            '🤖 AI Diagnosis',
                            modalSectionsExpanded.aiDiagnosis,
                            () => toggleModalSection('aiDiagnosis'),
                            undefined,
                            true, // Show copy button
                            () => showDiagnosisForCopy(selectedHistoryDiagnosis.ai_response, {
                              year: selectedHistoryDiagnosis.year,
                              make: selectedHistoryDiagnosis.make,
                              model: selectedHistoryDiagnosis.model
                            })
                          )}

                          {modalSectionsExpanded.aiDiagnosis && (
                            <>
                              {/* Urgency Level Banner */}
                              {selectedHistoryDiagnosis.ai_response.urgencyLevel && (
                                <View style={[styles.urgencyBanner, styles[`urgency${selectedHistoryDiagnosis.ai_response.urgencyLevel}`]]}>
                                  <Text style={styles.urgencyText}>
                                    {selectedHistoryDiagnosis.ai_response.urgencyLevel === 'CRITICAL' && '🚨 CRITICAL'}
                                    {selectedHistoryDiagnosis.ai_response.urgencyLevel === 'HIGH' && '⚠️ HIGH PRIORITY'}
                                    {selectedHistoryDiagnosis.ai_response.urgencyLevel === 'MEDIUM' && '🟡 MEDIUM PRIORITY'}
                                    {selectedHistoryDiagnosis.ai_response.urgencyLevel === 'LOW' && '🟢 LOW PRIORITY'}
                                  </Text>
                                </View>
                              )}

                              {/* Diagnosis Title */}
                              {selectedHistoryDiagnosis.ai_response.title && (
                                <Text style={styles.modalDiagnosisTitle}>{selectedHistoryDiagnosis.ai_response.title}</Text>
                              )}

                              <Text style={styles.modalDiagnosisText}>{selectedHistoryDiagnosis.ai_response.diagnosis}</Text>

                              {/* Key Info Cards */}
                              <View style={styles.infoCards}>
                                {selectedHistoryDiagnosis.ai_response.estimatedCost && (
                                  <View style={styles.infoCard}>
                                    <Text style={styles.infoCardTitle}>💰 Estimated Cost</Text>
                                    <Text style={styles.infoCardValue}>{selectedHistoryDiagnosis.ai_response.estimatedCost}</Text>
                                  </View>
                                )}
                                {selectedHistoryDiagnosis.ai_response.difficulty && (
                                  <View style={styles.infoCard}>
                                    <Text style={styles.infoCardTitle}>🔧 Difficulty</Text>
                                    <Text style={styles.infoCardValue}>
                                      {selectedHistoryDiagnosis.ai_response.difficulty.replace('_', ' ')}
                                    </Text>
                                  </View>
                                )}
                              </View>

                              <Text style={styles.modalSubTitle}>Possible Causes:</Text>
                              {selectedHistoryDiagnosis.ai_response.possibleCauses?.map((cause: string, index: number) => (
                                <Text key={index} style={styles.modalListItem}>• {cause}</Text>
                              ))}

                              <Text style={styles.modalSubTitle}>Recommendations:</Text>
                              {selectedHistoryDiagnosis.ai_response.recommendations?.map((rec: string, index: number) => (
                                <Text key={index} style={styles.modalListItem}>• {rec}</Text>
                              ))}
                            </>
                          )}
                        </View>

                        {/* YouTube Videos - Collapsible */}
                        {selectedHistoryDiagnosis.youtube_videos && selectedHistoryDiagnosis.youtube_videos.length > 0 && (
                          <View style={styles.modalVideoSection}>
                            {renderCollapsibleHeader(
                              '📺 Repair Videos',
                              modalSectionsExpanded.youtubeVideos,
                              () => toggleModalSection('youtubeVideos'),
                              selectedHistoryDiagnosis.youtube_videos.length
                            )}

                            {modalSectionsExpanded.youtubeVideos && (
                              <>
                            {selectedHistoryDiagnosis.youtube_videos.map((video: any) => (
                              <TouchableOpacity
                                key={video.id}
                                style={styles.modalVideoCard}
                                onPress={() => openLink(video.url)}
                                activeOpacity={0.8}
                              >
                                <View style={styles.videoContent}>
                                  <View style={styles.videoIcon}>
                                    <Text style={styles.playIcon}>▶️</Text>
                                  </View>
                                  <View style={styles.videoInfo}>
                                    <Text style={styles.modalVideoTitle}>{video.title}</Text>
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
                              </>
                            )}
                          </View>
                        )}

                        {/* Product Links - Collapsible */}
                        {selectedHistoryDiagnosis.product_links && selectedHistoryDiagnosis.product_links.length > 0 && (
                          <View style={styles.modalProductsSection}>
                            {renderCollapsibleHeader(
                              '🛒 Recommended Parts',
                              modalSectionsExpanded.productLinks,
                              () => toggleModalSection('productLinks'),
                              selectedHistoryDiagnosis.product_links.length
                            )}

                            {modalSectionsExpanded.productLinks && (
                              <>
                            {selectedHistoryDiagnosis.product_links.map((product: any) => (
                              <TouchableOpacity
                                key={product.id}
                                style={[
                                  styles.modalProductCard,
                                  product.priority === 'high' && styles.highPriorityProduct
                                ]}
                                onPress={() => openLink(product.url)}
                                activeOpacity={0.8}
                              >
                                <View style={styles.productContent}>
                                  <View style={styles.productInfo}>
                                    <Text style={styles.modalProductName}>{product.name}</Text>
                                    {product.brand && (
                                      <Text style={styles.productBrand}>Brand: {product.brand}</Text>
                                    )}
                                    {product.partNumber && (
                                      <Text style={styles.productPartNumber}>Part #: {product.partNumber}</Text>
                                    )}
                                    <Text style={styles.productDescription}>
                                      {product.description || 'Tap to search Google Shopping'}
                                    </Text>
                                  </View>
                                  <View style={styles.productPricing}>
                                    <Text style={styles.modalProductPrice}>{product.price}</Text>
                                    <Text style={styles.productEstimate}>Estimated</Text>
                                    <Text style={styles.linkText}>Shop →</Text>
                                  </View>
                                </View>
                              </TouchableOpacity>
                            ))}
                              </>
                            )}
                          </View>
                        )}
                      </>
                    ) : (
                      // Placeholder when no AI response is available
                      <View style={styles.modalPlaceholder}>
                        <Text style={styles.modalPlaceholderTitle}>📋 No Diagnosis Results</Text>
                        <Text style={styles.modalPlaceholderText}>
                          Sorry, we don't have any results for this issue. The diagnosis may still be processing or encountered an error during analysis.
                        </Text>
                        <View style={styles.modalPlaceholderSuggestions}>
                          <Text style={styles.modalPlaceholderSuggestionsTitle}>💡 Suggestions:</Text>
                          <Text style={styles.modalPlaceholderSuggestionItem}>• Try running a new diagnosis with more detailed description</Text>
                          <Text style={styles.modalPlaceholderSuggestionItem}>• Check your internet connection and try again</Text>
                          <Text style={styles.modalPlaceholderSuggestionItem}>• Contact support if the issue persists</Text>
                        </View>
                      </View>
                    )}
                  </View>
                ) : (
                  // Placeholder when no diagnosis data is loaded
                  <View style={styles.modalPlaceholder}>
                    <Text style={styles.modalPlaceholderTitle}>⏳ No Data Available</Text>
                    <Text style={styles.modalPlaceholderText}>
                      No diagnosis data found. This might be a loading issue or the diagnosis may not have completed successfully.
                    </Text>
                  </View>
                )}
                </ScrollView>
              </View>

              {/* Bottom Close Button */}
              <TouchableOpacity
                style={styles.diagnosisModalCloseButton}
                onPress={closeDiagnosisModal}
              >
                <Text style={styles.diagnosisModalCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Copy Text Modal */}
        <Modal
          visible={showCopyModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowCopyModal(false)}
        >
          <View style={styles.copyModalOverlay}>
            <View style={styles.copyModalContent}>
              <View style={styles.copyModalHeader}>
                <Text style={styles.copyModalTitle}>📋 Copy Diagnosis Report</Text>
                <TouchableOpacity
                  style={styles.modalCloseX}
                  onPress={() => setShowCopyModal(false)}
                >
                  <Text style={styles.modalCloseXText}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.copyInstructions}>
                Select all text below and copy to save your diagnosis report:
              </Text>

              <ScrollView style={styles.copyTextContainer} contentContainerStyle={styles.copyTextContentContainer}>
                <Text style={styles.copyTextContent} selectable={true}>
                  {copyText}
                </Text>
              </ScrollView>

              <TouchableOpacity
                style={styles.copyModalButton}
                onPress={() => setShowCopyModal(false)}
              >
                <Text style={styles.copyModalButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
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
    paddingTop: 0, // No top padding below nav
    paddingBottom: 20,
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ecf0f1',
  },
  newDiagnosisButton: {
    backgroundColor: '#2C8AA6',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  newDiagnosisButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 16,
    color: '#bdc3c7',
    marginBottom: 20, // Reduced bottom margin
  },
  vehicleSelector: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ecf0f1',
    marginBottom: 10,
  },
  loader: {
    marginVertical: 20,
  },
  noVehiclesContainer: {
    backgroundColor: '#e74c3c',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 15,
  },
  noVehiclesText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  dropdown: {
    backgroundColor: '#34495e',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: '#34495e',
  },
  dropdownError: {
    borderColor: '#e74c3c',
  },
  dropdownText: {
    color: '#bdc3c7',
    fontSize: 16,
  },
  issueSection: {
    marginBottom: 20,
  },
  obdiiSection: {
    marginBottom: 20,
  },
  obdiiHint: {
    color: '#95a5a6',
    fontSize: 12,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  obdiiInput: {
    backgroundColor: '#34495e',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 15,
    fontSize: 16,
    color: '#ecf0f1',
    borderWidth: 1,
    borderColor: '#34495e',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
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
    borderWidth: 1,
    borderColor: '#34495e',
  },
  textAreaError: {
    borderColor: '#e74c3c',
  },
  mediaSection: {
    backgroundColor: '#2c3e50',
    borderRadius: 8,
    padding: 20,
    marginBottom: 30,
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
    marginBottom: 20,
  },
  mediaButton: {
    flex: 1,
    backgroundColor: '#34495e',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2C8AA6',
  },
  mediaButtonText: {
    color: '#ecf0f1',
    fontSize: 16,
    fontWeight: '600',
  },
  videoLimitText: {
    color: '#95a5a6',
    fontSize: 12,
    marginTop: 2,
  },
  selectedMedia: {
    marginTop: 15,
  },
  selectedMediaTitle: {
    color: '#ecf0f1',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  imagePreviewContainer: {
    marginBottom: 10,
  },
  imagePreview: {
    marginRight: 10,
    position: 'relative',
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  videoPreview: {
    position: 'relative',
  },
  previewVideo: {
    width: '100%',
    height: 150,
    borderRadius: 8,
  },
  removeButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#e74c3c',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  planLimitText: {
    color: '#F4B942',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 10,
    fontWeight: '500',
  },
  photoLimitText: {
    color: '#95a5a6',
    fontSize: 10,
    marginTop: 2,
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
  diagnoseButton: {
    backgroundColor: '#2C8AA6', // Teal color from logo
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 30,
  },
  disabledButton: {
    opacity: 0.6,
  },
  diagnoseButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  // Results Section
  resultsSection: {
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
  diagnosisTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F4B942', // Yellow color from logo
    marginBottom: 10,
    textAlign: 'center',
  },
  diagnosisText: {
    fontSize: 16,
    color: '#bdc3c7',
    lineHeight: 24,
    marginBottom: 15,
    textAlign: 'left',
    flexWrap: 'wrap',
  },
  diagnosisTextContainer: {
    marginBottom: 15,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F4B942', // Yellow color from logo for section headers
    marginTop: 10,
    marginBottom: 5,
  },
  sectionContent: {
    fontSize: 16,
    color: '#bdc3c7', // White text for content
    lineHeight: 22,
    marginBottom: 8,
  },
  boldText: {
    fontWeight: 'bold',
    color: '#F4B942', // Yellow color from logo for section headers
    fontSize: 16,
  },
  subTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F4B942', // Yellow color from logo
    marginTop: 10,
    marginBottom: 8,
  },
  listItem: {
    fontSize: 14,
    color: '#bdc3c7',
    marginBottom: 5,
    paddingLeft: 10,
  },
  summaryText: {
    fontSize: 15,
    color: '#ecf0f1',
    lineHeight: 22,
    marginBottom: 12,
    paddingHorizontal: 5,
    fontStyle: 'italic',
    backgroundColor: '#34495e',
    padding: 12,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#F4B942',
  },
  videoSection: {
    backgroundColor: '#2c3e50',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
  },
  videoCard: {
    backgroundColor: '#34495e',
    borderRadius: 6,
    padding: 12,
    marginBottom: 10,
  },
  videoTitle: {
    fontSize: 16,
    color: '#ecf0f1',
    marginBottom: 5,
  },
  linkText: {
    fontSize: 14,
    color: '#F4B942', // Yellow color from logo
    fontWeight: '500',
  },
  productsSection: {
    backgroundColor: '#2c3e50',
    borderRadius: 8,
    padding: 15,
  },
  productCard: {
    backgroundColor: '#34495e',
    borderRadius: 6,
    padding: 12,
    marginBottom: 10,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    color: '#ecf0f1',
    marginBottom: 5,
  },
  productPrice: {
    fontSize: 16,
    color: '#2ecc71',
    fontWeight: '600',
    marginBottom: 2,
  },
  // Enhanced Video Card Styles
  sectionSubtitle: {
    fontSize: 14,
    color: '#95a5a6',
    marginBottom: 15,
    fontStyle: 'italic',
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
  videoDescription: {
    fontSize: 12,
    color: '#95a5a6',
    marginTop: 2,
  },
  videoAction: {
    alignItems: 'flex-end',
  },
  // Enhanced Product Card Styles
  productContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productIcon: {
    marginRight: 12,
  },
  shoppingIcon: {
    fontSize: 20,
  },
  productDescription: {
    fontSize: 12,
    color: '#95a5a6',
    marginTop: 2,
  },
  productPricing: {
    alignItems: 'flex-end',
  },
  shoppingNote: {
    backgroundColor: '#34495e',
    borderRadius: 6,
    padding: 12,
    marginTop: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#f39c12',
  },
  noteText: {
    fontSize: 12,
    color: '#bdc3c7',
    fontStyle: 'italic',
  },
  // Enhanced AI Diagnosis Styles
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
  // History Section
  historySection: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ecf0f1',
    marginBottom: 15,
  },
  historyItem: {
    backgroundColor: '#2c3e50',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
  },
  historyTitle: {
    fontSize: 16,
    color: '#ecf0f1',
    fontWeight: '600',
    flex: 1,
  },
  historyDate: {
    fontSize: 13,
    color: '#95a5a6',
  },
  historySubtitle: {
    fontSize: 13,
    color: '#95a5a6',
    marginTop: 4,
  },
  emptyText: {
    color: '#95a5a6',
    fontSize: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#2c3e50',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ecf0f1',
    marginBottom: 20,
    textAlign: 'center',
  },
  vehicleItem: {
    backgroundColor: '#34495e',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
  },
  selectedVehicle: {
    backgroundColor: '#2C8AA6', // Teal color from logo
  },
  vehicleItemText: {
    fontSize: 16,
    color: '#ecf0f1',
    fontWeight: '500',
  },
  vehicleItemSubtext: {
    fontSize: 14,
    color: '#95a5a6',
    marginTop: 5,
  },
  modalCloseButton: {
    backgroundColor: '#95a5a6',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 15,
  },
  modalCloseText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  // Enhanced Product Styles
  highPriorityProduct: {
    borderLeftWidth: 4,
    borderLeftColor: '#e74c3c',
  },
  productImageContainer: {
    position: 'relative',
    marginRight: 12,
    width: 60,
    height: 60,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 6,
    backgroundColor: '#34495e',
  },
  priorityBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#e74c3c',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  priorityText: {
    fontSize: 12,
    color: '#fff',
  },
  productBrand: {
    fontSize: 12,
    color: '#F4B942', // Yellow color from logo
    marginBottom: 2,
    fontWeight: '500',
  },
  productPartNumber: {
    fontSize: 11,
    color: '#95a5a6',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  productAvailability: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: '500',
  },
  inStock: {
    color: '#2ecc71',
  },
  limitedStock: {
    color: '#f39c12',
  },
  specialOrder: {
    color: '#95a5a6',
  },
  productEstimate: {
    fontSize: 10,
    color: '#95a5a6',
    marginBottom: 2,
  },
  // Updated History Item Styles
  historyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyItemInfo: {
    flex: 1,
  },
  viewDetailsButton: {
    backgroundColor: '#2C8AA6', // Teal color from logo
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  viewDetailsText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  // Diagnosis Modal Styles
  diagnosisModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  diagnosisModalContent: {
    backgroundColor: '#1a2332',
    borderRadius: 15,
    width: '100%',
    height: '90%',
    overflow: 'hidden',
    flexDirection: 'column',
  },
  diagnosisModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#34495e',
    backgroundColor: '#2c3e50',
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
  },
  diagnosisModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ecf0f1',
  },
  modalCloseX: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#e74c3c',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseXText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  diagnosisModalScrollContainer: {
    flex: 1,
    backgroundColor: '#1a2332',
  },
  diagnosisModalScroll: {
    flex: 1,
  },
  diagnosisModalScrollContent: {
    padding: 20,
    flexGrow: 1,
  },
  modalDiagnosisContent: {
    gap: 15,
  },
  modalDiagnosisDate: {
    fontSize: 14,
    color: '#F4B942', // Yellow color from logo
    fontWeight: '500',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalAiResponseCard: {
    backgroundColor: '#2c3e50',
    borderRadius: 8,
    padding: 15,
  },
  modalCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ecf0f1',
    marginBottom: 10,
  },
  modalDiagnosisTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F4B942', // Yellow color from logo
    marginBottom: 10,
    textAlign: 'center',
  },
  modalDiagnosisText: {
    fontSize: 14,
    color: '#bdc3c7',
    lineHeight: 20,
    marginBottom: 15,
  },
  modalSubTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F4B942', // Yellow color from logo
    marginTop: 10,
    marginBottom: 8,
  },
  modalListItem: {
    fontSize: 13,
    color: '#bdc3c7',
    marginBottom: 4,
    paddingLeft: 10,
  },
  modalVideoSection: {
    backgroundColor: '#2c3e50',
    borderRadius: 8,
    padding: 15,
  },
  modalVideoCard: {
    backgroundColor: '#34495e',
    borderRadius: 6,
    padding: 12,
    marginBottom: 10,
  },
  modalVideoTitle: {
    fontSize: 14,
    color: '#ecf0f1',
    marginBottom: 2,
  },
  modalProductsSection: {
    backgroundColor: '#2c3e50',
    borderRadius: 8,
    padding: 15,
  },
  modalProductCard: {
    backgroundColor: '#34495e',
    borderRadius: 6,
    padding: 12,
    marginBottom: 10,
  },
  modalProductName: {
    fontSize: 14,
    color: '#ecf0f1',
    marginBottom: 2,
  },
  modalProductPrice: {
    fontSize: 14,
    color: '#2ecc71',
    fontWeight: '600',
    marginBottom: 2,
  },
  diagnosisModalCloseButton: {
    backgroundColor: '#95a5a6',
    borderRadius: 0,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
  },
  diagnosisModalCloseText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  // Modal Issue Description Card
  modalIssueCard: {
    backgroundColor: '#2c3e50',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
  },
  modalIssueText: {
    fontSize: 14,
    color: '#bdc3c7',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  // Modal Placeholder Styles
  modalPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  modalPlaceholderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#95a5a6',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalPlaceholderText: {
    fontSize: 14,
    color: '#95a5a6',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  modalPlaceholderSuggestions: {
    alignSelf: 'stretch',
    backgroundColor: '#34495e',
    borderRadius: 8,
    padding: 15,
  },
  modalPlaceholderSuggestionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F4B942', // Yellow color from logo
    marginBottom: 10,
  },
  modalPlaceholderSuggestionItem: {
    fontSize: 13,
    color: '#bdc3c7',
    marginBottom: 5,
    paddingLeft: 5,
  },
  // Guest Signup Prompt Styles
  guestSignupPrompt: {
    backgroundColor: '#34495e',
    borderRadius: 12,
    padding: 20,
    marginTop: 15,
    borderWidth: 2,
    borderColor: '#F4B942',
  },
  guestPromptHeader: {
    alignItems: 'center',
    marginBottom: 15,
  },
  guestPromptTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F4B942',
    textAlign: 'center',
    marginBottom: 8,
  },
  guestPromptSubtitle: {
    fontSize: 14,
    color: '#bdc3c7',
    textAlign: 'center',
    lineHeight: 20,
  },
  guestPromptFeatures: {
    marginBottom: 20,
  },
  guestPromptFeature: {
    fontSize: 14,
    color: '#ecf0f1',
    marginBottom: 8,
    paddingLeft: 5,
  },
  guestSignupButton: {
    backgroundColor: '#2C8AA6',
    borderRadius: 8,
    paddingVertical: 15,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F4B942',
  },
  guestSignupButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  // Guest Video Prompt Styles
  guestVideoPrompt: {
    backgroundColor: '#2c3e50',
    borderRadius: 8,
    padding: 15,
    marginTop: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#F4B942',
  },
  guestVideoPromptText: {
    fontSize: 16,
    color: '#ecf0f1',
    textAlign: 'center',
    marginBottom: 5,
  },
  guestVideoPromptBold: {
    fontWeight: '700',
    color: '#F4B942',
  },
  guestVideoPromptSubtext: {
    fontSize: 12,
    color: '#95a5a6',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // Guest Vehicle Input Styles
  guestVehicleInputs: {
    gap: 15,
  },
  vehicleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  vehicleInputContainer: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ecf0f1',
    marginBottom: 5,
  },
  vehicleInput: {
    backgroundColor: '#34495e',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#ecf0f1',
    borderWidth: 1,
    borderColor: '#34495e',
  },
  guestVehicleNote: {
    backgroundColor: '#2c3e50',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F4B942',
    marginTop: 5,
  },
  guestNoteText: {
    fontSize: 12,
    color: '#bdc3c7',
    fontStyle: 'italic',
  },
  // Collapsible Section Styles
  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 5,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#34495e',
  },
  collapsibleHeaderMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flex: 1,
  },
  collapsibleTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ecf0f1',
    flex: 1,
  },
  collapsibleCount: {
    fontSize: 14,
    color: '#95a5a6',
    fontWeight: 'normal',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  copyButtonInline: {
    backgroundColor: '#2C8AA6',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 40,
    elevation: 2, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  collapsibleArrow: {
    fontSize: 20,
    color: '#F4B942',
    fontWeight: 'bold',
    minWidth: 25,
    textAlign: 'center',
  },
  copyButtonText: {
    fontSize: 18,
    color: '#fff',
  },
  // Clean Recommendations Styles
  recommendationsContainer: {
    backgroundColor: 'transparent',
    marginTop: 5,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
    paddingHorizontal: 5,
  },
  recommendationNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F4B942',
    minWidth: 25,
    marginTop: 2,
  },
  recommendationText: {
    fontSize: 15,
    color: '#ecf0f1',
    lineHeight: 22,
    flex: 1,
    marginLeft: 5,
  },
  // Prevention Tips Styles
  preventionContainer: {
    backgroundColor: '#2c3e50',
    borderRadius: 8,
    padding: 15,
    marginTop: 5,
    borderLeftWidth: 4,
    borderLeftColor: '#2ecc71',
  },
  preventionText: {
    fontSize: 15,
    color: '#ecf0f1',
    lineHeight: 22,
  },
  // Copy Modal Styles
  copyModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  copyModalContent: {
    backgroundColor: '#1a2332',
    borderRadius: 15,
    width: '100%',
    height: '80%',
    paddingBottom: 20,
  },
  copyModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#34495e',
    backgroundColor: '#2c3e50',
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
  },
  copyModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ecf0f1',
  },
  copyInstructions: {
    fontSize: 14,
    color: '#95a5a6',
    marginTop: 15,
    marginBottom: 15,
    marginHorizontal: 20,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  copyTextContainer: {
    backgroundColor: '#2c3e50',
    borderRadius: 8,
    marginHorizontal: 20,
    marginBottom: 20,
    flex: 1,
  },
  copyTextContentContainer: {
    padding: 15,
  },
  copyTextContent: {
    fontSize: 12,
    color: '#ecf0f1',
    lineHeight: 18,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  copyModalButton: {
    backgroundColor: '#2C8AA6',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 30,
    marginHorizontal: 20,
    alignItems: 'center',
  },
  copyModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default DiagnosisScreen;