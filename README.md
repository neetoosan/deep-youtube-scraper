# YouTube Contact Scraper — Browser Extension

A browser extension that extracts **public emails, social handles, and contact information** from YouTube video comments, channel descriptions, and search results using the **YouTube Data API v3**.

---

## 🚀 Features

- **💬 Video Comments Scraping**: Scan comments and replies on any YouTube video to extract emails, social links, and websites that commenters publicly share.
- **📺 Channel Info Extraction**: Extract contact details (email, social handles, website) from any YouTube channel's description/about section.
- **🔍 Search Results Scraping**: Search for YouTube channels by keyword and bulk-extract their public contact information.
- **📊 XLSX Export**: One-click export to a clean Excel workbook with columns: Channel Name, Channel URL, Email(s), Social Handle(s), Website, Subscribers, Comment Snippet.
- **📋 JSON Copy**: Copy raw extracted data to clipboard for use in other tools.
- **🔑 API Key Management**: Securely store your YouTube Data API v3 key in browser storage.

---

## 📋 Prerequisites

### YouTube Data API v3 Key

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (or select an existing one).
3. Navigate to **APIs & Services** → **Library**.
4. Search for **YouTube Data API v3** and click **Enable**.
5. Go to **APIs & Services** → **Credentials**.
6. Click **+ Create Credentials** → **API key**.
7. Copy your API key.

> ⚠️ **Free Quota**: YouTube Data API v3 provides **10,000 units/day** for free. A `commentThreads.list` call costs ~1 unit, a `channels.list` call costs ~1 unit. You can scan hundreds of comments within the free quota.

---

## 🛠️ Installation

### Microsoft Edge / Google Chrome

1. Open `edge://extensions` (Edge) or `chrome://extensions` (Chrome).
2. Enable **Developer Mode** (toggle in top-right corner).
3. Click **Load unpacked**.
4. Select the `youtube_scraper` folder.
5. The **YouTube Contact Scraper** extension icon will appear in your toolbar.

---

## 🎯 How to Use

### 1. Enter Your API Key
- Click the extension icon.
- Paste your YouTube Data API v3 key in the **API Key** field.
- Click **Save Key**.

### 2. Choose Scrape Mode

| Mode | Description | Requirement |
|------|-------------|-------------|
| 💬 Video Comments | Extract contacts from video comments | Navigate to a YouTube video page |
| 📺 Channel Info | Extract contact details from a channel | Navigate to a YouTube channel page |
| 🔍 Search Results | Search channels and extract contacts | Enter a search query |

### 3. Configure & Scrape
- Set **Max Comments to Scan** (1–5000).
- Toggle **Include comment replies** on/off.
- Click **Start Scraping**.
- Watch the progress bar and live status updates.

### 4. Export Results
- Click **Export XLSX** for a clean Excel spreadsheet.
- Click **Copy JSON** for raw data.

---

## 📁 Project Structure

```
youtube_scraper/
├── manifest.json       # Extension manifest (Manifest V3)
├── popup.html          # Popup UI
├── popup.css           # Popup styling (YouTube-themed)
├── popup.js            # Popup controller (API key, modes, scrape lifecycle)
├── background.js       # Service worker (YouTube Data API v3 communication)
├── scraper.js          # Content script (DOM extraction fallback)
├── excel-builder.js    # XLSX workbook generator
├── icons/              # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md           # This file
```

---

## 🔍 What Gets Extracted

| Data Type | Source |
|-----------|--------|
| **Emails** | Comment text, channel descriptions |
| **Social Handles** | Twitter/X, Instagram, Facebook, LinkedIn, TikTok, Discord links in text |
| **@Handles** | Social media handles mentioned in comments |
| **Websites** | Non-social URLs in channel descriptions and comments |
| **Channel Info** | Channel name, URL, subscriber count |

---

## ⚠️ Important Notes

- This tool only extracts **publicly available information** that users have voluntarily shared in their comments and channel descriptions.
- Respect YouTube's [Terms of Service](https://www.youtube.com/t/terms) and applicable privacy laws.
- The YouTube Data API has a daily quota limit. Monitor your usage in the [Google Cloud Console](https://console.cloud.google.com/apis/dashboard).

---

## 📄 License

Private project. All rights reserved.
