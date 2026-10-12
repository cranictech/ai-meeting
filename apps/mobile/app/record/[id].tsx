import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
  Easing,
} from 'react-native';
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
import { Ionicons } from '@expo/vector-icons';
import api, { getActiveApiUrl } from '../../lib/api';
import { useTheme, makeStyles, type Colors } from '../../theme';

const NUM_BARS = 28;

export default function RecordScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const meetingId = params.id as string;
  const meetingTitle = (params.title as string) || 'Meeting';

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [isOffline, setIsOffline] = useState(false);
  const [pendingUploads, setPendingUploads] = useState(0);
  const [chunksUploaded, setChunksUploaded] = useState(0);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const chunkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const networkCheckRef = useRef<NodeJS.Timeout | null>(null);
  const chunkIndex = useRef(0);
  const offlineChunks = useRef<string[]>([]);

  // Animated waveform bars
  const barAnims = useRef(
    Array.from({ length: NUM_BARS }, () => new Animated.Value(0.15))
  ).current;
  const waveAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  const startWaveAnimation = () => {
    const animations = barAnims.map((anim, i) => {
      const delay = (i * 40) % 400;
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 0.2 + Math.random() * 0.8,
            duration: 300 + Math.floor(Math.random() * 300),
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0.1 + Math.random() * 0.3,
            duration: 200 + Math.floor(Math.random() * 200),
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );
    });
    waveAnimRef.current = Animated.parallel(animations);
    waveAnimRef.current.start();
  };

  const stopWaveAnimation = () => {
    waveAnimRef.current?.stop();
    barAnims.forEach((anim) => {
      Animated.timing(anim, {
        toValue: 0.15,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
  };

  useEffect(() => {
    checkNetworkStatus();
    networkCheckRef.current = setInterval(checkNetworkStatus, 5000);
    loadPendingUploads();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (chunkIntervalRef.current) clearInterval(chunkIntervalRef.current);
      if (networkCheckRef.current) clearInterval(networkCheckRef.current);
      stopWaveAnimation();
      if (recorder.isRecording) {
        recorder.stop().catch(() => {});
      }
    };
  }, [recorder]);

  const checkNetworkStatus = async () => {
    const networkState = await NetInfo.fetch();
    const offline = !networkState.isConnected;
    setIsOffline(offline);

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
      const successful: any[] = [];

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

            const apiUrl = await getActiveApiUrl();
            const response = await fetch(
              `${apiUrl}/upload/meeting/${upload.meetingId}/chunk/direct`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'multipart/form-data',
                  Authorization: `Bearer ${await AsyncStorage.getItem('auth_token')}`,
                },
                body: formData,
              }
            );

            if (response.ok) {
              await FileSystem.deleteAsync(fileUri);
              successful.push(upload);
            }
          }
        } catch (error) {
          console.error('Failed to sync upload:', error);
        }
      }

      const remaining = uploads.filter((u: any) => !successful.includes(u));
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

      startWaveAnimation();
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const saveChunk = async (uri: string) => {
    try {
      if (!uri) return;

      if (isOffline) {
        const fileName = `meeting_${meetingId}_chunk_${chunkIndex.current}.webm`;
        const fileDir = FileSystem.documentDirectory + 'offline_recordings';
        const fileUri = fileDir + '/' + fileName;

        await FileSystem.makeDirectoryAsync(fileDir);
        await FileSystem.copyAsync({ from: uri, to: fileUri });

        offlineChunks.current.push(fileUri);
        chunkIndex.current++;
        return;
      }

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
        setChunksUploaded((prev) => prev + 1);
      }
    } catch (error) {
      console.error('Failed to save chunk:', error);
      if (!isOffline) {
        const fileName = `meeting_${meetingId}_chunk_${chunkIndex.current}.webm`;
        const fileDir = FileSystem.documentDirectory + 'offline_recordings';
        const fileUri = fileDir + '/' + fileName;

        try {
          await FileSystem.makeDirectoryAsync(fileDir);
          await FileSystem.copyAsync({ from: uri, to: fileUri });
          offlineChunks.current.push(fileUri);
          chunkIndex.current++;
          setIsOffline(true);
        } catch (localError) {
          console.error('Failed to save chunk locally:', localError);
        }
      }
    }
  };

  const pauseRecording = async () => {
    recorder.pause();
    setIsPaused(true);
    stopWaveAnimation();
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
    startWaveAnimation();
  };

  const stopRecording = async () => {
    try {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (chunkIntervalRef.current) clearInterval(chunkIntervalRef.current);
      stopWaveAnimation();

      await recorder.stop();
      if (recorder.uri) {
        await saveChunk(recorder.uri);
      }

      await api.post(`/meetings/${meetingId}/stop`);

      if (offlineChunks.current.length > 0) {
        try {
          const pending = (await AsyncStorage.getItem('pending_uploads')) || '[]';
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

  const WAVEFORM_MAX_HEIGHT = 56;

  return (
    <View style={styles.container}>
      {/* Network Status Banners */}
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={16} color={colors.warning} />
          <Text style={styles.offlineText}>Offline — saving locally</Text>
        </View>
      )}
      {pendingUploads > 0 && !isOffline && (
        <View style={styles.syncBanner}>
          <Ionicons name="cloud-upload-outline" size={16} color={colors.success} />
          <Text style={styles.syncText}>Syncing {pendingUploads} recording(s)…</Text>
        </View>
      )}

      <View style={styles.content}>
        {/* Meeting Title */}
        <Text style={styles.meetingTitle} numberOfLines={2}>
          {meetingTitle}
        </Text>

        {/* Status Badge */}
        <View
          style={[
            styles.statusBadge,
            isRecording && !isPaused
              ? styles.statusRecording
              : isPaused
              ? styles.statusPaused
              : styles.statusReady,
          ]}
        >
          {isRecording && !isPaused && <View style={styles.recordingDot} />}
          <Text
            style={[
              styles.statusText,
              isRecording && !isPaused && styles.statusTextActive,
            ]}
          >
            {!isRecording ? 'Ready to Record' : isPaused ? '⏸ Paused' : 'RECORDING'}
          </Text>
        </View>

        {/* Timer */}
        <Text style={styles.timer}>{formatDuration(duration)}</Text>

        {/* Waveform Visualizer */}
        <View style={styles.waveformContainer}>
          {barAnims.map((anim, i) => (
            <Animated.View
              key={i}
              style={[
                styles.waveBar,
                {
                  transform: [
                    {
                      scaleY: isRecording && !isPaused ? anim : 0.15,
                    },
                  ],
                  height: WAVEFORM_MAX_HEIGHT,
                  backgroundColor:
                    isRecording && !isPaused
                      ? i % 3 === 0
                        ? colors.primary
                        : i % 3 === 1
                        ? '#06b6d4'
                        : '#22d3ee'
                      : colors.border,
                },
              ]}
            />
          ))}
        </View>

        {/* Status label */}
        {isRecording && (
          <Text style={styles.listeningText}>
            {isOffline
              ? 'Saving locally — will sync when online'
              : isPaused
              ? 'Recording paused — tap Resume to continue'
              : `Listening… ${chunksUploaded > 0 ? `(${chunksUploaded} segment${chunksUploaded !== 1 ? 's' : ''} saved)` : ''}`}
          </Text>
        )}

        {/* Controls */}
        <View style={styles.controls}>
          {!isRecording ? (
            <TouchableOpacity
              style={styles.startButton}
              onPress={startRecording}
              activeOpacity={0.85}
            >
              <Ionicons name="mic" size={22} color="#ffffff" />
              <Text style={styles.startButtonText}>Start Recording</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.recordingButtons}>
              {!isPaused ? (
                <TouchableOpacity
                  style={styles.pauseButton}
                  onPress={pauseRecording}
                  activeOpacity={0.8}
                >
                  <Ionicons name="pause" size={22} color="#ffffff" />
                  <Text style={styles.controlButtonText}>Pause</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.resumeButton}
                  onPress={resumeRecording}
                  activeOpacity={0.8}
                >
                  <Ionicons name="play" size={22} color="#ffffff" />
                  <Text style={styles.controlButtonText}>Resume</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.stopButton}
                onPress={() =>
                  Alert.alert(
                    'Stop Recording',
                    'Are you sure you want to stop and process this meeting?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Stop & Process', style: 'destructive', onPress: stopRecording },
                    ]
                  )
                }
                activeOpacity={0.8}
              >
                <Ionicons name="stop" size={22} color="#ffffff" />
                <Text style={styles.controlButtonText}>Stop</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Consent notice */}
        {!isRecording && (
          <Text style={styles.consentNote}>
            By recording, please ensure all participants consent to being recorded
            as required by applicable law.
          </Text>
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
  },
  offlineBanner: {
    backgroundColor: colors.warningSoft,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  offlineText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.warning,
  },
  syncBanner: {
    backgroundColor: colors.successSoft,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  syncText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.success,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meetingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 24,
  },
  statusReady: {
    backgroundColor: colors.neutralSoft,
  },
  statusRecording: {
    backgroundColor: 'rgba(220, 38, 38, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.3)',
  },
  statusPaused: {
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.3)',
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ef4444',
    marginRight: 8,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  statusTextActive: {
    color: '#f87171',
  },
  timer: {
    fontSize: 62,
    fontWeight: '300',
    color: colors.text,
    letterSpacing: -2,
    marginBottom: 32,
    fontVariant: ['tabular-nums'],
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 64,
    gap: 3,
    marginBottom: 20,
    width: '100%',
  },
  waveBar: {
    width: 5,
    borderRadius: 3,
    opacity: 0.85,
  },
  listeningText: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 36,
    paddingHorizontal: 20,
  },
  controls: {
    width: '100%',
  },
  startButton: {
    backgroundColor: colors.primary,
    paddingVertical: 18,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  startButtonText: {
    color: colors.onPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  recordingButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  pauseButton: {
    flex: 1,
    backgroundColor: colors.warning,
    paddingVertical: 18,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  resumeButton: {
    flex: 1,
    backgroundColor: colors.success,
    paddingVertical: 18,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  stopButton: {
    flex: 1,
    backgroundColor: colors.danger,
    paddingVertical: 18,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  controlButtonText: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  consentNote: {
    marginTop: 24,
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 16,
    lineHeight: 16,
  },
  }),
);
