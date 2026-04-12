// src/screens/HomeScreen.js
import React, { useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../services/AppContext';
import { theme, chartColors } from '../utils/theme';
import { CATEGORY_ICONS } from '../utils/parseEngine';
import DonutChart from '../components/DonutChart';
import TransactionRow from '../components/TransactionRow';

export default function HomeScreen({ navigation }) {
  const {
    validTx, currency, user, syncing, doSync,
  } = useApp();

  // ── Computed stats ────────────────────────
  const stats = useMemo(() => {
    const debits  = validTx.filter(t => t.type === 'debit');
    const credits = validTx.filter(t => t.type === 'credit');
    const spent   = debits.reduce((s, t) => s + t.amount, 0);
    const recv    = credits.reduce((s, t) => s + t.amount, 0);
    const net     = recv - spent;
    return { spent, recv, net };
  }, [validTx]);

  // ── Category totals for donut ─────────────
  const catTotals = useMemo(() => {
    const now   = new Date();
    const month = validTx.filter(t => {
      const d = new Date(t.timestamp);
      return t.type === 'debit' &&
             d.getMonth() === now.getMonth() &&
             d.getFullYear() === now.getFullYear();
    });
    const ct = {};
    month.forEach(t => {
      ct[t.category] = (ct[t.category] || 0) + t.amount;
    });
    return Object.entries(ct)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [validTx]);

  const fmt  = useCallback(v => currency + parseFloat(v || 0).toFixed(2), [currency]);
  const fmtS = useCallback(v => {
    v = parseFloat(v || 0);
    return v >= 1000 ? currency + (v / 1000).toFixed(1) + 'k' : currency + v.toFixed(0);
  }, [currency]);

  const recentTx = validTx.slice(0, 8);
  const isPositive = stats.net >= 0;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={syncing}
            onRefresh={doSync}
            tintColor={theme.colors.mint}
          />
        }
      >
        {/* ── TOP BAR ── */}
        <View style={s.topbar}>
          <Image
            source={require('../../assets/acr-logo.png')}
            style={s.logo}
            resizeMode="contain"
          />
          <View style={s.topRight}>
            {user && (
              <View style={s.syncBadge}>
                <View style={s.syncDot} />
                <Text style={s.syncText}>Synced</Text>
              </View>
            )}
            <TouchableOpacity
              style={s.addBtn}
              onPress={() => navigation.navigate('AddTransaction')}
            >
              <Text style={s.addBtnText}>＋</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── USER GREETING ── */}
        {user && (
          <View style={s.greeting}>
            <Text style={s.greetText}>Hello, {user.displayName?.split(' ')[0] || 'there'}!</Text>
          </View>
        )}

        {/* ── HERO CARD ── */}
        <View style={s.heroCard}>
          <Text style={s.heroLabel}>Total Balance</Text>
          <Text style={s.heroBalance}>
            <Text style={{ color: theme.colors.mint }}>{currency}</Text>
            {Math.abs(stats.net).toFixed(2)}
          </Text>
          <View style={[
            s.trendBadge,
            { backgroundColor: isPositive ? theme.colors.mintBg : theme.colors.redBg,
              borderColor: isPositive ? theme.colors.mintBdr : theme.colors.redBdr }
          ]}>
            <Text style={[s.trendText, { color: isPositive ? theme.colors.mint : theme.colors.red }]}>
              {isPositive ? '↑' : '↓'} {isPositive ? '+' : ''}{fmt(stats.net)}
            </Text>
          </View>

          {/* Stats row */}
          <View style={s.statsRow}>
            <View style={[s.statItem, { paddingRight: 16 }]}>
              <Text style={s.statLabel}>Income</Text>
              <Text style={[s.statValue, { color: theme.colors.mint }]}>{fmtS(stats.recv)}</Text>
            </View>
            <View style={[s.statItem, s.statBorder, { paddingHorizontal: 16 }]}>
              <Text style={s.statLabel}>Spent</Text>
              <Text style={[s.statValue, { color: theme.colors.red }]}>{fmtS(stats.spent)}</Text>
            </View>
            <View style={[s.statItem, { paddingLeft: 16 }]}>
              <Text style={s.statLabel}>Saved</Text>
              <Text style={s.statValue}>{fmtS(Math.max(stats.net, 0))}</Text>
            </View>
          </View>
        </View>

        {/* ── DONUT CHART ── */}
        {catTotals.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Monthly Breakdown</Text>
            <DonutChart
              data={catTotals}
              currency={currency}
              colors={chartColors}
            />
          </View>
        )}

        {/* ── RECENT TRANSACTIONS ── */}
        <View style={s.sectionHd}>
          <Text style={s.sectionTitle}>Recent</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Transactions')}>
            <Text style={s.sectionLink}>See all →</Text>
          </TouchableOpacity>
        </View>

        <View style={s.txContainer}>
          {recentTx.length === 0 ? (
            <View style={s.empty}>
              <Text style={s.emptyIco}>💳</Text>
              <Text style={s.emptyTitle}>No transactions yet</Text>
              <Text style={s.emptySub}>Tap + to add, or go to SMS tab to import</Text>
            </View>
          ) : (
            recentTx.map(tx => (
              <TransactionRow
                key={tx.id}
                tx={tx}
                currency={currency}
                onPress={() => navigation.navigate('TransactionDetail', { txId: tx.id })}
              />
            ))
          )}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: theme.colors.bg },
  topbar:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14 },
  logo:        { height: 28, width: 100 },
  topRight:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  syncBadge:   { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: theme.colors.mintBg, borderWidth: 1, borderColor: theme.colors.mintBdr, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  syncDot:     { width: 5, height: 5, borderRadius: 3, backgroundColor: theme.colors.mint },
  syncText:    { fontSize: 11, fontWeight: '600', color: theme.colors.mint },
  addBtn:      { width: 38, height: 38, borderRadius: 19, backgroundColor: theme.colors.mintBg, borderWidth: 1, borderColor: theme.colors.mintBdr, alignItems: 'center', justifyContent: 'center' },
  addBtnText:  { fontSize: 20, color: theme.colors.mint, lineHeight: 22 },
  greeting:    { paddingHorizontal: 20, marginBottom: 4 },
  greetText:   { fontSize: 13, color: theme.colors.t3 },
  heroCard:    { marginHorizontal: 16, marginBottom: 16, backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: theme.colors.border2, borderRadius: 24, padding: 22 },
  heroLabel:   { fontSize: 13, color: theme.colors.t2, marginBottom: 6 },
  heroBalance: { fontSize: 40, fontWeight: '800', color: theme.colors.t1, letterSpacing: -1.5, marginBottom: 8 },
  trendBadge:  { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1, marginBottom: 18 },
  trendText:   { fontSize: 13, fontWeight: '600' },
  statsRow:    { flexDirection: 'row', borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 14 },
  statItem:    { flex: 1 },
  statBorder:  { borderLeftWidth: 1, borderRightWidth: 1, borderColor: theme.colors.border },
  statLabel:   { fontSize: 11, color: theme.colors.t3, marginBottom: 4 },
  statValue:   { fontSize: 17, fontWeight: '700', color: theme.colors.t1 },
  card:        { marginHorizontal: 16, marginBottom: 16, backgroundColor: theme.colors.bg2, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 24, padding: 20 },
  cardTitle:   { fontSize: 16, fontWeight: '700', color: theme.colors.t1, marginBottom: 16 },
  sectionHd:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 8 },
  sectionTitle:{ fontSize: 16, fontWeight: '700', color: theme.colors.t1 },
  sectionLink: { fontSize: 13, color: theme.colors.mint, fontWeight: '500' },
  txContainer: { paddingHorizontal: 12 },
  empty:       { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyIco:    { fontSize: 40, opacity: 0.3 },
  emptyTitle:  { fontSize: 17, fontWeight: '700', color: theme.colors.t1 },
  emptySub:    { fontSize: 13, color: theme.colors.t2, textAlign: 'center', maxWidth: 240 },
});
