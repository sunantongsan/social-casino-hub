# Capacitor → Android App Bundle → Closed Testing

Choose Capacitor for this starter. `apps/client/capacitor.config.json` bundles dist locally.
No remote server.url override; game backend uses VITE_SERVER_URL over HTTPS.
Package ID example: com.sunantongsan.socialcasinohub. Finalize it before first Play upload.

## Build on a developer machine
Install Node 22.12+, JDK 21 and Android Studio / SDK required by Capacitor 8.
```sh
npm ci
npm run build
npm run android:add
npm run android:sync
npm run android:open -w apps/client
```
In Android Studio: Build → Generate Signed Bundle / APK → Android App Bundle.
Create and securely back up one upload keystore. Use it for every subsequent release.
Native project is generated/ignored in this starter. If you add native SDKs or change
native files, commit the Android project and adapt CI to stop regenerating it.

## GitHub Actions
Set frontend VITE_* variables and secrets in android-release environment:
UPLOAD_KEY_BASE64, KEYSTORE_PASSWORD, KEY_PASSWORD, KEY_ALIAS.
The manual Android workflow generates the native project, builds bundleRelease,
signs it, and uploads an artifact. It does not submit the bundle to Play.
versionCode = workflow run number + 100; increase offset if previous published code is higher.
Do not reset versionCode or change upload key between tests.

## Before Closed Testing
- Connect production Auth/DB and finish real ad SDK+SSV or hide unavailable ad button.
- Add privacy policy URL, in-app policy access, account deletion in app and web,
  accurate Data Safety declaration reflecting Auth and actual ad SDK behavior.
- Complete content rating truthfully for simulated gambling and select appropriate
  target audience. A wheel theme does not automatically remove gambling classification.
- No cash-out, crypto, redeemable prizes, or links to real-money gambling.
- Do not show real-money gambling advertising inside the social casino.
- Add final icon/splash/screenshots/store text and test target SDK/native libraries
  against current Play requirements, including 16 KB page compatibility where applicable.
- Test two real accounts, airplane mode, background/resume, low RAM, auth expiration,
  server restart, chips, gift receipt, ad failures and replay protection.

Create a Closed testing release, upload the signed AAB, add tester emails/Google Group,
publish the test and share its opt-in URL. For affected personal accounts created after
13 Nov 2023, at least 12 testers must remain opted-in continuously for at least 14 days
before applying for production access. Genuine feedback/testing is needed. Completing
the duration is not automatic production approval. There is no code/config to bypass it.

Sources (checked 22 Oct 2026):
https://support.google.com/googleplay/android-developer/answer/14151465
https://support.google.com/googleplay/android-developer/answer/9877032
https://capacitorjs.com/docs/android/deploying-to-google-play
https://capacitorjs.com/docs/updating/8-0

TWA alternative is not implemented here. Its association file would be
`/.well-known/assetlinks.json` (not digital-asset-links.json), using the Play App Signing
certificate SHA-256, not the upload certificate. Capacitor does not require it for packaging.
