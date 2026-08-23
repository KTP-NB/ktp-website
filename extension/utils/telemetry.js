// utils/telemetry.js
//
// Week 3 Part 3 — extension telemetry client.
//
// Posts usage events to POST /api/telemetry with the user's Supabase JWT.
// Failures are retried with exponential backoff; if they still fail they are
// queued in chrome.storage.local and replayed on extension startup (or when a
// token becomes available). Runs in the MV3 service worker (loaded via
// importScripts), exposing self.KTPTelemetry.

const KTPTelemetry = (() => {
  const QUEUE_KEY = "ktp:telemetry-queue";
  const MAX_QUEUE = 200;
  const MAX_RETRIES = 3;
  const BASE_DELAY_MS = 500;

  let backendUrl = "";
  let anonKey = "";
  let getToken = async () => null;

  function configure(options) {
    if (options && options.backendUrl) {
      backendUrl = options.backendUrl;
    }
    if (options && options.anonKey) {
      anonKey = options.anonKey;
    }
    if (options && typeof options.getToken === "function") {
      getToken = options.getToken;
    }
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function buildEvent(eventType, companyName, metadata) {
    return {
      event_type: eventType,
      company_name: companyName || null,
      metadata: metadata || null,
      timestamp: new Date().toISOString(),
    };
  }

  async function postEvent(event, token) {
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
    if (anonKey) {
      headers.apikey = anonKey;
    }
    const response = await fetch(`${backendUrl}/telemetry`, {
      method: "POST",
      headers,
      body: JSON.stringify(event),
    });
    if (!response.ok) {
      throw new Error(`telemetry HTTP ${response.status}`);
    }
    return true;
  }

  async function sendWithBackoff(event) {
    const token = await getToken();
    if (!token) {
      throw new Error("not_authenticated");
    }

    let lastError = null;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
      try {
        return await postEvent(event, token);
      } catch (err) {
        lastError = err;
        if (attempt < MAX_RETRIES - 1) {
          await delay(BASE_DELAY_MS * Math.pow(2, attempt));
        }
      }
    }
    throw lastError || new Error("telemetry_send_failed");
  }

  async function readQueue() {
    try {
      const stored = await chrome.storage.local.get(QUEUE_KEY);
      return Array.isArray(stored[QUEUE_KEY]) ? stored[QUEUE_KEY] : [];
    } catch {
      return [];
    }
  }

  async function writeQueue(queue) {
    try {
      await chrome.storage.local.set({ [QUEUE_KEY]: queue });
    } catch {
      /* best-effort */
    }
  }

  async function enqueue(event) {
    const queue = await readQueue();
    queue.push(event);
    while (queue.length > MAX_QUEUE) {
      queue.shift(); // bound memory: drop oldest
    }
    await writeQueue(queue);
  }

  // Public: send a telemetry event. Returns true if delivered, false if queued.
  async function sendTelemetry(eventType, companyName = null, metadata = null) {
    if (!eventType) {
      return false;
    }

    const event = buildEvent(eventType, companyName, metadata);
    try {
      await sendWithBackoff(event);
      return true;
    } catch {
      await enqueue(event);
      return false;
    }
  }

  // Public: attempt to flush any queued events (called on startup / re-auth).
  async function replayQueue() {
    const queue = await readQueue();
    if (queue.length === 0) {
      return 0;
    }

    const token = await getToken();
    if (!token) {
      return 0; // no auth yet; keep queue for later
    }

    const remaining = [];
    let sent = 0;
    for (const event of queue) {
      try {
        await postEvent(event, token);
        sent += 1;
      } catch {
        remaining.push(event);
      }
    }

    await writeQueue(remaining);
    return sent;
  }

  return { configure, sendTelemetry, replayQueue };
})();

if (typeof self !== "undefined") {
  self.KTPTelemetry = KTPTelemetry;
}
