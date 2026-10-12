import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { organizationsApi } from '../../lib/api';
import { useTheme, makeStyles, type Colors } from '../../theme';

export default function OrganizationsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [orgSlug, setOrgSlug] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    try {
      const res = await organizationsApi.list();
      setOrganizations(res.data || []);
    } catch (err: any) {
      console.warn('Failed to load organizations:', err?.message || err);
      setOrganizations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!orgName.trim() || !orgSlug.trim()) {
      Alert.alert('Error', 'Name and slug are required');
      return;
    }

    setCreating(true);
    try {
      const res = await organizationsApi.create({
        name: orgName.trim(),
        slug: orgSlug.trim().toLowerCase().replace(/\s+/g, '-'),
      });
      setOrganizations([...organizations, res.data]);
      setShowCreateModal(false);
      setOrgName('');
      setOrgSlug('');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to create organization');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Teams</Text>
        <Text style={styles.subtitle}>Manage your organizations and team members</Text>
      </View>

      <TouchableOpacity
        style={styles.createButton}
        onPress={() => setShowCreateModal(true)}
      >
        <Ionicons name="add-circle-outline" size={20} color={colors.onPrimary} />
        <Text style={styles.createButtonText}>Create Team</Text>
      </TouchableOpacity>

      {organizations.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="business-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No teams yet</Text>
          <Text style={styles.emptySubtitle}>
            Create your first team to collaborate with others
          </Text>
        </View>
      ) : (
        organizations.map((org) => (
          <View key={org.id} style={styles.orgCard}>
            <View style={styles.orgHeader}>
              <View style={styles.orgIcon}>
                <Ionicons name="business" size={24} color={colors.primary} />
              </View>
              <View style={styles.orgInfo}>
                <Text style={styles.orgName}>{org.name}</Text>
                <Text style={styles.orgSlug}>{org.slug}</Text>
              </View>
            </View>
            <View style={styles.orgActions}>
              <TouchableOpacity style={styles.actionButton}>
                <Text style={styles.actionButtonText}>Manage</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionButton, styles.actionButtonSecondary]}>
                <Text style={styles.actionButtonText}>Members</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}

      {showCreateModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Team</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Team Name</Text>
              <TextInput
                style={styles.input}
                value={orgName}
                onChangeText={setOrgName}
                placeholder="e.g., Engineering Team"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Team Slug</Text>
              <TextInput
                style={styles.input}
                value={orgSlug}
                onChangeText={setOrgSlug}
                placeholder="e.g., engineering-team"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity
              style={styles.createModalButton}
              onPress={handleCreate}
              disabled={creating}
            >
              {creating ? (
                <ActivityIndicator color={colors.onPrimary} size="small" />
              ) : (
                <Text style={styles.createModalButtonText}>Create Team</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const createStyles = makeStyles((colors: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    contentContainer: {
      padding: 16,
      paddingBottom: 40,
    },
    centerContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    header: {
      marginBottom: 20,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.text,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textMuted,
      marginTop: 4,
    },
    createButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      paddingVertical: 14,
      borderRadius: 10,
      marginBottom: 20,
      gap: 8,
    },
    createButtonText: {
      color: colors.onPrimary,
      fontSize: 16,
      fontWeight: '600',
    },
    emptyState: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 32,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
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
    orgCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 12,
    },
    orgHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    orgIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.primarySoft,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    orgInfo: {
      flex: 1,
    },
    orgName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    orgSlug: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    orgActions: {
      flexDirection: 'row',
      gap: 8,
    },
    actionButton: {
      flex: 1,
      backgroundColor: colors.neutralSoft,
      paddingVertical: 10,
      borderRadius: 8,
      alignItems: 'center',
    },
    actionButtonSecondary: {
      backgroundColor: colors.primarySoft,
    },
    actionButtonText: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.text,
    },
    modalOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalContent: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 20,
      width: '100%',
      maxWidth: 320,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    formGroup: {
      marginBottom: 16,
    },
    label: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.text,
      marginBottom: 6,
    },
    input: {
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: colors.text,
    },
    createModalButton: {
      backgroundColor: colors.primary,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
    },
    createModalButtonText: {
      color: colors.onPrimary,
      fontSize: 16,
      fontWeight: '600',
    },
  }),
);
