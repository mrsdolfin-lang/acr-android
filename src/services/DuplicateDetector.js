/**
 * DuplicateDetector
 *
 * Generates a stable fingerprint for a transaction and checks it against
 * an existing list with fuzzy matching.
 *
 * Rules:
 *   - Same amount (exact)
 *   - Same type (debit/credit)
 *   - Merchant name similarity >= 80% (Jaro-Winkler approximation)
 *   - Timestamp within ±5 minutes of an existing transaction
 *
 * This handles the reality that the same payment may arrive via:
 *   SMS: "Your a/c debited ₹500 at Swiggy"
 *   Notification: "Swiggy: Payment of Rs.500 successful"
 *   Email: "Transaction of INR 500.00 at SWIGGY INDIA"
 */

const DUPLICATE_TIME_WINDOW_MS = 5 * 60 * 1000; // ±5 minutes

// ─── String Similarity ────────────────────────────────────────────────────────

/**
 * Simplified Jaro similarity between two strings.
 * Returns 0.0–1.0. Good enough for merchant name matching.
 */
function jaroSimilarity(a, b) {
  if (a === b) return 1.0;
  if (!a || !b) return 0.0;

  const matchWindow = Math.floor(Math.max(a.length, b.length) / 2) - 1;
  if (matchWindow < 0) return 0.0;

  const aMatches = new Array(a.length).fill(false);
  const bMatches = new Array(b.length).fill(false);
  let matchCount = 0;
  let transpositions = 0;

  for (let i = 0; i < a.length; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, b.length);
    for (let j = start; j < end; j++) {
      if (bMatches[j] || a[i] !== b[j]) continue;
      aMatches[i] = true;
      bMatches[j] = true;
      matchCount++;
      break;
    }
  }

  if (matchCount === 0) return 0.0;

  let k = 0;
  for (let i = 0; i < a.length; i++) {
    if (!aMatches[i]) continue;
    while (!bMatches[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }

  return (
    (matchCount / a.length +
      matchCount / b.length +
      (matchCount - transpositions / 2) / matchCount) /
    3
  );
}

/**
 * Normalizes a merchant name for comparison:
 * lowercase, remove special chars, collapse spaces.
 */
function normalizeMerchant(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Fingerprint ──────────────────────────────────────────────────────────────

/**
 * Generates a stable string fingerprint for a parsed transaction.
 * Used for exact-match dedup in storage (fast path).
 *
 * Format: "<type>|<amount>|<normalizedMerchant>|<timeSlotMinutes>"
 * Time slot = floor(timestamp / 5min) — groups events within the same 5-min window.
 */
export function generateFingerprint(amount, type, merchant, timestampMs) {
  const normalizedMerchant = normalizeMerchant(merchant);
  const timeSlot = Math.floor(timestampMs / DUPLICATE_TIME_WINDOW_MS);
  return `${type}|${amount}|${normalizedMerchant}|${timeSlot}`;
}

// ─── Fuzzy Duplicate Check ────────────────────────────────────────────────────

/**
 * Checks whether a candidate transaction is a duplicate of any transaction
 * in the existing list using fuzzy matching.
 *
 * Returns the matching existing transaction if found, or null.
 *
 * @param {object} candidate - { amount, type, merchant, timestamp (ISO string) }
 * @param {object[]} existingTransactions - array of stored transaction objects
 */
export function findDuplicate(candidate, existingTransactions) {
  if (!candidate || !existingTransactions || existingTransactions.length === 0) {
    return null;
  }

  const candidateTime = new Date(candidate.timestamp).getTime();
  if (isNaN(candidateTime)) return null;

  const normalizedCandidateMerchant = normalizeMerchant(candidate.merchant);

  for (const existing of existingTransactions) {
    // 1. Amount must match exactly (float precision tolerance: 0.01)
    if (Math.abs(existing.amount - candidate.amount) > 0.01) continue;

    // 2. Transaction type must match
    if (existing.type !== candidate.type) continue;

    // 3. Timestamp must be within ±5 minutes
    const existingTime = new Date(existing.timestamp).getTime();
    if (isNaN(existingTime)) continue;
    if (Math.abs(existingTime - candidateTime) > DUPLICATE_TIME_WINDOW_MS) continue;

    // 4. Merchant name similarity >= 0.75 (fuzzy)
    const normalizedExistingMerchant = normalizeMerchant(existing.merchant);
    const similarity = jaroSimilarity(normalizedCandidateMerchant, normalizedExistingMerchant);
    if (similarity < 0.75) continue;

    // All checks passed — this is a duplicate
    return existing;
  }

  return null;
}

// ─── Merge Logic ─────────────────────────────────────────────────────────────

/**
 * Merges two transaction records into the most complete version.
 * Prefers the record with more data (non-null/non-unknown fields).
 *
 * The "winner" keeps its ID so existing references remain valid.
 *
 * @param {object} existing - the already-stored transaction
 * @param {object} incoming - the new duplicate transaction
 * @returns {object} the merged transaction
 */
export function mergeTransactions(existing, incoming) {
  const pickBetter = (a, b) => {
    // Prefer non-null, non-empty, non-"Unknown" values
    if (!a || a === 'Unknown') return b;
    if (!b || b === 'Unknown') return a;
    // Prefer longer/more descriptive strings
    return String(a).length >= String(b).length ? a : b;
  };

  return {
    ...existing,
    merchant: pickBetter(existing.merchant, incoming.merchant),
    category: pickBetter(existing.category, incoming.category),
    raw: pickBetter(existing.raw, incoming.raw),
    // Track that this came from multiple sources
    sources: Array.from(
      new Set([
        ...(existing.sources || [existing.source]),
        ...(incoming.sources || [incoming.source]),
      ])
    ),
    source: existing.source, // keep original source label
    mergedAt: new Date().toISOString(),
  };
}
