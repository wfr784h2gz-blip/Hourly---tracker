# Hourly Tracker

A mobile-friendly live time tracking web app for iPhone. It tracks work from clock-in to clock-out, calculates weekly regular pay, overtime pay, and call-out fees.

## Default pay rules

- Regular pay: $32 per hour
- Overtime pay: $48 per hour
- Weekly regular limit: 40 hours
- Weekday call-out fee: $25
- Weekend call-out fee: $50

## What it does

- Clock in when you leave and clock out when you get home.
- Add missed time manually.
- Mark a shift as a call-out.
- Automatically adds the correct weekday or weekend call-out fee.
- Calculates weekly totals.
- Saves entries on the device immediately.
- Can be connected to Firebase Firestore later for full cloud sync across devices.
- Works as a Progressive Web App so it can be added to an iPhone Home Screen.

## Live access

Once GitHub Pages or another static host is enabled, open the site URL in Safari and choose Share > Add to Home Screen.

## Cloud sync setup

The app works right away with device storage. For real cloud database sync across multiple devices, replace the placeholder Firebase values in `script.js` with your Firebase Web App configuration and enable Firestore.

```js
const firebaseConfig = {
  apiKey: "REPLACE_ME",
  authDomain: "REPLACE_ME",
  projectId: "REPLACE_ME",
  storageBucket: "REPLACE_ME",
  messagingSenderId: "REPLACE_ME",
  appId: "REPLACE_ME"
};
```

When Firebase is configured, the app switches from `Device save on` to `Cloud sync on`.
