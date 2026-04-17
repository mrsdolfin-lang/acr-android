// src/utils/parseEngine.js
export const CATEGORY_ICONS = {
  Food:'🍔', Shopping:'🛍', Transport:'🚗', Utilities:'⚡',
  Recharge:'📱', Entertainment:'🎬', Health:'💊', Education:'📚',
  SaaS:'💻', Others:'📦',
};

const CREDIT_KW = ['received','credited','refund','deposited','added','transferred to','credit of','cr '];
const IGNORE_KW = ['failed','declined','unsuccessful','reversed','blocked','on hold'];

const CURRENCY_RE = [
  [/(?:INR|Rs\.?|₹)\s*([\d,]+\.?\d*)/i,'₹'],
  [/\$\s*([\d,]+\.?\d*)/,'$'],
  [/€\s*([\d,]+\.?\d*)/,'€'],
  [/£\s*([\d,]+\.?\d*)/,'£'],
  [/AED\s*([\d,]+\.?\d*)/i,'AED'],
  [/CAD\s*([\d,]+\.?\d*)/i,'CAD'],
  [/AUD\s*([\d,]+\.?\d*)/i,'AUD'],
  [/¥\s*([\d,]+\.?\d*)/,'¥'],
  [/([\d,]+\.\d{2})/,'$'],
];

const CATS = {
  Food:['zomato','swiggy','mcdonalds','kfc','pizza','dominos','starbucks','restaurant','cafe','food'],
  Shopping:['amazon','flipkart','myntra','ajio','ebay','walmart','shopping','mall'],
  Transport:['uber','ola','lyft','rapido','taxi','cab','metro','fuel','petrol','diesel','parking'],
  Utilities:['electricity','water','gas','internet','wifi','jio','airtel','vodafone','bsnl','bill'],
  Recharge:['recharge','prepaid','topup','mobile','sim'],
  Entertainment:['netflix','prime','hotstar','spotify','youtube','disney','cinema','movie'],
  Health:['pharmacy','medical','hospital','doctor','clinic','apollo','1mg','health','gym'],
  Education:['coursera','udemy','education','school','college','tuition','book'],
  SaaS:['adobe','notion','slack','zoom','dropbox','github','aws','microsoft','saas'],
};

export function parseMessage(text, currency = '₹', overrides = {}) {
  if (!text) return null;
  const lo = text.toLowerCase();
  if (IGNORE_KW.some(k => lo.includes(k))) return null;

  let amount = null, detectedCurrency = currency;
  for (const [re, sym] of CURRENCY_RE) {
    const m = text.match(re);
    if (m) { amount = parseFloat(m[1].replace(/,/g,'')); detectedCurrency = sym; break; }
  }
  if (!amount || amount <= 0) return null;

  const type = CREDIT_KW.some(k => lo.includes(k)) ? 'credit' : 'debit';

  let merchant = 'Unknown';
  const merRE = [
    /(?:at|to|from|@)\s+([A-Z][a-zA-Z0-9 &\-.]{2,28}?)(?:\s+on|\s+via|\s+ref|\.|$)/i,
    /(?:merchant|store)\s*:\s*([A-Za-z0-9 \-.]{2,24})/i,
  ];
  for (const re of merRE) {
    const m = text.match(re);
    if (m && m[1]) { merchant = m[1].trim(); break; }
  }
  if (merchant === 'Unknown') {
    for (const kws of Object.values(CATS))
      for (const kw of kws)
        if (lo.includes(kw)) { merchant = kw.charAt(0).toUpperCase()+kw.slice(1); break; }
  }

  const lm = merchant.toLowerCase();
  let category = overrides[lm] || 'Others';
  if (category === 'Others') {
    outer: for (const [cat, kws] of Object.entries(CATS))
      for (const kw of kws)
        if (lm.includes(kw) || lo.includes(kw)) { category = cat; break outer; }
  }

  return { amount, currency: detectedCurrency, type, merchant, category };
}

export function generateTxId() {
  return 'tx_' + Date.now() + '_' + Math.random().toString(36).slice(2,6);
}
