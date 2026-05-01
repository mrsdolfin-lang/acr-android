/**
 * CaptureQueue
 *
 * A persistent, time-delayed buffer for auto-detected transactions.
 *
 * Flow:
 *   1. Any source (SMS, notification) calls enqueue(rawEvent)
 *   2. Event is stored in AsyncStorage with a receivedAt timestamp
 *   3. A periodic processor checks the queue every 60s
 *   4. Events older than BUFFER_DELAY_MS are flushed, deduplicated, and committed
 *
 * This 3-minute window intentionally allows duplicate events from multiple
 * sources (SMS + notification for the same payment) to arrive before processing.
 *
 * The queue is AsyncStorage-backed so it survives app restarts.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_STORAGE_KEY = 'acrom_capture_queue_v1';
const BUFFER_DELAY_MS = 3 * 60 * 1000; // 3 minutes
const POLL_INTERVAL_MS = 60 * 1000;    // Check every 60 seconds

// ─── Queue Item Shape ─────────────────────────────────────────────────────────
// {
//   queueId: string,        unique ID for this queue entry
//   receivedAt: ISO string, when it was enqueued
//   source: string,         'SMS' | 'Notification' | 'Email'
//   rawText: string,        masked original message (sensitive data stripped)
//   parsed: {               pre-parsed transaction data
//     amount, currency, type, merchant, category
//   } | null,
//   processed: boolean      true once committed or discarded
// }

// ─── Private Helpers ──────────────────────────────────────────────────────────

/**
 * Masks sensitive patterns in raw message text before storing.
 * Removes account numbers, card numbers, CVVs, OTPs.
 */
function maskSensitiveData(text) {
  if (!text) return '';
  return text
    .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '****-****-****-****') // card numbers
    .replace(/\b[Aa][Cc][Cc](?:ount|t)?\.?\s*(?:no\.?\s*)?\d{6,20}\b/g, 'ACCT-XXXXX') // account numbers
    .replace(/\bOTP\s*(?:is\s*)?\d{4,8}\b/gi, 'OTP-XXXX')   // OTPs
    .replace(/\b\d{9,18}\b/g, (match) => {                   // long number sequences
      // Keep amounts (short numbers) but mask long account-like numbers
      return match.length > 8 ? 'XXXX' : match;
    })
    .slice(0, 300); // hard cap on stored length
}

async function readQueue() {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function writeQueue(items) {
  try {
    await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.warn('[CaptureQueue] writeQueue error:', e);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Enqueues a raw captured event.
 * @param {object} event - { source, rawText, parsed }
 */
export async function enqueue(event) {
  const queue = await readQueue();
  const item = {
    queueId: 'q_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5),
    receivedAt: new Date().toISOString(),
    source: event.source || 'Unknown',
    rawText: maskSensitiveData(event.rawText || ''),
    parsed: event.parsed || null,
    processed: false,
  };
  queue.push(item);
  await writeQueue(queue);
  return item.queueId;
}

/**
 * Returns all unprocessed queue items older than BUFFER_DELAY_MS.
 * These are ready to be committed.
 */
export async function getReadyItems() {
  const queue = await readQueue();
  const cutoff = Date.now() - BUFFER_DELAY_MS;
  return queue.filter(
    (item) => !item.processed && new Date(item.receivedAt).getTime() <= cutoff
  );
}

/**
 * Returns all unprocessed items (for UI display of pending queue).
 */
export async function getPendingItems() {
  const queue = await readQueue();
  return queue.filter((item) => !item.processed);
}

/**
 * Marks specific queue items as processed so they are not re-committed.
 * @param {string[]} queueIds
 */
export async function markProcessed(queueIds) {
  const queue = await readQueue();
  const idSet = new Set(queueIds);
  const updated = queue.map((item) =>
    idSet.has(item.queueId) ? { ...item, processed: true, processedAt: new Date().toISOString() } : item
  );
  await writeQueue(updated);
}

/**
 * Clears processed items older than 24 hours to prevent unbounded growth.
 */
export async function pruneOldProcessedItems() {
  const queue = await readQueue();
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const pruned = queue.filter(
    (item) => !(item.processed && new Date(item.receivedAt).getTime() < cutoff)
  );
  await writeQueue(pruned);
}

/**
 * Returns queue item count for status display.
 */
export async function getQueueStats() {
  const queue = await readQueue();
  const pending = queue.filter((i) => !i.processed).length;
  const cutoff = Date.now() - BUFFER_DELAY_MS;
  const ready = queue.filter(
    (i) => !i.processed && new Date(i.receivedAt).getTime() <= cutoff
  ).length;
  return { total: queue.length, pending, ready };
}

export { BUFFER_DELAY_MS, POLL_INTERVAL_MS };
