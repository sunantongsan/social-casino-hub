# GitHub and Vercel

1. Create a new GitHub repository (suggestion: social-casino-hub). Do not overwrite existing games.
2. Extract the archive, then:
```sh
git init -b main
git add .
git commit -m "Initial Social Casino Hub starter"
git remote add origin https://github.com/YOUR_ACCOUNT/social-casino-hub.git
git push -u origin main
```
Never add .env or upload keys. Commit package-lock.json.

3. Deploy game server separately as a long-running Node process/container.
   Build from repository root: `docker build -f infra/Dockerfile -t social-casino-hub .`
   Supply server environment variables through host secrets, set NODE_ENV=production,
   DEV_AUTH=false, persistent Supabase DB, and HTTPS reverse proxy with WebSocket upgrades.
   CLIENT_ORIGINS must include exact frontend origin and https://localhost for Capacitor.
   Run exactly one replica with non-overlapping restarts. `/health` is liveness only.
   This package does not provision a hosting account or claim free always-on hosting.

4. Create Vercel project with repository root '.', output `apps/client/dist` and build
   `npm run build` (root vercel.json contains these). Set frontend VITE_* environment
   values in Vercel; production must not use VITE_DEV_AUTH=true.

5. Choose ONE deploy owner:
   - Vercel Git integration: auto-deploy main; leave ENABLE_VERCEL_CI unset.
   - GitHub Actions: disable duplicate Vercel Git auto-deploy. Set repository variables
     ENABLE_VERCEL_CI=true, VERCEL_ORG_ID, VERCEL_PROJECT_ID and an exact reviewed
     VERCEL_CLI_VERSION. Set secret VERCEL_TOKEN in production environment.
     Main push runs tests then Vercel pull/build/deploy. Protect main and production environment.

Vercel currently supports WebSockets, but functions have duration limits and disconnect.
This implementation chooses a separate process because room timers and single-replica
ownership need continuity. Do not deploy this Node timer loop as a function unchanged.
https://vercel.com/docs/functions/websockets

Production smoke test: two verified accounts, shared round ID, wager, reconnect,
check no double debit, send gift, recipient claims once, restart server during betting,
verify settlement and persisted balances. Test invalid token and client-forged payouts.
