import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { useTheme } from '../services/ThemeContext';
import { useApp } from '../services/AppContext';
import TransactionRow from '../components/TransactionRow';
import { CATEGORY_ICONS } from '../utils/parseEngine';

const CATEGORIES = Object.keys(CATEGORY_ICONS);

function groupByDate(txList) {
  const groups = {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  txList.forEach((tx) => {
    const d = new Date(tx.timestamp);
    d.setHours(0, 0, 0, 0);
    let label;
    if (d.getTime() === today.getTime()) label = 'Today';
    else if (d.getTime() === yesterday.getTime()) label = 'Yesterday';
    else label = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    if (!groups[label]) groups[label] = [];
    groups[label].push(tx);
  });
  return groups;
}

export default function TransactionsScreen({ navigation }) {
  const { colors } = useTheme();
  const { validTx, currency } = useApp();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [catFilter, setCatFilter] = useState('All');

  const totalSpent = useMemo(
    () => validTx.filter((t) => t.type === 'debit').reduce((s, t) => s + t.amount, 0),
    [validTx]
  );
  const totalReceived = useMemo(
    () => validTx.filter((t) => t.type === 'credit').reduce((s, t) => s + t.amount, 0),
    [validTx]
  );

  const filtered = useMemo(() => {
    let list = validTx;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          (t.merchant || '').toLowerCase().includes(q) ||
          (t.category || '').toLowerCase().includes(q) ||
          (t.raw || '').toLowerCase().includes(q)
      );
    }
    if (typeFilter === 'Spent') list = list.filter((t) => t.type === 'debit');
    if (typeFilter === 'Received') list = list.filter((t) => t.type === 'credit');
    if (catFilter !== 'All') list = list.filter((t) => t.category === catFilter);
    return list;
  }, [validTx, search, typeFilter, catFilter]);

  const grouped = useMemo(() => groupByDate(filtered), [filtered]);
  const groupKeys = Object.keys(grouped);

  const fmt = (n) => n.toLocaleString('en-IN', { maximumFractionDigits: 0 });

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.t1 }]}>Transactions</Text>
        </View>

        {/* Stats row */}
        <View style={[styles.statsCard, { backgroundColor: colors.bg2, borderColor: colors.border }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: colors.t3 }]}>Spent</Text>
            <Text style={[styles.statVal, { color: colors.red }]}>{currency}{fmt(totalSpent)}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: colors.t3 }]}>Received</Text>
            <Text style={[styles.statVal, { color: colors.mint }]}>{currency}{fmt(totalReceived)}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: colors.t3 }]}>Count</Text>
            <Text style={[styles.statVal, { color: colors.t1 }]}>{validTx.length}</Text>
          </View>
        </View>

        {/* Search */}
        <View style={[styles.searchBar, { backgroundColor: colors.bg3, borderColor: colors.border }]}>
          <Text style={{ color: colors.t3, marginRight: 8 }}>🔍</Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search transactions..."
            placeholderTextColor={colors.t4}
            style={[styles.searchInput, { color: colors.t1 }]}
          />
        </View>

        {/* Type filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillRow} contentContainerStyle={styles.pillContent}>
          {['All', 'Spent', 'Received'].map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.pill, {
                backgroundColor: typeFilter === f ? colors.mint : colors.bg3,
                borderColor: typeFilter === f ? colors.mint : colors.border,
              }]}
              onPress={() => setTypeFilter(f)}
            >
              <Text style={[styles.pillTxt, { color: typeFilter === f ? '#000' : colors.t2 }]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Category filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillRow} contentContainerStyle={styles.pillContent}>
          {['All', ...CATEGORIES].map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.pill, {
                backgroundColor: catFilter === c ? colors.blue : colors.bg3,
                borderColor: catFilter === c ? colors.blue : colors.border,
              }]}
              onPress={() => setCatFilter(c)}
            >
              <Text style={[styles.pillTxt, { color: catFilter === c ? '#fff' : colors.t2 }]}>
                {c !== 'All' ? CATEGORY_ICONS[c] + ' ' : ''}{c}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Grouped list */}
        {groupKeys.length === 0 ? (
          <View style={styles.empty}>
            <Text style={{ color: colors.t3, fontSize: 14 }}>No transactions found</Text>
          </View>
        ) : (
          groupKeys.map((key) => (
            <View key={key} style={[styles.group, { backgroundColor: colors.bg2, borderColor: colors.border }]}>
              <Text style={[styles.groupLabel, { color: colors.t3 }]}>{key}</Text>
              {grouped[key].map((tx) => (
                <TransactionRow
                  key={tx.id}
                  tx={tx}
                  onPress={() => navigation.navigate('TransactionDetail', { tx })}
                />
              ))}
            </View>
          ))
        )}
        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: '800' },
  statsCard: {
    flexDirection: 'row',
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 11, marginBottom: 4, letterSpacing: 0.5, textTransform: 'uppercase' },
  statVal: { fontSize: 15, fontWeight: '700' },
  divider: { width: 1, marginHorizontal: 8 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
  pillRow: { marginBottom: 8 },
  pillContent: { paddingHorizontal: 16, gap: 8 },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillTxt: { fontSize: 12, fontWeight: '600' },
  group: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  groupLabel: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  empty: { padding: 40, alignItems: 'center' },
});
