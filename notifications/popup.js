/**
 * MailTick - Popup Script
 */

const TRACKER_SERVER = 'https://mailtick.onrender.com'; // Replace with your deployed server URL

function timeAgo(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (days > 0) return `${days}d ago`;
  if (hrs > 0) return `${hrs}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return 'just now';
}

function renderEmails(emails) {
  const list = document.getElementById('email-list');
  const total = emails.length;
  const read = emails.filter(e => e.opens && e.opens.length > 0).length;
  const pending = total - read;

  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-read').textContent = read;
  document.getElementById('stat-pending').textContent = pending;

  if (!emails.length) {
    list.innerHTML = `
      <div class="empty">
        <div class="empty-icon">📬</div>
        <div class="empty-text">No tracked emails yet.<br>Send an email from Gmail to start tracking.</div>
      </div>
    `;
    return;
  }

  list.innerHTML = emails.slice(0, 30).map(email => {
    const isRead = email.opens && email.opens.length > 0;
    const lastOpen = isRead ? email.opens[email.opens.length - 1] : null;
    const sentTime = timeAgo(email.sentAt);

    return `
      <div class="email-item ${isRead ? 'is-read' : ''}">
        <div class="tick-icon ${isRead ? 'read' : 'sent'}">✓✓</div>
        <div class="email-info">
          <div class="email-subject" title="${email.subject}">${email.subject || '(No Subject)'}</div>
          <div class="email-meta">
            Sent ${sentTime}
            ${isRead ? `· Read ${timeAgo(lastOpen)}` : ''}
            ${isRead && email.opens.length > 1 ? `· ${email.opens.length} opens` : ''}
          </div>
        </div>
        <div class="email-status ${isRead ? 'status-read' : 'status-sent'}">
          ${isRead ? 'Read' : 'Sent'}
        </div>
      </div>
    `;
  }).join('');
}

async function checkServerStatus() {
  const dot = document.getElementById('status-dot');
  const text = document.getElementById('status-text');
  try {
    const res = await fetch(`${TRACKER_SERVER}/health`, { method: 'GET' });
    if (res.ok) {
      dot.className = 'status-dot';
      text.textContent = 'Server online';
    } else {
      throw new Error('not ok');
    }
  } catch {
    dot.className = 'status-dot offline';
    text.textContent = 'Server offline';
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────
chrome.storage.local.get(['emails'], (result) => {
  renderEmails(result.emails || []);
});

checkServerStatus();

document.getElementById('clear-btn').addEventListener('click', () => {
  if (confirm('Clear all tracked emails?')) {
    chrome.storage.local.set({ emails: [] }, () => {
      renderEmails([]);
    });
  }
});

// Live updates if storage changes while popup is open
chrome.storage.onChanged.addListener((changes) => {
  if (changes.emails) {
    renderEmails(changes.emails.newValue || []);
  }
});
