import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { authApi, type UserProfileResponse } from '../../lib/api';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'sw', label: 'Swahili' },
  { code: 'lg', label: 'Luganda' },
  { code: 'fr', label: 'French' },
  { code: 'es', label: 'Spanish' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const [profileData, setProfileData] = useState<UserProfileResponse | null>(null);
  const [fullName, setFullName] = useState('');
  const [country, setCountry] = useState('');
  const [timezone, setTimezone] = useState('');
  const [outputLanguage, setOutputLanguage] = useState('en');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await authApi.getProfile();
      setProfileData(res.data);
      setFullName(res.data.profile.full_name || '');
      setCountry(res.data.profile.country || '');
      setTimezone(res.data.profile.timezone || 'UTC');
      setOutputLanguage(res.data.profile.output_language || 'en');
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await authApi.updateProfile({
        full_name: fullName,
        country,
        timezone,
        output_language: outputLanguage,
      });
      Alert.alert('Saved', 'Your settings have been updated successfully.');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await authApi.logout().catch(() => {});
          } finally {
            await AsyncStorage.removeItem('auth_token');
            router.replace('/login');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.profileHeader}>
        <View style={styles.avatarBox}>
          <Ionicons name="person" size={28} color="#2563eb" />
        </View>
        <View style={styles.profileHeaderText}>
          <Text style={styles.emailText}>{profileData?.user.email}</Text>
          <Text style={styles.roleText}>Personal Account</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Profile Information</Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
            placeholder="Your full name"
            placeholderTextColor="#9ca3af"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Country</Text>
          <TextInput
            style={styles.input}
            value={country}
            onChangeText={setCountry}
            placeholder="e.g. Uganda, Kenya, United States"
            placeholderTextColor="#9ca3af"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Timezone</Text>
          <TextInput
            style={styles.input}
            value={timezone}
            onChangeText={setTimezone}
            placeholder="e.g. Africa/Kampala, UTC"
            placeholderTextColor="#9ca3af"
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Language Preferences</Text>
        <Text style={styles.sublabel}>Preferred language for generated notes and action items</Text>

        <View style={styles.languageOptions}>
          {LANGUAGES.map((lang) => {
            const isSelected = outputLanguage === lang.code;
            return (
              <TouchableOpacity
                key={lang.code}
                style={[styles.languageChip, isSelected && styles.languageChipSelected]}
                onPress={() => setOutputLanguage(lang.code)}
              >
                <Text
                  style={[
                    styles.languageChipText,
                    isSelected && styles.languageChipTextSelected,
                  ]}
                >
                  {lang.label}
                </Text>
                {isSelected && (
                  <Ionicons name="checkmark-circle" size={16} color="#2563eb" />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <TouchableOpacity
        style={styles.saveButton}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#ffffff" size="small" />
        ) : (
          <Text style={styles.saveButtonText}>Save Changes</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={18} color="#dc2626" />
        <Text style={styles.logoutButtonText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 20,
  },
  avatarBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  profileHeaderText: {
    flex: 1,
  },
  emailText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  roleText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 16,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  sublabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 12,
  },
  formGroup: {
    marginTop: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  languageOptions: {
    gap: 8,
    marginTop: 4,
  },
  languageChip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  languageChipSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  languageChipText: {
    fontSize: 14,
    color: '#374151',
  },
  languageChipTextSelected: {
    color: '#2563eb',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fee2e2',
    backgroundColor: '#fef2f2',
    gap: 6,
  },
  logoutButtonText: {
    color: '#dc2626',
    fontSize: 15,
    fontWeight: '600',
  },
});
