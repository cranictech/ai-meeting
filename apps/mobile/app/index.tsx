import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme, type Colors } from '../theme';

export default function IndexScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('auth_token');
        if (token) {
          router.replace('/(tabs)');
          return;
        }
      } catch (e) {
        // Continue to landing buttons
      } finally {
        setCheckingAuth(false);
      }
    };

    checkAuth();
  }, [router]);

  if (checkingAuth) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Image source={require('../assets/icon.png')} style={styles.logo} resizeMode="cover" />
      <Text style={styles.title}>Meeti</Text>
      <Text style={styles.subtitle}>Intelligent meeting notes and action items</Text>

      <TouchableOpacity style={styles.button} onPress={() => router.push('/login')} activeOpacity={0.85}>
        <Text style={styles.buttonText}>Sign In</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.secondaryButton]}
        onPress={() => router.push('/register')}
        activeOpacity={0.85}
      >
        <Text style={[styles.buttonText, styles.secondaryButtonText]}>Create Account</Text>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (c: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    logo: { width: 84, height: 84, borderRadius: 20, marginBottom: 16 },
    title: { fontSize: 32, fontWeight: '800', color: c.text, marginBottom: 8, letterSpacing: -0.5 },
    subtitle: { fontSize: 15, color: c.textMuted, marginBottom: 48, textAlign: 'center' },
    button: {
      backgroundColor: c.primary,
      paddingVertical: 16,
      borderRadius: 10,
      width: '100%',
      alignItems: 'center',
      marginBottom: 12,
    },
    buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
    secondaryButton: { backgroundColor: c.card, borderWidth: 1, borderColor: c.border },
    secondaryButtonText: { color: c.text },
  });
