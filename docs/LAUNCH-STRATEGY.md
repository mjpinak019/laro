# LARO launch, security and monetization plan

Recommendation as of 5 November 2026: **soft-launch the web game first,
configure secure accounts and valuable rewards next, monetize after people
return, then consider Android distribution.** The current offline client is
a casual game; it is not an authoritative wallet or competitive score system.
This document proposes future work. It does not configure hosting, payments,
advertisements, analytics or accounts.

## 1. Validate the game with a small Filipino audience

Invite 30–50 testers for a one-to-two-week playtest. Include inexpensive
Android devices, iPhone, Chrome and Edge, keyboard/touch, landscape/fullscreen
and disconnected reloads. Ask whether players understand the first game,
finish a round, find the other areas, and successfully retain their saves.
Use minimal, aggregated analytics only after choosing an appropriate privacy
approach. Suggested measures: first-round completion, tutorial exits, errors,
save failures, and return visits after one and seven days. These are proposed
playtest sizes and measures, not platform requirements.

Positioning: **“Mga larong kalye, nasa bulsa mo.”** The strongest hook is the
recognizable Filipino neighborhood and its changing games. Produce short
Tagalog-captioned clips: Jack-en-Poy into a Langit-Lupa escape, a Jolen shot,
an avatar eating merienda, and finding the secret phone. End each with one
direct play link. Invite feedback from Filipino gaming micro-creators,
cultural communities, diaspora groups and parent/teacher groups with group
permission. Use organic reach before paying for ads; spend only after players
reliably finish rounds, keep saves and return.

## 2. Establish commercial hosting and an installable web app

Keep GitHub for source, review and automated checks. For a commercial launch,
use a stable custom domain and a host intended for applications, such as
Cloudflare Workers with Static Assets. Cloudflare recommends Workers for new
applications. GitHub Pages is primarily for project showcases and restricts
sites primarily running online businesses or facilitating commercial
transactions; that does not establish a blanket ban on every ad-supported
project demo. Review the actual planned commercial use before relying on it.

Sources: [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits),
[Cloudflare direction](https://developers.cloudflare.com/pages/),
[Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/).

Keep guest and offline play. Improve the existing web manifest and installation
experience as a PWA before maintaining a separate app. Once retention and
demand justify it, consider Capacitor Android packaging for Play Store
discovery and native advertising. A wrapper alone does not secure client-side
currency. See [PWA installation](https://web.dev/articles/install-criteria) and
[Capacitor](https://capacitorjs.com/docs).

Before moving domains, provide backup export/import or configured cloud-save
transfer. Local storage belongs to its origin; a new domain does not
automatically inherit existing coins and clothes. Keep the old play link and
clear migration instructions available during the transition.
[Storage origin behavior](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage).

## 3. Secure accounts, saves and anything with monetary value

Configure the prepared Supabase project and Auth flow. Enforce ownership with
RLS on every exposed table and test cross-account access. Only publishable
keys belong in browser builds; secret/service-role keys stay on the server.
Enable appropriate Auth rate limits and CAPTCHA. See
[Supabase data security](https://supabase.com/docs/guides/database/secure-data)
and [Auth CAPTCHA](https://supabase.com/docs/guides/auth/auth-captcha).

RLS controls which player's data someone can access. It does not prove that
the coins or scores a client uploads were honestly earned. Before paid
entitlements, valuable ad rewards or competitive leaderboards, add server
validation, an idempotent reward/transaction ledger, abuse limits and validated
purchase receipts. Keep offline earned currency clearly separate from any
server-authoritative online wallet, or keep offline progression cosmetic and
noncompetitive. Never make an imported local save proof of paid ownership.

Browser JavaScript and its artwork must be delivered to players. Making the
repository private cannot make delivered browser code uncopyable. Protect
secrets, player data and server authority. Continue dependency updates, CI,
HTTPS, backups and least-privilege deployment access.

If online multiplayer follows, use a server-authoritative simulation and
validate movement, tags, timers and rewards there. Hosting in or near the
Philippines can improve latency, but a Philippine server or PH IP filter does
not itself prevent cheating or account abuse. Same-Wi-Fi multiplayer still
needs a host/server and authorization for shared state.

## 4. Plan for the actual age audience

The neighborhood theme may attract children and families. Decide the audience
before introducing accounts and advertising. Collect minimal personal data;
provide readable privacy notices, deletion and appropriate consent flows.
The Philippine National Privacy Commission specifically addresses platforms
and game developers accessible to minors. Have the actual privacy design
reviewed before commercial launch; a “13+” label alone does not determine how
the service is used.

Sources: [NPC advisory](https://privacy.gov.ph/public-advisory-npc-calls-on-digital-platforms-to-ensure-compliance/),
[child-oriented transparency guidance](https://privacy.gov.ph/wp-content/uploads/2024/12/Advisory-2024.12.17-Guidelines-on-Child-Oriented-Transparency-w-SGD.pdf).

## 5. Monetize without interrupting play

Begin with optional cosmetic support packs and clearly labelled,
family-appropriate sponsorship. Keep all games playable for free. After
retention improves and secure reward handling exists, test optional rewarded
ads **after a completed round**, with clear opt-in and a modest nontransferable
cosmetic/coin reward. Avoid ads during a chase, jump or puzzle entry, and do
not require ads to recover a save or access basic controls.

For web games, investigate AdSense H5 Games Ads / Ad Placement API, subject
to program approval. Native Android can use AdMob. Rewarded ads require clear
disclosure, affirmative opt-in, usable decline/dismissal and the promised
reward; cash, cryptocurrency and gift-card rewards are prohibited.
[H5 Games Ads](https://support.google.com/adsense/answer/9959170?hl=en),
[rewarded-ad policies](https://support.google.com/admob/answer/7313578?hl=en).

If publishing to a Google Play family audience, children and users of unknown
age need suitable ads and approved SDK treatment; personalized advertising is
restricted. Mixed audiences need appropriate age screening. Native rewarded
ads can use server-side verification before granting rewards.
[Google Play Families policies](https://support.google.com/googleplay/android-developer/answer/9893335?hl=en),
[AdMob server-side verification](https://developers.google.com/admob/android/ssv).

Suggested order: playtest → reliable saves/install → privacy and account setup
→ secure entitlement/reward ledger → cosmetic support/sponsorship → carefully
tested optional rewarded ads → Android listing if demand justifies it.
