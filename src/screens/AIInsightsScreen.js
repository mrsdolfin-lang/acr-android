/**
 * AIInsightsScreen — Phase 6 Advanced Intelligence
 *
 * Features:
 *  - Financial Health Score with breakdown
 *  - Spending predictions
 *  - Anomaly alerts
 *  - Saving suggestions
 *  - Subscription tracker
 *  - Net worth snapshot
 */

import React, { useMemo, useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, StatusBar, TouchableOpacity,
} from 'react-native';
import { useTheme }           from '../services/ThemeContext';
import { useApp }             from '../services/AppContext';
import { useFormatCurrency }  from '../hooks/useFormatCurrency';
import {
  calculateHealthScore,
  detectOverspending,
  detectAnomalies,
  generateSavingSuggestions,
  detectSubscriptions,
  calculateNetWorthSnapshot,
  predictNextMonthExpenses,
  loadCachedInsights,
  saveCachedInsights,
  clearInsightsCache,
} from '../services/AIInsightsService';

// ── Health Score Ring ───────────────────────────────────────────────────────
function HealthScoreRing({ score, grade, colors }) {
  const size  = 120;
  const r     = 46;
  const circ  = 2 * Math.PI * r;
  const fill  = circ * (score / 100);
  const gap   = circ - fill;

  const ringColor =
    score >= 80 ? colors.mint :
    score >= 60 ? colors.blue :
    score >= 40 ? colors.yellow : colors.red;

  return (
    <View style={hs.wrap}>
      <View style={hs.svgWrap}>
        {/* SVG-like circle using border trick */}
        <View style={[hs.circle, { borderColor: colors.bg4 }]} />
        <View style={hs.centerText}>
          <Text style={[hs.scoreNum, { color: ringColor }]}>{score}</Text>
          <Text style={[hs.scoreMax, { color: colors.t3 }]}>/100</Text>
        </View>
      </View>
      <Text style={[hs.grade, { color: ringColor }]}>{grade}</Text>
    </View>
  );
}
const hs = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 8 },
  svgWrap: { width: 110, height: 110, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  circle: { position: 'absolute', width: 100, height: 100, borderRadius: 50, borderWidth: 10 },
  centerText: { alignItems: 'center' },
  scoreNum: { fontSize: 30, fontWeight: '800' },
  scoreMax: { fontSize: 12, marginTop: -2 },
  grade: { fontSize: 15, fontWeight: '700' },
});

// ── Info Card ───────────────────────────────────────────────────────────────
function InfoCard({ title, children, colors, accent }) {
  return (
    <View style={[ic.card, { backgroundColor: colors.bg2, borderColor: colors.border, borderLeftColor: accent || colors.border, borderLeftWidth: accent ? 3 : 1 }]}>
      <Text style={[ic.title, { color: colors.t1 }]}>{title}</Text>
      {children}
    </View>
  );
}
const ic = StyleSheet.create({
  card: { marginHorizontal: 16, marginBottom: 12, borderRadius: 14, borderWidth: 1, padding: 16 },
  title: { fontSize: 14, fontWeight: '700', marginBottom: 10 },
});

// ── Alert Row ───────────────────────────────────────────────────────────────
function AlertRow({ alert, colors }) {
  const col = alert.type === 'critical' ? colors.red : colors.yellow;
  return (
    <View style={[ar.row, { backgroundColor: col + '12' }]}>
      <View style={[ar.dot, { backgroundColor: col }]} />
      <View style={{ flex: 1 }}>
        <Text style={[ar.msg, { color: colors.t1 }]}>{alert.message}</Text>
        <Text style={[ar.sub, { color: colors.t3 }]}>
          Spent {'\u20B9'}{Math.round(alert.spent).toLocaleString('en-IN')} of {'\u20B9'}{Math.round(alert.limit).toLocaleString('en-IN')} budget
        </Text>
      </View>
      <Text style={[ar.pct, { color: col }]}>{alert.pct}%</Text>
    </View>
  );
}
const ar = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, marginBottom: 8, gap: 10 },
  dot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  msg: { fontSize: 13, fontWeight: '600' },
  sub: { fontSize: 11, marginTop: 2 },
  pct: { fontSize: 14, fontWeight: '700', flexShrink: 0 },
});

// ── Suggestion Card ─────────────────────────────────────────────────────────
function SuggestionCard({ suggestion, format, colors }) {
  return (
    <View style={[sug.card, { backgroundColor: colors.bg3 }]}>
      <Text style={sug.icon}>{suggestion.icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[sug.title, { color: colors.t1 }]}>{suggestion.title}</Text>
        <Text style={[sug.detail, { color: colors.t2 }]}>{suggestion.detail}</Text>
        {suggestion.saving > 0 && (
          <Text style={[sug.saving, { color: colors.mint }]}>
            Potential savings: {format(suggestion.saving)}/mo
          </Text>
        )}
      </View>
    </View>
  );
}
const sug = StyleSheet.create({
  card: { flexDirection: 'row', padding: 12, borderRadius: 12, marginBottom: 8, gap: 12, alignItems: 'flex-start' },
  icon: { fontSize: 22, flexShrink: 0, marginTop: 2 },
  title: { fontSize: 13, fontWeight: '700', marginBottom: 3 },
  detail: { fontSize: 12, lineHeight: 17 },
  saving: { fontSize: 12, fontWeight: '600', marginTop: 4 },
});

// ── Main Screen ─────────────────────────────────────────────────────────────
export default function AIInsightsScreen() {
  const { colors } = useTheme();
  const { validTx, budgets } = useApp();
  const format = useFormatCurrency();

  const txArr = validTx || [];

  // ── Compute fresh insights (memoized so they only recalculate when data changes)
  const freshInsights = useMemo(() => ({
    healthScore:   calculateHealthScore(txArr, budgets || {}),
    overspending:  detectOverspending(txArr, budgets || {}),
    anomalies:     detectAnomalies(txArr),
    suggestions:   generateSavingSuggestions(txArr, budgets || {}),
    subscriptions: detectSubscriptions(txArr),
    netWorth:      calculateNetWorthSnapshot(txArr),
    prediction:    predictNextMonthExpenses(txArr),
  }), [txArr, budgets]);

  // ── Cache: save fresh insights whenever they change ──────────────────────
  useEffect(() => {
    saveCachedInsights(freshInsights).catch(() => {});
  }, [freshInsights]);

  // ── Convenience: clear cache and force recompute on manual refresh ────────
  const handleRefresh = useCallback(async () => {
    await clearInsightsCache();
  }, []);

  // ── Destructure (always use fresh — cache is only for cold launch speed) ──
  const { healthScore, overspending, anomalies, suggestions, subscriptions, netWorth, prediction } = freshInsights;

  const totalSubCost = subscriptions.reduce((s, sub) => s + (sub.amount || 0), 0);

  return (
    <View style={[s.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Text style={[s.title, { color: colors.t1 }]}>AI Insights</Text>
          <Text style={[s.subtitle, { color: colors.t3 }]}>Your financial intelligence</Text>
        </View>

        {/* Financial Health Score */}
        <InfoCard title="Financial Health Score" colors={colors} accent={colors.mint}>
          <HealthScoreRing score={healthScore.score} grade={healthScore.grade} colors={colors} />
          {healthScore.savingsRate > 0 && (
            <Text style={{ color: colors.t3, fontSize: 12, textAlign: 'center', marginTop: 6 }}>
              Savings rate: {healthScore.savingsRate}%
            </Text>
          )}
          {healthScore.factors && healthScore.factors.length > 0 && (
            <View style={{ marginTop: 12 }}>
              {healthScore.factors.map((f) => (
                <View key={f.label} style={[s.factorRow, { borderBottomColor: colors.border }]}>
                  <Text style={[s.factorLabel, { color: colors.t2 }]}>{f.label}</Text>
                  <Text style={[s.factorVal, { color: colors.t3 }]}>{f.value}</Text>
                  <View style={[s.factorBar, { backgroundColor: colors.bg4 }]}>
                    <View style={[s.factorFill, { width: `${Math.round(f.score / f.max * 100)}%`, backgroundColor: f.score / f.max > 0.6 ? colors.mint : colors.yellow }]} />
                  </View>
                  <Text style={[s.factorScore, { color: colors.t1 }]}>{f.score}/{f.max}</Text>
                </View>
              ))}
            </View>
          )}
          {txArr.length === 0 && (
            <Text style={{ color: colors.t4, fontSize: 13, textAlign: 'center', paddingVertical: 8 }}>
              Add transactions to see your score
            </Text>
          )}
        </InfoCard>

        {/* Net Worth Snapshot */}
        <InfoCard title="Net Worth Snapshot" colors={colors} accent={colors.blue}>
          <View style={s.netRow}>
            <View style={s.netItem}>
              <Text style={[s.netLbl, { color: colors.t3 }]}>Cash Balance</Text>
              <Text style={[s.netVal, { color: colors.t1 }]}>{format(netWorth.cashBalance)}</Text>
            </View>
            <View style={s.netItem}>
              <Text style={[s.netLbl, { color: colors.t3 }]}>Total Invested</Text>
              <Text style={[s.netVal, { color: colors.blue }]}>{format(netWorth.totalInvested)}</Text>
            </View>
            <View style={s.netItem}>
              <Text style={[s.netLbl, { color: colors.t3 }]}>Net Worth</Text>
              <Text style={[s.netVal, { color: colors.mint, fontWeight: '800' }]}>{format(netWorth.netWorth)}</Text>
            </View>
          </View>
        </InfoCard>

        {/* Expense Prediction */}
        {txArr.length >= 3 && (
          <InfoCard title="Next Month Prediction" colors={colors} accent={colors.yellow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <Text style={[s.predAmount, { color: colors.t1 }]}>{format(prediction.predicted)}</Text>
                <Text style={[s.predSub, { color: colors.t3 }]}>Estimated expenses</Text>
              </View>
              <View style={[s.trendBadge, { backgroundColor: prediction.trend > 500 ? colors.red + '15' : colors.mint + '15' }]}>
                <Text style={{ color: prediction.trend > 500 ? colors.red : colors.mint, fontSize: 13, fontWeight: '700' }}>
                  {prediction.trendLabel}
                </Text>
                {prediction.trendAmount > 0 && (
                  <Text style={{ color: colors.t3, fontSize: 11, marginTop: 2 }}>
                    {prediction.trend > 0 ? '+' : '−'}{format(prediction.trendAmount)}
                  </Text>
                )}
              </View>
            </View>
          </InfoCard>
        )}

        {/* Overspending Alerts */}
        {overspending.length > 0 && (
          <InfoCard title={`⚠️ Budget Alerts (${overspending.length})`} colors={colors} accent={colors.red}>
            {overspending.map((alert, i) => (
              <AlertRow key={i} alert={alert} colors={colors} />
            ))}
          </InfoCard>
        )}

        {/* Anomalies */}
        {anomalies.length > 0 && (
          <InfoCard title="🔍 Unusual Transactions" colors={colors} accent={colors.yellow}>
            {anomalies.map((a, i) => (
              <View key={i} style={[s.anomalyRow, { borderBottomColor: colors.border }]}>
                <Text style={[s.anomalyMerchant, { color: colors.t1 }]}>{a.merchant}</Text>
                <Text style={[s.anomalyMsg, { color: colors.t3 }]}>{a.message}</Text>
              </View>
            ))}
          </InfoCard>
        )}

        {/* Saving Suggestions */}
        {suggestions.length > 0 && (
          <InfoCard title="💡 Smart Suggestions" colors={colors} accent={colors.mint}>
            {suggestions.map((sug, i) => (
              <SuggestionCard key={i} suggestion={sug} format={format} colors={colors} />
            ))}
          </InfoCard>
        )}

        {/* Subscriptions */}
        {subscriptions.length > 0 && (
          <InfoCard title={`📺 Active Subscriptions · ${format(totalSubCost)}/mo`} colors={colors} accent={colors.blue}>
            {subscriptions.map((sub, i) => (
              <View key={i} style={[s.subRow, { borderBottomColor: colors.border }]}>
                <View>
                  <Text style={[s.subName, { color: colors.t1 }]}>{sub.merchant}</Text>
                  <Text style={[s.subCat, { color: colors.t3 }]}>{sub.category} · {sub.frequency}</Text>
                </View>
                <Text style={[s.subAmt, { color: colors.red }]}>{format(sub.amount)}/mo</Text>
              </View>
            ))}
            {totalSubCost > 0 && (
              <Text style={[s.subTotal, { color: colors.t3 }]}>
                Yearly: {format(totalSubCost * 12)}
              </Text>
            )}
          </InfoCard>
        )}

        {txArr.length === 0 && (
          <View style={s.emptyState}>
            <Text style={{ fontSize: 40, marginBottom: 16 }}>🧠</Text>
            <Text style={[s.emptyTitle, { color: colors.t1 }]}>No data yet</Text>
            <Text style={[s.emptySub, { color: colors.t3 }]}>
              Add transactions to unlock AI-powered insights, health scores, and spending predictions.
            </Text>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 14 },
  title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.3 },
  subtitle: { fontSize: 13, marginTop: 2 },
  factorRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, borderBottomWidth: StyleSheet.hairlineWidth, gap: 8 },
  factorLabel: { width: 100, fontSize: 12 },
  factorVal: { fontSize: 11, width: 68 },
  factorBar: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  factorFill: { height: '100%', borderRadius: 2 },
  factorScore: { fontSize: 12, fontWeight: '600', width: 38, textAlign: 'right' },
  netRow: { flexDirection: 'row', gap: 0 },
  netItem: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  netLbl: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, fontWeight: '600' },
  netVal: { fontSize: 14, fontWeight: '700' },
  predAmount: { fontSize: 22, fontWeight: '800' },
  predSub: { fontSize: 12, marginTop: 2 },
  trendBadge: { padding: 10, borderRadius: 12, alignItems: 'center' },
  anomalyRow: { paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth },
  anomalyMerchant: { fontSize: 13, fontWeight: '600' },
  anomalyMsg: { fontSize: 12, marginTop: 2 },
  subRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth },
  subName: { fontSize: 13, fontWeight: '600' },
  subCat: { fontSize: 11, marginTop: 2 },
  subAmt: { fontSize: 13, fontWeight: '700' },
  subTotal: { fontSize: 12, textAlign: 'right', marginTop: 8 },
  emptyState: { alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  emptySub: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
});
