// src/utils/parseEngine.js
// ════════════════════════════════════════
//  ACROM Parse Engine v4.0
//  Rule-based SMS/Email/Notification parser
//  Supports 9 currencies, 10 categories
// ════════════════════════════════════════

const DEBIT_KEYWORDS  = ['spent','paid','debited','purchase','sent','deducted','withdrawn','charged','payment of','dr '];
const CREDIT_KEYWORDS = ['received','credited','refund','deposited','added','transferred to','credit of','cr '];
const IGNORE_KEYWORDS = ['failed','declined','unsuccessful','reversed','blocked','on hold','otp','expir'];

const CURRENCY_PATTERNS = [
  [/(?:INR|Rs\.?|₹)\s*([\d,]+\.?\d*)/i, '₹'],
  [/\$\s*([\d,]+\.?\d*)/, '$'],
  [/€\s*([\d,]+\.?\d*)/, '€'],
  [/£\s*([\d,]+\.?\d*)/, '£'],
  [/AED\s*([\d,]+\.?\d*)/i, 'AED'],
  [/CAD\s*([\d,]+\.?\d*)/i, 'CAD'],
  [/AUD\s*([\d,]+\.?\d*)/i, 'AUD'],
  [/¥\s*([\d,]+\.?\d*)/, '¥'],
  [/([\d,]+\.?\d*)\s*USD/i, '$'],
  [/([\d,]+\.\d{2})/, '$'],
];

const MERCHANT_PATTERNS = [
  /(?:at|to|from|@)\s+([A-Z][a-zA-Z0-9 &\-.]{2,28}?)(?:\s+on|\s+via|\s+ref|\.|\s*$)/i,
  /(?:merchant|store)\s*[:]\s*([A-Za-z0-9 \-.]{2,24})/i,
  /(?:UPI|IMPS|NEFT|RTGS)\s+(?:to|from)\s+([A-Za-z0-9 ]{2,28}?)(?:\s|$)/i,
];

export const CATEGORIES = {
  Food:          ['zomato','swiggy','mcdonalds','kfc','pizza','dominos','starbucks','dunkin','restaurant','cafe','food','grubhub','doordash','subway','blinkit','bigbasket','zepto','instamart'],
  Shopping:      ['amazon','flipkart','myntra','ajio','ebay','walmart','target','meesho','nykaa','costco','snapdeal','shopsy'],
  Transport:     ['uber','ola','lyft','rapido','dhl','fedex','taxi','cab','metro','bus','fuel','petrol','diesel','parking','toll','fastag','irctc','train','flight','airline'],
  Utilities:     ['electricity','water','gas','internet','wifi','broadband','jio','airtel','vodafone','bsnl','utility','bill','vi mobile','tata play','dth'],
  Recharge:      ['recharge','prepaid','topup','mobile','sim','data pack','jio recharge','airtel recharge'],
  Entertainment: ['netflix','prime','hotstar','spotify','youtube','apple music','disney','hbo','cinema','movie','theatre','gaming','steam','zee5','sonyliv','bookmyshow'],
  Health:        ['pharmacy','medical','hospital','doctor','clinic','apollo','1mg','pharmeasy','health','gym','fitness','netmeds','practo','lenskart'],
  Education:     ['coursera','udemy','unacademy','byju','whitehat','education','school','college','tuition','book','chegg'],
  SaaS:          ['adobe','notion','slack','zoom','dropbox','github','heroku','vercel','aws','google cloud','microsoft','atlassian','figma','canva'],
};

export const CATEGORY_ICONS = {
  Food:          '🍔',
  Shopping:      '🛍',
  Transport:     '🚗',
  Utilities:     '⚡',
  Recharge:      '📱',
  Entertainment: '🎬',
  Health:        '💊',
  Education:     '📚',
  SaaS:          '💻',
  Others:        '📦',
};

export const CATEGORY_COLORS = {
  Food:          '#5effa0',
  Shopping:      '#60a5fa',
  Transport:     '#ffd166',
  Utilities:     '#c084fc',
  Entertainment: '#ff5c5c',
  Health:        '#34d399',
  Recharge:      '#fb923c',
  Education:     '#facc15',
  SaaS:          '#38bdf8',
  Others:        '#94a3b8',
};

/**
 * Parse an SMS / notification / email text
 * Returns { amount, currency, type, merchant, category } or null
 */
export function parseMessage(text, activeCurrency = '$', overrides = {}) {
  if (!text || text.length < 10) return null;
  const lo = text.toLowerCase();

  // Skip ignored keywords
  if (IGNORE_KEYWORDS.some(k => lo.includes(k))) return null;

  // Extract amount + currency
  let amount = null, currency = activeCurrency;
  for (const [re, sym] of CURRENCY_PATTERNS) {
    const m = text.match(re);
    if (m) {
      const val = parseFloat(m[1].replace(/,/g, ''));
      if (val > 0) { amount = val; currency = sym; break; }
    }
  }
  if (!amount) return null;

  // Determine type
  const type = CREDIT_KEYWORDS.some(k => lo.includes(k)) ? 'credit' : 'debit';

  // Extract merchant
  let merchant = 'Unknown';
  for (const re of MERCHANT_PATTERNS) {
    const m = text.match(re);
    if (m && m[1] && m[1].length > 1) {
      merchant = m[1].trim();
      // Clean up common noise
      merchant = merchant.replace(/\b(pvt|ltd|limited|inc)\b/gi, '').trim();
      break;
    }
  }
  // Fallback: find known merchant in text
  if (merchant === 'Unknown') {
    const all = Object.values(CATEGORIES).flat();
    for (const kw of all) {
      if (lo.includes(kw)) {
        merchant = kw.charAt(0).toUpperCase() + kw.slice(1);
        break;
      }
    }
  }

  // Determine category
  let category = 'Others';
  const lm = merchant.toLowerCase();

  // Check user overrides first
  if (overrides[lm]) {
    category = overrides[lm];
  } else {
    outer: for (const [cat, kws] of Object.entries(CATEGORIES)) {
      for (const kw of kws) {
        if (lm.includes(kw) || lo.includes(kw)) {
          category = cat;
          break outer;
        }
      }
    }
  }

  return { amount, currency, type, merchant, category };
}

/**
 * Check for duplicate transaction (same amount+type within 2 min)
 */
export function isDuplicate(newTx, existingList) {
  const t = new Date(newTx.timestamp).getTime();
  return existingList.some(x =>
    !x.is_dup &&
    x.amount === newTx.amount &&
    x.type   === newTx.type &&
    Math.abs(new Date(x.timestamp).getTime() - t) < 120000
  );
}

/**
 * Generate unique transaction ID
 */
export function generateTxId() {
  return 'tx_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}
