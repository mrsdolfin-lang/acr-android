/**
 * TransactionDetailScreen
 * Fixes: 2-step delete confirmation, null guards
 */

import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { useTheme }        from '../services/ThemeContext';
import { useApp }          from '../services/AppContext';
import { CATEGORY_ICONS }  from '../utils/parseEngine';

const CATEGORIES = Object.keys(CATEGORY_ICONS);

function formatFull(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (isNaN(d)) return '';
    return d.toLocaleString('en-IN', {
      weekday: 'long', day: '2-digit', month: 'long',
      year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
    });
  } catch { return ''; }
}

export default function TransactionDetailScreen({ navigation, route }) {
  const { colors }                            = useTheme();
  const { deleteTransaction, saveOverride, validTx } = useApp();

  const txFromRoute = route?.params?.tx;
  const tx = (validTx || []).find((t) => t.id === txFromRoute?.id) || txFromRoute;

  const [selCat, setSelCat] = useState(tx?.category || 'Others');

  if (!tx) {
    return (
      <View style={[st.overlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
        <View style={[st.sheet, { backgroundColor: colors.bg2 }]}>
          <Text style={[st.empty, { color: colors.t3 }]}>Transaction not found.</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={st.closeBtn}>
            <Text style={{ color: colors.blue, fontSize: 15 }}>← Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const isCredit = tx.type === 'credit';
  const amtColor = isCredit ? colors.mint : colors.red;
  const amount   = typeof tx.amount === 'number' ? tx.amount : 0;

  // 2-step delete: first confirm → second confirm
  const handleDelete = () => {
    Alert.alert(
      'Delete Transaction',
      `Delete ${tx.merchant || 'this transaction'} of ${tx.currency || '₹'}${amount.toLocaleString('en-IN')}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you sure?',
              'This action cannot be undone. The transaction will be permanently removed.',
              [
                { text: 'Keep it', style: 'cancel' },
                {
                  text: 'Yes, Delete',
                  style: 'destructive',
                  onPress: () => {
                    deleteTransaction(tx.id);
                    navigation.goBack();
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const handleRecategorize = () => {
    if (selCat === tx.category) return;
    Alert.alert(
      'Change Category',
      `Set category to "${selCat}" for all "${tx.merchant || 'Unknown'}" transactions?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply',
          onPress: () => {
            saveOverride(tx.merchant || 'Unknown', selCat);
            navigation.goBack();
          },
        },
      ]
    );
  };

  return (
    <View style={[st.overlay, { backgroundColor: 'rgba(0,0,0,0.45)' }]}>
      <View style={[st.sheet, { backgroundColor: colors.bg2 }]}>
        <View style={st.header}>
          <Text style={[st.headerTitle, { color: colors.t1 }]}>Transaction</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={{ color: colors.t3, fontSize: 22 }}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Amount */}
          <View style={st.amountBlock}>
            <Text style={[st.sign, { color: amtColor }]}>{isCredit ? '+' : '−'}</Text>
            <Text style={[st.amount, { color: amtColor }]}>
              {tx.currency || '₹'}{amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>

          <Text style={[st.merchant, { color: colors.t1 }]}>{tx.merchant || 'Unknown'}</Text>
          <Text style={[st.datetime, { color: colors.t3 }]}>{formatFull(tx.timestamp)}</Text>

          {/* Meta chips */}
          <View style={st.chipRow}>
            <View style={[st.chip, { backgroundColor: colors.bg3 }]}>
              <Text style={{ fontSize: 14 }}>{CATEGORY_ICONS[tx.category] || '📦'}</Text>
              <Text style={[st.chipTxt, { color: colors.t2 }]}>{tx.category || 'Others'}</Text>
            </View>
            <View style={[st.chip, { backgroundColor: colors.bg3 }]}>
              <Text style={[st.chipTxt, { color: colors.t2 }]}>{tx.source || 'Manual'}</Text>
            </View>
            <View style={[st.chip, {
              backgroundColor: isCredit ? colors.mint + '18' : colors.red + '18',
            }]}>
              <Text style={[st.chipTxt, { color: isCredit ? colors.mint : colors.red }]}>
                {isCredit ? 'Credit' : 'Debit'}
              </Text>
            </View>
            {tx.isSubscription && (
              <View style={[st.chip, { backgroundColor: colors.blue + '18' }]}>
                <Text style={[st.chipTxt, { color: colors.blue }]}>🔄 Subscription</Text>
              </View>
            )}
          </View>

          {/* Raw message */}
          {!!tx.raw && (
            <View style={[st.rawBox, { backgroundColor: colors.bg3, borderColor: colors.border }]}>
              <Text style={[st.rawLabel, { color: colors.t4 }]}>Original Message</Text>
              <Text style={[st.rawTxt, { color: colors.t2 }]}>{tx.raw}</Text>
            </View>
          )}

          {/* Recategorize */}
          <Text style={[st.secTitle, { color: colors.t3 }]}>Recategorize</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 4 }}>
              {CATEGORIES.map((c) => {
                const active = selCat === c;
                return (
                  <TouchableOpacity
                    key={c}
                    style={[st.catChip, {
                      backgroundColor: active ? colors.blue : colors.bg3,
                      borderColor: active ? colors.blue : colors.border,
                    }]}
                    onPress={() => setSelCat(c)}
                  >
                    <Text style={{ fontSize: 13 }}>{CATEGORY_ICONS[c]}</Text>
                    <Text style={[st.catTxt, { color: active ? '#fff' : colors.t2 }]}>{c}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {selCat !== tx.category && (
            <TouchableOpacity
              style={[st.applyBtn, { backgroundColor: colors.blue }]}
              onPress={handleRecategorize}
            >
              <Text style={st.applyBtnTxt}>Apply Recategorization</Text>
            </TouchableOpacity>
          )}

          {/* 2-step delete */}
          <TouchableOpacity
            style={[st.deleteBtn, { borderColor: colors.red }]}
            onPress={handleDelete}
          >
            <Text style={[st.deleteBtnTxt, { color: colors.red }]}>🗑  Delete Transaction</Text>
          </TouchableOpacity>

          <View style={{ height: 24 }} />
        </ScrollView>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '92%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  empty: { fontSize: 14, textAlign: 'center', paddingVertical: 32 },
  closeBtn: { alignItems: 'center', paddingVertical: 12 },
  amountBlock: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 4 },
  sign: { fontSize: 26, fontWeight: '800', marginBottom: 4, marginRight: 2 },
  amount: { fontSize: 34, fontWeight: '800' },
  merchant: { fontSize: 18, fontWeight: '600', marginTop: 4 },
  datetime: { fontSize: 13, marginTop: 4, marginBottom: 16 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 16 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, gap: 5 },
  chipTxt: { fontSize: 12, fontWeight: '600' },
  rawBox: { borderRadius: 10, borderWidth: 1, padding: 12, marginBottom: 16 },
  rawLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', marginBottom: 4 },
  rawTxt: { fontSize: 12, lineHeight: 18 },
  secTitle: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  catChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 20, borderWidth: 1, gap: 5 },
  catTxt: { fontSize: 12, fontWeight: '600' },
  applyBtn: { borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginBottom: 12 },
  applyBtnTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },
  deleteBtn: { borderRadius: 12, paddingVertical: 13, alignItems: 'center', borderWidth: 1 },
  deleteBtnTxt: { fontSize: 14, fontWeight: '600' },
});
