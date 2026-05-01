/**
 * AutoCaptureService
 *
 * Orchestrates automatic transaction detection from:
 *   1. SMS (via SmsAndroid native module — custom APK builds only)
 *   2. Push Notifications (via expo-notifications foreground listener)
 *
 * Processing pipeline:
 *   Raw Event → parseMessage → enqueue (3-min buffer) → flush → dedup → commit
 *
 * This service is initialized once in App.js and runs for the app's lifetime.
 * It exposes a simple start/stop API and fires a callback when transactions are ready.
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { parseMessage, generateTxId } from '../utils/parseEngine';
import {
  enqueue,
  getReadyItems,
  markProcessed,
  pruneOldProcessedItems,
  POLL_INTERVAL_MS,
} from './CaptureQueue';
import { findDuplicate, mergeTransactions } from './DuplicateDetector';

// ─── Notification Filtering ───────────────────────────────────────────────────

/**
 * Known financial app package names / notification channel patterns.
 * Notifications NOT from these are ignored to avoid false positives.
 */
const FINANCIAL_NOTIFICATION_PATTERNS = [
  // UPI apps
  'gpay', 'google pay', 'phonepe', 'paytm', 'bhim', 'amazonpay', 'freecharge', 'mobikwik',
  // Banks
  'sbi', 'hdfc', 'icici', 'axis', 'kotak', 'yes bank', 'pnb', 'bob', 'canara', 'idfc',
  'indusind', 'federal', 'rbl', 'bandhan',
  // Payment keywords in notification body
  'debited', 'credited', 'payment', 'transaction', 'upi', 'neft', 'imps', 'rtgs',
];

function looksLikeFinancialNotification(notification) {
  const title = (notification.request?.content?.title || '').toLowerCase();
  const body = (notification.request?.content?.body || '').toLowerCase();
  const combined = title + ' ' + body;
  return FINANCIAL_NOTIFICATION_PATTERNS.some((pattern) => combined.includes(pattern));
}

// ─── Service State ────────────────────────────────────────────────────────────

let pollIntervalId = null;
let notificationListenerSubscription = null;
let onTransactionsReadyCallback = null;
let currentOverrides = {};
let currentCurrency = '₹';

// ─── Event Handlers ───────────────────────────────────────────────────────────

/**
 * Called when a new notification arrives while app is in foreground.
 * Filters for financial notifications, parses, and enqueues.
 */
async function handleIncomingNotification(notification) {
  if (!looksLikeFinancialNotification(notification)) return;

  const body = notification.request?.content?.body || '';
  const title = notification.request?.content?.title || '';
  const rawText = `${title} ${body}`.trim();

  const parsed = parseMessage(rawText, currentCurrency, currentOverrides);
  if (!parsed) return;

  await enqueue({
    source: 'Notification',
    rawText,
    parsed,
  });
}

/**
 * Flushes queue items that have been waiting ≥3 minutes.
 * Runs deduplication against existing transactions before committing.
 *
 * @param {object[]} existingTransactions - current committed transaction list
 * @returns {object[]} newly committed transactions (empty if none)
 */
async function flushReadyQueueItems(existingTransactions) {
  const readyItems = await getReadyItems();
  if (readyItems.length === 0) return [];

  const newlyCommitted = [];
  const processedQueueIds = [];

  // Group items by fingerprint to detect intra-queue duplicates
  // (e.g. same payment captured by both SMS and notification)
  const committed = [...existingTransactions]; // working copy for dedup

  for (const item of readyItems) {
    processedQueueIds.push(item.queueId);

    if (!item.parsed) continue; // failed to parse — discard

    const candidate = {
      amount: item.parsed.amount,
      type: item.parsed.type,
      merchant: item.parsed.merchant,
      timestamp: item.receivedAt,
    };

    // Check against already-committed transactions + newly committed in this batch
    const duplicate = findDuplicate(candidate, committed);

    if (duplicate) {
      // Merge into the existing record (improves data quality without duplicating)
      const merged = mergeTransactions(duplicate, {
        ...item.parsed,
        source: item.source,
        raw: item.rawText,
        timestamp: item.receivedAt,
      });

      // Signal to update the existing transaction record
      newlyCommitted.push({ ...merged, _mergeUpdate: true });
    } else {
      // New unique transaction — build full object
      const newTx = {
        id: generateTxId(),
        timestamp: item.receivedAt,
        amount: item.parsed.amount,
        currency: item.parsed.currency || currentCurrency,
        type: item.parsed.type,
        category: item.parsed.category,
        merchant: item.parsed.merchant,
        source: item.source,
        sources: [item.source],
        raw: item.rawText,
        is_dup: false,
        autoDetected: true,
      };
      newlyCommitted.push(newTx);
      committed.push(newTx); // add to working copy for intra-batch dedup
    }
  }

  // Mark all processed items so they don't re-flush
  if (processedQueueIds.length > 0) {
    await markProcessed(processedQueueIds);
  }

  // Clean up stale log entries
  await pruneOldProcessedItems();

  return newlyCommitted;
}

// ─── SMS Scanning ─────────────────────────────────────────────────────────────

/**
 * Performs a one-time scan of recent SMS inbox and enqueues financial messages.
 * Only runs on Android with the SmsAndroid native module available.
 *
 * @param {object[]} existingTransactions - to skip already-imported messages
 */
export async function scanRecentSms(existingTransactions = []) {
  if (Platform.OS !== 'android') return 0;

  const SmsAndroid = global.SmsAndroid || null;
  if (!SmsAndroid) return 0;

  return new Promise((resolve) => {
    SmsAndroid.list(
      JSON.stringify({ box: 'inbox', maxCount: 100 }),
      (error) => {
        console.warn('[AutoCapture] SMS scan error:', error);
        resolve(0);
      },
      async (count, rawSmsList) => {
        try {
          const messages = JSON.parse(rawSmsList);
          let enqueueCount = 0;

          for (const msg of messages) {
            const body = msg.body || '';
            if (!body.trim()) continue;

            const parsed = parseMessage(body, currentCurrency, currentOverrides);
            if (!parsed) continue;

            await enqueue({ source: 'SMS', rawText: body, parsed });
            enqueueCount++;
          }

          resolve(enqueueCount);
        } catch {
          resolve(0);
        }
      }
    );
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Starts the auto-capture service.
 *
 * @param {object} options
 * @param {string} options.currency - user's selected currency symbol
 * @param {object} options.overrides - merchant → category overrides
 * @param {function} options.onTransactionsReady - called with array of new/merged transactions
 */
export function startAutoCaptureService({ currency, overrides, onTransactionsReady, existingTransactions }) {
  currentCurrency = currency || '₹';
  currentOverrides = overrides || {};
  onTransactionsReadyCallback = onTransactionsReady;

  // Listen to foreground notifications
  notificationListenerSubscription = Notifications.addNotificationReceivedListener(
    handleIncomingNotification
  );

  // Start queue flush poll
  if (pollIntervalId) clearInterval(pollIntervalId);
  pollIntervalId = setInterval(async () => {
    try {
      const currentTx = existingTransactions ? existingTransactions() : [];
      const committed = await flushReadyQueueItems(currentTx);
      if (committed.length > 0 && onTransactionsReadyCallback) {
        onTransactionsReadyCallback(committed);
      }
    } catch (e) {
      console.warn('[AutoCapture] poll error:', e.message);
    }
  }, POLL_INTERVAL_MS);
}

/**
 * Updates the service's runtime config (called when user changes currency/overrides).
 */
export function updateAutoCaptureConfig({ currency, overrides }) {
  if (currency) currentCurrency = currency;
  if (overrides) currentOverrides = overrides;
}

/**
 * Stops all listeners and polling. Call on app unmount / sign-out.
 */
export function stopAutoCaptureService() {
  if (notificationListenerSubscription) {
    notificationListenerSubscription.remove();
    notificationListenerSubscription = null;
  }
  if (pollIntervalId) {
    clearInterval(pollIntervalId);
    pollIntervalId = null;
  }
  onTransactionsReadyCallback = null;
}

/**
 * Manually triggers an immediate queue flush (called on app foreground).
 */
export async function manualFlush(existingTransactions) {
  const committed = await flushReadyQueueItems(existingTransactions || []);
  if (committed.length > 0 && onTransactionsReadyCallback) {
    onTransactionsReadyCallback(committed);
  }
  return committed.length;
}
