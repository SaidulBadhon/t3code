import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useServerSync } from "../src/hooks/useServerSync";

function ServerSyncProvider({ children }: { children: React.ReactNode }) {
  useServerSync();
  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <ServerSyncProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#09090b" },
          headerTintColor: "#fafafa",
          headerTitleStyle: { fontWeight: "600" },
          contentStyle: { backgroundColor: "#09090b" },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="thread/[id]"
          options={{
            title: "Thread",
            headerBackTitle: "Back",
          }}
        />
      </Stack>
    </ServerSyncProvider>
  );
}
