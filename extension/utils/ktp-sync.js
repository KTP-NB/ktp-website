// utils/ktp-sync.js — runs on ktpnewbrunswick.org to sync Supabase session to the extension

(function () {
  function isExtensionContextValid() {
    try {
      return typeof chrome !== "undefined" && Boolean(chrome.runtime && chrome.runtime.id);
    } catch {
      return false;
    }
  }

  function extractTokenFromStorage() {
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
        if (parsed && typeof parsed.access_token === "string" && parsed.access_token.length > 0) {
          return parsed.access_token;
        }
      }
    } catch {
      return null;
    }

    return null;
  }

  function syncTokenToExtension() {
    if (!isExtensionContextValid()) {
      return;
    }

    const token = extractTokenFromStorage();

    try {
      chrome.runtime.sendMessage(
        { type: "SET_SESSION_TOKEN", payload: { token: token || null } },
        () => {
          if (chrome.runtime.lastError) {
            return;
          }
        }
      );
    } catch {
      /* extension context invalidated */
    }
  }

  syncTokenToExtension();

  window.addEventListener("storage", (event) => {
    if (event.key && event.key.includes("auth-token")) {
      syncTokenToExtension();
    }
  });
})();
