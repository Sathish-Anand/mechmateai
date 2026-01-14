import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  Platform,
  Image,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../utils/supabase';

const LogbookScreen = () => {
  const { user } = useAuth();

  // State management
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('all');
  const [logbookEntries, setLogbookEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterLoading, setFilterLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [addingEntry, setAddingEntry] = useState(false);
  const [updatingEntry, setUpdatingEntry] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);

  // Receipt viewing state
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState<{url: string, entry: any} | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    date: new Date(),
    serviceType: 'MAINTENANCE',
    cost: '',
    description: '',
    vehicleId: '',
    odometer: '',
  });

  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Photo state
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Service types
  const serviceTypes = [
    { label: '🔧 Maintenance', value: 'MAINTENANCE' },
    { label: '🛠️ Repair', value: 'REPAIR' },
    { label: '⛽ Fuel', value: 'FUEL' },
    { label: '🧽 Cleaning', value: 'CLEANING' },
    { label: '🔍 Inspection', value: 'INSPECTION' },
    { label: '🛞 Tires', value: 'TIRES' },
    { label: '🔋 Battery', value: 'BATTERY' },
    { label: '🛢️ Oil Change', value: 'OIL_CHANGE' },
    { label: '📋 Other', value: 'OTHER' },
  ];

  useEffect(() => {
    if (user?.id) {
      fetchInitialData();
    }
  }, [user?.id]);

  useEffect(() => {
    if (vehicles.length > 0 && !formData.vehicleId) {
      const defaultVehicle = vehicles.find(v => v.is_default) || vehicles[0];
      setFormData(prev => ({ ...prev, vehicleId: defaultVehicle.id }));
    }
  }, [vehicles]);

  // Auto-refresh logbook entries when vehicle selection changes
  useEffect(() => {
    if (user?.id && vehicles.length > 0) {
      setFilterLoading(true);
      fetchLogbookEntries().finally(() => setFilterLoading(false));
    }
  }, [selectedVehicleId, user?.id, vehicles.length]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchVehicles(),
        fetchLogbookEntries(),
      ]);
    } catch (error) {
      console.error('Error fetching initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVehicles = async () => {
    try {
      // Guard against undefined user ID
      if (!user?.id) {
        console.log('No user ID available, skipping vehicles fetch');
        return;
      }

      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;
      setVehicles(data || []);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    }
  };

  const fetchLogbookEntries = async () => {
    try {
      // Guard against undefined user ID
      if (!user?.id) {
        console.log('No user ID available, skipping logbook entries fetch');
        return;
      }

      const query = supabase
        .from('logbook_entries')
        .select(`
          *,
          vehicles (
            id,
            make,
            model,
            year,
            vehicle_type,
            engine,
            transmission
          )
        `)
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (selectedVehicleId !== 'all') {
        query.eq('vehicle_id', selectedVehicleId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setLogbookEntries(data || []);
    } catch (error) {
      console.error('Error fetching logbook entries:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchLogbookEntries();
    } catch (error) {
      console.error('Error refreshing logbook:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    const defaultVehicle = vehicles.find(v => v.is_default) || vehicles[0];
    setFormData({
      date: new Date(),
      serviceType: 'MAINTENANCE',
      cost: '',
      description: '',
      vehicleId: defaultVehicle?.id || '',
      odometer: '',
    });
    setSelectedImage(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    resetForm();
  };

  const openUpdateModal = (entry: any) => {
    setSelectedEntry(entry);
    setFormData({
      date: new Date(entry.date),
      serviceType: entry.service_type,
      cost: entry.cost?.toString() || '',
      description: entry.description || entry.work_done || '',
      vehicleId: entry.vehicle_id,
      odometer: entry.odometer?.toString() || '',
    });
    setSelectedImage(entry.receipt_image_url || null);
    setShowUpdateModal(true);
  };

  const closeUpdateModal = () => {
    setShowUpdateModal(false);
    setSelectedEntry(null);
    resetForm();
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      updateField('date', selectedDate);
    }
  };

  // Plan-based restrictions
  const canUploadReceipts = () => {
    const planType = user?.plan_type || 'Basic';
    return planType !== 'Basic'; // Only paid plans can upload receipts
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

  const requestMediaLibraryPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'We need permission to access your photos to upload receipts.');
      return false;
    }
    return true;
  };

  const requestCameraPermissions = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'We need permission to access your camera to take photos.');
      return false;
    }
    return true;
  };

  const selectImage = () => {
    if (!canUploadReceipts()) {
      Alert.alert(
        'Premium Feature',
        'Receipt upload is only available for premium users. Upgrade your plan to upload receipt photos.'
      );
      return;
    }

    Alert.alert(
      'Select Photo',
      'Choose how you want to add a receipt photo',
      [
        { text: 'Camera', onPress: takePhoto },
        { text: 'Photo Library', onPress: pickImage },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const takePhoto = async () => {
    const hasPermission = await requestCameraPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const isValidSize = await validateFileSize(result.assets[0].uri);
        if (isValidSize) {
          setSelectedImage(result.assets[0].uri);
        }
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const pickImage = async () => {
    const hasPermission = await requestMediaLibraryPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const isValidSize = await validateFileSize(result.assets[0].uri);
        if (isValidSize) {
          setSelectedImage(result.assets[0].uri);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const checkStorageAccess = async (): Promise<boolean> => {
    try {
      const { data: buckets, error } = await supabase.storage.listBuckets();

      if (error) {
        return false;
      }

      const mediaBucket = buckets?.find(b => b.name === 'media');
      return !!mediaBucket;
    } catch (error) {
      return false;
    }
  };

  const uploadImageSimple = async (uri: string): Promise<string | null> => {
    try {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Generate file path
      const fileExt = uri.split('.').pop() || 'jpg';
      const fileName = `receipt_${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/receipts/${fileName}`;

      // Simple upload using FormData approach
      const formData = new FormData();
      formData.append('file', {
        uri: uri,
        type: 'image/jpeg',
        name: fileName,
      } as any);

      // Direct upload attempt
      const { data, error } = await supabase.storage
        .from('media')
        .upload(filePath, formData);

      if (error) {
        throw error;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      throw error;
    }
  };

  const uploadImage = async (uri: string): Promise<string | null> => {
    // Try simple upload first
    try {
      return await uploadImageSimple(uri);
    } catch (simpleError) {
      // Fall back to advanced upload if simple method fails
    }

    // Fall back to advanced upload
    try {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Try different approaches for React Native
      let uploadData: any;
      let uploadOptions: any = {
        cacheControl: '3600',
        upsert: false,
      };

      // Method 1: Try blob upload (original method)
      try {
        const response = await fetch(uri);
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
        }

        const blob = await response.blob();
        uploadData = blob;
        uploadOptions.contentType = blob.type;
      } catch (blobError) {
        // Method 2: Try base64 upload as fallback
        try {
          const response = await fetch(uri);
          const buffer = await response.arrayBuffer();
          const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));

          uploadData = base64;
          uploadOptions.contentEncoding = 'base64';
        } catch (base64Error) {
          // Method 3: Fallback - save URI directly (for testing)
          Alert.alert(
            'Upload Method',
            'Using direct file URI as temporary storage method for testing. In production, this should use proper cloud storage.',
            [{ text: 'OK' }]
          );
          return uri;
        }
      }

      // Generate file path
      const fileExt = uri.split('.').pop() || 'jpg';
      const fileName = `receipt_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${user.id}/receipts/${fileName}`;

      // Check storage access first
      const hasStorageAccess = await checkStorageAccess();
      if (!hasStorageAccess) {
        throw new Error('Cannot access Supabase storage. Please check if the "media" bucket exists and you have proper permissions.');
      }

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from('media')
        .upload(filePath, uploadData, uploadOptions);

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      throw error;
    }
  };

  const addLogbookEntry = async () => {
    // Guard against undefined user ID
    if (!user?.id) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    // Validation
    if (!formData.vehicleId) {
      Alert.alert('Error', 'Please select a vehicle');
      return;
    }

    if (!formData.description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }

    const cost = formData.cost ? parseFloat(formData.cost) : 0;
    if (formData.cost && (isNaN(cost) || cost < 0)) {
      Alert.alert('Error', 'Please enter a valid cost');
      return;
    }

    const odometer = formData.odometer ? parseInt(formData.odometer) : null;
    if (formData.odometer && (isNaN(odometer) || odometer < 0)) {
      Alert.alert('Error', 'Please enter a valid odometer reading');
      return;
    }

    try {
      setAddingEntry(true);
      let receiptUrl = null;

      // Upload image if selected
      if (selectedImage) {
        setUploadingImage(true);
        try {
          receiptUrl = await uploadImage(selectedImage);
        } catch (error) {
          Alert.alert('Warning', 'Failed to upload receipt image, but entry will be saved without it');
        } finally {
          setUploadingImage(false);
        }
      }

      // Create logbook entry
      const { data, error } = await supabase
        .from('logbook_entries')
        .insert([
          {
            user_id: user.id,
            vehicle_id: formData.vehicleId,
            date: formData.date.toISOString().split('T')[0],
            service_type: formData.serviceType,
            cost: cost,
            description: formData.description.trim(),
            work_done: formData.description.trim(),
            odometer: odometer,
            receipt_image_url: receiptUrl,
          }
        ])
        .select();

      if (error) throw error;

      Alert.alert('Success', 'Service entry added successfully!');
      closeAddModal();
      fetchLogbookEntries();
    } catch (error) {
      console.error('Error adding logbook entry:', error);
      Alert.alert('Error', 'Failed to add service entry. Please try again.');
    } finally {
      setAddingEntry(false);
    }
  };

  const updateLogbookEntry = async () => {
    if (!selectedEntry) return;

    // Validation
    if (!formData.vehicleId) {
      Alert.alert('Error', 'Please select a vehicle');
      return;
    }

    if (!formData.description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }

    const cost = formData.cost ? parseFloat(formData.cost) : 0;
    if (formData.cost && (isNaN(cost) || cost < 0)) {
      Alert.alert('Error', 'Please enter a valid cost');
      return;
    }

    const odometer = formData.odometer ? parseInt(formData.odometer) : null;
    if (formData.odometer && (isNaN(odometer) || odometer < 0)) {
      Alert.alert('Error', 'Please enter a valid odometer reading');
      return;
    }

    try {
      setUpdatingEntry(true);
      let receiptUrl = selectedImage;

      // Upload new image if selectedImage is not a URL (i.e., it's a new local image)
      if (selectedImage && !selectedImage.startsWith('http')) {
        setUploadingImage(true);
        try {
          receiptUrl = await uploadImage(selectedImage);
        } catch (error) {
          Alert.alert('Warning', 'Failed to upload receipt image, but entry will be updated without new image');
          receiptUrl = selectedEntry.receipt_image_url; // Keep the old image
        } finally {
          setUploadingImage(false);
        }
      }

      // Update logbook entry
      const { error } = await supabase
        .from('logbook_entries')
        .update({
          vehicle_id: formData.vehicleId,
          date: formData.date.toISOString().split('T')[0],
          service_type: formData.serviceType,
          cost: cost,
          description: formData.description.trim(),
          work_done: formData.description.trim(),
          odometer: odometer,
          receipt_image_url: receiptUrl,
        })
        .eq('id', selectedEntry.id);

      if (error) throw error;

      Alert.alert('Success', 'Service entry updated successfully!');
      closeUpdateModal();
      fetchLogbookEntries();
    } catch (error) {
      console.error('Error updating logbook entry:', error);
      Alert.alert('Error', 'Failed to update service entry. Please try again.');
    } finally {
      setUpdatingEntry(false);
    }
  };

  const deleteLogbookEntry = async (entry: any) => {
    Alert.alert(
      'Delete Entry',
      `Are you sure you want to delete this ${getServiceTypeName(entry.service_type).toLowerCase()} entry?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('logbook_entries')
                .delete()
                .eq('id', entry.id);

              if (error) throw error;

              Alert.alert('Success', 'Service entry deleted successfully');
              fetchLogbookEntries();
            } catch (error) {
              console.error('Error deleting logbook entry:', error);
              Alert.alert('Error', 'Failed to delete service entry');
            }
          }
        }
      ]
    );
  };

  const viewReceipt = (receiptUrl: string, entry: any) => {
    if (!receiptUrl) {
      Alert.alert('No Receipt', 'No receipt photo available for this entry.');
      return;
    }

    setCurrentReceipt({
      url: receiptUrl,
      entry: entry
    });
    setShowReceiptModal(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount: number) => {
    return amount ? `$${amount.toFixed(2)}` : '$0.00';
  };

  const getServiceTypeIcon = (type: string) => {
    const serviceType = serviceTypes.find(s => s.value === type);
    return serviceType ? serviceType.label.split(' ')[0] : '📋';
  };

  const getServiceTypeName = (type: string) => {
    const serviceType = serviceTypes.find(s => s.value === type);
    return serviceType ? serviceType.label.split(' ').slice(1).join(' ') : type;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2C8AA6" />
          <Text style={styles.loadingText}>Loading your logbook...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
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
        <View style={styles.header}>
          <Text style={styles.title}>Service Logbook</Text>
          <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
            <Text style={styles.addButtonText}>+ Add Entry</Text>
          </TouchableOpacity>
        </View>

        {vehicles.length > 0 && (
          <View style={styles.vehicleSelector}>
            <Text style={styles.label}>Filter by Vehicle</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={selectedVehicleId}
                onValueChange={(value) => {
                  setSelectedVehicleId(value);
                  // Auto-refresh will be triggered by useEffect when selectedVehicleId changes
                }}
                style={styles.picker}
                itemStyle={styles.pickerItem}
              >
                <Picker.Item label="🚗 All Vehicles" value="all" />
                {vehicles.map((vehicle) => (
                  <Picker.Item
                    key={vehicle.id}
                    label={`${vehicle.vehicle_type === 'Motorcycle' ? '🏍️' : '🚗'} ${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                    value={vehicle.id}
                  />
                ))}
              </Picker>
            </View>
          </View>
        )}

        <View style={styles.entriesContainer}>
          <View style={styles.sectionTitleContainer}>
            <Text style={styles.sectionTitle}>Service History</Text>
            {filterLoading && (
              <ActivityIndicator size="small" color="#2C8AA6" style={styles.filterLoader} />
            )}
          </View>
          {logbookEntries.length === 0 && !filterLoading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📖</Text>
              <Text style={styles.emptyText}>No service entries yet</Text>
              <Text style={styles.emptySubtext}>
                Add your first service record to start tracking your vehicle's maintenance history
              </Text>
              <TouchableOpacity style={styles.emptyAddButton} onPress={openAddModal}>
                <Text style={styles.emptyAddButtonText}>+ Add First Entry</Text>
              </TouchableOpacity>
            </View>
          ) : filterLoading ? (
            <View style={styles.loadingEntriesContainer}>
              <ActivityIndicator size="large" color="#2C8AA6" />
              <Text style={styles.loadingEntriesText}>Filtering entries...</Text>
            </View>
          ) : (
            <View style={styles.entriesList}>
              {logbookEntries.map((entry) => (
                <View key={entry.id} style={styles.entryCard}>
                  <View style={styles.entryHeader}>
                    <View style={styles.entryIconContainer}>
                      <Text style={styles.entryIcon}>{getServiceTypeIcon(entry.service_type)}</Text>
                    </View>
                    <View style={styles.entryInfo}>
                      <Text style={styles.entryTitle}>{getServiceTypeName(entry.service_type)}</Text>
                      <Text style={styles.entryVehicle}>
                        {entry.vehicles.year} {entry.vehicles.make} {entry.vehicles.model}
                      </Text>
                    </View>
                    <View style={styles.entryMeta}>
                      <Text style={styles.entryCost}>{formatCurrency(entry.cost)}</Text>
                      <Text style={styles.entryDate}>{formatDate(entry.date)}</Text>
                    </View>
                  </View>

                  <Text style={styles.entryDescription}>{entry.description || entry.work_done}</Text>

                  <View style={styles.entryFooter}>
                    {entry.odometer ? (
                      <Text style={styles.entryOdometer}>
                        🛣️ {entry.odometer.toLocaleString()} km
                      </Text>
                    ) : (
                      <View />
                    )}

                    <View style={styles.entryActions}>
                      {entry.receipt_image_url && (
                        <TouchableOpacity
                          style={styles.receiptIcon}
                          onPress={() => viewReceipt(entry.receipt_image_url, entry)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.receiptIconText}>📷</Text>
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity
                        style={styles.editEntryButton}
                        onPress={() => openUpdateModal(entry)}
                      >
                        <Text style={styles.editEntryButtonText}>✏️</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.deleteEntryButton}
                        onPress={() => deleteLogbookEntry(entry)}
                      >
                        <Text style={styles.deleteEntryButtonText}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add Entry Modal */}
      <Modal
        visible={showAddModal}
        transparent={true}
        animationType="slide"
        onRequestClose={closeAddModal}
      >
        <View style={styles.addModalOverlay}>
          <View style={styles.addModalContent}>
            {/* Modal Header with X button */}
            <View style={styles.addModalHeader}>
              <Text style={styles.addModalTitle}>Add Service Entry</Text>
              <TouchableOpacity
                style={styles.modalCloseX}
                onPress={closeAddModal}
              >
                <Text style={styles.modalCloseXText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Scrollable Content Container */}
            <View style={styles.addModalScrollContainer}>
              <ScrollView
                style={styles.addModalScroll}
                contentContainerStyle={styles.addModalScrollContent}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
              >
            {/* Vehicle Selection */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Vehicle</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={formData.vehicleId}
                  onValueChange={(value) => updateField('vehicleId', value)}
                  style={styles.picker}
                  itemStyle={styles.pickerItem}
                >
                  {vehicles.map((vehicle) => (
                    <Picker.Item
                      key={vehicle.id}
                      label={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                      value={vehicle.id}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Date Selection */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Service Date</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.dateButtonText}>
                  📅 {formData.date.toLocaleDateString()}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={formData.date}
                  mode="date"
                  display="default"
                  onChange={handleDateChange}
                  maximumDate={new Date()}
                />
              )}
            </View>

            {/* Service Type */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Service Type</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={formData.serviceType}
                  onValueChange={(value) => updateField('serviceType', value)}
                  style={styles.picker}
                  itemStyle={styles.pickerItem}
                >
                  {serviceTypes.map((type) => (
                    <Picker.Item key={type.value} label={type.label} value={type.value} />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Cost */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Cost (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter cost (e.g., 150.00)"
                placeholderTextColor="#95a5a6"
                value={formData.cost}
                onChangeText={(value) => updateField('cost', value)}
                keyboardType="decimal-pad"
              />
            </View>

            {/* Odometer */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Odometer Reading (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter current odometer reading"
                placeholderTextColor="#95a5a6"
                value={formData.odometer}
                onChangeText={(value) => updateField('odometer', value)}
                keyboardType="numeric"
              />
            </View>

            {/* Description */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe the service performed..."
                placeholderTextColor="#95a5a6"
                value={formData.description}
                onChangeText={(value) => updateField('description', value)}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Photo Upload */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Receipt Photo</Text>
              {canUploadReceipts() ? (
                <TouchableOpacity style={styles.photoButton} onPress={selectImage}>
                  <Text style={styles.photoButtonText}>
                    📷 {selectedImage ? 'Change Photo' : 'Add Receipt Photo'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.disabledPhotoButton} disabled={true} activeOpacity={1}>
                  <Text style={styles.disabledPhotoButtonText}>
                    📷 Add Receipt Photo
                  </Text>
                  <Text style={styles.premiumOnlyText}>Premium users only</Text>
                </TouchableOpacity>
              )}

              {selectedImage && (
                <View style={styles.selectedImageContainer}>
                  <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => setSelectedImage(null)}
                  >
                    <Text style={styles.removeImageText}>✕</Text>
                  </TouchableOpacity>
                </View>
              )}

              {uploadingImage && (
                <View style={styles.uploadingContainer}>
                  <ActivityIndicator color="#2C8AA6" />
                  <Text style={styles.uploadingText}>Uploading photo...</Text>
                </View>
              )}
            </View>

                <Text style={styles.helpText}>
                  * Required field: Description{'\n'}
                  * All other fields are optional but recommended for better tracking{'\n'}
                  * Date, cost, and receipt photos help with warranty and service history
                </Text>
              </ScrollView>
            </View>

            {/* Bottom Buttons */}
            <View style={styles.addModalButtons}>
              <TouchableOpacity
                style={styles.addModalCancelButton}
                onPress={closeAddModal}
              >
                <Text style={styles.addModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addModalSaveButton, addingEntry && styles.disabledButton]}
                onPress={addLogbookEntry}
                disabled={addingEntry}
              >
                <Text style={styles.addModalSaveText}>
                  {addingEntry ? 'Adding...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Update Entry Modal */}
      <Modal
        visible={showUpdateModal}
        transparent={true}
        animationType="slide"
        onRequestClose={closeUpdateModal}
      >
        <View style={styles.addModalOverlay}>
          <View style={styles.addModalContent}>
            {/* Modal Header with X button */}
            <View style={styles.addModalHeader}>
              <Text style={styles.addModalTitle}>Update Service Entry</Text>
              <TouchableOpacity
                style={styles.modalCloseX}
                onPress={closeUpdateModal}
              >
                <Text style={styles.modalCloseXText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Scrollable Content Container */}
            <View style={styles.addModalScrollContainer}>
              <ScrollView
                style={styles.addModalScroll}
                contentContainerStyle={styles.addModalScrollContent}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
              >
            {/* Vehicle Selection */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Vehicle</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={formData.vehicleId}
                  onValueChange={(value) => updateField('vehicleId', value)}
                  style={styles.picker}
                  itemStyle={styles.pickerItem}
                >
                  {vehicles.map((vehicle) => (
                    <Picker.Item
                      key={vehicle.id}
                      label={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                      value={vehicle.id}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Date Selection */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Service Date</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.dateButtonText}>
                  📅 {formData.date.toLocaleDateString()}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={formData.date}
                  mode="date"
                  display="default"
                  onChange={handleDateChange}
                  maximumDate={new Date()}
                />
              )}
            </View>

            {/* Service Type */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Service Type</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={formData.serviceType}
                  onValueChange={(value) => updateField('serviceType', value)}
                  style={styles.picker}
                  itemStyle={styles.pickerItem}
                >
                  {serviceTypes.map((type) => (
                    <Picker.Item key={type.value} label={type.label} value={type.value} />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Cost */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Cost (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter cost (e.g., 150.00)"
                placeholderTextColor="#95a5a6"
                value={formData.cost}
                onChangeText={(value) => updateField('cost', value)}
                keyboardType="decimal-pad"
              />
            </View>

            {/* Odometer */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Odometer Reading (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter current odometer reading"
                placeholderTextColor="#95a5a6"
                value={formData.odometer}
                onChangeText={(value) => updateField('odometer', value)}
                keyboardType="numeric"
              />
            </View>

            {/* Description */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe the service performed..."
                placeholderTextColor="#95a5a6"
                value={formData.description}
                onChangeText={(value) => updateField('description', value)}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Photo Upload */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Receipt Photo</Text>
              {canUploadReceipts() ? (
                <TouchableOpacity style={styles.photoButton} onPress={selectImage}>
                  <Text style={styles.photoButtonText}>
                    📷 {selectedImage ? 'Change Photo' : 'Add Receipt Photo'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.disabledPhotoButton} disabled={true} activeOpacity={1}>
                  <Text style={styles.disabledPhotoButtonText}>
                    📷 Add Receipt Photo
                  </Text>
                  <Text style={styles.premiumOnlyText}>Premium users only</Text>
                </TouchableOpacity>
              )}

              {selectedImage && (
                <View style={styles.selectedImageContainer}>
                  <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => setSelectedImage(null)}
                  >
                    <Text style={styles.removeImageText}>✕</Text>
                  </TouchableOpacity>
                </View>
              )}

              {uploadingImage && (
                <View style={styles.uploadingContainer}>
                  <ActivityIndicator color="#2C8AA6" />
                  <Text style={styles.uploadingText}>Uploading photo...</Text>
                </View>
              )}
            </View>

                <Text style={styles.helpText}>
                  * Required field: Description{'\n'}
                  * All other fields are optional but recommended for better tracking{'\n'}
                  * Changes will be saved to maintain service history accuracy
                </Text>
              </ScrollView>
            </View>

            {/* Bottom Buttons */}
            <View style={styles.addModalButtons}>
              <TouchableOpacity
                style={styles.addModalCancelButton}
                onPress={closeUpdateModal}
              >
                <Text style={styles.addModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addModalSaveButton, updatingEntry && styles.disabledButton]}
                onPress={updateLogbookEntry}
                disabled={updatingEntry}
              >
                <Text style={styles.addModalSaveText}>
                  {updatingEntry ? 'Updating...' : 'Update'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Receipt Viewing Modal */}
      <Modal
        visible={showReceiptModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowReceiptModal(false)}
      >
        <View style={styles.receiptModalOverlay}>
          <View style={styles.receiptModalContent}>
            {/* Modal Header */}
            <View style={styles.receiptModalHeader}>
              <Text style={styles.receiptModalTitle}>Receipt</Text>
              <TouchableOpacity
                style={styles.modalCloseX}
                onPress={() => setShowReceiptModal(false)}
              >
                <Text style={styles.modalCloseXText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Receipt Image */}
            <View style={styles.receiptImageContainer}>
              {currentReceipt ? (
                <View style={styles.receiptContentContainer}>
                  {/* Receipt Image */}
                  <View style={styles.imageContainer}>
                    <Image
                      source={{ uri: currentReceipt.url }}
                      style={styles.receiptImageFixed}
                      resizeMode="contain"
                    />
                  </View>

                  {/* Receipt Details */}
                  <View style={styles.receiptDetails}>
                    <Text style={styles.receiptEntryTitle}>
                      {getServiceTypeName(currentReceipt.entry.service_type)} - {formatDate(currentReceipt.entry.date)}
                    </Text>
                    <Text style={styles.receiptEntryCost}>
                      {formatCurrency(currentReceipt.entry.cost)}
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.receiptLoadingContainer}>
                  <ActivityIndicator size="large" color="#2C8AA6" />
                  <Text style={styles.receiptLoadingText}>Loading receipt...</Text>
                </View>
              )}
            </View>

            {/* Download Button */}
            <TouchableOpacity
              style={styles.downloadReceiptButton}
              onPress={() => {
                if (currentReceipt?.url) {
                  Linking.openURL(currentReceipt.url)
                    .catch((error) => {
                      Alert.alert(
                        'Download Error',
                        'Unable to open receipt. Please check your internet connection and try again.'
                      );
                    });
                } else {
                  Alert.alert('Error', 'No receipt URL available');
                }
              }}
            >
              <Text style={styles.downloadReceiptButtonText}>📥 Download Receipt</Text>
            </TouchableOpacity>
          </View>
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
  content: {
    paddingHorizontal: 20,
    paddingTop: 0, // No top padding below nav
    paddingBottom: 20,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ecf0f1',
    marginTop: 10, // Minimal top margin
    marginBottom: 10, // Small bottom margin
  },
  addButton: {
    backgroundColor: '#2C8AA6',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // Vehicle Selector
  vehicleSelector: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ecf0f1',
    marginBottom: 10,
  },
  pickerWrapper: {
    backgroundColor: '#34495e',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1a2332',
  },
  picker: {
    height: Platform.OS === 'ios' ? 120 : 50,
    color: '#ecf0f1',
  },
  pickerItem: {
    fontSize: 16,
    color: '#ecf0f1',
  },

  // Entries
  entriesContainer: {
    flex: 1,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ecf0f1',
    marginRight: 10,
  },
  filterLoader: {
    marginLeft: 8,
  },
  loadingEntriesContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#34495e',
    borderRadius: 12,
    paddingHorizontal: 20,
  },
  loadingEntriesText: {
    color: '#bdc3c7',
    fontSize: 16,
    marginTop: 15,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#34495e',
    borderRadius: 12,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 15,
  },
  emptyText: {
    fontSize: 18,
    color: '#ecf0f1',
    marginBottom: 10,
    textAlign: 'center',
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#bdc3c7',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyAddButton: {
    backgroundColor: '#2C8AA6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyAddButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Entries List
  entriesList: {
    gap: 15,
  },
  entryCard: {
    backgroundColor: '#34495e',
    borderRadius: 12,
    padding: 20,
  },
  entryContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  entryMainInfo: {
    flex: 1,
    marginRight: 15,
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  entryIconContainer: {
    marginRight: 12,
  },
  entryIcon: {
    fontSize: 24,
  },
  entryInfo: {
    flex: 1,
  },
  entryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ecf0f1',
    marginBottom: 4,
  },
  entryVehicle: {
    fontSize: 14,
    color: '#2C8AA6',
    fontWeight: '500',
  },
  entryMeta: {
    alignItems: 'flex-end',
  },
  entryCost: {
    fontSize: 16,
    fontWeight: '700',
    color: '#E55A4F',
    marginBottom: 4,
  },
  entryDate: {
    fontSize: 12,
    color: '#bdc3c7',
  },
  entryDescription: {
    fontSize: 14,
    color: '#bdc3c7',
    lineHeight: 20,
    marginBottom: 8,
  },
  entryFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  entryOdometer: {
    fontSize: 13,
    color: '#95a5a6',
  },
  entryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editEntryButton: {
    backgroundColor: '#2C8AA6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  editEntryButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  deleteEntryButton: {
    backgroundColor: '#e74c3c',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  deleteEntryButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  receiptIcon: {
    backgroundColor: '#2C8AA6',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  receiptIconText: {
    fontSize: 16,
  },
  receiptButton: {
    backgroundColor: '#2C8AA6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  receiptButtonText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#2c3e50',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#34495e',
    borderBottomWidth: 1,
    borderBottomColor: '#1a2332',
  },
  modalCancelText: {
    color: '#e74c3c',
    fontSize: 16,
    fontWeight: '500',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ecf0f1',
  },
  modalSaveText: {
    color: '#E55A4F',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledText: {
    opacity: 0.4,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },

  // Form Styles
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ecf0f1',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#34495e',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1a2332',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#ecf0f1',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  dateButton: {
    backgroundColor: '#34495e',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1a2332',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dateButtonText: {
    fontSize: 16,
    color: '#ecf0f1',
  },
  photoButton: {
    backgroundColor: '#2C8AA6',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  photoButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledPhotoButton: {
    backgroundColor: '#34495e',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#95a5a6',
    opacity: 0.5,
  },
  disabledPhotoButtonText: {
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
  selectedImageContainer: {
    marginTop: 12,
    position: 'relative',
  },
  selectedImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(231, 76, 60, 0.9)',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 8,
  },
  uploadingText: {
    color: '#bdc3c7',
    fontSize: 14,
  },
  helpText: {
    color: '#bdc3c7',
    fontSize: 12,
    marginTop: 16,
    paddingHorizontal: 4,
    fontWeight: '500',
  },
  // New Add Modal Styles
  addModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  addModalContent: {
    backgroundColor: '#1a2332',
    borderRadius: 15,
    width: '100%',
    height: '90%',
    overflow: 'hidden',
    flexDirection: 'column',
  },
  addModalHeader: {
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
  addModalTitle: {
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
  addModalScrollContainer: {
    flex: 1,
    backgroundColor: '#1a2332',
  },
  addModalScroll: {
    flex: 1,
  },
  addModalScrollContent: {
    padding: 20,
    flexGrow: 1,
  },
  addModalButtons: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#34495e',
    backgroundColor: '#2c3e50',
  },
  addModalCancelButton: {
    flex: 1,
    backgroundColor: '#95a5a6',
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomLeftRadius: 15,
  },
  addModalCancelText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  addModalSaveButton: {
    flex: 1,
    backgroundColor: '#2C8AA6',
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomRightRadius: 15,
  },
  addModalSaveText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#7f8c8d',
  },

  // Receipt Modal Styles
  receiptModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  receiptModalContent: {
    backgroundColor: '#1a2332',
    borderRadius: 15,
    width: '100%',
    height: '90%',
    overflow: 'hidden',
    flexDirection: 'column',
  },
  receiptModalHeader: {
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
  receiptModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ecf0f1',
  },
  receiptImageContainer: {
    flex: 1,
    padding: 15,
  },
  receiptContentContainer: {
    flex: 1,
    width: '100%',
  },
  imageContainer: {
    flex: 1,
    marginVertical: 10,
    backgroundColor: '#34495e',
    borderRadius: 8,
    overflow: 'hidden',
  },
  receiptImage: {
    width: '100%',
    height: 300,
    backgroundColor: '#34495e',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2C8AA6',
  },
  receiptImageFixed: {
    width: '100%',
    height: '100%',
    minHeight: 250,
  },
  receiptDetails: {
    marginTop: 15,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  receiptEntryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ecf0f1',
    textAlign: 'center',
    marginBottom: 5,
  },
  receiptEntryCost: {
    fontSize: 18,
    fontWeight: '700',
    color: '#E55A4F',
    textAlign: 'center',
  },
  downloadReceiptButton: {
    backgroundColor: '#2C8AA6',
    borderRadius: 0,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
  },
  downloadReceiptButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  receiptLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  receiptLoadingText: {
    color: '#bdc3c7',
    fontSize: 16,
    marginTop: 15,
  },
  debugText: {
    color: '#F4B942',
    fontSize: 12,
    marginBottom: 10,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  imageWrapper: {
    position: 'relative',
    width: '100%',
    height: 300,
    backgroundColor: '#34495e',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2C8AA6',
  },
  imageDebugOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 73, 94, 0.7)',
    borderRadius: 8,
  },
  imageDebugText: {
    color: '#ecf0f1',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default LogbookScreen;