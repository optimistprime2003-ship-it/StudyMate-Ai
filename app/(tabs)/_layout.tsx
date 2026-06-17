import { Tabs } from 'expo-router';
import { useTheme } from 'react-native-paper';
import { useAppStore } from '../../src/store/appStore';
import { lightTheme, darkTheme } from '../../src/theme/theme';

export default function TabLayout() {
  const isDark = useAppStore((s) => s.isDark);
  const theme = isDark ? darkTheme : lightTheme;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: isDark ? '#94A3B8' : '#64748B',
        tabBarStyle: {
          backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
          borderTopColor: isDark ? '#334155' : '#E2E8F0',
          borderTopWidth: 1,
          elevation: 8,
          height: 64,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ size, color }) => (
            <TabIcon name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Library',
          tabBarIcon: ({ size, color }) => (
            <TabIcon name="book-multiple" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ size, color }) => (
            <TabIcon name="chat" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="study"
        options={{
          title: 'Study',
          tabBarIcon: ({ size, color }) => (
            <TabIcon name="school" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ size, color }) => (
            <TabIcon name="cog" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

function TabIcon({ name, size, color }: { name: string; size: number; color: string }) {
  // Using MaterialCommunityIcons from @expo/vector-icons
  const { MaterialCommunityIcons } = require('@expo/vector-icons');
  return <MaterialCommunityIcons name={name} size={size} color={color} />;
}
