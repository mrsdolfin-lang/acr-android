/**
 * PricingService — ACROM Subscription Tiers
 * AI-determined pricing based on: features, market, value delivered
 *
 * India pricing: INR (aggressive — large addressable market, price-sensitive)
 * Global pricing: USD (premium — international benchmark)
 *
 * Payment gateway:
 *   India → Razorpay
 *   Global → Stripe
 */

export const PLANS = {
  free: {
    id:          'free',
    name:        'Starter',
    badge:       'Free Forever',
    icon:        '🆓',
    india: {
      monthly:   0,
      yearly:    0,
      lifetime:  0,
      currency:  '₹',
    },
    global: {
      monthly:   0,
      yearly:    0,
      lifetime:  0,
      currency:  '$',
    },
    features: [
      '50 transactions/month',
      'Basic analytics (Week/Month)',
      'Manual SMS paste',
      '2 budget categories',
      '1 savings goal',
      'INR / USD currency',
      'Local storage only',
    ],
    limits: {
      transactions:      50,
      categories:         2,
      goals:              1,
      aiInsightsPerDay:   3,
      cloudSync:      false,
      pdfExport:      false,
      multiCurrency:  false,
    },
  },

  pro: {
    id:    'pro',
    name:  'Pro',
    badge: 'Most Popular',
    icon:  '⭐',
    india: {
      monthly:   99,       // ₹99/mo — below Walnut ₹149
      yearly:    799,      // ₹799/yr = ₹66/mo (33% off)
      lifetime:  1999,     // ₹1999 one-time
      currency:  '₹',
    },
    global: {
      monthly:   4.99,    // $4.99/mo — competitive with Mint
      yearly:    39.99,   // $39.99/yr = $3.33/mo (33% off)
      lifetime:  99,      // $99 one-time
      currency:  '$',
    },
    features: [
      'Unlimited transactions',
      'All analytics (Week/Month/Year)',
      'Auto SMS capture (multi-bank)',
      'Unlimited budgets & goals',
      'AI Health Score + Predictions',
      'Subscription tracker',
      'PDF + Excel export',
      'All 8 currencies',
      'Firebase cloud sync',
      'Duplicate detection',
      'Net worth dashboard',
    ],
    limits: {
      transactions:     -1,  // unlimited
      categories:       -1,
      goals:            -1,
      aiInsightsPerDay: -1,
      cloudSync:        true,
      pdfExport:        true,
      multiCurrency:    true,
    },
  },

  elite: {
    id:    'elite',
    name:  'Elite',
    badge: 'Best Value',
    icon:  '💎',
    india: {
      monthly:   199,      // ₹199/mo
      yearly:    1499,     // ₹1499/yr = ₹125/mo (37% off)
      lifetime:  3499,     // ₹3499 one-time
      currency:  '₹',
    },
    global: {
      monthly:   9.99,    // $9.99/mo
      yearly:    79.99,   // $79.99/yr = $6.67/mo (33% off)
      lifetime:  199,     // $199 one-time
      currency:  '$',
    },
    features: [
      'Everything in Pro',
      'Multi-language UI (5 languages)',
      'Timezone-aware daily reset',
      'EMI & credit card tracking',
      'Expense splitting & debt tracker',
      'Gamification (streaks, badges)',
      'Voice expense entry',
      'AI chat assistant',
      'Auto budget creation (AI)',
      'No-spend day tracker',
      'Priority support',
    ],
    limits: {
      transactions:       -1,
      categories:         -1,
      goals:              -1,
      aiInsightsPerDay:   -1,
      cloudSync:          true,
      pdfExport:          true,
      multiCurrency:      true,
      multiLanguage:      true,
    },
  },
};

// ── Payment Gateway Logic ──────────────────────────────────────────────────
export function getPaymentGateway(currencyCode) {
  // India: INR → Razorpay
  // Global: USD/EUR/GBP/AED/CAD/AUD/JPY → Stripe
  return currencyCode === 'INR' ? 'razorpay' : 'stripe';
}

export function getPlanPricing(plan, currencyCode) {
  const isIndia = currencyCode === 'INR';
  return isIndia ? PLANS[plan]?.india : PLANS[plan]?.global;
}

// ── Razorpay config (India) ────────────────────────────────────────────────
export const RAZORPAY_CONFIG = {
  keyId:    'YOUR_RAZORPAY_KEY_ID',         // → Replace in .env
  appName:  'ACROM Smart Expense Tracker',
  currency: 'INR',
  theme:    { color: '#1A6FD4' },
};

// ── Stripe config (Global) ─────────────────────────────────────────────────
export const STRIPE_CONFIG = {
  publishableKey: 'YOUR_STRIPE_PUBLISHABLE_KEY',  // → Replace in .env
  merchantName:   'ACROM Expense Tracker',
};

// ── Subscription helpers ───────────────────────────────────────────────────
export function isFeatureAllowed(plan, featureKey) {
  const planData = PLANS[plan];
  if (!planData) return false;
  if (plan === 'elite' || plan === 'pro') return true;
  return planData.limits[featureKey] !== false;
}

export function getUpgradeMessage(featureKey, currency = 'INR') {
  const isIndia = currency === 'INR';
  const pro = isIndia ? '₹99/mo' : '$4.99/mo';
  const msgs = {
    cloudSync:     `Cloud sync requires Pro (${pro}). Upgrade to sync across devices.`,
    pdfExport:     `PDF export requires Pro (${pro}). Upgrade to export statements.`,
    multiCurrency: `Multiple currencies require Pro (${pro}). Upgrade to track in any currency.`,
    multiLanguage: `Multiple languages require Elite. Upgrade for full localization.`,
  };
  return msgs[featureKey] || `Upgrade to Pro (${pro}) to unlock this feature.`;
}
