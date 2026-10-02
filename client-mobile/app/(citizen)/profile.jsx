import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { useRouter } from 'expo-router';
import Button from '../../src/components/Button';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          setLoggingOut(true);
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const contacts = user?.emergencyContacts || [];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1D4ED8" />
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(user?.name || 'C')[0].toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{user?.name || 'Authenticated Citizen'}</Text>
        <View style={styles.roleBadge}>
          <Ionicons name="shield-checkmark" size={12} color="#FFFFFF" />
          <Text style={styles.roleBadgeText}>  {(user?.role || 'CITIZEN').toUpperCase()}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Real Authenticated Profile Data */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Profile Details</Text>

          <View style={styles.row}>
            <Ionicons name="person-outline" size={18} color="#1D4ED8" />
            <Text style={styles.label}>Full Name:</Text>
            <Text style={styles.val}>{user?.name || '—'}</Text>
          </View>

          <View style={styles.row}>
            <Ionicons name="mail-outline" size={18} color="#1D4ED8" />
            <Text style={styles.label}>Email:</Text>
            <Text style={styles.val}>{user?.email || '—'}</Text>
          </View>

          <View style={styles.row}>
            <Ionicons name="call-outline" size={18} color="#1D4ED8" />
            <Text style={styles.label}>Phone:</Text>
            <Text style={styles.val}>{user?.phone || '—'}</Text>
          </View>

          <View style={styles.row}>
            <Ionicons name="shield-outline" size={18} color="#1D4ED8" />
            <Text style={styles.label}>Role:</Text>
            <Text style={styles.val}>{(user?.role || 'citizen').toUpperCase()}</Text>
          </View>

          <View style={styles.row}>
            <Ionicons name="checkmark-circle-outline" size={18} color="#059669" />
            <Text style={styles.label}>Status:</Text>
            <Text style={[styles.val, { color: '#059669', fontWeight: '800' }]}>
              {user?.status || 'Active & Verified'}
            </Text>
          </View>

          {user?._id && (
            <View style={styles.row}>
              <Ionicons name="finger-print-outline" size={18} color="#7C3AED" />
              <Text style={styles.label}>Citizen ID:</Text>
              <Text style={styles.val}>{user._id}</Text>
            </View>
          )}
        </View>

        {/* Emergency Contacts Summary */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Registered Emergency Contacts</Text>
            <TouchableOpacity onPress={() => router.push('/(citizen)/emergency-contacts')}>
              <Text style={styles.manageBtnText}>Manage</Text>
            </TouchableOpacity>
          </View>

          {contacts.length === 0 ? (
            <Text style={styles.emptyContacts}>No emergency contacts added yet.</Text>
          ) : (
            contacts.map((c, i) => (
              <View key={i} style={styles.contactRow}>
                <Ionicons name="person" size={16} color="#1D4ED8" />
                <Text style={styles.contactName}>{c.name}</Text>
                <Text style={styles.contactPhone}>{c.phone}</Text>
              </View>
            ))
          )}
        </View>

        {/* Action button */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => router.push('/(citizen)/emergency-contacts')}
        >
          <Ionicons name="people" size={20} color="#1D4ED8" />
          <Text style={styles.actionBtnText}>Manage Emergency Contacts</Text>
          <Ionicons name="chevron-forward" size={18} color="#64748B" />
        </TouchableOpacity>

        <Button
          title="LOGOUT"
          variant="danger"
          onPress={handleLogout}
          loading={loggingOut}
          size="lg"
          style={{ marginTop: 8 }}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    backgroundColor: '#1D4ED8',
    paddingTop: 52,
    paddingBottom: 24,
    alignItems: 'center',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarText: { fontSize: 28, fontWeight: '800', color: '#FFFFFF' },
  name: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    marginTop: 6,
  },
  roleBadgeText: { fontSize: 11, color: '#FFFFFF', fontWeight: '800' },
  scroll: { padding: 20 },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    elevation: 2,
  },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  manageBtnText: { fontSize: 13, color: '#1D4ED8', fontWeight: '700' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  label: { fontSize: 12, color: '#64748B', fontWeight: '600', marginLeft: 10, width: 85 },
  val: { fontSize: 13, color: '#1E293B', fontWeight: '600', flex: 1 },
  contactRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  contactName: { fontSize: 13, fontWeight: '600', color: '#1E293B', marginLeft: 8, flex: 1 },
  contactPhone: { fontSize: 13, color: '#64748B', fontWeight: '500' },
  emptyContacts: { fontSize: 12, color: '#94A3B8', marginTop: 4 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    elevation: 1,
  },
  actionBtnText: { fontSize: 14, fontWeight: '700', color: '#1E293B', flex: 1, marginLeft: 12 },
});
