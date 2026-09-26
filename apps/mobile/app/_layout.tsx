import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="meetings/[id]"
          options={{
            headerShown: true,
            title: 'Meeting Details',
            headerBackTitle: 'Back',
          }}
        />
        <Stack.Screen
          name="meetings/new"
          options={{
            headerShown: true,
            title: 'New Meeting',
            headerBackTitle: 'Cancel',
          }}
        />
        <Stack.Screen
          name="record/[id]"
          options={{
            headerShown: true,
            title: 'Recording',
            headerBackTitle: 'Exit',
          }}
        />
        <Stack.Screen
          name="processing/[id]"
          options={{
            headerShown: false,
          }}
        />
      </Stack>
    </>
  );
}