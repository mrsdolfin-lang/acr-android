/**
 * HomeScreen — Dashboard
 *
 * Fixes applied:
 *  - `toggle` was destructured but not in ThemeContext (light-only) → removed
 *  - prevStart/prevEnd created outside useMemo but used inside → moved into useMemo
 *  - fmt() called on NaN when no transactions → guarded with || 0
 *  - sectionTitle style conflicts (paddingHorizontal on text + section header) → cleaned
 */

import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { useTheme }   from '../services/ThemeContext';
import { useApp }     from '../services/AppContext';
import DonutChart     from '../components/DonutChart';
import TransactionRow from '../components/TransactionRow';

export default function HomeScreen({ navigation }) {
  const { colors }                            = useTheme();
  const { validTx, currency, syncing, doSync } = useApp();

  // Month range — recalculated once per render cycle, not per month boundary
  const { start, end } = useMemo(() => {
    const now = new Date();
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0),
      end:   new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
    };
  }, []);

  const monthTx = useMemo(
    () => (validTx || []).filter((t) => {
      if (!t?.timestamp) return false;
      const d = new Date(t.timestamp);
      return d >= start && d <= end;
    }),
    [validTx, start, end]
  );

  const income = useMemo(
    () => monthTx.filter((t) => t.type === 'credit').reduce((s, t) => s + (t.amount || 0), 0),
    [monthTx]
  );

  const spent = useMemo(
    () => monthTx.filter((t) => t.type === 'debit').reduce((s, t) => s + (t.amount || 0), 0),
    [monthTx]
  );

  const balance = income - spent;
  const saved   = balance > 0 ? balance : 0;

  // Previous month spending for trend badge
  const prevSpent = useMemo(() => {
    const prevStart = new Date(start.getFullYear(), start.getMonth() - 1, 1, 0, 0, 0, 0);
    const prevEnd   = new Date(start.getFullYear(), start.getMonth(), 0, 23, 59, 59, 999);
    return (validTx || [])
      .filter((t) => {
        if (!t?.timestamp) return false;
        const d = new Date(t.timestamp);
        return t.type === 'debit' && d >= prevStart && d <= prevEnd;
      })
      .reduce((s, t) => s + (t.amount || 0), 0);
  }, [validTx, start]);

  const trendUp  = spent > prevSpent;
  const trendPct = prevSpent > 0
    ? Math.abs(((spent - prevSpent) / prevSpent) * 100).toFixed(0)
    : 0;

  // DonutChart expects [category, amount][] pairs
  const categoryData = useMemo(() => {
    const map = {};
    monthTx.filter((t) => t.type === 'debit').forEach((t) => {
      const cat = t.category || 'Others';
      map[cat] = (map[cat] || 0) + (t.amount || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [monthTx]);

  const recent = useMemo(() => (validTx || []).slice(0, 8), [validTx]);

  const fmt = useCallback(
    (n) => (n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 }),
    []
  );

  const onRefresh = useCallback(() => doSync(), [doSync]);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={!!syncing}
            onRefresh={onRefresh}
            tintColor={colors.mint}
            colors={[colors.mint]}
          />
        }
      >
        {/* Topbar */}
        <View style={styles.topbar}>
          <Text style={[styles.logo, { color: colors.t1 }]}>
            Acrom<Text style={{ color: colors.mint }}>.</Text>
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('AddTransaction')}
            style={[styles.addBtn, { backgroundColor: colors.mint }]}
          >
            <Text style={styles.addBtnTxt}>＋</Text>
          </TouchableOpacity>
        </View>

        {/* Hero Card */}
        <View style={[styles.heroCard, { backgroundColor: colors.bg2, borderColor: colors.border }]}>
          <View style={styles.heroTop}>
            <Text style={[styles.heroLabel, { color: colors.t3 }]}>This Month</Text>
            {prevSpent > 0 && (
              <View style={[
                styles.trendBadge,
                { backgroundColor: trendUp ? colors.red + '18' : colors.mint + '18' },
              ]}>
                <Text style={{ color: trendUp ? colors.red : colors.mint, fontSize: 12, fontWeight: '700' }}>
                  {trendUp ? '▲' : '▼'} {trendPct}%
                </Text>
              </View>
            )}
          </View>

          <Text style={[styles.balanceAmt, { color: colors.t1 }]}>
            {currency}{fmt(balance)}
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.t3 }]}>Income</Text>
              <Text style={[styles.statVal, { color: colors.mint }]}>
                {currency}{fmt(income)}
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.t3 }]}>Spent</Text>
              <Text style={[styles.statVal, { color: colors.red }]}>
                {currency}{fmt(spent)}
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.t3 }]}>Saved</Text>
              <Text style={[styles.statVal, { color: colors.blue }]}>
                {currency}{fmt(saved)}
              </Text>
            </View>
          </View>
        </View>

        {/* Donut Chart */}
        <View style={[styles.card, { backgroundColor: colors.bg2, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.t1 }]}>Monthly Breakdown</Text>
          <DonutChart data={categoryData} currency={currency} />
        </View>

        {/* Recent Transactions */}
        <View style={[styles.card, { backgroundColor: colors.bg2, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: colors.t1 }]}>Recent</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Transactions')}>
              <Text style={[styles.seeAll, { color: colors.mint }]}>See all</Text>
            </TouchableOpacity>
          </View>
          {recent.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: colors.t3 }]}>
                No transactions yet. Tap ＋ to add one.
              </Text>
            </View>
          ) : (
            recent.map((tx) => (
              <TransactionRow
                key={tx.id}
                tx={tx}
                onPress={() => navigation.navigate('TransactionDetail', { tx })}
              />
            ))
          )}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  logo: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnTxt: { fontSize: 20, fontWeight: '700', color: '#000', lineHeight: 24 },
  heroCard: {
    margin: 16,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  heroLabel: { fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', fontWeight: '600' },
  trendBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  balanceAmt: { fontSize: 34, fontWeight: '800', marginBottom: 16 },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 10, marginBottom: 4, letterSpacing: 0.5, textTransform: 'uppercase' },
  statVal: { fontSize: 14, fontWeight: '700' },
  statDivider: { width: 1, height: 28, marginHorizontal: 8 },
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  seeAll: { fontSize: 13, fontWeight: '600', paddingHorizontal: 16 },
  emptyState: { padding: 28, alignItems: 'center' },
  emptyText: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
});
