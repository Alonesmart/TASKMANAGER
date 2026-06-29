import { SimpleDatePicker } from '@/components/SimpleDatePicker';
import { projectService } from '@/services/projectService';
import { userService } from '@/services/userService';
import { useAppTheme } from "@/theme";
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from "react-i18next";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";

// ─── NOUVELLE TÂCHE ────────────────────────────────────────────────────────────
export default function NouvelleTacheScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    tacheMode?: string;
    tacheId?: string;
    tacheTitre?: string;
    tacheDescription?: string;
    tacheProjet?: string;
    tacheAssignes?: string;
    tachePriorite?: string;
    tacheStatut?: string;
    tacheDateDebut?: string;
    tacheDateFin?: string;
  }>();
  const { t } = useTranslation();
  const { theme, isDark } = useAppTheme();
  const COLORS = useMemo(
    () => ({
      bg: theme.bg,
      surface: theme.cardBg,
      card: theme.cardBg,
      border: theme.border,
      accent: theme.accent,
      text: theme.textPrimary,
      textMuted: theme.textSecondary,
      textDim: theme.textSecondary,
      success: '#4caf50',
      warning: '#f5a623',
      danger: '#e53935',
    }),
    [theme]
  );
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  const parseDate = (raw?: string) => {
    if (!raw) return null;
    const match = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return null;
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    const date = new Date(year, month - 1, day);
    return Number.isNaN(date.getTime()) ? null : date;
  };
  const isEditMode = params.tacheMode === 'edit';
  const initialPriorite: 'faible' | 'moyenne' | 'haute' =
    params.tachePriorite === 'moyenne' || params.tachePriorite === 'haute' || params.tachePriorite === 'faible'
      ? params.tachePriorite
      : 'faible';

  const [titre, setTitre]             = useState(params.tacheTitre ?? '');
  const [description, setDescription] = useState(params.tacheDescription ?? '');
  const [priorite, setPriorite]       = useState<'faible' | 'moyenne' | 'haute'>(initialPriorite);
  const [dateDebut, setDateDebut]     = useState<Date | null>(parseDate(params.tacheDateDebut));
  const [dateFin, setDateFin]         = useState<Date | null>(parseDate(params.tacheDateFin));
  const [idProjet, setIdProjet]       = useState<number | null>(params.tacheProjet ? Number(params.tacheProjet) : null);
  const [assignes, setAssignes]       = useState<number[]>(
    params.tacheAssignes ? params.tacheAssignes.split(',').map(Number).filter(Boolean) : []
  );

  const [projets, setProjets] = useState<{id_projet: number, titre: string}[]>([]);
  const [loadingProjets, setLoadingProjets] = useState(true);
  const [saving, setSaving] = useState(false);
  const [membres, setMembres] = useState<{id: number, nom: string}[]>([]);

  const fetchUsers = useCallback(async () => {
    try {
      const data = await userService.getUsers();
      setMembres(data);
    } catch (error) {
      console.error('Error fetching users for tasks:', error);
    }
  }, []);

  const fetchProjets = useCallback(async () => {
    setLoadingProjets(true);
    try {
      const data = await projectService.getProjects();
      setProjets(data);
      setIdProjet(currentId => currentId ?? data[0]?.id_projet ?? null);
    } catch (error) {
      console.error('Error fetching projects for task:', error);
    } finally {
      setLoadingProjets(false);
    }
  }, []);

  useEffect(() => {
    fetchProjets();
    fetchUsers();
  }, [fetchProjets, fetchUsers]);

  const priorites: { key: 'faible' | 'moyenne' | 'haute'; label: string; bg: string }[] = [
    { key: 'faible',  label: t("tasks.priority_low"),  bg: COLORS.success },
    { key: 'moyenne', label: t("tasks.priority_medium"), bg: COLORS.warning },
    { key: 'haute',   label: t("tasks.priority_high"),   bg: COLORS.danger  },
  ];

  const toggleAssigne = (id: number) =>
    setAssignes(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const formatDateForAPI = (d: Date | null) => {
    if (!d) return null;
    return d.toISOString().split('T')[0];
  };

  // ── Sauvegarder → API call ──────────────────────────────────────────────
  const handleSauvegarder = async () => {
    if (!titre.trim()) { Alert.alert(t("common.error"), t("new_tasks.title_required")); return; }
    if (!idProjet) { Alert.alert(t("common.error"), "Veuillez sélectionner un projet"); return; }

    setSaving(true);
    try {
      const commonData = {
        titre: titre.trim(),
        description: description.trim() || null,
        priorite: priorite,
        echeance: formatDateForAPI(dateFin),
        assigned_user_ids: assignes,
      };

      if (isEditMode && params.tacheId) {
        // Mode édition : envoyer seulement les champs modifiables (exclure id_projet)
        const updateData = {
          ...commonData,
          statut: params.tacheStatut ?? 'a_faire',
        };
        await projectService.updateTask(Number(params.tacheId), updateData);
      } else {
        // Mode création : envoyer tous les champs requis
        const taskData = {
          ...commonData,
          statut: 'a_faire',
          id_projet: idProjet,
          progression: 0,
        };
        await projectService.createTask(taskData);
      }

      Alert.alert(t("common.success"), isEditMode ? "Tâche mise à jour" : "Tâche créée");
      router.back();
    } catch (error: any) {
      console.error('Error saving task:', error);
      Alert.alert(t("common.error"), error.response?.data?.detail || t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{isEditMode ? t("common.edit") : t("new_tasks.title")}</Text>
        <TouchableOpacity 
          style={[styles.saveBtn, saving && { opacity: 0.7 }]} 
          onPress={handleSauvegarder} 
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveTxt}>{t("common.save")}</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>

        {/* Titre */}
        <Text style={styles.label}>{t("new_tasks.title_label")}</Text>
        <TextInput
          style={styles.input}
          placeholder={t("new_tasks.title_placeholder")}
          placeholderTextColor={COLORS.textDim}
          value={titre}
          onChangeText={setTitre}
        />

        {/* Description */}
        <Text style={styles.label}>{t("new_tasks.description_label")}</Text>
        <TextInput
          style={[styles.input, styles.inputArea]}
          placeholder={t("new_tasks.description_placeholder")}
          placeholderTextColor={COLORS.textDim}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          value={description}
          onChangeText={setDescription}
        />

        {/* Projet */}
        <Text style={styles.label}>{t("new_tasks.project_label")}</Text>
        {loadingProjets ? (
          <ActivityIndicator size="small" color={COLORS.accent} style={{ alignSelf: 'flex-start', marginBottom: 20 }} />
        ) : projets.length === 0 ? (
          <Text style={[styles.label, { color: COLORS.danger, marginBottom: 20 }]}>Aucun projet disponible. Créez d&apos;abord un projet.</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
            {projets.map((p) => (
              <TouchableOpacity
                key={p.id_projet}
                style={[styles.chip, idProjet === p.id_projet && styles.chipActive]}
                onPress={() => setIdProjet(p.id_projet)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipTxt, idProjet === p.id_projet && styles.chipTxtActive]}>{p.titre}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Assigné à */}
        <Text style={styles.label}>{t("new_tasks.assigned_to_label")}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
          {membres.map((user) => (
            <TouchableOpacity
              key={user.id}
              style={[styles.chip, assignes.includes(user.id) && styles.chipActive]}
              onPress={() => toggleAssigne(user.id)}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipTxt, assignes.includes(user.id) && styles.chipTxtActive]}>{user.nom}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Priorité */}
        <Text style={styles.label}>{t("new_tasks.priority_label")}</Text>
        <View style={styles.prioriteRow}>
          {priorites.map((p) => (
            <TouchableOpacity
              key={p.key}
              style={[
                styles.prioriteChip,
                priorite === p.key
                  ? { backgroundColor: p.bg, borderColor: p.bg }
                  : { backgroundColor: COLORS.card, borderColor: p.bg },
              ]}
              onPress={() => setPriorite(p.key)}
              activeOpacity={0.8}
            >
              <Text style={[styles.prioriteTxt, priorite !== p.key && { color: COLORS.textMuted }]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Dates */}
        <View style={styles.datesRow}>
          <View style={styles.dateCol}>
            <Text style={styles.label}>{t("new_tasks.start_date_label")}</Text>
            <SimpleDatePicker label={t("new_tasks.start_date_label")} value={dateDebut} onChange={setDateDebut} />
          </View>
          <View style={styles.dateCol}>
            <Text style={styles.label}>{t("new_tasks.end_date_label")}</Text>
            <SimpleDatePicker label={t("new_tasks.end_date_label")} value={dateFin} onChange={setDateFin} />
          </View>
        </View>

        <View style={{ height: 50 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const createStyles = (COLORS: {
  bg: string;
  surface: string;
  card: string;
  border: string;
  accent: string;
  text: string;
  textMuted: string;
  textDim: string;
}) =>
StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bg },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: { padding: 4, width: 36 },
  title:   { fontSize: 17, fontWeight: '700', color: COLORS.text, flex: 1, textAlign: 'center' },
  saveBtn: { backgroundColor: COLORS.accent, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  saveTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },

  body:  { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  label: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600', marginBottom: 8 },

  input: {
    backgroundColor: COLORS.card, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 13,
    color: COLORS.text, fontSize: 14, marginBottom: 20,
    borderWidth: 1, borderColor: COLORS.border,
  },
  inputArea: { minHeight: 110, paddingTop: 13 },

  chipsScroll: { marginBottom: 20 },
  chip: {
    paddingHorizontal: 18, paddingVertical: 9, borderRadius: 20, marginRight: 8,
    backgroundColor: COLORS.card, borderWidth: 1.5, borderColor: COLORS.border,
  },
  chipActive:   { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  chipTxt:      { color: COLORS.textMuted, fontSize: 14, fontWeight: '600' },
  chipTxtActive:{ color: '#fff' },

  prioriteRow:  { flexDirection: 'row', gap: 10, marginBottom: 22 },
  prioriteChip: { flex: 1, paddingVertical: 10, borderRadius: 20, alignItems: 'center', borderWidth: 1.5 },
  prioriteTxt:  { fontSize: 14, fontWeight: '700', color: '#fff' },

  datesRow: { flexDirection: 'row', gap: 14 },
  dateCol:  { flex: 1 },
});
