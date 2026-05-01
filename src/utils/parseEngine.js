/**
 * ACROM Parse Engine v2
 * Multi-bank SMS + email parsing. No external API dependencies.
 * Handles: SBI, HDFC, ICICI, Axis, Kotak, Yes Bank, IDFC, IndusInd + all UPI apps
 */

export const CATEGORY_ICONS = {
  Food:          '🍔',
  Shopping:      '🛍️',
  Transport:     '🚗',
  Utilities:     '⚡',
  Recharge:      '📱',
  Entertainment: '🎬',
  Health:        '💊',
  Education:     '📚',
  SaaS:          '💻',
  Fuel:          '⛽',
  Travel:        '✈️',
  Groceries:     '🛒',
  Investment:    '📈',
  Insurance:     '🛡️',
  EMI:           '🏦',
  Rent:          '🏠',
  Salary:        '💼',
  Transfer:      '↔️',
  Others:        '📦',
};

const CATEGORY_KEYWORDS = {
  Food:          ['swiggy', 'zomato', 'dunzo', 'restaurant', 'cafe', 'food', 'pizza', 'burger', 'eat', 'hotel', 'dhaba', 'meal', 'lunch', 'dinner', 'breakfast', 'chai', 'tea', 'coffee', 'starbucks', 'mcdonald', 'kfc', 'dominos', 'subway', 'biryani', 'thali'],
  Groceries:     ['bigbasket', 'grofer', 'blinkit', 'zepto', 'dmart', 'reliance fresh', 'more supermarket', 'spencer', 'nature basket', 'grocery', 'vegetables', 'fruits', 'milk', 'bread'],
  Shopping:      ['amazon', 'flipkart', 'myntra', 'ajio', 'nykaa', 'shop', 'store', 'mart', 'mall', 'meesho', 'snapdeal', 'lenskart', 'decathlon', 'lifestyle', 'westside', 'h&m', 'zara'],
  Transport:     ['uber', 'ola', 'rapido', 'auto', 'taxi', 'cab', 'metro', 'bus', 'train', 'irctc', 'parking', 'toll', 'makemytrip', 'goibibo', 'redbus', 'yatra', 'cleartrip'],
  Fuel:          ['petrol', 'diesel', 'fuel', 'hp', 'indian oil', 'bharat petroleum', 'shell', 'reliance petroleum', 'cng', 'ev charge'],
  Travel:        ['hotel', 'oyo', 'airbnb', 'treebo', 'fabhotel', 'flight', 'spicejet', 'indigo', 'air india', 'vistara', 'go first'],
  Utilities:     ['electricity', 'water', 'gas', 'utility', 'bsnl', 'broadband', 'wifi', 'dth', 'tata sky', 'dish tv', 'sun direct', 'postpaid', 'prepaid'],
  Recharge:      ['recharge', 'topup', 'top-up', 'talktime', 'data pack', 'jio', 'airtel', 'vi', 'vodafone'],
  Entertainment: ['netflix', 'amazon prime', 'hotstar', 'disney', 'spotify', 'youtube', 'pvr', 'inox', 'movie', 'cinema', 'bookmyshow', 'zee5', 'sonyliv', 'apple tv'],
  Health:        ['pharmacy', 'medical', 'hospital', 'clinic', 'doctor', 'medicine', 'apollo', 'medplus', 'netmeds', '1mg', 'pharmeasy', 'lab', 'diagnostic', 'health', 'practo', 'tata 1mg'],
  Education:     ['udemy', 'coursera', 'byju', 'unacademy', 'school', 'college', 'university', 'course', 'tuition', 'coaching', 'book', 'stationery', 'vedantu', 'whitehat'],
  SaaS:          ['google', 'microsoft', 'adobe', 'dropbox', 'notion', 'slack', 'zoom', 'github', 'digitalocean', 'aws', 'azure', 'software', 'subscription', 'app store', 'play store', 'figma', 'canva'],
  Investment:    ['zerodha', 'groww', 'upstox', 'smallcase', 'coin', 'mutual fund', 'sip', 'stocks', 'etf', 'nps', 'ppf', 'fd', 'rd', 'demat', 'trading'],
  Insurance:     ['lic', 'insurance', 'premium', 'policy', 'hdfc life', 'icici pru', 'max life', 'term plan', 'health insurance', 'car insurance'],
  EMI:           ['emi', 'loan', 'repayment', 'installment', 'bajaj finance', 'hdfc bank loan', 'sbi loan', 'home loan', 'car loan', 'personal loan'],
  Rent:          ['rent', 'house rent', 'pg rent', 'hostel', 'flat rent', 'lease', 'nobroker'],
  Salary:        ['salary', 'payroll', 'wages', 'stipend', 'income', 'ctc', 'neft salary', 'imps salary'],
  Transfer:      ['transfer', 'neft', 'rtgs', 'imps', 'upi transfer', 'sent to', 'received from'],
};

/**
 * Enhanced multi-bank SMS parser.
 * Supports: SBI, HDFC, ICICI, Axis, Kotak, Paytm, PhonePe, GPay, IDFC, IndusInd
 */
export function parseMessage(text, fallbackCurrency = 'INR', overrides = {}) {
  if (!text || typeof text !== 'string' || text.length < 8) return null;

  const lower = text.toLowerCase();

  // Skip failed / OTP / promotional messages
  if (/failed|declined|unsuccessful|reversed|not processed|otp|password|pin|cvv|promo|offer|cashback earned/i.test(text)) return null;

  // ── Amount extraction (multiple patterns for different banks) ──────────────
  const amountPatterns = [
    // ₹1,234.56 or Rs.1234 or INR 1234
    /(?:₹|rs\.?\s*|inr\s*)([\d,]+(?:\.\d{1,2})?)/i,
    // 1234.56 at the end
    /([\d,]+(?:\.\d{1,2})?)\s*(?:₹|rs\.?\s*|inr)/i,
    // "amount of Rs.1234" "amount INR 5000"
    /(?:amount|amt|rs|inr|₹)[\s.:]*(?:of\s+)?(?:₹|rs\.?\s*|inr\s*)?([\d,]+(?:\.\d{1,2})?)/i,
    // USD/EUR/GBP amounts
    /(?:\$|usd\s*)([\d,]+(?:\.\d{1,2})?)/i,
    /(?:€|eur\s*)([\d,]+(?:\.\d{1,2})?)/i,
    /(?:£|gbp\s*)([\d,]+(?:\.\d{1,2})?)/i,
    // Generic: "debited 5000"
    /(?:debited|credited|payment|paid|spent|received)\s+(?:of\s+)?(?:₹|rs\.?)?\s*([\d,]+(?:\.\d{1,2})?)/i,
  ];

  let amount = null;
  for (const pattern of amountPatterns) {
    const match = text.match(pattern);
    if (match) {
      const parsed = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(parsed) && parsed > 0 && parsed < 100000000) {
        amount = parsed;
        break;
      }
    }
  }
  if (!amount) return null;

  // ── Transaction type detection ─────────────────────────────────────────────
  let type = null;
  if (/\b(?:debited|paid|spent|charged|withdrawn|deducted|sent|transferred to|payment of|purchase at|used at)\b/i.test(text)) {
    type = 'debit';
  } else if (/\b(?:credited|received|refund|deposited|cashback|reward|added|credit of)\b/i.test(text)) {
    type = 'credit';
  }
  if (!type) return null;

  // ── Currency detection ─────────────────────────────────────────────────────
  let currency = fallbackCurrency;
  if (/₹|inr|\brs\.?\b/i.test(text))  currency = 'INR';
  else if (/\$|usd/i.test(text))       currency = 'USD';
  else if (/€|eur/i.test(text))        currency = 'EUR';
  else if (/£|gbp/i.test(text))        currency = 'GBP';
  else if (/\baed\b/i.test(text))      currency = 'AED';

  // ── Merchant extraction (bank-specific patterns first) ──────────────────────
  let merchant = 'Unknown';
  const merchantPatterns = [
    // "at MERCHANT" / "to MERCHANT" / "@ MERCHANT"
    /\bat\s+([A-Za-z0-9][A-Za-z0-9\s&'.\-]{1,35}?)(?:\s+on\b|\s+via\b|\s+for\b|\s+dated|\s+\d|\.|,|$)/i,
    // "to VPA/Merchant"
    /\bto\s+([A-Za-z0-9][A-Za-z0-9\s&'.\-]{1,35}?)(?:\s+on\b|\s+via\b|\.|\,|$)/i,
    // "from MERCHANT"
    /\bfrom\s+([A-Za-z0-9][A-Za-z0-9\s&'.\-]{1,35}?)(?:\s+on\b|\s+via\b|\.|\,|$)/i,
    // "Info: UPI/MERCHANT*"
    /\binfo:\s*(?:upi\/)?([A-Za-z0-9][A-Za-z0-9\s&'.\-*]{1,30}?)(?:\*|\s+\d|$)/i,
    // Merchant: NAME
    /\bmerchant:\s*([A-Za-z0-9][A-Za-z0-9\s&'.\-]{1,30})/i,
  ];
  for (const pat of merchantPatterns) {
    const m = text.match(pat);
    if (m && m[1] && m[1].trim().length >= 2) {
      merchant = m[1].trim().replace(/\s+/g, ' ');
      break;
    }
  }

  // ── Category detection ─────────────────────────────────────────────────────
  const searchText = (lower + ' ' + merchant.toLowerCase());
  const overrideKey = merchant.toLowerCase().trim();
  let category = overrides[overrideKey] || 'Others';

  if (category === 'Others') {
    for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      if (keywords.some((kw) => searchText.includes(kw))) {
        category = cat;
        break;
      }
    }
  }

  // Salary override for credit transactions
  if (type === 'credit' && /salary|payroll|wages|stipend/i.test(text)) category = 'Salary';
  if (type === 'credit' && category === 'Others') category = 'Transfer';

  // ── Subscription / Bill detection ─────────────────────────────────────────
  // FIX: was /SUBSCRIPTION_PATTERNS/ (literal string) — now correctly checks keyword array
  const SUB_KW = ['netflix','spotify','amazon prime','hotstar','youtube premium','zee5','sonyliv',
    'apple music','google one','dropbox','notion','adobe','microsoft 365','github','slack','zoom',
    'swiggy one','zomato pro','jio','airtel','vi','tata sky','dth'];
  const isSubscription = SUB_KW.some((kw) => searchText.includes(kw)) ||
    /(monthly|annual|yearly|auto.?renew|renewal|subscription)/i.test(text);

  // ── Pending / failed detection ─────────────────────────────────────────────
  const isPending = /pending|processing|initiated|in progress/i.test(text);
  const isFailed  = /failed|declined|unsuccessful|reversed/i.test(text);

  return {
    amount,
    currency,
    type,
    merchant,
    category,
    isSubscription,
    isPending,
    isFailed,
  };
}

export function generateTxId() {
  return 'tx_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}
