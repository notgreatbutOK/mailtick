/**
 * MailTick - Background Service Worker
 * Handles notifications and periodic polling alarm.
 */

// ─── Notification when email is read ────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type === 'EMAIL_READ') {
    chrome.notifications.create(`mailtick_${Date.now()}`, {
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: '✓✓ Email Read',
      message: `"${msg.subject}" was just opened!`,
      priority: 1
    });

    // Tell content script to refresh ticks
    chrome.tabs.query({ url: 'https://mail.google.com/*' }, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, { type: 'REFRESH_TICKS' });
      });
    });
  }
});

// ─── Periodic Alarm (every 1 min) to trigger polling in content script ───────
chrome.alarms.create('mailtick_poll', { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'mailtick_poll') {
    chrome.tabs.query({ url: 'https://mail.google.com/*' }, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, { type: 'POLL_NOW' }).catch(() => {});
      });
    });
  }
});

// ─── On Install ──────────────────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  console.log('[MailTick] Extension installed.');
  chrome.storage.local.set({ emails: [] });
});
