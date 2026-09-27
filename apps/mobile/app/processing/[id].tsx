import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { meetingsApi } from '../../lib/api';

const PIPELINE_STEPS = [
  'Uploading and validating audio stream',
  'Performing speech recognition and transcription',
  'Detecting speaker turns and timestamps',
  'Analyzing context and generating executive summary',
  'Extracting decisions and action items',
  'Finalizing meeting notes',
];

export default function ProcessingScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const meetingId = params.id as string;

  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => (prev < PIPELINE_STEPS.length - 1 ? prev + 1 : prev));
    }, 2500);

    const checkStatus = async () => {
      try {
        const res = await meetingsApi.get(meetingId);
        if (res.data.status === 'completed') {
          clearInterval(stepInterval);
          router.replace(`/meetings/${meetingId}`);
        } else if (res.data.status === 'failed') {
          setError('Processing encountered an error. Please retry or re-record.');
          clearInterval(stepInterval);
        }
      } catch (err: any) {
        console.error('Polling status error:', err);
      }
    };

    const pollInterval = setInterval(checkStatus, 3000);
    checkStatus();

    return () => {
      clearInterval(stepInterval);
      clearInterval(pollInterval);
    };
  }, [meetingId]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>

        <Text style={styles.title}>Processing Meeting Audio</Text>
        <Text style={styles.subtitle}>
          Generating transcript, key discussion points, decisions, and action items.
        </Text>

        <View style={styles.stepsCard}>
          {PIPELINE_STEPS.map((step, idx) => {
            const isDone = idx < currentStep;
            const isCurrent = idx === currentStep;
            return (
              <View key={idx} style={styles.stepRow}>
                {isDone ? (
                  <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
                ) : isCurrent ? (
                  <ActivityIndicator size="small" color="#2563eb" style={{ transform: [{ scale: 0.8 }] }} />
                ) : (
                  <View style={styles.dotInactive} />
                )}
                <Text
                  style={[
                    styles.stepText,
                    isDone && styles.stepTextDone,
                    isCurrent && styles.stepTextCurrent,
                  ]}
                >
                  {step}
                </Text>
              </View>
            );
          })}
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => router.replace(`/meetings/${meetingId}`)}
            >
              <Text style={styles.retryButtonText}>Go to Meeting</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 16,
    lineHeight: 18,
  },
  stepsCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 14,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dotInactive: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    marginLeft: 2,
  },
  stepText: {
    fontSize: 13,
    color: '#9ca3af',
    flex: 1,
  },
  stepTextCurrent: {
    color: '#1e40af',
    fontWeight: '600',
  },
  stepTextDone: {
    color: '#374151',
    fontWeight: '500',
  },
  errorBox: {
    marginTop: 20,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fee2e2',
    borderRadius: 8,
    padding: 14,
    width: '100%',
    alignItems: 'center',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
});
