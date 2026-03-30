import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StatusBar,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useRouter } from 'expo-router';
import { useTranslation } from "react-i18next";

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
  const [show, setShow] = useState(false);
  const today = new Date();
  const [year, setYear]   = useState(value ? value.getFullYear() : today.getFullYear());
  const [month, setMonth] = useState(value ? value.getMonth()    : today.getMonth());
  const [day, setDay]     = useState(value ? value.getDate()     : today.getDate());

  const translatedMonths = t("date.months_short", { returnObjects: true });
  const monthNames = Array.isArray(translatedMonths) && translatedMonths.length === 12
    ? translatedMonths
    : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const confirm = () => {
    onChange(new Date(year, month, day));
    setShow(false);
  };

  const formatDate = (d: Date | null) =>
    d
      ? `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
      : t("date.select");

  return (
    <>
      <TouchableOpacity style={styles.dateBtn} onPress={() => setShow(true)} activeOpacity={0.8}>
        <Text style={styles.dateBtnIcon}>📅</Text>
        <Text style={[styles.dateBtnText, !value && { color: colors.textDim }]}>
          {formatDate(value)}
        </Text>
      </TouchableOpacity>

      <Modal visible={show} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.dateModal}>
            <Text style={styles.dateModalTitle}>{label}</Text>

            <Text style={styles.datePickerLabel}>{t("date.month")}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {monthNames.map((m, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.dateChip, month === i && styles.dateChipActive]}
                  onPress={() => {
                    setMonth(i);
                    if (day > new Date(year, i + 1, 0).getDate()) setDay(1);
                  }}
                >
                  <Text style={[styles.dateChipText, month === i && styles.dateChipTextActive]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.datePickerLabel}>{t("date.day")}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[styles.dateChip, styles.dateChipSmall, day === d && styles.dateChipActive]}
                  onPress={() => setDay(d)}
                >
                  <Text style={[styles.dateChipText, day === d && styles.dateChipTextActive]}>
                    {String(d).padStart(2, '0')}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.datePickerLabel}>{t("date.year")}</Text>
            <View style={styles.yearRow}>
              <TouchableOpacity onPress={() => setYear((y) => y - 1)} style={styles.yearBtn}>
                <Text style={styles.yearBtnText}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.yearValue}>{year}</Text>
              <TouchableOpacity onPress={() => setYear((y) => y + 1)} style={styles.yearBtn}>
                <Text style={styles.yearBtnText}>›</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.dateModalActions}>
              <TouchableOpacity onPress={() => setShow(false)} style={styles.dateModalCancel}>
                <Text style={styles.dateModalCancelText}>{t("date.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirm} style={styles.dateModalConfirm}>
                <Text style={styles.dateModalConfirmText}>{t("date.confirm")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

// ─── NOUVEAU PROJET SCREEN ─────────────────────────────────────────────────────
export default function NouveauProjetScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const theme = { bg: "#0d1117", cardBg: "#161b22", accent: "#3d8ef8", textPrimary: "#e6edf3", textSecondary: "#7d8590", border: "#21262d", logoutColor: "#f85030" };
  const isDark = true;
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
      warning: '#ff9800',
      danger: '#f44336',
      pause: '#9c27b0',
    }),
    [theme]
  );
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  const [nom, setNom]                 = useState('');
  const [description, setDescription] = useState('');
  const [membres, setMembres]         = useState([]);
  const [dateDebut, setDateDebut]     = useState(null);
  const [dateFin, setDateFin]         = useState(null);
  const [priorite, setPriorite]       = useState(null);
  const [statut, setStatut]           = useState(null);
  const [chef, setChef]               = useState(null);
  const [couleur, setCouleur]         = useState(null);
  const [icone, setIcone]             = useState(null);
  const [chefModal, setChefModal]     = useState(false);

  const priorites = [
    { key: 'haute',   label: t("new_project.priority_high"),   color: COLORS.danger,  icon: '🔴' },
    { key: 'moyenne', label: t("new_project.priority_medium"), color: COLORS.warning, icon: '🟡' },
    { key: 'basse',   label: t("new_project.priority_low"),   color: COLORS.success, icon: '🟢' },
  ];

  const statuts = [
    { key: 'actif',   label: t("new_project.status_active"),    color: COLORS.success, icon: '▶' },
    { key: 'pause',   label: t("new_project.status_paused"), color: COLORS.pause,   icon: '⏸' },
    { key: 'termine', label: t("new_project.status_finished"),  color: COLORS.accent,  icon: '✓' },
  ];

  const chefsList = [
    { id: '1', nom: 'Alice Martin',  initiale: 'A' },
    { id: '2', nom: 'Bob Dupont',    initiale: 'B' },
    { id: '3', nom: 'Claire Durand', initiale: 'C' },
    { id: '4', nom: 'David Leroy',   initiale: 'D' },
  ];

const formatDate = (d?: Date) =>
  d ? `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}` : "";

  // ── Sauvegarder → retour vers ProjetsScreen avec les données en params ──────
  const handleSauvegarder = () => {
    if (!nom.trim()) {
      alert(t("new_project.project_name_required"));
      return;
    }

    router.back();

    // On repasse à la route parente avec les params du nouveau projet
    router.setParams({
      created:            '1',
      key:                Date.now().toString(),
      projectName:        nom.trim(),
      projectDescription: description.trim(),
      projectPriorite:    priorite  ?? '',
      projectStatut:      statut    ?? '',
      projectChef:        chef?.nom ?? '',
      projectDateDebut:   formatDate(dateDebut),
      projectDateFin:     formatDate(dateFin),
      projectCouleur:     couleur   ?? '',
      projectIcone:       icone     ?? '',
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.bg} />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t("new_project.title")}</Text>
        <TouchableOpacity style={styles.sauvegarderButton} onPress={handleSauvegarder} activeOpacity={0.8}>
          <Text style={styles.sauvegarderText}>{t("common.save")}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>

      
        {/* ── Nom du projet ───────────────────────────────────────────────── */}
        <Text style={styles.fieldLabel}>{t("new_project.project_name_label")}</Text>
        <TextInput
          style={styles.textInput}
          placeholder={t("new_project.project_name_placeholder")}
          placeholderTextColor={COLORS.textDim}
          value={nom}
          onChangeText={setNom}
        />

        {/* ── Description ─────────────────────────────────────────────────── */}
        <Text style={styles.fieldLabel}>{t("new_project.description_label")}</Text>
        <TextInput
          style={[styles.textInput, styles.textArea]}
          placeholder={t("new_project.description_placeholder")}
          placeholderTextColor={COLORS.textDim}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          value={description}
          onChangeText={setDescription}
        />

        {/* ── Chef de projet ──────────────────────────────────────────────── */}
        <Text style={styles.fieldLabel}>{t("new_project.project_manager_label")}</Text>
        <TouchableOpacity style={styles.selectBtn} onPress={() => setChefModal(true)} activeOpacity={0.8}>
          {chef ? (
            <View style={styles.chefSelected}>
              <View style={styles.chefAvatar}>
                <Text style={styles.chefAvatarText}>{chef.initiale}</Text>
              </View>
              <Text style={styles.chefName}>{chef.nom}</Text>
            </View>
          ) : (
            <Text style={styles.selectPlaceholder}>{t("new_project.project_manager_select")}</Text>
          )}
          <Text style={styles.selectArrow}>›</Text>
        </TouchableOpacity>

        {/* Chef Modal */}
        <Modal visible={chefModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.listModal}>
              <Text style={styles.listModalTitle}>{t("new_project.project_manager_modal_title")}</Text>
              {chefsList.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.listModalItem, chef?.id === c.id && styles.listModalItemActive]}
                  onPress={() => { setChef(c); setChefModal(false); }}
                >
                  <View style={styles.chefAvatar}>
                    <Text style={styles.chefAvatarText}>{c.initiale}</Text>
                  </View>
                  <Text style={styles.listModalItemText}>{c.nom}</Text>
                  {chef?.id === c.id && <Text style={{ color: COLORS.accent, fontSize: 16 }}>✓</Text>}
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.listModalClose} onPress={() => setChefModal(false)}>
                <Text style={styles.listModalCloseText}>{t("new_project.close")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* ── Priorité ────────────────────────────────────────────────────── */}
        <Text style={styles.fieldLabel}>{t("new_project.priority_label")}</Text>
        <View style={styles.chipRow}>
          {priorites.map((p) => (
            <TouchableOpacity
              key={p.key}
              style={[
                styles.priorityChip,
                { borderColor: p.color },
                priorite === p.key && { backgroundColor: p.color },
              ]}
              onPress={() => setPriorite(p.key)}
              activeOpacity={0.8}
            >
              <Text style={styles.chipIcon}>{p.icon}</Text>
              <Text style={[styles.chipLabel, priorite === p.key && styles.chipLabelActive]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Statut ──────────────────────────────────────────────────────── */}
        <Text style={styles.fieldLabel}>{t("new_project.status_label")}</Text>
        <View style={styles.chipRow}>
          {statuts.map((s) => (
            <TouchableOpacity
              key={s.key}
              style={[
                styles.statutChip,
                { borderColor: s.color },
                statut === s.key && { backgroundColor: s.color },
              ]}
              onPress={() => setStatut(s.key)}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipLabel, statut === s.key && styles.chipLabelActive]}>
                {s.icon}  {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Dates ───────────────────────────────────────────────────────── */}
        <Text style={styles.fieldLabel}>{t("new_project.start_date_label")}</Text>
        <SimpleDatePicker label={t("new_project.start_date_label")} value={dateDebut} onChange={setDateDebut} styles={styles} colors={COLORS} t={t} />

        <Text style={[styles.fieldLabel, { marginTop: 16 }]}>{t("new_project.end_date_label")}</Text>
        <SimpleDatePicker label={t("new_project.end_date_label")} value={dateFin} onChange={setDateFin} styles={styles} colors={COLORS} t={t} />

        {/* ── Membres ─────────────────────────────────────────────────────── */}
        <Text style={[styles.fieldLabel, { marginTop: 16 }]}>
          {t("new_project.team_members_label")} ({membres.length})
        </Text>
        <TouchableOpacity style={styles.addMemberBtn} activeOpacity={0.7}>
          <Text style={styles.addMemberIcon}>+</Text>
          <Text style={styles.addMemberText}>{t("new_project.add_member")}</Text>
        </TouchableOpacity>

        {membres.map((m, i) => (
          <View key={i} style={styles.memberItem}>
            <View style={styles.memberAvatar}>
              <Text style={styles.memberAvatarText}>{m.charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={styles.memberName}>{m}</Text>
            <TouchableOpacity onPress={() => setMembres(membres.filter((_, idx) => idx !== i))}>
              <Text style={styles.memberRemove}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}

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
  success: string;
  warning: string;
  danger: string;
  pause: string;
}) =>
StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bg },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn:           { padding: 4, width: 32 },
  backText:          { fontSize: 28, color: COLORS.text, fontWeight: '300' },
  title:             { fontSize: 17, fontWeight: '700', color: COLORS.text, flex: 1, textAlign: 'center' },
  sauvegarderButton: { backgroundColor: COLORS.accent, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  sauvegarderText:   { color: '#fff', fontWeight: '700', fontSize: 13 },

  body:       { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  fieldLabel: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600', marginBottom: 8 },

  // Couleur & Icône
  colorIconCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20,
    backgroundColor: COLORS.card, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: COLORS.border,
  },
  projectPreview:     { width: 62, height: 62, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  projectPreviewIcon: { fontSize: 28 },
  colorDot: {
    width: 28, height: 28, borderRadius: 14, marginRight: 8,
    borderWidth: 2, borderColor: 'transparent',
  },
  colorDotSelected: { borderColor: '#fff', transform: [{ scale: 1.2 }] },
  iconeChip: {
    width: 36, height: 36, borderRadius: 10, marginRight: 6,
    backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'transparent',
  },
  iconeChipSelected: { borderColor: COLORS.accent, backgroundColor: '#1a3a50' },
  iconeText: { fontSize: 18 },

  // Inputs
  textInput: {
    backgroundColor: COLORS.card, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 13,
    color: COLORS.text, fontSize: 14, marginBottom: 18,
    borderWidth: 1, borderColor: COLORS.border,
  },
  textArea: { minHeight: 100, paddingTop: 13 },

  // Select
  selectBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.card, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 13, marginBottom: 18,
    borderWidth: 1, borderColor: COLORS.border,
  },
  selectPlaceholder: { color: COLORS.textDim, fontSize: 14 },
  selectArrow:       { color: COLORS.textMuted, fontSize: 22 },
  chefSelected:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  chefAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.accent, justifyContent: 'center', alignItems: 'center',
  },
  chefAvatarText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  chefName:       { color: COLORS.text, fontSize: 14 },

  // Chips
  chipRow:      { flexDirection: 'row', gap: 8, marginBottom: 18, flexWrap: 'wrap' },
  priorityChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20,
    borderWidth: 1.5, backgroundColor: COLORS.card,
  },
  statutChip: {
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20,
    borderWidth: 1.5, backgroundColor: COLORS.card,
  },
  chipIcon:        { fontSize: 13 },
  chipLabel:       { color: COLORS.textMuted, fontSize: 13 },
  chipLabelActive: { color: '#fff', fontWeight: '700' },

  // Date
  dateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.card, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 13,
    borderWidth: 1, borderColor: COLORS.border,
  },
  dateBtnIcon: { fontSize: 16 },
  dateBtnText: { color: COLORS.text, fontSize: 14 },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center', alignItems: 'center', padding: 20,
  },
  dateModal: {
    backgroundColor: COLORS.surface, borderRadius: 16, padding: 20,
    width: '100%', borderWidth: 1, borderColor: COLORS.border,
  },
  dateModalTitle:      { color: COLORS.text, fontWeight: '700', fontSize: 16, marginBottom: 16 },
  datePickerLabel:     { color: COLORS.textMuted, fontSize: 12, fontWeight: '600', marginBottom: 6 },
  dateChip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10,
    backgroundColor: COLORS.card, marginRight: 6,
    borderWidth: 1, borderColor: COLORS.border,
  },
  dateChipSmall:       { paddingHorizontal: 9 },
  dateChipActive:      { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  dateChipText:        { color: COLORS.textMuted, fontSize: 13 },
  dateChipTextActive:  { color: '#fff', fontWeight: '700' },
  yearRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 20, marginBottom: 20,
  },
  yearBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.card, justifyContent: 'center', alignItems: 'center',
  },
  yearBtnText:          { color: COLORS.text, fontSize: 22, fontWeight: '300' },
  yearValue:            { color: COLORS.text, fontSize: 18, fontWeight: '700', minWidth: 60, textAlign: 'center' },
  dateModalActions:     { flexDirection: 'row', gap: 10, marginTop: 4 },
  dateModalCancel: {
    flex: 1, paddingVertical: 11, borderRadius: 10,
    backgroundColor: COLORS.card, alignItems: 'center',
  },
  dateModalCancelText:  { color: COLORS.textMuted, fontWeight: '600' },
  dateModalConfirm: {
    flex: 1, paddingVertical: 11, borderRadius: 10,
    backgroundColor: COLORS.accent, alignItems: 'center',
  },
  dateModalConfirmText: { color: '#fff', fontWeight: '700' },

  // Chef Modal
  listModal: {
    backgroundColor: COLORS.surface, borderRadius: 16, padding: 20,
    width: '100%', borderWidth: 1, borderColor: COLORS.border,
  },
  listModalTitle: { color: COLORS.text, fontWeight: '700', fontSize: 16, marginBottom: 14 },
  listModalItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 10,
    borderRadius: 10, marginBottom: 6, backgroundColor: COLORS.card,
  },
  listModalItemActive: { borderWidth: 1, borderColor: COLORS.accent },
  listModalItemText:   { flex: 1, color: COLORS.text, fontSize: 14 },
  listModalClose: {
    marginTop: 8, paddingVertical: 11, borderRadius: 10,
    backgroundColor: COLORS.card, alignItems: 'center',
  },
  listModalCloseText: { color: COLORS.textMuted, fontWeight: '600' },

  // Membres
  addMemberBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.card, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 13,
    borderWidth: 1, borderColor: COLORS.border,
    borderStyle: 'dashed', marginBottom: 10, gap: 10,
  },
  addMemberIcon: { fontSize: 20, color: COLORS.accent, fontWeight: '300' },
  addMemberText: { fontSize: 14, color: COLORS.textMuted },
  memberItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.card, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    marginBottom: 8, borderWidth: 1, borderColor: COLORS.border, gap: 12,
  },
  memberAvatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: COLORS.accent, justifyContent: 'center', alignItems: 'center',
  },
  memberAvatarText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  memberName:       { flex: 1, color: COLORS.text, fontSize: 14 },
  memberRemove:     { color: COLORS.textMuted, fontSize: 16 },
});
