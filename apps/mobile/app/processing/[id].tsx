import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { meetingsApi } from '../../lib/api';
import { useTheme, makeStyles, type Colors } from '../../theme';

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
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const meetingId = params.id as string;

  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const friendlyFailure = (raw: string): string => {
    const t = (raw || '').toLowerCase();
    if (t.includes('credit') || t.includes('429') || t.includes('insufficient')) {
      return 'The AI service is out of credit, so notes can\u2019t be generated yet. Add credit to the provider account and retry.';
    }
    if (t.includes('not found') && t.includes('audio')) {
      return 'No audio was found for this meeting. Please record on this device and try again.';
    }
    if (t.includes('econnreset') || t.includes('connection error') || t.includes('network')) {
      return 'Could not reach the AI service. Please check the connection and retry.';
    }
    if (raw) {
      return `Processing failed: ${raw}`;
    }
    return 'Processing encountered an error. Please retry or re-record.';
  };

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
          setError(friendlyFailure((res.data.metadata as any)?.failureReason || ''));
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
          <ActivityIndicator size="large" color={colors.primary} />
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
                  <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                ) : isCurrent ? (
                  <ActivityIndicator size="small" color={colors.primary} style={{ transform: [{ scale: 0.8 }] }} />
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

const createStyles = makeStyles((colors: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
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
      backgroundColor: colors.primarySoft,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 6,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 13,
      color: colors.textMuted,
      textAlign: 'center',
      marginBottom: 24,
      paddingHorizontal: 16,
      lineHeight: 18,
    },
    stepsCard: {
      width: '100%',
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
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
      borderColor: colors.border,
      marginLeft: 2,
    },
    stepText: {
      fontSize: 13,
      color: colors.textMuted,
      flex: 1,
    },
    stepTextCurrent: {
      color: colors.primary,
      fontWeight: '600',
    },
    stepTextDone: {
      color: colors.text,
      fontWeight: '500',
    },
    errorBox: {
      marginTop: 20,
      backgroundColor: colors.dangerSoft,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 14,
      width: '100%',
      alignItems: 'center',
    },
    errorText: {
      color: colors.danger,
      fontSize: 13,
      textAlign: 'center',
      marginBottom: 10,
    },
    retryButton: {
      backgroundColor: colors.danger,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 6,
    },
    retryButtonText: {
      color: colors.onPrimary,
      fontSize: 13,
      fontWeight: '600',
    },
  }),
);
