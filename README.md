# ACR AutoExpense — Android App

## ⚠️ IMPORTANT: Before building, do these 3 things:

### 1. Get your Expo Project ID
- Go to expo.dev → Create project → Copy the Project ID
- Open `app.json` → Replace `PASTE_YOUR_EXPO_PROJECT_ID_HERE`

### 2. Get google-services.json
- Go to console.firebase.google.com → Project acrom-40c8c
- Add Android App → package: `com.acr.autoexpense`
- Download `google-services.json` → Upload to this repo root

### 3. Build on Expo Dashboard
- expo.dev → Import this GitHub repo
- Builds → New Build → Android → **preview** profile
- EAS will auto-generate keystore (no manual setup needed!)

## File Structure
```
├── App.js              ← Entry point
├── app.json            ← Expo config ← UPDATE projectId!
├── eas.json            ← Build config ✅ Ready
├── package.json        ← Dependencies ✅ Ready
├── babel.config.js     ✅ Ready
├── assets/             ← Icons + logo ✅ Ready
└── src/
    ├── screens/        ← 10 screens ✅ Ready
    ├── services/       ← Firebase, SMS, Storage ✅ Ready
    ├── components/     ← Charts, TransactionRow ✅ Ready
    └── utils/          ← Parse engine, Theme ✅ Ready
```
