/**
 * ACROM v5 — App-wide constants
 */

export const STORAGE_KEYS = {
  TRANSACTIONS:    'acrom_tx4',
  BUDGETS:         'acrom_bud4',
  GOALS:           'acrom_goals4',
  CURRENCY:        'acrom_cur',
  CATEGORY_OVERRIDES: 'acrom_ovr4',
  SUBSCRIPTIONS:   'acrom_subs1',
  DEBTS:           'acrom_debts1',
  AI_INSIGHTS:     'acrom_ai1',
  APP_LOCK:        'acrom_lock1',
};

export const CURRENCY_OPTIONS = [
  { symbol: '₹',   code: 'INR', label: 'Indian Rupee'     },
  { symbol: '$',   code: 'USD', label: 'US Dollar'         },
  { symbol: '€',   code: 'EUR', label: 'Euro'              },
  { symbol: '£',   code: 'GBP', label: 'British Pound'     },
  { symbol: 'AED', code: 'AED', label: 'UAE Dirham'        },
  { symbol: 'CA$', code: 'CAD', label: 'Canadian Dollar'   },
  { symbol: 'A$',  code: 'AUD', label: 'Australian Dollar' },
  { symbol: '¥',   code: 'JPY', label: 'Japanese Yen'      },
];

// WEEK / MONTH / YEAR only — "All" removed per product decision
export const ANALYTICS_PERIODS = {
  WEEK:  'week',
  MONTH: 'month',
  YEAR:  'year',
};

export const TRANSACTION_TYPES = {
  DEBIT:  'debit',
  CREDIT: 'credit',
};

export const TRANSACTION_SOURCES = ['Manual', 'SMS', 'Email', 'Notification'];

export const BUDGET_ALERT_THRESHOLDS = {
  WARNING:  80,
  CRITICAL: 100,
};

export const MIN_TRANSACTION_AMOUNT = 0.01;

// Financial health score thresholds
export const HEALTH_SCORE = {
  EXCELLENT: 80,
  GOOD:      60,
  FAIR:      40,
  POOR:      0,
};

// Subscription detection keywords
export const SUBSCRIPTION_PATTERNS = [
  'netflix', 'spotify', 'amazon prime', 'hotstar', 'youtube premium',
  'zee5', 'sonyliv', 'apple music', 'google one', 'dropbox', 'notion',
  'adobe', 'microsoft 365', 'github', 'slack', 'zoom', 'swiggy one',
  'zomato pro', 'jio', 'airtel', 'vi', 'tata sky', 'dth',
];
