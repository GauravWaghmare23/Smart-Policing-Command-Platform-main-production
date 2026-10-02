import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import Input from '../../src/components/Input';
import Button from '../../src/components/Button';

export default function RegisterScreen() {
  const { register } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    emergencyContact1Name: '',
    emergencyContact1Phone: '',
    emergencyContact2Name: '',
    emergencyContact2Phone: '',
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const setField = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Full name is required';
    if (!form.email.trim()) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Enter a valid email address';
    if (!form.phone.trim()) errs.phone = 'Phone number is required';
    if (!form.password) errs.password = 'Password is required';
    else if (form.password.length < 6) errs.password = 'Password must be at least 6 characters';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const emergencyContacts = [];
      if (form.emergencyContact1Name && form.emergencyContact1Phone) {
        emergencyContacts.push({ name: form.emergencyContact1Name, phone: form.emergencyContact1Phone });
      }
      if (form.emergencyContact2Name && form.emergencyContact2Phone) {
        emergencyContacts.push({ name: form.emergencyContact2Name, phone: form.emergencyContact2Phone });
      }

      await register({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        password: form.password,
        role: 'citizen',
        emergencyContacts,
      });

      router.replace('/(citizen)/home');
    } catch (err) {
      Alert.alert('Registration Failed', err.message || 'Could not register citizen account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#1E293B" />
        </TouchableOpacity>

        <Text style={styles.title}>Citizen Registration</Text>
        <Text style={styles.sub}>Create your account for Smart Police emergency services</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Details</Text>
          <Input
            label="Full Name *"
            value={form.name}
            onChangeText={setField('name')}
            placeholder="John Doe"
            error={errors.name}
          />
          <Input
            label="Email Address *"
            value={form.email}
            onChangeText={setField('email')}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
          />
          <Input
            label="Phone Number *"
            value={form.phone}
            onChangeText={setField('phone')}
            placeholder="10-digit phone number"
            keyboardType="phone-pad"
            error={errors.phone}
          />
          <Input
            label="Password *"
            value={form.password}
            onChangeText={setField('password')}
            placeholder="Minimum 6 characters"
            secureTextEntry
            error={errors.password}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emergency Contacts (Optional)</Text>
          <Text style={styles.sectionSub}>These contacts will receive SOS emergency alerts.</Text>

          <Text style={styles.contactGroupHeader}>Emergency Contact 1</Text>
          <Input
            label="Contact 1 Name"
            value={form.emergencyContact1Name}
            onChangeText={setField('emergencyContact1Name')}
            placeholder="Name (e.g. Spouse / Parent)"
          />
          <Input
            label="Contact 1 Phone"
            value={form.emergencyContact1Phone}
            onChangeText={setField('emergencyContact1Phone')}
            placeholder="Phone number"
            keyboardType="phone-pad"
          />

          <Text style={styles.contactGroupHeader}>Emergency Contact 2</Text>
          <Input
            label="Contact 2 Name"
            value={form.emergencyContact2Name}
            onChangeText={setField('emergencyContact2Name')}
            placeholder="Name (e.g. Friend / Sibling)"
          />
          <Input
            label="Contact 2 Phone"
            value={form.emergencyContact2Phone}
            onChangeText={setField('emergencyContact2Phone')}
            placeholder="Phone number"
            keyboardType="phone-pad"
          />
        </View>

        <Button
          title="REGISTER ACCOUNT"
          onPress={handleRegister}
          loading={loading}
          size="lg"
        />

        <TouchableOpacity
          style={styles.loginLink}
          onPress={() => router.replace('/(auth)/login')}
        >
          <Text style={styles.loginText}>
            Already registered? <Text style={styles.loginBold}>Sign In</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F8FAFC' },
  scroll: { flex: 1 },
  content: { flexGrow: 1, padding: 24, paddingBottom: 48 },
  backBtn: {
    marginTop: 12,
    marginBottom: 20,
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { fontSize: 24, fontWeight: '800', color: '#1E293B' },
  sub: { fontSize: 13, color: '#64748B', marginTop: 4, marginBottom: 24 },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 4 },
  sectionSub: { fontSize: 12, color: '#64748B', marginBottom: 14 },
  contactGroupHeader: { fontSize: 13, fontWeight: '700', color: '#1D4ED8', marginTop: 6, marginBottom: 6 },
  loginLink: { alignItems: 'center', marginTop: 20 },
  loginText: { fontSize: 14, color: '#64748B' },
  loginBold: { color: '#1D4ED8', fontWeight: '700' },
});
