# MailTick ✓✓ — Gmail Read Receipts

> Know exactly when your emails are read — with blue double ticks, just like WhatsApp.

![MailTick Demo](https://img.shields.io/badge/status-active-brightgreen) ![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue) ![Node.js](https://img.shields.io/badge/Node.js-18+-green)

---

## How it Works

1. You send an email from Gmail — the extension **automatically injects a 1×1 invisible tracking pixel** into the email body.
2. When the recipient opens the email, their email client loads the pixel, hitting your tracking server.
3. Your extension **polls the server** and updates the UI with ✓✓ blue ticks — no action needed from the recipient.

```
You send email → pixel injected → recipient opens → server logs it → you see ✓✓
```

> ✅ **Receiver does NOT need to install anything.**

---

## Features

- ✓✓ Blue ticks when email is read (grey when only sent)
- 🔔 Desktop notification when an email is opened
- 📊 Popup dashboard showing all tracked emails + open count
- ⏱ Timestamps: sent time + when it was last read
- 🔄 Auto-polls every 30 seconds for new opens
- 🧹 Clear all tracked emails from the popup

---

## Project Structure

```
mailtick/
├── extension/              # Chrome Extension (Manifest V3)
│   ├── manifest.json
│   ├── content.js          # Injects pixel, shows ticks in Gmail
│   ├── content.css         # Tick badge styles
│   ├── background.js       # Service worker + notifications
│   ├── icons/              # Extension icons (add your own PNGs)
│   └── popup/
│       ├── popup.html      # Extension popup UI
│       └── popup.js        # Popup logic
│
└── server/                 # Node.js Tracking Server
    ├── server.js
    └── package.json
```

---

## Setup

### Step 1 — Deploy the Tracking Server

```bash
cd server
npm install
npm start
```

Deploy to any Node host (free options):
- [Railway](https://railway.app) ← recommended
- [Render](https://render.com)
- [Fly.io](https://fly.io)

Note your deployed URL, e.g. `https://mailtick-server.railway.app`

### Step 2 — Configure the Extension

In both `extension/content.js` and `extension/popup/popup.js`, replace:
```js
const TRACKER_SERVER = 'https://your-server-url.com';
```
with your deployed server URL.

### Step 3 — Add Icons

Add PNG icons to `extension/icons/`:
- `icon16.png` (16×16)
- `icon32.png` (32×32)
- `icon48.png` (48×48)
- `icon128.png` (128×128)

You can generate these from any icon or emoji using [favicon.io](https://favicon.io).

### Step 4 — Load the Extension in Chrome

1. Go to `chrome://extensions/`
2. Enable **Developer Mode** (top right toggle)
3. Click **"Load unpacked"**
4. Select the `extension/` folder
5. Open [Gmail](https://mail.google.com) and send an email!

---

## API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/track/:id.png` | GET | Serves tracking pixel + logs open |
| `/status/:id` | GET | Returns open events for an email |
| `/health` | GET | Health check |

---

## Limitations

- Tracking **won't work** if the recipient has "Block external images" enabled
- Works best with Gmail, Outlook (web), Apple Mail, and most modern clients
- The server uses **in-memory storage** by default — restarts will clear history. For persistence, swap in Redis or PostgreSQL.

---

## Roadmap

- [ ] Persistent database (Redis / PostgreSQL)
- [ ] Link click tracking
- [ ] Per-email open heatmap
- [ ] Chrome Web Store publishing
- [ ] Firefox support

---

## Contributing

PRs welcome! Please open an issue first to discuss major changes.

---

## License

MIT — use freely, commercially or personally.

---

## Disclaimer

This tool is intended for legitimate use cases (sales outreach, confirming receipt of important emails, etc.). Always respect privacy laws in your jurisdiction. Consider disclosing tracking in your email signature if required by local laws (e.g. GDPR in Europe).
