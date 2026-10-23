# Internal web patch 0.3.1 (native compatibility: 102)

## Agreed house rules

Sic Bo: three dice; low totals 3–10, high totals 12–18. Triples count by their sum. Total 11 defeats both high and low and pays 30:1 net. Face bets 1–6 pay 1/2/3 times net when appearing 1/2/3 times; winning bets also return stake. Multiple spots and repeat additions are allowed up to available wallet balance. A total profit/loss breakdown is returned by the server. Pre-patch in-flight rounds retain their previous rules until settled.

Rummy: 7 cards, 52-card deck, no jokers, Ace low for runs. Point value A=1, J/K=10, Q/2=50, others printed value. Choose table rate before ready/start (default existing stake field; choose 5 for ×5). No entry pot. At knock, each loser's remaining in-hand cards count, including any sets they have not played. Loss = points × table rate × 2 if loser dark × 2 if winner dark × 2 if this loser fed the winner. Only that player's own loss is doubled for feeding. Dark means never having formed a meld from the discard row this round; a meld laid from the hand does not change this user-defined status. Holding high-point cards has no separate penalty beyond their values.

Discard cards appear in chronological order. To take one, select at least two hand cards forming a valid set/run with it. The selected discard goes directly into that meld, and all later row cards enter the hand. Only taking the latest discard from the preceding player and knocking during the same turn marks that player as feeder. Next turn clears the marker. Knock automatically groups remaining hand cards if possible, with at most one final discard. You can also manually meld and lay off first. No automatic hidden-card peeking by bots.

Losses are capped at the player's available chips at settlement; the result shows the nominal formula and any shortfall. No negative balances or debts. Empty stock, 180-step limit, or a wholly abandoned table ends in a draw; old entry-pot rummy rounds are refunded when migrated. Rummy opponents show card backs during play; result reveals remaining cards.

## Validation

`npm test`: server payout enumeration for all 216 dice outcomes, multi-spot/all-balance bets, retry/settlement idempotency, old-round compatibility, exact card values, stacking multipliers, feeder attribution, ordered-row pickup validation, false-knock rejection, hidden hands, balance conservation and existing games.
`npm run build`: production React build.

The update is web-only and is published by the existing GitHub patch workflow. Installed native build 102 can download it at startup. Physical Android animation/rollback behavior still needs tester verification. The native Play version remains 0.3.0 (102); the in-game content label changes to 0.3.1.
