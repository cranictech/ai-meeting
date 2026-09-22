import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RecordScreen() {
  const router = useRouter();
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioPermission, setAudioPermission] = useState<boolean | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    requestAudioPermission();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync();
      }
    };
  }, []);

  const requestAudioPermission = async () => {
    const { status } = await Audio.requestPermissionsAsync();
    setAudioPermission(status === 'granted');
  };

  const startRecording = async () => {
    try {
      if (!audioPermission) {
        await requestAudioPermission();
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      recordingRef.current = recording;
      await recording.startAsync();
      setRecording(true);
      setPaused(false);

      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const pauseRecording = async () => {
    if (recordingRef.current) {
      await recordingRef.current.pauseAsync();
      setPaused(true);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const resumeRecording = async () => {
    if (recordingRef.current) {
      await recordingRef.current.startAsync();
      setPaused(false);
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    }
  };

  const stopRecording = async () => {
    if (recordingRef.current) {
      await recordingRef.current.stopAndUnloadAsync();
      setRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      
      // Navigate to meeting details
      router.back();
    }
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

      <ScrollView style={styles.content}>
        <View style={styles.recordingContainer}>
          <Text style={styles.duration}>{formatDuration(duration)}</Text>
          <Text style={styles.status}>
            {recording ? (paused ? 'Paused' : 'Recording') : 'Ready to record'}
          </Text>
        </View>

        {!recording ? (
          <TouchableOpacity
            style={styles.recordButton}
            onPress={startRecording}
          >
            <Text style={styles.recordButtonText}>Start Recording</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.controlsContainer}>
            {paused ? (
              <TouchableOpacity
                style={[styles.controlButton, styles.resumeButton]}
                onPress={resumeRecording}
              >
                <Text style={styles.controlButtonText}>Resume</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.controlButton, styles.pauseButton]}
                onPress={pauseRecording}
              >
                <Text style={styles.controlButtonText}>Pause</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.controlButton, styles.stopButton]}
              onPress={stopRecording}
            >
              <Text style={styles.controlButtonText}>Stop</Text>
            </TouchableOpacity>
          </View>
        )}

        {recording && (
          <View style={styles.recordingIndicator}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingText}>Recording in progress</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    fontSize: 16,
    color: '#2563eb',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  placeholder: {
    width: 40,
  },
  content: {
    padding: 20,
  },
  recordingContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  duration: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  status: {
    fontSize: 16,
    color: '#6b7280',
  },
  recordButton: {
    backgroundColor: '#dc2626',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  recordButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  controlsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  controlButton: {
    flex: 1,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  pauseButton: {
    backgroundColor: '#f59e0b',
  },
  resumeButton: {
    backgroundColor: '#10b981',
  },
  stopButton: {
    backgroundColor: '#6b7280',
  },
  controlButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#dc2626',
  },
  recordingText: {
    fontSize: 14,
    color: '#6b7280',
  },
});