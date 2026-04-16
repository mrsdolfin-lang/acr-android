// src/screens/SmsScreen.js
import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../services/AppContext';
import { useTheme } from '../services/ThemeContext';
import { CATEGORY_ICONS, parseMessage, generateTxId } from '../utils/parseEngine';

async function requestSmsPermission() {
  if (Platform.OS !== 'android') return false;
  try {
    const { PermissionsAndroid } = require('react-native');
    const results = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.READ_SMS,
      PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
    ]);
    return (
      results['android.permission.READ_SMS']    === 'granted' &&
      results['android.permission.RECEIVE_SMS'] === 'granted'
    );
  } catch (e) { return false; }
}

export default function SmsScreen({ navigation }) {
  const { addTransaction, validTx, currency, overrides } = useApp();
  const [loading,  setLoading]  = useState(false);
  const [parsed,   setParsed]   = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [status,   setStatus]   = useState('');
  const scannedRef = useRef(false); // prevent double scan

  const fmt = v => currency + parseFloat(v || 0).toFixed(2);

  const scanSms = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setStatus('Reading SMS...');

    if (Platform.OS === 'android') {
      const ok = await requestSmsPermission();
      if (!ok) {
        Alert.alert('Permission needed', 'Allow SMS in Settings → Apps → ACROM → Permissions');
        setLoading(false);
        setStatus('');
        return;
      }
      try {
        const { NativeModules } = require('react-native');
        const SmsAndroid = NativeModules.SmsAndroid;
        if (SmsAndroid) {
          SmsAndroid.list(
            JSON.stringify({ box: 'inbox', maxCount: 200 }),
            (fail) => { setStatus('Failed: ' + fail); setLoading(false); },
            (count, smsList) => {
              const messages = JSON.parse(smsList);
              const results = [];
              const existingIds = new Set(validTx.map(t => t.id));
              for (const sms of messages) {
                const p = parseMessage(sms.body || '', currency, overrides);
                if (!p) continue;
                const tx = {
                  ...p,
                  id: generateTxId(),
                  timestamp: new Date(parseInt(sms.date)).toISOString(),
                  source: 'SMS',
                  raw: (sms.body||'').slice(0,200),
                  is_dup: false,
                };
                if (!existingIds.has(tx.id) && !results.some(r => r.amount===tx.amount && r.type===tx.type && Math.abs(new Date(r.timestamp)-new Date(tx.timestamp))<120000)) {
                  results.push(tx);
                }
              }
              setParsed(results);
              setSelected(new Set(results.map(t => t.id)));
              setStatus(`Found ${results.length} new transactions`);
              setLoading(false);
            }
          );
          return;
        }
      } catch(e) {}
    }

    // No real SMS — show empty, no demo data added automatically
    setParsed([]);
    setSelected(new Set());
    setStatus('No bank SMS found. Real SMS works on Android with permission.');
    setLoading(false);
  }, [loading, currency, overrides, validTx]);

  const toggleSelect = useCallback((id) => {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }, []);

  const importSelected = useCallback(async () => {
    const toImport = parsed.filter(t => selected.has(t.id));
    if (!toImport.length) return;
    setLoading(true);
    let count = 0;
    for (const tx of toImport) {
      const r = await addTransaction(tx);
      if (r.success) count++;
    }
    setParsed(prev => prev.filter(t => !selected.has(t.id)));
    setSelected(new Set());
    setStatus(`✓ Imported ${count} transactions`);
    setLoading(false);
  }, [parsed, selected, addTransaction]);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={s.hd}>
          <Text style={s.title}>SMS Import</Text>
          <Text style={s.sub}>Auto-detect bank transactions from SMS</Text>
        </View>

        <TouchableOpacity
          style={[s.scanBtn, loading && {opacity:0.6}]}
          onPress={scanSms}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#0d0d0d"/>
            : <Text style={s.scanBtnTxt}>📩 Scan SMS History (Last 200)</Text>
          }
        </TouchableOpacity>

        {!!status && <Text style={s.statusTxt}>{status}</Text>}

        {parsed.length > 0 && (
          <View style={s.results}>
            <View style={s.resultsHd}>
              <Text style={s.resultsTitle}>{parsed.length} transactions found</Text>
              <View style={{flexDirection:'row',gap:8}}>
                <TouchableOpacity onPress={()=>setSelected(new Set(parsed.map(t=>t.id)))}>
                  <Text style={s.selLink}>All</Text>
                </TouchableOpacity>
                <Text style={{color:theme.colors.t4}}>/</Text>
                <TouchableOpacity onPress={()=>setSelected(new Set())}>
                  <Text style={s.selLink}>None</Text>
                </TouchableOpacity>
              </View>
            </View>

            {parsed.map(tx => (
              <TouchableOpacity
                key={tx.id}
                onPress={() => toggleSelect(tx.id)}
                style={[s.txRow, selected.has(tx.id) && s.txRowOn]}
              >
                <View style={[s.cb, selected.has(tx.id) && s.cbOn]}>
                  {selected.has(tx.id) && <Text style={s.cbMark}>✓</Text>}
                </View>
                <View style={s.txAv}>
                  <Text style={{fontSize:16}}>{CATEGORY_ICONS[tx.category]||'📦'}</Text>
                </View>
                <View style={s.txInfo}>
                  <Text style={s.txNm}>{tx.merchant}</Text>
                  <Text style={s.txMt}>{tx.category}</Text>
                </View>
                <View style={{alignItems:'flex-end'}}>
                  <Text style={[s.txAmt,{color:tx.type==='debit'?theme.colors.red:theme.colors.mint}]}>
                    {tx.type==='debit'?'−':'+' }{fmt(tx.amount)}
                  </Text>
                  <Text style={s.txTime}>{new Date(tx.timestamp).toLocaleDateString()}</Text>
                </View>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={[s.importBtn, !selected.size && {opacity:0.5}]}
              onPress={importSelected}
              disabled={!selected.size || loading}
            >
              <Text style={s.importBtnTxt}>
                Import {selected.size} Transaction{selected.size!==1?'s':''}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={{height:30}}/>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         {flex:1, backgroundColor:theme.colors.bg},
  hd:           {padding:20, paddingBottom:14},
  title:        {fontSize:28, fontWeight:'800', color:theme.colors.t1, letterSpacing:-0.8},
  sub:          {fontSize:13, color:theme.colors.t3, marginTop:3},
  scanBtn:      {marginHorizontal:16, marginBottom:12, height:52, borderRadius:18, backgroundColor:theme.colors.mint, alignItems:'center', justifyContent:'center'},
  scanBtnTxt:   {fontSize:15, fontWeight:'700', color:'#0d0d0d'},
  statusTxt:    {textAlign:'center', fontSize:13, color:theme.colors.t2, marginBottom:14, paddingHorizontal:20},
  results:      {marginHorizontal:16},
  resultsHd:    {flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:10},
  resultsTitle: {fontSize:14, fontWeight:'700', color:theme.colors.t1},
  selLink:      {fontSize:13, color:theme.colors.mint, fontWeight:'600'},
  txRow:        {flexDirection:'row', alignItems:'center', gap:10, padding:12, borderRadius:14, marginBottom:5, backgroundColor:theme.colors.bg2, borderWidth:1, borderColor:'transparent'},
  txRowOn:      {borderColor:theme.colors.mintBdr, backgroundColor:theme.colors.mintBg},
  cb:           {width:22, height:22, borderRadius:6, borderWidth:2, borderColor:theme.colors.t4, alignItems:'center', justifyContent:'center'},
  cbOn:         {backgroundColor:theme.colors.mint, borderColor:theme.colors.mint},
  cbMark:       {fontSize:11, fontWeight:'800', color:'#0d0d0d'},
  txAv:         {width:36, height:36, borderRadius:18, backgroundColor:theme.colors.bg3, alignItems:'center', justifyContent:'center'},
  txInfo:       {flex:1},
  txNm:         {fontSize:13, fontWeight:'600', color:theme.colors.t1},
  txMt:         {fontSize:11, color:theme.colors.t3},
  txAmt:        {fontSize:13, fontWeight:'700'},
  txTime:       {fontSize:10, color:theme.colors.t3, marginTop:2},
  importBtn:    {marginTop:14, height:52, borderRadius:18, backgroundColor:theme.colors.mint, alignItems:'center', justifyContent:'center', marginBottom:8},
  importBtnTxt: {fontSize:15, fontWeight:'700', color:'#0d0d0d'},
});
