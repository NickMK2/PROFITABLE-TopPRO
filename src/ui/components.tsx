import React, { useEffect, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { parseNumber } from '../ingest/numbers';
import { colors, radius } from './theme';

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export function Muted({ children }: { children: React.ReactNode }) {
  return <Text style={styles.muted}>{children}</Text>;
}

export function Button({
  title,
  onPress,
  tone = 'primary',
  disabled,
}: {
  title: string;
  onPress: () => void;
  tone?: 'primary' | 'success' | 'danger' | 'ghost';
  disabled?: boolean;
}) {
  const background = {
    primary: colors.info,
    success: colors.accent,
    danger: colors.danger,
    ghost: colors.surfaceAlt,
  }[tone];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: background, opacity: disabled ? 0.4 : pressed ? 0.8 : 1 },
      ]}
    >
      <Text style={[styles.buttonText, tone === 'ghost' && { color: colors.text }]}>{title}</Text>
    </Pressable>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={draft}
        onChangeText={setDraft}
        onEndEditing={() => {
          const parsed = parseNumber(draft);
          if (Number.isFinite(parsed)) onChange(parsed);
          else setDraft(String(value));
        }}
      />
      {suffix && <Text style={styles.fieldSuffix}>{suffix}</Text>}
    </View>
  );
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        onChangeText={onChange}
        onEndEditing={() => onChange(value.trim())}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 10 },
  muted: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  button: { borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14, alignItems: 'center' },
  buttonText: { color: '#08121B', fontWeight: '700', fontSize: 14 },
  field: { marginBottom: 12 },
  fieldLabel: { color: colors.muted, fontSize: 12, marginBottom: 5 },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 9,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  fieldSuffix: { color: colors.muted, fontSize: 11, marginTop: 4 },
});
