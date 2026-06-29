/**
 * YouTube Contact Scraper — Content Script
 *
 * Injected into YouTube pages. Can extract data directly from the DOM
 * as a fallback or supplement to the API approach.
 *
 * Primary responsibilities:
 *   - Extract video ID from page
 *   - Extract visible comment text from DOM (non-API fallback)
 *   - Extract channel "About" description from DOM
 */

// ── Respond to messages from popup/background ──────────────────────────────

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getVideoId") {
    const videoId = getVideoIdFromPage();
    sendResponse({ videoId });
    return false;
  }

  if (request.action === "getVisibleComments") {
    const comments = getVisibleComments();
    sendResponse({ comments });
    return false;
  }

  if (request.action === "getChannelDescription") {
    const description = getChannelDescription();
    sendResponse({ description });
    return false;
  }
});

// ── Video ID Extraction ────────────────────────────────────────────────────

function getVideoIdFromPage() {
  // From URL
  const urlMatch = window.location.href.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (urlMatch) return urlMatch[1];

  // From canonical link
  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) {
    const m = canonical.href.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    if (m) return m[1];
  }

  return null;
}

// ── Visible Comments Extraction (DOM fallback) ─────────────────────────────

function getVisibleComments() {
  const comments = [];
  const commentElements = document.querySelectorAll(
    "ytd-comment-thread-renderer, ytd-comment-renderer"
  );

  for (const el of commentElements) {
    const authorEl = el.querySelector("#author-text");
    const textEl = el.querySelector("#content-text");
    const channelLink = el.querySelector("a#author-text");

    const author = authorEl?.textContent?.trim() || "";
    const text = textEl?.textContent?.trim() || "";
    const channelUrl = channelLink?.href || "";

    // Extract channel ID from URL
    let channelId = null;
    const channelMatch = channelUrl.match(/\/channel\/(UC[a-zA-Z0-9_-]+)/);
    if (channelMatch) channelId = channelMatch[1];

    if (text || author) {
      comments.push({ author, text, channelId, channelUrl });
    }
  }

  return comments;
}

// ── Channel Description Extraction (DOM) ───────────────────────────────────

function getChannelDescription() {
  // Try the "About" section
  const aboutMeta = document.querySelector('meta[property="og:description"]');
  if (aboutMeta) return aboutMeta.content || "";

  // Try the channel description element
  const descEl = document.querySelector(
    "yt-attributed-string#description, #description-container, #channel-description"
  );
  if (descEl) return descEl.textContent?.trim() || "";

  return "";
}
