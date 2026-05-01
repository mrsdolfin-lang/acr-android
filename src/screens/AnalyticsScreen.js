/**
 * AnalyticsScreen v2
 * - Removed "All" period
 * - Fixed bar chart
 * - Category list moved below donut, unlimited + scrollable
 * - Perfect currency alignment
 */

import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar, Dimensions,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { useTheme }            from '../services/ThemeContext';
import { useApp }              from '../services/AppContext';
import { useTransactionStats } from '../hooks/useTransactionStats';
import { useFormatCurrency }   from '../hooks/useFormatCurrency';
import { useDateHelpers }      from '../hooks/useDateHelpers';
import { ANALYTICS_PERIODS, TRANSACTION_TYPES } from '../constants';
import { CATEGORY_ICONS }      from '../utils/parseEngine';

const { width: SCREEN_W } = Dimensions.get('window');
const CHART_W = SCREEN_W - 64;

// ── Bar data builder ───────────────────────────────────────────────────────
function buildBarData(transactions, period) {
  const debits = (transactions || []).filter((t) => t.type === TRANSACTION_TYPES.DEBIT);

  if (period === ANALYTICS_PERIODS.WEEK) {
    // Week: Mon → Sun (Monday-first ordering)
    const labels = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    const map = Object.fromEntries(labels.map((l) => [l, 0]));
    // JS getDay(): 0=Sun,1=Mon,2=Tue,3=Wed,4=Thu,5=Fri,6=Sat
    // Map to Mon-Sun index: Sun(0)→6, Mon(1)→0, Tue(2)→1 ... Sat(6)→5
    const dayIndexToLabel = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    debits.forEach((t) => {
      try {
        const dayIdx = new Date(t.timestamp).getDay(); // 0-6
        const l = dayIndexToLabel[dayIdx];
        if (map[l] !== undefined) map[l] += (t.amount || 0);
      } catch {}
    });
    return labels.map((l) => ({ label: l, value: map[l] }));
  }

  if (period === ANALYTICS_PERIODS.MONTH) {
    // Month: exactly 4 weeks (Wk1-Wk4), days 1-7, 8-14, 15-21, 22+
    const labels = ['Wk1','Wk2','Wk3','Wk4'];
    const map = Object.fromEntries(labels.map((l) => [l, 0]));
    debits.forEach((t) => {
      try {
        const day = new Date(t.timestamp).getDate();
        // Wk1: 1-7, Wk2: 8-14, Wk3: 15-21, Wk4: 22-end
        const wkNum = day <= 7 ? 1 : day <= 14 ? 2 : day <= 21 ? 3 : 4;
        map[`Wk${wkNum}`] += (t.amount || 0);
      } catch {}
    });
    return labels.map((l) => ({ label: l, value: map[l] }));
  }

  // YEAR — group by month
  const labels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const map = Object.fromEntries(labels.map((l) => [l, 0]));
  debits.forEach((t) => {
    try {
      const l = new Date(t.timestamp).toLocaleDateString('en-US', { month: 'short' });
      if (map[l] !== undefined) map[l] += (t.amount || 0);
    } catch {}
  });
  return labels.map((l) => ({ label: l, value: map[l] }));
}

// ── Period Selector ────────────────────────────────────────────────────────
function PeriodSelector({ active, onChange, colors }) {
  // Only 3 options — ALL removed
  const OPTS = [
    { key: ANALYTICS_PERIODS.WEEK,  label: 'This Week' },
    { key: ANALYTICS_PERIODS.MONTH, label: 'This Month' },
    { key: ANALYTICS_PERIODS.YEAR,  label: 'This Year' },
  ];
  return (
    <View style={[ps.row, { backgroundColor: colors.bg3 }]}>
      {OPTS.map(({ key, label }) => {
        const on = active === key;
        return (
          <TouchableOpacity
            key={key}
            style={[ps.btn, on && { backgroundColor: colors.bg2, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } }]}
            onPress={() => onChange(key)}
            activeOpacity={0.7}
          >
            <Text style={[ps.txt, { color: on ? colors.t1 : colors.t3, fontWeight: on ? '700' : '400' }]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
const ps = StyleSheet.create({
  row: { flexDirection: 'row', marginHorizontal: 16, borderRadius: 12, padding: 4, marginBottom: 16 },
  btn: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 9 },
  txt: { fontSize: 12 },
});

// ── Stats Cards ────────────────────────────────────────────────────────────
function StatsRow({ income, spent, net, format, colors }) {
  const items = [
    { label: 'Income', value: format(income), color: colors.mint },
    { label: 'Spent',  value: format(spent),  color: colors.red  },
    { label: 'Net',    value: (net >= 0 ? '+' : '') + format(net), color: net >= 0 ? colors.mint : colors.red },
  ];
  return (
    <View style={[sr.row]}>
      {items.map((item) => (
        <View key={item.label} style={[sr.card, { backgroundColor: colors.bg2, borderColor: colors.border }]}>
          <Text style={[sr.lbl, { color: colors.t3 }]}>{item.label}</Text>
          <Text style={[sr.val, { color: item.color }]} numberOfLines={1} adjustsFontSizeToFit>
            {item.value}
          </Text>
        </View>
      ))}
    </View>
  );
}
const sr = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, marginHorizontal: 16, marginBottom: 14 },
  card: { flex: 1, borderRadius: 12, borderWidth: 1, padding: 12, alignItems: 'center' },
  lbl: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5, fontWeight: '600' },
  val: { fontSize: 14, fontWeight: '700' },
});

// ── Bar Chart ──────────────────────────────────────────────────────────────
function BarChart({ data, colors }) {
  const hasData = data && data.some((d) => d.value > 0);
  if (!hasData) {
    return (
      <View style={bc.empty}>
        <Text style={{ color: colors.t4, fontSize: 12 }}>No spending data for this period</Text>
      </View>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const BAR_H  = 100;
  const count  = data.length;
  const gap    = 5;
  const barW   = Math.max(Math.floor((CHART_W - gap * (count - 1)) / count), 12);

  return (
    <View style={bc.wrap}>
      <View style={[bc.bars, { gap }]}>
        {data.map((item, i) => {
          const fillH   = item.value > 0 ? Math.max((item.value / maxVal) * BAR_H, 4) : 0;
          const isMax   = item.value === maxVal && item.value > 0;
          const barCol  = isMax ? colors.blue : `${colors.blue}40`;
          return (
            <View key={i} style={[bc.col, { width: barW }]}>
              <View style={[bc.track, { height: BAR_H }]}>
                <View style={[bc.fill, { height: fillH, backgroundColor: barCol }]} />
              </View>
              <Text style={[bc.lbl, { color: colors.t3 }]} numberOfLines={1}>{item.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
const bc = StyleSheet.create({
  wrap: { paddingHorizontal: 0 },
  bars: { flexDirection: 'row', alignItems: 'flex-end' },
  col: { alignItems: 'center' },
  track: { width: '100%', justifyContent: 'flex-end' },
  fill: { width: '100%', borderRadius: 4 },
  lbl: { fontSize: 9, marginTop: 5, textAlign: 'center' },
  empty: { paddingVertical: 28, alignItems: 'center' },
});

// ── Donut Chart ────────────────────────────────────────────────────────────
function DonutChart({ categories, total, chartColors, format, colors }) {
  const SIZE = 148;
  const R    = 50;
  const SW   = 22;
  const CX   = SIZE / 2;
  const CY   = SIZE / 2;

  function polar(deg) {
    const r = ((deg - 90) * Math.PI) / 180;
    return { x: CX + R * Math.cos(r), y: CY + R * Math.sin(r) };
  }

  const slices = useMemo(() => {
    if (!total || !categories || !categories.length) return [];
    let cur = 0;
    return categories.map((item, i) => {
      const sweep  = Math.max((item.amount / total) * 360, 0);
      const start  = cur;
      cur         += sweep;
      const end    = cur >= 360 ? 359.9999 : cur;
      const s      = polar(end);
      const e      = polar(start);
      const large  = sweep > 180 ? 1 : 0;
      const d      = `M ${s.x} ${s.y} A ${R} ${R} 0 ${large} 0 ${e.x} ${e.y}`;
      return { d, color: chartColors[i % chartColors.length] };
    });
  }, [categories, total, chartColors]);

  if (!slices.length) return null;

  return (
    <View style={dn.wrap}>
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <Circle cx={CX} cy={CY} r={R} fill="none" stroke={colors.bg4} strokeWidth={SW} />
        {slices.map((s, i) => (
          <Path key={i} d={s.d} fill="none" stroke={s.color} strokeWidth={SW - 2} strokeLinecap="butt" />
        ))}
      </Svg>
      <View style={dn.center} pointerEvents="none">
        <Text style={[dn.lbl, { color: colors.t3 }]}>TOTAL</Text>
        <Text style={[dn.val, { color: colors.t1 }]}>{format(total)}</Text>
      </View>
    </View>
  );
}
const dn = StyleSheet.create({
  wrap: { alignSelf: 'center', marginBottom: 16, position: 'relative', width: 148, height: 148, justifyContent: 'center', alignItems: 'center' },
  center: { position: 'absolute', alignItems: 'center' },
  lbl: { fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', fontWeight: '600' },
  val: { fontSize: 14, fontWeight: '700', marginTop: 2 },
});

// ── Category List (unlimited, scrollable) ─────────────────────────────────
function CategoryList({ categories, spent, chartColors, format, colors }) {
  if (!categories || categories.length === 0) return null;

  return (
    <>
      {categories.map((item, i) => {
        const pct = spent > 0 ? Math.round((item.amount / spent) * 100) : 0;
        const col = chartColors[i % chartColors.length];
        return (
          <View key={item.category} style={cl.item}>
            <View style={cl.header}>
              <View style={cl.left}>
                <View style={[cl.dot, { backgroundColor: col }]} />
                <Text style={cl.emoji}>{CATEGORY_ICONS[item.category] || '📦'}</Text>
                <Text style={[cl.name, { color: colors.t1 }]}>{item.category}</Text>
              </View>
              <View style={cl.right}>
                <Text style={[cl.pct, { color: colors.t3 }]}>{pct}%</Text>
                {/* Perfect right-aligned monospace amount */}
                <Text style={[cl.amt, { color: colors.t1 }]}>{format(item.amount)}</Text>
              </View>
            </View>
            <View style={[cl.track, { backgroundColor: colors.bg4 }]}>
              <View style={[cl.fill, { width: `${Math.min(pct, 100)}%`, backgroundColor: col }]} />
            </View>
          </View>
        );
      })}
    </>
  );
}
const cl = StyleSheet.create({
  item: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.06)' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 },
  left: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  emoji: { fontSize: 14 },
  name: { fontSize: 13, fontWeight: '600' },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pct: { fontSize: 12, minWidth: 32, textAlign: 'right', fontVariant: ['tabular-nums'] },
  amt: { fontSize: 13, fontWeight: '600', minWidth: 80, textAlign: 'right', fontVariant: ['tabular-nums'] },
  track: { height: 5, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
});

// ── Main Screen ────────────────────────────────────────────────────────────
export default function AnalyticsScreen() {
  const { colors, chartColors } = useTheme();
  const { validTx }  = useApp();
  const format       = useFormatCurrency();
  const dateHelpers  = useDateHelpers();

  const [period, setPeriod] = useState(ANALYTICS_PERIODS.MONTH);

  const periodTransactions = useMemo(() => {
    const rangeMap = {
      [ANALYTICS_PERIODS.WEEK]:  dateHelpers.currentWeekRange(),
      [ANALYTICS_PERIODS.MONTH]: dateHelpers.currentMonthRange(),
      [ANALYTICS_PERIODS.YEAR]:  dateHelpers.currentYearRange(),
    };
    const { start, end } = rangeMap[period] || dateHelpers.currentMonthRange();
    return (validTx || []).filter((tx) => {
      try {
        const d = new Date(tx.timestamp);
        return d >= start && d <= end;
      } catch { return false; }
    });
  }, [validTx, period, dateHelpers]);

  const stats   = useTransactionStats(periodTransactions);
  const barData = useMemo(() => buildBarData(periodTransactions, period), [periodTransactions, period]);

  const periodLabel = {
    [ANALYTICS_PERIODS.WEEK]:  'This Week',
    [ANALYTICS_PERIODS.MONTH]: new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' }),
    [ANALYTICS_PERIODS.YEAR]:  String(new Date().getFullYear()),
  }[period] || '';

  return (
    <View style={[sc.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={sc.header}>
          <Text style={[sc.title, { color: colors.t1 }]}>Analytics</Text>
          <Text style={[sc.subtitle, { color: colors.t3 }]}>{periodLabel}</Text>
        </View>

        <PeriodSelector active={period} onChange={setPeriod} colors={colors} />

        <StatsRow income={stats.income} spent={stats.spent} net={stats.net} format={format} colors={colors} />

        {/* Bar chart — spending over time */}
        <View style={[sc.card, { backgroundColor: colors.bg2, borderColor: colors.border }]}>
          <Text style={[sc.cardTitle, { color: colors.t1 }]}>Spending Over Time</Text>
          <BarChart data={barData} colors={colors} />
        </View>

        {/* Donut first, then unlimited category list below */}
        <View style={[sc.card, { backgroundColor: colors.bg2, borderColor: colors.border }]}>
          <Text style={[sc.cardTitle, { color: colors.t1 }]}>By Category</Text>

          {stats.categoryBreakdown.length > 0 ? (
            <>
              <DonutChart
                categories={stats.categoryBreakdown}
                total={stats.spent}
                chartColors={chartColors}
                format={format}
                colors={colors}
              />
              {/* Category list — unlimited, shows all */}
              <CategoryList
                categories={stats.categoryBreakdown}
                spent={stats.spent}
                chartColors={chartColors}
                format={format}
                colors={colors}
              />
            </>
          ) : (
            <View style={sc.empty}>
              <Text style={{ color: colors.t4, fontSize: 13 }}>No expense data for this period</Text>
            </View>
          )}
        </View>

        {periodTransactions.length > 0 && (
          <Text style={[sc.footnote, { color: colors.t4 }]}>
            {periodTransactions.length} transaction{periodTransactions.length !== 1 ? 's' : ''} in {periodLabel}
          </Text>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const sc = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 12 },
  title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.3 },
  subtitle: { fontSize: 13, marginTop: 2 },
  card: { marginHorizontal: 16, borderRadius: 16, borderWidth: 1, paddingTop: 16, paddingBottom: 4, marginBottom: 12, overflow: 'hidden' },
  cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 14, paddingHorizontal: 16 },
  empty: { paddingVertical: 24, alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16 },
  footnote: { textAlign: 'center', fontSize: 12, marginBottom: 8 },
});
