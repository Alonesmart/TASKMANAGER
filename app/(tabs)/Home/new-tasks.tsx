import { projectService } from '@/services/projectService';
import { userService } from '@/services/userService';
import { useAppTheme } from "@/theme";
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";

type SimpleDatePickerProps = {
  label: string;
  value: Date | null;
  onChange: (date: any) => void;
  styles: any;
  colors: any;
  t: (key: string, options?: any) => any;
};

// ─── SIMPLE DATE PICKER ────────────────────────────────────────────────────────
const SimpleDatePicker = ({ label, value, onChange, styles, colors, t }: SimpleDatePickerProps) => {
  const [show, setShow]   = useState(false);
  const today             = new Date();
  const [year, setYear]   = useState(value ? value.getFullYear() : today.getFullYear());
  const [month, setMonth] = useState(value ? value.getMonth()    : today.getMonth());
  const [day, setDay]     = useState(value ? value.getDate()     : today.getDate());

  const translatedMonths = t("date.months_short", { returnObjects: true });
  const monthNames = Array.isArray(translatedMonths) && translatedMonths.length === 12
    ? translatedMonths
    : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const confirm = () => { onChange(new Date(year, month, day)); setShow(false); };

  const fmt = (d: Date | null) =>
    d ? `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
      : t("date.select");

  return (
    <>
      <TouchableOpacity style={styles.dateBtn} onPress={() => setShow(true)} activeOpacity={0.8}>
        <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
        <Text style={[styles.dateBtnText, !value && { color: colors.textDim }]}>{fmt(value)}</Text>
      </TouchableOpacity>

      <Modal visible={show} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.dateModal}>
            <Text style={styles.dateModalTitle}>{label}</Text>

            <Text style={styles.dpLabel}>{t("date.month")}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {monthNames.map((m, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.dpChip, month === i && styles.dpChipActive]}
                  onPress={() => { setMonth(i); if (day > new Date(year, i+1, 0).getDate()) setDay(1); }}
                >
                  <Text style={[styles.dpChipText, month === i && styles.dpChipTextActive]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.dpLabel}>{t("date.day")}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[styles.dpChip, styles.dpChipSm, day === d && styles.dpChipActive]}
                  onPress={() => setDay(d)}
                >
                  <Text style={[styles.dpChipText, day === d && styles.dpChipTextActive]}>
                    {String(d).padStart(2,'0')}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.dpLabel}>{t("date.year")}</Text>
            <View style={styles.yearRow}>
              <TouchableOpacity onPress={() => setYear(y => y-1)} style={styles.yearBtn}>
                <Text style={styles.yearBtnText}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.yearValue}>{year}</Text>
              <TouchableOpacity onPress={() => setYear(y => y+1)} style={styles.yearBtn}>
                <Text style={styles.yearBtnText}>›</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShow(false)} style={styles.modalCancel}>
                <Text style={styles.modalCancelText}>{t("date.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirm} style={styles.modalConfirm}>
                <Text style={styles.modalConfirmText}>{t("date.confirm")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

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
  const [assignes, setAssignes]       = useState<string[]>(
    params.tacheAssignes ? params.tacheAssignes.split(',').filter(Boolean) : []
  );

  const [projets, setProjets] = useState<{id_projet: number, titre: string}[]>([]);
  const [loadingProjets, setLoadingProjets] = useState(true);
  const [saving, setSaving] = useState(false);
  const [membres, setMembres] = useState<{id: number, nom: string}[]>([]);

  useEffect(() => {
    fetchProjets();
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const data = await userService.getUsers();
      setMembres(data);
    } catch (error) {
      console.error('Error fetching users for tasks:', error);
    }
  };

  const fetchProjets = async () => {
    setLoadingProjets(true);
    try {
      const data = await projectService.getProjects();
      setProjets(data);
      if (data.length > 0 && !idProjet) {
        setIdProjet(data[0].id_projet);
      }
    } catch (error) {
      console.error('Error fetching projects for task:', error);
    } finally {
      setLoadingProjets(false);
    }
  };

  const priorites: { key: 'faible' | 'moyenne' | 'haute'; label: string; bg: string }[] = [
    { key: 'faible',  label: t("tasks.priority_low"),  bg: COLORS.success },
    { key: 'moyenne', label: t("tasks.priority_medium"), bg: COLORS.warning },
    { key: 'haute',   label: t("tasks.priority_high"),   bg: COLORS.danger  },
  ];

  const toggleAssigne = (name: string) =>
    setAssignes(prev => prev.includes(name) ? prev.filter(x => x !== name) : [...prev, name]);

  const fmtDate = (d: Date | null) =>
    d ? `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}` : '';

  const formatDateForAPI = (d: Date | null) => {
    if (!d) return null;
    return d.toISOString().split('T')[0];
  };

  const mapStatutToStatus = (s: string) => {
    switch (s) {
      case 'a_faire': return 'todo';
      case 'en_cours': return 'in_progress';
      case 'terminees': return 'completed';
      default: return 'todo';
    }
  };

  // ── Sauvegarder → API call ──────────────────────────────────────────────
  const handleSauvegarder = async () => {
    if (!titre.trim()) { Alert.alert(t("common.error"), t("new_tasks.title_required")); return; }
    if (!idProjet) { Alert.alert(t("common.error"), "Veuillez sélectionner un projet"); return; }

    setSaving(true);
    try {
      const currentStatut = isEditMode ? (params.tacheStatut ?? 'a_faire') : 'a_faire';
      const taskData = {
        titre: titre.trim(),
        description: description.trim(),
        priorite: priorite,
        statut: currentStatut,
        status: mapStatutToStatus(currentStatut),
        echeance: formatDateForAPI(dateFin),
        id_projet: idProjet,
        progression: isEditMode ? 0 : 0, // Placeholder
      };

      if (isEditMode && params.tacheId) {
        await projectService.updateTask(Number(params.tacheId), taskData);
      } else {
        await projectService.createTask(taskData);
      }

      Alert.alert(t("common.success"), isEditMode ? "Tâche mise à jour" : "Tâche créée");
      router.back();
    } catch (error: any) {
      console.error('Error saving task:', error);
      Alert.alert(t("common.error"), error.response?.data?.detail || "Erreur lors de la sauvegarde");
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
          <Text style={[styles.label, { color: COLORS.danger, marginBottom: 20 }]}>Aucun projet disponible. Créez d'abord un projet.</Text>
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
              style={[styles.chip, assignes.includes(user.nom) && styles.chipActive]}
              onPress={() => toggleAssigne(user.nom)}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipTxt, assignes.includes(user.nom) && styles.chipTxtActive]}>{user.nom}</Text>
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
            <SimpleDatePicker label={t("new_tasks.start_date_label")} value={dateDebut} onChange={setDateDebut} styles={styles} colors={COLORS} t={t} />
          </View>
          <View style={styles.dateCol}>
            <Text style={styles.label}>{t("new_tasks.end_date_label")}</Text>
            <SimpleDatePicker label={t("new_tasks.end_date_label")} value={dateFin} onChange={setDateFin} styles={styles} colors={COLORS} t={t} />
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
  dateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.card, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 12,
    borderWidth: 1, borderColor: COLORS.border,
  },
  dateBtnText: { color: COLORS.text, fontSize: 13, flex: 1 },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center', alignItems: 'center', padding: 20,
  },
  dateModal: {
    backgroundColor: COLORS.surface, borderRadius: 16, padding: 20,
    width: '100%', borderWidth: 1, borderColor: COLORS.border,
  },
  dateModalTitle: { color: COLORS.text, fontWeight: '700', fontSize: 16, marginBottom: 16 },
  dpLabel:        { color: COLORS.textMuted, fontSize: 12, fontWeight: '600', marginBottom: 6 },
  dpChip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10,
    backgroundColor: COLORS.card, marginRight: 6,
    borderWidth: 1, borderColor: COLORS.border,
  },
  dpChipSm:       { paddingHorizontal: 9 },
  dpChipActive:   { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  dpChipText:     { color: COLORS.textMuted, fontSize: 13 },
  dpChipTextActive: { color: '#fff', fontWeight: '700' },
  yearRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 20, marginBottom: 20,
  },
  yearBtn:     { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.card, justifyContent: 'center', alignItems: 'center' },
  yearBtnText: { color: COLORS.text, fontSize: 22, fontWeight: '300' },
  yearValue:   { color: COLORS.text, fontSize: 18, fontWeight: '700', minWidth: 60, textAlign: 'center' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  modalCancel:  { flex: 1, paddingVertical: 11, borderRadius: 10, backgroundColor: COLORS.card, alignItems: 'center' },
  modalCancelText:  { color: COLORS.textMuted, fontWeight: '600' },
  modalConfirm:     { flex: 1, paddingVertical: 11, borderRadius: 10, backgroundColor: COLORS.accent, alignItems: 'center' },
  modalConfirmText: { color: '#fff', fontWeight: '700' },
});
