// src/components/TransactionRow.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../utils/theme';
import { CATEGORY_ICONS } from '../utils/parseEngine';

export default function TransactionRow({ tx, currency, onPress }) {
  const isDebit = tx.type === 'debit';
  const t       = new Date(tx.timestamp);
  const fmt     = v => currency + parseFloat(v || 0).toFixed(2);

  return (
    <TouchableOpacity style={s.row} onPress={onPress} activeOpacity={0.7}>
      <View style={[s.avatar, { backgroundColor: isDebit ? theme.colors.redBg : theme.colors.mintBg }]}>
        <Text style={s.avatarIco}>{CATEGORY_ICONS[tx.category] || '📦'}</Text>
      </View>
      <View style={s.body}>
        <Text style={s.name} numberOfLines={1}>{tx.merchant || 'Unknown'}</Text>
        <View style={s.meta}>
          <View style={s.chip}><Text style={s.chipText}>{tx.category}</Text></View>
          <Text style={s.dot}>·</Text>
          <Text style={s.src}>{tx.source || 'Manual'}</Text>
        </View>
      </View>
      <View style={s.right}>
        <Text style={[s.amount, { color: isDebit ? theme.colors.red : theme.colors.mint }]}>
          {isDebit ? '−' : '+'}{fmt(tx.amount)}
        </Text>
        <Text style={s.time}>
          {t.toLocaleDateString([], { month: 'short', day: 'numeric' })}{' '}
          {t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  row:       { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, marginBottom: 1 },
  avatar:    { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarIco: { fontSize: 18 },
  body:      { flex: 1, minWidth: 0 },
  name:      { fontSize: 14, fontWeight: '600', color: theme.colors.t1, marginBottom: 3 },
  meta:      { flexDirection: 'row', alignItems: 'center', gap: 5 },
  chip:      { backgroundColor: theme.colors.bg4, paddingHorizontal: 7, paddingVertical: 1, borderRadius: 20 },
  chipText:  { fontSize: 10, fontWeight: '600', color: theme.colors.t2 },
  dot:       { fontSize: 11, color: theme.colors.t4 },
  src:       { fontSize: 11, color: theme.colors.t3 },
  right:     { alignItems: 'flex-end', flexShrink: 0 },
  amount:    { fontSize: 15, fontWeight: '700', letterSpacing: -0.3 },
  time:      { fontSize: 11, color: theme.colors.t3, marginTop: 2 },
});
