/**
 * MailTick - Tracking Server
 * 
 * Endpoints:
 *   GET  /track/:id.png     → serves 1x1 pixel and logs the open
 *   GET  /status/:id        → returns open events for an email
 *   GET  /health            → health check
 * 
 * Deploy to: Railway, Render, Vercel, or any Node host.
 * Then update TRACKER_SERVER in content.js and popup.js.
 */

const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 8080;

// In-memory store (use a DB like Redis/PostgreSQL for production)
const openEvents = {}; // { trackingId: [timestamp, timestamp, ...] }

app.use(cors({ origin: '*' }));
app.use(express.json());

// ─── 1x1 Transparent PNG (base64) ────────────────────────────────────────────
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

// ─── Track Open ───────────────────────────────────────────────────────────────
app.get('/track/:id', (req, res) => {
  const id = req.params.id.replace('.png', '');

  if (!openEvents[id]) {
    openEvents[id] = [];
  }

  openEvents[id].push(new Date().toISOString());

  console.log(`[MailTick] Email opened: ${id} (${openEvents[id].length} opens)`);

  // Serve 1x1 transparent pixel
  res.set({
    'Content-Type': 'image/png',
    'Content-Length': PIXEL.length,
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  res.end(PIXEL);
});

// ─── Get Status ───────────────────────────────────────────────────────────────
app.get('/status/:id', (req, res) => {
  const id = req.params.id;
  const opens = openEvents[id] || [];
  res.json({ id, opens, count: opens.length });
});

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', tracked: Object.keys(openEvents).length });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[MailTick] Server running on port ${PORT}`);
});
