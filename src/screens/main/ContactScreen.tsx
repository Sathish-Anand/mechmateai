import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../utils/supabase';

interface ContactScreenProps {
  navigation: any;
}

const ContactScreen: React.FC<ContactScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    type: '',
    subject: '',
    description: '',
  });

  const messageTypes = [
    { value: 'feedback', label: '💡 Feedback', description: 'Share your suggestions and ideas' },
    { value: 'complaint', label: '😔 Complaint', description: 'Report issues or problems' },
    { value: 'bug_report', label: '🐛 Bug Report', description: 'Report technical issues or bugs' },
    { value: 'feature_request', label: '🚀 Feature Request', description: 'Suggest new features' },
    { value: 'other', label: '💬 Other', description: 'General inquiries or other topics' },
  ];

  const handleSubmit = async () => {
    // Validation
    if (!formData.type) {
      Alert.alert('Error', 'Please select a message type');
      return;
    }
    if (!formData.subject.trim()) {
      Alert.alert('Error', 'Please enter a subject');
      return;
    }
    if (!formData.description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user?.id,
          user_email: user?.email,
          type: formData.type,
          subject: formData.subject.trim(),
          description: formData.description.trim(),
          status: 'open',
          priority: formData.type === 'bug_report' ? 'high' : 'medium',
        });

      if (error) throw error;

      Alert.alert(
        'Message Sent!',
        'Thank you for contacting us. We\'ll get back to you as soon as possible.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset form
              setFormData({
                type: '',
                subject: '',
                description: '',
              });
              navigation.goBack();
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error submitting contact form:', error);
      Alert.alert('Error', 'Failed to send your message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getSelectedTypeLabel = () => {
    const selectedType = messageTypes.find(type => type.value === formData.type);
    return selectedType ? selectedType.label : 'Select message type';
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Contact Support</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeTitle}>How can we help you?</Text>
          <Text style={styles.welcomeText}>
            We're here to help! Send us your feedback, report bugs, or ask questions.
            We'll get back to you as soon as possible.
          </Text>
        </View>

        {/* Form Section */}
        <View style={styles.formSection}>
          {/* Message Type */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Message Type *</Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setShowTypeModal(true)}
            >
              <Text style={[
                styles.dropdownText,
                !formData.type && styles.placeholderText
              ]}>
                {getSelectedTypeLabel()}
              </Text>
              <Text style={styles.dropdownArrow}>▼</Text>
            </TouchableOpacity>
          </View>

          {/* Subject */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Subject *</Text>
            <TextInput
              style={styles.textInput}
              value={formData.subject}
              onChangeText={(text) => setFormData({ ...formData, subject: text })}
              placeholder="Brief description of your message"
              placeholderTextColor="#95a5a6"
              maxLength={100}
            />
            <Text style={styles.characterCount}>
              {formData.subject.length}/100
            </Text>
          </View>

          {/* Description */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Description *</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              placeholder="Please provide detailed information about your message. For bug reports, include steps to reproduce the issue."
              placeholderTextColor="#95a5a6"
              multiline={true}
              numberOfLines={6}
              textAlignVertical="top"
              maxLength={1000}
            />
            <Text style={styles.characterCount}>
              {formData.description.length}/1000
            </Text>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>Send Message</Text>
            )}
          </TouchableOpacity>

          {/* Help Text */}
          <View style={styles.helpSection}>
            <Text style={styles.helpTitle}>Response Times</Text>
            <Text style={styles.helpText}>
              • Bug Reports: Within 24 hours{'\n'}
              • Complaints: Within 48 hours{'\n'}
              • Feedback & Others: Within 3-5 business days
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Message Type Modal */}
      <Modal
        visible={showTypeModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTypeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Message Type</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowTypeModal(false)}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView>
              {messageTypes.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.typeOption,
                    formData.type === type.value && styles.selectedTypeOption
                  ]}
                  onPress={() => {
                    setFormData({ ...formData, type: type.value });
                    setShowTypeModal(false);
                  }}
                >
                  <Text style={styles.typeLabel}>{type.label}</Text>
                  <Text style={styles.typeDescription}>{type.description}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    paddingTop: 0,
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
  welcomeSection: {
    backgroundColor: '#2c3e50',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ecf0f1',
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 14,
    color: '#bdc3c7',
    lineHeight: 20,
  },
  formSection: {
    backgroundColor: '#2c3e50',
    borderRadius: 12,
    padding: 20,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: {
    color: '#bdc3c7',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  dropdown: {
    backgroundColor: '#34495e',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#34495e',
    paddingHorizontal: 15,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: {
    fontSize: 16,
    color: '#ecf0f1',
    flex: 1,
  },
  placeholderText: {
    color: '#95a5a6',
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#bdc3c7',
    marginLeft: 10,
  },
  textInput: {
    backgroundColor: '#34495e',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#34495e',
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#ecf0f1',
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  characterCount: {
    color: '#95a5a6',
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: '#2C8AA6',
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  disabledButton: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  helpSection: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#34495e',
    borderRadius: 8,
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ecf0f1',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 13,
    color: '#bdc3c7',
    lineHeight: 18,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#2c3e50',
    borderRadius: 12,
    width: '100%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#34495e',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ecf0f1',
  },
  modalCloseButton: {
    padding: 5,
  },
  modalCloseText: {
    fontSize: 18,
    color: '#bdc3c7',
  },
  typeOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#34495e',
  },
  selectedTypeOption: {
    backgroundColor: '#34495e',
  },
  typeLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ecf0f1',
    marginBottom: 4,
  },
  typeDescription: {
    fontSize: 13,
    color: '#bdc3c7',
  },
});

export default ContactScreen;