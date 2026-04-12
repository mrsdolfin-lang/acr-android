// src/screens/LoginScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Image, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../utils/theme';

// Firebase Auth
import { auth, onAuthStateChanged } from '../services/firebase';

export default function LoginScreen({ navigation }) {
  const [loading, setLoading] = useState(false);

  // If already logged in, go to Main
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      if (user) navigation.replace('Main');
    });
    return unsub;
  }, []);

  // Google Sign-In
  // NOTE: To enable Google Sign-In, install expo-auth-session:
  // npx expo install expo-auth-session expo-crypto expo-web-browser
  // Then follow: https://docs.expo.dev/guides/google-authentication/
  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      Alert.alert(
        'Google Sign-In Setup',
        'To enable Google login:\n\n1. Run: npx expo install expo-auth-session expo-crypto expo-web-browser\n\n2. Follow the Firebase + Expo guide in SETUP_GUIDE.html\n\nFor now, tap "Continue without account" to test all other features.',
        [{ text: 'OK', onPress: () => setLoading(false) }]
      );
    } catch (e) {
      Alert.alert('Error', e.message);
      setLoading(false);
    }
  };

  const skipLogin = () => navigation.replace('Main');

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.container}>
        <Image
          source={require('../../assets/acr-logo.png')}
          style={s.logo}
          resizeMode="contain"
        />
        <Text style={s.tagline}>
          Track every expense automatically.{'\n'}
          Your money, your data. Always.
        </Text>

        {/* Features */}
        <View style={s.feats}>
          {[
            { ico: '📩', txt: 'Real SMS auto-capture' },
            { ico: '☁️', txt: 'Cloud sync all devices' },
            { ico: '📊', txt: 'Smart charts & budgets' },
            { ico: '🛡', txt: 'Private & secure' },
          ].map((f, i) => (
            <View key={i} style={s.feat}>
              <Text style={s.featIco}>{f.ico}</Text>
              <Text style={s.featTxt}>{f.txt}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={[s.googleBtn, loading && { opacity: 0.7 }]} onPress={handleGoogleLogin} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#1f1f1f"/>
          ) : (
            <>
              <Text style={s.googleG}>G</Text>
              <Text style={s.googleTxt}>Continue with Google</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={s.divRow}>
          <View style={s.divLine}/>
          <Text style={s.divTxt}>or</Text>
          <View style={s.divLine}/>
        </View>

        <TouchableOpacity style={s.skipBtn} onPress={skipLogin}>
          <Text style={s.skipTxt}>Use without account (local only)</Text>
        </TouchableOpacity>

        <Text style={s.note}>
          Local data stored on device. Sign in to sync across devices.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: theme.colors.bg },
  container:  { flex: 1, paddingHorizontal: 28, justifyContent: 'center' },
  logo:       { height: 50, width: 160, marginBottom: 16, alignSelf: 'center' },
  tagline:    { fontSize: 15, color: theme.colors.t2, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  feats:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 36 },
  feat:       { flex: 1, minWidth: '45%', backgroundColor: theme.colors.bg2, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 16, padding: 14, alignItems: 'center' },
  featIco:    { fontSize: 22, marginBottom: 6 },
  featTxt:    { fontSize: 12, color: theme.colors.t2, textAlign: 'center', lineHeight: 16 },
  googleBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 52, backgroundColor: '#ffffff', borderRadius: 16, marginBottom: 14 },
  googleG:    { fontSize: 18, fontWeight: '800', color: '#4285F4' },
  googleTxt:  { fontSize: 15, fontWeight: '600', color: '#1f1f1f' },
  divRow:     { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  divLine:    { flex: 1, height: 1, backgroundColor: theme.colors.border },
  divTxt:     { fontSize: 12, color: theme.colors.t4 },
  skipBtn:    { height: 44, borderWidth: 1, borderColor: theme.colors.border2, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  skipTxt:    { fontSize: 14, color: theme.colors.t2 },
  note:       { fontSize: 11, color: theme.colors.t4, textAlign: 'center', lineHeight: 16 },
});
