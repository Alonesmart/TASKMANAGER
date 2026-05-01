import { Tabs } from "expo-router";
import { Ionicons, MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { useAppTheme } from "../../theme";

export default function TabsLayout() {
  const { theme } = useAppTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.inactive,
        tabBarStyle: {
          backgroundColor: theme.bar,
          borderTopWidth: 1,
          borderTopColor: theme.barBorder,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Accueil",
          tabBarIcon: ({ color }) => (
            <Ionicons name="home" size={22} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="projects"
        options={{
          title: "Projets",
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="folder" size={22} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="messages"
        options={{
          title: "Messages",
          tabBarIcon: ({ color }) => (
            <Ionicons name="chatbubble-ellipses" size={22} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="reports"
        options={{
          title: "Rapports",
          tabBarIcon: ({ color }) => (
            <Ionicons name="stats-chart" size={22} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="video"
        options={{
          title: "Vidéo",
          tabBarIcon: ({ color }) => (
            <FontAwesome5 name="graduation-cap" size={20} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ color }) => (
            <Ionicons name="person" size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
