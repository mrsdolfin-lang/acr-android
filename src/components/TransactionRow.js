/**
 * TransactionRow — single transaction list item
 * Fixes: all null-guards, currency fallback, date formatting guard
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme }      from '../services/ThemeContext';
import { CATEGORY_ICONS } from '../utils/parseEngine';

function safeFormatDate(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString('en-IN', {
      day: '2-digit', month: 'short',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  } catch {
    return '';
  }
}

export default function TransactionRow({ tx, onPress }) {
  const { colors } = useTheme();

  if (!tx) return null;

  const isCredit       = tx.type === 'credit';
  const avatarBg       = isCredit ? colors.mint + '1A' : colors.red + '1A';
  const amtColor       = isCredit ? colors.mint : colors.red;
  const icon           = CATEGORY_ICONS[tx.category] || '📦';
  const merchant       = tx.merchant || 'Unknown';
  const amount         = typeof tx.amount === 'number' ? tx.amount : 0;
  const currency       = tx.currency || '₹';
  const isSubscription = !!tx.isSubscription;
  const isDuplicate    = !!tx.is_dup;

  return (
    <TouchableOpacity
      style={[
        styles.row,
        { borderBottomColor: colors.border },
        isDuplicate && { backgroundColor: colors.red + '08' },
      ]}
      onPress={onPress}
      activeOpacity={0.65}
    >
      {/* Avatar */}
      <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
        <Text style={styles.avatarIcon}>{icon}</Text>
      </View>

      {/* Middle */}
      <View style={styles.mid}>
        <View style={styles.merchantRow}>
          <Text
            style={[styles.merchant, { color: colors.t1 }]}
            numberOfLines={1}
          >
            {merchant}
          </Text>
          {/* ── Subscription badge ── */}
          {isSubscription && (
            <View style={[styles.badge, { backgroundColor: colors.blue + '1A' }]}>
              <Text style={[styles.badgeTxt, { color: colors.blue }]}>🔄 Sub</Text>
            </View>
          )}
          {/* ── Duplicate badge ── */}
          {isDuplicate && (
            <View style={[styles.badge, { backgroundColor: colors.red + '1A' }]}>
              <Text style={[styles.badgeTxt, { color: colors.red }]}>⚠️ Dup</Text>
            </View>
          )}
        </View>
        <View style={styles.meta}>
          <View style={[styles.chip, { backgroundColor: colors.bg3 }]}>
            <Text style={[styles.chipTxt, { color: colors.t3 }]}>
              {tx.category || 'Others'}
            </Text>
          </View>
          <Text style={[styles.source, { color: colors.t4 }]}>
            · {tx.source || 'Manual'}
          </Text>
        </View>
      </View>

      {/* Right */}
      <View style={styles.right}>
        <Text style={[styles.amount, { color: amtColor }]}>
          {isCredit ? '+' : '-'}{currency}
          {amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
        </Text>
        <Text style={[styles.date, { color: colors.t4 }]}>
          {safeFormatDate(tx.timestamp)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12, flexShrink: 0,
  },
  avatarIcon: { fontSize: 18 },
  mid: { flex: 1, marginRight: 8 },
  merchantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 3,
    flexWrap: 'nowrap',
  },
  merchant: { fontSize: 14, fontWeight: '600', flexShrink: 1 },
  badge: {
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 6, flexShrink: 0,
  },
  badgeTxt: { fontSize: 10, fontWeight: '700' },
  meta: { flexDirection: 'row', alignItems: 'center' },
  chip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  chipTxt: { fontSize: 11 },
  source: { fontSize: 11, marginLeft: 4 },
  right: { alignItems: 'flex-end', flexShrink: 0 },
  amount: { fontSize: 14, fontWeight: '700' },
  date: { fontSize: 11, marginTop: 3 },
});
