// content.js

(function () {
  if (window.__KTP_CONTENT__ && window.__KTP_CONTENT__.isAlive()) {
    window.__KTP_CONTENT__.restart();
    return;
  }

  if (window.__KTP_CONTENT__) {
    window.__KTP_CONTENT__.teardown();
  }

  const EXTENSION_VERSION = "1.1.0";
  const OVERLAY_ID = "ktp-referral-overlay";
  const COMPANY_RETRY_ATTEMPTS = 15;
  const COMPANY_RETRY_INTERVAL_MS = 1000;
  const URL_POLL_INTERVAL_MS = 1500;
  const MUTATION_DEBOUNCE_MS = 800;
  const SPA_HYDRATION_POLL_MS = 1000;
  const SPA_HYDRATION_MAX_POLLS = 20;

  let lastUrl = window.location.href;
  let lastCompanyName = "";
  let forceNextLookup = true;
  let lastDocumentTitle = document.title || "";
  let urlPollTimer = null;
  let spaHydrationTimer = null;
  let spaHydrationPolls = 0;
  let mutationObserver = null;
  let mutationTimer = null;
  let initInProgress = false;

  function isExtensionContextValid() {
    try {
      return typeof chrome !== "undefined" && Boolean(chrome.runtime && chrome.runtime.id);
    } catch {
      return false;
    }
  }

  function markActive() {
    try {
      document.documentElement.setAttribute("data-ktp-extension", "active");
    } catch {
      /* ignore */
    }
  }

  function markPageContext(companyName, jobBoard) {
    try {
      document.documentElement.setAttribute("data-ktp-company", companyName || "");
      document.documentElement.setAttribute("data-ktp-job-board", jobBoard || "");
    } catch {
      /* ignore */
    }
  }

  function teardown() {
    if (urlPollTimer) {
      clearInterval(urlPollTimer);
      urlPollTimer = null;
    }
    if (spaHydrationTimer) {
      clearInterval(spaHydrationTimer);
      spaHydrationTimer = null;
    }
    spaHydrationPolls = 0;
    if (mutationObserver) {
      mutationObserver.disconnect();
      mutationObserver = null;
    }
    if (mutationTimer) {
      clearTimeout(mutationTimer);
      mutationTimer = null;
    }
    initInProgress = false;
  }

  function sendMessage(message) {
    return new Promise((resolve) => {
      if (!isExtensionContextValid()) {
        resolve(null);
        return;
      }

      try {
        chrome.runtime.sendMessage(message, (response) => {
          if (chrome.runtime.lastError) {
            resolve(null);
            return;
          }
          resolve(response);
        });
      } catch {
        resolve(null);
      }
    });
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

  function injectOverlay(matchData) {
    if (!document.body) {
      return;
    }

    const existing = document.getElementById(OVERLAY_ID);
    if (existing) {
      existing.remove();
    }

    const companyName = matchData.company_name || "this company";
    const alumni = window.KTPAlumni
      ? window.KTPAlumni.sortAlumniForDisplay(matchData.alumni || [])
      : matchData.alumni || [];
    const formatMeta = window.KTPAlumni
      ? window.KTPAlumni.formatAlumniMeta.bind(window.KTPAlumni)
      : (person) => person.chapter || "";
    const count = alumni.length;
    const contactLabel = count === 1 ? "contact" : "contacts";
    const cacheKey = `ktp-overlay-dismissed:${window.location.href}`;

    try {
      if (sessionStorage.getItem(cacheKey) === "true") {
        return;
      }
    } catch {
      /* ignore */
    }

    const overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    overlay.className = "ktp-overlay";

    const alumniCards = alumni
      .map((person) => {
        const meta = formatMeta(person);
        const role = person.current_role
          ? `<div class="ktp-alumni-meta">${escapeHtml(person.current_role)}</div>`
          : "";

        const companyAttr = escapeHtml(companyName || "");
        const linkedinBtn = person.linkedin_url
          ? `<a class="ktp-btn ktp-btn-linkedin" href="${escapeHtml(person.linkedin_url)}" target="_blank" rel="noopener noreferrer" data-ktp-contact="linkedin" data-ktp-company="${companyAttr}">LinkedIn</a>`
          : "";

        const emailBtn = person.email
          ? `<a class="ktp-btn ktp-btn-email" href="mailto:${escapeHtml(person.email)}" data-ktp-contact="email" data-ktp-company="${companyAttr}">Email</a>`
          : "";

        const nameHtml = window.KTPAlumni
          ? window.KTPAlumni.renderAlumniNameHtml(
              person,
              "ktp-alumni-name",
              escapeHtml,
              companyAttr
            )
          : `<div class="ktp-alumni-name">${escapeHtml(person.full_name)}</div>`;

        return `
        <div class="ktp-alumni-card">
          ${nameHtml}
          ${meta ? `<div class="ktp-alumni-meta">${escapeHtml(meta)}</div>` : ""}
          ${role}
          <div class="ktp-alumni-actions">
            ${linkedinBtn}
            ${emailBtn}
          </div>
        </div>
      `;
      })
      .join("");

    overlay.innerHTML = `
    <button class="ktp-overlay-summary" type="button" aria-expanded="true">
      <span class="ktp-mark">KTP</span>
      <span class="ktp-summary-text">${count} ${contactLabel} at ${escapeHtml(companyName)}</span>
      <span class="ktp-summary-caret" aria-hidden="true">v</span>
    </button>
    <div class="ktp-overlay-panel">
      <div class="ktp-overlay-header">
        <span>KTP Alumni at ${escapeHtml(companyName)}</span>
        <button class="ktp-overlay-close" type="button" aria-label="Close">&times;</button>
      </div>
      <div class="ktp-overlay-body">
        <span class="ktp-badge">${count} ${contactLabel} available</span>
        ${alumniCards}
      </div>
      <div class="ktp-overlay-footer">Powered by KTP New Brunswick</div>
    </div>
  `;

    document.body.appendChild(overlay);

    const closeBtn = overlay.querySelector(".ktp-overlay-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        try {
          sessionStorage.setItem(cacheKey, "true");
        } catch {
          /* ignore */
        }
        overlay.remove();
      });
    }

    const summary = overlay.querySelector(".ktp-overlay-summary");
    if (summary) {
      summary.addEventListener("click", () => {
        const collapsed = overlay.classList.toggle("ktp-overlay-collapsed");
        summary.setAttribute("aria-expanded", collapsed ? "false" : "true");
      });
    }

    overlay.querySelectorAll("a[data-ktp-contact]").forEach((btn) => {
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

    setTimeout(() => {
      overlay.classList.add("ktp-overlay-visible");
    }, 10);
  }

  function removeOverlay() {
    const existing = document.getElementById(OVERLAY_ID);
    if (existing) {
      existing.remove();
    }
  }

  async function waitForCompanyName() {
    if (!window.KTPParser) {
      return null;
    }

    let bestName = null;

    for (let attempt = 0; attempt < COMPANY_RETRY_ATTEMPTS; attempt += 1) {
      try {
        const fromJsonLd = window.KTPParser.extractJobPostingCompanyFromJsonLd();
        if (fromJsonLd) {
          const companyName = window.KTPParser.extractCompanyName();
          if (companyName) return companyName;
        }
      } catch {
        /* ignore */
      }

      const companyName = window.KTPParser.extractCompanyName();
      if (companyName) {
        bestName = companyName;
        if (attempt >= 2) {
          return bestName;
        }
      }

      await new Promise((resolve) => setTimeout(resolve, COMPANY_RETRY_INTERVAL_MS));
    }

    return bestName;
  }

  async function runLookup() {
    if (initInProgress || !isExtensionContextValid()) {
      return;
    }

    if (!window.KTPParser || !window.KTPAuth) {
      return;
    }

    if (!window.KTPParser.hasJobPageSignals()) {
      markPageContext("", window.KTPParser.detectJobBoard());
      removeOverlay();
      return;
    }

    initInProgress = true;

    try {
      markActive();

      const companyName = await waitForCompanyName();
      if (!companyName) {
        markPageContext("", window.KTPParser.detectJobBoard());
        return;
      }

      markPageContext(companyName, window.KTPParser.detectJobBoard());

      if (companyName === lastCompanyName && document.getElementById(OVERLAY_ID)) {
        return;
      }

      lastCompanyName = companyName;

      const authenticated = await window.KTPAuth.isAuthenticated();
      if (!authenticated) {
        return;
      }

      // Caching (24h, chrome.storage.local) is handled inside the background
      // LOOKUP_COMPANY handler, which checks the cache before any backend call.
      const lookupResponse = await sendMessage({
        type: "LOOKUP_COMPANY",
        payload: {
          company_name: companyName,
          job_board: window.KTPParser.detectJobBoard(),
          extension_version: EXTENSION_VERSION,
          force_refresh: forceNextLookup,
        },
      });

      forceNextLookup = false;

      if (!lookupResponse || lookupResponse.error) {
        return;
      }

      if (lookupResponse.success && lookupResponse.data && lookupResponse.data.matched === true) {
        injectOverlay(lookupResponse.data);
      }
    } finally {
      initInProgress = false;
    }
  }

  function onUrlMaybeChanged() {
    const currentUrl = window.location.href;
    if (currentUrl === lastUrl) {
      return;
    }

    lastUrl = currentUrl;
    lastCompanyName = "";
    forceNextLookup = true;
    lastDocumentTitle = document.title || "";
    removeOverlay();
    if (spaHydrationTimer) {
      clearInterval(spaHydrationTimer);
      spaHydrationTimer = null;
    }
    startSpaHydrationWatch();
    runLookup();
  }

  function startUrlPolling() {
    if (urlPollTimer) {
      return;
    }

    urlPollTimer = setInterval(onUrlMaybeChanged, URL_POLL_INTERVAL_MS);
  }

  function startMutationObserver() {
    if (mutationObserver || !document.body) {
      return;
    }

    mutationObserver = new MutationObserver(() => {
      if (mutationTimer) {
        clearTimeout(mutationTimer);
      }

      mutationTimer = setTimeout(() => {
        const currentCompany = window.KTPParser ? window.KTPParser.extractCompanyName() : null;
        if (currentCompany && currentCompany !== lastCompanyName) {
          removeOverlay();
          runLookup();
        }
      }, MUTATION_DEBOUNCE_MS);
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  function startSpaHydrationWatch() {
    if (spaHydrationTimer) {
      return;
    }

    spaHydrationPolls = 0;
    lastDocumentTitle = document.title || "";

    spaHydrationTimer = setInterval(() => {
      spaHydrationPolls += 1;

      const currentTitle = document.title || "";
      const titleChanged = currentTitle !== lastDocumentTitle;
      const currentCompany = window.KTPParser ? window.KTPParser.extractCompanyName() : null;

      if (titleChanged) {
        lastDocumentTitle = currentTitle;
      }

      if (currentCompany && currentCompany !== lastCompanyName) {
        removeOverlay();
        runLookup();
      } else if (
        titleChanged &&
        window.KTPParser &&
        window.KTPParser.hasJobPageSignals()
      ) {
        runLookup();
      }

      if (spaHydrationPolls >= SPA_HYDRATION_MAX_POLLS) {
        clearInterval(spaHydrationTimer);
        spaHydrationTimer = null;
      }
    }, SPA_HYDRATION_POLL_MS);
  }

  function start() {
    if (!isExtensionContextValid()) {
      return;
    }

    markActive();
    startUrlPolling();
    startMutationObserver();
    startSpaHydrationWatch();
    runLookup();
  }

  function restart() {
    removeOverlay();
    runLookup();
  }

  window.__KTP_CONTENT__ = {
    isAlive: isExtensionContextValid,
    teardown,
    restart: start,
  };

  if (isExtensionContextValid()) {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (!message || !message.type) {
        return false;
      }

      if (message.type === "GET_PAGE_CONTEXT") {
        const respond = () => {
          const companyName = window.KTPParser ? window.KTPParser.extractCompanyName() : null;
          const jobBoard = window.KTPParser ? window.KTPParser.detectJobBoard() : null;
          sendResponse({
            company_name: companyName,
            job_board: jobBoard,
            is_job_page: window.KTPParser ? window.KTPParser.isLikelyJobPage() : false,
            url: window.location.href,
          });
        };

        if (!message.wait) {
          respond();
          return false;
        }

        (async () => {
          for (let attempt = 0; attempt < COMPANY_RETRY_ATTEMPTS; attempt += 1) {
            const companyName = window.KTPParser ? window.KTPParser.extractCompanyName() : null;
            if (companyName) {
              respond();
              return;
            }
            await new Promise((resolve) => setTimeout(resolve, COMPANY_RETRY_INTERVAL_MS));
          }
          respond();
        })();

        return true;
      }

      return false;
    });
  }

  function initKTPExtension() {
    if (!isExtensionContextValid()) {
      return;
    }

    if (!window.KTPParser || !window.KTPParser.hasJobPageSignals()) {
      return;
    }

    if (!document.body) {
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initKTPExtension, { once: true });
      } else {
        setTimeout(initKTPExtension, 50);
      }
      return;
    }

    start();
  }

  initKTPExtension();
})();
