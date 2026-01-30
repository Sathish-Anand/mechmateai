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

      // Get enhanced YouTube videos using intelligent analysis (similar to AI-powered users)
      const youtubeVideos = await getEnhancedGuestVideoRecommendations(
        formData.make,
        formData.model,
        parseInt(formData.year),
        formData.issueDescription,
        vehicleData
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

  // Helper function to generate enhanced YouTube video recommendations for guest users
  const getEnhancedGuestVideoRecommendations = async (make: string, model: string, year: number, issueDescription: string, vehicle: any) => {
    try {
      const { freeYouTubeService } = require('../../services/freeYouTubeService');

      // Use the same intelligent analysis system as parts recommendations
      const issue = issueDescription.toLowerCase();
      const vehicleInfo = `${year} ${make} ${model}`;

      // Analyze the issue to determine category and generate targeted search queries
      const analysis = analyzeIssueForVideos(issue);
      console.log('Video recommendation analysis:', analysis);

      // Generate enhanced video recommendations based on analysis
      const videos = [];

      // Strategy 1: Category-specific tutorial videos
      const categoryVideos = generateCategorySpecificVideos(vehicleInfo, analysis.category, analysis.symptoms);
      videos.push(...categoryVideos);

      // Strategy 2: Symptom-specific diagnostic videos
      const diagnosticVideos = generateDiagnosticVideos(vehicleInfo, analysis.symptoms, issueDescription);
      videos.push(...diagnosticVideos);

      // Strategy 3: DIY repair tutorials based on priority
      const repairVideos = generateRepairTutorialVideos(vehicleInfo, analysis.category, analysis.severity);
      videos.push(...repairVideos);

      return videos.slice(0, 5); // Return top 5 videos for guests (authenticated users get more)
    } catch (error) {
      console.error('Error generating enhanced guest video recommendations:', error);
      // Fallback to basic video generation
      const { freeYouTubeService } = require('../../services/freeYouTubeService');
      return freeYouTubeService.getDiagnosticVideos(make, model, year, issueDescription);
    }
  };

  // Analyze issue for video recommendations (reuse the same smart analysis from parts)
  const analyzeIssueForVideos = (description: string) => {
    console.log('=== ANALYZING ISSUE FOR VIDEOS ===');
    console.log('Original description:', description);
    console.log('Lowercase description:', description.toLowerCase());

    const analysis = {
      category: 'general',
      severity: 'medium',
      symptoms: [],
      searchTerms: []
    };

    // Use the same comprehensive category analysis as parts recommendations
    const categories = {
      engine: {
        keywords: ['engine', 'rough idle', 'misfire', 'stall', 'hesitat', 'knock', 'ping', 'power loss', 'acceleration',
                  'rough', 'idle', 'RPM', 'rev', 'performance', 'sluggish', 'won\'t accelerate', 'slow', 'weak'],
        searchTerms: ['engine diagnosis', 'engine repair', 'engine troubleshooting', 'engine problems']
      },
      brakes: {
        keywords: ['brake', 'squeal', 'grinding', 'stopping', 'pedal', 'spongy', 'grab', 'vibrat', 'noise', 'screech',
                  'metal', 'hard to stop', 'soft pedal', 'brake light', 'abs', 'pulsing'],
        searchTerms: ['brake repair', 'brake replacement', 'brake diagnosis', 'brake problems']
      },
      electrical: {
        keywords: ['battery', 'starting', 'start', 'electrical', 'dead', 'wont start', 'alternator', 'charging',
                  'lights', 'dim', 'click', 'turn over', 'jump', 'power', 'radio', 'dashboard'],
        searchTerms: ['electrical diagnosis', 'battery replacement', 'alternator repair', 'starting problems']
      },
      drivetrain: {
        keywords: ['transmission', 'gear', 'shift', 'clutch', 'slip', 'jerk', 'delay', 'automatic', 'manual',
                  'hard shift', 'won\'t shift', 'stuck', 'grinding gears'],
        searchTerms: ['transmission repair', 'transmission problems', 'clutch replacement', 'gear issues']
      },
      suspension: {
        keywords: ['suspension', 'shock', 'strut', 'bounce', 'rough ride', 'handling', 'lean', 'bumpy', 'steering',
                  'pull', 'drift', 'alignment', 'tire wear'],
        searchTerms: ['suspension repair', 'shock replacement', 'strut repair', 'handling problems']
      },
      cooling: {
        keywords: ['cooling', 'overheat', 'coolant', 'radiator', 'temperature', 'hot', 'steam', 'boil', 'fan',
                  'thermostat', 'leak', 'temp gauge', 'warning light'],
        searchTerms: ['overheating repair', 'cooling system', 'radiator replacement', 'coolant flush']
      },
      wipers: {
        keywords: ['wiper', 'windshield', 'streak', 'smear', 'rain', 'blade', 'washer', 'fluid', 'spray'],
        searchTerms: ['windshield wiper repair', 'wiper blade replacement', 'wiper motor repair']
      },
      tires: {
        keywords: ['tire', 'tyre', 'flat', 'puncture', 'pressure', 'wear', 'tread', 'wobble', 'vibration at speed'],
        searchTerms: ['tire repair', 'tire replacement', 'tire pressure', 'wheel balance']
      },
      exhaust: {
        keywords: ['exhaust', 'muffler', 'loud', 'smoke', 'emissions', 'catalytic', 'pipe', 'smell'],
        searchTerms: ['exhaust repair', 'muffler replacement', 'catalytic converter', 'exhaust system']
      }
    };

    // Find matching category
    for (const [cat, data] of Object.entries(categories)) {
      console.log(`Checking category: ${cat}`);
      const matches = data.keywords.filter(keyword => description.toLowerCase().includes(keyword.toLowerCase()));
      console.log(`Found matches for ${cat}:`, matches);

      if (matches.length > 0) {
        analysis.category = cat;
        analysis.symptoms = matches;
        analysis.searchTerms = data.searchTerms;
        console.log(`MATCHED CATEGORY: ${cat} with symptoms:`, matches);
        break;
      }
    }

    console.log('Final video analysis:', analysis);
    console.log('=== END VIDEO ANALYSIS ===');

    return analysis;
  };

  // Generate category-specific video recommendations
  const generateCategorySpecificVideos = (vehicleInfo: string, category: string, symptoms: string[]) => {
    const videos = [];

    console.log('=== GENERATING CATEGORY VIDEOS ===');
    console.log('Vehicle:', vehicleInfo);
    console.log('Category:', category);
    console.log('Symptoms:', symptoms);

    // Use the most specific symptom for better targeting
    const primarySymptom = symptoms.length > 0 ? symptoms[0] : category;
    const make = vehicleInfo.split(' ')[1] || vehicleInfo.split(' ')[0]; // Get make (Toyota, Honda, etc.)

    // Main symptom-specific video (most relevant)
    if (symptoms.length > 0 && primarySymptom !== category) {
      videos.push({
        id: `symptom_specific_1`,
        title: `${make.toUpperCase()} ${primarySymptom.toUpperCase()} Problem - How to Fix & Diagnose`,
        description: `Complete guide to fix ${primarySymptom} issues in ${vehicleInfo}. Step-by-step diagnosis, common causes, and repair solutions.`,
        url: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${vehicleInfo} ${primarySymptom} fix repair tutorial mechanic diagnosis`)}`,
        channelTitle: 'Professional Mechanic'
      });
    }

    // Category diagnostic video
    videos.push({
      id: `category_${category}_1`,
      title: `${make.toUpperCase()} ${category.toUpperCase()} Problems - Complete Diagnostic Guide`,
      description: `Professional diagnostic guide for ${category} system issues in ${vehicleInfo}. Learn symptoms, causes, and repair solutions.`,
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${vehicleInfo} ${category} problems diagnosis repair guide`)}`,
      channelTitle: 'Automotive Diagnostic Expert'
    });

    console.log('Generated category videos:', videos);
    console.log('=== END CATEGORY VIDEOS ===');

    return videos;
  };

  // Generate diagnostic-focused videos
  const generateDiagnosticVideos = (vehicleInfo: string, symptoms: string[], issueDescription: string) => {
    const videos = [];
    const make = vehicleInfo.split(' ')[2] || vehicleInfo.split(' ')[1];

    // General diagnostic video
    videos.push({
      id: 'diagnostic_general_1',
      title: `${make?.toUpperCase()} Troubleshooting Guide - Common Issues & Solutions`,
      description: `Comprehensive troubleshooting guide for ${vehicleInfo}. Professional diagnostic techniques to identify and solve common problems.`,
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${vehicleInfo} troubleshooting diagnostic guide common problems mechanic`)}`,
      channelTitle: 'Automotive Diagnostic Expert'
    });

    return videos;
  };

  // Generate DIY repair tutorial videos
  const generateRepairTutorialVideos = (vehicleInfo: string, category: string, severity: string) => {
    const videos = [];
    const make = vehicleInfo.split(' ')[2] || vehicleInfo.split(' ')[1];

    // DIY repair video (for non-critical issues)
    if (severity !== 'critical') {
      videos.push({
        id: 'diy_repair_1',
        title: `DIY ${category.toUpperCase()} Repair - ${make?.toUpperCase()} Money-Saving Guide`,
        description: `Save money with this DIY repair guide for ${vehicleInfo}. Complete tutorial with tools list, parts needed, and safety procedures.`,
        url: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${vehicleInfo} ${category} DIY repair tutorial save money tools`)}`,
        channelTitle: 'DIY Automotive Channel'
      });
    }

    // Maintenance prevention video
    videos.push({
      id: 'maintenance_1',
      title: `${vehicleInfo} Maintenance Schedule - Prevent Future ${category.toUpperCase()} Problems`,
      description: `Essential maintenance guide for ${vehicleInfo} to prevent ${category} issues and ensure long-term reliability.`,
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${vehicleInfo} maintenance schedule ${category} prevention guide`)}`,
      channelTitle: 'Automotive Maintenance Expert'
    });

    return videos;
  };

  // Helper function to generate intelligent part recommendations for guests using smart analysis
  const generateGuestPartRecommendations = (issueDescription: string, vehicle: any) => {
    const issue = issueDescription.toLowerCase();
    const parts = [];

    console.log('Analyzing guest issue for smart parts:', issue);

    // Generate Google Shopping URLs for parts
    const generateGoogleShoppingURL = (vehicleInfo: any, partName: string) => {
      const vehicleString = `${vehicleInfo.year} ${vehicleInfo.make} ${vehicleInfo.model}`;
      const searchQuery = `${vehicleString} ${partName}`;
      return `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(searchQuery)}`;
    };

    // Smart analysis function to determine issue category and severity
    const analyzeIssue = (description: string) => {
      console.log('=== ANALYZING ISSUE FOR PARTS ===');
      console.log('Original description:', description);
      console.log('Lowercase description:', description.toLowerCase());

      const analysis = {
        category: 'general',
        severity: 'medium',
        symptoms: [],
        likelyComponents: []
      };

      // Analyze for multiple categories with comprehensive keyword matching
      const categories = {
        engine: {
          keywords: ['engine', 'rough idle', 'misfire', 'stall', 'hesitat', 'knock', 'ping', 'power loss', 'acceleration',
                    'rough', 'idle', 'RPM', 'rev', 'performance', 'sluggish', 'won\'t accelerate', 'slow', 'weak'],
          priority: 'high',
          components: ['ignition', 'fuel', 'air', 'compression']
        },
        brakes: {
          keywords: ['brake', 'squeal', 'grinding', 'stopping', 'pedal', 'spongy', 'grab', 'vibrat', 'noise', 'screech',
                    'metal', 'hard to stop', 'soft pedal', 'brake light', 'abs', 'pulsing'],
          priority: 'critical',
          components: ['pads', 'rotors', 'fluid', 'calipers']
        },
        electrical: {
          keywords: ['battery', 'starting', 'start', 'electrical', 'dead', 'wont start', 'alternator', 'charging',
                    'lights', 'dim', 'click', 'turn over', 'jump', 'power', 'radio', 'dashboard'],
          priority: 'high',
          components: ['battery', 'alternator', 'starter', 'wiring']
        },
        drivetrain: {
          keywords: ['transmission', 'gear', 'shift', 'clutch', 'slip', 'jerk', 'delay', 'automatic', 'manual',
                    'hard shift', 'won\'t shift', 'stuck', 'grinding gears'],
          priority: 'high',
          components: ['fluid', 'filter', 'clutch', 'cv joints']
        },
        suspension: {
          keywords: ['suspension', 'shock', 'strut', 'bounce', 'rough ride', 'handling', 'lean', 'bumpy', 'steering',
                    'pull', 'drift', 'alignment', 'tire wear'],
          priority: 'medium',
          components: ['shocks', 'struts', 'springs', 'bushings']
        },
        cooling: {
          keywords: ['cooling', 'overheat', 'coolant', 'radiator', 'temperature', 'hot', 'steam', 'boil', 'fan',
                    'thermostat', 'leak', 'temp gauge', 'warning light'],
          priority: 'critical',
          components: ['coolant', 'radiator', 'thermostat', 'water pump']
        },
        maintenance: {
          keywords: ['oil', 'change', 'maintenance', 'service', 'filter', 'tune', 'schedule', 'check engine',
                    'routine', 'fluid', 'belt', 'hose'],
          priority: 'low',
          components: ['oil', 'filters', 'fluids', 'belts']
        },
        wipers: {
          keywords: ['wiper', 'windshield', 'streak', 'smear', 'rain', 'blade', 'washer', 'fluid', 'spray'],
          priority: 'low',
          components: ['blades', 'motor', 'fluid', 'arms']
        },
        tires: {
          keywords: ['tire', 'tyre', 'flat', 'puncture', 'pressure', 'wear', 'tread', 'wobble', 'vibration at speed'],
          priority: 'medium',
          components: ['tire', 'valve', 'rim', 'balance']
        },
        exhaust: {
          keywords: ['exhaust', 'muffler', 'loud', 'smoke', 'emissions', 'catalytic', 'pipe', 'smell'],
          priority: 'medium',
          components: ['muffler', 'catalytic converter', 'exhaust pipe', 'gasket']
        }
      };

      // Find matching categories and determine primary issue
      for (const [cat, data] of Object.entries(categories)) {
        console.log(`Checking parts category: ${cat}`);
        const matches = data.keywords.filter(keyword => description.toLowerCase().includes(keyword.toLowerCase()));
        console.log(`Found matches for ${cat}:`, matches);

        if (matches.length > 0) {
          analysis.category = cat;
          analysis.severity = data.priority;
          analysis.symptoms = matches;
          analysis.likelyComponents = data.components;
          console.log(`MATCHED PARTS CATEGORY: ${cat} with symptoms:`, matches);
          break;
        }
      }

      console.log('Final parts analysis:', analysis);
      console.log('=== END PARTS ANALYSIS ===');

      return analysis;
    };

    const analysis = analyzeIssue(issue);
    console.log('Issue analysis result:', analysis);

    // Generate parts based on intelligent analysis
    const generatePartsForCategory = (category: string, components: string[]) => {
      const partsByCategory = {
        engine: [
          { name: 'Spark Plugs', price: '$15-$50', priority: 'high' },
          { name: 'Ignition Coil', price: '$45-$150', priority: 'high' },
          { name: 'Air Filter', price: '$12-$35', priority: 'medium' },
          { name: 'Fuel Filter', price: '$20-$60', priority: 'medium' },
          { name: 'Mass Air Flow Sensor', price: '$80-$250', priority: 'medium' }
        ],
        brakes: [
          { name: 'Brake Pads', price: '$25-$85', priority: 'critical' },
          { name: 'Brake Rotors', price: '$45-$150', priority: 'high' },
          { name: 'Brake Fluid', price: '$8-$20', priority: 'high' },
          { name: 'Brake Caliper', price: '$80-$300', priority: 'medium' }
        ],
        electrical: [
          { name: 'Car Battery', price: '$80-$220', priority: 'critical' },
          { name: 'Alternator', price: '$150-$500', priority: 'high' },
          { name: 'Starter Motor', price: '$120-$400', priority: 'high' },
          { name: 'Battery Cables', price: '$25-$75', priority: 'medium' }
        ],
        drivetrain: [
          { name: 'Transmission Fluid', price: '$15-$45', priority: 'high' },
          { name: 'Transmission Filter', price: '$20-$70', priority: 'medium' },
          { name: 'CV Joint', price: '$60-$180', priority: 'medium' },
          { name: 'Clutch Kit', price: '$200-$600', priority: 'high' }
        ],
        suspension: [
          { name: 'Shock Absorbers', price: '$40-$150', priority: 'medium' },
          { name: 'Struts', price: '$60-$200', priority: 'medium' },
          { name: 'Sway Bar Links', price: '$20-$60', priority: 'low' },
          { name: 'Control Arm Bushings', price: '$15-$45', priority: 'low' }
        ],
        cooling: [
          { name: 'Engine Coolant', price: '$12-$30', priority: 'critical' },
          { name: 'Radiator', price: '$120-$400', priority: 'high' },
          { name: 'Thermostat', price: '$25-$75', priority: 'high' },
          { name: 'Water Pump', price: '$80-$250', priority: 'medium' }
        ],
        maintenance: [
          { name: 'Engine Oil', price: '$20-$60', priority: 'medium' },
          { name: 'Oil Filter', price: '$8-$25', priority: 'medium' },
          { name: 'Cabin Air Filter', price: '$15-$40', priority: 'low' },
          { name: 'Serpentine Belt', price: '$25-$65', priority: 'medium' }
        ]
      };

      const categoryParts = partsByCategory[category] || partsByCategory.maintenance;

      // Sort by priority and return top 3 most relevant parts
      const priorityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
      return categoryParts
        .sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority])
        .slice(0, 3);
    };

    const recommendedParts = generatePartsForCategory(analysis.category, analysis.likelyComponents);
    console.log('Recommended parts:', recommendedParts);

    // Convert to the expected format
    recommendedParts.forEach((part, index) => {
      parts.push({
        id: `smart_part_${index + 1}`,
        name: part.name,
        price: part.price,
        searchUrl: generateGoogleShoppingURL(vehicle, part.name),
        priority: part.priority,
        category: analysis.category,
        description: `${part.name} for ${vehicle.year} ${vehicle.make} ${vehicle.model}`
      });
    });

    // The smart analysis system above always provides relevant parts
    // No fallback needed as the system handles all categories including 'general'

    return parts.slice(0, 2); // Return max 2 parts for guests
  };

  // Generate dynamic AI diagnosis preview based on detected issue
  const generateAIDiagnosisPreview = (issueDescription: string) => {
    console.log('=== AI DIAGNOSIS PREVIEW GENERATION ===');
    console.log('Input issue description:', issueDescription);

    const analysis = analyzeIssueForPreview(issueDescription.toLowerCase());
    console.log('Detected category:', analysis.category);

    const mockData = {
      brakes: {
        urgency: '🚨 CRITICAL PRIORITY',
        cost: '$150-$400',
        difficulty: 'Moderate',
        title: 'Brake System Safety Issue Detected',
        analysis: 'Professional AI analysis reveals critical brake system degradation based on your symptoms. The grinding noise combined with reduced stopping power indicates worn brake components that pose immediate safety risks and require urgent professional attention to prevent complete brake failure and ensure driving safety.',
        steps: '1. Emergency Safety Inspection - Check brake fluid levels and pad thickness\n2. Professional Brake System Diagnosis - Complete hydraulic pressure testing\n3. Component Replacement Assessment - Determine pads, rotors, and caliper condition\n4. System Restoration Process - Replace worn components and test stopping power\n5. Road Test Verification - Ensure proper brake performance and pedal feel',
        prevention: 'Regular maintenance intervals: Brake inspection every 12,000 miles or annually\nWarning signs to watch for: Squealing sounds, vibration during braking, soft or spongy pedal feel, longer stopping distances\nBest practices: Gentle braking techniques, avoid riding the brakes, use quality brake components, flush brake fluid every 2 years'
      },
      engine: {
        urgency: '⚠️ HIGH PRIORITY',
        cost: '$200-$800',
        difficulty: 'Hard',
        title: 'Engine Performance Issue Detected',
        analysis: 'Advanced diagnostic algorithms indicate significant engine performance degradation. The combination of rough idle, poor acceleration, and unusual noises suggests critical failures in multiple engine systems requiring immediate professional intervention to prevent catastrophic engine damage and costly repairs.',
        steps: '1. Comprehensive Engine Diagnostic Scan - Full OBD-II code analysis and sensor readings\n2. Fuel System Performance Assessment - Pressure testing, injector analysis, and filter inspection\n3. Ignition System Component Evaluation - Spark plug, coil, and timing analysis\n4. Air Intake and Exhaust System Review - Airflow measurement and emission testing\n5. Engine Mechanical Inspection - Compression test and internal component assessment',
        prevention: 'Regular maintenance intervals: Oil changes every 5,000-7,500 miles, tune-ups every 30,000 miles\nWarning signs to watch for: Rough idle, decreased fuel economy, check engine light, unusual engine noises, poor acceleration\nBest practices: Use quality fuel and oil, replace air filter regularly, address issues promptly, follow manufacturer service schedule'
      },
      electrical: {
        urgency: '⚠️ HIGH PRIORITY',
        cost: '$80-$350',
        difficulty: 'Moderate',
        title: 'Electrical System Failure Detected',
        analysis: 'Sophisticated electrical system analysis reveals critical failures in your vehicles charging or starting circuit. The combination of starting difficulties, dim lights, and electrical irregularities indicates potential battery, alternator, or starter motor malfunctions that require immediate professional electrical diagnosis to prevent being stranded.',
        steps: '1. Battery Load Test and Voltage Analysis - Complete battery capacity and condition assessment\n2. Charging System Performance Evaluation - Alternator output testing and belt inspection\n3. Starter Motor Circuit Diagnosis - Current draw testing and connection analysis\n4. Electrical Connection and Wiring Review - Clean corrosion and test continuity\n5. Computer System Scan - Check for electrical fault codes and system errors',
        prevention: 'Regular maintenance intervals: Battery test every 6 months, replace every 3-5 years\nWarning signs to watch for: Dim headlights, slow engine cranking, dashboard warning lights, electrical accessories malfunctioning\nBest practices: Keep battery terminals clean and tight, avoid leaving lights on, test charging system annually, replace worn belts promptly'
      },
      wipers: {
        urgency: '🟡 MEDIUM PRIORITY',
        cost: '$25-$80',
        difficulty: 'Easy',
        title: 'Windshield Wiper System Issue',
        analysis: 'Professional AI analysis identifies critical windshield wiper system degradation affecting your driving safety and visibility. The streaking, noise, and poor wiping performance indicate worn wiper blades, contaminated windshield surface, or wiper system mechanical issues that compromise safe driving during rain or inclement weather conditions.',
        steps: '1. Wiper Blade Condition Assessment - Check blade rubber integrity and flexibility\n2. Windshield Surface Deep Cleaning - Remove wax buildup and contaminants\n3. Wiper Arm Alignment and Pressure Check - Ensure proper contact and movement\n4. Washer Fluid System Test - Check pump operation and nozzle spray pattern\n5. Complete System Function Verification - Test all wiper speeds and washer operation',
        prevention: 'Regular maintenance intervals: Replace wiper blades every 6-12 months or seasonally\nWarning signs to watch for: Streaking or smearing, chattering noise, skipping areas, poor contact with windshield\nBest practices: Clean windshield regularly, lift wipers in freezing weather, use quality wiper fluid, replace blades before winter'
      },
      default: {
        urgency: '🟡 MEDIUM PRIORITY',
        cost: '$100-$500',
        difficulty: 'Moderate',
        title: 'Vehicle System Issue Detected',
        analysis: 'Your vehicle symptoms indicate a system malfunction requiring professional diagnosis to identify root causes and prevent further damage...',
        steps: '1. Comprehensive Vehicle Inspection\n2. System-Specific Diagnostic Testing\n3. Component Performance Analysis\n4. Repair Strategy Development...',
        prevention: 'Regular maintenance intervals: Follow service schedule\nWarning signs to watch for: Unusual noises, performance changes\nBest practices: Regular inspections, quality parts...'
      }
    };

    const selectedData = mockData[analysis.category] || mockData.default;
    console.log('Selected AI preview data:', selectedData.title);
    console.log('=== END AI DIAGNOSIS PREVIEW GENERATION ===');

    return selectedData;
  };

  // Simple analysis for AI preview (reuse same logic)
  const analyzeIssueForPreview = (description: string) => {
    const categories = ['brakes', 'engine', 'electrical', 'wipers'];

    for (const category of categories) {
      if (category === 'brakes' && (description.includes('brake') || description.includes('grinding') || description.includes('squeal'))) {
        return { category: 'brakes' };
      }
      if (category === 'engine' && (description.includes('engine') || description.includes('rough') || description.includes('idle'))) {
        return { category: 'engine' };
      }
      if (category === 'electrical' && (description.includes('start') || description.includes('battery') || description.includes('electrical'))) {
        return { category: 'electrical' };
      }
      if (category === 'wipers' && (description.includes('wiper') || description.includes('windshield') || description.includes('streak'))) {
        return { category: 'wipers' };
      }
    }

    return { category: 'default' };
  };

  const renderGuestDiagnosisResults = () => {
    if (!diagnosisResult) return null;

    // Get dynamic preview data based on the original issue description
    const currentIssueDescription = formData.issueDescription || '';
    const previewData = generateAIDiagnosisPreview(currentIssueDescription);

    console.log('Generating AI diagnosis preview for:', currentIssueDescription);
    console.log('Preview data generated:', previewData.title);

    return (
      <View style={styles.resultsSection}>
        <Text style={styles.sectionTitle}>🔍 Guest Diagnosis Results</Text>

        {/* Guest Feature Notice - Show at the top */}
        <View style={styles.guestNotice}>
          <Text style={styles.guestNoticeText}>
            🎁 Guest Preview: AI diagnosis + 2 videos + 2 parts below
          </Text>
          <Text style={styles.guestNoticeSubtext}>
            Premium users get unlimited results with complete AI-powered analysis
          </Text>
        </View>

        {/* AI Diagnosis Preview - Blurred for Guests */}
        <View style={styles.aiDiagnosisPreview}>
          <Text style={styles.previewTitle}>🤖 AI Diagnosis (Premium Feature)</Text>

          {/* Dynamic mock AI diagnosis content with blur effect */}
          <View style={styles.blurredDiagnosisCard}>
            {/* Urgency Banner */}
            <View style={styles.urgencyBanner}>
              <Text style={styles.urgencyText}>{previewData.urgency}</Text>
            </View>

            {/* Key Info Cards */}
            <View style={styles.infoCards}>
              <View style={styles.infoCard}>
                <Text style={styles.infoCardTitle}>💰 Estimated Cost</Text>
                <Text style={styles.infoCardValue}>{previewData.cost}</Text>
              </View>
              <View style={styles.infoCard}>
                <Text style={styles.infoCardTitle}>🔧 Difficulty</Text>
                <Text style={styles.infoCardValue}>{previewData.difficulty}</Text>
              </View>
            </View>

            {/* Diagnosis Title */}
            <Text style={styles.mockDiagnosisTitle}>{previewData.title}</Text>

            {/* Blurred Content Sections */}
            <View style={styles.blurredSection}>
              <Text style={styles.sectionLabel}>🔍 Detailed Analysis:</Text>
              <View style={styles.blurredTextContainer}>
                <Text style={styles.blurredText}>
                  {previewData.analysis}
                </Text>
                <View style={styles.blurOverlay} />
              </View>
            </View>

            <View style={styles.blurredSection}>
              <Text style={styles.sectionLabel}>🔧 Step-by-Step Repair Guide:</Text>
              <View style={styles.blurredTextContainer}>
                <Text style={styles.blurredText}>
                  {previewData.steps}
                </Text>
                <View style={styles.blurOverlay} />
              </View>
            </View>

            <View style={styles.blurredSection}>
              <Text style={styles.sectionLabel}>🛡️ Prevention Tips:</Text>
              <View style={styles.blurredTextContainer}>
                <Text style={styles.blurredText}>
                  {previewData.prevention}
                </Text>
                <View style={styles.blurOverlay} />
              </View>
            </View>

            {/* Signup Call-to-Action */}
            <View style={styles.aiSignupPrompt}>
              <Text style={styles.aiSignupTitle}>🚀 Get Full AI Diagnosis</Text>
              <Text style={styles.aiSignupSubtitle}>
                Sign up now for instant access to complete diagnostic analysis, detailed repair guides, and professional recommendations
              </Text>
              <TouchableOpacity
                style={styles.aiSignupButton}
                onPress={() => setShowSignupModal(true)}
              >
                <Text style={styles.aiSignupButtonText}>Unlock AI Diagnosis - Sign Up Free</Text>
              </TouchableOpacity>
            </View>
          </View>
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
        <View style={styles.formHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>← Back</Text>
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
  formHeader: {
    marginBottom: 30,
  },
  backButtonText: {
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
  // AI Diagnosis Preview Styles
  aiDiagnosisPreview: {
    backgroundColor: '#2c3e50',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#F4B942',
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F4B942',
    textAlign: 'center',
    marginBottom: 15,
  },
  blurredDiagnosisCard: {
    backgroundColor: '#34495e',
    borderRadius: 8,
    padding: 15,
  },
  urgencyBanner: {
    backgroundColor: '#e74c3c',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginBottom: 15,
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
    backgroundColor: '#2c3e50',
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
  mockDiagnosisTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F4B942',
    textAlign: 'center',
    marginBottom: 15,
  },
  blurredSection: {
    marginBottom: 15,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C8AA6',
    marginBottom: 8,
  },
  blurredTextContainer: {
    position: 'relative',
  },
  blurredText: {
    fontSize: 14,
    color: '#bdc3c7',
    lineHeight: 20,
    padding: 10,
    backgroundColor: '#2c3e50',
    borderRadius: 6,
  },
  blurOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(44, 62, 80, 0.85)',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiSignupPrompt: {
    backgroundColor: '#2C8AA6',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  aiSignupTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  aiSignupSubtitle: {
    fontSize: 12,
    color: '#ecf0f1',
    textAlign: 'center',
    marginBottom: 15,
    lineHeight: 18,
  },
  aiSignupButton: {
    backgroundColor: '#F4B942',
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  aiSignupButtonText: {
    color: '#1a2332',
    fontSize: 14,
    fontWeight: '700',
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