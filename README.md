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

# 📖 User Guide: YouTube Contact Scraper

This browser extension allows users to extract public emails, social media handles (Instagram, Twitter/X, LinkedIn, TikTok, Discord), and websites from YouTube video comments, channel pages, and search results into a clean **Excel spreadsheet (.xlsx)**.

---

## 🛠️ Step 1: Install the Extension in Your Browser

Works on **Microsoft Edge**, **Google Chrome**, **Brave**, or any Chromium browser:

1. Open your browser and navigate to `edge://extensions` (on Edge) or `chrome://extensions` (on Chrome).
2. Turn on **Developer mode** using the toggle in the top-right corner.
3. Click the **Load unpacked** button.
4. Select the folder: `C:\Users\HP\Documents\work\youtube_scraper`.
5. The extension icon will now appear in your browser toolbar!

---

## 🔑 Step 2: Get & Enter Your Free YouTube API Key

The scraper uses Google's official YouTube Data API v3 (which offers **10,000 free requests per day**).

### How to get a free API key (takes 2 minutes):
1. Go to the [Google Cloud Console Credentials Page](https://console.cloud.google.com/apis/credentials).
2. Click **+ Create Credentials** at the top and select **API key**.
3. Copy the key (it starts with `AIza...`).
*(Make sure YouTube Data API v3 is enabled in your Google Cloud Library).*

### How to save it in the extension:
1. Click the **YouTube Contact Scraper** icon in your toolbar to open the popup.
2. Paste your key into the **API Key** box at the top.
3. Click **Save Key**. (You only need to do this once — it stays saved!).

---

## 🎯 Step 3: How to Scrape Contacts

The extension offers **3 powerful modes** depending on what you want to extract:

### Mode 1: 💬 Video Comments (Find leads in video comment sections)
*Best for finding targeted leads who engage with specific videos or creators.*

1. Navigate to any YouTube video (e.g., `https://www.youtube.com/watch?v=...`).
2. Open the extension popup.
3. Set **Scrape Mode** to **💬 Video Comments**.
4. Set **Max Comments to Scan** (e.g., `200` or `500`).
5. Check **Include comment replies** if you want to scan deeper discussions.
6. Click **Start Scraping**.
7. The extension will fetch comments, extract emails/socials shared in comments, and automatically visit commenters' channels to pull their channel descriptions and subscriber counts!

---

### Mode 2: 📺 Channel Info (Scrape a specific creator/business)
*Best for getting contact info for a specific YouTuber or business channel.*

1. Navigate to any YouTube channel page (e.g., `https://www.youtube.com/@techlead` or `https://www.youtube.com/c/...`).
2. Open the extension popup.
3. Set **Scrape Mode** to **📺 Channel Info**.
4. Click **Start Scraping**.
5. It extracts public business emails, websites, social handles, and subscriber stats from their channel bio.

---

### Mode 3: 🔍 Search Results (Bulk find creators in a niche)
*Best for outreach campaigns and influencer marketing.*

1. Open the extension popup anywhere.
2. Set **Scrape Mode** to **🔍 Search Results**.
3. Type a query in the **Search Query** field (e.g., `web development freelancers` or `real estate agency`).
4. Click **Start Scraping**.
5. The extension searches YouTube for matching channels and bulk-extracts their contact details.

---

## 📊 Step 4: Export Your Leads

Once scraping finishes:
- Click **Export XLSX** to download a professionally formatted Excel workbook containing:
  - **Channel Name** | **Channel URL** | **Email(s)** | **Social Handle(s)** | **Website** | **Subscribers** | **Comment Snippet**
- Click **Copy JSON** if you want raw data for CRM or automation tools.
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
