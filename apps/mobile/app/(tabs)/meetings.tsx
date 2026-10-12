import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type Colors } from '../../theme';
import { meetingsApi, type Meeting } from '../../lib/api';

type StatusFilter = 'all' | 'completed' | 'processing' | 'draft';

export default function MeetingsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadMeetings = useCallback(async () => {
    try {
      const res = await meetingsApi.list();
      setMeetings(res.data || []);
    } catch (err: any) {
      console.warn('Failed to load meetings:', err?.message || err);
      setMeetings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadMeetings();
  }, [loadMeetings]);

  const onRefresh = () => {
    setRefreshing(true);
    loadMeetings();
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
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusColor = (status: Meeting['status']) => {
    switch (status) {
      case 'completed':
        return { bg: colors.successSoft, text: colors.success, label: 'Completed' };
      case 'processing':
        return { bg: colors.warningSoft, text: colors.warning, label: 'Processing' };
      case 'recording':
        return { bg: colors.dangerSoft, text: colors.danger, label: 'Recording' };
      default:
        return { bg: colors.neutralSoft, text: colors.textMuted, label: 'Draft' };
    }
  };

  const filteredMeetings = meetings.filter((meeting) => {
    const matchesFilter =
      activeFilter === 'all'
        ? true
        : activeFilter === 'draft'
        ? meeting.status === 'draft' || meeting.status === 'failed'
        : meeting.status === activeFilter;

    const matchesSearch =
      !searchQuery.trim() ||
      meeting.title.toLowerCase().includes(searchQuery.toLowerCase().trim());

    return matchesFilter && matchesSearch;
  });

  const renderFilterButton = (filter: StatusFilter, label: string) => {
    const isActive = activeFilter === filter;
    return (
      <TouchableOpacity
        style={[styles.filterChip, isActive && styles.filterChipActive]}
        onPress={() => setActiveFilter(filter)}
      >
        <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  const renderMeetingCard = ({ item }: { item: Meeting }) => {
    const status = getStatusColor(item.status);
    return (
      <TouchableOpacity
        style={styles.meetingCard}
        onPress={() => router.push(`/meetings/${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.meetingCardHeader}>
          <Text style={styles.meetingTitle} numberOfLines={1}>{item.title}</Text>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.text }]}>{status.label}</Text>
          </View>
        </View>
        <View style={styles.meetingMetaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
            <Text style={styles.metaText}>{formatDate(item.created_at)}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={14} color={colors.textMuted} />
            <Text style={styles.metaText}>{formatDuration(item.duration_seconds)}</Text>
          </View>
          {item.output_language && (
            <View style={styles.metaItem}>
              <Ionicons name="globe-outline" size={14} color={colors.textMuted} />
              <Text style={styles.metaText}>{item.output_language.toUpperCase()}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchBarContainer}>
        <Ionicons name="search" size={18} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Filter meetings by title..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filterRow}>
        {renderFilterButton('all', 'All')}
        {renderFilterButton('completed', 'Completed')}
        {renderFilterButton('processing', 'Processing')}
        {renderFilterButton('draft', 'Drafts')}
      </View>

      <FlatList
        data={filteredMeetings}
        keyExtractor={(item) => item.id}
        renderItem={renderMeetingCard}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No meetings found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery ? 'Try adjusting your search query or filter.' : 'Tap below to create a new meeting.'}
            </Text>
            <TouchableOpacity style={styles.createButton} onPress={() => router.push('/meetings/new')}>
              <Text style={styles.createButtonText}>Create New Meeting</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const createStyles = (c: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: c.background },
    searchBarContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.card,
      marginHorizontal: 16,
      marginTop: 12,
      marginBottom: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.border,
    },
    searchIcon: { marginRight: 8 },
    searchInput: { flex: 1, fontSize: 14, color: c.text },
    filterRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
    filterChip: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
    },
    filterChipActive: { backgroundColor: c.primary, borderColor: c.primary },
    filterChipText: { fontSize: 13, color: c.textMuted, fontWeight: '500' },
    filterChipTextActive: { color: '#ffffff' },
    listContent: { padding: 16, paddingTop: 8 },
    meetingCard: {
      backgroundColor: c.card,
      borderRadius: 10,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: c.border,
    },
    meetingCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    meetingTitle: { fontSize: 15, fontWeight: '600', color: c.text, flex: 1, marginRight: 8 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
    statusText: { fontSize: 11, fontWeight: '600' },
    meetingMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { fontSize: 12, color: c.textMuted },
    emptyContainer: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
    emptyTitle: { fontSize: 16, fontWeight: '600', color: c.text, marginTop: 12 },
    emptySubtitle: { fontSize: 13, color: c.textMuted, textAlign: 'center', marginTop: 4, marginBottom: 20 },
    createButton: { backgroundColor: c.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
    createButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  });
