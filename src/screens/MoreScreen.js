// src/screens/MoreScreen.js
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, Switch, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../services/AppContext';
import { theme } from '../utils/theme';

const CURRENCIES = [
  { sym: '$', label: 'USD $' }, { sym: '€', label: 'EUR €' },
  { sym: '£', label: 'GBP £' }, { sym: '₹', label: 'INR ₹' },
  { sym: 'AED', label: 'AED' },  { sym: 'CAD', label: 'CAD' },
  { sym: 'AUD', label: 'AUD' },  { sym: '¥', label: 'JPY ¥' },
];

export default function MoreScreen({ navigation }) {
  const { user, validTx, currency, budgets, goals, overrides, setCurrency, signOut, doSync, syncing } = useApp();
  const [smsOn, setSmsOn] = useState(true);

  const exportData = async () => {
    try {
      const data = JSON.stringify({
        transactions: validTx,
        overrides,
        budgets,
        goals,
        currency,
        exportDate: new Date().toISOString()
      }, null, 2);
      await Share.share({
        message: data,
        title: 'ACR Backup',
      });
    } catch (e) {
      Alert.alert('Export Failed', e.message);
    }
  };

  const exportCSV = async () => {
    try {
      const header = 'Date,Merchant,Category,Type,Amount,Currency,Source\n';
      const rows = validTx.map(t =>
        `${new Date(t.timestamp).toLocaleDateString()},"${t.merchant}",${t.category},${t.type},${t.amount.toFixed(2)},${t.currency||currency},${t.source||'Manual'}`
      ).join('\n');
      await Share.share({ message: header + rows, title: 'ACR Transactions CSV' });
    } catch (e) {
      Alert.alert('Export Failed', e.message);
    }
  };

  const Row = ({ icon, iconBg, title, sub, right, onPress, danger }) => (
    <TouchableOpacity style={s.sr} onPress={onPress} disabled={!onPress} activeOpacity={0.7}>
      <View style={s.srL}>
        <View style={[s.srIco, { backgroundColor: iconBg || theme.colors.bg4 }]}>
          <Text style={{ fontSize: 16 }}>{icon}</Text>
        </View>
        <View style={s.srInfo}>
          <Text style={[s.srTitle, danger && { color: theme.colors.red }]}>{title}</Text>
          {sub ? <Text style={s.srSub}>{sub}</Text> : null}
        </View>
      </View>
      {right || (onPress ? <Text style={s.srArrow}>›</Text> : null)}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.hd}><Text style={s.title}>More</Text></View>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Account */}
        <View style={s.sg}>
          <Text style={s.sgLbl}>Account</Text>
          <View style={s.sgCard}>
            {user ? (
              <>
                <View style={[s.sr, { borderBottomWidth:1, borderBottomColor:theme.colors.border }]}>
                  <View style={s.srL}>
                    <View style={[s.srIco, { backgroundColor: theme.colors.mintBg }]}>
                      <Text style={{ fontSize: 16 }}>👤</Text>
                    </View>
                    <View style={s.srInfo}>
                      <Text style={s.srTitle}>{user.displayName || 'User'}</Text>
                      <Text style={s.srSub}>{user.email}</Text>
                    </View>
                  </View>
                  <View style={[s.badge]}><Text style={s.badgeTxt}>☁ Cloud</Text></View>
                </View>
                <Row icon="↺" iconBg={theme.colors.mintBg} title="Sync Now"
                  sub={syncing ? 'Syncing…' : 'Pull from cloud'} onPress={doSync}/>
                <Row icon="🚪" iconBg={theme.colors.redBg} title="Sign Out" danger
                  onPress={() => Alert.alert('Sign Out?', '', [
                    { text: 'Cancel' },
                    { text: 'Sign Out', onPress: signOut }
                  ])}/>
              </>
            ) : (
              <Row icon="🔐" iconBg={theme.colors.blueBg} title="Sign In with Google"
                sub="Enable cloud sync" onPress={() => navigation.navigate('Login')}/>
            )}
          </View>
        </View>

        {/* Storage bar */}
        <View style={s.storBar}>
          <Text style={{ fontSize: 14 }}>{user ? '☁️' : '📱'}</Text>
          <Text style={s.storInfo}>{user ? `Cloud + Local · ${validTx.length} txns` : `Local only · ${validTx.length} txns`}</Text>
          <Text style={[s.storSt, { color: user ? theme.colors.mint : theme.colors.yellow }]}>
            {user ? 'Cloud' : 'Local'}
          </Text>
        </View>

        {/* Currency */}
        <View style={s.sg}>
          <Text style={s.sgLbl}>Currency</Text>
          <View style={s.sgCard}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ padding: 12, gap: 8 }}>
              {CURRENCIES.map(c => (
                <TouchableOpacity key={c.sym}
                  style={[s.curBtn, currency === c.sym && s.curBtnOn]}
                  onPress={() => setCurrency(c.sym)}>
                  <Text style={[s.curTxt, currency === c.sym && s.curTxtOn]}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

        {/* SMS */}
        <View style={s.sg}>
          <Text style={s.sgLbl}>Capture</Text>
          <View style={s.sgCard}>
            <Row icon="📩" iconBg={theme.colors.blueBg} title="SMS Listener"
              sub="Go to SMS tab to scan"
              right={<Switch value={smsOn} onValueChange={setSmsOn}
                trackColor={{ false: theme.colors.bg4, true: theme.colors.mint }}
                thumbColor="#fff"/>}/>
          </View>
        </View>

        {/* Data */}
        <View style={s.sg}>
          <Text style={s.sgLbl}>Data</Text>
          <View style={s.sgCard}>
            <Row icon="📤" iconBg={theme.colors.blueBg} title="Export JSON" sub="Share backup" onPress={exportData}/>
            <Row icon="📊" iconBg={theme.colors.mintBg} title="Export CSV" sub="Share as spreadsheet" onPress={exportCSV}/>
            <Row icon="🗑" iconBg={theme.colors.redBg} title="Clear All Data" danger
              onPress={() => Alert.alert('Delete Everything?', 'Cannot be undone.', [
                { text: 'Cancel' },
                { text: 'Delete All', style: 'destructive', onPress: () => {} }
              ])}/>
          </View>
        </View>

        {/* About */}
        <View style={s.sg}>
          <Text style={s.sgLbl}>About</Text>
          <View style={s.sgCard}>
            <View style={s.sr}>
              <View style={s.srInfo}>
                <Text style={s.srTitle}>ACR AutoExpense v4.0</Text>
                <Text style={s.srSub}>Smart Parsing · Private · Local + Cloud</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={{ height: 30 }}/>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: theme.colors.bg },
  hd:        { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14 },
  title:     { fontSize: 28, fontWeight: '800', color: theme.colors.t1, letterSpacing: -0.8 },
  sg:        { marginHorizontal: 16, marginBottom: 14 },
  sgLbl:     { fontSize: 11, fontWeight: '700', color: theme.colors.t3, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8, paddingLeft: 4 },
  sgCard:    { backgroundColor: theme.colors.bg2, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 20, overflow: 'hidden' },
  sr:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 13 },
  srL:       { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  srIco:     { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  srInfo:    { flex: 1 },
  srTitle:   { fontSize: 14, fontWeight: '500', color: theme.colors.t1, marginBottom: 1 },
  srSub:     { fontSize: 12, color: theme.colors.t3 },
  srArrow:   { fontSize: 20, color: theme.colors.t4 },
  badge:     { backgroundColor: theme.colors.mintBg, borderWidth: 1, borderColor: theme.colors.mintBdr, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeTxt:  { fontSize: 9, fontWeight: '700', color: theme.colors.mint },
  storBar:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginBottom: 14, backgroundColor: theme.colors.bg3, borderRadius: 14, padding: 12 },
  storInfo:  { flex: 1, fontSize: 12, color: theme.colors.t2 },
  storSt:    { fontSize: 11, fontWeight: '700' },
  curBtn:    { height: 34, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: theme.colors.border2, alignItems: 'center', justifyContent: 'center' },
  curBtnOn:  { backgroundColor: theme.colors.mint, borderColor: 'transparent' },
  curTxt:    { fontSize: 12, fontWeight: '600', color: theme.colors.t2 },
  curTxtOn:  { color: '#0d0d0d' },
});
