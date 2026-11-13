import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

test('registers only social providers with complete credentials', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'auth-providers-'))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  const moduleUrl = new URL('../apps/api/src/auth.ts', import.meta.url).href
  for (const [index, { credentials, expected }] of [
    { credentials: {}, expected: [] },
    {
      credentials: { GOOGLE_CLIENT_ID: 'test-google', GOOGLE_CLIENT_SECRET: 'test-secret' },
      expected: ['google'],
    },
    {
      credentials: { GITHUB_CLIENT_ID: 'test-github', GITHUB_CLIENT_SECRET: 'test-secret' },
      expected: ['github'],
    },
    {
      credentials: { LINKEDIN_CLIENT_ID: 'test-linkedin', LINKEDIN_CLIENT_SECRET: 'test-secret' },
      expected: ['linkedin'],
    },
    { credentials: { GITHUB_CLIENT_ID: 'incomplete' }, expected: [] },
    { credentials: { LINKEDIN_CLIENT_ID: 'incomplete' }, expected: [] },
  ].entries()) {
    const result = spawnSync(
      process.execPath,
      [
        '--import',
        'tsx',
        '--input-type=module',
        '-e',
        `
          import assert from 'node:assert/strict';
          const { auth } = await import(${JSON.stringify(moduleUrl)});
          const providers = Object.keys(auth.options.socialProviders || {});
          for (const provider of providers) {
            const response = await auth.handler(new Request('http://localhost:3000/api/auth/sign-in/social', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:3100' },
              body: JSON.stringify({ provider, callbackURL: 'http://localhost:3100/blog/fixture' }),
            }));
            assert.equal(response.status, 200);
            const data = await response.json();
            const url = new URL(data.url);
            const hosts = { google: 'accounts.google.com', github: 'github.com', linkedin: 'www.linkedin.com' };
            assert.equal(url.hostname, hosts[provider]);
            assert.equal(url.searchParams.get('redirect_uri'), 'http://localhost:3000/api/auth/callback/' + provider);
            assert.ok(url.searchParams.get('state'));
            if (provider === 'linkedin') {
              for (const scope of ['openid', 'profile', 'email']) {
                assert.ok(url.searchParams.get('scope').split(' ').includes(scope));
              }
            }
            assert.ok(response.headers.get('set-cookie'));
          }
          console.log(JSON.stringify(providers));
        `,
      ],
      {
        encoding: 'utf8',
        env: {
          ...process.env,
          DATA_DIR: join(directory, String(index)),
          NODE_ENV: 'test',
          PUBLIC_URL: 'http://localhost:3000',
          TRUSTED_ORIGINS: 'http://localhost:3100',
          BETTER_AUTH_SECRET:
            'test-only-secret-with-more-than-32-characters-for-isolated-auth-tests',
          GITHUB_CLIENT_ID: '',
          GITHUB_CLIENT_SECRET: '',
          GOOGLE_CLIENT_ID: '',
          GOOGLE_CLIENT_SECRET: '',
          LINKEDIN_CLIENT_ID: '',
          LINKEDIN_CLIENT_SECRET: '',
          ...credentials,
        },
      },
    )
    assert.equal(result.status, 0, result.stderr)
    assert.deepEqual(JSON.parse(result.stdout.trim()), expected)
  }
})
