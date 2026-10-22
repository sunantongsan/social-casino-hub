# Internal test 0.2.0 (versionCode 101)

Current target: Google Play Internal testing, not Closed testing.

This build bundles React locally and connects to the isolated Supabase Edge Function
`social-casino-internal`. Server-authoritative rules are shared with the Node core.
The internal transport polls every two seconds; the original Socket.IO service stays
available for a future dedicated realtime deployment.

Guests receive a cryptographically random 256-bit bearer capability stored on device.
The server hashes this to an identity; it accepts no arbitrary userId. This is separate
from Supabase Auth and does not change other applications' Auth settings. Reinstalling
loses the guest capability. The UI labels the guest/test mode explicitly.

The isolated public.social_casino_internal_state table has RLS enabled and no grants
for anon/authenticated. Only the Edge service role can access it. Compare-and-swap
version updates prevent concurrent overwrite and duplicate economic actions.

Internal guest limit: 1,000. Receipt cap: 20,000 (fail closed). Not a production-scale
account system. Chip refill is labelled test refill and grants only at zero balance,
with no unsettled bet and a two-minute cooldown. No ad SDK is bundled.

GitHub internal-build workflow creates an unsigned release AAB and a debug-signed APK.
The AAB must be signed with the retained upload key before Play upload. The debug APK
is for direct device testing only and uses a different certificate than Play installs.
Production web deployment awaits Vercel team authorization.
