import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  meetingsApi,
  actionItemsApi,
  transcriptsApi,
  exportsApi,
  type Meeting,
  type ActionItem,
  type TranscriptSegment,
  type MeetingSummary,
} from '../../lib/api';

type TabType = 'summary' | 'actionItems' | 'transcript';

export default function MeetingDetailScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const meetingId = params.id as string;

  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [summary, setSummary] = useState<MeetingSummary | null>(null);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTaskText, setNewTaskText] = useState('');
  const [addingTask, setAddingTask] = useState(false);

  const loadAllDetails = useCallback(async () => {
    try {
      const [mRes, sumRes, actRes, traRes] = await Promise.all([
        meetingsApi.get(meetingId),
        meetingsApi.getSummary(meetingId).catch(() => null),
        actionItemsApi.listByMeeting(meetingId).catch(() => ({ data: [] })),
        transcriptsApi.getByMeetingId(meetingId).catch(() => ({ data: [] })),
      ]);

      setMeeting(mRes.data);
      if (sumRes) setSummary(sumRes.data);
      setActionItems(actRes.data || []);
      setTranscript(traRes.data || []);
    } catch (err: any) {
      console.error('Failed to load meeting details:', err);
      Alert.alert('Error', err.response?.data?.error || 'Failed to load meeting');
    } finally {
      setLoading(false);
    }
  }, [meetingId]);

  useEffect(() => {
    loadAllDetails();
  }, [loadAllDetails]);

  const handleToggleActionItem = async (item: ActionItem) => {
    const nextStatus = item.status === 'completed' ? 'pending' : 'completed';
    try {
      await actionItemsApi.updateStatus(item.id, nextStatus);
      setActionItems((prev) =>
        prev.map((a) => (a.id === item.id ? { ...a, status: nextStatus } : a))
      );
    } catch (err) {
      Alert.alert('Error', 'Failed to update task status');
    }
  };

  const handleCreateTask = async () => {
    if (!newTaskText.trim()) return;
    setAddingTask(true);
    try {
      const res = await actionItemsApi.create(meetingId, {
        task: newTaskText.trim(),
        priority: 'medium',
      });
      setActionItems((prev) => [...prev, res.data]);
      setNewTaskText('');
    } catch (err) {
      Alert.alert('Error', 'Failed to add action item');
    } finally {
      setAddingTask(false);
    }
  };

  const handleDeleteMeeting = () => {
    Alert.alert(
      'Delete Meeting',
      'Are you sure you want to permanently delete this meeting?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await meetingsApi.delete(meetingId);
              router.replace('/(tabs)/meetings');
            } catch (err) {
              Alert.alert('Error', 'Failed to delete meeting');
            }
          },
        },
      ]
    );
  };

  const handleExport = (format: 'pdf' | 'docx') => {
    const url = format === 'pdf' ? exportsApi.downloadPDF(meetingId) : exportsApi.downloadDOCX(meetingId);
    Alert.alert(
      'Export Meeting',
      `Export meeting as ${format.toUpperCase()}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export',
          onPress: () => {
            // In a real app, you would use Linking.openURL to download the file
            // For now, we'll show the URL
            Alert.alert('Export URL', url);
          },
        },
      ]
    );
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0 min';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatTimestamp = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getStatusBadge = (status?: Meeting['status']) => {
    switch (status) {
      case 'completed':
        return { bg: '#dcfce7', text: '#166534', label: 'Completed' };
      case 'processing':
        return { bg: '#fef3c7', text: '#92400e', label: 'Processing' };
      case 'recording':
        return { bg: '#fee2e2', text: '#991b1b', label: 'Recording' };
      default:
        return { bg: '#f3f4f6', text: '#374151', label: 'Draft' };
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!meeting) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Meeting not found</Text>
      </View>
    );
  }

  const badge = getStatusBadge(meeting.status);

  return (
    <View style={styles.container}>
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <Text style={styles.titleText}>{meeting.title}</Text>
          <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.statusText, { color: badge.text }]}>
              {badge.label}
            </Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={14} color="#6b7280" />
            <Text style={styles.metaText}>{formatDuration(meeting.duration_seconds)}</Text>
          </View>
          {meeting.meeting_type && (
            <View style={styles.metaItem}>
              <Ionicons name="pricetag-outline" size={14} color="#6b7280" />
              <Text style={styles.metaText}>{meeting.meeting_type}</Text>
            </View>
          )}
          {meeting.output_language && (
            <View style={styles.metaItem}>
              <Ionicons name="globe-outline" size={14} color="#6b7280" />
              <Text style={styles.metaText}>{meeting.output_language.toUpperCase()}</Text>
            </View>
          )}
        </View>

        {meeting.status === 'draft' && (
          <TouchableOpacity
            style={styles.recordButton}
            onPress={() => router.push(`/record/${meeting.id}`)}
          >
            <Ionicons name="mic" size={16} color="#ffffff" />
            <Text style={styles.recordButtonText}>Start Recording</Text>
          </TouchableOpacity>
        )}

        {meeting.status === 'completed' && (
          <View style={styles.exportButtonRow}>
            <TouchableOpacity
              style={styles.exportButton}
              onPress={() => handleExport('pdf')}
            >
              <Ionicons name="document-text" size={16} color="#ffffff" />
              <Text style={styles.exportButtonText}>PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.exportButton, styles.exportButtonSecondary]}
              onPress={() => handleExport('docx')}
            >
              <Ionicons name="document" size={16} color="#ffffff" />
              <Text style={styles.exportButtonText}>DOCX</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Segmented Tab Header */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'summary' && styles.tabItemActive]}
          onPress={() => setActiveTab('summary')}
        >
          <Text
            style={[styles.tabItemText, activeTab === 'summary' && styles.tabItemTextActive]}
          >
            Summary
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'actionItems' && styles.tabItemActive]}
          onPress={() => setActiveTab('actionItems')}
        >
          <Text
            style={[
              styles.tabItemText,
              activeTab === 'actionItems' && styles.tabItemTextActive,
            ]}
          >
            Action Items ({actionItems.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'transcript' && styles.tabItemActive]}
          onPress={() => setActiveTab('transcript')}
        >
          <Text
            style={[
              styles.tabItemText,
              activeTab === 'transcript' && styles.tabItemTextActive,
            ]}
          >
            Transcript
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.tabContent} contentContainerStyle={styles.scrollContent}>
        {/* Summary Tab */}
        {activeTab === 'summary' && (
          <View style={styles.summaryContainer}>
            {summary ? (
              <>
                {summary.executive_summary && (
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>Executive Summary</Text>
                    <Text style={styles.bodyText}>{summary.executive_summary}</Text>
                  </View>
                )}

                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Key Discussion</Text>
                  <Text style={styles.bodyText}>{summary.summary_text}</Text>
                </View>

                {summary.key_points && summary.key_points.length > 0 && (
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>Key Points</Text>
                    {summary.key_points.map((point, index) => (
                      <View key={index} style={styles.bulletRow}>
                        <View style={styles.bulletDot} />
                        <Text style={styles.bulletText}>{point}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {summary.decisions && summary.decisions.length > 0 && (
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>Decisions Made</Text>
                    {summary.decisions.map((decision, index) => (
                      <View key={index} style={styles.bulletRow}>
                        <Ionicons name="checkmark-circle-outline" size={16} color="#16a34a" />
                        <Text style={styles.bulletText}>{decision}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </>
            ) : (
              <View style={styles.emptyTabBox}>
                <Ionicons name="document-text-outline" size={40} color="#9ca3af" />
                <Text style={styles.emptyTabText}>No summary generated yet.</Text>
                <Text style={styles.emptyTabSubtext}>
                  Record audio or upload a recording to generate notes.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Action Items Tab */}
        {activeTab === 'actionItems' && (
          <View style={styles.actionItemsContainer}>
            <View style={styles.addTaskCard}>
              <TextInput
                style={styles.taskInput}
                placeholder="Add new action item..."
                placeholderTextColor="#9ca3af"
                value={newTaskText}
                onChangeText={setNewTaskText}
              />
              <TouchableOpacity
                style={styles.addTaskButton}
                onPress={handleCreateTask}
                disabled={addingTask}
              >
                {addingTask ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.addTaskButtonText}>Add</Text>
                )}
              </TouchableOpacity>
            </View>

            {actionItems.length === 0 ? (
              <View style={styles.emptyTabBox}>
                <Ionicons name="checkbox-outline" size={40} color="#9ca3af" />
                <Text style={styles.emptyTabText}>No action items yet.</Text>
                <Text style={styles.emptyTabSubtext}>
                  Type above to add tasks or record audio to auto-extract items.
                </Text>
              </View>
            ) : (
              actionItems.map((item) => {
                const isCompleted = item.status === 'completed';
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.taskItemCard, isCompleted && styles.taskItemCardDone]}
                    onPress={() => handleToggleActionItem(item)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={isCompleted ? 'checkbox' : 'square-outline'}
                      size={22}
                      color={isCompleted ? '#16a34a' : '#6b7280'}
                      style={styles.taskCheckbox}
                    />
                    <View style={styles.taskTextContent}>
                      <Text
                        style={[
                          styles.taskTitle,
                          isCompleted && styles.taskTitleCompleted,
                        ]}
                      >
                        {item.task}
                      </Text>
                      <View style={styles.taskMetaRow}>
                        {item.assignee && (
                          <Text style={styles.taskMetaText}>Assigned: {item.assignee}</Text>
                        )}
                        {item.due_date && (
                          <Text style={styles.taskMetaText}>Due: {item.due_date}</Text>
                        )}
                        <Text
                          style={[
                            styles.priorityTag,
                            item.priority === 'high' && styles.priorityHigh,
                            item.priority === 'low' && styles.priorityLow,
                          ]}
                        >
                          {item.priority.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}

        {/* Transcript Tab */}
        {activeTab === 'transcript' && (
          <View style={styles.transcriptContainer}>
            {transcript.length === 0 ? (
              <View style={styles.emptyTabBox}>
                <Ionicons name="chatbubbles-outline" size={40} color="#9ca3af" />
                <Text style={styles.emptyTabText}>No transcript available.</Text>
              </View>
            ) : (
              transcript.map((seg) => (
                <View key={seg.id} style={styles.segmentCard}>
                  <View style={styles.segmentHeader}>
                    <Text style={styles.speakerText}>{seg.speaker || 'Speaker'}</Text>
                    <Text style={styles.timeText}>
                      {formatTimestamp(seg.start_time)}
                    </Text>
                  </View>
                  <Text style={styles.segmentBody}>{seg.text}</Text>
                </View>
              ))
            )}
          </View>
        )}

        <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteMeeting}>
          <Ionicons name="trash-outline" size={16} color="#dc2626" />
          <Text style={styles.deleteButtonText}>Delete Meeting</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
  },
  headerCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    marginRight: 10,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#6b7280',
  },
  recordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dc2626',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
    gap: 6,
  },
  recordButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  exportButtonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  exportButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  exportButtonSecondary: {
    backgroundColor: '#059669',
  },
  exportButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: '#2563eb',
  },
  tabItemText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
  },
  tabItemTextActive: {
    color: '#2563eb',
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  summaryContainer: {
    gap: 12,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  bodyText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 6,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2563eb',
    marginTop: 7,
  },
  bulletText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
    lineHeight: 20,
  },
  actionItemsContainer: {
    gap: 10,
  },
  addTaskCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    marginBottom: 10,
  },
  taskInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    paddingVertical: 6,
  },
  addTaskButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addTaskButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  taskItemCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  taskItemCardDone: {
    backgroundColor: '#f9fafb',
    opacity: 0.75,
  },
  taskCheckbox: {
    marginRight: 10,
    marginTop: 2,
  },
  taskTextContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#9ca3af',
  },
  taskMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  taskMetaText: {
    fontSize: 11,
    color: '#6b7280',
  },
  priorityTag: {
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  priorityHigh: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
  priorityLow: {
    backgroundColor: '#f3f4f6',
    color: '#4b5563',
  },
  transcriptContainer: {
    gap: 8,
  },
  segmentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 8,
  },
  segmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  speakerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563eb',
  },
  timeText: {
    fontSize: 11,
    color: '#9ca3af',
  },
  segmentBody: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  emptyTabBox: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  emptyTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginTop: 8,
  },
  emptyTabSubtext: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  deleteButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
    marginTop: 20,
  },
  deleteButtonText: {
    fontSize: 13,
    color: '#dc2626',
    fontWeight: '600',
  },
});
