import { MaterialIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { aire, font } from '../../shared/theme/tokens';

// Alto de cada pestaña: icono, etiqueta y su aire interno (medido en un Galaxy A24). Con menos, la etiqueta desborda y se pega al borde.
const TAB_BAR_CONTENT = 58;
const TAB_BAR_PADDING = 6;

const tabs = [
  { name: 'hoy', title: 'Hoy', icon: 'wb-sunny' },
  { name: 'tendencias', title: 'Tendencias', icon: 'show-chart' },
  { name: 'plan', title: 'Plan', icon: 'event' },
  { name: 'privacidad', title: 'Privacidad', icon: 'shield' },
  { name: 'perfil', title: 'Perfil', icon: 'person' },
] as const;

function renderTabIcon(name: (typeof tabs)[number]['icon']) {
  return function TabIcon({ color }: Readonly<{ color: ColorValue }>) {
    return <MaterialIcons color={color} name={name} size={20} />;
  };
}

export default function TabsLayout() {
  // La barra de botones de Android va oculta (RootLayout): los tabs quedan pegados al borde inferior.
  // En iPhone, el margen inferior es el del indicador de inicio.
  const insets = useSafeAreaInsets();
  const bottom = insets.bottom;
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
          // Mismo aire arriba y abajo; abajo se suma el margen del indicador de inicio (iPhone).
          height: TAB_BAR_CONTENT + 2 * TAB_BAR_PADDING + bottom,
          paddingBottom: TAB_BAR_PADDING + bottom,
          paddingTop: TAB_BAR_PADDING,
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
            tabBarIcon: renderTabIcon(tab.icon),
          }}
        />
      ))}
    </Tabs>
  );
}
