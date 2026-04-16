// src/components/TransactionRow.js — visible in both modes
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../services/ThemeContext';
import { CATEGORY_ICONS } from '../utils/parseEngine';

export default function TransactionRow({ tx, currency, onPress }) {
  const { colors } = useTheme();
  const isDebit = tx.type === 'debit';
  const fmt = v => currency + parseFloat(v||0).toFixed(2);
  const d   = new Date(tx.timestamp);
  const dateStr = d.toLocaleDateString([], { month:'short', day:'numeric' });
  const timeStr = d.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });

  return (
    <TouchableOpacity
      style={[s.row, {backgroundColor:colors.bg2, borderColor:colors.border}]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[s.av, {backgroundColor: isDebit ? colors.redBg : colors.mintBg}]}>
        <Text style={s.avIco}>{CATEGORY_ICONS[tx.category] || '📦'}</Text>
      </View>

      <View style={s.body}>
        {/* Merchant name — always visible */}
        <Text style={[s.name, {color:colors.t1}]} numberOfLines={1}>
          {tx.merchant || 'Transaction'}
        </Text>
        <View style={s.meta}>
          <View style={[s.chip, {backgroundColor:colors.bg4, borderColor:colors.border}]}>
            <Text style={[s.chipTxt, {color:colors.t1}]}>{tx.category}</Text>
          </View>
          <Text style={[s.sep, {color:colors.t3}]}>·</Text>
          <Text style={[s.src, {color:colors.t2}]}>{tx.source || 'Manual'}</Text>
        </View>
      </View>

      <View style={s.right}>
        <Text style={[s.amt, {color: isDebit ? colors.red : colors.mint}]}>
          {isDebit ? '−' : '+'}{fmt(tx.amount)}
        </Text>
        <Text style={[s.time, {color:colors.t2}]}>{dateStr} {timeStr}</Text>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  row:     {flexDirection:'row', alignItems:'center', gap:12, padding:12,
            borderRadius:16, marginBottom:6, borderWidth:1},
  av:      {width:44, height:44, borderRadius:22, alignItems:'center', justifyContent:'center', flexShrink:0},
  avIco:   {fontSize:20},
  body:    {flex:1, minWidth:0},
  name:    {fontSize:14, fontWeight:'700', marginBottom:4},
  meta:    {flexDirection:'row', alignItems:'center', gap:4},
  chip:    {paddingHorizontal:8, paddingVertical:2, borderRadius:20, borderWidth:1},
  chipTxt: {fontSize:11, fontWeight:'600'},
  sep:     {fontSize:12},
  src:     {fontSize:11, fontWeight:'500'},
  right:   {alignItems:'flex-end', flexShrink:0},
  amt:     {fontSize:15, fontWeight:'800', letterSpacing:-0.3},
  time:    {fontSize:10, marginTop:3},
});
