import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { meetingsApi, type Meeting } from '../../lib/api';
import { useTheme, makeStyles, type Colors } from '../../theme';

export default function SearchScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (textToSearch?: string) => {
    const q = typeof textToSearch === 'string' ? textToSearch : query;
    if (!q.trim()) return;

    setLoading(true);
    setSearched(true);
    try {
      const res = await meetingsApi.search(q.trim());
      setResults(res.data || []);
    } catch (err: any) {
      console.warn('Search failed:', err?.message || err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setSearched(false);
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

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0 min';
    const mins = Math.floor(seconds / 60);
    return mins > 0 ? `${mins} min` : '< 1 min';
  };

  const renderResultItem = ({ item }: { item: Meeting }) => {
    return (
      <TouchableOpacity
        style={styles.resultCard}
        onPress={() => router.push(`/meetings/${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.resultHeader}>
          <Text style={styles.resultTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
          </View>
        </View>
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
            <Text style={styles.metaText}>{formatDate(item.created_at)}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={14} color={colors.textMuted} />
            <Text style={styles.metaText}>{formatDuration(item.duration_seconds)}</Text>
          </View>
          {item.meeting_type && (
            <View style={styles.metaItem}>
              <Ionicons name="pricetag-outline" size={14} color={colors.textMuted} />
              <Text style={styles.metaText}>{item.meeting_type}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchBarContainer}>
        <Ionicons name="search" size={20} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search transcripts, summaries, topics..."
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={(text) => {
            setQuery(text);
            if (!text.trim()) {
              setResults([]);
              setSearched(false);
            }
          }}
          onSubmitEditing={() => handleSearch()}
          returnKeyType="search"
          autoFocus={false}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Searching meetings...</Text>
        </View>
      ) : searched && results.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No matching meetings found</Text>
          <Text style={styles.emptySubtitle}>
            Try searching for different keywords or check spelling.
          </Text>
        </View>
      ) : !searched ? (
        <View style={styles.promptContainer}>
          <Ionicons name="search" size={40} color={colors.textMuted} />
          <Text style={styles.promptTitle}>Search your meeting knowledge</Text>
          <Text style={styles.promptSubtitle}>
            Find specific topics, speaker statements, decisions, and action items across all your recorded meetings.
          </Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={renderResultItem}
          contentContainerStyle={styles.resultsList}
        />
      )}
    </View>
  );
}

const createStyles = makeStyles((colors: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    searchBarContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      margin: 16,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchIcon: {
      marginRight: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      color: colors.text,
    },
    clearButton: {
      padding: 4,
    },
    centerContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 10,
      fontSize: 14,
      color: colors.textMuted,
    },
    resultsList: {
      paddingHorizontal: 16,
      paddingBottom: 24,
    },
    resultCard: {
      backgroundColor: colors.card,
      borderRadius: 10,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    resultHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    resultTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
      flex: 1,
      marginRight: 8,
    },
    statusBadge: {
      backgroundColor: colors.neutralSoft,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 12,
    },
    statusText: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.textMuted,
    },
    metaRow: {
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
      color: colors.textMuted,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginTop: 12,
    },
    emptySubtitle: {
      fontSize: 13,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: 4,
    },
    promptContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
    },
    promptTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginTop: 12,
    },
    promptSubtitle: {
      fontSize: 13,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: 6,
      lineHeight: 18,
    },
  }),
);
