# Connect LARO accounts

The game includes optional email sign-up, email confirmation, sign-in, password
reset, sign-out, and reviewed cloud save/restore. Guest play, local saves, and
all games work without an account or a network connection after initial caching.
Until configuration is added, Account clearly shows that accounts are not connected.

1. Create a dedicated Supabase project for LARO. Choose the region and billing
   plan in your own account; no project or subscription has been created for you.
2. Open SQL Editor and run
   [`202611020001_player_saves.sql`](../supabase/migrations/202611020001_player_saves.sql).
   It creates the `player_saves` table, owner-only read access, and a restricted
   save function with revision checks. Never disable row-level security.
3. In Authentication → Providers, enable Email. Keep email confirmation enabled.
   Set the minimum password length to 12. Configure SMTP before public use;
   Supabase's default sender has delivery restrictions and rate limits.
4. In Authentication → URL Configuration, set Site URL to
   `https://mjpinak019.github.io/laro/`. Add this exact redirect URL, plus the
   localhost URLs used for testing: `http://127.0.0.1:4173/` and
   `http://127.0.0.1:5173/` and `http://localhost:5173/`. Email confirmation and password-reset links return
   to the game. Add exact deployed URLs if hosting changes.
5. Copy the Project URL and **publishable** key from Project Settings → API Keys.
   The legacy public `anon` key also works. Never use a service-role key or a
   key beginning with `sb_secret_` in browser code, public configuration, or Git.
6. For local development, copy `client/.env.example` to `client/.env.local` and set
   `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Restart Vite or rebuild.
   For GitHub Pages, add repository **Actions variables** with those same names
   and rerun the Pages workflow. These two values are intentionally public;
   database security comes from authentication and the SQL policies.
   Alternatively, set `supabaseUrl` and `publishableKey` in
   `client/public/account-config.json`, then build/deploy. Environment values
   take precedence. No other backend key is required by the game.
7. Verify on two devices: create an account, confirm email, sign in, save a cloud
   copy, then sign in elsewhere and review/restore that copy. Restoring requires
   the barangay and keeps a safety backup in `laro.before-cloud-restore.v1` first.
   Use different accounts to confirm that each can read only its own save.
8. Test password reset, sign-out, offline guest play, and a two-device save
   conflict. The latter must ask you to review the latest copy rather than
   overwrite another device's newer progress.

Saving and restoring are explicit actions. Sign-in alone never replaces local
progress or automatically uploads another player's device save. Signing out
keeps the local device save. A signed-in player's email is displayed only in
Account; authentication tokens/passwords are not part of downloadable backups.

Cloud copies include coins, XP, avatars, clothes, records, and a saved Dama match.
They are backups of an offline game, not proof of legitimate competitive scores
or an online currency ledger. Server-verified matches/rewards are a separate
requirement before adding competitive leaderboards, purchases, or multiplayer.

Before inviting public account users, add your privacy/contact policy, review
child-audience handling, enable appropriate signup abuse protection/rate limits,
and configure production email delivery. Do not collect unnecessary personal data.

Official references: [password authentication](https://supabase.com/docs/guides/auth/passwords),
[redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls),
[public API keys](https://supabase.com/docs/guides/getting-started/api-keys),
[row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security),
[SMTP](https://supabase.com/docs/guides/auth/auth-smtp).
