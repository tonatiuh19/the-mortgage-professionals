# Parity with real-state

Features are ported one at a time. Mortgi is out of scope. Update this list as each module ships.
Each module needs a migration applied, UI + API + DB validation, and an entry in `api/swagger.yaml`.

| # | Module | Routes | Needs from owner | Status |
|---|--------|--------|------------------|--------|
| 1 | Client reassign, open loans | 2 | Nothing | API done; reassign has no UI (CRM transfers covers it) |
| 2 | Document download and bulk download | 2 of 3 | Nothing | Single download in UI; zip API only; checklist refresh not ported |
| 3 | Role section permissions | 2 | Nothing | Done; sidebar only, routes are not blocked (same as real-state) |
| 4 | Blocked numbers | 3 | Migration approval | Not started |
| 5 | Loan calculator and saved calculations | 6 | Migration approval | Not started |
| 6 | Bulk import | 5 | Migration approval | Not started |
| 7 | Broadcast v2 (segments, short links, resend, export, open tracking) | 20+ | Migration approval, decision on merging with `/api/broadcasts` | Not started |
| 8 | Free credit analysis | 5 | Migration approval, GROQ key | Not started |
| 9 | Group conversations | 10 | Migration approval, Ably key | Not started |
| 10 | Prospect reminder flows, retention crons | 4 | Migration approval | Not started |
| 11 | Billing | 30+ | Final pricing, real Stripe account, decision on enforcement | Page, API and Stripe flows ported; quota enforcement, usage ledger on sends, and access walls not connected |

Order rule: no dependency-free module waits on Billing. Do not use `scripts/sync-from-real-state.sh --apply`: it overwrites this tenant's divergent files.
