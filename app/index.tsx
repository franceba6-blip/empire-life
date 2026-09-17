import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useGameStore } from '@/store/gameStore';
import { colors } from '@/theme';

export default function Index() {
  const { hydrated, game } = useGameStore();
  if (!hydrated) return <View style={styles.loading}><ActivityIndicator color={colors.gold} /></View>;
  return <Redirect href={game ? '/(tabs)' : '/new-game'} />;
}
const styles = StyleSheet.create({ loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg } });
