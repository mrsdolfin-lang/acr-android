// src/screens/AnalyticsScreen.js
import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Rect, Text as SvgText, Line } from 'react-native-svg';
import { useApp } from '../services/AppContext';
import { theme, chartColors } from '../utils/theme';
import { CATEGORY_ICONS } from '../utils/parseEngine';

const W = Dimensions.get('window').width - 64;

export default function AnalyticsScreen() {
  const { validTx, currency } = useApp();
  const [period, setPeriod] = useState('week');

  const fmt  = v => currency + parseFloat(v || 0).toFixed(2);
  const fmtS = v => { v = parseFloat(v || 0); return v >= 1000 ? currency + (v / 1000).toFixed(1) + 'k' : currency + v.toFixed(0); };

  // ── Filter by period ──
  const filtered = useMemo(() => {
    const now = new Date();
    return validTx.filter(t => {
      const d = new Date(t.timestamp);
      if (period === 'week')  { const s = new Date(now); s.setDate(now.getDate() - 6); return d >= s; }
      if (period === 'month') { return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }
      if (period === 'year')  { return d.getFullYear() === now.getFullYear(); }
      return true;
    });
  }, [validTx, period]);

  const debits  = filtered.filter(t => t.type === 'debit');
  const credits = filtered.filter(t => t.type === 'credit');
  const spent   = debits.reduce((s, t) => s + t.amount, 0);
  const recv    = credits.reduce((s, t) => s + t.amount, 0);
  const savings = Math.max(recv - spent, 0);

  // ── Bar chart data ──
  const barData = useMemo(() => {
    const now = new Date();
    if (period === 'week') {
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now); d.setDate(now.getDate() - (6 - i));
        const amt = debits.filter(t => {
          const td = new Date(t.timestamp);
          return td.toDateString() === d.toDateString();
        }).reduce((s, t) => s + t.amount, 0);
        return { label: d.toLocaleDateString([], { weekday: 'short' }), value: amt };
      });
    }
    if (period === 'month') {
      return Array.from({ length: 4 }, (_, i) => {
        const s = new Date(now); s.setDate(now.getDate() - (3 - i) * 7 - 6);
        const e = new Date(now); e.setDate(now.getDate() - (3 - i) * 7);
        const amt = debits.filter(t => { const td = new Date(t.timestamp); return td >= s && td <= e; }).reduce((s, t) => s + t.amount, 0);
        return { label: `Wk${i + 1}`, value: amt };
      });
    }
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      const amt = debits.filter(t => { const td = new Date(t.timestamp); return td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear(); }).reduce((s, t) => s + t.amount, 0);
      return { label: d.toLocaleDateString([], { month: 'short' }), value: amt };
    });
  }, [debits, period]);

  const maxBar  = Math.max(...barData.map(d => d.value), 1);
  const barW    = W / barData.length - 8;
  const chartH  = 120;

  // ── Category totals ──
  const catTotals = useMemo(() => {
    const ct = {};
    debits.forEach(t => { ct[t.category] = (ct[t.category] || 0) + t.amount; });
    return Object.entries(ct).sort((a, b) => b[1] - a[1]);
  }, [debits]);
  const catTotal = catTotals.reduce((s, [, v]) => s + v, 0) || 1;

  const PERIODS = [{ k: 'week', l: 'Week' }, { k: 'month', l: 'Month' }, { k: 'year', l: 'Year' }];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header + Period */}
        <View style={s.hd}>
          <Text style={s.title}>Analytics</Text>
          <View style={s.periods}>
            {PERIODS.map(p => (
              <TouchableOpacity key={p.k} style={[s.pBtn, period === p.k && s.pBtnOn]} onPress={() => setPeriod(p.k)}>
                <Text style={[s.pTxt, period === p.k && s.pTxtOn]}>{p.l}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Stats */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10, marginBottom: 16 }}>
          {[
            { l: 'Spent',   v: fmtS(spent),   c: theme.colors.red  },
            { l: 'Income',  v: fmtS(recv),    c: theme.colors.mint },
            { l: 'Savings', v: fmtS(savings), c: theme.colors.mint },
            { l: 'Top',     v: catTotals[0] ? CATEGORY_ICONS[catTotals[0][0]] : '—', c: theme.colors.t1 },
          ].map((sc, i) => (
            <View key={i} style={s.sc}>
              <Text style={s.scL}>{sc.l}</Text>
              <Text style={[s.scV, { color: sc.c }]}>{sc.v}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Bar Chart */}
        <View style={s.card}>
          <View style={s.cardHd}>
            <Text style={s.cardTitle}>Spending Trend</Text>
            {spent > 0 && <View style={s.badge}><Text style={s.badgeTxt}>{fmtS(spent)}</Text></View>}
          </View>
          <Svg width={W} height={chartH + 28}>
            {barData.map((d, i) => {
              const bh  = Math.max((d.value / maxBar) * chartH, 3);
              const x   = i * (barW + 8) + 4;
              const y   = chartH - bh;
              const isLast = i === barData.length - 1;
              return (
                <React.Fragment key={i}>
                  <Rect x={x} y={y} width={barW} height={bh} rx={4}
                    fill={isLast ? theme.colors.mint : `rgba(94,255,160,${0.2 + (i / (barData.length - 1)) * 0.5})`} />
                  <SvgText x={x + barW / 2} y={chartH + 18} textAnchor="middle"
                    fontSize={9} fill={theme.colors.t3}>{d.label}</SvgText>
                </React.Fragment>
              );
            })}
          </Svg>
        </View>

        {/* Category Bars */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Categories</Text>
          {catTotals.length === 0
            ? <Text style={{ fontSize: 13, color: theme.colors.t3, padding: 8 }}>No data yet</Text>
            : catTotals.slice(0, 8).map(([cat, val], i) => (
              <View key={cat} style={s.catRow}>
                <Text style={s.catIco}>{CATEGORY_ICONS[cat] || '📦'}</Text>
                <Text style={s.catName}>{cat}</Text>
                <View style={s.catTrack}>
                  <View style={[s.catFill, { width: `${(val / catTotal * 100).toFixed(1)}%`, backgroundColor: chartColors[i % chartColors.length] }]} />
                </View>
                <Text style={s.catPct}>{(val / catTotal * 100).toFixed(0)}%</Text>
                <Text style={s.catAmt}>{fmtS(val)}</Text>
              </View>
            ))
          }
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:     { flex: 1, backgroundColor: theme.colors.bg },
  hd:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14 },
  title:    { fontSize: 28, fontWeight: '800', color: theme.colors.t1, letterSpacing: -0.8 },
  periods:  { flexDirection: 'row', gap: 4 },
  pBtn:     { height: 28, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: theme.colors.border2, alignItems: 'center', justifyContent: 'center' },
  pBtnOn:   { backgroundColor: theme.colors.mintBg, borderColor: theme.colors.mintBdr },
  pTxt:     { fontSize: 11, fontWeight: '600', color: theme.colors.t3 },
  pTxtOn:   { color: theme.colors.mint },
  sc:       { backgroundColor: theme.colors.bg2, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, minWidth: 90 },
  scL:      { fontSize: 11, color: theme.colors.t3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 },
  scV:      { fontSize: 20, fontWeight: '800' },
  card:     { marginHorizontal: 16, marginBottom: 14, backgroundColor: theme.colors.bg2, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 22, padding: 18 },
  cardHd:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  cardTitle:{ fontSize: 16, fontWeight: '700', color: theme.colors.t1 },
  badge:    { backgroundColor: theme.colors.mintBg, borderWidth: 1, borderColor: theme.colors.mintBdr, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeTxt: { fontSize: 12, fontWeight: '600', color: theme.colors.mint },
  catRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  catIco:   { fontSize: 16, width: 24, textAlign: 'center' },
  catName:  { width: 72, fontSize: 12, color: theme.colors.t2 },
  catTrack: { flex: 1, height: 5, backgroundColor: theme.colors.bg4, borderRadius: 3, overflow: 'hidden' },
  catFill:  { height: '100%', borderRadius: 3 },
  catPct:   { width: 28, fontSize: 11, color: theme.colors.t3, textAlign: 'right' },
  catAmt:   { width: 50, fontSize: 11, fontWeight: '600', color: theme.colors.t1, textAlign: 'right' },
});
