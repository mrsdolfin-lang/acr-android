// src/screens/LoginScreen.js
import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../services/ThemeContext';
import { auth, onAuthStateChanged } from '../services/firebase';

export default function LoginScreen({ navigation }) {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      if (user) navigation.replace('Main');
    });
    return unsub;
  }, []);

  const handleGoogle = async () => {
    // Google Sign-In requires expo-auth-session
    // This is a placeholder - Firebase Auth works after proper setup
    setLoading(true);
    Alert.alert(
      'Google Sign-In',
      'To enable Google login:\n\n1. Firebase Console → Authentication → Sign-in methods → Google → Enable\n\n2. Add your SHA-1 fingerprint in Firebase Project Settings\n\nFor now, use "Continue without account" — all features work locally.',
      [{text:'OK', onPress:()=>setLoading(false)}]
    );
  };

  const skip = () => navigation.replace('Main');

  return (
    <SafeAreaView style={[s.safe, {backgroundColor:colors.bg}]}>
      <View style={s.container}>

        <View style={s.logoWrap}>
          <Text style={[s.logoTxt, {color:colors.t1}]}>Acrom</Text>
          <Text style={[s.logoDot, {color:colors.mint}]}>.</Text>
        </View>

        <Text style={[s.tagline, {color:colors.t2}]}>
          Automatic expense tracking.{'\n'}Your money, your data, always.
        </Text>

        <View style={s.feats}>
          {[
            ['📩','Auto SMS capture'],
            ['☁️','Cloud sync'],
            ['📊','Smart analytics'],
            ['🛡','Private & secure'],
          ].map(([ico,txt],i)=>(
            <View key={i} style={[s.feat, {backgroundColor:colors.bg2, borderColor:colors.border}]}>
              <Text style={s.featIco}>{ico}</Text>
              <Text style={[s.featTxt, {color:colors.t2}]}>{txt}</Text>
            </View>
          ))}
        </View>

        {/* Google Sign-In button */}
        <TouchableOpacity
          style={[s.googleBtn, loading&&{opacity:0.7}]}
          onPress={handleGoogle}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#1f1f1f"/>
          ) : (
            <View style={s.googleInner}>
              <Text style={s.googleG}>G</Text>
              <Text style={s.googleTxt}>Continue with Google</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={s.divRow}>
          <View style={[s.divLine, {backgroundColor:colors.border}]}/>
          <Text style={[s.divTxt, {color:colors.t4}]}>  or  </Text>
          <View style={[s.divLine, {backgroundColor:colors.border}]}/>
        </View>

        <TouchableOpacity
          style={[s.skipBtn, {borderColor:colors.border2}]}
          onPress={skip}
        >
          <Text style={[s.skipTxt, {color:colors.t2}]}>
            Use without account (local only)
          </Text>
        </TouchableOpacity>

        <Text style={[s.note, {color:colors.t4}]}>
          Your data is stored locally on device.{'\n'}
          Sign in to sync across devices.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:        {flex:1},
  container:   {flex:1, paddingHorizontal:28, justifyContent:'center'},
  logoWrap:    {flexDirection:'row', alignItems:'baseline', justifyContent:'center', marginBottom:8},
  logoTxt:     {fontSize:48, fontWeight:'900', letterSpacing:-1.5},
  logoDot:     {fontSize:48, fontWeight:'900'},
  tagline:     {fontSize:15, textAlign:'center', lineHeight:22, marginBottom:32},
  feats:       {flexDirection:'row', flexWrap:'wrap', gap:10, marginBottom:32},
  feat:        {flex:1, minWidth:'45%', borderWidth:1, borderRadius:16, padding:14, alignItems:'center'},
  featIco:     {fontSize:22, marginBottom:6},
  featTxt:     {fontSize:12, textAlign:'center', lineHeight:16},
  googleBtn:   {height:52, backgroundColor:'#ffffff', borderRadius:16, alignItems:'center', justifyContent:'center', marginBottom:12, shadowColor:'#000', shadowOffset:{width:0,height:2}, shadowOpacity:0.15, shadowRadius:4, elevation:3},
  googleInner: {flexDirection:'row', alignItems:'center', gap:10},
  googleG:     {fontSize:18, fontWeight:'800', color:'#4285F4'},
  googleTxt:   {fontSize:15, fontWeight:'600', color:'#1f1f1f'},
  divRow:      {flexDirection:'row', alignItems:'center', marginBottom:12},
  divLine:     {flex:1, height:1},
  divTxt:      {fontSize:12},
  skipBtn:     {height:44, borderWidth:1, borderRadius:14, alignItems:'center', justifyContent:'center', marginBottom:16},
  skipTxt:     {fontSize:14},
  note:        {fontSize:11, textAlign:'center', lineHeight:16},
});
