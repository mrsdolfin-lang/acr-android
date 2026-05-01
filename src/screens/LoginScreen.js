/**
 * LoginScreen — Authentication
 *
 * Fixes: TypeScript type annotations removed (crash in Metro bundler for .js files)
 * Flows: Google OAuth · Email Login · Email Signup · Password Reset
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google     from 'expo-auth-session/providers/google';
import {
  auth,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithCredential,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
} from '../services/firebase';

WebBrowser.maybeCompleteAuthSession();

// ── Replace with real client IDs from Firebase Console ────────────────────────
const GOOGLE_EXPO_CLIENT_ID    = '1065429844661-ogng09mrvt59u4nisja5256et4891vcj.apps.googleusercontent.com';
const GOOGLE_ANDROID_CLIENT_ID = '1065429844661-lo7h4tijeh7usvvgfnc05eulqi17vq6i.apps.googleusercontent.com';
const GOOGLE_IOS_CLIENT_ID     = 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com';

const C = {
  bg: '#F7F8FA', bg2: '#FFFFFF', bg3: '#F0F2F5',
  t1: '#0D1117', t2: '#3D4350', t3: '#7B8394', t4: '#B0B8C4',
  mint: '#00A651', red: '#D92D2D', blue: '#1A6FD4',
  border: 'rgba(0,0,0,0.1)',
};

// ── Validators ────────────────────────────────────────────────────────────────
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((email || '').trim());
}
function isValidPassword(password) {
  return (password || '').length >= 6;
}

// ── Reusable Field ────────────────────────────────────────────────────────────
function Field({ label, value, onChangeText, placeholder, secure, keyboardType, autoCapitalize }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={fi.wrap}>
      <Text style={fi.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.t4}
        secureTextEntry={!!secure}
        keyboardType={keyboardType || 'default'}
        autoCapitalize={autoCapitalize || 'none'}
        autoCorrect={false}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[fi.input, { borderColor: focused ? C.blue : C.border }]}
      />
    </View>
  );
}
const fi = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '600', color: C.t2, marginBottom: 6 },
  input: {
    backgroundColor: C.bg2, borderWidth: 1.5, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: C.t1,
  },
});

// ── Primary Button ────────────────────────────────────────────────────────────
function PrimaryBtn({ label, onPress, loading, disabled }) {
  return (
    <TouchableOpacity
      style={[btnS.primary, (disabled || loading) && { opacity: 0.55 }]}
      onPress={onPress}
      disabled={!!disabled || !!loading}
      activeOpacity={0.85}
    >
      {loading
        ? <ActivityIndicator size="small" color="#fff" />
        : <Text style={btnS.primaryTxt}>{label}</Text>
      }
    </TouchableOpacity>
  );
}
function LinkBtn({ label, onPress }) {
  return (
    <TouchableOpacity style={btnS.link} onPress={onPress} activeOpacity={0.7}>
      <Text style={btnS.linkTxt}>{label}</Text>
    </TouchableOpacity>
  );
}
const btnS = StyleSheet.create({
  primary: {
    backgroundColor: C.blue, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginTop: 4,
  },
  primaryTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
  link: { alignItems: 'center', paddingVertical: 10 },
  linkTxt: { color: C.blue, fontSize: 14, fontWeight: '500' },
});

// ── Landing ───────────────────────────────────────────────────────────────────
function LandingView({ onGoogle, onEmail, onSkip, googleLoading }) {
  return (
    <View style={lv.wrap}>
      <View style={lv.logoArea}>
        <Text style={lv.logo}>Acrom<Text style={{ color: C.mint }}>.</Text></Text>
        <Text style={lv.tagline}>Smart Expense Tracker</Text>
      </View>

      <View style={lv.btns}>
        <TouchableOpacity
          style={[lv.googleBtn, googleLoading && { opacity: 0.6 }]}
          onPress={onGoogle}
          disabled={googleLoading}
          activeOpacity={0.85}
        >
          {googleLoading
            ? <ActivityIndicator size="small" color={C.t2} />
            : <>
                <Text style={lv.gIcon}>G</Text>
                <Text style={lv.gTxt}>Continue with Google</Text>
              </>
          }
        </TouchableOpacity>

        <View style={lv.divRow}>
          <View style={lv.divLine} />
          <Text style={lv.divTxt}>or</Text>
          <View style={lv.divLine} />
        </View>

        <TouchableOpacity style={lv.emailBtn} onPress={onEmail} activeOpacity={0.85}>
          <Text style={lv.emailTxt}>Continue with Email</Text>
        </TouchableOpacity>

        <TouchableOpacity style={lv.skipBtn} onPress={onSkip} activeOpacity={0.7}>
          <Text style={lv.skipTxt}>Use without account</Text>
        </TouchableOpacity>
      </View>

      <Text style={lv.footer}>Your data is private and encrypted</Text>
    </View>
  );
}
const lv = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  logoArea: { alignItems: 'center', marginBottom: 52 },
  logo: { fontSize: 44, fontWeight: '800', color: C.t1, letterSpacing: -1 },
  tagline: { fontSize: 14, color: C.t3, marginTop: 6 },
  btns: { gap: 10 },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.bg2, borderRadius: 12, paddingVertical: 14,
    borderWidth: 1.5, borderColor: C.border, gap: 12, minHeight: 50,
  },
  gIcon: { fontSize: 18, fontWeight: '700', color: '#4285F4' },
  gTxt: { fontSize: 15, fontWeight: '600', color: C.t1 },
  divRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 2 },
  divLine: { flex: 1, height: 1, backgroundColor: C.border },
  divTxt: { fontSize: 13, color: C.t4 },
  emailBtn: { backgroundColor: C.t1, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  emailTxt: { fontSize: 15, fontWeight: '600', color: '#fff' },
  skipBtn: { alignItems: 'center', paddingVertical: 10 },
  skipTxt: { fontSize: 14, color: C.t3, textDecorationLine: 'underline' },
  footer: {
    position: 'absolute', bottom: 36, left: 0, right: 0,
    textAlign: 'center', fontSize: 11, color: C.t4,
  },
});

// ── Email Login ───────────────────────────────────────────────────────────────
function EmailLoginView({ onBack, onSuccess, onSignup, onReset }) {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleLogin = useCallback(async () => {
    if (!isValidEmail(email)) { Alert.alert('Invalid Email', 'Enter a valid email address.'); return; }
    if (!isValidPassword(password)) { Alert.alert('Short Password', 'Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      onSuccess();
    } catch (err) {
      const messages = {
        'auth/user-not-found':   'No account found. Try signing up.',
        'auth/wrong-password':   'Incorrect password.',
        'auth/invalid-email':    'Invalid email format.',
        'auth/too-many-requests':'Too many attempts. Try again later.',
        'auth/invalid-credential': 'Invalid email or password.',
      };
      Alert.alert('Sign In Failed', messages[err.code] || 'An error occurred. Try again.');
    } finally {
      setLoading(false);
    }
  }, [email, password, onSuccess]);

  return (
    <View style={ev.wrap}>
      <TouchableOpacity onPress={onBack} style={ev.back}><Text style={ev.backTxt}>← Back</Text></TouchableOpacity>
      <Text style={ev.h1}>Sign In</Text>
      <Text style={ev.sub}>Welcome back</Text>
      <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" />
      <Field label="Password" value={password} onChangeText={setPassword} placeholder="Your password" secure />
      <TouchableOpacity onPress={onReset} style={{ alignSelf: 'flex-end', marginBottom: 12, marginTop: -6 }}>
        <Text style={{ color: C.blue, fontSize: 13 }}>Forgot password?</Text>
      </TouchableOpacity>
      <PrimaryBtn label="Sign In" onPress={handleLogin} loading={loading} />
      <LinkBtn label="Don't have an account? Sign Up" onPress={onSignup} />
    </View>
  );
}

// ── Email Sign Up ─────────────────────────────────────────────────────────────
function EmailSignupView({ onBack, onSuccess, onLogin }) {
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleSignup = useCallback(async () => {
    if (!(name || '').trim())   { Alert.alert('Required', 'Enter your name.'); return; }
    if (!isValidEmail(email))   { Alert.alert('Invalid Email', 'Enter a valid email.'); return; }
    if (!isValidPassword(password)) { Alert.alert('Weak Password', 'Password needs 6+ characters.'); return; }
    if (password !== confirm)   { Alert.alert('Mismatch', 'Passwords do not match.'); return; }
    setLoading(true);
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(user, { displayName: name.trim() });
      onSuccess();
    } catch (err) {
      const messages = {
        'auth/email-already-in-use': 'Email already registered. Try signing in.',
        'auth/invalid-email':        'Invalid email format.',
        'auth/weak-password':        'Choose a stronger password.',
      };
      Alert.alert('Sign Up Failed', messages[err.code] || 'An error occurred. Try again.');
    } finally {
      setLoading(false);
    }
  }, [name, email, password, confirm, onSuccess]);

  return (
    <View style={ev.wrap}>
      <TouchableOpacity onPress={onBack} style={ev.back}><Text style={ev.backTxt}>← Back</Text></TouchableOpacity>
      <Text style={ev.h1}>Create Account</Text>
      <Text style={ev.sub}>Start tracking smarter</Text>
      <Field label="Full Name" value={name} onChangeText={setName} placeholder="Your name" autoCapitalize="words" />
      <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" />
      <Field label="Password" value={password} onChangeText={setPassword} placeholder="Min. 6 characters" secure />
      <Field label="Confirm Password" value={confirm} onChangeText={setConfirm} placeholder="Re-enter password" secure />
      <PrimaryBtn label="Create Account" onPress={handleSignup} loading={loading} />
      <LinkBtn label="Already have an account? Sign In" onPress={onLogin} />
    </View>
  );
}

// ── Password Reset ────────────────────────────────────────────────────────────
function ResetView({ onBack }) {
  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);

  const handleReset = useCallback(async () => {
    if (!isValidEmail(email)) { Alert.alert('Invalid Email', 'Enter a valid email.'); return; }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSent(true);
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not send reset email.');
    } finally {
      setLoading(false);
    }
  }, [email]);

  return (
    <View style={ev.wrap}>
      <TouchableOpacity onPress={onBack} style={ev.back}><Text style={ev.backTxt}>← Back</Text></TouchableOpacity>
      <Text style={ev.h1}>Reset Password</Text>
      <Text style={ev.sub}>We'll send a link to your email</Text>
      {sent ? (
        <View style={{ alignItems: 'center', paddingVertical: 36, gap: 12 }}>
          <Text style={{ fontSize: 40 }}>✅</Text>
          <Text style={{ fontSize: 15, color: C.t1, textAlign: 'center', lineHeight: 22 }}>
            Reset link sent! Check your inbox.
          </Text>
          <LinkBtn label="Back to Sign In" onPress={onBack} />
        </View>
      ) : (
        <>
          <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" />
          <PrimaryBtn label="Send Reset Link" onPress={handleReset} loading={loading} />
        </>
      )}
    </View>
  );
}

const ev = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: 28, paddingTop: 16 },
  back: { marginBottom: 20 },
  backTxt: { fontSize: 15, color: C.blue, fontWeight: '500' },
  h1: { fontSize: 28, fontWeight: '800', color: C.t1, marginBottom: 4, letterSpacing: -0.5 },
  sub: { fontSize: 14, color: C.t3, marginBottom: 24 },
});

// ── Root ──────────────────────────────────────────────────────────────────────
export default function LoginScreen({ navigation }) {
  const [screen,        setScreen]        = useState('landing');
  const [googleLoading, setGoogleLoading] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId:    GOOGLE_EXPO_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    iosClientId:     GOOGLE_IOS_CLIENT_ID,
  });

  // Handle Google OAuth response
  useEffect(() => {
    if (!response) return;
    if (response.type === 'success') {
      const { id_token } = response.params || {};
      if (!id_token) { setGoogleLoading(false); return; }
      const credential = GoogleAuthProvider.credential(id_token);
      setGoogleLoading(true);
      signInWithCredential(auth, credential)
        .then(() => navigation.replace('Main'))
        .catch((err) => Alert.alert('Google Sign-In Failed', err.message || 'Try again.'))
        .finally(() => setGoogleLoading(false));
    } else if (response.type === 'error') {
      setGoogleLoading(false);
      Alert.alert('Sign-In Cancelled', 'Google authentication was cancelled.');
    } else {
      setGoogleLoading(false);
    }
  }, [response, navigation]);

  // Auto-redirect if already signed in
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) navigation.replace('Main');
    });
    return unsub;
  }, [navigation]);

  const handleGoogle = useCallback(() => {
    setGoogleLoading(true);
    promptAsync().catch(() => setGoogleLoading(false));
  }, [promptAsync]);

  const goMain = useCallback(() => navigation.replace('Main'), [navigation]);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {screen === 'landing'       && <LandingView onGoogle={handleGoogle} onEmail={() => setScreen('emailLogin')} onSkip={goMain} googleLoading={googleLoading} />}
          {screen === 'emailLogin'    && <EmailLoginView onBack={() => setScreen('landing')} onSuccess={goMain} onSignup={() => setScreen('emailSignup')} onReset={() => setScreen('reset')} />}
          {screen === 'emailSignup'   && <EmailSignupView onBack={() => setScreen('landing')} onSuccess={goMain} onLogin={() => setScreen('emailLogin')} />}
          {screen === 'reset'         && <ResetView onBack={() => setScreen('emailLogin')} />}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
