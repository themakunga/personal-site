export const adminPage = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Comment moderation</title>
  <style>
    :root { color-scheme: dark; font: 16px/1.5 system-ui, sans-serif; }
    body { max-width: 850px; margin: 2rem auto; padding: 0 1rem; }
    input, select, button { font: inherit; padding: .5rem; margin: .25rem; }
    input { max-width: 100%; box-sizing: border-box; }
    article { border: 1px solid #777; border-radius: .4rem; padding: 1rem; margin: 1rem 0; }
    article p { white-space: pre-wrap; overflow-wrap: anywhere; }
    .muted { color: #bbb; } #message { min-height: 1.5rem; } [hidden] { display: none; }
  </style>
  <script src="./admin.js" defer></script>
</head>
<body>
  <h1>Comment moderation</h1>
  <form id="login">
    <label for="token">Admin access key</label>
    <input id="token" type="password" autocomplete="off" autocapitalize="none" spellcheck="false" aria-describedby="key-help" required>
    <button type="submit">Sign in</button>
    <p id="key-help" class="muted">Paste only the value of COMMENTS_ADMIN_TOKEN, without quotes, the variable name or terminal formatting.</p>
    <p class="muted">Sign-in lasts seven days in this browser. Sign out to revoke access early.</p>
  </form>
  <section id="panel" hidden>
    <label for="status">Status</label>
    <select id="status">
      <option value="pending">Pending</option><option value="visible">Visible</option>
      <option value="hidden">Hidden</option><option value="deleted">Deleted</option>
    </select>
    <button id="refresh" type="button">Refresh</button>
    <button id="logout" type="button">Sign out</button>
    <p class="muted">Latest 100 comments in the selected status. Delete removes a comment from public view and retains its database record.</p>
    <div id="comments"></div>
  </section>
  <p id="message" role="status" aria-live="polite"></p>
</body>
</html>`

export const adminScript = String.raw`
const login = document.querySelector('#login');
const panel = document.querySelector('#panel');
const input = document.querySelector('#token');
const status = document.querySelector('#status');
const list = document.querySelector('#comments');
const message = document.querySelector('#message');
let busy = false;

function clearSession() {
  input.value = '';
  list.replaceChildren();
  panel.hidden = true;
  login.hidden = false;
  message.textContent = 'Signed out.';
  input.focus();
}

async function request(path, method = 'GET', body, key) {
  const response = await fetch('./' + path, {
    method,
    headers: { ...(key ? { Authorization: 'Bearer ' + key } : {}), 'Content-Type': 'application/json', 'X-Admin-Request': '1' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (response.status === 401) clearSession();
  if (!response.ok) throw new Error(response.status === 401 ? 'Access denied. Check your admin key.' : 'Request failed (' + response.status + '). Try again.');
  return response.json();
}

function element(tag, text) {
  const node = document.createElement(tag);
  node.textContent = text;
  return node;
}

async function load() {
  const data = await request('comments?status=' + encodeURIComponent(status.value));
  list.replaceChildren();
  for (const comment of data.comments) {
    const article = document.createElement('article');
    article.append(element('h2', comment.user_name), element('p', comment.post_slug),
      element('p', new Date(comment.created_at).toLocaleString()), element('p', comment.body_markdown));
    for (const [label, next] of [['Approve', 'visible'], ['Hide', 'hidden'], ['Delete', 'deleted']]) {
      const button = element('button', label);
      button.type = 'button';
      button.disabled = next === comment.status;
      button.addEventListener('click', () => run(async () => {
        await request('comments/' + encodeURIComponent(comment.id), next === 'deleted' ? 'DELETE' : 'PATCH', next === 'deleted' ? undefined : { status: next });
        await load();
      }));
      article.append(button);
    }
    list.append(article);
  }
  message.textContent = data.comments.length ? 'Comments loaded.' : 'No comments in this status.';
}

async function run(action) {
  if (busy) return;
  busy = true;
  document.querySelectorAll('button, select').forEach(node => { node.disabled = true; });
  message.textContent = 'Working…';
  try { await action(); }
  catch (error) { message.textContent = error.message; }
  finally {
    busy = false;
    document.querySelectorAll('button, select').forEach(node => { node.disabled = false; });
  }
}

login.addEventListener('submit', event => {
  event.preventDefault();
  run(async () => {
    const candidate = input.value.trim();
    if (!/^[A-Za-z0-9._~+\/-]+=*$/.test(candidate)) {
      input.focus();
      throw new Error('Paste only the key value from COMMENTS_ADMIN_TOKEN, without quotes, the variable name or terminal formatting.');
    }
    await request('session', 'POST', undefined, candidate);
    input.value = '';
    await load();
    login.hidden = true;
    panel.hidden = false;
  });
});
status.addEventListener('change', () => run(load));
document.querySelector('#refresh').addEventListener('click', () => run(load));
document.querySelector('#logout').addEventListener('click', () => run(async () => {
  await request('session', 'DELETE');
  clearSession();
}));
run(async () => {
  try {
    await load();
    login.hidden = true;
    panel.hidden = false;
  } catch (error) {
    if (!login.hidden && error.message.startsWith('Access denied')) message.textContent = '';
    else throw error;
  }
});
`
