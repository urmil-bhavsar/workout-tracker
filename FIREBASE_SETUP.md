# Firebase setup

RepBook remains local-first: IndexedDB is the working/offline database. Google sign-in enables a private Firestore copy that is merged on sign-in and when you press **Sync now**. Workout saves and split edits queue a debounced sync when online.

## Create and configure Firebase

1. Create a Firebase project at the Firebase console.
2. Add a Web app and copy its Firebase web configuration.
3. In **Authentication → Sign-in method**, enable **Google**.
4. In **Authentication → Settings → Authorized domains**, add the production Vercel hostname (for example, `workout-tracker-umber-zeta.vercel.app`) and `localhost` for local development.
5. Create a **Cloud Firestore** database.
6. Publish the rules in this repository's `firestore.rules` file. They restrict every data path to the authenticated user's UID. Do not use open/test-mode rules in production.
7. Copy `.env.example` to `.env.local` and fill in the web app values:

   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_APP_ID`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`

8. Restart Vite after changing `.env.local`. For Vercel, add the same variables under **Project → Settings → Environment Variables**, then redeploy.

Firebase's web API key is a client identifier, not a server secret. Data access is protected by Authentication and Firestore Security Rules; never add Admin SDK credentials or service-account keys to this frontend project.

## Sync behavior

- First sign-in merges local records with that account's Firestore records; it does not deliberately clear either side.
- Workouts merge by local workout date. Conflicts use the newest `updatedAt` timestamp.
- Split days merge by day record and latest `updatedAt` timestamp.
- Exercise ID collisions from separate devices are remapped by exercise name where possible.
- Body-weight records merge by date.
- A manual **Sync now** performs a full merge for all four Dexie tables: exercises, split days, workouts, and body weights.
- Sign-out leaves the local IndexedDB copy intact.

A signed-in user's data is stored under `users/{uid}/{table}/{recordId}`. Sync requires an internet connection; logging continues offline, and users can retry with **Sync now** after reconnecting.
