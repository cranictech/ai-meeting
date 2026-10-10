import { useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { meetingsApi } from '../../lib/api';

const MEETING_TYPES = [
  'Business Meeting',
  '1-on-1',
  'Interview',
  'Team Standup',
  'Client Meeting',
  'Lecture / Class',
  'Church / Community',
  'General Note',
];

type PlatformOption = {
  value: string;
  label: string;
  requiresLink: boolean;
  placeholder?: string;
};

const PLATFORMS: PlatformOption[] = [
  { value: 'in-person', label: 'In-person / Room', requiresLink: false },
  { value: 'google-meet', label: 'Google Meet', requiresLink: true, placeholder: 'https://meet.google.com/xxx-xxxx-xxx' },
  { value: 'zoom', label: 'Zoom', requiresLink: true, placeholder: 'https://zoom.us/j/00000000000' },
  { value: 'microsoft-teams', label: 'Microsoft Teams', requiresLink: true, placeholder: 'https://teams.microsoft.com/l/meetup-join/...' },
  { value: 'webex', label: 'Cisco Webex', requiresLink: true, placeholder: 'https://yourcompany.webex.com/meet/username' },
  { value: 'phone', label: 'Phone Call', requiresLink: false },
  { value: 'whatsapp', label: 'WhatsApp', requiresLink: false },
  { value: 'telegram', label: 'Telegram', requiresLink: false },
  { value: 'other', label: 'Other', requiresLink: false },
];

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'sw', label: 'Swahili' },
  { code: 'lg', label: 'Luganda' },
  { code: 'fr', label: 'French' },
  { code: 'es', label: 'Spanish' },
];

export default function NewMeetingScreen() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [meetingType, setMeetingType] = useState('Business Meeting');
  const [outputLanguage, setOutputLanguage] = useState('en');
  const [platform, setPlatform] = useState('in-person');
  const [meetingLink, setMeetingLink] = useState('');
  const [creating, setCreating] = useState(false);

  const selectedPlatform = PLATFORMS.find((p) => p.value === platform) ?? PLATFORMS[0];

  const handleCreateAndRecord = async () => {
    if (!title.trim()) {
      Alert.alert('Required Field', 'Please enter a title for the meeting.');
      return;
    }

    if (selectedPlatform.requiresLink && !meetingLink.trim()) {
      Alert.alert(
        'Meeting Link Required',
        `Paste the ${selectedPlatform.label} link so the meeting can be joined.`,
      );
      return;
    }

    setCreating(true);
    try {
      const res = await meetingsApi.create({
        title: title.trim(),
        meetingType,
        outputLanguage,
        platform,
        meetingLink: selectedPlatform.requiresLink ? meetingLink.trim() : undefined,
      });

      router.replace(`/record/${res.data.id}?title=${encodeURIComponent(title.trim())}`);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to create meeting');
      setCreating(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Meeting Setup</Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Meeting Title</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Q4 Strategy Review"
            placeholderTextColor="#9ca3af"
            value={title}
            onChangeText={setTitle}
            autoFocus
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Meeting Platform</Text>
          <View style={styles.chipsContainer}>
            {PLATFORMS.map((p) => {
              const isSelected = platform === p.value;
              return (
                <TouchableOpacity
                  key={p.value}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                  onPress={() => {
                    setPlatform(p.value);
                    setMeetingLink('');
                  }}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.platformHint}>
            {selectedPlatform.requiresLink
              ? 'Paste the invitation link to join. Audio is recorded on this device.'
              : 'Recording starts immediately on this device. No link required.'}
          </Text>
        </View>

        {selectedPlatform.requiresLink && (
          <View style={styles.formGroup}>
            <Text style={styles.label}>{selectedPlatform.label} Link</Text>
            <TextInput
              style={styles.input}
              placeholder={selectedPlatform.placeholder}
              placeholderTextColor="#9ca3af"
              value={meetingLink}
              onChangeText={setMeetingLink}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
          </View>
        )}

        <View style={styles.formGroup}>
          <Text style={styles.label}>Meeting Type</Text>
          <View style={styles.chipsContainer}>
            {MEETING_TYPES.map((type) => {
              const isSelected = meetingType === type;
              return (
                <TouchableOpacity
                  key={type}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                  onPress={() => setMeetingType(type)}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Notes Language</Text>
          <View style={styles.languagesContainer}>
            {LANGUAGES.map((lang) => {
              const isSelected = outputLanguage === lang.code;
              return (
                <TouchableOpacity
                  key={lang.code}
                  style={[styles.langChip, isSelected && styles.langChipSelected]}
                  onPress={() => setOutputLanguage(lang.code)}
                >
                  <Text style={[styles.langText, isSelected && styles.langTextSelected]}>
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
      </View>

      <TouchableOpacity
        style={styles.startButton}
        onPress={handleCreateAndRecord}
        disabled={creating}
        activeOpacity={0.85}
      >
        {creating ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <View style={styles.buttonContent}>
            <Ionicons name="mic" size={20} color="#ffffff" />
            <Text style={styles.startButtonText}>
              {selectedPlatform.requiresLink ? 'Join & Start Recording' : 'Start Recording'}
            </Text>
          </View>
        )}
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
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  platformHint: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
    lineHeight: 17,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  chipSelected: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  chipText: {
    fontSize: 13,
    color: '#4b5563',
  },
  chipTextSelected: {
    color: '#2563eb',
    fontWeight: '600',
  },
  languagesContainer: {
    gap: 8,
  },
  langChip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  langChipSelected: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  langText: {
    fontSize: 14,
    color: '#374151',
  },
  langTextSelected: {
    color: '#2563eb',
    fontWeight: '600',
  },
  startButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  startButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
