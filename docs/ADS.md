# Rewarded Ads contract (not wired to an ad network yet)

Client adapter: `apps/client/src/ads.js`; verified grant: `verifiedReward()`.
The production client cannot grant chips. `demoReward` is rejected outside DEV_AUTH.

Implement a provider-specific backend SSV endpoint before enabling production ads:
1. Issue an opaque, short-lived reward session bound to authenticated user, app and ad unit.
2. Pass it to the SDK's custom data; never trust a client-supplied recipient.
3. Verify the provider signature using its published rotating keys, exact signed payload,
   transaction ID, timestamp freshness, expected app/ad unit and reward amount.
4. Inside `store.run`, consume the session once and call `verifiedReward` with
   provider-prefixed transaction ID. Persist grant and session consumption together.
5. Acknowledge retries of an already processed provider transaction without awarding twice.
6. Refresh the wallet from the server. Client video completion is UX only.

Rules: balance exactly zero, no unresolved bet, 120 seconds between rewards, 500 chips.
For now this intentionally fails closed: no production SSV endpoint exists.
Select ad categories carefully; do not serve real-money gambling ads in this social casino.
Reference: https://support.google.com/googleplay/android-developer/answer/9877032
