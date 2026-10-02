import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import {
  getEmergencyContacts,
  addEmergencyContact,
} from '../../src/services/emergencyContact.service';
import Input from '../../src/components/Input';
import Button from '../../src/components/Button';
import Loading from '../../src/components/Loading';

export default function EmergencyContactsScreen() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [adding, setAdding] = useState(false);
  const [backendSupported, setBackendSupported] = useState(true);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const data = await getEmergencyContacts();
      setContacts(Array.isArray(data) ? data : data.contacts || []);
      setBackendSupported(true);
    } catch (err) {
      if (err.status === 404) {
        setBackendSupported(false);
        // Fallback to user emergency contacts if returned from /auth/me
        setContacts(user?.emergencyContacts || []);
      } else {
        setContacts(user?.emergencyContacts || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const handleAddContact = async () => {
    if (!name.trim() || !phone.trim()) {
      Alert.alert('Validation Error', 'Please provide both contact name and phone number.');
      return;
    }

    if (!backendSupported) {
      Alert.alert(
        'Backend Action Required',
        'Backend endpoint POST /api/emergency-contacts is not implemented on the server yet. Emergency contacts registered during account creation are active for SOS alerts.'
      );
      return;
    }

    setAdding(true);
    try {
      await addEmergencyContact({ name: name.trim(), phone: phone.trim() });
      setName('');
      setPhone('');
      Alert.alert('Success', 'Emergency contact added successfully.');
      fetchContacts();
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not add emergency contact.');
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return <Loading message="Loading emergency contacts..." />;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.header}>
        <Text style={styles.title}>Emergency Contacts</Text>
        <Text style={styles.sub}>Contacts alerted when you send an SOS</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {!backendSupported && (
          <View style={styles.noticeBox}>
            <Ionicons name="information-circle" size={20} color="#D97706" />
            <Text style={styles.noticeText}>
              Note: Displaying emergency contacts registered with your citizen account.
            </Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Current Emergency Contacts</Text>
        {contacts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="people-outline" size={40} color="#94A3B8" />
            <Text style={styles.emptyText}>No emergency contacts added yet.</Text>
          </View>
        ) : (
          contacts.map((contact, i) => (
            <View key={contact._id || i} style={styles.contactCard}>
              <View style={styles.iconBox}>
                <Ionicons name="person" size={20} color="#1D4ED8" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.contactName}>{contact.name}</Text>
                <Text style={styles.contactPhone}>{contact.phone}</Text>
              </View>
              <View style={styles.tag}>
                <Text style={styles.tagText}>{i === 0 ? 'Primary' : 'Secondary'}</Text>
              </View>
            </View>
          ))
        )}

        <View style={styles.addSection}>
          <Text style={styles.sectionTitle}>Add Emergency Contact</Text>
          <Input
            label="Contact Name"
            value={name}
            onChangeText={setName}
            placeholder="e.g. Jane Doe"
          />
          <Input
            label="Phone Number"
            value={phone}
            onChangeText={setPhone}
            placeholder="e.g. 9876543210"
            keyboardType="phone-pad"
          />
          <Button
            title="ADD CONTACT"
            onPress={handleAddContact}
            loading={adding}
            size="lg"
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    paddingTop: 52,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  title: { fontSize: 22, fontWeight: '800', color: '#1E293B' },
  sub: { fontSize: 13, color: '#64748B', marginTop: 2 },
  scroll: { padding: 20 },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  noticeText: { fontSize: 12, color: '#92400E', marginLeft: 8, flex: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 12 },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyText: { fontSize: 13, color: '#64748B', marginTop: 8 },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    elevation: 1,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactName: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  contactPhone: { fontSize: 13, color: '#64748B', marginTop: 2 },
  tag: { backgroundColor: '#DBEAFE', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  tagText: { fontSize: 11, fontWeight: '700', color: '#1E40AF' },
  addSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginTop: 10,
    elevation: 2,
  },
});
