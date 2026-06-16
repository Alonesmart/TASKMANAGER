import { useAppTheme } from "@/theme";
import { MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { useTranslation } from "react-i18next";
import {
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

type SimpleDatePickerProps = {
  label: string;
  value: Date | null;
  onChange: (date: Date) => void;
};

export const SimpleDatePicker = ({ label, value, onChange }: SimpleDatePickerProps) => {
  const { t } = useTranslation();
  const { theme } = useAppTheme();
  
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

  const styles = createStyles(theme);

  return (
    <>
      <TouchableOpacity style={styles.dateBtn} onPress={() => setShow(true)} activeOpacity={0.8}>
        <MaterialIcons name="calendar-today" size={20} color={theme.accent} />
        <Text style={[styles.dateBtnText, !value && { color: theme.textSecondary }]}>
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

const createStyles = (theme: any) => StyleSheet.create({
  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: theme.cardBg, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13, borderWidth: 1, borderColor: theme.border },
  dateBtnText: { color: theme.textPrimary, fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  dateModal: { backgroundColor: theme.cardBg, borderRadius: 16, padding: 20, width: '100%', borderWidth: 1, borderColor: theme.border },
  dateModalTitle: { color: theme.textPrimary, fontWeight: '700', fontSize: 16, marginBottom: 16 },
  datePickerLabel: { color: theme.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 6 },
  dateChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: theme.cardBg, marginRight: 6, borderWidth: 1, borderColor: theme.border },
  dateChipSmall: { paddingHorizontal: 9 },
  dateChipActive: { backgroundColor: theme.accent, borderColor: theme.accent },
  dateChipText: { color: theme.textSecondary, fontSize: 13 },
  dateChipTextActive: { color: '#fff', fontWeight: '700' },
  yearRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 20 },
  yearBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.cardBg, justifyContent: 'center', alignItems: 'center' },
  yearBtnText: { color: theme.textPrimary, fontSize: 22, fontWeight: '300' },
  yearValue: { color: theme.textPrimary, fontSize: 18, fontWeight: '700', minWidth: 60, textAlign: 'center' },
  dateModalActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  dateModalCancel: { flex: 1, paddingVertical: 11, borderRadius: 10, backgroundColor: theme.cardBg, alignItems: 'center' },
  dateModalCancelText: { color: theme.textSecondary, fontWeight: '600' },
  dateModalConfirm: { flex: 1, paddingVertical: 11, borderRadius: 10, backgroundColor: theme.accent, alignItems: 'center' },
  dateModalConfirmText: { color: '#fff', fontWeight: '700' },
});