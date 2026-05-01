<div align="center">

# Acrom. 🧠
### AI-Powered Smart Expense Tracker

[![Expo SDK](https://img.shields.io/badge/Expo-SDK%2051-000020?logo=expo)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React%20Native-0.74.5-61DAFB?logo=react)](https://reactnative.dev)
[![Firebase](https://img.shields.io/badge/Firebase-10.x-FFCA28?logo=firebase)](https://firebase.google.com)
[![License](https://img.shields.io/badge/License-MIT-00A651)](LICENSE)

**Smarter Money. Zero Effort.**

[Features](#features) • [Setup](#setup) • [Screenshots](#screenshots) • [Architecture](#architecture)

</div>

---

## ✨ Features

| Category | Features |
|----------|---------|
| 🧠 **AI Intelligence** | Financial health score, expense prediction, anomaly detection, smart suggestions |
| 📩 **Auto Capture** | SMS parsing (multi-bank), notification capture, 3-minute dedup buffer |
| 📊 **Analytics** | Week/Month/Year charts, category breakdown, donut + bar charts |
| 💰 **Finance** | Budget tracking with alerts, savings goals, net worth snapshot |
| ☁️ **Cloud Sync** | Firebase Firestore real-time sync, multi-device support |
| 🔐 **Auth** | Google Sign-In, Email/Password, Password Reset |
| 📤 **Export** | PDF bank statement, CSV spreadsheet, JSON backup |
| 🌍 **Multi-currency** | ₹ $ € £ AED CA$ A$ ¥ |

## 🚀 Setup

### Prerequisites
- Node.js 18+
- Expo CLI: `npm install -g @expo/cli`
- Android Studio (for Android) or Xcode (for iOS)

### Installation

```bash
# Clone repository
git clone https://github.com/yourusername/acrom.git
cd acrom

# Install dependencies
npm install

# Start development server
npx expo start

# Build APK (requires EAS account)
eas build --platform android --profile preview
```

### Firebase Configuration

1. Create a project at [Firebase Console](https://console.firebase.google.com)
2. Enable **Authentication** (Google + Email/Password)
3. Enable **Firestore Database**
4. Update `src/services/firebase.js` with your config

### Google Sign-In

Replace placeholder client IDs in `src/screens/LoginScreen.js`:
```js
const GOOGLE_EXPO_CLIENT_ID    = 'YOUR_ID.apps.googleusercontent.com';
const GOOGLE_ANDROID_CLIENT_ID = 'YOUR_ID.apps.googleusercontent.com';
```

## 📁 Architecture

```
ACROM/
├── App.js                         # Root navigation
├── src/
│   ├── constants/index.js         # App-wide constants
│   ├── hooks/
│   │   ├── useDateHelpers.js      # Date utilities
│   │   ├── useFormatCurrency.js   # Currency formatting
│   │   └── useTransactionStats.js # Stats derivation
│   ├── services/
│   │   ├── AppContext.js          # Global state + cloud sync
│   │   ├── AIInsightsService.js   # AI engine (rule-based)
│   │   ├── AutoCaptureService.js  # SMS/notification capture
│   │   ├── CaptureQueue.js        # 3-min dedup buffer
│   │   ├── CloudSyncService.js    # Firestore read/write
│   │   ├── DuplicateDetector.js   # Jaro similarity engine
│   │   ├── ThemeContext.js        # Light mode theme
│   │   └── firebase.js            # Firebase init
│   ├── screens/
│   │   ├── LoginScreen.js         # Auth flows
│   │   ├── HomeScreen.js          # Dashboard
│   │   ├── TransactionsScreen.js  # Full transaction list
│   │   ├── AnalyticsScreen.js     # Charts (W/M/Y)
│   │   ├── AIInsightsScreen.js    # AI features
│   │   ├── BudgetScreen.js        # Budget tracking
│   │   ├── GoalsScreen.js         # Savings goals
│   │   ├── MoreScreen.js          # Settings + export
│   │   ├── SmsScreen.js           # SMS scanner
│   │   └── ...
│   ├── components/
│   │   ├── DonutChart.js          # SVG donut chart
│   │   └── TransactionRow.js      # Transaction list item
│   └── utils/
│       ├── parseEngine.js         # Multi-bank SMS parser
│       └── theme.js               # Design tokens
```

## 🏦 Supported Banks (SMS Parsing)

SBI · HDFC · ICICI · Axis · Kotak · Yes Bank · IDFC · IndusInd · Federal · PNB · BOB + all UPI apps (GPay · PhonePe · Paytm · BHIM)

## 📊 AI Features

- **Health Score** — 0–100 based on savings rate, budget adherence, consistency
- **Expense Prediction** — Weighted 3-month rolling average
- **Anomaly Detection** — Statistical outlier detection (2.5σ threshold)
- **Saving Suggestions** — Personalized based on spending patterns
- **Subscription Tracker** — Auto-detect recurring payments
- **Overspending Alerts** — Budget threshold notifications (80% + 100%)

## 📜 License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">
Built with ❤️ for Indian & global markets · <strong>v5.0.0</strong>
</div>
