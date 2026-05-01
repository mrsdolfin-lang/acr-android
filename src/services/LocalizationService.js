/**
 * LocalizationService — Language, Timezone, Region
 * Supports: English, Hindi, Arabic (RTL), French, Spanish
 * Auto-detects timezone and applies region-based formats
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Supported Languages ────────────────────────────────────────────────────
export const LANGUAGES = {
  en: { label: 'English',    nativeLabel: 'English',   rtl: false, flag: '🇺🇸' },
  hi: { label: 'Hindi',      nativeLabel: 'हिंदी',      rtl: false, flag: '🇮🇳' },
  ar: { label: 'Arabic',     nativeLabel: 'العربية',    rtl: true,  flag: '🇸🇦' },
  fr: { label: 'French',     nativeLabel: 'Français',   rtl: false, flag: '🇫🇷' },
  es: { label: 'Spanish',    nativeLabel: 'Español',    rtl: false, flag: '🇪🇸' },
};

// ── Translation Dictionary ─────────────────────────────────────────────────
const T = {
  en: {
    home:            'Home',
    transactions:    'Transactions',
    analytics:       'Analytics',
    budget:          'Budget',
    goals:           'Goals',
    settings:        'Settings',
    ai:              'AI Insights',
    thisMonth:       'This Month',
    income:          'Income',
    spent:           'Spent',
    saved:           'Saved',
    balance:         'Balance',
    addExpense:      'Add Transaction',
    delete:          'Delete',
    cancel:          'Cancel',
    confirm:         'Confirm',
    signOut:         'Sign Out',
    currency:        'Currency',
    language:        'Language',
    timezone:        'Timezone',
    syncCloud:       'Sync to Cloud',
    exportPDF:       'Export as PDF',
    exportCSV:       'Export as Spreadsheet',
    healthScore:     'Health Score',
    prediction:      'Prediction',
    netWorth:        'Net Worth',
    subscriptions:   'Subscriptions',
    suggestions:     'Smart Suggestions',
    noData:          'No transactions yet',
    deleteTitle:     'Delete Transaction',
    deleteMsg:       'Are you sure you want to delete this?',
    deleteFinal:     'This cannot be undone.',
    yes:             'Yes, Delete',
    no:              'Keep it',
    thisWeek:        'This Week',
    thisYear:        'This Year',
    week:            'Week',
    month:           'Month',
    year:            'Year',
  },
  hi: {
    home:            'होम',
    transactions:    'लेनदेन',
    analytics:       'विश्लेषण',
    budget:          'बजट',
    goals:           'लक्ष्य',
    settings:        'सेटिंग्स',
    ai:              'AI अंतर्दृष्टि',
    thisMonth:       'इस महीने',
    income:          'आय',
    spent:           'खर्च',
    saved:           'बचत',
    balance:         'बैलेंस',
    addExpense:      'लेनदेन जोड़ें',
    delete:          'हटाएं',
    cancel:          'रद्द करें',
    confirm:         'पुष्टि करें',
    signOut:         'साइन आउट',
    currency:        'मुद्रा',
    language:        'भाषा',
    timezone:        'समय क्षेत्र',
    syncCloud:       'क्लाउड से सिंक',
    exportPDF:       'PDF निर्यात करें',
    exportCSV:       'स्प्रेडशीट निर्यात',
    healthScore:     'वित्तीय स्कोर',
    prediction:      'पूर्वानुमान',
    netWorth:        'कुल संपत्ति',
    subscriptions:   'सदस्यताएं',
    suggestions:     'सुझाव',
    noData:          'अभी कोई लेनदेन नहीं',
    deleteTitle:     'लेनदेन हटाएं',
    deleteMsg:       'क्या आप इसे हटाना चाहते हैं?',
    deleteFinal:     'यह क्रिया पूर्ववत नहीं की जा सकती।',
    yes:             'हां, हटाएं',
    no:              'रखें',
    thisWeek:        'इस सप्ताह',
    thisYear:        'इस साल',
    week:            'सप्ताह',
    month:           'महीना',
    year:            'वर्ष',
  },
  ar: {
    home:            'الرئيسية',
    transactions:    'المعاملات',
    analytics:       'التحليلات',
    budget:          'الميزانية',
    goals:           'الأهداف',
    settings:        'الإعدادات',
    ai:              'رؤى الذكاء',
    thisMonth:       'هذا الشهر',
    income:          'الدخل',
    spent:           'المصروف',
    saved:           'المدخر',
    balance:         'الرصيد',
    addExpense:      'إضافة معاملة',
    delete:          'حذف',
    cancel:          'إلغاء',
    confirm:         'تأكيد',
    signOut:         'تسجيل الخروج',
    currency:        'العملة',
    language:        'اللغة',
    timezone:        'المنطقة الزمنية',
    syncCloud:       'مزامنة السحابة',
    exportPDF:       'تصدير PDF',
    exportCSV:       'تصدير جدول',
    healthScore:     'نقاط الصحة',
    prediction:      'التنبؤ',
    netWorth:        'صافي الثروة',
    subscriptions:   'الاشتراكات',
    suggestions:     'اقتراحات ذكية',
    noData:          'لا توجد معاملات',
    deleteTitle:     'حذف المعاملة',
    deleteMsg:       'هل أنت متأكد؟',
    deleteFinal:     'لا يمكن التراجع.',
    yes:             'نعم، احذف',
    no:              'احتفظ به',
    thisWeek:        'هذا الأسبوع',
    thisYear:        'هذا العام',
    week:            'أسبوع',
    month:           'شهر',
    year:            'سنة',
  },
  fr: {
    home:            'Accueil',
    transactions:    'Transactions',
    analytics:       'Analytiques',
    budget:          'Budget',
    goals:           'Objectifs',
    settings:        'Paramètres',
    ai:              'IA Insights',
    thisMonth:       'Ce Mois',
    income:          'Revenus',
    spent:           'Dépenses',
    saved:           'Épargne',
    balance:         'Solde',
    addExpense:      'Ajouter',
    delete:          'Supprimer',
    cancel:          'Annuler',
    confirm:         'Confirmer',
    signOut:         'Déconnexion',
    currency:        'Devise',
    language:        'Langue',
    timezone:        'Fuseau Horaire',
    syncCloud:       'Sync Cloud',
    exportPDF:       'Exporter PDF',
    exportCSV:       'Exporter Tableau',
    healthScore:     'Score Santé',
    prediction:      'Prédiction',
    netWorth:        'Patrimoine Net',
    subscriptions:   'Abonnements',
    suggestions:     'Suggestions IA',
    noData:          'Aucune transaction',
    deleteTitle:     'Supprimer Transaction',
    deleteMsg:       'Êtes-vous sûr?',
    deleteFinal:     'Action irréversible.',
    yes:             'Oui, Supprimer',
    no:              'Garder',
    thisWeek:        'Cette Semaine',
    thisYear:        'Cette Année',
    week:            'Semaine',
    month:           'Mois',
    year:            'Année',
  },
  es: {
    home:            'Inicio',
    transactions:    'Transacciones',
    analytics:       'Analíticas',
    budget:          'Presupuesto',
    goals:           'Metas',
    settings:        'Ajustes',
    ai:              'Insights IA',
    thisMonth:       'Este Mes',
    income:          'Ingresos',
    spent:           'Gastado',
    saved:           'Ahorrado',
    balance:         'Saldo',
    addExpense:      'Agregar',
    delete:          'Eliminar',
    cancel:          'Cancelar',
    confirm:         'Confirmar',
    signOut:         'Cerrar Sesión',
    currency:        'Moneda',
    language:        'Idioma',
    timezone:        'Zona Horaria',
    syncCloud:       'Sync Nube',
    exportPDF:       'Exportar PDF',
    exportCSV:       'Exportar Tabla',
    healthScore:     'Puntuación Salud',
    prediction:      'Predicción',
    netWorth:        'Patrimonio Neto',
    subscriptions:   'Suscripciones',
    suggestions:     'Sugerencias IA',
    noData:          'Sin transacciones',
    deleteTitle:     'Eliminar Transacción',
    deleteMsg:       '¿Estás seguro?',
    deleteFinal:     'No se puede deshacer.',
    yes:             'Sí, Eliminar',
    no:              'Conservar',
    thisWeek:        'Esta Semana',
    thisYear:        'Este Año',
    week:            'Semana',
    month:           'Mes',
    year:            'Año',
  },
};

// ── Date Formats per Region ────────────────────────────────────────────────
export const DATE_FORMATS = {
  IN: { format: 'DD/MM/YYYY', locale: 'en-IN', separator: '/' },
  US: { format: 'MM/DD/YYYY', locale: 'en-US', separator: '/' },
  EU: { format: 'DD.MM.YYYY', locale: 'de-DE', separator: '.' },
  UK: { format: 'DD/MM/YYYY', locale: 'en-GB', separator: '/' },
};

// ── Number Formats per Region ──────────────────────────────────────────────
export const NUMBER_FORMATS = {
  IN: { thousandSep: ',', decimalSep: '.', locale: 'en-IN' },
  US: { thousandSep: ',', decimalSep: '.', locale: 'en-US' },
  EU: { thousandSep: '.', decimalSep: ',', locale: 'de-DE' },
};

// Currency → region mapping
const CURRENCY_REGIONS = {
  INR: 'IN', USD: 'US', CAD: 'US', AUD: 'US',
  EUR: 'EU', GBP: 'UK', AED: 'IN', JPY: 'JP',
};

// ── Translate function ─────────────────────────────────────────────────────
export function t(key, lang = 'en') {
  return (T[lang] && T[lang][key]) || T['en'][key] || key;
}

// ── Format currency by region ──────────────────────────────────────────────
export function formatAmount(amount, currencyCode, region) {
  if (amount === null || amount === undefined || isNaN(amount)) return '0';
  const r = region || CURRENCY_REGIONS[currencyCode] || 'US';
  const fmt = NUMBER_FORMATS[r] || NUMBER_FORMATS.US;
  try {
    return Math.abs(amount).toLocaleString(fmt.locale, {
      maximumFractionDigits: 0,
    });
  } catch {
    return Math.abs(amount).toFixed(0);
  }
}

// ── Format date by region ──────────────────────────────────────────────────
export function formatDate(iso, region = 'IN') {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (isNaN(d)) return '';
    const fmt = DATE_FORMATS[region] || DATE_FORMATS.IN;
    return d.toLocaleDateString(fmt.locale, {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return ''; }
}

// ── Timezone helpers ───────────────────────────────────────────────────────
export function getDeviceTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
  } catch {
    return 'Asia/Kolkata';
  }
}

export function getTimezonedDate(timezone) {
  try {
    return new Date(new Date().toLocaleString('en-US', { timeZone: timezone }));
  } catch {
    return new Date();
  }
}

// ── Persistence ────────────────────────────────────────────────────────────
const LANG_KEY = 'acrom_lang';
const TZ_KEY   = 'acrom_tz';

export async function saveLanguage(lang)   { try { await AsyncStorage.setItem(LANG_KEY, lang); } catch {} }
export async function loadLanguage()       { try { return await AsyncStorage.getItem(LANG_KEY) || 'en'; } catch { return 'en'; } }
export async function saveTimezone(tz)     { try { await AsyncStorage.setItem(TZ_KEY, tz); } catch {} }
export async function loadTimezone()       { try { return await AsyncStorage.getItem(TZ_KEY) || getDeviceTimezone(); } catch { return getDeviceTimezone(); } }
