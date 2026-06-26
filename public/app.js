const form = document.getElementById('hero-form');
const urlInput = document.getElementById('url');
const codeInput = document.getElementById('code');
const shortenBtn = document.getElementById('shorten-btn');
const resultZone = document.getElementById('result-zone');
const linksList = document.getElementById('links-list');
const emptyState = document.getElementById('empty-state');
const toggleSlug = document.getElementById('toggle-slug');
const slugWrap = document.getElementById('slug-wrap');
const slugPrefix = document.getElementById('slug-prefix');
const refreshBtn = document.getElementById('refresh-links');

slugPrefix.textContent = location.host + '/';

function escapeHtml(str) {
  return String(str).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
}

function qrSrc(url) {
  return (
    'https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=0&data=' +
    encodeURIComponent(url)
  );
}

const copyIcon =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';

function showSkeleton() {
  resultZone.innerHTML = `
    <div class="glass skeleton" role="status" aria-label="Generating short link">
      <div class="sk sk-qr"></div>
      <div class="sk-lines">
        <div class="sk sk-line w40"></div>
        <div class="sk sk-line w90"></div>
        <div class="sk sk-line w60"></div>
      </div>
    </div>`;
}

function showError(message) {
  resultZone.innerHTML = `<div class="glass result-card error">${escapeHtml(message)}</div>`;
}

function showResult(data) {
  resultZone.innerHTML = `
    <div class="glass result-card">
      <div class="qr"><img src="${qrSrc(data.shortUrl)}" alt="QR code for ${escapeHtml(
        data.shortUrl,
      )}" loading="lazy" /></div>
      <div class="result-main">
        <div class="result-label">
          <svg class="check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/><path d="m8 12 3 3 5-6"/>
          </svg>
          Short link ready
        </div>
        <a class="short-url" href="${data.shortUrl}" target="_blank" rel="noopener">${escapeHtml(
          data.shortUrl,
        )}</a>
        <div class="result-target">${escapeHtml(data.url)}</div>
      </div>
      <button class="copy-btn" type="button" data-url="${escapeHtml(data.shortUrl)}">
        ${copyIcon}<span>Copy</span>
      </button>
    </div>`;
}

function renderLinks(links) {
  linksList.innerHTML = '';
  if (!links.length) {
    emptyState.style.display = 'block';
    return;
  }
  emptyState.style.display = 'none';

  for (const link of links.slice().reverse()) {
    const row = document.createElement('div');
    row.className = 'link-row';
    row.innerHTML = `
      <a class="link-code" href="${link.shortUrl}" target="_blank" rel="noopener">/${escapeHtml(
        link.code,
      )}</a>
      <span class="link-target" title="${escapeHtml(link.url)}">${escapeHtml(link.url)}</span>
      <span class="link-hits">${link.hits} ${link.hits === 1 ? 'click' : 'clicks'}</span>
      <button class="link-mini-copy" type="button" data-url="${escapeHtml(
        link.shortUrl,
      )}" aria-label="Copy short link">${copyIcon}</button>`;
    linksList.appendChild(row);
  }
}

async function loadLinks() {
  try {
    const res = await fetch('/api/links');
    const data = await res.json();
    renderLinks(data.links ?? []);
  } catch {
    /* listing is non-critical */
  }
}

async function copyToClipboard(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
    btn.classList.add('copied');
    const label = btn.querySelector('span');
    const original = label ? label.textContent : null;
    if (label) label.textContent = 'Copied!';
    setTimeout(() => {
      btn.classList.remove('copied');
      if (label && original) label.textContent = original;
    }, 1600);
  } catch {
    /* clipboard blocked */
  }
}

toggleSlug.addEventListener('click', () => {
  const open = !slugWrap.hidden;
  slugWrap.hidden = open;
  toggleSlug.textContent = open ? '+ Add custom slug' : '− Hide custom slug';
  if (!open) codeInput.focus();
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const payload = { url: urlInput.value.trim() };
  const code = codeInput.value.trim();
  if (code) payload.code = code;

  shortenBtn.classList.add('loading');
  shortenBtn.disabled = true;
  showSkeleton();

  try {
    const res = await fetch('/api/shorten', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (!res.ok) {
      showError(data.error || 'Something went wrong.');
      return;
    }

    showResult(data);
    urlInput.value = '';
    codeInput.value = '';
    loadLinks();
  } catch {
    showError('Could not reach the server.');
  } finally {
    shortenBtn.classList.remove('loading');
    shortenBtn.disabled = false;
  }
});

document.addEventListener('click', (event) => {
  const btn = event.target.closest('.copy-btn, .link-mini-copy');
  if (btn && btn.dataset.url) copyToClipboard(btn.dataset.url, btn);
});

refreshBtn.addEventListener('click', loadLinks);

// Scroll reveal
const io = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    }
  },
  { threshold: 0.12 },
);
document.querySelectorAll('.reveal').forEach((el, i) => {
  el.style.transitionDelay = Math.min(i * 60, 360) + 'ms';
  io.observe(el);
});

loadLinks();
