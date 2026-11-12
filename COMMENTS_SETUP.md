# Comments and social login setup

Status: implementation checklist. No provider registration, credential provisioning or deployment
is completed by this document. Source baseline reviewed on 2026-11-12 at `82803b6`.

## Approach and current state

Extend the existing Better Auth integration with Google, GitHub, Apple and LinkedIn. Keep the
current Hono API, SQLite storage, ALTCHA challenge and manual comment approval.

- `apps/api/src/auth.ts` configures Google and GitHub; Apple and LinkedIn are missing.
- `apps/web/app/components/PostComments.vue` includes Google/GitHub buttons, session handling,
  comment submission and client-side CAPTCHA solving.
- `apps/api/src/routes/comments.ts` requires a session and CAPTCHA for submission, inserts new
  comments as `pending` and returns only `visible` comments publicly.
- `apps/api/src/admin/index.ts` provides the existing moderation API.
- Production `docker-compose.yml` connects the API only to the `internal: true` backend network.
  OAuth token exchange needs outbound connectivity.
- The environment examples and Compose files do not declare/pass `BETTER_AUTH_SECRET`.
- Article flags control comment display and the login/submission interface independently.

Work through the checklist in order. Check a box only after verifying its result. Record evidence
without credentials; distinguish local implementation, source publication and production deployment.

## 1. Confirm the starting point

- [ ] Review the current branch, worktree and any unpublished comment work on other machines
      before editing; preserve unrelated changes.
- [ ] Confirm the Better Auth version resolved by the lockfile and use compatible provider APIs.
- [ ] Confirm the public origin is `https://nicolasvillarroel.cl` and HTTPS works.
- [ ] Select the published articles that should show comments and accept submissions; preserve drafts.
- [ ] Verify a recoverable backup of the production SQLite database before deployment.

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
- [ ] Store the Client ID and Client Secret privately as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
- [ ] Confirm the consent application's publishing status allows the intended public users;
      complete any provider requirements rather than leaving access limited to test users.

### GitHub

- [ ] Open [GitHub developer settings](https://github.com/settings/developers) and create an **OAuth App**.
- [ ] Set the homepage to `https://nicolasvillarroel.cl` and register its callback.
- [ ] Generate and store `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` privately.
- [ ] Confirm the integration requests email access (`user:email`) as required by Better Auth.

### LinkedIn

- [ ] Create an application in the [LinkedIn Developer Portal](https://www.linkedin.com/developers/apps)
      and complete the portal's application requirements.
- [ ] Under **Products**, request **Sign In with LinkedIn using OpenID Connect** and confirm access.
- [ ] Register its callback under the application's OAuth settings.
- [ ] Store `LINKEDIN_CLIENT_ID` and `LINKEDIN_CLIENT_SECRET` privately.
- [ ] Confirm `openid`, `profile` and `email` are available. Define and test how to handle a profile
      without an email; the current user table requires one. Do not link accounts using unverified email.

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

- [ ] Set `PUBLIC_URL=https://nicolasvillarroel.cl` and configure `TRUSTED_ORIGINS` for the site.
      Include Apple's required origin in the auth configuration without using a wildcard.
- [ ] Generate a high-entropy `BETTER_AUTH_SECRET` of at least 32 characters, for example with
      `openssl rand -base64 32`. Keep it stable across restarts and deployments.
- [ ] Provision a random production `ALTCHA_HMAC_KEY`; replace development/default values.
- [ ] Keep all actual secrets in private configuration on the host, outside version control and
      frontend bundles. Commit only empty examples and variable wiring.
- [ ] Update `.env.example`, `apps/api/.env.example`, `docker-compose.yml` and
      `docker-compose.local.yml` with the required variables and API environment passthrough.
- [ ] Give the production API outbound access, reusing the existing `edge` network if appropriate
      while retaining `backend` connectivity. Do not add a public API port mapping.
- [ ] Validate both Compose files; avoid sharing rendered configuration that contains secrets.
- [ ] Verify DNS and outbound HTTPS to provider endpoints from the API container itself.
- [ ] Verify the moderation listener is reachable through the intended private SSH route and remains
      inaccessible publicly; check container and host loopback behavior rather than assuming it works.

## 4. Complete the application integration

- [ ] Add Apple and LinkedIn to `socialProviders` in `apps/api/src/auth.ts` using the installed
      Better Auth API. Configure only providers with complete credentials.
- [ ] Add Apple and LinkedIn buttons and extend the `signIn` provider type in
      `apps/web/app/components/PostComments.vue`.
- [ ] Show only configured providers using a safe availability mechanism; never expose secrets to
      the static frontend or render buttons that predictably fail for missing credentials.
- [ ] Preserve the current return-to-article callback, sign-out behavior and readable error messages.
- [ ] Preserve CAPTCHA, rate limiting, input validation and pending-first moderation.
- [ ] Review account linking across providers, including verified-email requirements, Apple's private
      relay addresses and LinkedIn profiles without email. Avoid merging unrelated identities.
- [ ] Verify that API submission respects the intended per-post comment policy; hiding a form alone
      does not prevent direct POST requests.
- [ ] Add focused regression coverage for provider availability/configuration and any new logic.

## 5. Enable the selected articles

Set these fields in each selected article in the sibling `personal-content` repository:

```yaml
show_comments: true
enable_comments: true
```

- [ ] Confirm `show_comments` controls reading and `enable_comments` controls login/submission.
- [ ] Preserve existing article bodies, draft status, audio settings and unrelated metadata.
- [ ] Regenerate the static site so the selected flags reach the generated pages.

## 6. Verify locally

- [ ] Configure separate development callbacks where each provider supports them; the local proxy
      defaults to `http://localhost:8081`. Use an approved HTTPS test domain for Apple.
- [ ] Run `pnpm typecheck`, `pnpm lint` and the relevant focused regression tests.
- [ ] Check formatting and whitespace for the changed files and generate the site with real content.
- [ ] For each configured provider, verify sign-in, consent cancellation, return to the same article,
      page reload with a valid session and sign-out.
- [ ] Verify useful errors for expired sessions, missing email and unavailable providers.
- [ ] Submit a valid comment and confirm it is stored as `pending`, with the correct author/article,
      and absent from the public comment list.
- [ ] Verify anonymous submission, invalid CAPTCHA, invalid comment content and rate-limit handling.
- [ ] Verify each combination of `show_comments` and `enable_comments` renders as intended.
- [ ] Check the buttons, textarea, errors and pending notice with keyboard navigation and mobile layout.

## 7. Publish and deploy

- [ ] Review the diff and confirm no secrets, database files or unintended content changes are included.
- [ ] Commit and publish the scoped site changes and any selected article changes when authorized.
- [ ] Provision the private production environment before restarting the API.
- [ ] On the deployment host, verify the site and content revisions and clean worktrees.
- [ ] Use the existing `make deploy` flow to pull both repositories, build and restart production.
      For a host-only environment change at already-verified revisions, `make prod` rebuilds/restarts
      without pulling. Both flows also run the existing article-audio preparation.
- [ ] Confirm the expected revisions and healthy web/API services; verify secrets are passed by
      presence checks without printing their values.
- [ ] Confirm SQLite data survives the restart and the API can reach the providers.

## 8. Verify production and moderation

- [ ] Repeat the complete login, session reload and sign-out flow for Google, GitHub, Apple and LinkedIn.
- [ ] Submit a test comment and confirm the pending notice and absence from the public list.
- [ ] Establish the private moderation tunnel using the authorized host/user:

  ```sh
  ssh -N -L 3001:127.0.0.1:3001 USER@HOST
  ```

- [ ] List pending comments and approve only the identified test comment from another terminal:

  ```sh
  curl http://localhost:3001/comments
  curl -X PATCH http://localhost:3001/comments/COMMENT_ID \
    -H 'content-type: application/json' \
    -d '{"status":"visible"}'
  ```

- [ ] Reload the article and confirm the approved comment appears once with the correct author.
- [ ] Verify hiding/deleting the test comment removes it from public results.
- [ ] Confirm public comment responses do not expose email addresses, session tokens or OAuth tokens.
- [ ] Confirm moderation endpoints remain inaccessible through the public site.
- [ ] Record tested revisions, providers, results and outstanding failures; schedule Apple JWT renewal.

## References

- [Better Auth: Google](https://better-auth.com/docs/authentication/google)
- [Better Auth: GitHub](https://better-auth.com/docs/authentication/github)
- [Better Auth: LinkedIn](https://better-auth.com/docs/authentication/linkedin)
- [LinkedIn: Sign In using OpenID Connect](https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2)
- [Better Auth: Apple and client-secret expiration](https://better-auth.com/docs/authentication/apple)
- [Apple: Configure Sign in with Apple for the web](https://developer.apple.com/help/account/capabilities/configure-sign-in-with-apple-for-the-web/)
- [Better Auth: Secret configuration](https://better-auth.com/docs/installation)
- [Docker Compose: Internal networks](https://docs.docker.com/reference/compose-file/networks/#internal)
