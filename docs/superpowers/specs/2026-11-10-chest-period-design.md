# Chest period quotas

Continue the requested change: bronze (c), silver (b), gold (a), and diamond (z) each have an integer number of days and maximum quantity per period. All players share the same quota. Unclaimed quota remains throughout the period; at the next period it refills to the configured maximum, without accumulating unused earlier periods. Wood and iron remain daily.

Use the existing Firebase collections and server-authoritative game endpoint. Preserve current production source, prizes, member data, game limits and artwork. No live settings change during deployment. Existing configuration retains legacy behavior until an administrator saves the new settings. Map existing c/b/a amounts to one-day quotas and zEvery to a period with one diamond in the editing form.

Save preserves current remaining quota until each tier's current period ends. Save and reset explicitly refills all tiers and starts their periods today (Taiwan date). Both configuration and quota state must commit atomically; failed saves must report failure. New shared period state lives in pool/cycles, readable under existing rules, writable by administrators and backend only. Reward issuance continues through the existing endpoint transaction. Show current rule, remaining quantity, and next refill date.

Implementation choice: one shared pure JavaScript rules module for server, front end and demo. This prevents date/renewal differences across clients. Current main is acfb62a (V15.21.2), confirmed identical to live index; this bounded change does not revive older archived versions.
