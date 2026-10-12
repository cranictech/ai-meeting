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
import { useTheme, type Colors } from '../../theme';
import { authApi, getActiveApiUrl, setCustomApiUrl, DEFAULT_API_URL, type UserProfileResponse } from '../../lib/api';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'sw', label: 'Swahili' },
  { code: 'lg', label: 'Luganda' },
  { code: 'fr', label: 'French' },
  { code: 'es', label: 'Spanish' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, theme, setTheme } = useTheme();
  const styles = createStyles(colors);
  const [profileData, setProfileData] = useState<UserProfileResponse | null>(null);
  const [fullName, setFullName] = useState('');
  const [country, setCountry] = useState('');
  const [timezone, setTimezone] = useState('');
  const [outputLanguage, setOutputLanguage] = useState('en');
  const [serverUrl, setServerUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const currentUrl = await getActiveApiUrl();
      setServerUrl(currentUrl);
      const res = await authApi.getProfile();
      setProfileData(res.data);
      setFullName(res.data.profile.full_name || '');
      setCountry(res.data.profile.country || '');
      setTimezone(res.data.profile.timezone || 'UTC');
      setOutputLanguage(res.data.profile.output_language || 'en');
    } catch (err: any) {
      console.warn('Failed to load profile:', err?.message || err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await setCustomApiUrl(serverUrl);
      await authApi.updateProfile({
        full_name: fullName,
        country,
        timezone,
        output_language: outputLanguage,
      });
      Alert.alert('Saved', 'Your settings and server URL have been updated successfully.');
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

  const handleDeleteAccount = () => {
    if (!deletePassword) {
      Alert.alert('Password required', 'Enter your password to delete your account.');
      return;
    }
    Alert.alert(
      'Delete Account',
      'This permanently deletes your account, all meetings, recordings and notes. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await authApi.deleteAccount(deletePassword);
              await AsyncStorage.removeItem('auth_token');
              router.replace('/login');
            } catch (err: any) {
              if (err?.response?.status === 401) {
                Alert.alert('Incorrect password', 'The password you entered is not correct.');
              } else {
                Alert.alert('Error', err?.response?.data?.error || 'Failed to delete your account.');
              }
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.profileHeader}>
        <View style={styles.avatarBox}>
          <Ionicons name="person" size={28} color={colors.primary} />
        </View>
        <View style={styles.profileHeaderText}>
          <Text style={styles.emailText}>{profileData?.user.email}</Text>
          <Text style={styles.roleText}>Personal Account</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Appearance</Text>
        <Text style={styles.sublabel}>Choose how Meeti looks</Text>
        <View style={styles.themeRow}>
          <TouchableOpacity
            style={[styles.themeOption, theme === 'light' && styles.themeOptionActive]}
            onPress={() => setTheme('light')}
          >
            <Ionicons name="sunny-outline" size={18} color={theme === 'light' ? colors.primary : colors.textMuted} />
            <Text style={[styles.themeOptionText, theme === 'light' && styles.themeOptionTextActive]}>Light</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.themeOption, theme === 'dark' && styles.themeOptionActive]}
            onPress={() => setTheme('dark')}
          >
            <Ionicons name="moon-outline" size={18} color={theme === 'dark' ? colors.primary : colors.textMuted} />
            <Text style={[styles.themeOptionText, theme === 'dark' && styles.themeOptionTextActive]}>Dark</Text>
          </TouchableOpacity>
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
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Country</Text>
          <TextInput
            style={styles.input}
            value={country}
            onChangeText={setCountry}
            placeholder="e.g. Uganda, Kenya, United States"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Timezone</Text>
          <TextInput
            style={styles.input}
            value={timezone}
            onChangeText={setTimezone}
            placeholder="e.g. Africa/Kampala, UTC"
            placeholderTextColor={colors.textMuted}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Server Connection</Text>
        <Text style={styles.sublabel}>Backend API endpoint for cross-network access</Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>API Base URL</Text>
          <TextInput
            style={styles.input}
            value={serverUrl}
            onChangeText={setServerUrl}
            placeholder="http://192.168.x.x:3000 or https://..."
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <TouchableOpacity style={styles.resetButton} onPress={() => setServerUrl(DEFAULT_API_URL)}>
          <Text style={styles.resetButtonText}>Reset to Default ({DEFAULT_API_URL})</Text>
        </TouchableOpacity>
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
                <Text style={[styles.languageChipText, isSelected && styles.languageChipTextSelected]}>
                  {lang.label}
                </Text>
                {isSelected && <Ionicons name="checkmark-circle" size={16} color={colors.primary} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
        {saving ? (
          <ActivityIndicator color="#ffffff" size="small" />
        ) : (
          <Text style={styles.saveButtonText}>Save Changes</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={18} color={colors.danger} />
        <Text style={styles.logoutButtonText}>Sign Out</Text>
      </TouchableOpacity>

      <View style={styles.section}>
        <Text style={[styles.sectionHeader, { color: colors.danger }]}>Delete Account</Text>
        <Text style={styles.sublabel}>
          Permanently remove your account and all data. This cannot be undone.
        </Text>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Confirm your password</Text>
          <TextInput
            style={styles.input}
            value={deletePassword}
            onChangeText={setDeletePassword}
            placeholder="Your current password"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            autoCapitalize="none"
          />
        </View>
        <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
          <Ionicons name="trash-outline" size={18} color="#ffffff" />
          <Text style={styles.deleteButtonText}>Delete my account</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const createStyles = (c: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    contentContainer: { padding: 16, paddingBottom: 40 },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: c.background },
    profileHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.card,
      padding: 16,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
      marginBottom: 20,
    },
    avatarBox: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: c.primarySoft,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 14,
    },
    profileHeaderText: { flex: 1 },
    emailText: { fontSize: 15, fontWeight: '600', color: c.text },
    roleText: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    themeRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
    themeOption: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.inputBg,
    },
    themeOptionActive: { borderColor: c.primary, backgroundColor: c.primarySoft },
    themeOptionText: { fontSize: 14, color: c.textMuted, fontWeight: '500' },
    themeOptionTextActive: { color: c.primary, fontWeight: '600' },
    section: {
      backgroundColor: c.card,
      borderRadius: 10,
      padding: 16,
      borderWidth: 1,
      borderColor: c.border,
      marginBottom: 16,
    },
    sectionHeader: { fontSize: 15, fontWeight: '600', color: c.text, marginBottom: 4 },
    sublabel: { fontSize: 12, color: c.textMuted, marginBottom: 12 },
    formGroup: { marginTop: 12 },
    label: { fontSize: 13, fontWeight: '500', color: c.text, marginBottom: 6 },
    input: {
      backgroundColor: c.inputBg,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: c.text,
    },
    languageOptions: { gap: 8, marginTop: 4 },
    languageChip: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.inputBg,
    },
    languageChipSelected: { borderColor: c.primary, backgroundColor: c.primarySoft },
    languageChipText: { fontSize: 14, color: c.text },
    languageChipTextSelected: { color: c.primary, fontWeight: '600' },
    saveButton: {
      backgroundColor: c.primary,
      paddingVertical: 14,
      borderRadius: 8,
      alignItems: 'center',
      marginBottom: 12,
    },
    saveButtonText: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
    logoutButton: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 14,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.dangerSoft,
      backgroundColor: c.dangerSoft,
      gap: 6,
    },
    logoutButtonText: { color: c.danger, fontSize: 15, fontWeight: '600' },
    resetButton: {
      marginTop: 10,
      alignSelf: 'flex-start',
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 6,
      backgroundColor: c.neutralSoft,
    },
    resetButtonText: { fontSize: 12, color: c.textMuted },
    deleteButton: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 14,
      borderRadius: 8,
      backgroundColor: c.danger,
      marginTop: 16,
      gap: 6,
    },
    deleteButtonText: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
  });
