/**
 * YouTube Contact Scraper — Background Service Worker
 *
 * Handles YouTube Data API v3 communication:
 *   - Fetching video comments (commentThreads.list)
 *   - Fetching channel "About" info (channels.list)
 *   - Fetching search results (search.list)
 *   - Extracting emails, social handles, websites from text
 *   - Sending progress updates back to the popup
 */

const YT_API_BASE = "https://www.googleapis.com/youtube/v3";

let stopRequested = false;

// ── Message Listener ───────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "startScrape") {
    stopRequested = false;
    handleScrape(request)
      .then(results => sendResponse({ results }))
      .catch(error => sendResponse({ error: error.message }));
    return true; // async response
  }

  if (request.action === "stopScrape") {
    stopRequested = true;
    sendResponse({ status: "stopping" });
    return false;
  }

  if (request.action === "fetchPage") {
    fetch(request.url, { credentials: "omit" })
      .then(r => r.text())
      .then(html => sendResponse({ html }))
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }
});

// ── Main Scrape Handler ────────────────────────────────────────────────────

async function handleScrape(options) {
  const { apiKey, mode, url, maxComments, includeReplies, searchQuery } = options;

  switch (mode) {
    case "comments":
      return await scrapeVideoComments(apiKey, url, maxComments, includeReplies);
    case "channel":
      return await scrapeChannelInfo(apiKey, url);
    case "search":
      return await scrapeSearchResults(apiKey, searchQuery, maxComments);
    default:
      throw new Error(`Unknown scrape mode: ${mode}`);
  }
}

// ── Video Comments Scraper ─────────────────────────────────────────────────

async function scrapeVideoComments(apiKey, videoUrl, maxComments, includeReplies) {
  const videoId = extractVideoId(videoUrl);
  if (!videoId) throw new Error("Could not extract video ID from URL.");

  sendProgress(0, "Fetching video details...");

  // Get video info
  const videoInfo = await ytApiGet(apiKey, "videos", {
    part: "snippet,statistics",
    id: videoId,
  });

  const video = videoInfo.items?.[0];
  if (!video) throw new Error("Video not found.");

  const contacts = [];
  const seenAuthors = new Set();
  let pageToken = null;
  let fetched = 0;

  while (fetched < maxComments) {
    if (stopRequested) break;

    const percent = Math.round((fetched / maxComments) * 100);
    sendProgress(percent, `Fetching comments... (${fetched}/${maxComments})`);

    const params = {
      part: "snippet",
      videoId,
      maxResults: Math.min(100, maxComments - fetched),
      order: "relevance",
      textFormat: "plainText",
    };
    if (pageToken) params.pageToken = pageToken;

    const data = await ytApiGet(apiKey, "commentThreads", params);

    for (const thread of data.items || []) {
      const topComment = thread.snippet?.topLevelComment?.snippet;
      if (topComment) {
        processComment(topComment, contacts, seenAuthors);
      }

      // Fetch replies if enabled
      if (includeReplies && thread.snippet?.totalReplyCount > 0) {
        try {
          const replies = await ytApiGet(apiKey, "comments", {
            part: "snippet",
            parentId: thread.id,
            maxResults: 100,
            textFormat: "plainText",
          });
          for (const reply of replies.items || []) {
            if (reply.snippet) {
              processComment(reply.snippet, contacts, seenAuthors);
            }
          }
        } catch {
          // Skip reply fetch errors
        }
      }

      fetched += 1;
    }

    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }

  sendProgress(90, "Enriching with channel info...");

  // Batch-enrich with channel details for contacts that have channel IDs
  const channelIds = [...new Set(contacts.map(c => c.channelId).filter(Boolean))];
  const channelMap = await batchFetchChannels(apiKey, channelIds);

  for (const contact of contacts) {
    const ch = channelMap[contact.channelId];
    if (ch) {
      const aboutText = ch.snippet?.description || "";
      const aboutEmails = extractEmails(aboutText);
      const aboutSocials = extractSocials(aboutText);
      const aboutWebsite = extractWebsite(aboutText);
      contact.emails = [...new Set([...contact.emails, ...aboutEmails])];
      contact.socials = [...new Set([...contact.socials, ...aboutSocials])];
      if (!contact.website && aboutWebsite) contact.website = aboutWebsite;
      contact.channelTitle = ch.snippet?.title || contact.channelTitle;
      contact.subscriberCount = ch.statistics?.subscriberCount || null;
    }
  }

  // Filter to only contacts that have some extractable info
  const enriched = contacts.filter(c =>
    c.emails.length > 0 || c.socials.length > 0 || c.website
  );

  sendProgress(100, "Done!");

  return {
    mode: "comments",
    videoId,
    videoTitle: video.snippet?.title || "",
    channelTitle: video.snippet?.channelTitle || "",
    totalComments: video.statistics?.commentCount || 0,
    commentsScanned: fetched,
    channelsScanned: channelIds.length,
    contacts: enriched,
    allCommenters: contacts,
  };
}

// ── Channel Info Scraper ───────────────────────────────────────────────────

async function scrapeChannelInfo(apiKey, channelUrl) {
  sendProgress(0, "Resolving channel...");

  const channelId = await resolveChannelId(apiKey, channelUrl);
  if (!channelId) throw new Error("Could not resolve channel from URL.");

  sendProgress(30, "Fetching channel details...");

  const data = await ytApiGet(apiKey, "channels", {
    part: "snippet,statistics,brandingSettings",
    id: channelId,
  });

  const channel = data.items?.[0];
  if (!channel) throw new Error("Channel not found.");

  const description = channel.snippet?.description || "";
  const emails = extractEmails(description);
  const socials = extractSocials(description);
  const website = extractWebsite(description);

  // Also check branding settings for links
  const brandLinks = channel.brandingSettings?.channel?.unsubscribedTrailer || "";

  sendProgress(100, "Done!");

  return {
    mode: "channel",
    channelId,
    channelTitle: channel.snippet?.title || "",
    description,
    subscriberCount: channel.statistics?.subscriberCount || null,
    videoCount: channel.statistics?.videoCount || null,
    channelsScanned: 1,
    contacts: [{
      channelId,
      channelTitle: channel.snippet?.title || "",
      channelUrl: `https://www.youtube.com/channel/${channelId}`,
      emails,
      socials,
      website,
      subscriberCount: channel.statistics?.subscriberCount || null,
    }],
  };
}

// ── Search Results Scraper ─────────────────────────────────────────────────

async function scrapeSearchResults(apiKey, query, maxResults) {
  sendProgress(0, "Searching YouTube...");

  const limit = Math.min(maxResults, 50); // API max per page
  const data = await ytApiGet(apiKey, "search", {
    part: "snippet",
    q: query,
    type: "channel",
    maxResults: limit,
  });

  const channelIds = (data.items || [])
    .filter(item => item.id?.channelId)
    .map(item => item.id.channelId);

  if (channelIds.length === 0) {
    sendProgress(100, "No channels found.");
    return { mode: "search", query, contacts: [], channelsScanned: 0 };
  }

  sendProgress(40, `Found ${channelIds.length} channels. Fetching details...`);

  const channelMap = await batchFetchChannels(apiKey, channelIds);
  const contacts = [];

  for (const [chId, ch] of Object.entries(channelMap)) {
    const desc = ch.snippet?.description || "";
    const emails = extractEmails(desc);
    const socials = extractSocials(desc);
    const website = extractWebsite(desc);

    contacts.push({
      channelId: chId,
      channelTitle: ch.snippet?.title || "",
      channelUrl: `https://www.youtube.com/channel/${chId}`,
      emails,
      socials,
      website,
      subscriberCount: ch.statistics?.subscriberCount || null,
    });
  }

  const enriched = contacts.filter(c =>
    c.emails.length > 0 || c.socials.length > 0 || c.website
  );

  sendProgress(100, "Done!");

  return {
    mode: "search",
    query,
    channelsScanned: channelIds.length,
    contacts: enriched,
    allChannels: contacts,
  };
}

// ── YouTube API Helpers ────────────────────────────────────────────────────

async function ytApiGet(apiKey, endpoint, params) {
  const url = new URL(`${YT_API_BASE}/${endpoint}`);
  url.searchParams.set("key", apiKey);
  for (const [k, v] of Object.entries(params)) {
    if (v != null) url.searchParams.set(k, String(v));
  }

  const response = await fetch(url.toString());

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const message = err.error?.message || `API error ${response.status}`;
    throw new Error(message);
  }

  return await response.json();
}

function extractVideoId(url) {
  const match = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/) ||
                url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/) ||
                url.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

async function resolveChannelId(apiKey, url) {
  // Direct channel ID
  const directMatch = url.match(/youtube\.com\/channel\/(UC[a-zA-Z0-9_-]+)/);
  if (directMatch) return directMatch[1];

  // Handle /@username format
  const handleMatch = url.match(/youtube\.com\/@([a-zA-Z0-9._-]+)/);
  if (handleMatch) {
    const data = await ytApiGet(apiKey, "search", {
      part: "snippet",
      q: handleMatch[1],
      type: "channel",
      maxResults: 1,
    });
    return data.items?.[0]?.id?.channelId || null;
  }

  // Legacy /c/ or /user/ format
  const legacyMatch = url.match(/youtube\.com\/(?:c|user)\/([a-zA-Z0-9._-]+)/);
  if (legacyMatch) {
    const data = await ytApiGet(apiKey, "search", {
      part: "snippet",
      q: legacyMatch[1],
      type: "channel",
      maxResults: 1,
    });
    return data.items?.[0]?.id?.channelId || null;
  }

  return null;
}

async function batchFetchChannels(apiKey, channelIds) {
  const map = {};
  // API allows max 50 IDs per request
  for (let i = 0; i < channelIds.length; i += 50) {
    if (stopRequested) break;
    const batch = channelIds.slice(i, i + 50);
    try {
      const data = await ytApiGet(apiKey, "channels", {
        part: "snippet,statistics,brandingSettings",
        id: batch.join(","),
      });
      for (const ch of data.items || []) {
        map[ch.id] = ch;
      }
    } catch {
      // Skip batch errors, continue with others
    }
  }
  return map;
}

// ── Text Extraction Helpers ────────────────────────────────────────────────

function extractEmails(text) {
  if (!text) return [];
  const pattern = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
  const matches = text.match(pattern) || [];
  // Filter out common false positives
  return [...new Set(matches)].filter(email =>
    !email.endsWith(".png") &&
    !email.endsWith(".jpg") &&
    !email.endsWith(".gif") &&
    !email.includes("example.com") &&
    !email.includes("email.com") &&
    !email.includes("@google.com") &&
    !email.includes("@youtube.com")
  );
}

function extractSocials(text) {
  if (!text) return [];
  const socials = [];

  // Twitter/X
  const twitter = text.match(/(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)/gi);
  if (twitter) socials.push(...twitter.map(m => m.replace(/^https?:\/\//i, "")));

  // Instagram
  const insta = text.match(/instagram\.com\/([a-zA-Z0-9_.]+)/gi);
  if (insta) socials.push(...insta.map(m => m.replace(/^https?:\/\//i, "")));

  // Facebook
  const fb = text.match(/facebook\.com\/([a-zA-Z0-9.]+)/gi);
  if (fb) socials.push(...fb.map(m => m.replace(/^https?:\/\//i, "")));

  // LinkedIn
  const li = text.match(/linkedin\.com\/in\/([a-zA-Z0-9_-]+)/gi);
  if (li) socials.push(...li.map(m => m.replace(/^https?:\/\//i, "")));

  // TikTok
  const tiktok = text.match(/tiktok\.com\/@([a-zA-Z0-9_.]+)/gi);
  if (tiktok) socials.push(...tiktok.map(m => m.replace(/^https?:\/\//i, "")));

  // Discord
  const discord = text.match(/discord\.gg\/([a-zA-Z0-9]+)/gi);
  if (discord) socials.push(...discord.map(m => m.replace(/^https?:\/\//i, "")));

  // @handles in text
  const handles = text.match(/@[a-zA-Z0-9_]{2,30}/g);
  if (handles) {
    for (const h of handles) {
      if (!h.includes("@gmail") && !h.includes("@yahoo") && !h.includes("@outlook")) {
        socials.push(h);
      }
    }
  }

  return [...new Set(socials)];
}

function extractWebsite(text) {
  if (!text) return null;
  const urlPattern = /https?:\/\/(?!(?:www\.)?(?:youtube|google|facebook|instagram|twitter|x|tiktok|linkedin|discord)\.com)[a-zA-Z0-9][-a-zA-Z0-9.]*\.[a-z]{2,}(?:\/[^\s)]*)?/gi;
  const matches = text.match(urlPattern) || [];
  return matches[0] || null;
}

// ── Comment Processing ─────────────────────────────────────────────────────

function processComment(commentSnippet, contacts, seenAuthors) {
  const authorId = commentSnippet.authorChannelId?.value;
  const authorName = commentSnippet.authorDisplayName || "";
  const text = commentSnippet.textDisplay || "";

  // Skip if we've already processed this author
  const key = authorId || authorName;
  if (seenAuthors.has(key)) {
    // Merge any new emails/socials into existing contact
    const existing = contacts.find(c => (c.channelId || c.channelTitle) === key);
    if (existing) {
      const newEmails = extractEmails(text);
      const newSocials = extractSocials(text);
      existing.emails = [...new Set([...existing.emails, ...newEmails])];
      existing.socials = [...new Set([...existing.socials, ...newSocials])];
      if (!existing.website) existing.website = extractWebsite(text);
    }
    return;
  }

  seenAuthors.add(key);

  const emails = extractEmails(text);
  const socials = extractSocials(text);
  const website = extractWebsite(text);

  contacts.push({
    channelId: authorId || null,
    channelTitle: authorName,
    channelUrl: authorId ? `https://www.youtube.com/channel/${authorId}` : null,
    commentText: text.slice(0, 200),
    emails,
    socials,
    website,
    subscriberCount: null,
  });
}

// ── Progress Communication ─────────────────────────────────────────────────

function sendProgress(percent, label) {
  chrome.runtime.sendMessage({
    type: "progress",
    percent,
    label,
  }).catch(() => {});
}
