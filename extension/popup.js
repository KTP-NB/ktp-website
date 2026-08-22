// popup.js

const SUPPORTED_JOB_BOARD_PATTERNS = [
  /^https:\/\/www\.linkedin\.com\//i,
  /^https:\/\/[^/]+\.greenhouse\.io\//i,
  /^https:\/\/[^/]+\.lever\.co\//i,
  /^https:\/\/[^/]+\.myworkdayjobs\.com\//i,
  /^http:\/\/localhost:8000\/test\//i,
];

const BLOCKED_PAGE_PATTERNS = [
  /^chrome:\/\//i,
  /^chrome-extension:\/\//i,
  /^https?:\/\/www\.ktpnewbrunswick\.org\//i,
];

function slugToTitleCase(slug) {
  if (!slug || typeof slug !== "string") return "";
  return slug
    .replace(/[-_]+/g, " ")
    .split(" ")
    .filter((word) => word.length > 0)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function detectJobBoardFromUrl(url) {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname;

    if (hostname === "localhost" || hostname === "127.0.0.1") {
      if (pathname.indexOf("/test/greenhouse") === 0) return "greenhouse";
      if (pathname.indexOf("/test/lever") === 0) return "lever";
      if (pathname.indexOf("/test/workday") === 0) return "workday";
    }

    if (hostname.includes("linkedin.com")) return "linkedin";
    if (hostname.includes("greenhouse.io")) return "greenhouse";
    if (hostname.includes("lever.co")) return "lever";
    if (hostname.includes("myworkdayjobs.com")) return "workday";
    if (hostname.endsWith(".jobs") || hostname === "jobs") return "generic";
    return null;
  } catch {
    return null;
  }
}

function isConsumerCommerceUrl(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    const path = parsed.pathname.toLowerCase();

    const consumerHosts = new Set([
      "amazon.com",
      "walmart.com",
      "target.com",
      "ebay.com",
      "bestbuy.com",
      "costco.com",
      "etsy.com",
      "wayfair.com",
      "homedepot.com",
      "lowes.com",
      "macys.com",
      "nordstrom.com",
    ]);

    if (!consumerHosts.has(host)) {
      return false;
    }

    if (path.includes("/careers") || /\/(jobs?|positions?|openings?)(\/|$)/i.test(path)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

function isSearchEngineResultsUrl(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    const path = parsed.pathname.toLowerCase();

    if (
      host === "duckduckgo.com" ||
      host === "search.brave.com" ||
      host === "ecosia.org" ||
      host === "ask.com" ||
      host === "baidu.com"
    ) {
      return true;
    }

    if (
      (host === "google.com" || /^google\.(com|co\.\w{2,3}|com\.\w{2,3})$/.test(host)) &&
      path.startsWith("/search")
    ) {
      return true;
    }

    if (host === "bing.com" && path.startsWith("/search")) {
      return true;
    }

    if (
      (host === "yahoo.com" || host === "search.yahoo.com") &&
      path.startsWith("/search")
    ) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

function extractCompanyFromUrl(url) {
  const board = detectJobBoardFromUrl(url);
  if (!board) return null;

  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    if (hostname === "localhost" || hostname === "127.0.0.1") {
      const companyParam = parsed.searchParams.get("company");
      if (companyParam && companyParam.trim()) {
        return companyParam.trim();
      }
    }

    if (board === "greenhouse") {
      const match = parsed.pathname.match(/^\/([^/]+)\/jobs(?:\/|$)/i);
      if (match && match[1]) {
        return slugToTitleCase(match[1]);
      }
    }

    if (board === "lever") {
      const match = parsed.pathname.match(/^\/([^/]+)\//);
      if (match && match[1]) {
        return slugToTitleCase(match[1]);
      }
    }

    if (board === "workday") {
      const subdomain = parsed.hostname.split(".")[0];
      if (subdomain && subdomain !== "www") {
        return slugToTitleCase(subdomain);
      }
    }

    if (board === "generic") {
      const host = hostname.replace(/^www\./, "");
      const parts = host.split(".");
      if (parts.length === 2 && parts[1] === "jobs") {
        return slugToTitleCase(parts[0]);
      }
    }

    return null;
  } catch {
    return null;
  }
}

function isSupportedJobBoard(url) {
  return SUPPORTED_JOB_BOARD_PATTERNS.some((pattern) => pattern.test(url));
}

function isInspectablePage(url) {
  if (!url || !/^https?:\/\//i.test(url)) return false;
  return !BLOCKED_PAGE_PATTERNS.some((pattern) => pattern.test(url));
}

function formatGradYear(year) {
  if (!year && year !== 0) return "";
  const str = String(year);
  return `'${str.slice(-2)}`;
}

function formatAlumniMeta(person) {
  const gradYear = formatGradYear(person.graduation_year);
  const university = person.chapter ? String(person.chapter).trim() : "";
  if (gradYear && university) return `${gradYear} · ${university}`;
  return gradYear || university;
}

function sendMessage(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        resolve(null);
        return;
      }
      resolve(response);
    });
  });
}

function sendTabMessage(tabId, message) {
  return new Promise((resolve) => {
    if (!tabId) {
      resolve(null);
      return;
    }

    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        resolve(null);
        return;
      }
      resolve(response);
    });
  });
}

async function ensureContentScript(tabId) {
  if (!tabId) return false;

  const ping = await sendTabMessage(tabId, { type: "GET_PAGE_CONTEXT" });
  if (ping) return true;

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["utils/auth.js", "utils/alumni.js", "utils/parser.js", "content.js"],
    });
    await chrome.scripting.insertCSS({
      target: { tabId },
      files: ["styles/content.css"],
    });
    return true;
  } catch {
    return false;
  }
}

async function getPageContext(tabId) {
  await ensureContentScript(tabId);
  return sendTabMessage(tabId, { type: "GET_PAGE_CONTEXT", wait: true });
}

function showSection(sectionId) {
  const sections = ["status-section", "results-section", "loading-section"];
  sections.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.style.display = id === sectionId ? "block" : "none";
    }
  });
}

function renderAlumniList(alumni, companyName) {
  const resultsSection = document.getElementById("results-section");
  if (!resultsSection) return;

  const sortedAlumni = window.KTPAlumni
    ? window.KTPAlumni.sortAlumniForDisplay(alumni)
    : alumni || [];

  if (!sortedAlumni || sortedAlumni.length === 0) {
    resultsSection.innerHTML = `
      <p class="popup-message">No referral contacts available for this company</p>
    `;
    showSection("results-section");
    return;
  }

  const formatMeta = window.KTPAlumni
    ? window.KTPAlumni.formatAlumniMeta.bind(window.KTPAlumni)
    : formatAlumniMeta;

  const cards = sortedAlumni
    .map((person) => {
      const meta = formatMeta(person);
      const role = person.current_role
        ? `<div class="popup-alumni-role">${escapeHtml(person.current_role)}</div>`
        : "";

      const companyAttr = escapeHtml(companyName || "");
      const linkedinBtn = person.linkedin_url
        ? `<a class="popup-btn popup-btn-linkedin" href="${escapeHtml(person.linkedin_url)}" target="_blank" rel="noopener noreferrer" data-ktp-contact="linkedin" data-ktp-company="${companyAttr}">LinkedIn</a>`
        : "";

      const emailBtn = person.email
        ? `<a class="popup-btn popup-btn-email" href="mailto:${escapeHtml(person.email)}" data-ktp-contact="email" data-ktp-company="${companyAttr}">Email</a>`
        : "";

      const nameHtml = window.KTPAlumni
        ? window.KTPAlumni.renderAlumniNameHtml(
            person,
            "popup-alumni-name",
            escapeHtml,
            companyAttr
          )
        : `<div class="popup-alumni-name">${escapeHtml(person.full_name)}</div>`;

      return `
        <div class="popup-alumni-card">
          ${nameHtml}
          ${meta ? `<div class="popup-alumni-meta">${escapeHtml(meta)}</div>` : ""}
          ${role}
          <div class="popup-alumni-actions">
            ${linkedinBtn}
            ${emailBtn}
          </div>
        </div>
      `;
    })
    .join("");

  resultsSection.innerHTML = `
    <h3 class="popup-results-title">KTP Alumni at ${escapeHtml(companyName || "this company")}</h3>
    ${cards}
  `;
  showSection("results-section");

  resultsSection.querySelectorAll("a[data-ktp-contact]").forEach((btn) => {
    btn.addEventListener("click", () => {
      sendMessage({
        type: "SEND_TELEMETRY",
        payload: {
          event_type: "referral_clicked",
          company_name: btn.getAttribute("data-ktp-company") || companyName || null,
          metadata: { contact: btn.getAttribute("data-ktp-contact") },
        },
      });
    });
  });
}

function renderStatus(message, action) {
  const statusSection = document.getElementById("status-section");
  if (!statusSection) return;

  const actionMarkup = action
    ? `<button class="popup-btn-primary" id="${escapeHtml(action.id)}">${escapeHtml(action.label)}</button>`
    : "";

  statusSection.innerHTML = `
    <p class="popup-message">${escapeHtml(message)}</p>
    ${actionMarkup}
  `;

  if (action) {
    const button = document.getElementById(action.id);
    if (button) {
      button.addEventListener("click", action.onClick);
    }
  }

  showSection("status-section");
}

function formatLookupError(response) {
  if (!response) return "No response from extension background worker.";
  if (response.error === "not_authenticated") {
    return "Not authenticated. Log in to ktpnewbrunswick.org and keep that tab open.";
  }
  if (response.error === "api_error") {
    if (response.error_code === "fines_unpaid" || response.status === 403) {
      return (
        response.detail ||
        "You have unpaid fines. Pay them on ktpnewbrunswick.org/fines to unlock referrals."
      );
    }
    const status = response.status ? `HTTP ${response.status}` : "API error";
    return response.detail ? `${status}: ${response.detail}` : status;
  }
  if (response.error === "network_error") {
    return response.detail
      ? `Network error: ${response.detail}`
      : "Network error. Check your connection and try again.";
  }
  return response.error || "Unknown referral API error.";
}

function isAuthLookupError(response) {
  return Boolean(
    response &&
      (response.error === "not_authenticated" ||
        (response.error === "api_error" && response.status === 401))
  );
}

function isFinesLookupError(response) {
  return Boolean(
    response &&
      response.error === "api_error" &&
      (response.error_code === "fines_unpaid" ||
        response.error_code === "no_profile" ||
        response.status === 403)
  );
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function injectPopupStyles() {
  if (document.getElementById("ktp-popup-styles")) return;

  const style = document.createElement("style");
  style.id = "ktp-popup-styles";
  style.textContent = `
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 14px;
      color: #1a1a1a;
      background: #ffffff;
    }
    .popup-header {
      background: #1a1a2e;
      color: #ffffff;
      padding: 16px;
      text-align: center;
    }
    .popup-logo {
      font-size: 24px;
      font-weight: 700;
      letter-spacing: 2px;
    }
    .popup-subtitle {
      font-size: 12px;
      opacity: 0.85;
      margin-top: 4px;
    }
    .popup-body {
      padding: 16px;
    }
    .popup-message {
      font-size: 13px;
      color: #495057;
      line-height: 1.5;
      margin: 0;
    }
    .popup-btn-primary {
      display: inline-block;
      margin-top: 12px;
      padding: 8px 16px;
      background: #1a1a2e;
      color: #ffffff;
      border: none;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      text-decoration: none;
    }
    .popup-btn-primary:hover { opacity: 0.9; }
    .popup-footer {
      padding: 12px 16px;
      border-top: 1px solid #e9ecef;
      text-align: center;
      font-size: 11px;
      color: #adb5bd;
    }
    .popup-footer a {
      display: block;
      margin-top: 4px;
      color: #0077b5;
      text-decoration: none;
    }
    .popup-footer a:hover { text-decoration: underline; }
    .popup-loading {
      text-align: center;
      color: #6c757d;
      font-size: 13px;
    }
    .popup-results-title {
      font-size: 14px;
      font-weight: 600;
      margin: 0 0 12px 0;
      color: #1a1a2e;
    }
    .popup-alumni-card {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 8px;
      border: 1px solid #e9ecef;
    }
    .popup-alumni-name {
      font-weight: 600;
      font-size: 14px;
      margin-bottom: 2px;
    }
    .popup-alumni-name-link {
      color: #1a1a2e;
      text-decoration: none;
    }
    .popup-alumni-name-link:hover {
      color: #0077b5;
      text-decoration: underline;
    }
    .popup-alumni-meta, .popup-alumni-role {
      font-size: 12px;
      color: #6c757d;
      margin-bottom: 4px;
    }
    .popup-alumni-actions {
      display: flex;
      gap: 8px;
      margin-top: 8px;
    }
    .popup-btn {
      display: inline-flex;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
      text-decoration: none;
    }
    .popup-btn-linkedin { background: #0077b5; color: #ffffff; }
    .popup-btn-email { background: #e9ecef; color: #495057; }
  `;
  document.head.appendChild(style);
}

document.addEventListener("DOMContentLoaded", async () => {
  injectPopupStyles();

  const loadingSection = document.getElementById("loading-section");

  const tokenResponse = await sendMessage({ type: "GET_SESSION_TOKEN" });
  const token = tokenResponse && tokenResponse.token ? tokenResponse.token : null;

  if (!token) {
    renderStatus("Please log in at ktpnewbrunswick.org to use the KTP Referral Finder", {
      id: "go-to-ktp-btn",
      label: "Go to KTP Website",
      onClick: () => {
        chrome.tabs.create({ url: "https://www.ktpnewbrunswick.org" });
      },
    });
    return;
  }

  sendMessage({
    type: "SEND_TELEMETRY",
    payload: { event_type: "extension_opened" },
  });

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const tabUrl = tab && tab.url ? tab.url : "";

  if (!isInspectablePage(tabUrl)) {
    renderStatus("Open a job posting on a company careers site or job board to find KTP alumni referrals");
    return;
  }

  if (isSearchEngineResultsUrl(tabUrl)) {
    renderStatus("Open a company's careers page or a job posting — search engine results aren't supported");
    return;
  }

  if (isConsumerCommerceUrl(tabUrl)) {
    renderStatus("Open a company's careers site or a job posting — shopping pages aren't supported");
    return;
  }

  const pageContext = tab && tab.id ? await getPageContext(tab.id) : null;
  const companyName =
    pageContext && pageContext.company_name
      ? pageContext.company_name
      : extractCompanyFromUrl(tabUrl);
  const jobBoard =
    pageContext && pageContext.job_board
      ? pageContext.job_board
      : detectJobBoardFromUrl(tabUrl) || "generic";

  if (!companyName) {
    if (pageContext && pageContext.is_job_page === false) {
      renderStatus("Browse to a specific job posting (not a search page) to see KTP alumni contacts");
    } else {
      renderStatus("Browse to a job posting to see KTP alumni contacts");
    }
    return;
  }

  loadingSection.innerHTML = `<p class="popup-loading">Checking ${escapeHtml(companyName)} for KTP alumni...</p>`;
  showSection("loading-section");

  // The background LOOKUP_COMPANY handler is cache-first (24h chrome.storage.local),
  // so the popup does not manage the cache itself.
  const lookupResponse = await sendMessage({
    type: "LOOKUP_COMPANY",
    payload: {
      company_name: companyName,
      job_board: jobBoard,
      extension_version: chrome.runtime.getManifest().version,
      force_refresh: true,
    },
  });

  if (!lookupResponse || lookupResponse.error) {
    let action = null;
    if (isFinesLookupError(lookupResponse)) {
      action = {
        id: "go-to-fines-btn",
        label: "View my fines",
        onClick: () => {
          chrome.tabs.create({ url: "https://www.ktpnewbrunswick.org/fines" });
          window.close();
        },
      };
    } else if (isAuthLookupError(lookupResponse)) {
      action = {
        id: "clear-token-btn",
        label: "Clear cached login",
        onClick: async () => {
          await sendMessage({ type: "CLEAR_SESSION_TOKEN" });
          await sendMessage({ type: "CLEAR_PERSISTENT_TOKEN" });
          chrome.tabs.create({ url: "https://www.ktpnewbrunswick.org/login" });
          window.close();
        },
      };
    }

    renderStatus(
      isFinesLookupError(lookupResponse)
        ? formatLookupError(lookupResponse)
        : `Could not reach the referral API. ${formatLookupError(lookupResponse)}`,
      action
    );
    return;
  }

  const data = lookupResponse.data;
  if (data && data.matched && data.alumni && data.alumni.length > 0) {
    renderAlumniList(data.alumni, data.company_name || companyName);
  } else {
    renderStatus(`No KTP referral contacts found for ${companyName}`);
  }
});
