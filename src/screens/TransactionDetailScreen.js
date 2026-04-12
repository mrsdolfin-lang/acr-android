// src/screens/TransactionDetailScreen.js
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../services/AppContext';
import { theme } from '../utils/theme';
import { CATEGORY_ICONS } from '../utils/parseEngine';

const CATS = ['Food','Shopping','Transport','Utilities','Recharge','Entertainment','Health','Education','SaaS','Others'];

export default function TransactionDetailScreen({ route, navigation }) {
  const { txId }    = route.params;
  const { validTx, currency, overrideCategory, deleteTransaction } = useApp();
  const tx          = validTx.find(t => t.id === txId);
  const [selCat, setSelCat] = useState(tx?.category || 'Others');

  if (!tx) { navigation.goBack(); return null; }

  const fmt     = v => currency + parseFloat(v || 0).toFixed(2);
  const isDebit = tx.type === 'debit';

  const handleOverride = async () => {
    await overrideCategory(tx.id, selCat);
    navigation.goBack();
  };

  const handleDelete = () => {
    Alert.alert('Delete Transaction', 'This cannot be undone.', [
      { text: 'Cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await deleteTransaction(tx.id);
        navigation.goBack();
      }},
    ]);
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.hd}>
        <Text style={s.title}>Detail</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.close}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
        {/* Hero */}
        <View style={s.hero}>
          <Text style={s.heroIco}>{CATEGORY_ICONS[tx.category] || '📦'}</Text>
          <Text style={[s.heroAmt, { color: isDebit ? theme.colors.red : theme.colors.mint }]}>
            {isDebit ? '−' : '+'}{fmt(tx.amount)}
          </Text>
          <Text style={s.heroMerch}>{tx.merchant}</Text>
          <Text style={s.heroTime}>{new Date(tx.timestamp).toLocaleString()}</Text>
          <View style={s.heroChips}>
            {[tx.category, tx.source || 'Manual', tx.type].map((c, i) => (
              <View key={i} style={[s.chip, i === 2 && { backgroundColor: isDebit ? theme.colors.redBg : theme.colors.mintBg, borderColor: isDebit ? theme.colors.redBdr : theme.colors.mintBdr }]}>
                <Text style={[s.chipTxt, i === 2 && { color: isDebit ? theme.colors.red : theme.colors.mint }]}>{c}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Raw SMS */}
        {!!tx.raw && (
          <View style={s.rawCard}>
            <Text style={s.rawLabel}>Original Message</Text>
            <Text style={s.rawTxt}>{tx.raw}</Text>
          </View>
        )}

        {/* Override Category */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Override Category</Text>
          <Text style={s.sectionSub}>Merchant "{tx.merchant}" will always map to this category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {CATS.map(c => (
                <TouchableOpacity key={c} style={[s.catBtn, selCat === c && s.catBtnOn]} onPress={() => setSelCat(c)}>
                  <Text style={{ fontSize: 16, marginBottom: 2 }}>{CATEGORY_ICONS[c] || '📦'}</Text>
                  <Text style={[s.catTxt, selCat === c && s.catTxtOn]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Buttons */}
        <View style={s.btnRow}>
          <TouchableOpacity style={s.btnDanger} onPress={handleDelete}>
            <Text style={s.btnDangerTxt}>Delete</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.btnPrimary} onPress={handleOverride}>
            <Text style={s.btnPrimaryTxt}>Save Category →</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: theme.colors.bg2 },
  hd:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 10 },
  title:        { fontSize: 22, fontWeight: '800', color: theme.colors.t1 },
  close:        { fontSize: 18, color: theme.colors.t2, padding: 4 },
  hero:         { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 20 },
  heroIco:      { fontSize: 56, marginBottom: 10 },
  heroAmt:      { fontSize: 38, fontWeight: '800', letterSpacing: -1.2, marginBottom: 6 },
  heroMerch:    { fontSize: 18, fontWeight: '700', color: theme.colors.t1, marginBottom: 4 },
  heroTime:     { fontSize: 13, color: theme.colors.t3, marginBottom: 12 },
  heroChips:    { flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'center' },
  chip:         { backgroundColor: theme.colors.bg4, borderWidth: 1, borderColor: theme.colors.border2, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  chipTxt:      { fontSize: 12, fontWeight: '600', color: theme.colors.t2 },
  rawCard:      { marginHorizontal: 16, marginBottom: 16, backgroundColor: theme.colors.bg3, borderRadius: 16, padding: 14 },
  rawLabel:     { fontSize: 11, fontWeight: '700', color: theme.colors.t3, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  rawTxt:       { fontSize: 12, color: theme.colors.t2, lineHeight: 18 },
  section:      { marginHorizontal: 16, marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.t1, marginBottom: 3 },
  sectionSub:   { fontSize: 12, color: theme.colors.t3 },
  catBtn:       { alignItems: 'center', width: 70, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border2, backgroundColor: theme.colors.bg3 },
  catBtnOn:     { backgroundColor: theme.colors.mint, borderColor: 'transparent' },
  catTxt:       { fontSize: 10, fontWeight: '600', color: theme.colors.t2 },
  catTxtOn:     { color: '#0d0d0d' },
  btnRow:       { flexDirection: 'row', gap: 10, marginHorizontal: 16 },
  btnDanger:    { flex: 1, height: 50, borderRadius: 16, backgroundColor: theme.colors.redBg, borderWidth: 1, borderColor: theme.colors.redBdr, alignItems: 'center', justifyContent: 'center' },
  btnDangerTxt: { fontSize: 15, fontWeight: '700', color: theme.colors.red },
  btnPrimary:   { flex: 2, height: 50, borderRadius: 16, backgroundColor: theme.colors.mint, alignItems: 'center', justifyContent: 'center' },
  btnPrimaryTxt:{ fontSize: 15, fontWeight: '700', color: '#0d0d0d' },
});
