// src/screens/TransactionsScreen.js
import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../services/AppContext';
import { useTheme } from '../services/ThemeContext';
import { CATEGORY_ICONS } from '../utils/parseEngine';
import TransactionRow from '../components/TransactionRow';

export default function TransactionsScreen({ navigation }) {
  const { validTx, currency, deleteTransaction } = useApp();
  const { colors } = useTheme();
  const [search,  setSearch]  = useState('');
  const [typeF,   setTypeF]   = useState('all');
  const [catF,    setCatF]    = useState('');

  const filtered = useMemo(() => {
    let list = validTx;
    if (typeF === 'debit')   list = list.filter(t => t.type === 'debit');
    if (typeF === 'credit')  list = list.filter(t => t.type === 'credit');
    if (catF)                list = list.filter(t => t.category === catF);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(t => (t.merchant||'').toLowerCase().includes(q) || String(t.amount).includes(q));
    }
    return list;
  }, [validTx, typeF, catF, search]);

  const stats = useMemo(() => ({
    spent: filtered.filter(t=>t.type==='debit').reduce((s,t)=>s+t.amount,0),
    recv:  filtered.filter(t=>t.type==='credit').reduce((s,t)=>s+t.amount,0),
  }), [filtered]);

  const fmtS = v => { v=parseFloat(v||0); return v>=1000?currency+(v/1000).toFixed(1)+'k':currency+v.toFixed(0); };
  const TYPES = ['all','debit','credit'];
  const CATS  = ['','Food','Shopping','Transport','Utilities','Recharge','Entertainment','Health','Education','SaaS','Others'];

  return (
    <SafeAreaView style={[s.safe,{backgroundColor:colors.bg}]} edges={['top']}>
      <View style={s.hd}>
        <Text style={[s.title,{color:colors.t1}]}>Transactions</Text>
        <TouchableOpacity
          style={[s.addBtn,{backgroundColor:colors.mintBg,borderColor:colors.mintBdr}]}
          onPress={()=>navigation.navigate('AddTransaction')}
        >
          <Text style={{fontSize:20,color:colors.mint}}>＋</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={s.statsRow}>
        {[
          {l:'Spent',  v:fmtS(stats.spent),  c:colors.red},
          {l:'Received',v:fmtS(stats.recv),  c:colors.mint},
          {l:'Count',  v:String(filtered.length), c:colors.t1},
        ].map((sc,i)=>(
          <View key={i} style={[s.sc,{backgroundColor:colors.bg2,borderColor:colors.border}]}>
            <Text style={[s.scL,{color:colors.t3}]}>{sc.l}</Text>
            <Text style={[s.scV,{color:sc.c}]}>{sc.v}</Text>
          </View>
        ))}
      </View>

      {/* Search */}
      <View style={[s.searchWrap,{backgroundColor:colors.bg3,borderColor:colors.border}]}>
        <Text style={{fontSize:15,color:colors.t3}}>🔍</Text>
        <TextInput
          style={[s.searchInput,{color:colors.t1}]}
          placeholder="Search transactions..."
          placeholderTextColor={colors.t4}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Type filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow} contentContainerStyle={{gap:6,paddingHorizontal:16}}>
        {TYPES.map(t=>(
          <TouchableOpacity key={t}
            style={[s.pill,{borderColor:colors.border2,backgroundColor:typeF===t?colors.mint:'transparent'}]}
            onPress={()=>setTypeF(t)}
          >
            <Text style={[s.pillTxt,{color:typeF===t?'#0d0d0d':colors.t2}]}>
              {t==='all'?'All':t==='debit'?'Spent':'Received'}
            </Text>
          </TouchableOpacity>
        ))}
        {CATS.filter(Boolean).map(c=>(
          <TouchableOpacity key={c}
            style={[s.pill,{borderColor:colors.border2,backgroundColor:catF===c?colors.mint:'transparent'}]}
            onPress={()=>setCatF(catF===c?'':c)}
          >
            <Text style={[s.pillTxt,{color:catF===c?'#0d0d0d':colors.t2}]}>
              {CATEGORY_ICONS[c]} {c}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{paddingHorizontal:12, paddingTop:4}}>
          {filtered.length===0 ? (
            <View style={s.empty}>
              <Text style={{fontSize:36,opacity:0.3}}>🔍</Text>
              <Text style={[s.emptyT,{color:colors.t1}]}>No transactions</Text>
            </View>
          ) : (
            filtered.map(tx=>(
              <TransactionRow
                key={tx.id} tx={tx} currency={currency}
                onPress={()=>navigation.navigate('TransactionDetail',{txId:tx.id})}
              />
            ))
          )}
        </View>
        <View style={{height:24}}/>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:       {flex:1},
  hd:         {flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:20,paddingTop:10,paddingBottom:14},
  title:      {fontSize:28,fontWeight:'800',letterSpacing:-0.8},
  addBtn:     {width:38,height:38,borderRadius:19,borderWidth:1,alignItems:'center',justifyContent:'center'},
  statsRow:   {flexDirection:'row',gap:8,paddingHorizontal:16,marginBottom:12},
  sc:         {flex:1,borderWidth:1,borderRadius:14,padding:12},
  scL:        {fontSize:10,textTransform:'uppercase',marginBottom:3},
  scV:        {fontSize:17,fontWeight:'800'},
  searchWrap: {flexDirection:'row',alignItems:'center',gap:8,marginHorizontal:16,marginBottom:10,borderWidth:1,borderRadius:14,paddingHorizontal:12,height:42},
  searchInput:{flex:1,fontSize:14},
  filterRow:  {marginBottom:12},
  pill:       {height:32,paddingHorizontal:12,borderRadius:20,borderWidth:1,alignItems:'center',justifyContent:'center'},
  pillTxt:    {fontSize:12,fontWeight:'600'},
  empty:      {alignItems:'center',paddingVertical:40,gap:8},
  emptyT:     {fontSize:16,fontWeight:'700'},
});
