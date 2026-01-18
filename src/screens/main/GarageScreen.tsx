import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../utils/supabase';

const GarageScreen = () => {
  const { user } = useAuth();

  // State management
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [addingVehicle, setAddingVehicle] = useState(false);
  const [updatingVehicle, setUpdatingVehicle] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);

  // Form state for adding vehicle
  const [formData, setFormData] = useState({
    make: '',
    model: '',
    year: '',
    variant: '',
    vehicleType: 'Car',
    transmission: '', // Empty to show placeholder
    engine: '', // Empty to show placeholder
    registration: '',
    odometer: '',
  });

  useEffect(() => {
    fetchVehicles();
  }, [user?.id]);

  const fetchVehicles = async () => {
    try {
      setLoading(true);

      // Guard against undefined user ID
      if (!user?.id) {
        console.log('No user ID available, skipping vehicles fetch');
        setLoading(false);
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
      Alert.alert('Error', 'Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Guard against undefined user ID
      if (!user?.id) {
        console.log('No user ID available, skipping vehicles refresh');
        setRefreshing(false);
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
      console.error('Error refreshing vehicles:', error);
      Alert.alert('Error', 'Failed to refresh vehicles');
    } finally {
      setRefreshing(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({
      make: '',
      model: '',
      year: '',
      variant: '',
      vehicleType: 'Car',
      transmission: 'Manual',
      engine: '', // Empty to show placeholder
      registration: '',
      odometer: '',
    });
  };

  const openUpdateModal = (vehicle: any) => {
    setSelectedVehicle(vehicle);
    setFormData({
      make: vehicle.make || '',
      model: vehicle.model || '',
      year: vehicle.year?.toString() || '',
      variant: vehicle.variant || '',
      vehicleType: vehicle.vehicle_type || 'Car',
      engine: vehicle.engine || 'Petrol',
      transmission: vehicle.transmission || 'Manual',
      fuelCapacity: vehicle.fuel_capacity?.toString() || '',
      engineSize: vehicle.engine_size || '',
      drivetrain: vehicle.drivetrain || '',
      registration: vehicle.registration || '',
      odometer: vehicle.odometer?.toString() || '',
    });
    setShowUpdateModal(true);
  };

  const closeUpdateModal = () => {
    setShowUpdateModal(false);
    setSelectedVehicle(null);
    resetForm();
  };

  const addVehicle = async () => {
    // Validation - registration is now optional
    if (!formData.make || !formData.model || !formData.year || !formData.engine) {
      Alert.alert('Error', 'Please fill in all required fields (Make, Model, Year, Engine Type)');
      return;
    }

    const year = parseInt(formData.year);
    if (isNaN(year) || year < 1900 || year > new Date().getFullYear() + 1) {
      Alert.alert('Error', 'Please enter a valid year');
      return;
    }

    const odometer = formData.odometer ? parseInt(formData.odometer) : 0;
    if (formData.odometer && (isNaN(odometer) || odometer < 0)) {
      Alert.alert('Error', 'Please enter a valid odometer reading');
      return;
    }

    try {
      setAddingVehicle(true);

      // Guard against undefined user ID
      if (!user?.id) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }

      // If this is the first vehicle, make it default
      const isFirstVehicle = vehicles.length === 0;

      const { data, error } = await supabase
        .from('vehicles')
        .insert([
          {
            user_id: user.id,
            make: formData.make.trim(),
            model: formData.model.trim(),
            year: year,
            variant: formData.variant.trim() || null,
            vehicle_type: formData.vehicleType,
            engine: formData.engine,
            transmission: formData.transmission || null,
            fuel_capacity: formData.fuelCapacity ? parseFloat(formData.fuelCapacity) : null,
            engine_size: formData.engineSize?.trim() || null,
            drivetrain: formData.drivetrain || null,
            registration: formData.registration.trim() || null,
            odometer: odometer,
            is_default: isFirstVehicle,
          },
        ])
        .select();

      if (error) throw error;

      Alert.alert('Success', 'Vehicle added successfully!');
      setShowAddModal(false);
      resetForm();
      fetchVehicles();
    } catch (error) {
      console.error('Error adding vehicle:', error);
      Alert.alert('Error', 'Failed to add vehicle. Please try again.');
    } finally {
      setAddingVehicle(false);
    }
  };

  const updateVehicle = async () => {
    if (!selectedVehicle) return;

    // Validation - registration is now optional
    if (!formData.make || !formData.model || !formData.year || !formData.engine) {
      Alert.alert('Error', 'Please fill in all required fields (Make, Model, Year, Engine Type)');
      return;
    }

    const year = parseInt(formData.year);
    if (isNaN(year) || year < 1900 || year > new Date().getFullYear() + 1) {
      Alert.alert('Error', 'Please enter a valid year');
      return;
    }

    const odometer = formData.odometer ? parseInt(formData.odometer) : 0;
    if (formData.odometer && (isNaN(odometer) || odometer < 0)) {
      Alert.alert('Error', 'Please enter a valid odometer reading');
      return;
    }

    try {
      setUpdatingVehicle(true);

      const { error } = await supabase
        .from('vehicles')
        .update({
          make: formData.make.trim(),
          model: formData.model.trim(),
          year: year,
          variant: formData.variant.trim() || null,
          vehicle_type: formData.vehicleType,
          engine: formData.engine,
          transmission: formData.transmission || null,
          fuel_capacity: formData.fuelCapacity ? parseFloat(formData.fuelCapacity) : null,
          engine_size: formData.engineSize?.trim() || null,
          drivetrain: formData.drivetrain || null,
          registration: formData.registration.trim() || null,
          odometer: odometer,
        })
        .eq('id', selectedVehicle.id);

      if (error) throw error;

      Alert.alert('Success', 'Vehicle updated successfully!');
      closeUpdateModal();
      fetchVehicles();
    } catch (error) {
      console.error('Error updating vehicle:', error);
      Alert.alert('Error', 'Failed to update vehicle. Please try again.');
    } finally {
      setUpdatingVehicle(false);
    }
  };

  const setDefaultVehicle = async (vehicleId: string) => {
    try {
      // Guard against undefined user ID
      if (!user?.id) {
        console.log('No user ID available, cannot set default vehicle');
        Alert.alert('Error', 'User not authenticated');
        return;
      }

      // First, unset all vehicles as default
      await supabase
        .from('vehicles')
        .update({ is_default: false })
        .eq('user_id', user.id);

      // Then set the selected vehicle as default
      const { error } = await supabase
        .from('vehicles')
        .update({ is_default: true })
        .eq('id', vehicleId);

      if (error) throw error;

      Alert.alert('Success', 'Default vehicle updated!');
      fetchVehicles();
    } catch (error) {
      console.error('Error setting default vehicle:', error);
      Alert.alert('Error', 'Failed to update default vehicle');
    }
  };

  const deleteVehicle = async (vehicle: any) => {
    Alert.alert(
      'Delete Vehicle',
      `Are you sure you want to delete ${vehicle.year} ${vehicle.make} ${vehicle.model}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('vehicles')
                .delete()
                .eq('id', vehicle.id);

              if (error) throw error;

              Alert.alert('Success', 'Vehicle deleted successfully');
              fetchVehicles();
            } catch (error) {
              console.error('Error deleting vehicle:', error);
              Alert.alert('Error', 'Failed to delete vehicle');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2C8AA6" />
          <Text style={styles.loadingText}>Loading your garage...</Text>
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
          <Text style={styles.title}>My Garage</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddModal(true)}
          >
            <Text style={styles.addButtonText}>+ Add Vehicle</Text>
          </TouchableOpacity>
        </View>

        {vehicles.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>🚗 No vehicles added yet</Text>
            <Text style={styles.emptySubtext}>
              Add your first vehicle to start tracking maintenance and getting personalized diagnoses
            </Text>
            <TouchableOpacity
              style={styles.emptyAddButton}
              onPress={() => setShowAddModal(true)}
            >
              <Text style={styles.emptyAddButtonText}>+ Add Your First Vehicle</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.vehiclesContainer}>
            {vehicles.map((vehicle) => (
              <View key={vehicle.id} style={styles.vehicleCard}>
                {vehicle.is_default && (
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultBadgeText}>DEFAULT</Text>
                  </View>
                )}

                <View style={styles.vehicleInfo}>
                  <Text style={styles.vehicleName}>
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </Text>
                  <View style={styles.vehicleDetailsRow}>
                    <View style={styles.typeBadge}>
                      <Text style={styles.typeBadgeText}>{vehicle.vehicle_type || 'Car'}</Text>
                    </View>
                    <View style={styles.engineBadge}>
                      <Text style={styles.engineBadgeText}>{vehicle.engine || 'Petrol'}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.vehicleFooter}>
                  <View style={styles.vehicleDetails}>
                    <Text style={styles.vehicleOdometer}>
                      🛣️ {vehicle.odometer?.toLocaleString() || 0} km
                    </Text>
                  </View>

                  <View style={styles.vehicleActions}>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => openUpdateModal(vehicle)}
                    >
                      <Text style={styles.editButtonText}>✏️</Text>
                    </TouchableOpacity>
                    {!vehicle.is_default && (
                      <TouchableOpacity
                        style={styles.setDefaultButton}
                        onPress={() => setDefaultVehicle(vehicle.id)}
                      >
                        <Text style={styles.setDefaultButtonText}>Set Default</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => deleteVehicle(vehicle)}
                    >
                      <Text style={styles.deleteButtonText}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.footerText}>
          🚗 You can add unlimited vehicles on any plan
        </Text>
      </ScrollView>

      {/* Add Vehicle Modal */}
      <Modal
        visible={showAddModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.addModalOverlay}>
          <View style={styles.addModalContent}>
            {/* Modal Header with X button */}
            <View style={styles.addModalHeader}>
              <Text style={styles.addModalTitle}>Add Vehicle</Text>
              <TouchableOpacity
                style={styles.modalCloseX}
                onPress={() => setShowAddModal(false)}
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
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>Vehicle Type</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={formData.vehicleType}
                  onValueChange={(value) => updateField('vehicleType', value)}
                  style={styles.picker}
                  itemStyle={styles.pickerItem}
                >
                  <Picker.Item label="🚗 Car" value="Car" />
                  <Picker.Item label="🏍️ Motorcycle" value="Motorcycle" />
                  <Picker.Item label="🚲 Bicycle" value="Bicycle" />
                  <Picker.Item label="🚚 Truck" value="Truck" />
                  <Picker.Item label="🚌 Bus" value="Bus" />
                  <Picker.Item label="🚛 Heavy Vehicle" value="Heavy Vehicle" />
                  <Picker.Item label="🚐 Other" value="Other" />
                </Picker>
              </View>
            </View>

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
              placeholder="Variant (optional)"
              placeholderTextColor="#95a5a6"
              value={formData.variant}
              onChangeText={(value) => updateField('variant', value)}
            />

            <View style={styles.pickerContainer}>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={formData.transmission}
                  onValueChange={(value) => updateField('transmission', value)}
                  style={styles.picker}
                  itemStyle={styles.pickerItem}
                >
                  <Picker.Item label="Transmission" value="" enabled={false} />
                  <Picker.Item label="Automatic" value="Automatic" />
                  <Picker.Item label="Manual" value="Manual" />
                </Picker>
              </View>
            </View>

            <View style={styles.pickerContainer}>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={formData.engine}
                  onValueChange={(value) => updateField('engine', value)}
                  style={styles.picker}
                  itemStyle={styles.pickerItem}
                >
                  <Picker.Item label="Engine Type" value="" enabled={false} />
                  <Picker.Item label="⛽ Petrol Engine" value="Petrol" />
                  <Picker.Item label="🛢️ Diesel Engine" value="Diesel" />
                  <Picker.Item label="🔋 Hybrid Engine (Petrol+Electric)" value="Hybrid" />
                  <Picker.Item label="⚡ Electric Vehicle (EV)" value="EV" />
                  <Picker.Item label="🔧 Other Engine Type" value="Other" />
                </Picker>
              </View>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Registration Number (optional)"
              placeholderTextColor="#95a5a6"
              value={formData.registration}
              onChangeText={(value) => updateField('registration', value)}
              autoCapitalize="characters"
            />

            <TextInput
              style={styles.input}
              placeholder="Current Odometer (km) - optional"
              placeholderTextColor="#95a5a6"
              value={formData.odometer}
              onChangeText={(value) => updateField('odometer', value)}
              keyboardType="numeric"
            />

                <Text style={styles.helpText}>
                  * Required fields: Make, Model, Year, Engine Type{'\n'}
                  * Registration is optional - useful for bicycles and other vehicles{'\n'}
                  * Vehicle Type is pre-selected, Engine Type must be chosen{'\n'}
                  * All fields can be updated later from vehicle details
                </Text>
              </ScrollView>
            </View>

            {/* Bottom Buttons */}
            <View style={styles.addModalButtons}>
              <TouchableOpacity
                style={styles.addModalCancelButton}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.addModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addModalSaveButton, addingVehicle && styles.disabledButton]}
                onPress={addVehicle}
                disabled={addingVehicle}
              >
                <Text style={styles.addModalSaveText}>
                  {addingVehicle ? 'Adding...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Update Vehicle Modal */}
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
              <Text style={styles.addModalTitle}>Update Vehicle</Text>
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
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>Vehicle Type</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={formData.vehicleType}
                  onValueChange={(value) => updateField('vehicleType', value)}
                  style={styles.picker}
                  itemStyle={styles.pickerItem}
                >
                  <Picker.Item label="🚗 Car" value="Car" />
                  <Picker.Item label="🏍️ Motorcycle" value="Motorcycle" />
                  <Picker.Item label="🚲 Bicycle" value="Bicycle" />
                  <Picker.Item label="🚚 Truck" value="Truck" />
                  <Picker.Item label="🚌 Bus" value="Bus" />
                  <Picker.Item label="🚛 Heavy Vehicle" value="Heavy Vehicle" />
                  <Picker.Item label="🚐 Other" value="Other" />
                </Picker>
              </View>
            </View>

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
              placeholder="Variant (optional)"
              placeholderTextColor="#95a5a6"
              value={formData.variant}
              onChangeText={(value) => updateField('variant', value)}
            />

            <View style={styles.pickerContainer}>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={formData.transmission}
                  onValueChange={(value) => updateField('transmission', value)}
                  style={styles.picker}
                  itemStyle={styles.pickerItem}
                >
                  <Picker.Item label="Transmission" value="" enabled={false} />
                  <Picker.Item label="Automatic" value="Automatic" />
                  <Picker.Item label="Manual" value="Manual" />
                </Picker>
              </View>
            </View>

            <View style={styles.pickerContainer}>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={formData.engine}
                  onValueChange={(value) => updateField('engine', value)}
                  style={styles.picker}
                  itemStyle={styles.pickerItem}
                >
                  <Picker.Item label="Engine Type" value="" enabled={false} />
                  <Picker.Item label="⛽ Petrol Engine" value="Petrol" />
                  <Picker.Item label="🛢️ Diesel Engine" value="Diesel" />
                  <Picker.Item label="🔋 Hybrid Engine (Petrol+Electric)" value="Hybrid" />
                  <Picker.Item label="⚡ Electric Vehicle (EV)" value="EV" />
                  <Picker.Item label="🔧 Other Engine Type" value="Other" />
                </Picker>
              </View>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Registration Number (optional)"
              placeholderTextColor="#95a5a6"
              value={formData.registration}
              onChangeText={(value) => updateField('registration', value)}
              autoCapitalize="characters"
            />

            <TextInput
              style={styles.input}
              placeholder="Current Odometer (km) - optional"
              placeholderTextColor="#95a5a6"
              value={formData.odometer}
              onChangeText={(value) => updateField('odometer', value)}
              keyboardType="numeric"
            />

                <Text style={styles.helpText}>
                  * Required fields: Make, Model, Year{'\n'}
                  * Registration is optional - useful for bicycles and other vehicles{'\n'}
                  * Vehicle Type and Engine are pre-selected with current values{'\n'}
                  * You can change the default vehicle by using "Set Default" button
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
                style={[styles.addModalSaveButton, updatingVehicle && styles.disabledButton]}
                onPress={updateVehicle}
                disabled={updatingVehicle}
              >
                <Text style={styles.addModalSaveText}>
                  {updatingVehicle ? 'Updating...' : 'Update'}
                </Text>
              </TouchableOpacity>
            </View>
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
    paddingTop: 8,
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
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#34495e',
    borderRadius: 12,
    marginVertical: 20,
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 20,
    color: '#ecf0f1',
    marginBottom: 12,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  emptySubtext: {
    fontSize: 16,
    color: '#bdc3c7',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyAddButton: {
    backgroundColor: '#2C8AA6',
    paddingHorizontal: 25,
    paddingVertical: 15,
    borderRadius: 8,
  },
  emptyAddButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Vehicle Cards
  vehiclesContainer: {
    flex: 1,
  },
  vehicleCard: {
    backgroundColor: '#34495e',
    borderRadius: 12,
    padding: 20,
    marginVertical: 10,
    position: 'relative',
  },
  defaultBadge: {
    position: 'absolute',
    top: -8,
    right: 16,
    backgroundColor: '#E55A4F',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    zIndex: 1,
  },
  defaultBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ecf0f1',
    marginBottom: 8,
  },
  vehicleVariant: {
    fontSize: 14,
    color: '#2C8AA6',
    marginBottom: 10,
    fontWeight: '500',
  },
  vehicleDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  typeBadge: {
    backgroundColor: '#E55A4F',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  engineBadge: {
    backgroundColor: '#2C8AA6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  engineBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  vehicleRegistration: {
    fontSize: 13,
    color: '#bdc3c7',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 4,
  },
  vehicleOdometer: {
    fontSize: 13,
    color: '#bdc3c7',
    fontWeight: '500',
  },
  vehicleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  vehicleDetails: {
    flex: 1,
  },
  vehicleActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editButton: {
    backgroundColor: '#2C8AA6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  setDefaultButton: {
    backgroundColor: '#f39c12',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  setDefaultButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#e74c3c',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 14,
  },

  // Footer
  footerText: {
    textAlign: 'center',
    color: '#bdc3c7',
    fontSize: 14,
    marginTop: 32,
    paddingHorizontal: 20,
    fontWeight: '500',
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
  input: {
    backgroundColor: '#34495e',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1a2332',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginVertical: 8,
    fontSize: 16,
    color: '#ecf0f1',
  },
  pickerContainer: {
    marginVertical: 8,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ecf0f1',
    marginBottom: 8,
    marginLeft: 4,
  },
  pickerWrapper: {
    backgroundColor: '#34495e',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1a2332',
  },
  picker: {
    height: Platform.OS === 'ios' ? 180 : 50,
    color: '#ecf0f1',
  },
  pickerItem: {
    fontSize: 16,
    color: '#ecf0f1',
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
});

export default GarageScreen;