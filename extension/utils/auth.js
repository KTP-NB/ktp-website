// utils/auth.js

(function () {
  function isExtensionContextValid() {
    try {
      return typeof chrome !== "undefined" && Boolean(chrome.runtime && chrome.runtime.id);
    } catch {
      return false;
    }
  }

  window.KTPAuth = {
    getSessionToken() {
      return new Promise((resolve) => {
        if (!isExtensionContextValid()) {
          resolve(null);
          return;
        }

        try {
          chrome.runtime.sendMessage({ type: "GET_SESSION_TOKEN" }, (response) => {
            if (chrome.runtime.lastError) {
              resolve(null);
              return;
            }
            const token = response && response.token ? response.token : null;
            resolve(token);
          });
        } catch {
          resolve(null);
        }
      });
    },

    async isAuthenticated() {
      try {
        const token = await this.getSessionToken();
        return typeof token === "string" && token.length > 0;
      } catch {
        return false;
      }
    },
  };
})();
