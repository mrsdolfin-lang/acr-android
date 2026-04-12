// src/screens/AddTransactionScreen.js
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../services/AppContext';
import { parseMessage, generateTxId, CATEGORIES } from '../utils/parseEngine';
import { theme } from '../utils/theme';

const CATS = ['Food','Shopping','Transport','Utilities','Recharge','Entertainment','Health','Education','SaaS','Others'];

export default function AddTransactionScreen({ navigation }) {
  const { addTransaction, currency, overrides } = useApp();
  const [rawText, setRawText] = useState('');
  const [parsed,  setParsed]  = useState(null);
  const [amount,  setAmount]  = useState('');
  const [type,    setType]    = useState('debit');
  const [merchant,setMerchant]= useState('');
  const [cat,     setCat]     = useState('Others');
  const [source,  setSource]  = useState('Manual');
  const [hint,    setHint]    = useState('');

  const tryParse = (text) => {
    const r = parseMessage(text, currency, overrides);
    if (r) {
      setParsed(r);
      setAmount(String(r.amount));
      setType(r.type);
      setMerchant(r.merchant);
      setCat(r.category);
      setHint(`✓ Parsed: ${r.type} ${currency}${r.amount} · ${r.merchant}`);
    } else {
      setParsed(null);
      setHint(text.length > 5 ? '⚠ Could not parse — fill manually' : '');
    }
  };

  const handleSave = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { Alert.alert('Enter a valid amount'); return; }
    const tx = {
      id:        generateTxId(),
      amount:    amt,
      currency,
      type,
      merchant:  merchant.trim() || 'Unknown',
      category:  cat,
      source,
      raw:       rawText.slice(0, 200),
      timestamp: new Date().toISOString(),
    };
    const result = await addTransaction(tx);
    if (result.success) {
      navigation.goBack();
    } else if (result.reason === 'duplicate') {
      Alert.alert('Duplicate', 'This transaction was already added (within 120 seconds).');
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.hd}>
        <Text style={s.title}>Add Transaction</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.close}>✕</Text>
        </TouchableOpacity>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 30 }}>

        {/* Auto Parse */}
        <Text style={s.lbl}>Auto-Parse SMS / Email</Text>
        <TextInput style={[s.input, { height: 80, textAlignVertical: 'top', paddingTop: 12 }]} multiline
          placeholder="Paste bank SMS or email text…" placeholderTextColor={theme.colors.t4}
          value={rawText} onChangeText={t => { setRawText(t); tryParse(t); }} />
        {!!hint && (
          <View style={[s.hint, { backgroundColor: parsed ? theme.colors.mintBg : theme.colors.yellowBg, borderColor: parsed ? theme.colors.mintBdr : theme.colors.yellowBdr }]}>
            <Text style={{ fontSize: 13, color: parsed ? theme.colors.mint : theme.colors.yellow }}>{hint}</Text>
          </View>
        )}

        <View style={s.divider}><View style={s.divLine}/><Text style={s.divTxt}>OR MANUAL</Text><View style={s.divLine}/></View>

        {/* Amount + Type */}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={s.lbl}>Amount</Text>
            <TextInput style={s.input} keyboardType="decimal-pad" placeholder="0.00"
              placeholderTextColor={theme.colors.t4} value={amount} onChangeText={setAmount} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.lbl}>Type</Text>
            <View style={s.typeRow}>
              {['debit','credit'].map(t => (
                <TouchableOpacity key={t} style={[s.typeBtn, type === t && s.typeBtnOn]} onPress={() => setType(t)}>
                  <Text style={[s.typeTxt, type === t && s.typeTxtOn]}>{t === 'debit' ? 'Spent' : 'Received'}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Merchant */}
        <Text style={s.lbl}>Merchant</Text>
        <TextInput style={s.input} placeholder="Amazon, Zomato, Netflix…"
          placeholderTextColor={theme.colors.t4} value={merchant} onChangeText={setMerchant} />

        {/* Category */}
        <Text style={s.lbl}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {CATS.map(c => (
              <TouchableOpacity key={c} style={[s.catBtn, cat === c && s.catBtnOn]} onPress={() => setCat(c)}>
                <Text style={[s.catTxt, cat === c && s.catTxtOn]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Source */}
        <Text style={s.lbl}>Source</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {['Manual','SMS','Email','Notification'].map(src => (
              <TouchableOpacity key={src} style={[s.catBtn, source === src && s.catBtnOn]} onPress={() => setSource(src)}>
                <Text style={[s.catTxt, source === src && s.catTxtOn]}>{src}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <TouchableOpacity style={s.saveBtn} onPress={handleSave}>
          <Text style={s.saveTxt}>Add Transaction</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: theme.colors.bg2 },
  hd:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 16 },
  title:      { fontSize: 22, fontWeight: '800', color: theme.colors.t1 },
  close:      { fontSize: 18, color: theme.colors.t2, padding: 4 },
  lbl:        { fontSize: 11, fontWeight: '700', color: theme.colors.t2, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 },
  input:      { backgroundColor: theme.colors.bg3, borderWidth: 1, borderColor: theme.colors.border2, borderRadius: 16, height: 48, paddingHorizontal: 14, color: theme.colors.t1, fontSize: 15, marginBottom: 14 },
  hint:       { padding: 10, borderRadius: 10, borderWidth: 1, marginBottom: 10 },
  divider:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  divLine:    { flex: 1, height: 1, backgroundColor: theme.colors.border },
  divTxt:     { fontSize: 11, color: theme.colors.t4, fontWeight: '600', letterSpacing: 0.8 },
  typeRow:    { flexDirection: 'row', gap: 6 },
  typeBtn:    { flex: 1, height: 48, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border2, alignItems: 'center', justifyContent: 'center' },
  typeBtnOn:  { backgroundColor: theme.colors.mintBg, borderColor: theme.colors.mintBdr },
  typeTxt:    { fontSize: 13, fontWeight: '600', color: theme.colors.t2 },
  typeTxtOn:  { color: theme.colors.mint },
  catBtn:     { height: 34, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: theme.colors.border2, alignItems: 'center', justifyContent: 'center' },
  catBtnOn:   { backgroundColor: theme.colors.mint, borderColor: 'transparent' },
  catTxt:     { fontSize: 13, fontWeight: '600', color: theme.colors.t2 },
  catTxtOn:   { color: '#0d0d0d' },
  saveBtn:    { height: 52, borderRadius: 18, backgroundColor: theme.colors.mint, alignItems: 'center', justifyContent: 'center' },
  saveTxt:    { fontSize: 16, fontWeight: '700', color: '#0d0d0d' },
  yellowBg:   theme.colors.yellowBg,
  yellowBdr:  theme.colors.yellowBdr,
  yellow:     theme.colors.yellow,
});
