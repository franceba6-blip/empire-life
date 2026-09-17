import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';

const icons: Record<string, keyof typeof Ionicons.glyphMap> = { index: 'home', business: 'briefcase', assets: 'diamond', life: 'heart', profile: 'person' };
export default function TabsLayout() { return <Tabs screenOptions={({ route }) => ({ headerShown: false, tabBarStyle: { backgroundColor: '#0D111A', borderTopColor: colors.border, height: 82, paddingTop: 8 }, tabBarActiveTintColor: colors.gold, tabBarInactiveTintColor: colors.muted, tabBarLabelStyle: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 }, tabBarIcon: ({ color, size }) => <Ionicons name={icons[route.name]} color={color} size={size} /> })}>
  <Tabs.Screen name="index" options={{ title: 'HOME' }} /><Tabs.Screen name="business" options={{ title: 'BUSINESS' }} /><Tabs.Screen name="assets" options={{ title: 'ASSETS' }} /><Tabs.Screen name="life" options={{ title: 'LIFE' }} /><Tabs.Screen name="profile" options={{ title: 'PROFILE' }} />
</Tabs>; }
