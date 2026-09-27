import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  useAudioRecorder,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../lib/api';

export default function RecordScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const meetingId = params.id as string;

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [isOffline, setIsOffline] = useState(false);
  const [pendingUploads, setPendingUploads] = useState(0);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const chunkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const networkCheckRef = useRef<NodeJS.Timeout | null>(null);
  const chunkIndex = useRef(0);
  const offlineChunks = useRef<string[]>([]);

  useEffect(() => {
    checkNetworkStatus();
    networkCheckRef.current = setInterval(checkNetworkStatus, 5000);
    loadPendingUploads();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (chunkIntervalRef.current) clearInterval(chunkIntervalRef.current);
      if (networkCheckRef.current) clearInterval(networkCheckRef.current);
      if (recorder.isRecording) {
        recorder.stop().catch(() => {});
      }
    };
  }, [recorder]);

  const checkNetworkStatus = async () => {
    const networkState = await NetInfo.fetch();
    const offline = !networkState.isConnected;
    setIsOffline(offline);

    // If we just came back online, sync pending uploads
    if (!offline && pendingUploads > 0) {
      syncPendingUploads();
    }
  };

  const loadPendingUploads = async () => {
    try {
      const pending = await AsyncStorage.getItem('pending_uploads');
      if (pending) {
        const uploads = JSON.parse(pending);
        setPendingUploads(uploads.length);
      }
    } catch (error) {
      console.error('Failed to load pending uploads:', error);
    }
  };

  const syncPendingUploads = async () => {
    try {
      const pending = await AsyncStorage.getItem('pending_uploads');
      if (!pending) return;

      const uploads = JSON.parse(pending);
      const successful = [];

      for (const upload of uploads) {
        try {
          const fileUri = upload.localUri;
          const fileExists = await FileSystem.getInfoAsync(fileUri);
          
          if (fileExists.exists) {
            const formData = new FormData();
            formData.append('audio', {
              uri: fileUri,
              type: 'audio/webm',
              name: 'audio',
            } as any);
            formData.append('chunkIndex', '0');

            const apiUrl = await AsyncStorage.getItem('custom_api_url') || 'http://192.168.3.136:3000';
            const response = await fetch(`${apiUrl}/upload/meeting/${upload.meetingId}/chunk/direct`, {
              method: 'POST',
              headers: {
                'Content-Type': 'multipart/form-data',
                Authorization: `Bearer ${await AsyncStorage.getItem('auth_token')}`,
              },
              body: formData,
            });

            if (response.ok) {
              await FileSystem.deleteAsync(fileUri);
              successful.push(upload);
            }
          }
        } catch (error) {
          console.error('Failed to sync upload:', error);
        }
      }

      // Remove successful uploads from pending list
      const remaining = uploads.filter(u => !successful.includes(u));
      await AsyncStorage.setItem('pending_uploads', JSON.stringify(remaining));
      setPendingUploads(remaining.length);
    } catch (error) {
      console.error('Failed to sync pending uploads:', error);
    }
  };

  const startRecording = async () => {
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Microphone access is required to record');
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await recorder.prepareToRecordAsync();
      recorder.record();

      setIsRecording(true);
      setIsPaused(false);

      await api.post(`/meetings/${meetingId}/start`);

      intervalRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);

      // Auto-save chunks every 10 seconds
      chunkIntervalRef.current = setInterval(async () => {
        if (recorder.uri) {
          await saveChunk(recorder.uri);
        }
      }, 10000);
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const saveChunk = async (uri: string) => {
    try {
      if (!uri) return;

      // If offline, save chunk locally
      if (isOffline) {
        const fileName = `meeting_${meetingId}_chunk_${chunkIndex.current}.webm`;
        const fileDir = FileSystem.documentDirectory + 'offline_recordings';
        const fileUri = fileDir + '/' + fileName;

        await FileSystem.makeDirectoryAsync(fileDir);
        await FileSystem.copyAsync({
          from: uri,
          to: fileUri,
        });

        offlineChunks.current.push(fileUri);
        console.log(`Saved chunk ${chunkIndex.current} locally for offline mode`);
        chunkIndex.current++;
        return;
      }

      // Online mode - upload to server
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
      // If upload fails, save locally
      if (!isOffline) {
        const fileName = `meeting_${meetingId}_chunk_${chunkIndex.current}.webm`;
        const fileDir = FileSystem.documentDirectory + 'offline_recordings';
        const fileUri = fileDir + '/' + fileName;

        try {
          await FileSystem.makeDirectoryAsync(fileDir);
          await FileSystem.copyAsync({
            from: uri,
            to: fileUri,
          });
          offlineChunks.current.push(fileUri);
          chunkIndex.current++;
          setIsOffline(true);
          console.log('Upload failed, saved chunk locally');
        } catch (localError) {
          console.error('Failed to save chunk locally:', localError);
        }
      }
    }
  };

  const pauseRecording = async () => {
    recorder.pause();
    setIsPaused(true);
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (chunkIntervalRef.current) clearInterval(chunkIntervalRef.current);
  };

  const resumeRecording = async () => {
    recorder.record();
    setIsPaused(false);
    intervalRef.current = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);
    chunkIntervalRef.current = setInterval(async () => {
      if (recorder.uri) {
        await saveChunk(recorder.uri);
      }
    }, 10000);
  };

  const stopRecording = async () => {
    try {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (chunkIntervalRef.current) clearInterval(chunkIntervalRef.current);

      await recorder.stop();
      if (recorder.uri) {
        await saveChunk(recorder.uri);
      }

      await api.post(`/meetings/${meetingId}/stop`);

      // If we have offline chunks, save them to pending uploads
      if (offlineChunks.current.length > 0) {
        try {
          const pending = await AsyncStorage.getItem('pending_uploads') || '[]';
          const uploads = JSON.parse(pending);
          
          for (const chunkUri of offlineChunks.current) {
            uploads.push({
              meetingId,
              localUri: chunkUri,
              timestamp: Date.now(),
            });
          }
          
          await AsyncStorage.setItem('pending_uploads', JSON.stringify(uploads));
          setPendingUploads(uploads.length);
          offlineChunks.current = [];
        } catch (error) {
          console.error('Failed to save pending uploads:', error);
        }
      }

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
      {/* Network Status Indicator */}
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>⚠️ Offline - Recording will be saved locally</Text>
        </View>
      )}

      {pendingUploads > 0 && !isOffline && (
        <View style={styles.syncBanner}>
          <Text style={styles.syncText}>📤 Syncing {pendingUploads} pending upload(s)...</Text>
        </View>
      )}

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
            {isOffline ? 'Recording offline (saved locally)' : isPaused ? 'Recording paused' : 'Listening...'}
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
  offlineBanner: {
    backgroundColor: '#fef3c7',
    padding: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#fde68a',
  },
  offlineText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
  },
  syncBanner: {
    backgroundColor: '#dcfce7',
    padding: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#86efac',
  },
  syncText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#166534',
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
