# Internal test 0.3.0 / native 102
All six menu entries are playable. Sic Bo retains its shared timed round. Four card games use shared four-seat tables with bot filling; Roulette has server-resolved individual spins. Players opt into a stake using Ready before a round can debit their wallet. Abandoned lobby seats expire after 60 seconds; timed-out human turns are handled on server. Hidden cards/deck are not sent to other clients. Results, chip mutations and request deduplication persist in one atomic transaction.

## Explicit test variants
- Mixed ten: 52 cards, five-card hands, draw/discard to three pairs. No wildcards, joke/shit bonuses or special wins.
- Rummy: basic seven-card rummy, sets/runs and layoff, ace low. Not Thai dummy scoring.
- Pok: two-card naturals, hit/stand, dealer draws below five, pair/suit doubles and three-card suit triples. No extra straight/triple special hands. Three times stake escrowed and unused portion refunded.
- Kao: three cards, fixed-size raise up to twice per table, call/check/fold, ranked showdown. No all-in/side pots.
- Roulette: European single zero, red/black/parity/low/high and straight number.
Rules are also visible inside each game. This build is for verifying these choices before visual polish.

## Patches
Capawesome LiveUpdate 8.7.1 self-hosted on GitHub Releases, SHA-256 validation and fixed repository URL allowlist. Manifest only permits native 102. Check on cold start, progress, install/reload, 15s rollback timer, blocked failed bundles. No external paid cloud account. Native plugin/SDK/signing updates still require Play Store and a native version compatibility bump. The first update from native 101 requires Play because 101 does not contain the updater.
GitHub Actions publishes web patches after tests/build. Workflow's GITHUB_TOKEN only; no private signing keys in repository. Only use patches for content compatible with approved native capabilities. Live native download/reload/rollback still requires validation on an Android device.

## Test chips
Internal endpoint and DEV_AUTH demo grant 10,000 per tap even when funded, no ad or cooldown; duplicates of same request are idempotent. Wallet safety cap 1 billion; not a real-money balance. Real rewarded-ad function remains separate.
