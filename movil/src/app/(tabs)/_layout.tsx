import { MaterialIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { initialWindowMetrics, useSafeAreaInsets } from 'react-native-safe-area-context';
import { aire, font } from '../../shared/theme/tokens';

const tabs = [
  { name: 'hoy', title: 'Hoy', icon: 'wb-sunny' },
  { name: 'tendencias', title: 'Tendencias', icon: 'show-chart' },
  { name: 'plan', title: 'Plan', icon: 'event' },
  { name: 'privacidad', title: 'Privacidad', icon: 'shield' },
  { name: 'perfil', title: 'Perfil', icon: 'person' },
] as const;

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const measuredBottom = Math.max(insets.bottom, initialWindowMetrics?.insets.bottom ?? 0);
  const bottom = measuredBottom > 0 ? measuredBottom : Platform.OS === 'android' ? 48 : 0;
  return (
    <Tabs
      safeAreaInsets={{ top: insets.top, right: insets.right, bottom, left: insets.left }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: aire.accent,
        tabBarInactiveTintColor: aire.muted,
        tabBarStyle: {
          backgroundColor: 'rgba(246,249,255,0.96)',
          borderTopColor: aire.border,
          height: 58 + bottom,
          paddingBottom: bottom,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontFamily: font.semibold, fontSize: 11 },
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color }) => <MaterialIcons color={color} name={tab.icon} size={20} />,
          }}
        />
      ))}
    </Tabs>
  );
}
