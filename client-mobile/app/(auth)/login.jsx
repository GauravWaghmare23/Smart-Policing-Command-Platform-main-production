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

export default function LoginScreen() {
  const { login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!email.trim()) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = 'Enter a valid email address';
    if (!password) errs.password = 'Password is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      router.replace('/(citizen)/home');
    } catch (err) {
      Alert.alert('Login Error', err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const setDemoAccount = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('password123');
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
        <View style={styles.header}>
          <View style={styles.logoBox}>
            <Ionicons name="shield-checkmark" size={44} color="#1D4ED8" />
          </View>
          <Text style={styles.appName}>Smart Police Station</Text>
          <Text style={styles.tagline}>Citizen & Officer Mobile Portal</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sign In</Text>
          <Text style={styles.cardSub}>Sign in for emergency SOS & live field operations</Text>

          <Input
            label="Email Address"
            value={email}
            onChangeText={setEmail}
            placeholder="citizen@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
          />

          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            secureTextEntry
            error={errors.password}
          />

          <Button
            title="LOGIN"
            onPress={handleLogin}
            loading={loading}
            size="lg"
            style={styles.btn}
          />

          {/* Quick Demo Fill Buttons */}
          <View style={styles.demoSection}>
            <Text style={styles.demoTitle}>DEMO QUICK LOGIN</Text>
            <View style={styles.demoRow}>
              <TouchableOpacity
                style={styles.demoBtn}
                onPress={() => setDemoAccount('ramesh.kumar@smartpolice.local')}
              >
                <Ionicons name="person" size={12} color="#1D4ED8" />
                <Text style={styles.demoBtnText}>Citizen</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.demoBtn, styles.demoBtnOfficer]}
                onPress={() => setDemoAccount('sitabuldi.field1@smartpolice.local')}
              >
                <Ionicons name="shield" size={12} color="#059669" />
                <Text style={[styles.demoBtnText, { color: '#059669' }]}>Field Officer</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.demoBtn, styles.demoBtnHead]}
                onPress={() => setDemoAccount('sitabuldi.head@smartpolice.local')}
              >
                <Ionicons name="star" size={12} color="#7C3AED" />
                <Text style={[styles.demoBtnText, { color: '#7C3AED' }]}>Station Head</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.divider}>
            <View style={styles.line} />
            <Text style={styles.orText}>or</Text>
            <View style={styles.line} />
          </View>

          <TouchableOpacity
            style={styles.registerLink}
            onPress={() => router.push('/(auth)/register')}
          >
            <Text style={styles.registerText}>
              Don't have an account? <Text style={styles.registerBold}>REGISTER</Text>
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="information-circle-outline" size={16} color="#64748B" />
          <Text style={styles.infoText}> Secure connection to Smart Police Command Network</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F0F4FF' },
  scroll: { flex: 1 },
  content: { flexGrow: 1, padding: 24, paddingBottom: 40 },
  header: { alignItems: 'center', marginTop: 48, marginBottom: 28 },
  logoBox: {
    width: 84,
    height: 84,
    borderRadius: 22,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#1D4ED8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  appName: { fontSize: 24, fontWeight: '800', color: '#1E293B' },
  tagline: { fontSize: 14, color: '#64748B', marginTop: 2 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  cardTitle: { fontSize: 20, fontWeight: '700', color: '#1E293B', marginBottom: 4 },
  cardSub: { fontSize: 13, color: '#64748B', marginBottom: 20 },
  btn: { marginTop: 8 },
  demoSection: { marginTop: 18, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  demoTitle: { fontSize: 10, fontWeight: '800', color: '#94A3B8', letterSpacing: 1, marginBottom: 8, textAlign: 'center' },
  demoRow: { flexDirection: 'row', gap: 6, justifyContent: 'space-between' },
  demoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  demoBtnOfficer: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
  demoBtnHead: { backgroundColor: '#F5F3FF', borderColor: '#DDD6FE' },
  demoBtnText: { fontSize: 11, fontWeight: '700', color: '#1D4ED8' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 18 },
  line: { flex: 1, height: 1, backgroundColor: '#E2E8F0' },
  orText: { marginHorizontal: 12, color: '#94A3B8', fontSize: 13 },
  registerLink: { alignItems: 'center' },
  registerText: { fontSize: 14, color: '#64748B' },
  registerBold: { color: '#1D4ED8', fontWeight: '700' },
  infoRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  infoText: { fontSize: 12, color: '#64748B' },
});
