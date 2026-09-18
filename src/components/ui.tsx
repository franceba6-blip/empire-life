import { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle, StyleProp } from 'react-native';
import { colors, spacing } from '@/theme';

export const Screen = ({ children }: PropsWithChildren) => <View style={styles.screen}>{children}</View>;
export const Card = ({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) => <View style={[styles.card, style]}>{children}</View>;
export const Label = ({ children }: PropsWithChildren) => <Text style={styles.label}>{children}</Text>;
export const Money = ({ value, large = false }: { value: number; large?: boolean }) => <Text style={[styles.money, large && styles.moneyLarge]}>{value < 0 ? '-' : ''}€{Math.abs(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}</Text>;
export const SectionTitle = ({ children }: PropsWithChildren) => <Text style={styles.section}>{children}</Text>;
export const PrimaryButton = ({ title, onPress, disabled = false, tone = 'gold' }: { title: string; onPress: () => void; disabled?: boolean; tone?: 'gold' | 'dark' | 'danger' }) => (
  <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button, tone === 'dark' && styles.darkButton, tone === 'danger' && styles.dangerButton, (pressed || disabled) && styles.buttonDim]}>
    <Text style={[styles.buttonText, tone !== 'gold' && styles.lightButtonText]}>{title}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: spacing.md },
  label: { color: colors.muted, fontSize: 12, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  money: { color: colors.text, fontSize: 20, fontWeight: '800', marginTop: 4 },
  moneyLarge: { fontSize: 38, letterSpacing: -1.5 },
  section: { color: colors.text, fontSize: 19, fontWeight: '800', marginTop: spacing.lg, marginBottom: spacing.sm },
  button: { minHeight: 48, paddingHorizontal: 18, borderRadius: 14, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  darkButton: { backgroundColor: colors.surface2, borderColor: colors.border, borderWidth: 1 },
  dangerButton: { backgroundColor: colors.red },
  buttonDim: { opacity: 0.45 },
  buttonText: { color: '#15100A', fontWeight: '900', letterSpacing: 0.5 }, lightButtonText: { color: colors.text }
});
