import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, makeStyles, type Colors } from '../theme';

export default function RecordScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);

  const handleStart = () => {
    setRecording(true);
  };

  const handleStop = () => {
    setRecording(false);
    router.back();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Recording</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <View style={styles.recordingContainer}>
          <Text style={styles.duration}>{formatDuration(duration)}</Text>
          <Text style={styles.status}>
            {recording ? 'Recording' : 'Ready to record'}
          </Text>
        </View>

        {!recording ? (
          <TouchableOpacity
            style={styles.recordButton}
            onPress={handleStart}
          >
            <Text style={styles.recordButtonText}>Start Recording</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.stopButton}
            onPress={handleStop}
          >
            <Text style={styles.stopButtonText}>Stop Recording</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const createStyles = makeStyles((colors: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      fontSize: 16,
      color: colors.primary,
    },
    title: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
    },
    placeholder: {
      width: 40,
    },
    content: {
      padding: 20,
    },
    recordingContainer: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 40,
      alignItems: 'center',
      marginBottom: 30,
      borderWidth: 1,
      borderColor: colors.border,
    },
    duration: {
      fontSize: 48,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 8,
    },
    status: {
      fontSize: 16,
      color: colors.textMuted,
    },
    recordButton: {
      backgroundColor: colors.danger,
      padding: 20,
      borderRadius: 12,
      alignItems: 'center',
    },
    recordButtonText: {
      color: colors.onPrimary,
      fontSize: 18,
      fontWeight: '600',
    },
    stopButton: {
      backgroundColor: colors.textMuted,
      padding: 20,
      borderRadius: 12,
      alignItems: 'center',
    },
    stopButtonText: {
      color: colors.onPrimary,
      fontSize: 18,
      fontWeight: '600',
    },
  }),
);
