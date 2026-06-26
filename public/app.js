const form = document.getElementById('shorten-form');
const urlInput = document.getElementById('url');
const codeInput = document.getElementById('code');
const result = document.getElementById('result');
const linksBody = document.getElementById('links-body');
const emptyState = document.getElementById('empty-state');

function showResult(message, isError) {
  result.classList.remove('hidden');
  result.classList.toggle('error', Boolean(isError));
  result.innerHTML = message;
}

function renderLinks(links) {
  linksBody.innerHTML = '';
  if (!links.length) {
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');

  for (const link of links) {
    const row = document.createElement('tr');

    const shortCell = document.createElement('td');
    const shortLink = document.createElement('a');
    shortLink.href = link.shortUrl;
    shortLink.target = '_blank';
    shortLink.rel = 'noopener';
    shortLink.textContent = '/' + link.code;
    shortCell.appendChild(shortLink);

    const targetCell = document.createElement('td');
    targetCell.textContent = link.url;
    targetCell.title = link.url;
    targetCell.style.maxWidth = '280px';
    targetCell.style.overflow = 'hidden';
    targetCell.style.textOverflow = 'ellipsis';
    targetCell.style.whiteSpace = 'nowrap';

    const hitsCell = document.createElement('td');
    hitsCell.textContent = String(link.hits);

    row.append(shortCell, targetCell, hitsCell);
    linksBody.appendChild(row);
  }
}

async function loadLinks() {
  try {
    const res = await fetch('/api/links');
    const data = await res.json();
    renderLinks(data.links ?? []);
  } catch {
    // Network errors are non-fatal for the listing.
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const payload = { url: urlInput.value.trim() };
  const code = codeInput.value.trim();
  if (code) {
    payload.code = code;
  }

  try {
    const res = await fetch('/api/shorten', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (!res.ok) {
      showResult(data.error || 'Something went wrong.', true);
      return;
    }

    showResult(
      `Short link: <a href="${data.shortUrl}" target="_blank" rel="noopener">${data.shortUrl}</a>` +
        `<button class="copy-btn" type="button" data-url="${data.shortUrl}">Copy</button>`,
      false,
    );
    urlInput.value = '';
    codeInput.value = '';
    loadLinks();
  } catch {
    showResult('Could not reach the server.', true);
  }
});

result.addEventListener('click', async (event) => {
  const target = event.target;
  if (target instanceof HTMLElement && target.classList.contains('copy-btn')) {
    const url = target.dataset.url;
    if (url) {
      try {
        await navigator.clipboard.writeText(url);
        target.textContent = 'Copied!';
        setTimeout(() => {
          target.textContent = 'Copy';
        }, 1500);
      } catch {
        target.textContent = 'Copy failed';
      }
    }
  }
});

loadLinks();
