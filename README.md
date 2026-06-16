# Time Tracker PWA

This project provides a lightweight progressive web app (PWA) for tracking your working hours, overtime and call‑out fees.  You can install the app on your phone’s home screen and it works offline thanks to a service worker. Data is stored in Google Firebase Cloud Firestore so it syncs across devices in realtime.

## Features

* **Record shifts** – Enter a date, start and end times, hourly rate and an optional call‑out fee for each shift.  The app calculates the hours you worked (even across midnight).
* **Overtime calculations** – Pay for hours beyond a configurable threshold (default 8 hours) is calculated at 1.5× the regular rate.
* **Weekly summary** – Browse weeks with buttons and see the total hours and total pay (including overtime and call‑out fees) for that week.
* **Realtime sync** – All entries are stored in Firestore under your unique user ID and update automatically on all devices.
* **Offline support** – A service worker caches static files so the app loads when you’re offline.  When connectivity returns, data syncs to the cloud.
* **PWA installable** – A manifest and icons allow the app to be added to the home screen on iOS, Android and desktop browsers.

## Getting Started

### 1 – Download the code

Copy or clone the `time_tracking_pwa` directory to your local machine.  It contains the HTML, CSS, JavaScript, manifest and service worker files.

### 2 – Create a Firebase project

1. Visit the [Firebase Console](https://console.firebase.google.com) and create a new project.
2. Click **Add app** → **Web** and register a new web application.
3. When prompted, copy the configuration details (the `apiKey`, `authDomain`, `projectId`, etc.).
4. In the Firebase console, navigate to **Build** → **Firestore Database** and create a database in **production mode**.

### 3 – Configure the app

Open `script.js` and locate the `firebaseConfig` object near the top. Replace the placeholder strings (`"REPLACE_ME"`) with the values from your Firebase project. The app will not connect to Firestore until these values are set.

### 4 – Run locally (optional)

You can test the PWA on your computer by serving the files over HTTP.  From the project root run:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000` in your browser.  Your entries will be saved to Firestore if your configuration is correct.  You can also open the browser’s DevTools → Application → Service Workers to verify the service worker is registered.

### 5 – Deploy to the cloud

Deploying your PWA ensures it’s always available and can be installed on your phone.  The easiest option is Firebase Hosting:

1. Install the Firebase CLI if you haven’t already:
   ```bash
   npm install -g firebase-tools
   ```
2. Log in and initialize hosting in your project folder:
   ```bash
   firebase login
   firebase init hosting
   ```
   During initialization choose the folder containing this project (`time_tracking_pwa`) as your public directory, enable configuration as a single‑page app, and skip automatic builds.
3. Deploy the site:
   ```bash
   firebase deploy
   ```
   After deployment Firebase will provide a URL where your app is hosted.  You can open that URL on your phone.

### 6 – Install on iPhone

1. Open Safari and navigate to your hosted app URL.
2. Tap the **Share** icon.
3. Select **Add to Home Screen** and tap **Add**.  The app will appear on your home screen with the name **TimeTrack** and the green “TT” icon.

## Customization

* **Overtime rules** – Adjust the overtime threshold in the UI (default 8 hours).  If your overtime rate or policy differs, edit the `calculatePay` function in `script.js`.
* **Week start day** – The app uses Monday as the start of the week.  Modify the `getWeekStart` function to shift the week to start on Sunday or another day.
* **Authentication** – For multi‑user systems with login, enable Firebase Authentication and remove the auto‑generated `userId` logic.  Each authenticated user will then have their own entries collection.

---

**Security note**: Never share your Firebase API keys in public repositories or forums.  Even though Firebase restricts access via security rules, your keys are considered sensitive and should be kept private.
