import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../services/ThemeContext';
import { useApp } from '../services/AppContext';
import { parseMessage, generateTxId, CATEGORY_ICONS } from '../utils/parseEngine';
import { useFormatCurrency } from '../hooks/useFormatCurrency';
import { TRANSACTION_TYPES } from '../constants';

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * @typedef {{ id: string, parsed: object, raw: string, selected: boolean }} ParsedSmsItem
 */

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Reads SMS via the SmsAndroid native module if available.
 * Returns an array of message objects or an empty array if unavailable.
 */
async function readSmsMessages() {
  return new Promise((resolve) => {
    // SmsAndroid is a native module injected by some Expo/RN SMS libraries.
    // It is NOT available in Expo Go — only in custom dev builds / APKs.
    const SmsAndroid = global.SmsAndroid || null;

    if (!SmsAndroid || Platform.OS !== 'android') {
      resolve([]);
      return;
    }

    SmsAndroid.list(
      JSON.stringify({
        box: 'inbox',
        maxCount: 200,
        // Only bank/financial SMS senders are typically short alphanumeric IDs
        address: '',
      }),
      (error) => {
        console.warn('SmsAndroid.list error:', error);
        resolve([]);
      },
      (count, rawSmsList) => {
        try {
          const messages = JSON.parse(rawSmsList);
          resolve(Array.isArray(messages) ? messages : []);
        } catch {
          resolve([]);
        }
      }
    );
  });
}

// ─── SMS Item Row ─────────────────────────────────────────────────────────────

function SmsItemRow({ item, onToggle, format, colors }) {
  const { parsed } = item;
  const isCredit = parsed.type === TRANSACTION_TYPES.CREDIT;
  const amtColor = isCredit ? colors.mint : colors.red;

  return (
    <TouchableOpacity
      style={[
        itemStyles.row,
        {
          backgroundColor: item.selected ? colors.mint + '12' : colors.bg2,
          borderColor: item.selected ? colors.mint : colors.border,
        },
      ]}
      onPress={onToggle}
      activeOpacity={0.75}
    >
      {/* Checkbox */}
      <View
        style={[
          itemStyles.checkbox,
          {
            backgroundColor: item.selected ? colors.mint : 'transparent',
            borderColor: item.selected ? colors.mint : colors.t4,
          },
        ]}
      >
        {item.selected && <Text style={itemStyles.checkmark}>✓</Text>}
      </View>

      {/* Content */}
      <View style={itemStyles.content}>
        <View style={itemStyles.topRow}>
          <Text style={[itemStyles.merchant, { color: colors.t1 }]} numberOfLines={1}>
            {parsed.merchant}
          </Text>
          <Text style={[itemStyles.amount, { color: amtColor }]}>
            {isCredit ? '+' : '-'}{format(parsed.amount)}
          </Text>
        </View>
        <View style={itemStyles.bottomRow}>
          <View style={[itemStyles.catChip, { backgroundColor: colors.bg4 }]}>
            <Text style={{ fontSize: 12 }}>{CATEGORY_ICONS[parsed.category] || '📦'}</Text>
            <Text style={[itemStyles.catText, { color: colors.t3 }]}>{parsed.category}</Text>
          </View>
          <Text style={[itemStyles.rawPreview, { color: colors.t4 }]} numberOfLines={1}>
            {item.raw.slice(0, 60)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const itemStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  checkmark: { fontSize: 13, fontWeight: '800', color: '#000' },
  content: { flex: 1 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  merchant: { fontSize: 14, fontWeight: '600', flex: 1, marginRight: 8 },
  amount: { fontSize: 14, fontWeight: '700', flexShrink: 0 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, gap: 4 },
  catText: { fontSize: 11 },
  rawPreview: { fontSize: 11, flex: 1 },
});

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function SmsScreen() {
  const { colors } = useTheme();
  const { addTransactions, currency, overrides } = useApp();
  const format = useFormatCurrency();

  const [scanState, setScanState] = useState('idle'); // 'idle' | 'scanning' | 'done' | 'no_module'
  const [parsedItems, setParsedItems] = useState([]);
  const [importedCount, setImportedCount] = useState(0);

  const handleScan = useCallback(async () => {
    if (Platform.OS !== 'android') {
      Alert.alert('Android Only', 'SMS scanning is only available on Android devices.');
      return;
    }

    setScanState('scanning');
    setParsedItems([]);

    try {
      const messages = await readSmsMessages();

      if (messages.length === 0) {
        setScanState('no_module');
        return;
      }

      const results = [];
      for (const msg of messages) {
        const body = msg.body || msg.address || '';
        if (!body.trim()) continue;

        const parsed = parseMessage(body, currency, overrides);
        if (!parsed) continue;

        results.push({
          id: msg._id ? String(msg._id) : generateTxId(),
          parsed,
          raw: body,
          selected: true,
        });
      }

      setParsedItems(results);
      setScanState('done');
    } catch (error) {
      console.warn('SMS scan error:', error);
      setScanState('no_module');
    }
  }, [currency, overrides]);

  const toggleItem = useCallback((id) => {
    setParsedItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item))
    );
  }, []);

  const toggleAll = useCallback(() => {
    const allSelected = parsedItems.every((item) => item.selected);
    setParsedItems((prev) => prev.map((item) => ({ ...item, selected: !allSelected })));
  }, [parsedItems]);

  const handleImport = useCallback(() => {
    const selected = parsedItems.filter((item) => item.selected);
    if (selected.length === 0) {
      Alert.alert('Nothing Selected', 'Select at least one transaction to import.');
      return;
    }

    const transactions = selected.map((item) => ({
      id: generateTxId(),
      timestamp: new Date().toISOString(),
      amount: item.parsed.amount,
      currency: item.parsed.currency || currency,
      type: item.parsed.type,
      category: item.parsed.category,
      merchant: item.parsed.merchant,
      source: 'SMS',
      raw: item.raw.slice(0, 200),
      is_dup: false,
    }));

    addTransactions(transactions);
    setImportedCount(selected.length);
    setParsedItems([]);
    setScanState('idle');
    Alert.alert('Imported', `${selected.length} transaction${selected.length !== 1 ? 's' : ''} added.`);
  }, [parsedItems, currency, addTransactions]);

  const selectedCount = parsedItems.filter((i) => i.selected).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.t1 }]}>SMS Scanner</Text>
          <Text style={[styles.subtitle, { color: colors.t3 }]}>
            Auto-detect transactions from your inbox
          </Text>
        </View>

        {/* Scan Button */}
        {(scanState === 'idle' || scanState === 'no_module') && (
          <View style={styles.centreBlock}>
            <Text style={{ fontSize: 48, marginBottom: 16 }}>📩</Text>
            <Text style={[styles.scanHint, { color: colors.t3 }]}>
              ACROM will scan your inbox for bank and payment messages and parse them automatically.
            </Text>
            <TouchableOpacity
              style={[styles.scanButton, { backgroundColor: colors.mint }]}
              onPress={handleScan}
              activeOpacity={0.85}
            >
              <Text style={styles.scanButtonText}>Scan SMS History</Text>
            </TouchableOpacity>
            {scanState === 'no_module' && (
              <View style={[styles.warningBox, { backgroundColor: colors.yellow + '20', borderColor: colors.yellow }]}>
                <Text style={[styles.warningText, { color: colors.yellow }]}>
                  ⚠️ SMS module not available. This feature requires a custom build (APK). It is not supported in Expo Go.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Scanning spinner */}
        {scanState === 'scanning' && (
          <View style={styles.centreBlock}>
            <ActivityIndicator size="large" color={colors.mint} />
            <Text style={[styles.scanHint, { color: colors.t3, marginTop: 16 }]}>
              Reading SMS messages…
            </Text>
          </View>
        )}

        {/* Results */}
        {scanState === 'done' && (
          <>
            {parsedItems.length === 0 ? (
              <View style={styles.centreBlock}>
                <Text style={{ fontSize: 40, marginBottom: 12 }}>🔍</Text>
                <Text style={[styles.scanHint, { color: colors.t3 }]}>
                  No financial transactions were found in your recent SMS messages.
                </Text>
                <TouchableOpacity
                  style={[styles.rescanBtn, { borderColor: colors.border }]}
                  onPress={() => setScanState('idle')}
                >
                  <Text style={{ color: colors.t2, fontSize: 14 }}>Scan Again</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.resultsHeader}>
                  <Text style={[styles.resultsTitle, { color: colors.t1 }]}>
                    Found {parsedItems.length} transaction{parsedItems.length !== 1 ? 's' : ''}
                  </Text>
                  <TouchableOpacity onPress={toggleAll}>
                    <Text style={[styles.toggleAll, { color: colors.blue }]}>
                      {parsedItems.every((i) => i.selected) ? 'Deselect All' : 'Select All'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.listContainer}>
                  {parsedItems.map((item) => (
                    <SmsItemRow
                      key={item.id}
                      item={item}
                      onToggle={() => toggleItem(item.id)}
                      format={format}
                      colors={colors}
                    />
                  ))}
                </View>
              </>
            )}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Sticky Import Button */}
      {scanState === 'done' && parsedItems.length > 0 && (
        <View style={[styles.stickyFooter, { backgroundColor: colors.bg, borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[
              styles.importButton,
              { backgroundColor: selectedCount > 0 ? colors.mint : colors.bg4 },
            ]}
            onPress={handleImport}
            disabled={selectedCount === 0}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.importButtonText,
                { color: selectedCount > 0 ? '#000' : colors.t4 },
              ]}
            >
              Import {selectedCount > 0 ? `${selectedCount} Transaction${selectedCount !== 1 ? 's' : ''}` : ''}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 16 },
  title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.3 },
  subtitle: { fontSize: 13, marginTop: 3 },
  centreBlock: {
    marginHorizontal: 20,
    alignItems: 'center',
    paddingTop: 40,
  },
  scanHint: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    maxWidth: 280,
  },
  scanButton: {
    paddingHorizontal: 28,
    paddingVertical: 15,
    borderRadius: 14,
    marginBottom: 16,
  },
  scanButtonText: { fontSize: 15, fontWeight: '700', color: '#000' },
  warningBox: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 16,
  },
  warningText: { fontSize: 12, lineHeight: 18, textAlign: 'center' },
  rescanBtn: {
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  resultsTitle: { fontSize: 15, fontWeight: '700' },
  toggleAll: { fontSize: 13, fontWeight: '600' },
  listContainer: { paddingHorizontal: 16 },
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopWidth: 1,
  },
  importButton: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  importButtonText: { fontSize: 15, fontWeight: '700' },
});
