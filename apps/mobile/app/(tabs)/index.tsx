import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  meetingsApi,
  actionItemsApi,
  authApi,
  type Meeting,
  type ActionItem,
  type UserProfileResponse,
} from '../../lib/api';

export default function HomeScreen() {
  const router = useRouter();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [meetingsRes, actionsRes, profileRes] = await Promise.all([
        meetingsApi.list(),
        actionItemsApi.getUserItems('pending').catch(() => ({ data: [] })),
        authApi.getProfile().catch(() => null),
      ]);

      setMeetings(meetingsRes.data || []);
      setActionItems(actionsRes.data || []);
      if (profileRes) {
        setProfile(profileRes.data);
      } else {
        // Set default profile for dev mode
        setProfile({
          user: { id: 'dev-user-id', email: 'dev@example.com', emailVerified: true, status: 'active' },
          profile: { user_id: 'dev-user-id', full_name: 'Dev User', output_language: 'en' }
        } as UserProfileResponse);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      // Set default data for dev mode on error
      setProfile({
        user: { id: 'dev-user-id', email: 'dev@example.com', emailVerified: true, status: 'active' },
        profile: { user_id: 'dev-user-id', full_name: 'Dev User', output_language: 'en' }
      } as UserProfileResponse);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0 min';
    const mins = Math.floor(seconds / 60);
    if (mins < 1) return '< 1 min';
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      const rem = mins % 60;
      return `${hrs}h ${rem}m`;
    }
    return `${mins} min`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusColor = (status: Meeting['status']) => {
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

  const totalMinutes = Math.round(
    meetings.reduce((acc, m) => acc + (m.duration_seconds || 0), 0) / 60
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  const userName = profile?.profile?.full_name || 'User';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome back,</Text>
        <Text style={styles.userName}>{userName}</Text>
      </View>

      <TouchableOpacity
        style={styles.startMeetingCard}
        onPress={() => router.push('/meetings/new')}
        activeOpacity={0.85}
      >
        <View style={styles.startMeetingContent}>
          <View style={styles.startMeetingIconBox}>
            <Ionicons name="mic" size={24} color="#ffffff" />
          </View>
          <View style={styles.startMeetingTextContainer}>
            <Text style={styles.startMeetingTitle}>Start Meeting</Text>
            <Text style={styles.startMeetingSubtitle}>
              Record audio and generate notes
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#ffffff" />
        </View>
      </TouchableOpacity>

      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{meetings.length}</Text>
          <Text style={styles.metricLabel}>Total Meetings</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{actionItems.length}</Text>
          <Text style={styles.metricLabel}>Open Tasks</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{totalMinutes}</Text>
          <Text style={styles.metricLabel}>Minutes Recorded</Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Meetings</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/meetings')}>
          <Text style={styles.seeAllText}>See all</Text>
        </TouchableOpacity>
      </View>

      {meetings.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="folder-open-outline" size={40} color="#9ca3af" />
          <Text style={styles.emptyTitle}>No meetings recorded</Text>
          <Text style={styles.emptySubtitle}>
            Tap Start Meeting above to create your first meeting note.
          </Text>
        </View>
      ) : (
        meetings.slice(0, 5).map((meeting) => {
          const status = getStatusColor(meeting.status);
          return (
            <TouchableOpacity
              key={meeting.id}
              style={styles.meetingCard}
              onPress={() => router.push(`/meetings/${meeting.id}`)}
              activeOpacity={0.7}
            >
              <View style={styles.meetingCardHeader}>
                <Text style={styles.meetingTitle} numberOfLines={1}>
                  {meeting.title}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                  <Text style={[styles.statusText, { color: status.text }]}>
                    {status.label}
                  </Text>
                </View>
              </View>
              <View style={styles.meetingMetaRow}>
                <View style={styles.metaItem}>
                  <Ionicons name="calendar-outline" size={14} color="#6b7280" />
                  <Text style={styles.metaText}>{formatDate(meeting.created_at)}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={14} color="#6b7280" />
                  <Text style={styles.metaText}>
                    {formatDuration(meeting.duration_seconds)}
                  </Text>
                </View>
                {meeting.output_language && (
                  <View style={styles.metaItem}>
                    <Ionicons name="globe-outline" size={14} color="#6b7280" />
                    <Text style={styles.metaText}>{meeting.output_language.toUpperCase()}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })
      )}
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
    paddingBottom: 32,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  header: {
    marginBottom: 16,
  },
  greeting: {
    fontSize: 14,
    color: '#6b7280',
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 2,
  },
  startMeetingCard: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    padding: 18,
    marginBottom: 20,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  startMeetingContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  startMeetingIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  startMeetingTextContainer: {
    flex: 1,
  },
  startMeetingTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
  },
  startMeetingSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 8,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  metricLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  seeAllText: {
    fontSize: 13,
    color: '#2563eb',
    fontWeight: '500',
  },
  meetingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  meetingCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  meetingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    marginRight: 8,
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
  meetingMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  emptyState: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginTop: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 4,
  },
});
