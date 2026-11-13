<template>
  <section class="comments">
    <h3 class="comments__title">Comentarios</h3>

    <template v-if="show">
      <p v-if="loading" class="comments__muted">Cargando…</p>
      <p v-else-if="loadError" class="comments__error">No se pudieron cargar los comentarios.</p>
      <p v-else-if="!comments.length" class="comments__muted">Aún no hay comentarios.</p>
      <ul v-else class="comments__list">
        <li v-for="c in comments" :key="c.id" class="comment">
          <header class="comment__meta">
            <span
              class="provider-icon"
              :style="providerStyle(c.provider_id)"
              role="img"
              :aria-label="providerLabel(c.provider_id)"
              :title="providerLabel(c.provider_id)"
            />
            <strong>{{ c.user_name }}</strong>
            <time :datetime="new Date(c.created_at).toISOString()">{{ fmt(c.created_at) }}</time>
          </header>
          <!-- Plain text on purpose: no HTML rendering, no XSS surface. -->
          <p class="comment__body">{{ c.body_markdown }}</p>
        </li>
      </ul>
    </template>

    <div v-if="enable" class="comments__form">
      <template v-if="user">
        <p class="comments__session">
          Sesión: {{ user.name }} ·
          <button
            class="btn btn--logout"
            :disabled="signingOut || sending"
            :aria-busy="signingOut"
            @click="signOut"
          >
            <span
              class="provider-icon"
              style="--icon: url('/icons/mdi/mdi-logout.svg')"
              aria-hidden="true"
            />
            {{ signingOut ? 'Signing out…' : 'Sign out' }}
          </button>
        </p>
        <textarea
          v-model="draft"
          rows="4"
          maxlength="2000"
          placeholder="Escribe un comentario (sin enlaces ni HTML)"
          :disabled="sending || signingOut"
        />
        <button class="btn" :disabled="sending || signingOut || !draft.trim()" @click="send">
          {{ sending ? 'Enviando…' : 'Comentar' }}
        </button>
      </template>
      <template v-else>
        <p class="comments__muted">Inicia sesión para comentar:</p>
        <div class="comments__providers" role="group" aria-label="Sign in to comment">
          <button v-if="providers.includes('github')" class="btn" @click="signIn('github')">
            <span class="provider-icon" :style="providerStyle('github')" aria-hidden="true" />
            GitHub
          </button>
          <button v-if="providers.includes('google')" class="btn" @click="signIn('google')">
            <span class="provider-icon" :style="providerStyle('google')" aria-hidden="true" />
            Google
          </button>
          <button v-if="providers.includes('linkedin')" class="btn" @click="signIn('linkedin')">
            <span class="provider-icon" :style="providerStyle('linkedin')" aria-hidden="true" />
            LinkedIn
          </button>
        </div>
      </template>
      <p v-if="notice" class="comments__notice">{{ notice }}</p>
      <p v-if="formError" class="comments__error">{{ formError }}</p>
    </div>
  </section>
</template>

<script setup lang="ts">
type ApiComment = {
  id: string
  user_name: string
  body_markdown: string
  created_at: number
  provider_id: string | null
}
type Challenge = {
  algorithm: string
  challenge: string
  maxnumber: number
  salt: string
  signature: string
}

const props = defineProps<{ slug: string; show: boolean; enable: boolean }>()

const comments = ref<ApiComment[]>([])
const loading = ref(false)
const loadError = ref(false)
const user = ref<{ name: string } | null>(null)
const providers = ref<string[]>([])
const draft = ref('')
const sending = ref(false)
const signingOut = ref(false)
const notice = ref('')
const formError = ref('')

const providerNames: Record<string, string> = {
  github: 'GitHub',
  google: 'Google',
  linkedin: 'LinkedIn',
}
const knownProvider = (provider: string | null | undefined) =>
  Object.hasOwn(providerNames, provider ?? '')
const providerStyle = (provider: string | null | undefined) => ({
  '--icon': `url(/icons/mdi/mdi-${knownProvider(provider) ? provider : 'account'}.svg)`,
})
const providerLabel = (provider: string | null | undefined) =>
  knownProvider(provider)
    ? `Signed in with ${providerNames[provider ?? '']}`
    : 'Login provider unavailable'

// The slug contains "/" (e.g. 2026/hello-world), so it must be encoded as one path segment.
const commentsUrl = computed(() => `/api/comments/${encodeURIComponent(props.slug)}`)
const fmt = (ms: number) => new Date(ms).toLocaleDateString(useAppConfig().site.language)

async function load() {
  loading.value = true
  loadError.value = false
  try {
    comments.value = (await $fetch<{ comments: ApiComment[] }>(commentsUrl.value)).comments
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
}

async function loadSession() {
  try {
    const s = await $fetch<{ user?: { name: string } } | null>('/api/auth/get-session')
    user.value = s?.user ?? null
  } catch {
    user.value = null
  }
}

async function loadProviders() {
  try {
    providers.value = (await $fetch<{ providers: string[] }>('/api/auth/providers')).providers
  } catch {
    formError.value = 'Sign-in is temporarily unavailable.'
  }
}

async function signIn(provider: 'github' | 'google' | 'linkedin') {
  formError.value = ''
  try {
    const r = await $fetch<{ url?: string }>('/api/auth/sign-in/social', {
      method: 'POST',
      body: { provider, callbackURL: window.location.href },
    })
    if (r.url) window.location.href = r.url
  } catch {
    formError.value = 'No se pudo iniciar sesión.'
  }
}

async function signOut() {
  if (signingOut.value || sending.value) return
  signingOut.value = true
  formError.value = ''
  try {
    await $fetch('/api/auth/sign-out', { method: 'POST', body: {} })
    user.value = null
    draft.value = ''
    notice.value = 'Signed out.'
  } catch {
    formError.value = 'Could not sign out. Try again.'
  } finally {
    signingOut.value = false
  }
}

// ALTCHA proof-of-work: find n such that sha256(salt + n) === challenge, then send it base64-encoded.
// ponytail: main-thread loop (up to 500k hashes); move to a Worker if it ever blocks the UI.
async function solveCaptcha(): Promise<string> {
  const ch = await $fetch<Challenge>('/api/captcha/challenge')
  const enc = new TextEncoder()
  for (let n = 0; n <= ch.maxnumber; n++) {
    const buf = await crypto.subtle.digest('SHA-256', enc.encode(ch.salt + n))
    const hex = Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('')
    if (hex === ch.challenge) {
      return btoa(
        JSON.stringify({
          algorithm: ch.algorithm,
          challenge: ch.challenge,
          number: n,
          salt: ch.salt,
          signature: ch.signature,
        }),
      )
    }
  }
  throw new Error('captcha')
}

async function send() {
  sending.value = true
  notice.value = ''
  formError.value = ''
  try {
    const altcha = await solveCaptcha()
    await $fetch(commentsUrl.value, {
      method: 'POST',
      body: { body_markdown: draft.value.trim(), altcha },
    })
    draft.value = ''
    notice.value = 'Comentario enviado. Se publicará cuando sea aprobado.'
  } catch (e) {
    const err = e as { data?: { error?: string }; statusCode?: number }
    formError.value =
      err.data?.error ??
      (err.statusCode === 401
        ? 'Tu sesión expiró, inicia sesión de nuevo.'
        : 'No se pudo enviar el comentario.')
    if (err.statusCode === 401) user.value = null
  } finally {
    sending.value = false
  }
}

// Client-only: the site is statically generated, comments are fetched at runtime.
onMounted(() => {
  if (props.show) load()
  if (props.enable) {
    loadSession()
    loadProviders()
  }
})
</script>

<style scoped>
.comments {
  margin-top: 3rem;
  padding-top: 1rem;
  border-top: 1px solid var(--bg-highlight);
}
.comments__title {
  color: var(--yellow);
  margin-bottom: 1rem;
}
.comments__muted {
  color: var(--comment);
  font-size: 0.85rem;
}
.comments__error {
  color: var(--red);
  font-size: 0.85rem;
}
.comments__notice {
  color: var(--green);
  font-size: 0.85rem;
}
.comments__list {
  list-style: none;
  padding: 0;
  display: grid;
  gap: 1rem;
}
.comment {
  background: var(--bg-dark);
  border-left: 3px solid var(--blue);
  padding: 0.75rem 1rem;
  border-radius: 4px;
}
.comment__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  color: var(--comment);
  font-size: 0.8rem;
}
.comment__meta strong {
  color: var(--cyan);
}
.comment__meta .provider-icon {
  color: var(--blue);
}
.comment__body {
  margin: 0.5rem 0 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.comments__form {
  margin-top: 1.5rem;
  display: grid;
  gap: 0.5rem;
  justify-items: start;
}
.comments__providers,
.comments__session {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.65rem;
}
.comments__session {
  margin: 0;
  color: var(--comment);
  font-size: 0.85rem;
}
.provider-icon {
  display: inline-block;
  width: 1.1em;
  height: 1.1em;
  flex: none;
  background: currentColor;
  -webkit-mask: var(--icon) center / contain no-repeat;
  mask: var(--icon) center / contain no-repeat;
}
.comments__form textarea {
  width: 100%;
  background: var(--bg-dark);
  color: var(--fg);
  border: 1px solid var(--bg-highlight);
  border-radius: 4px;
  padding: 0.5rem;
  font: inherit;
}
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  background: var(--bg-highlight);
  color: var(--fg);
  border: 1px solid var(--blue);
  border-radius: 4px;
  padding: 0.35rem 0.9rem;
  cursor: pointer;
  font: inherit;
}
.btn:hover:not(:disabled),
.btn:focus-visible {
  border-color: var(--cyan);
  color: var(--cyan);
}
.btn:focus-visible {
  outline: 2px solid var(--cyan);
  outline-offset: 3px;
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn--logout {
  background: var(--bg-dark);
  border-color: var(--purple);
  border-width: 2px;
  color: var(--purple);
  font-weight: 600;
}
</style>
