import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi, getActiveApiUrl, setCustomApiUrl, DEFAULT_API_URL } from '../lib/api';
import { useTheme, makeStyles, type Colors } from '../theme';

export default function LoginScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [serverUrl, setServerUrl] = useState('');

  useEffect(() => {
    getActiveApiUrl().then(setServerUrl);
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      if (serverUrl) {
        await setCustomApiUrl(serverUrl);
      }
      const response = await authApi.login(email, password);
      await AsyncStorage.setItem('auth_token', response.data.token);
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert(
        'Login Failed',
        error.response?.data?.error ||
          error.message ||
          'Could not connect to server. Check server URL under Server Settings.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.textMuted}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={colors.textMuted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Signing in...' : 'Sign In'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => router.push('/register')}
        >
          <Text style={styles.linkText}>Don't have an account? Register</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.serverToggleButton}
          onPress={() => setShowServerConfig(!showServerConfig)}
        >
          <Text style={styles.serverToggleText}>
            {showServerConfig ? 'Hide Server Settings' : 'Server Settings'}
          </Text>
        </TouchableOpacity>

        {showServerConfig && (
          <View style={styles.serverConfigBox}>
            <Text style={styles.serverLabel}>Backend Server URL</Text>
            <TextInput
              style={styles.serverInput}
              value={serverUrl}
              onChangeText={setServerUrl}
              placeholder="http://192.168.x.x:3000"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.resetButton}
              onPress={() => setServerUrl(DEFAULT_API_URL)}
            >
              <Text style={styles.resetText}>Reset to Default ({DEFAULT_API_URL})</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const createStyles = makeStyles((colors: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
      padding: 24,
      justifyContent: 'center',
    },
    title: {
      fontSize: 32,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textMuted,
      marginBottom: 32,
    },
    input: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 16,
      fontSize: 16,
      marginBottom: 16,
      color: colors.text,
    },
    button: {
      backgroundColor: colors.primary,
      padding: 16,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 8,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    buttonText: {
      color: colors.onPrimary,
      fontSize: 16,
      fontWeight: '600',
    },
    linkButton: {
      marginTop: 16,
      alignItems: 'center',
    },
    linkText: {
      color: colors.primary,
      fontSize: 14,
    },
    serverToggleButton: {
      marginTop: 20,
      alignItems: 'center',
      paddingVertical: 8,
    },
    serverToggleText: {
      color: colors.textMuted,
      fontSize: 13,
      textDecorationLine: 'underline',
    },
    serverConfigBox: {
      marginTop: 12,
      padding: 14,
      backgroundColor: colors.card,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    serverLabel: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.textMuted,
      marginBottom: 6,
    },
    serverInput: {
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 6,
      paddingHorizontal: 10,
      paddingVertical: 8,
      fontSize: 13,
      color: colors.text,
    },
    resetButton: {
      marginTop: 8,
      alignSelf: 'flex-start',
    },
    resetText: {
      fontSize: 11,
      color: colors.primary,
    },
  }),
);
