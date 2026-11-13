---
id: COMMENTS_SETUP
aliases: []
tags: []
created_at: 2026-11-12T17:09:54-0300
draft: false
updated_at: 2026-11-12T23:53:47-0300
---

# Comments and social login setup

Status: Google, GitHub, LinkedIn, logout and the private moderation panel are deployed.
The panel passes HTTPS/authentication checks from motherbase and another LAN client.
Apple and real-account acceptance tests remain pending.
Provider credentials are present; developer-console settings were not independently verified.

## Approach and current state

Keep the existing Better Auth integration, Hono API, SQLite storage, ALTCHA and manual approval.

- Better Auth 1.7.6 configures Google, GitHub and LinkedIn only when both credentials are present.
  Apple is not configured; its required variables are absent on motherbase.
- `/api/auth/providers` exposes provider names only. The static frontend loads this endpoint and
  shows the available buttons, preserving return-to-article, session and sign-out handling.
- The API has outbound connectivity through `edge` and retains its private `backend` network.
  Production requires a stable `BETTER_AUTH_SECRET` and a nondefault `ALTCHA_HMAC_KEY`.
- `/comment-policy.json` contains only published article flags. The API reads it from the web
  service for every request, without a restart or image rebuild when article flags change.
  Missing articles deny comments; an unavailable/invalid policy returns 503. Reading and submission
  independently enforce `show_comments` and `enable_comments`.
- Submission validates payload types, CAPTCHA, nonempty text, length/content, rate limits and any
  parent comment. New comments remain `pending`; public responses contain only visible comments.
- Moderation requires a private admin key. Caddy exposes its authenticated panel only through
  `https://192.168.5.153:3443/` on the configured LAN address, using a persistent internal CA.
  Port 3001 has no host mapping. The public site blocks moderation paths.

Work through the checklist in order. Check a box only after verifying its result. Record evidence
without credentials; distinguish local implementation, source publication and production deployment.

## 1. Confirm the starting point

- [x] Review the active branch/worktree and preserve unrelated changes, including this document's
      existing metadata. Site and content worktrees on motherbase were clean before deployment.
- [ ] Inspect unpublished comment work on other machines before incorporating any of it.
- [x] Confirm the Better Auth version resolved by the lockfile and use compatible provider APIs.
- [x] Confirm the public origin is `https://nicolasvillarroel.cl` and HTTPS works.
- [x] Preserve the selected published articles: `2026/mi-configuracion-de-neovim` and
      `2026/las-aventuras-de-nico-pt1` have both flags enabled. Audio test articles stay closed;
      the four drafts remain unpublished.
- [x] Verify a recoverable backup before deployment. The backup opens independently and passes
      SQLite integrity/foreign-key checks. Private host copy:
      `/opt/nicolas/backups/personal-site/comments-before-checklist-20261112.sqlite` (0600).

## 2. Register provider applications

Use these exact production callback URLs:

| Provider | Callback URL                                              |
| -------- | --------------------------------------------------------- |
| Google   | `https://nicolasvillarroel.cl/api/auth/callback/google`   |
| GitHub   | `https://nicolasvillarroel.cl/api/auth/callback/github`   |
| LinkedIn | `https://nicolasvillarroel.cl/api/auth/callback/linkedin` |
| Apple    | `https://nicolasvillarroel.cl/api/auth/callback/apple`    |

### Google

- [ ] Open [Google Cloud credentials](https://console.cloud.google.com/apis/credentials) and select
      or create the project for this site.
- [ ] Configure the consent screen for the intended audience, with the application name and
      required contact/domain information. Request only `openid`, `email` and `profile`.
- [ ] Create an OAuth client of type **Web application**.
- [ ] Set the authorized JavaScript origin to `https://nicolasvillarroel.cl` and register its callback.
- [x] Store the Client ID and Client Secret privately as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
- [ ] Confirm the consent application's publishing status allows the intended public users;
      complete any provider requirements rather than leaving access limited to test users.

### GitHub

- [ ] Open [GitHub developer settings](https://github.com/settings/developers) and create an **OAuth App**.
- [ ] Set the homepage to `https://nicolasvillarroel.cl` and register its callback.
- [x] Store `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` privately.
- [x] Confirm the installed GitHub provider requests `read:user` and `user:email`.

### LinkedIn

- [ ] Create an application in the [LinkedIn Developer Portal](https://www.linkedin.com/developers/apps)
      and complete the portal's application requirements.
- [ ] Under **Products**, request **Sign In with LinkedIn using OpenID Connect** and confirm access.
- [ ] Register its callback under the application's OAuth settings.
- [x] Store `LINKEDIN_CLIENT_ID` and `LINKEDIN_CLIENT_SECRET` privately.
- [x] Verify the generated LinkedIn authorization URL requests `openid`, `profile` and `email`.
- [ ] Confirm the app has those permissions granted and test a real profile without email.
      Current behavior requires an email and rejects a missing one; no synthetic address or
      unverified-email linking was added. Another configured provider can be used instead.

### Apple

- [ ] Confirm an active Apple Developer account and access to **Certificates, Identifiers & Profiles**.
- [ ] Configure a primary App ID with **Sign in with Apple** enabled.
- [ ] Create a **Services ID** for web authentication and associate it with that primary App ID.
- [ ] Register `nicolasvillarroel.cl` as the domain and the Apple callback as a return URL.
- [ ] Create a Sign in with Apple private key; securely retain its `.p8` file, Key ID and Team ID.
- [ ] Store `APPLE_CLIENT_ID` (the Services ID), `APPLE_TEAM_ID`, `APPLE_KEY_ID` and
      `APPLE_PRIVATE_KEY` in private server configuration.
- [ ] Generate the signed client-secret JWT using the existing runtime/dependencies where possible.
      If supplying a pre-generated JWT, store it privately as `APPLE_CLIENT_SECRET`.
- [ ] Establish JWT renewal before expiration; Apple permits a maximum lifetime of six months.
- [ ] Include `https://appleid.apple.com` in Better Auth's trusted origins as required by its Apple guide.

## 3. Configure secrets and API connectivity

- [x] Verify `PUBLIC_URL=https://nicolasvillarroel.cl` and the exact site trusted origin.
- [ ] Include Apple's required origin when enabling Apple, without using a wildcard.
- [x] Generate and privately provision a high-entropy `BETTER_AUTH_SECRET` of at least 32 characters.
      It was generated once on motherbase and remains stable across deployments.
- [x] Verify a configured production `ALTCHA_HMAC_KEY` of at least 32 characters, excluding known defaults.
- [x] Keep actual secrets outside version control/frontend bundles; commit only empty examples and
      wiring. Host `.env` is 0600. At Nicolas's request, an exact local copy was transferred by SSH
      with mode 0600 and verified Git exclusion. No secret values are recorded here.
- [x] Wire Google, GitHub, LinkedIn and session-secret variables in examples and both Compose files.
- [ ] Add Apple's private variables and renewal wiring when its registration is available.
- [x] Give the production API outbound access through `edge`, retain `backend` and add no public port.
- [x] Validate both Compose files using empty examples/fixtures, without printing secrets.
- [x] Verify outbound HTTPS from the API to Google discovery, LinkedIn discovery and GitHub.
- [x] Verify private moderation through SSH + `docker exec` and public denial.
      LAN panel implementation uses key authentication and a separate HTTPS listener; see section 10.

## 4. Complete the application integration

- [x] Add LinkedIn using the installed Better Auth API; require complete credential pairs for all providers.
- [ ] Add Apple after its app registration and private credentials are available.
- [x] Add the LinkedIn button and extend the `signIn` type.
- [ ] Add Apple's button/type when its backend provider is configured.
- [x] Show only configured providers using `/api/auth/providers`; expose no credentials.
- [x] Preserve existing return-to-article, session, sign-out and error-handling code; real-account testing remains below.
- [x] Preserve CAPTCHA, rate limits and pending-first moderation; add payload/empty-text/parent validation.
- [x] Review installed account-linking behavior: implicit linking requires verified email on both
      the incoming identity and existing user; no provider trust override or different-email linking is enabled.
- [ ] Test those rules with real provider accounts, missing LinkedIn email and future Apple relay addresses.
- [x] Enforce per-post read/submission policy in the API, deny unknown/draft/closed posts, and fail
      closed if the policy is unavailable. Regression checks all four flag combinations and live changes.
- [x] Cover provider availability, authorization URLs and isolated comment submission/moderation regressions.

## 5. Enable the selected articles

Set these fields in each selected article in the sibling `personal-content` repository:

```yaml
show_comments: true
enable_comments: true
```

- [x] Confirm `show_comments` controls reading and `enable_comments` controls login/submission, including API enforcement.
- [x] Preserve all content bodies, metadata, draft flags and audio settings; no content commit was needed.
- [x] Regenerate pages and the published comment-policy manifest.

## 6. Verify locally

- [ ] Configure separate development callbacks where each provider supports them; the local proxy
      defaults to `http://localhost:8081`. Use an approved HTTPS test domain for Apple.
- [x] Run `pnpm typecheck`, `pnpm lint`, 16 TypeScript tests and nine Python tests.
- [x] Check scoped hooks/whitespace and generate 70 routes with real content.
- [ ] For each configured provider, verify sign-in, consent cancellation, return to the same article,
      page reload with a valid session and sign-out.
- [ ] Verify useful errors for expired sessions, missing email and unavailable providers.
- [x] In an isolated SQLite fixture, submit a valid comment and verify author/article, pending storage
      and absence from public results. Fixture authentication is stubbed; this is not a real OAuth login.
- [x] Verify anonymous rejection, malformed/invalid CAPTCHA, payload/content/parent validation and rate limits in isolation.
- [x] Verify all four flag combinations in generated pages, manifest and API behavior; drafts are excluded.
- [ ] Check the buttons, textarea, errors and pending notice with keyboard navigation and mobile layout.

## 7. Publish and deploy

- [x] Review scoped changes; exclude secrets, databases and content edits.
- [x] Publish the scoped site changes; preserve the unchanged content revision `bbef4bb`.
- [x] Provision private production settings before recreating the API.
- [x] Verify deployed site/content revisions and clean motherbase worktrees.
- [x] Confirm private GHCR images for `645feb3`; successful workflow `43345230936`.
- [x] Use `make deploy` to pull both repositories and reuse prebuilt images, audio and conversion caches.
      For a host-only environment change at already-verified revisions, `make prod` regenerates
      and reconciles services without pulling source. Both flows run article-audio preparation.
- [x] Verify expected web/API image revisions and public health, using presence-only secret checks.
- [x] Verify the existing SQLite volume/data and API connectivity survive deployment.

## 8. Verify production and moderation

- [ ] Repeat the complete login, session reload and sign-out flow for Google, GitHub, Apple and LinkedIn.
- [ ] Submit a test comment and confirm the pending notice and absence from the public list.
- [x] Verify the private moderation route using SSH and the admin key:

  ```sh
  ssh nicolas@192.168.5.153
  # On motherbase:
  docker exec personal-site-prod-api-1 node -e \
    'fetch("http://127.0.0.1:3001/stats", {headers:{Authorization:"Bearer "+process.env.COMMENTS_ADMIN_TOKEN}}).then(r => console.log(r.status))'
  ```

  Run the following commands **on motherbase** after connecting by SSH.

- [ ] List pending comments and approve only the identified test comment from another terminal:

  ```sh
  docker exec personal-site-prod-api-1 node -e \
    'fetch("http://127.0.0.1:3001/comments", {headers:{Authorization:"Bearer "+process.env.COMMENTS_ADMIN_TOKEN}}).then(r => r.text()).then(console.log)'
  docker exec personal-site-prod-api-1 node -e \
    'fetch("http://127.0.0.1:3001/comments/COMMENT_ID", {method:"PATCH", headers:{Authorization:"Bearer "+process.env.COMMENTS_ADMIN_TOKEN,"Content-Type":"application/json"}, body:JSON.stringify({status:"visible"})}).then(r => r.text()).then(console.log)'
  ```

- [ ] Reload the article and confirm the approved comment appears once with the correct author.
- [ ] Verify hiding/deleting the test comment removes it from public results.
- [x] Verify public-field privacy in the isolated visible-comment regression; live public responses also contain no credentials.
- [x] Verify public moderation API paths return 404; port 3001 is not published on the host.
- [x] Record tested revisions, providers, results and remaining checks below.
- [ ] Schedule Apple JWT renewal after configuring Apple.

## 9. Logout flow

On an article that accepts comments, an authenticated reader selects **Sign out** next to the
session name. The button shows **Signing out…** and disables comment submission while the request
is pending. The frontend sends `POST /api/auth/sign-out` with an empty JSON object and the browser's same-origin cookies.

On success, Better Auth deletes the current SQLite session and expires its cookies. The page stays
on the article, clears the unsent draft, confirms **Signed out.** and shows the configured login
buttons again. If the request fails, the current user and draft remain visible with an error and
a retry. Logout is unavailable while a comment is being submitted.

Session cookie caching is disabled so a revoked session cannot survive through an old cached
cookie. This signs out the current site session; other devices and provider accounts remain signed in.

- [x] Verify current-session deletion, expired cookies and immediate rejection of old cookies using
      real Better Auth handlers and isolated SQLite; reject comment submission after logout.
- [x] Verify that untrusted origins cannot log out the session and other site sessions remain valid.
- [x] Exercise the actual Vue component's logout success, waiting, duplicate-click guard, failed
      request and retry paths; clear the draft only after success.
- [ ] With a real provider account in production, sign in, write an unsent draft, sign out and verify
      the anonymous controls, cleared draft and success notice without leaving the article.
- [ ] Reload the article and another open tab; confirm the closed session is anonymous and cannot
      submit comments. Sign in again and verify commenting works.
- [ ] Check logout with keyboard/mobile navigation and a simulated network failure in the browser.

Run the focused checks with:

```sh
node --import tsx --test scripts/logout.test.ts scripts/comment-logout.test.ts
```

## 10. LAN moderation panel

- [x] Implement a browser panel for pending, visible, hidden and deleted comments, with approve,
      hide and delete controls; display user content as text and send credentials only in headers.
- [x] Protect every moderation API request with a private key of at least 32 characters; fail closed
      when unconfigured. Keep the key out of browser storage; persist a revocable seven-day session in an HttpOnly cookie.
- [x] Provision the key privately on motherbase and synchronize only the new admin settings into
      the local `.env`, preserving existing credentials and 0600 permissions.
- [x] Configure HTTPS with Caddy's internal CA and a persistent certificate volume; bind host port
      3443 only to `COMMENTS_ADMIN_HOST` and remove the API's host port mapping.
- [x] Add a development-only panel route through the loopback proxy at `/admin/`.
- [x] Test authentication failures, authenticated approve/delete actions, plain-text rendering,
      invalid/missing records and panel logout using the actual routes/script with isolated SQLite.
- [x] Verify deployed HTTPS/IP certificates, anonymous denial and authenticated filters/stats from
      motherbase itself. Caddy uses an explicit default SNI for clients connecting by IP.
- [x] Verify access from another LAN client with certificate verification, anonymous denial and
      authenticated filters/stats. The previous incoming TCP 3443 timeout is no longer reproduced;
      this agent did not change the live firewall or run a Nix switch.
- [ ] Trust the exported public CA certificate on each intended device; do not export its private key.
- [ ] Complete browser keyboard/mobile QA and a clearly identified real comment approval/delete cycle.

Panel: `https://motherbase.local:3443/` or `https://192.168.5.153:3443/`.
Access key: only the value of `COMMENTS_ADMIN_TOKEN` in the private `.env`; exclude the variable
name, quotes and copied terminal decorations. Unicode or malformed input is rejected before fetch,
with a correction message that never contains the key. Both addresses use the same persistent CA;
the hostname needs mDNS on the LAN.
See [README: private LAN moderation](README.md#private-lan-moderation) for certificate retrieval and
SSH commands. Deleting a comment changes its status to `deleted`; it does not physically erase the
SQLite record. The panel shows the latest 100 comments for the selected status.

The permanent firewall rule is declared in `nix-systems`,
`modules/hosts/linux/x86_64/motherbase.nix`, for interface `enp2s0`, source `192.168.4.0/22`,
destination `192.168.5.153` and TCP 3443. That subnet was read from the active host interface.
Until the Nix configuration is applied, activate the matching runtime rule **on motherbase**:

```sh
sudo iptables -C nixos-fw -i enp2s0 -s 192.168.4.0/22 -d 192.168.5.153 -p tcp --dport 3443 -j nixos-fw-accept \
  || sudo iptables -I nixos-fw 1 -i enp2s0 -s 192.168.4.0/22 -d 192.168.5.153 -p tcp --dport 3443 -j nixos-fw-accept
```

This runtime activation is temporary: a firewall restart/reconfiguration removes it until the
published Nix declaration is applied. Do not disable the firewall or open the port to all sources.

## Verified progress — 2026-11-12

| Scope                       | Evidence                                                                                                                                                     |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Three provider entry points | `34d75ad`; workflow `43343376885`; names-only discovery, correct public callback URLs, state and Secure/HttpOnly cookies verified for Google/GitHub/LinkedIn |
| Article permissions         | `645feb3`; workflow `43345230936`; API enforces the generated, published-only flags and reads changes without restart                                        |
| Regression coverage         | 16 TypeScript and nine Python tests; isolated pending/approve/hide/delete cycle, input/CAPTCHA/rate-limit/privacy checks and session logout                  |
| Static generation           | 13-published/1-draft fixture checks every policy; restored real-content generation produces 70 routes; public RSS/navigation remains healthy                 |
| Production safety           | Independent SQLite backup verified; stable private secrets, preserved database/cache volumes; no production test users/comments inserted                     |
| Private moderation          | Key-authenticated SSH/API access and private HTTPS panel; public moderation API paths are denied                                                             |

Next human steps: finish each provider's consent/login with a real account, reload, sign out, then
submit one clearly identified test comment and approve/hide it privately. Developer-console app
audience, redirect registration and LinkedIn product grants still need confirmation. Apple needs an
active developer membership, app/service registration and private credentials before integration.
Keyboard/mobile/browser visual QA remains pending.

## References

- [Better Auth: Google](https://better-auth.com/docs/authentication/google)
- [Better Auth: GitHub](https://better-auth.com/docs/authentication/github)
- [Better Auth: LinkedIn](https://better-auth.com/docs/authentication/linkedin)
- [LinkedIn: Sign In using OpenID Connect](https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2)
- [Better Auth: Apple and client-secret expiration](https://better-auth.com/docs/authentication/apple)
- [Apple: Configure Sign in with Apple for the web](https://developer.apple.com/help/account/capabilities/configure-sign-in-with-apple-for-the-web/)
- [Better Auth: Secret configuration](https://better-auth.com/docs/installation)
- [Docker Compose: Internal networks](https://docs.docker.com/reference/compose-file/networks/#internal)
