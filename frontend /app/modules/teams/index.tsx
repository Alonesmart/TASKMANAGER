import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { teamService } from '@/services/teamService';
import { userService, type User } from '@/services/userService';
import { useAppTheme } from '@/theme';

interface TeamMembersProps {
  idEquipe: number;
  onBack?: () => void;
}

interface MemberItemProps {
  user: User;
  onRemove: (userId: number) => void;
  colors: any;
}

const MemberItem = ({ user, onRemove, colors }: MemberItemProps) => {
  return (
    <View style={[styles.memberItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.userInfo}>
        <View style={[styles.avatar, { backgroundColor: colors.accent + '22' }]}>
          <Text style={{ color: colors.accent, fontWeight: 'bold' }}>
            {user.nom.substring(0, 2).toUpperCase()}
          </Text>
        </View>
        <View>
          <Text style={[styles.memberName, { color: colors.text }]}>{user.nom}</Text>
          <Text style={[styles.userRole, { color: colors.textMuted }]}>{user.role}</Text>
        </View>
      </View>
      <TouchableOpacity 
        onPress={() => onRemove(user.id)}
        style={[styles.removeButton, { backgroundColor: colors.danger + '22' }]}
      >
        <Ionicons name="trash-outline" size={20} color={colors.danger} />
      </TouchableOpacity>
    </View>
  );
};

export const TeamMembers = ({ idEquipe, onBack }: TeamMembersProps) => {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const colors = {
    bg: theme.bg,
    surface: theme.cardBg,
    card: theme.cardBg,
    border: theme.border,
    accent: theme.accent,
    text: theme.textPrimary,
    textMuted: theme.textSecondary,
    textDim: theme.textMuted,
    success: theme.success,
    warning: theme.warning,
    danger: theme.danger,
    pause: theme.pause,
  };

  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [newMemberId, setNewMemberId] = useState('');

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const data = await teamService.getTeamMembers(idEquipe);
      setMembers(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des membres');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [idEquipe]);

  const handleRemoveMember = async (userId: number) => {
    Alert.alert(
      t('teams.remove_title'),
      t('teams.remove_confirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          style: 'destructive',
          onPress: async () => {
            try {
              await teamService.removeMember(idEquipe, userId);
              await fetchMembers();
            } catch (err: any) {
              Alert.alert(t('common.error'), err.message);
            }
          },
        },
      ]
    );
  };

  const handleAddMember = async () => {
    const id = parseInt(newMemberId);
    if (isNaN(id)) {
      Alert.alert(t('common.error'), t('teams.invalid_id'));
      return;
    }

    try {
      await teamService.addMember(idEquipe, id);
      setNewMemberId('');
      setIsAddingMember(false);
      await fetchMembers();
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message);
    }
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.bg }]}>
        <Text style={{ color: colors.danger, marginBottom: 20 }}>{error}</Text>
        <TouchableOpacity onPress={fetchMembers} style={[styles.retryButton, { backgroundColor: colors.accent }]}>
          <Text style={{ color: colors.bg }}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        )}
        <Text style={[styles.title, { color: colors.text }]}>{t('teams.members_title')}</Text>
        <TouchableOpacity 
          onPress={() => setIsAddingMember(true)}
          style={[styles.addButton, { backgroundColor: colors.accent }]}
        >
          <Ionicons name="person-add" size={20} color="white" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={members}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <MemberItem user={item} onRemove={handleRemoveMember} colors={colors} />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color={colors.textMuted} />
            <Text style={{ color: colors.textMuted, marginTop: 10 }}>{t('teams.no_members')}</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />

      <Modal
        visible={isAddingMember}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsAddingMember(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('teams.add_member')}</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholder="ID de l'utilisateur"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={newMemberId}
              onChangeText={setNewMemberId}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity 
                onPress={() => setIsAddingMember(false)}
                style={[styles.modalButton, { borderColor: colors.border }]}
              >
                <Text style={{ color: colors.text }}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handleAddMember}
                style={[styles.modalButton, { backgroundColor: colors.accent }]}
              >
                <Text style={{ color: 'white' }}>{t('common.confirm')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  addButton: {
    padding: 8,
    borderRadius: 20,
  },
  listContent: {
    padding: 20,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
  },
  userRole: {
    fontSize: 13,
  },
  removeButton: {
    padding: 8,
    borderRadius: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 50,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    padding: 20,
    borderRadius: 15,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
});

export default TeamMembers;
