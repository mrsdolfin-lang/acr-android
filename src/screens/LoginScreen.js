// src/screens/LoginScreen.js
import React, { useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../utils/theme';
import { auth, onAuthStateChanged } from '../services/firebase';

export default function LoginScreen({ navigation }) {

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      if (user) navigation.replace('Main');
    });
    return unsub;
  }, []);

  const skipLogin = () => navigation.replace('Main');

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.container}>

        {/* Logo */}
        <View style={s.logoWrap}>
          <Text style={s.logoText}>Acrom</Text>
          <Text style={s.logoDot}>.</Text>
        </View>

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

        <TouchableOpacity style={s.skipBtn} onPress={skipLogin}>
          <Text style={s.skipTxt}>Continue without account →</Text>
        </TouchableOpacity>

        <Text style={s.note}>
          Cloud sync aur Google login ke liye Firebase setup complete karo.{'\n'}
          Local data always saved on device.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:       { flex:1, backgroundColor: theme.colors.bg },
  container:  { flex:1, paddingHorizontal:28, justifyContent:'center' },
  logoWrap:   { flexDirection:'row', alignItems:'baseline', justifyContent:'center', marginBottom:8 },
  logoText:   { fontSize:48, fontWeight:'900', color:theme.colors.t1, letterSpacing:-1.5 },
  logoDot:    { fontSize:48, fontWeight:'900', color:theme.colors.mint },
  tagline:    { fontSize:15, color:theme.colors.t2, textAlign:'center', lineHeight:22, marginBottom:36 },
  feats:      { flexDirection:'row', flexWrap:'wrap', gap:10, marginBottom:40 },
  feat:       { flex:1, minWidth:'45%', backgroundColor:theme.colors.bg2, borderWidth:1, borderColor:theme.colors.border, borderRadius:16, padding:14, alignItems:'center' },
  featIco:    { fontSize:22, marginBottom:6 },
  featTxt:    { fontSize:12, color:theme.colors.t2, textAlign:'center', lineHeight:16 },
  skipBtn:    { height:52, backgroundColor:theme.colors.mint, borderRadius:16, alignItems:'center', justifyContent:'center', marginBottom:16 },
  skipTxt:    { fontSize:15, fontWeight:'700', color:'#0d0d0d' },
  note:       { fontSize:11, color:theme.colors.t4, textAlign:'center', lineHeight:17 },
});
