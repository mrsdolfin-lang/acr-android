/**
 * CaptureLogScreen
 *
 * Shows the real-time state of the auto-capture pipeline:
 *   - Current queue (pending items waiting for the 3-min buffer)
 *   - Recently committed auto-detected transactions
 *   - System status (SMS module, notification permissions)
 *
 * Also allows manual trigger of the queue flush.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  RefreshControl,
  Platform,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import { useTheme } from '../services/ThemeContext';
import { useApp } from '../services/AppContext';
import { getPendingItems, getQueueStats, BUFFER_DELAY_MS } from '../services/CaptureQueue';
import { manualFlush } from '../services/AutoCaptureService';
import { useFormatCurrency } from '../hooks/useFormatCurrency';

// ─── Status Indicator ─────────────────────────────────────────────────────────

function StatusRow({ label, status, detail, colors }) {
  const dotColor = status === 'ok' ? colors.mint : status === 'warn' ? colors.yellow : colors.red;
  return (
    <View style={[rowStyles.row, { borderBottomColor: colors.border }]}>
      <View style={[rowStyles.dot, { backgroundColor: dotColor }]} />
      <View style={rowStyles.content}>
        <Text style={[rowStyles.label, { color: colors.t1 }]}>{label}</Text>
        {detail ? <Text style={[rowStyles.detail, { color: colors.t3 }]}>{detail}</Text> : null}
      </View>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, paddingHorizontal: 16 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 12, flexShrink: 0 },
  content: { flex: 1 },
  label: { fontSize: 14, fontWeight: '500' },
  detail: { fontSize: 12, marginTop: 2 },
});

// ─── Queue Item Card ──────────────────────────────────────────────────────────

function QueueItemCard({ item, colors }) {
  const receivedAt = new Date(item.receivedAt);
  const ageMs = Date.now() - receivedAt.getTime();
  const waitRemainMs = Math.max(0, BUFFER_DELAY_MS - ageMs);
  const waitRemainMin = Math.ceil(waitRemainMs / 60000);

  const isReady = waitRemainMs === 0;

  return (
    <View style={[queueStyles.card, { backgroundColor: colors.bg2, borderColor: colors.border }]}>
      <View style={queueStyles.topRow}>
        <View style={[queueStyles.sourceBadge, { backgroundColor: colors.blue + '22' }]}>
          <Text style={[queueStyles.sourceText, { color: colors.blue }]}>{item.source}</Text>
        </View>
        <View style={[
          queueStyles.statusBadge,
          { backgroundColor: isReady ? colors.mint + '22' : colors.yellow + '22' }
        ]}>
          <Text style={[queueStyles.statusText, { color: isReady ? colors.mint : colors.yellow }]}>
            {isReady ? '⚡ Ready' : `⏱ ${waitRemainMin}m`}
          </Text>
        </View>
      </View>

      {item.parsed ? (
        <Text style={[queueStyles.parsedText, { color: colors.t1 }]}>
          {item.parsed.type === 'debit' ? '-' : '+'}{item.parsed.currency || '₹'}
          {item.parsed.amount} · {item.parsed.merchant}
        </Text>
      ) : (
        <Text style={[queueStyles.parsedText, { color: colors.t4 }]}>Parse failed</Text>
      )}

      <Text style={[queueStyles.timeText, { color: colors.t4 }]}>
        Received {receivedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
      </Text>
    </View>
  );
}

const queueStyles = StyleSheet.create({
  card: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 8 },
  topRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  sourceBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  sourceText: { fontSize: 11, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '700' },
  parsedText: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  timeText: { fontSize: 11 },
});

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function CaptureLogScreen() {
  const { colors } = useTheme();
  const { validTx, queueStats } = useApp();
  const format = useFormatCurrency();

  const [pendingItems, setPendingItems] = useState([]);
  const [notifPermission, setNotifPermission] = useState('unknown');
  const [hasSmsModule, setHasSmsModule] = useState(false);
  const [flushing, setFlushing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadStatus = useCallback(async () => {
    const items = await getPendingItems();
    setPendingItems(items);

    const { status } = await Notifications.getPermissionsAsync();
    setNotifPermission(status);

    setHasSmsModule(Platform.OS === 'android' && !!global.SmsAndroid);
  }, []);

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 15000);
    return () => clearInterval(interval);
  }, [loadStatus]);

  const handleFlush = useCallback(async () => {
    setFlushing(true);
    await manualFlush(validTx);
    await loadStatus();
    setFlushing(false);
  }, [validTx, loadStatus]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadStatus();
    setRefreshing(false);
  }, [loadStatus]);

  // Recent auto-detected transactions
  const autoDetectedTx = validTx.filter((tx) => tx.autoDetected).slice(0, 20);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.mint} />
        }
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.t1 }]}>Auto Capture</Text>
          <Text style={[styles.subtitle, { color: colors.t3 }]}>
            Smart detection pipeline
          </Text>
        </View>

        {/* System Status */}
        <View style={[styles.section, { backgroundColor: colors.bg2, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.t1 }]}>System Status</Text>
          <StatusRow
            label="Notification Listener"
            status={notifPermission === 'granted' ? 'ok' : 'warn'}
            detail={notifPermission === 'granted' ? 'Active — monitoring payment notifications' : 'Permission required for notification capture'}
            colors={colors}
          />
          <StatusRow
            label="SMS Module"
            status={hasSmsModule ? 'ok' : 'warn'}
            detail={hasSmsModule ? 'Available — can read SMS inbox' : 'Requires custom APK build (not available in Expo Go)'}
            colors={colors}
          />
          <StatusRow
            label="Capture Queue"
            status={queueStats.pending > 0 ? 'warn' : 'ok'}
            detail={queueStats.pending > 0
              ? `${queueStats.pending} pending · ${queueStats.ready} ready to commit`
              : 'Empty — all events processed'
            }
            colors={colors}
          />
          <StatusRow
            label="Duplicate Guard"
            status="ok"
            detail="Jaro similarity · ±5 min time window · amount exact match"
            colors={colors}
          />
        </View>

        {/* Queue Controls */}
        <View style={[styles.section, { backgroundColor: colors.bg2, borderColor: colors.border }]}>
          <View style={styles.queueHeader}>
            <Text style={[styles.sectionTitle, { color: colors.t1 }]}>
              Buffer Queue ({pendingItems.length})
            </Text>
            <TouchableOpacity
              style={[styles.flushBtn, { backgroundColor: queueStats.ready > 0 ? colors.mint : colors.bg3 }]}
              onPress={handleFlush}
              disabled={flushing || queueStats.ready === 0}
            >
              <Text style={[styles.flushBtnText, { color: queueStats.ready > 0 ? '#000' : colors.t4 }]}>
                {flushing ? 'Processing…' : `Flush ${queueStats.ready > 0 ? `(${queueStats.ready})` : ''}`}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.queueNote, { color: colors.t3 }]}>
            Events wait 3 minutes before committing — this allows duplicates from multiple sources (SMS + notification) to arrive and be merged.
          </Text>

          {pendingItems.length === 0 ? (
            <View style={styles.emptyQueue}>
              <Text style={{ color: colors.t4, fontSize: 13 }}>No pending items</Text>
            </View>
          ) : (
            <View style={styles.queueList}>
              {pendingItems.map((item) => (
                <QueueItemCard key={item.queueId} item={item} colors={colors} />
              ))}
            </View>
          )}
        </View>

        {/* Recently Auto-Detected */}
        <View style={[styles.section, { backgroundColor: colors.bg2, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.t1 }]}>
            Auto-Detected ({autoDetectedTx.length})
          </Text>
          {autoDetectedTx.length === 0 ? (
            <View style={styles.emptyQueue}>
              <Text style={{ color: colors.t4, fontSize: 13 }}>No auto-detected transactions yet</Text>
            </View>
          ) : (
            autoDetectedTx.map((tx) => (
              <View
                key={tx.id}
                style={[styles.txRow, { borderBottomColor: colors.border }]}
              >
                <View style={styles.txLeft}>
                  <Text style={[styles.txMerchant, { color: colors.t1 }]}>{tx.merchant}</Text>
                  <Text style={[styles.txMeta, { color: colors.t3 }]}>
                    {tx.source}
                    {tx.sources && tx.sources.length > 1 ? ` · merged from ${tx.sources.join(', ')}` : ''}
                  </Text>
                </View>
                <Text style={[styles.txAmount, { color: tx.type === 'credit' ? colors.mint : colors.red }]}>
                  {tx.type === 'credit' ? '+' : '-'}{format(tx.amount)}
                </Text>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 14 },
  title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.3 },
  subtitle: { fontSize: 13, marginTop: 3 },
  section: {
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
  },
  queueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 16,
  },
  queueNote: {
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  flushBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  flushBtnText: { fontSize: 12, fontWeight: '700' },
  emptyQueue: { padding: 20, alignItems: 'center' },
  queueList: { paddingHorizontal: 12, paddingBottom: 12 },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  txLeft: { flex: 1, marginRight: 12 },
  txMerchant: { fontSize: 14, fontWeight: '600' },
  txMeta: { fontSize: 11, marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: '700', flexShrink: 0 },
});
