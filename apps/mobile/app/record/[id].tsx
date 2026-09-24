import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import api from '../../lib/api';

export default function RecordScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const meetingId = params.id as string;

  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const chunkIndex = useRef(0);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (recording) {
        recording.stopAndUnloadAsync();
      }
    };
  }, [recording]);

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Microphone access is required to record');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(newRecording);
      setIsRecording(true);

      await api.post(`/meetings/${meetingId}/start`);

      intervalRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);

      // Auto-save chunks every 10 seconds
      setInterval(async () => {
        if (newRecording) {
          await saveChunk(newRecording);
        }
      }, 10000);
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const saveChunk = async (rec: Audio.Recording) => {
    try {
      const uri = rec.getURI();
      if (!uri) return;

      const { data } = await api.post(`/upload/meeting/${meetingId}/chunk`, {
        chunkIndex: chunkIndex.current,
      });

      const uploadResult = await FileSystem.uploadAsync(data.uploadUrl, uri, {
        httpMethod: 'PUT',
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      });

      if (uploadResult.status === 200) {
        await api.post(`/upload/meeting/${meetingId}/chunk/complete`, {
          chunkIndex: chunkIndex.current,
          storageKey: data.storageKey,
        });
        chunkIndex.current++;
      }
    } catch (error) {
      console.error('Failed to save chunk:', error);
    }
  };

  const pauseRecording = async () => {
    if (recording) {
      await recording.pauseAsync();
      setIsPaused(true);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  };

  const resumeRecording = async () => {
    if (recording) {
      await recording.startAsync();
      setIsPaused(false);
      intervalRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      await recording.stopAndUnloadAsync();
      await saveChunk(recording);

      if (intervalRef.current) clearInterval(intervalRef.current);

      await api.post(`/meetings/${meetingId}/stop`);

      setRecording(null);
      setIsRecording(false);

      router.replace(`/processing/${meetingId}`);
    } catch (error) {
      console.error('Failed to stop recording:', error);
      Alert.alert('Error', 'Failed to stop recording');
    }
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View
          style={[
            styles.statusBadge,
            isRecording && !isPaused ? styles.statusRecording : styles.statusPaused,
          ]}
        >
          {isRecording && !isPaused && <View style={styles.recordingDot} />}
          <Text style={styles.statusText}>
            {!isRecording ? 'Ready' : isPaused ? 'Paused' : 'Recording'}
          </Text>
        </View>

        <Text style={styles.timer}>{formatDuration(duration)}</Text>

        {isRecording && (
          <Text style={styles.subtitle}>
            {isPaused ? 'Recording paused' : 'Listening...'}
          </Text>
        )}

        <View style={styles.buttons}>
          {!isRecording ? (
            <TouchableOpacity style={styles.startButton} onPress={startRecording}>
              <Text style={styles.buttonText}>Start Recording</Text>
            </TouchableOpacity>
          ) : (
            <>
              {!isPaused ? (
                <TouchableOpacity style={styles.pauseButton} onPress={pauseRecording}>
                  <Text style={styles.buttonText}>Pause</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.resumeButton} onPress={resumeRecording}>
                  <Text style={styles.buttonText}>Resume</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.stopButton} onPress={stopRecording}>
                <Text style={styles.buttonText}>Stop & Process</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 32,
  },
  statusRecording: {
    backgroundColor: '#fee2e2',
  },
  statusPaused: {
    backgroundColor: '#f3f4f6',
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#dc2626',
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  timer: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 48,
  },
  buttons: {
    width: '100%',
    gap: 12,
  },
  startButton: {
    backgroundColor: '#2563eb',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  pauseButton: {
    backgroundColor: '#eab308',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  resumeButton: {
    backgroundColor: '#16a34a',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  stopButton: {
    backgroundColor: '#dc2626',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});
