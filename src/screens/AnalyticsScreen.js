// src/screens/AnalyticsScreen.js
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../services/AppContext';
import { useTheme } from '../services/ThemeContext';
import { CATEGORY_ICONS } from '../utils/parseEngine';

export default function AnalyticsScreen() {
  const { validTx, currency } = useApp();
  const { colors, chartColors } = useTheme();
  const [period, setPeriod] = useState('month');

  const filtered = useMemo(() => {
    const now = new Date();
    return validTx.filter(t => {
      const d = new Date(t.timestamp);
      if (period === 'month') return d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear();
      if (period === 'year')  return d.getFullYear()===now.getFullYear();
      return true;
    });
  }, [validTx, period]);

  const debits  = useMemo(() => filtered.filter(t=>t.type==='debit'), [filtered]);
  const credits = useMemo(() => filtered.filter(t=>t.type==='credit'), [filtered]);
  const spent   = debits.reduce((s,t)=>s+t.amount, 0);
  const recv    = credits.reduce((s,t)=>s+t.amount, 0);

  const catTotals = useMemo(() => {
    const ct = {};
    debits.forEach(t => { ct[t.category]=(ct[t.category]||0)+t.amount; });
    return Object.entries(ct).sort((a,b)=>b[1]-a[1]);
  }, [debits]);

  const total = catTotals.reduce((s,[,v])=>s+v, 0) || 1;
  const fmtS = v => { v=parseFloat(v||0); return v>=1000?currency+(v/1000).toFixed(1)+'k':currency+v.toFixed(0); };
  const fmt  = v => currency + parseFloat(v||0).toFixed(2);

  return (
    <SafeAreaView style={[s.safe,{backgroundColor:colors.bg}]} edges={['top']}>
      <View style={s.hd}>
        <Text style={[s.title,{color:colors.t1}]}>Analytics</Text>
        <View style={s.periods}>
          {['month','year','all'].map(p=>(
            <TouchableOpacity key={p}
              style={[s.pBtn,{borderColor:colors.border2,backgroundColor:period===p?colors.mint:'transparent'}]}
              onPress={()=>setPeriod(p)}
            >
              <Text style={{fontSize:11,fontWeight:'700',color:period===p?'#0d0d0d':colors.t2}}>
                {p==='month'?'Month':p==='year'?'Year':'All'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Stats */}
        <View style={s.statsRow}>
          {[
            {l:'Spent',  v:fmtS(spent), c:colors.red},
            {l:'Income', v:fmtS(recv),  c:colors.mint},
            {l:'Net',    v:fmtS(recv-spent), c:recv>=spent?colors.mint:colors.red},
          ].map((sc,i)=>(
            <View key={i} style={[s.sc,{backgroundColor:colors.bg2,borderColor:colors.border}]}>
              <Text style={[s.scL,{color:colors.t3}]}>{sc.l}</Text>
              <Text style={[s.scV,{color:sc.c}]}>{sc.v}</Text>
            </View>
          ))}
        </View>

        {/* Category breakdown */}
        <View style={[s.card,{backgroundColor:colors.bg2,borderColor:colors.border}]}>
          <Text style={[s.cardTitle,{color:colors.t1}]}>Spending by Category</Text>
          {catTotals.length === 0 ? (
            <Text style={[s.empty,{color:colors.t3}]}>No spending data</Text>
          ) : (
            catTotals.map(([cat,val],i) => {
              const pct = (val/total)*100;
              return (
                <View key={cat} style={s.barRow}>
                  <Text style={{fontSize:16,width:24}}>{CATEGORY_ICONS[cat]||'📦'}</Text>
                  <View style={{flex:1,marginLeft:8}}>
                    <View style={s.barLabelRow}>
                      <Text style={[s.barName,{color:colors.t1}]}>{cat}</Text>
                      <Text style={[s.barPct,{color:colors.t2}]}>{pct.toFixed(0)}%</Text>
                      <Text style={[s.barAmt,{color:colors.t1}]}>{fmt(val)}</Text>
                    </View>
                    <View style={[s.barTrack,{backgroundColor:colors.bg4}]}>
                      <View style={[s.barFill,{width:`${pct.toFixed(1)}%`,backgroundColor:chartColors[i%chartColors.length]}]}/>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Transaction count */}
        <View style={[s.card,{backgroundColor:colors.bg2,borderColor:colors.border}]}>
          <Text style={[s.cardTitle,{color:colors.t1}]}>Summary</Text>
          <View style={s.sumRow}>
            {[
              {l:'Transactions', v:String(filtered.length)},
              {l:'Avg Spent',    v:debits.length?fmt(spent/debits.length):fmt(0)},
              {l:'Categories',   v:String(catTotals.length)},
            ].map((r,i)=>(
              <View key={i} style={[s.sumItem, i===1&&[s.sumBorder,{borderColor:colors.border}]]}>
                <Text style={[s.sumL,{color:colors.t3}]}>{r.l}</Text>
                <Text style={[s.sumV,{color:colors.t1}]}>{r.v}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={{height:24}}/>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:        {flex:1},
  hd:          {flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:20,paddingTop:10,paddingBottom:14},
  title:       {fontSize:28,fontWeight:'800',letterSpacing:-0.8},
  periods:     {flexDirection:'row',gap:6},
  pBtn:        {height:28,paddingHorizontal:12,borderRadius:20,borderWidth:1,alignItems:'center',justifyContent:'center'},
  statsRow:    {flexDirection:'row',gap:8,paddingHorizontal:16,marginBottom:12},
  sc:          {flex:1,borderWidth:1,borderRadius:14,padding:12},
  scL:         {fontSize:9,textTransform:'uppercase',marginBottom:3},
  scV:         {fontSize:17,fontWeight:'800'},
  card:        {marginHorizontal:16,marginBottom:12,borderWidth:1,borderRadius:20,padding:18},
  cardTitle:   {fontSize:15,fontWeight:'700',marginBottom:14},
  empty:       {fontSize:13,textAlign:'center',paddingVertical:20},
  barRow:      {flexDirection:'row',alignItems:'center',marginBottom:12},
  barLabelRow: {flexDirection:'row',alignItems:'center',marginBottom:5},
  barName:     {flex:1,fontSize:13,fontWeight:'500'},
  barPct:      {fontSize:11,width:32,textAlign:'right'},
  barAmt:      {fontSize:11,fontWeight:'600',width:56,textAlign:'right'},
  barTrack:    {height:5,borderRadius:3,overflow:'hidden'},
  barFill:     {height:'100%',borderRadius:3},
  sumRow:      {flexDirection:'row'},
  sumItem:     {flex:1,paddingHorizontal:8},
  sumBorder:   {borderLeftWidth:1,borderRightWidth:1},
  sumL:        {fontSize:10,textTransform:'uppercase',marginBottom:4},
  sumV:        {fontSize:18,fontWeight:'800'},
});
