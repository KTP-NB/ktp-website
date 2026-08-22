// background.js

importScripts("utils/cache.js", "utils/telemetry.js");

const BACKEND_URL = "https://tagpabkdkbyjfmexikxn.supabase.co/functions/v1";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhZ3BhYmtka2J5amZtZXhpa3huIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3Mjg0MDQsImV4cCI6MjA5MjMwNDQwNH0.Banod69eA9z0TpVkyCIMOmraZZhQ8ZxmF1916pOMG3s";
const CACHE_CLEANUP_ALARM = "ktp-cache-cleanup";
const CACHE_CLEANUP_PERIOD_MIN = 60;

async function getActiveToken() {
  try {
    const stored = await chrome.storage.session.get("ktp_token");
    if (stored.ktp_token) {
      return stored.ktp_token;
    }
    return await readTokenFromKtpTab();
  } catch {
    return null;
  }
}

self.KTPTelemetry.configure({
  backendUrl: BACKEND_URL,
  getToken: getActiveToken,
  anonKey: SUPABASE_ANON_KEY,
});

function ensureCleanupAlarm() {
  try {
    chrome.alarms.create(CACHE_CLEANUP_ALARM, {
      periodInMinutes: CACHE_CLEANUP_PERIOD_MIN,
    });
  } catch {
    /* alarms unavailable */
  }
}

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.storage.session.clear();
  }
  ensureCleanupAlarm();
  self.KTPTelemetry.replayQueue();
});

chrome.runtime.onStartup.addListener(() => {
  ensureCleanupAlarm();
  self.KTPTelemetry.replayQueue();
});

// Attempt a replay when the service worker first loads, too.
self.KTPTelemetry.replayQueue();

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm && alarm.name === CACHE_CLEANUP_ALARM && self.KTPCache) {
    self.KTPCache.clearExpiredCache();
  }
});

const PERSISTENT_TOKEN_KEY = "ktp_persistent_token";
// Refresh cached tokens 60s before Supabase expiry so callers never receive a token
// about to expire while the extension service worker is idle.
const PERSISTENT_TOKEN_EXPIRY_BUFFER_SEC = 60;

async function getValidPersistentToken() {
  try {
    const stored = await chrome.storage.local.get(PERSISTENT_TOKEN_KEY);
    const cached = stored[PERSISTENT_TOKEN_KEY];
    if (
      !cached ||
      typeof cached.access_token !== "string" ||
      cached.access_token.length === 0 ||
      typeof cached.expires_at !== "number"
    ) {
      return null;
    }

    const nowSec = Date.now() / 1000;
    if (nowSec >= cached.expires_at - PERSISTENT_TOKEN_EXPIRY_BUFFER_SEC) {
      return null;
    }

    return cached.access_token;
  } catch {
    return null;
  }
}

async function savePersistentToken(accessToken, expiresAt) {
  if (
    typeof accessToken !== "string" ||
    accessToken.length === 0 ||
    typeof expiresAt !== "number"
  ) {
    return;
  }

  try {
    await chrome.storage.local.set({
      [PERSISTENT_TOKEN_KEY]: {
        access_token: accessToken,
        expires_at: expiresAt,
      },
    });
  } catch {
    /* storage unavailable */
  }
}

async function readSessionFromKtpTab() {
  let tabs = [];

  try {
    tabs = await chrome.tabs.query({
      url: "https://www.ktpnewbrunswick.org/*",
    });
  } catch {
    return null;
  }

  if (!tabs || tabs.length === 0) {
    return null;
  }

  const tab = tabs[0];

  if (!tab.id) {
    return null;
  }

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        try {
          for (let i = 0; i < localStorage.length; i += 1) {
            const key = localStorage.key(i);
            if (!key || !/^sb-.+-auth-token/.test(key)) {
              continue;
            }

            const raw = localStorage.getItem(key);
            if (!raw) {
              continue;
            }

            const parsed = JSON.parse(raw);
            if (
              parsed &&
              typeof parsed.access_token === "string" &&
              parsed.access_token.length > 0
            ) {
              return {
                access_token: parsed.access_token,
                expires_at: parsed.expires_at,
              };
            }
          }
        } catch {
          return null;
        }

        return null;
      },
    });

    if (!results || results.length === 0) {
      return null;
    }

    const session = results[0].result;
    if (
      session &&
      typeof session.access_token === "string" &&
      session.access_token.length > 0
    ) {
      return session;
    }

    return null;
  } catch {
    return null;
  }
}

async function readTokenFromKtpTab() {
  const session = await readSessionFromKtpTab();
  if (!session) {
    return null;
  }

  await chrome.storage.session.set({ ktp_token: session.access_token });
  return session.access_token;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "SET_SESSION_TOKEN") {
    (async () => {
      try {
        const token = message.payload && message.payload.token ? message.payload.token : null;

        if (token) {
          await chrome.storage.session.set({ ktp_token: token });
          // A token just became available — flush any queued telemetry.
          self.KTPTelemetry.replayQueue();
        } else {
          await chrome.storage.session.remove("ktp_token");
        }

        sendResponse({ success: true });
      } catch {
        sendResponse({ success: false });
      }
    })();
    return true;
  }

  if (message.type === "GET_SESSION_TOKEN") {
    (async () => {
      try {
        // 1. Prefer a locally cached token so the extension works even when no
        //    KTP tab is open. chrome.storage.local survives service worker restarts.
        const cachedToken = await getValidPersistentToken();
        if (cachedToken) {
          sendResponse({ token: cachedToken });
          return;
        }

        // 2. Fall back to the in-memory session cache, then an open KTP tab.
        const stored = await chrome.storage.session.get("ktp_token");
        if (stored.ktp_token) {
          sendResponse({ token: stored.ktp_token });
          return;
        }

        const session = await readSessionFromKtpTab();
        if (session && session.access_token) {
          await chrome.storage.session.set({ ktp_token: session.access_token });

          // 3. Persist the full Supabase session expiry so future requests can
          //    reuse this token without an open KTP tab until it nears expiry.
          if (typeof session.expires_at === "number") {
            await savePersistentToken(session.access_token, session.expires_at);
          }

          sendResponse({ token: session.access_token });
          return;
        }

        // 4. Cached token expired and no KTP tab is available to refresh it.
        sendResponse({ token: null });
      } catch {
        sendResponse({ token: null });
      }
    })();
    return true;
  }

  if (message.type === "CLEAR_PERSISTENT_TOKEN") {
    (async () => {
      try {
        await chrome.storage.local.remove(PERSISTENT_TOKEN_KEY);
        sendResponse({ success: true });
      } catch {
        sendResponse({ success: false });
      }
    })();
    return true;
  }

  if (message.type === "CLEAR_SESSION_TOKEN") {
    (async () => {
      try {
        await chrome.storage.session.remove("ktp_token");
        sendResponse({ success: true });
      } catch {
        sendResponse({ success: false });
      }
    })();
    return true;
  }

  if (message.type === "SEND_TELEMETRY") {
    (async () => {
      try {
        const payload = message.payload || {};
        const delivered = await self.KTPTelemetry.sendTelemetry(
          payload.event_type,
          payload.company_name || null,
          payload.metadata || null
        );
        sendResponse({ success: true, delivered });
      } catch {
        sendResponse({ success: false });
      }
    })();
    return true;
  }

  if (message.type === "LOOKUP_COMPANY") {
    (async () => {
      try {
        const {
          company_name,
          job_board,
          extension_version,
          force_refresh = false,
        } = message.payload;

        if (force_refresh) {
          await self.KTPCache.removeCachedCompany(company_name);
        }

        // Prefer a live token from an open KTP tab so we don't reuse a stale
        // session-cache JWT (common cause of HTTP 401 Invalid session).
        let token = await readTokenFromKtpTab();
        if (!token) {
          const stored = await chrome.storage.session.get("ktp_token");
          token = stored.ktp_token || null;
        }
        if (!token) {
          token = await getValidPersistentToken();
        }

        if (!token) {
          sendResponse({ error: "not_authenticated" });
          return;
        }

        // Always hit the API so unpaid-fines gating cannot be bypassed via cache.
        const cached = await self.KTPCache.getCachedCompany(company_name);
        if (cached) {
          await self.KTPCache.recordCacheEvent("cache_hit");
          self.KTPTelemetry.sendTelemetry("cache_hit", company_name);
        } else {
          await self.KTPCache.recordCacheEvent("cache_miss");
          self.KTPTelemetry.sendTelemetry("cache_miss", company_name);
        }

        const matchBody = JSON.stringify({
          company_raw: company_name,
          job_board: job_board,
          extension_version: extension_version,
        });

        async function postMatch(authToken) {
          return fetch(`${BACKEND_URL}/match`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${authToken}`,
              apikey: SUPABASE_ANON_KEY,
              "Content-Type": "application/json",
            },
            body: matchBody,
          });
        }

        let response = await postMatch(token);

        // Stale JWT: clear caches, re-read from KTP tab, retry once.
        if (response.status === 401) {
          await chrome.storage.session.remove("ktp_token");
          await chrome.storage.local.remove(PERSISTENT_TOKEN_KEY);
          const refreshed = await readTokenFromKtpTab();
          if (refreshed && refreshed !== token) {
            token = refreshed;
            response = await postMatch(token);
          }
        }

        if (!response.ok) {
          let detail = "";
          let errorCode = "";
          let outstanding = null;
          let unpaidCount = null;
          try {
            const errorBody = await response.json();
            detail = errorBody.detail || errorBody.error || "";
            errorCode = errorBody.error || "";
            if (typeof errorBody.outstanding_fines === "number") {
              outstanding = errorBody.outstanding_fines;
            }
            if (typeof errorBody.unpaid_fine_count === "number") {
              unpaidCount = errorBody.unpaid_fine_count;
            }
          } catch {
            try {
              detail = await response.text();
            } catch {
              detail = "";
            }
          }
          sendResponse({
            error: "api_error",
            status: response.status,
            detail,
            error_code: errorCode,
            outstanding_fines: outstanding,
            unpaid_fine_count: unpaidCount,
          });
          return;
        }

        const data = await response.json();

        // Cache successful responses for 24h (fines already cleared server-side).
        await self.KTPCache.setCachedCompany(company_name, data);

        sendResponse({ success: true, data, cached: Boolean(cached) });
      } catch (err) {
        sendResponse({
          error: "network_error",
          detail: err && err.message ? err.message : "",
        });
      }
    })();
    return true;
  }

  if (message.type === "CLEAR_COMPANY_CACHE") {
    (async () => {
      try {
        const removed = await self.KTPCache.clearAllCache();
        sendResponse({ success: true, removed });
      } catch {
        sendResponse({ success: false });
      }
    })();
    return true;
  }

  if (message.type === "GET_CACHE_STATS") {
    (async () => {
      try {
        const stats = await self.KTPCache.getCacheStats();
        sendResponse({ success: true, stats });
      } catch {
        sendResponse({ success: false });
      }
    })();
    return true;
  }

  return false;
});
