/**
 * YouTube Contact Scraper — Popup Controller
 *
 * Manages the popup UI lifecycle:
 *   - API key persistence (chrome.storage.local)
 *   - Mode switching (comments / channel / search)
 *   - Triggering scrapes via background.js YouTube Data API calls
 *   - Polling progress and rendering results
 *   - Copy JSON / Export XLSX actions
 */

// ── DOM References ─────────────────────────────────────────────────────────

const scrapeButton   = document.getElementById("scrapeButton");
const stopButton     = document.getElementById("stopButton");
const copyButton     = document.getElementById("copyButton");
const exportButton   = document.getElementById("exportButton");

const scrapeMode     = document.getElementById("scrapeMode");
const maxComments    = document.getElementById("maxComments");
const searchQuery    = document.getElementById("searchQuery");
const searchQueryGroup = document.getElementById("searchQueryGroup");
const includeReplies = document.getElementById("includeReplies");

const apiKeyInput    = document.getElementById("apiKeyInput");
const saveApiKeyBtn  = document.getElementById("saveApiKeyBtn");
const clearApiKeyBtn = document.getElementById("clearApiKeyBtn");
const apiKeyStatus   = document.getElementById("apiKeyStatus");

const progressBar    = document.getElementById("progressBar");
const progressFill   = document.getElementById("progressFill");
const progressLabel  = document.getElementById("progressLabel");

const statusNode     = document.getElementById("status");
const outputNode     = document.getElementById("output");
const summaryNode    = document.getElementById("summary");

let lastResult = null;
let isRunning  = false;

// ── API Key Management ─────────────────────────────────────────────────────

chrome.storage.local.get("yt_api_key", (data) => {
  if (data.yt_api_key) {
    apiKeyInput.value = data.yt_api_key;
    apiKeyStatus.textContent = "✓ Key saved";
    apiKeyStatus.className = "key-status saved";
  }
});

saveApiKeyBtn.addEventListener("click", () => {
  const key = apiKeyInput.value.trim();
  if (!key) {
    apiKeyStatus.textContent = "⚠ Please enter a valid API key";
    apiKeyStatus.className = "key-status error";
    return;
  }
  chrome.storage.local.set({ yt_api_key: key }, () => {
    apiKeyStatus.textContent = "✓ Key saved successfully";
    apiKeyStatus.className = "key-status saved";
    setStatus("API key saved. Ready to scrape.");
  });
});

clearApiKeyBtn.addEventListener("click", () => {
  chrome.storage.local.remove("yt_api_key", () => {
    apiKeyInput.value = "";
    apiKeyStatus.textContent = "Key cleared";
    apiKeyStatus.className = "key-status";
    setStatus("API key removed.");
  });
});

// ── Mode Switching ─────────────────────────────────────────────────────────

scrapeMode.addEventListener("change", () => {
  const mode = scrapeMode.value;
  searchQueryGroup.style.display = mode === "search" ? "" : "none";
});

// ── Scrape Button ──────────────────────────────────────────────────────────

scrapeButton.addEventListener("click", async () => {
  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) {
    setStatus("⚠ Please enter your YouTube Data API key first.");
    return;
  }

  const mode = scrapeMode.value;
  let targetUrl = "";

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    targetUrl = tab?.url || "";
  } catch {
    setStatus("⚠ Could not access the active tab.");
    return;
  }

  // Validate context
  if (mode === "comments" && !targetUrl.includes("youtube.com/watch")) {
    setStatus("⚠ Please navigate to a YouTube video page first.");
    return;
  }
  if (mode === "channel" && !targetUrl.match(/youtube\.com\/(channel|c|@|user)/i)) {
    setStatus("⚠ Please navigate to a YouTube channel page first.");
    return;
  }
  if (mode === "search" && !searchQuery.value.trim()) {
    setStatus("⚠ Please enter a search query.");
    return;
  }

  isRunning = true;
  setBusy(true);
  showProgress(0, "Starting...");

  const options = {
    action: "startScrape",
    apiKey,
    mode,
    url: targetUrl,
    maxComments: parseInt(maxComments.value, 10) || 200,
    includeReplies: includeReplies.checked,
    searchQuery: searchQuery.value.trim(),
  };

  try {
    const response = await chrome.runtime.sendMessage(options);

    if (response && response.error) {
      throw new Error(response.error);
    }

    if (response && response.results) {
      lastResult = response.results;
      onScrapeComplete(lastResult);
    }
  } catch (error) {
    setStatus(`Error: ${error.message}`);
    hideProgress();
  } finally {
    isRunning = false;
    setBusy(false);
  }
});

// ── Stop Button ────────────────────────────────────────────────────────────

stopButton.addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "stopScrape" });
  isRunning = false;
  setBusy(false);
  hideProgress();
  setStatus("Scrape stopped by user.");
});

// ── Listen for Progress Updates ────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "progress") {
    showProgress(message.percent, message.label);
  }
  if (message.type === "scrapeComplete") {
    lastResult = message.results;
    onScrapeComplete(lastResult);
    isRunning = false;
    setBusy(false);
  }
  if (message.type === "scrapeError") {
    setStatus(`Error: ${message.error}`);
    hideProgress();
    isRunning = false;
    setBusy(false);
  }
});

// ── Copy / Export ──────────────────────────────────────────────────────────

copyButton.addEventListener("click", async () => {
  if (!lastResult) return;
  await navigator.clipboard.writeText(JSON.stringify(lastResult, null, 2));
  setStatus("Copied JSON to clipboard.");
});

exportButton.addEventListener("click", () => {
  if (!lastResult) return;

  try {
    const workbookBytes = buildYouTubeWorkbook(lastResult);
    const blob = new Blob([workbookBytes], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `youtube-contacts-${Date.now()}.xlsx`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus("Exported XLSX file.");
  } catch (error) {
    setStatus(error.message || "XLSX export failed.");
  }
});

// ── Helpers ────────────────────────────────────────────────────────────────

function onScrapeComplete(results) {
  hideProgress();
  outputNode.value = JSON.stringify(results, null, 2);
  renderSummary(results);
  setResultActionsEnabled(true);
  const total = results.contacts?.length || 0;
  setStatus(`Done! Found ${total} contact(s) with extractable info.`);
}

function setBusy(busy) {
  scrapeButton.disabled = busy;
  scrapeButton.textContent = busy ? "Scraping..." : "Start Scraping";
  stopButton.disabled = !busy;
}

function setResultActionsEnabled(enabled) {
  copyButton.disabled = !enabled;
  exportButton.disabled = !enabled;
}

function setStatus(message) {
  statusNode.textContent = message;
}

function showProgress(percent, label) {
  progressBar.classList.remove("hidden");
  progressFill.style.width = `${Math.min(percent, 100)}%`;
  progressLabel.textContent = label || "";
}

function hideProgress() {
  progressBar.classList.add("hidden");
  progressFill.style.width = "0%";
}

function renderSummary(results) {
  const contacts = results?.contacts || [];
  const emailCount   = contacts.filter(c => c.emails && c.emails.length > 0).length;
  const socialCount  = contacts.filter(c => c.socials && c.socials.length > 0).length;
  const websiteCount = contacts.filter(c => c.website).length;
  const uniqueEmails = new Set(contacts.flatMap(c => c.emails || [])).size;

  const values = Array.from(summaryNode.querySelectorAll("dd"));
  if (values.length >= 6) {
    values[0].textContent = contacts.length;
    values[1].textContent = emailCount;
    values[2].textContent = results.channelsScanned || 0;
    values[3].textContent = socialCount;
    values[4].textContent = websiteCount;
    values[5].textContent = uniqueEmails;
  }
}
