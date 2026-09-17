import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { PrimaryButton } from '@/components/ui';
import { useGameStore } from '@/store/gameStore';
import { colors, spacing } from '@/theme';

export default function NewGame() {
  const [first, setFirst] = useState(''); const [last, setLast] = useState('');
  const create = useGameStore(s => s.newGame);
  const start = async () => { if (!first.trim() || !last.trim()) return; await create(first, last); router.replace('/(tabs)'); };
  return <LinearGradient colors={['#17111C', colors.bg, '#080B12']} style={styles.root}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.content}>
      <View><Text style={styles.kicker}>YOUR STORY STARTS HERE</Text><Text style={styles.logo}>EMPIRE{`\n`}LIFE</Text><Text style={styles.tagline}>Build your life.{`\n`}Build your empire.</Text></View>
      <View style={styles.form}>
        <Text style={styles.title}>Create your character</Text>
        <TextInput value={first} onChangeText={setFirst} placeholder="First name" placeholderTextColor={colors.muted} style={styles.input} autoCapitalize="words" />
        <TextInput value={last} onChangeText={setLast} placeholder="Last name" placeholderTextColor={colors.muted} style={styles.input} autoCapitalize="words" />
        <View style={styles.age}><Text style={styles.ageLabel}>STARTING AGE</Text><Text style={styles.ageValue}>18</Text></View>
        <PrimaryButton title="BEGIN WITH €0" onPress={start} disabled={!first.trim() || !last.trim()} />
      </View>
    </KeyboardAvoidingView>
  </LinearGradient>;
}
const styles = StyleSheet.create({ root: { flex: 1 }, content: { flex: 1, padding: spacing.lg, paddingTop: 80, justifyContent: 'space-between', paddingBottom: 44 }, kicker: { color: colors.gold, fontWeight: '800', letterSpacing: 2, fontSize: 11 }, logo: { color: colors.text, fontSize: 54, fontWeight: '900', letterSpacing: -3, lineHeight: 47, marginTop: 12 }, tagline: { color: colors.muted, fontSize: 19, lineHeight: 27, marginTop: 18 }, form: { gap: 12 }, title: { color: colors.text, fontSize: 22, fontWeight: '800', marginBottom: 4 }, input: { height: 54, borderRadius: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, color: colors.text, paddingHorizontal: 16, fontSize: 16 }, age: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 15, padding: 16, borderWidth: 1, borderColor: colors.border }, ageLabel: { color: colors.muted, fontSize: 12, fontWeight: '800' }, ageValue: { color: colors.text, fontSize: 18, fontWeight: '900' } });
