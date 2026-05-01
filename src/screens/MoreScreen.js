/**
 * MoreScreen v2
 * - Dark Mode toggle completely removed
 * - Sign out working with 2 confirmations
 * - Clean settings UI
 * - PDF + Spreadsheet export
 */

import React, { useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Share, StatusBar,
} from 'react-native';
import { useTheme }          from '../services/ThemeContext';
import { useApp }            from '../services/AppContext';
import { CURRENCY_OPTIONS }  from '../constants';

// ── Reusable Section ────────────────────────────────────────────────────────
function Section({ title, children, colors }) {
  return (
    <View style={secS.wrap}>
      <Text style={[secS.label, { color: colors.t3 }]}>{title}</Text>
      <View style={[secS.card, { backgroundColor: colors.bg2, borderColor: colors.border }]}>
        {children}
      </View>
    </View>
  );
}
const secS = StyleSheet.create({
  wrap: { marginHorizontal: 16, marginBottom: 20 },
  label: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 7, paddingLeft: 2 },
  card: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
});

// ── Settings Row ────────────────────────────────────────────────────────────
function Row({ label, subLabel, onPress, right, colors, isLast, danger }) {
  return (
    <TouchableOpacity
      style={[rS.row, !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.6 : 1}
    >
      <View style={rS.left}>
        <Text style={[rS.label, { color: danger ? colors.red : colors.t1 }]}>{label}</Text>
        {subLabel ? <Text style={[rS.sub, { color: colors.t3 }]}>{subLabel}</Text> : null}
      </View>
      {right || null}
    </TouchableOpacity>
  );
}
const rS = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  left: { flex: 1, marginRight: 12 },
  label: { fontSize: 14, fontWeight: '500' },
  sub: { fontSize: 12, marginTop: 2 },
});

// ── Currency Picker ─────────────────────────────────────────────────────────
function CurrencyPicker({ current, onSelect, colors }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10 }}>
        {CURRENCY_OPTIONS.map(({ symbol, code }) => {
          const active = current === symbol;
          return (
            <TouchableOpacity
              key={code}
              style={[cpS.chip, {
                backgroundColor: active ? colors.blue : colors.bg3,
                borderColor: active ? colors.blue : colors.border,
              }]}
              onPress={() => onSelect(symbol)}
            >
              <Text style={[cpS.sym, { color: active ? '#fff' : colors.t1 }]}>{symbol}</Text>
              <Text style={[cpS.code, { color: active ? 'rgba(255,255,255,.7)' : colors.t3 }]}>{code}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}
const cpS = StyleSheet.create({
  chip: { alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, minWidth: 54 },
  sym: { fontSize: 14, fontWeight: '700' },
  code: { fontSize: 9, marginTop: 2 },
});

// ── PDF Builder ─────────────────────────────────────────────────────────────
function buildPdfHtml(transactions, userEmail, currency) {
  const sym = currency || '₹';
  const f2  = (n) => `${sym}${(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const now = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  const debit  = transactions.filter((t) => t.type === 'debit').reduce((s, t) => s + (t.amount || 0), 0);
  const credit = transactions.filter((t) => t.type === 'credit').reduce((s, t) => s + (t.amount || 0), 0);

  const rows = transactions.map((tx, i) => {
    const d   = new Date(tx.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const col = tx.type === 'debit' ? '#D92D2D' : '#00A651';
    return `<tr style="background:${i % 2 === 0 ? '#fff' : '#f9fafb'}">
      <td>${d}</td><td>${tx.merchant || '—'}</td>
      <td style="text-align:center">${tx.category || 'Others'}</td>
      <td style="text-align:center">${tx.source || 'Manual'}</td>
      <td style="text-align:right;color:${col};font-weight:600">${tx.type === 'debit' ? '−' : '+'}${f2(tx.amount)}</td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
  <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,Arial,sans-serif;padding:32px;font-size:12px;color:#111}.hd{border-bottom:3px solid #1A6FD4;padding-bottom:18px;margin-bottom:22px;display:flex;justify-content:space-between;align-items:flex-end}.brand{font-size:26px;font-weight:900;color:#0D1117}.brand span{color:#00A651}.meta{text-align:right;color:#7B8394;font-size:11px;line-height:1.8}.sum{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-bottom:24px}.sc{background:#f8f9fb;border:1px solid #e4e7ed;border-radius:10px;padding:14px;text-align:center}.sc-l{font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#7B8394;margin-bottom:4px}.sc-v{font-size:16px;font-weight:800}table{width:100%;border-collapse:collapse}th{background:#1A6FD4;color:#fff;padding:9px 11px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.5px}td{padding:8px 11px;border-bottom:1px solid #f0f2f5}tr:last-child td{border-bottom:none}.ft{border-top:1px solid #e4e7ed;padding-top:14px;color:#B0B8C4;font-size:10px;display:flex;justify-content:space-between;margin-top:20px}</style>
  </head><body>
  <div class="hd"><div><div class="brand">Acrom<span>.</span></div><div style="color:#7B8394;font-size:11px;margin-top:4px">Smart Expense Tracker — Account Statement</div></div>
  <div class="meta"><div><strong>Account:</strong> ${userEmail || 'Guest User'}</div><div><strong>Generated:</strong> ${now}</div><div><strong>Transactions:</strong> ${transactions.length}</div></div></div>
  <div class="sum"><div class="sc"><div class="sc-l">Total Income</div><div class="sc-v" style="color:#00A651">${f2(credit)}</div></div><div class="sc"><div class="sc-l">Total Spent</div><div class="sc-v" style="color:#D92D2D">${f2(debit)}</div></div><div class="sc"><div class="sc-l">Net Balance</div><div class="sc-v" style="color:${credit-debit>=0?'#00A651':'#D92D2D'}">${f2(credit-debit)}</div></div></div>
  <table><thead><tr><th>Date</th><th>Merchant</th><th style="text-align:center">Category</th><th style="text-align:center">Source</th><th style="text-align:right">Amount</th></tr></thead><tbody>${rows}</tbody></table>
  <div class="ft"><span>ACROM AutoExpense Tracker v5.0</span><span>System-generated statement · Not a bank document</span></div></body></html>`;
}

function buildCsvExport(transactions) {
  const header = 'Date,Time,Type,Amount,Currency,Category,Merchant,Source';
  const rows = (transactions || []).map((tx) => {
    const d = new Date(tx.timestamp);
    const esc = (s) => `"${String(s || '').replace(/"/g, "'")}"`;
    return [
      d.toLocaleDateString('en-IN'),
      d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
      tx.type, tx.amount, tx.currency || 'INR',
      esc(tx.category), esc(tx.merchant), tx.source || 'Manual',
    ].join(',');
  });
  return [header, ...rows].join('\n');
}

// ── Main Screen ─────────────────────────────────────────────────────────────
export default function MoreScreen() {
  const { colors } = useTheme();
  const { validTx, currency, setCurrency, user, signOut, doSync, syncing } = useApp();

  const handleSignOut = useCallback(() => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Confirm Sign Out', 'Your local data will stay on this device.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Yes, Sign Out', style: 'destructive', onPress: signOut },
          ]),
      },
    ]);
  }, [signOut]);

  const handleExportPdf = useCallback(async () => {
    if (!(validTx || []).length) { Alert.alert('No Data', 'No transactions to export.'); return; }
    try {
      await Share.share({
        message: buildPdfHtml(validTx, user?.email, currency),
        title: 'ACROM Statement',
      });
    } catch { Alert.alert('Export Failed'); }
  }, [validTx, user, currency]);

  const handleExportCsv = useCallback(async () => {
    if (!(validTx || []).length) { Alert.alert('No Data', 'No transactions to export.'); return; }
    try {
      await Share.share({ message: buildCsvExport(validTx), title: 'ACROM_transactions.csv' });
    } catch { Alert.alert('Export Failed'); }
  }, [validTx]);

  const handleSync = useCallback(() => {
    if (!user) { Alert.alert('Not Signed In', 'Sign in to enable cloud sync.'); return; }
    doSync();
  }, [user, doSync]);

  return (
    <View style={[s.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Text style={[s.title, { color: colors.t1 }]}>Settings</Text>
        </View>

        {/* Account */}
        <Section title="Account" colors={colors}>
          <Row
            label={user ? (user.displayName || user.email || 'Signed In') : 'Not signed in'}
            subLabel={user ? user.email : 'Using local storage only'}
            colors={colors} isLast={false}
          />
          <Row
            label={syncing ? 'Syncing…' : 'Sync to Cloud'}
            subLabel={user ? 'Back up to Firebase' : 'Sign in required'}
            onPress={handleSync}
            colors={colors} isLast={user ? false : true}
            right={<Text style={{ color: colors.t3, fontSize: 18 }}>↻</Text>}
          />
          {user && (
            <Row label="Sign Out" onPress={handleSignOut} colors={colors} isLast danger />
          )}
        </Section>

        {/* Currency */}
        <Section title="Currency" colors={colors}>
          <View style={{ paddingTop: 4, paddingBottom: 6 }}>
            <CurrencyPicker current={currency} onSelect={setCurrency} colors={colors} />
          </View>
        </Section>

        {/* Export */}
        <Section title="Export Data" colors={colors}>
          <Row
            label="Export as PDF"
            subLabel="Professional bank statement format"
            onPress={handleExportPdf}
            colors={colors} isLast={false}
            right={<Text style={{ color: colors.blue, fontSize: 16 }}>↗</Text>}
          />
          <Row
            label="Export as Spreadsheet"
            subLabel="CSV — Excel & Google Sheets compatible"
            onPress={handleExportCsv}
            colors={colors} isLast
            right={<Text style={{ color: colors.blue, fontSize: 16 }}>↗</Text>}
          />
        </Section>

        <View style={s.footer}>
          <Text style={[s.footerTxt, { color: colors.t4 }]}>ACROM Smart Expense Tracker v5.0</Text>
        </View>
        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 14 },
  title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.3 },
  footer: { alignItems: 'center', marginTop: 8 },
  footerTxt: { fontSize: 11 },
});
