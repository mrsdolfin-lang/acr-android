// src/services/smsService.js
// ════════════════════════════════════════
//  ACROM — Real Android SMS Service
//  Reads SMS history + listens for new SMS
// ════════════════════════════════════════

import { NativeModules, NativeEventEmitter, PermissionsAndroid, Platform } from 'react-native';
import { parseMessage, isDuplicate, generateTxId } from '../utils/parseEngine';

// ── REQUEST SMS PERMISSIONS ─────────────────
export async function requestSmsPermission() {
  if (Platform.OS !== 'android') return false;
  try {
    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.READ_SMS,
      PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
    ]);
    return (
      granted[PermissionsAndroid.PERMISSIONS.READ_SMS]    === 'granted' &&
      granted[PermissionsAndroid.PERMISSIONS.RECEIVE_SMS] === 'granted'
    );
  } catch (e) {
    console.warn('[SMS] Permission error:', e);
    return false;
  }
}

// ── CHECK PERMISSION STATUS ─────────────────
export async function checkSmsPermission() {
  if (Platform.OS !== 'android') return false;
  try {
    const read    = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_SMS);
    const receive = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECEIVE_SMS);
    return read && receive;
  } catch (e) {
    return false;
  }
}

// ── READ SMS HISTORY (last 200 messages) ────
export async function readSmsHistory(currency = '$', overrides = {}) {
  if (Platform.OS !== 'android') return [];

  const hasPermission = await checkSmsPermission();
  if (!hasPermission) {
    const granted = await requestSmsPermission();
    if (!granted) return [];
  }

  try {
    // Use react-native-android-sms-listener or direct ContentResolver
    const SmsAndroid = NativeModules.SmsAndroid;
    if (!SmsAndroid) {
      console.warn('[SMS] SmsAndroid module not available');
      return [];
    }

    return new Promise((resolve) => {
      SmsAndroid.list(
        JSON.stringify({
          box:    'inbox',
          maxCount: 200,
        }),
        (fail) => { console.warn('[SMS] Read failed:', fail); resolve([]); },
        (count, smsList) => {
          const messages = JSON.parse(smsList);
          const parsed   = [];
          const now      = new Date().toISOString();

          for (const sms of messages) {
            const body    = sms.body || '';
            const result  = parseMessage(body, currency, overrides);
            if (!result) continue;

            const tx = {
              ...result,
              id:        generateTxId(),
              timestamp: new Date(parseInt(sms.date)).toISOString(),
              source:    'SMS',
              raw:       body.slice(0, 200),
              is_dup:    false,
            };

            // Skip duplicates within parsed list
            if (!isDuplicate(tx, parsed)) {
              parsed.push(tx);
            }
          }

          // Sort by date descending
          parsed.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
          console.log(`[SMS] Parsed ${parsed.length} transactions from ${messages.length} SMS`);
          resolve(parsed);
        }
      );
    });
  } catch (e) {
    console.warn('[SMS] Read error:', e.message);
    return [];
  }
}

// ── LISTEN FOR NEW INCOMING SMS ──────────────
let smsSubscription = null;

export function startSmsListener(onNewTransaction, currency = '$', overrides = {}) {
  if (Platform.OS !== 'android') return;

  try {
    // Using react-native-android-sms-listener
    const SmsListener = require('react-native-android-sms-listener').default;
    smsSubscription = SmsListener.addListener(message => {
      console.log('[SMS] New SMS received:', message.originatingAddress);
      const result = parseMessage(message.body, currency, overrides);
      if (result) {
        const tx = {
          ...result,
          id:        generateTxId(),
          timestamp: new Date().toISOString(),
          source:    'SMS',
          raw:       (message.body || '').slice(0, 200),
          is_dup:    false,
        };
        onNewTransaction(tx);
      }
    });
    console.log('[SMS] Listener started ✓');
  } catch (e) {
    console.warn('[SMS] Listener error:', e.message);
  }
}

export function stopSmsListener() {
  if (smsSubscription) {
    smsSubscription.remove();
    smsSubscription = null;
    console.log('[SMS] Listener stopped');
  }
}

// ── BANK SENDER FILTER ───────────────────────
//  Many banks send from shortcodes like HDFCBK, SBIINB, etc.
export const KNOWN_BANK_SENDERS = [
  'HDFCBK', 'ICICIB', 'SBIINB', 'AXISBK', 'KOTAKB',
  'PNBSMS', 'BOBIMT', 'CANBNK', 'UNIONB', 'INDBNK',
  'PAYTMB', 'GPAY', 'PHONEPE', 'AMAZON', 'FLIPKRT',
  'CITIBNK', 'HSBC', 'SCBNK', 'YESBNK', 'IDBIBK',
  'CENTBK', 'SYNDBK', 'ALLBNK', 'CORPBK', 'DENABNK',
];

export function isBankSender(address) {
  if (!address) return false;
  const upper = address.toUpperCase();
  return KNOWN_BANK_SENDERS.some(s => upper.includes(s)) ||
         /^[A-Z]{2}-[A-Z0-9]{4,8}$/.test(upper); // Format: VM-HDFCBK
}
