// src/screens/SmsScreen.js — SMS Import Screen
import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, Switch, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../services/AppContext';
import { theme } from '../utils/theme';
import { CATEGORY_ICONS, parseMessage, generateTxId } from '../utils/parseEngine';

// ── SMS Permissions via Expo Modules ──────────────
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
  } catch (e) {
    console.warn('SMS permission error:', e);
    return false;
  }
}

export default function SmsScreen({ navigation }) {
  const { addTransaction, validTx, currency, overrides } = useApp();
  const [loading,       setLoading]       = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [parsed,        setParsed]        = useState([]);
  const [selected,      setSelected]      = useState(new Set());
  const [status,        setStatus]        = useState('');
  const [imported,      setImported]      = useState(0);

  const checkAndRequest = useCallback(async () => {
    if (Platform.OS !== 'android') {
      setStatus('SMS reading is Android-only');
      return false;
    }
    const granted = await requestSmsPermission();
    setHasPermission(granted);
    if (!granted) {
      Alert.alert(
        'SMS Permission Needed',
        'Allow SMS permission in phone Settings → Apps → ACR → Permissions → SMS',
        [{ text: 'OK' }]
      );
    }
    return granted;
  }, []);

  const scanSms = useCallback(async () => {
    const ok = await checkAndRequest();
    if (!ok) return;
    setLoading(true);
    setStatus('Reading SMS inbox...');
    try {
      // Use NativeModules for SMS reading
      const { NativeModules } = require('react-native');
      const SmsAndroid = NativeModules.SmsAndroid;
      if (!SmsAndroid) {
        // Simulate mode for testing
        setStatus('SMS module not available — showing demo data');
        const demo = [
          { body: 'Debited INR 1500.00 from HDFC at Amazon.in', date: Date.now() },
          { body: 'Rs.450 paid to Zomato via UPI. Ref: 4521897634', date: Date.now() - 86400000 },
          { body: 'Netflix subscription renewed. INR 649 charged', date: Date.now() - 172800000 },
        ];
        const results = demo.map(s => {
          const p = parseMessage(s.body, currency, overrides);
          if (!p) return null;
          return { ...p, id: generateTxId(), timestamp: new Date(s.date).toISOString(), source: 'SMS', raw: s.body, is_dup: false };
        }).filter(Boolean);
        setParsed(results);
        setSelected(new Set(results.map(t => t.id)));
        setStatus(`Demo: ${results.length} transactions found`);
        setLoading(false);
        return;
      }
      SmsAndroid.list(
        JSON.stringify({ box: 'inbox', maxCount: 200 }),
        (fail) => { setStatus('Failed: ' + fail); setLoading(false); },
        (count, smsList) => {
          const messages = JSON.parse(smsList);
          const results = [];
          for (const sms of messages) {
            const p = parseMessage(sms.body || '', currency, overrides);
            if (!p) continue;
            const tx = { ...p, id: generateTxId(), timestamp: new Date(parseInt(sms.date)).toISOString(), source: 'SMS', raw: (sms.body||'').slice(0,200), is_dup: false };
            if (!results.some(r => r.amount === tx.amount && r.type === tx.type)) results.push(tx);
          }
          const existingIds = new Set(validTx.map(t => t.id));
          const newOnly = results.filter(r => !existingIds.has(r.id));
          setParsed(newOnly);
          setSelected(new Set(newOnly.map(t => t.id)));
          setStatus(`Found ${newOnly.length} new transactions from ${messages.length} SMS`);
          setLoading(false);
        }
      );
    } catch (e) {
      setStatus('Error: ' + e.message);
      setLoading(false);
    }
  }, [currency, overrides, validTx, checkAndRequest]);

  const toggleSelect = useCallback((id) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
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
    setImported(p => p + count);
    setParsed(prev => prev.filter(t => !selected.has(t.id)));
    setSelected(new Set());
    setStatus(`✓ Imported ${count} transactions`);
    setLoading(false);
  }, [parsed, selected, addTransaction]);

  const fmt = v => currency + parseFloat(v || 0).toFixed(2);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={s.hd}>
          <Text style={s.title}>SMS Import</Text>
          <Text style={s.sub}>Auto-detect bank transactions</Text>
        </View>

        {Platform.OS === 'android' && !hasPermission && (
          <View style={s.permCard}>
            <Text style={s.permIco}>🔐</Text>
            <Text style={s.permTitle}>SMS Permission Needed</Text>
            <Text style={s.permSub}>Tap below to allow SMS reading. Your data stays on device only.</Text>
            <TouchableOpacity style={s.permBtn} onPress={checkAndRequest}>
              <Text style={s.permBtnTxt}>Grant SMS Permission</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={[s.scanBtn, loading && { opacity: 0.6 }]} onPress={scanSms} disabled={loading}>
          {loading ? <ActivityIndicator color="#0d0d0d"/> : <Text style={s.scanBtnTxt}>📩 Scan SMS History (Last 200)</Text>}
        </TouchableOpacity>

        {!!status && <Text style={s.statusTxt}>{status}</Text>}

        {parsed.length > 0 && (
          <View style={s.results}>
            <View style={s.resultsHd}>
              <Text style={s.resultsTitle}>{parsed.length} transactions found</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity onPress={() => setSelected(new Set(parsed.map(t => t.id)))}>
                  <Text style={s.selLink}>All</Text>
                </TouchableOpacity>
                <Text style={{ color: theme.colors.t4 }}>/</Text>
                <TouchableOpacity onPress={() => setSelected(new Set())}>
                  <Text style={s.selLink}>None</Text>
                </TouchableOpacity>
              </View>
            </View>
            {parsed.map(tx => (
              <TouchableOpacity key={tx.id} onPress={() => toggleSelect(tx.id)}
                style={[s.txRow, selected.has(tx.id) && s.txRowOn]}>
                <View style={[s.cb, selected.has(tx.id) && s.cbOn]}>
                  {selected.has(tx.id) && <Text style={s.cbMark}>✓</Text>}
                </View>
                <View style={s.txAv}><Text style={{ fontSize: 16 }}>{CATEGORY_ICONS[tx.category]||'📦'}</Text></View>
                <View style={s.txInfo}>
                  <Text style={s.txNm}>{tx.merchant}</Text>
                  <Text style={s.txMt}>{tx.category}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[s.txAmt, { color: tx.type==='debit'?theme.colors.red:theme.colors.mint }]}>
                    {tx.type==='debit'?'−':'+' }{fmt(tx.amount)}
                  </Text>
                  <Text style={s.txTime}>{new Date(tx.timestamp).toLocaleDateString()}</Text>
                </View>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[s.importBtn, !selected.size && { opacity: 0.5 }]}
              onPress={importSelected} disabled={!selected.size || loading}>
              <Text style={s.importBtnTxt}>Import {selected.size} Transaction{selected.size !== 1 ? 's' : ''}</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: theme.colors.bg },
  hd:          { padding: 20, paddingBottom: 14 },
  title:       { fontSize: 28, fontWeight: '800', color: theme.colors.t1, letterSpacing: -0.8 },
  sub:         { fontSize: 13, color: theme.colors.t3, marginTop: 3 },
  permCard:    { marginHorizontal: 16, marginBottom: 14, backgroundColor: theme.colors.bg2, borderWidth: 1, borderColor: theme.colors.redBdr, borderRadius: 20, padding: 20, alignItems: 'center' },
  permIco:     { fontSize: 32, marginBottom: 8 },
  permTitle:   { fontSize: 16, fontWeight: '700', color: theme.colors.t1, marginBottom: 6 },
  permSub:     { fontSize: 13, color: theme.colors.t2, textAlign: 'center', lineHeight: 18, marginBottom: 14 },
  permBtn:     { backgroundColor: theme.colors.mint, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
  permBtnTxt:  { fontSize: 14, fontWeight: '700', color: '#0d0d0d' },
  scanBtn:     { marginHorizontal: 16, marginBottom: 12, height: 52, borderRadius: 18, backgroundColor: theme.colors.mint, alignItems: 'center', justifyContent: 'center' },
  scanBtnTxt:  { fontSize: 15, fontWeight: '700', color: '#0d0d0d' },
  statusTxt:   { textAlign: 'center', fontSize: 13, color: theme.colors.t2, marginBottom: 14, paddingHorizontal: 20 },
  results:     { marginHorizontal: 16 },
  resultsHd:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  resultsTitle:{ fontSize: 14, fontWeight: '700', color: theme.colors.t1 },
  selLink:     { fontSize: 13, color: theme.colors.mint, fontWeight: '600' },
  txRow:       { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, marginBottom: 5, backgroundColor: theme.colors.bg2, borderWidth: 1, borderColor: 'transparent' },
  txRowOn:     { borderColor: theme.colors.mintBdr, backgroundColor: theme.colors.mintBg },
  cb:          { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: theme.colors.t4, alignItems: 'center', justifyContent: 'center' },
  cbOn:        { backgroundColor: theme.colors.mint, borderColor: theme.colors.mint },
  cbMark:      { fontSize: 11, fontWeight: '800', color: '#0d0d0d' },
  txAv:        { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.bg3, alignItems: 'center', justifyContent: 'center' },
  txInfo:      { flex: 1 },
  txNm:        { fontSize: 13, fontWeight: '600', color: theme.colors.t1 },
  txMt:        { fontSize: 11, color: theme.colors.t3 },
  txAmt:       { fontSize: 13, fontWeight: '700' },
  txTime:      { fontSize: 10, color: theme.colors.t3, marginTop: 2 },
  importBtn:   { marginTop: 14, height: 52, borderRadius: 18, backgroundColor: theme.colors.mint, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  importBtnTxt:{ fontSize: 15, fontWeight: '700', color: '#0d0d0d' },
});
