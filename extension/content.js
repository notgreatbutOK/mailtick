/**
 * MailTick - Content Script
 * Runs inside Gmail. Intercepts sent emails and injects a tracking pixel.
 * Also reads the sent email list and shows tick status on each email row.
 */

const TRACKER_SERVER = 'https://your-server-url.com'; // Replace with your deployed server URL

// ─── Unique ID Generator ────────────────────────────────────────────────────
function generateTrackingId() {
  return 'mt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// ─── Inject Tracking Pixel into Compose Window ──────────────────────────────
function injectTrackingPixel(composeWindow) {
  // Avoid double-injecting
  if (composeWindow.dataset.mailtickInjected) return;
  composeWindow.dataset.mailtickInjected = 'true';

  const trackingId = generateTrackingId();
  composeWindow.dataset.mailtickId = trackingId;

  // Store locally before sending
  storeEmailRecord(trackingId, composeWindow);

  // Create invisible tracking pixel
  const pixelUrl = `${TRACKER_SERVER}/track/${trackingId}.png`;
  const pixel = document.createElement('img');
  pixel.src = pixelUrl;
  pixel.width = 1;
  pixel.height = 1;
  pixel.style.cssText = 'position:absolute;opacity:0;pointer-events:none;width:1px;height:1px;';
  pixel.alt = '';

  // Inject into the compose body
  const body = composeWindow.querySelector('[contenteditable="true"][role="textbox"]');
  if (body) {
    body.appendChild(pixel);
    console.log('[MailTick] Tracking pixel injected:', trackingId);
  }
}

// ─── Store Email Record ──────────────────────────────────────────────────────
function storeEmailRecord(trackingId, composeWindow) {
  const subjectEl = composeWindow.closest('.nH')?.querySelector('input[name="subjectbox"]')
    || document.querySelector('input[name="subjectbox"]');
  const subject = subjectEl ? subjectEl.value : '(No Subject)';

  chrome.storage.local.get(['emails'], (result) => {
    const emails = result.emails || [];
    emails.unshift({
      id: trackingId,
      subject: subject,
      sentAt: new Date().toISOString(),
      opens: [],
      status: 'sent' // sent | delivered | read
    });
    // Keep only last 200 emails
    const trimmed = emails.slice(0, 200);
    chrome.storage.local.set({ emails: trimmed });
  });
}

// ─── Watch for Compose Windows ───────────────────────────────────────────────
function watchCompose() {
  // Observe DOM for compose windows appearing
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType !== 1) return;
        // Gmail compose container class
        const composeWindows = node.querySelectorAll
          ? node.querySelectorAll('[data-message-id], .M9, .nH.Hd')
          : [];
        composeWindows.forEach(win => {
          if (isComposeWindow(win)) injectTrackingPixel(win);
        });
        if (isComposeWindow(node)) injectTrackingPixel(node);
      });
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Also intercept the Send button clicks
  document.addEventListener('click', (e) => {
    const sendBtn = e.target.closest('[data-tooltip="Send ‪(Ctrl-Enter)‬"], [aria-label*="Send"], .T-I.J-J5-Ji.aoO');
    if (sendBtn) {
      const composeArea = sendBtn.closest('.aaZ, .nH, [role="dialog"]');
      if (composeArea && !composeArea.dataset.mailtickInjected) {
        injectTrackingPixel(composeArea);
      }
    }
  }, true);
}

function isComposeWindow(el) {
  return el.classList && (
    el.classList.contains('aaZ') ||
    el.getAttribute('role') === 'dialog' ||
    el.querySelector?.('[contenteditable][role="textbox"]')
  );
}

// ─── Render Tick Badges in Sent Folder ──────────────────────────────────────
function renderTicksInSentFolder() {
  // Only run on Sent folder
  if (!window.location.hash.includes('sent') && !document.title.includes('Sent')) return;

  chrome.storage.local.get(['emails'], (result) => {
    const emails = result.emails || [];
    if (!emails.length) return;

    // Gmail email rows
    const rows = document.querySelectorAll('tr.zA');
    rows.forEach((row) => {
      if (row.dataset.mailtickRendered) return;

      const subjectEl = row.querySelector('.bog, .y6 span');
      if (!subjectEl) return;
      const rowSubject = subjectEl.textContent.trim();

      // Find matching email record
      const match = emails.find(e =>
        rowSubject.includes(e.subject) || e.subject.includes(rowSubject)
      );
      if (!match) return;

      row.dataset.mailtickRendered = 'true';

      // Inject tick badge
      const badge = document.createElement('span');
      badge.className = 'mailtick-badge';
      badge.dataset.trackingId = match.id;
      badge.title = match.opens.length
        ? `Read ${match.opens.length} time(s) — Last: ${new Date(match.opens[match.opens.length - 1]).toLocaleString()}`
        : 'Delivered, not yet read';

      if (match.opens.length > 0) {
        badge.innerHTML = `
          <span class="mailtick-tick mailtick-blue">✓</span>
          <span class="mailtick-tick mailtick-blue">✓</span>
        `;
        badge.classList.add('mailtick-read');
      } else {
        badge.innerHTML = `
          <span class="mailtick-tick mailtick-grey">✓</span>
          <span class="mailtick-tick mailtick-grey">✓</span>
        `;
      }

      subjectEl.parentElement.appendChild(badge);
    });
  });
}

// ─── Poll for Open Events from Server ───────────────────────────────────────
function pollOpenEvents() {
  chrome.storage.local.get(['emails'], async (result) => {
    const emails = result.emails || [];
    const unread = emails.filter(e => e.opens.length === 0);

    for (const email of unread.slice(0, 20)) { // Check latest 20 unread
      try {
        const res = await fetch(`${TRACKER_SERVER}/status/${email.id}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.opens && data.opens.length > 0) {
            // Update local record
            email.opens = data.opens;
            email.status = 'read';

            // Notify background to show notification
            chrome.runtime.sendMessage({
              type: 'EMAIL_READ',
              subject: email.subject,
              opens: data.opens
            });
          }
        }
      } catch (err) {
        // Server unreachable - silent fail
      }
    }

    chrome.storage.local.set({ emails });
    renderTicksInSentFolder();
  });
}

// ─── Init ────────────────────────────────────────────────────────────────────
watchCompose();
renderTicksInSentFolder();

// Poll every 30 seconds
setInterval(pollOpenEvents, 30000);

// Re-render ticks when Gmail navigates (it's a SPA)
let lastHash = window.location.hash;
setInterval(() => {
  if (window.location.hash !== lastHash) {
    lastHash = window.location.hash;
    setTimeout(renderTicksInSentFolder, 1000);
  }
}, 500);

// Listen for updates from background
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'REFRESH_TICKS') {
    renderTicksInSentFolder();
  }
});
