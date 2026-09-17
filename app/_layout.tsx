import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useGameStore } from '@/store/gameStore';

export default function RootLayout() {
  const hydrate = useGameStore(s => s.hydrate);
  useEffect(() => { void hydrate(); }, [hydrate]);
  return <><StatusBar style="light" /><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#080B12' } }} /></>;
}
