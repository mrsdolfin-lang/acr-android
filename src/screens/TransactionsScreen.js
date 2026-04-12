// src/screens/TransactionsScreen.js
import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../services/AppContext';
import { theme } from '../utils/theme';
import TransactionRow from '../components/TransactionRow';

export default function TransactionsScreen({ navigation }) {
  const { validTx, currency } = useApp();
  const [search,  setSearch]  = useState('');
  const [typeF,   setTypeF]   = useState('all');
  const [catF,    setCatF]    = useState('');

  const filtered = useMemo(() => {
    let list = validTx;
    if (typeF === 'debit' || typeF === 'credit') list = list.filter(t => t.type === typeF);
    if (catF)    list = list.filter(t => t.category === catF);
    if (search)  list = list.filter(t =>
      (t.merchant || '').toLowerCase().includes(search.toLowerCase()) ||
      String(t.amount).includes(search)
    );
    return list;
  }, [validTx, typeF, catF, search]);

  const spent = validTx.filter(t => t.type === 'debit').reduce((s, t) => s + t.amount, 0);
  const recv  = validTx.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
  const fmtS  = v => { v = parseFloat(v); return v >= 1000 ? currency + (v/1000).toFixed(1) + 'k' : currency + v.toFixed(0); };

  const TYPES = ['all','debit','credit','SMS','Email'];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <Text style={s.title}>Transactions</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => navigation.navigate('AddTransaction')}>
          <Text style={s.addBtnTxt}>＋</Text>
        </TouchableOpacity>
      </View>

      {/* Stats strip */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.statScroll} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
        {[
          { l: 'Spent',  v: fmtS(spent),       c: theme.colors.red  },
          { l: 'Income', v: fmtS(recv),         c: theme.colors.mint },
          { l: 'Count',  v: String(validTx.length), c: theme.colors.t1 },
        ].map((sc, i) => (
          <View key={i} style={s.sc}>
            <Text style={s.scL}>{sc.l}</Text>
            <Text style={[s.scV, { color: sc.c }]}>{sc.v}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Search */}
      <View style={s.searchWrap}>
        <Text style={s.searchIco}>🔍</Text>
        <TextInput style={s.searchBox} placeholder="Search…" placeholderTextColor={theme.colors.t4} value={search} onChangeText={setSearch} />
      </View>

      {/* Type filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabScroll} contentContainerStyle={{ paddingHorizontal: 16, gap: 6 }}>
        {TYPES.map(t => (
          <TouchableOpacity key={t} style={[s.tab, typeF === t && s.tabOn]} onPress={() => setTypeF(t)}>
            <Text style={[s.tabTxt, typeF === t && s.tabTxtOn]}>{t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* List */}
      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: 12, paddingBottom: 16 }}>
          {filtered.length === 0
            ? <View style={s.empty}><Text style={s.emptyT}>No transactions</Text></View>
            : filtered.map(tx => (
                <TransactionRow
                  key={tx.id} tx={tx} currency={currency}
                  onPress={() => navigation.navigate('TransactionDetail', { txId: tx.id })}
                />
              ))
          }
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: theme.colors.bg },
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14 },
  title:      { fontSize: 28, fontWeight: '800', color: theme.colors.t1, letterSpacing: -0.8 },
  addBtn:     { width: 38, height: 38, borderRadius: 19, backgroundColor: theme.colors.mintBg, borderWidth: 1, borderColor: theme.colors.mintBdr, alignItems: 'center', justifyContent: 'center' },
  addBtnTxt:  { fontSize: 20, color: theme.colors.mint },
  statScroll: { marginBottom: 12, flexGrow: 0 },
  sc:         { backgroundColor: theme.colors.bg2, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, minWidth: 100 },
  scL:        { fontSize: 11, color: theme.colors.t3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 },
  scV:        { fontSize: 20, fontWeight: '800' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 10, backgroundColor: theme.colors.bg3, borderWidth: 1, borderColor: theme.colors.border2, borderRadius: 12, paddingHorizontal: 12, height: 40 },
  searchIco:  { fontSize: 14, marginRight: 6 },
  searchBox:  { flex: 1, fontSize: 14, color: theme.colors.t1 },
  tabScroll:  { marginBottom: 10, flexGrow: 0 },
  tab:        { height: 34, paddingHorizontal: 16, borderRadius: 20, backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.colors.border2, alignItems: 'center', justifyContent: 'center' },
  tabOn:      { backgroundColor: theme.colors.mint, borderColor: 'transparent' },
  tabTxt:     { fontSize: 13, fontWeight: '600', color: theme.colors.t2 },
  tabTxtOn:   { color: '#0d0d0d' },
  empty:      { paddingVertical: 40, alignItems: 'center' },
  emptyT:     { fontSize: 15, color: theme.colors.t3 },
});
