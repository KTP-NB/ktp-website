// utils/parser.js

(function () {
  const COMPANY_SUFFIX_PATTERN =
    /\b(careers|jobs|recruiting|boards|greenhouse|lever|workday|myworkdayjobs|inc|llc|corp|corporation|company|co|ltd|limited)\b/gi;

  const JOB_PATH_PATTERN =
    /\/(jobs?|careers?|positions?|openings?|opportunities|role|vacancy|apply)(\/|$)/i;

  const HOST_PREFIXES = ["jobs", "careers", "apply", "work", "talent", "recruiting", "boards"];

  const JOB_SIGNAL_KEYWORDS = ["job", "career", "position", "hiring", "apply", "opening"];

  const PURE_SEARCH_ENGINE_HOSTS = new Set([
    "duckduckgo.com",
    "search.brave.com",
    "ecosia.org",
    "ask.com",
    "baidu.com",
  ]);

  // Retail / consumer sites — not job postings (careers subdomains/paths still allowed).
  const CONSUMER_COMMERCE_HOSTS = new Set([
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

  function normalizeHost(hostname) {
    return (hostname || "").toLowerCase().replace(/^www\./, "");
  }

  function hasCareersHostOrPath(host, path) {
    const parts = host.split(".");
    if (HOST_PREFIXES.includes(parts[0]) && parts.length >= 3) {
      return true;
    }
    if (parts.length === 2 && parts[1] === "jobs") {
      return true;
    }
    return JOB_PATH_PATTERN.test(path) || /\/careers(?:\/|$)/i.test(path);
  }

  function isGoogleSearchHost(host) {
    return host === "google.com" || /^google\.(com|co\.\w{2,3}|com\.\w{2,3})$/.test(host);
  }

  function isUnsupportedLookupPage() {
    try {
      const host = normalizeHost(window.location.hostname);
      const path = (window.location.pathname || "").toLowerCase();

      if (PURE_SEARCH_ENGINE_HOSTS.has(host)) {
        return true;
      }

      if (isGoogleSearchHost(host) && path.startsWith("/search")) {
        return true;
      }

      if (host === "bing.com" && path.startsWith("/search")) {
        return true;
      }

      if ((host === "yahoo.com" || host === "search.yahoo.com") && path.startsWith("/search")) {
        return true;
      }

      if (CONSUMER_COMMERCE_HOSTS.has(host) && !hasCareersHostOrPath(host, path)) {
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  function cleanCompanyName(value) {
    if (!value || typeof value !== "string") return "";

    return value
      .replace(/\s+/g, " ")
      .replace(/\s*[|•·-]\s*(careers|jobs|job openings|open positions).*$/i, "")
      .replace(/\s+careers$/i, "")
      .trim();
  }

  function finalizeCompanyName(value) {
    if (!value || typeof value !== "string") return null;

    let cleaned = cleanCompanyName(value);
    if (!cleaned) return null;

    cleaned = cleaned.replace(/\.(jobs|careers)$/i, "").trim();
    cleaned = cleaned.replace(/\s+(jobs|careers)$/i, "").trim();
    return cleaned || null;
  }

  function isJobBoardBrandedSiteName(value) {
    if (!value || typeof value !== "string") return false;
    const trimmed = value.trim();
    if (/\.(jobs|careers)$/i.test(trimmed)) return true;
    if (/^(jobs|careers)[.\s]/i.test(trimmed)) return true;
    if (/^[\w-]+\.(jobs|careers)$/i.test(trimmed)) return true;
    return false;
  }

  function textFromSelector(selector, root) {
    try {
      const scope = root || document;
      const el = scope.querySelector(selector);
      return el && el.textContent ? cleanCompanyName(el.textContent) : "";
    } catch {
      return "";
    }
  }

  function attributeFromSelector(selector, attr, root) {
    try {
      const scope = root || document;
      const el = scope.querySelector(selector);
      return el && el.getAttribute(attr) ? cleanCompanyName(el.getAttribute(attr)) : "";
    } catch {
      return "";
    }
  }

  function firstNonEmpty(values) {
    for (let i = 0; i < values.length; i += 1) {
      const value = cleanCompanyName(values[i]);
      if (value) return value;
    }
    return "";
  }

  function flattenJsonLd(node, bucket) {
    if (!node || typeof node !== "object") return;

    if (Array.isArray(node)) {
      node.forEach((item) => flattenJsonLd(item, bucket));
      return;
    }

    bucket.push(node);

    if (Array.isArray(node["@graph"])) {
      flattenJsonLd(node["@graph"], bucket);
    }
  }

  function isJobPostingType(typeValue) {
    if (!typeValue) return false;
    const types = Array.isArray(typeValue) ? typeValue : [typeValue];
    return types.some((type) => String(type).toLowerCase().includes("jobposting"));
  }

  function extractFromJsonLd(root) {
    try {
      const scope = root || document;
      const scripts = scope.querySelectorAll('script[type="application/ld+json"]');
      for (let i = 0; i < scripts.length; i += 1) {
        try {
          const data = JSON.parse(scripts[i].textContent || "");
          const items = [];
          flattenJsonLd(data, items);

          for (let j = 0; j < items.length; j += 1) {
            const item = items[j];
            if (!isJobPostingType(item["@type"])) {
              const org = item.hiringOrganization;
              if (org && org.name) {
                const name = finalizeCompanyName(String(org.name));
                if (name) return name;
              }
              continue;
            }

            const org = item.hiringOrganization;
            if (org && org.name) {
              const name = cleanCompanyName(String(org.name));
              if (name) return name;
            }
          }
        } catch {
          /* try next script */
        }
      }
    } catch {
      /* ignore */
    }

    return "";
  }

  function linkedInJobRoot() {
    const roots = [
      document.querySelector(".jobs-search__job-details--container"),
      document.querySelector(".jobs-details"),
      document.querySelector(".job-view-layout"),
      document.querySelector("main"),
      document,
    ];

    for (let i = 0; i < roots.length; i += 1) {
      if (roots[i]) return roots[i];
    }

    return document;
  }

  window.KTPParser = {
    isUnsupportedLookupPage,

    detectKnownJobBoard() {
      try {
        const hostname = window.location.hostname.toLowerCase();
        const pathname = window.location.pathname;

        if (hostname === "localhost" || hostname === "127.0.0.1") {
          if (pathname.indexOf("/test/greenhouse") === 0) return "greenhouse";
          if (pathname.indexOf("/test/lever") === 0) return "lever";
          if (pathname.indexOf("/test/workday") === 0) return "workday";
        }

        if (hostname.includes("linkedin.com")) return "linkedin";
        if (hostname.includes("greenhouse.io")) return "greenhouse";
        if (hostname.includes("lever.co")) return "lever";
        if (hostname.includes("myworkdayjobs.com")) return "workday";
        if (hostname.includes("ashbyhq.com")) return "ashby";
        if (hostname.includes("icims.com")) return "icims";
        if (hostname.includes("smartrecruiters.com")) return "smartrecruiters";
        if (hostname.includes("jobvite.com")) return "jobvite";
        if (hostname.includes("taleo.net")) return "taleo";
        if (hostname.includes("ultipro.com") || hostname.includes("ukg.net")) return "ukg";

        return null;
      } catch {
        return null;
      }
    },

    detectJobBoard() {
      try {
        const known = this.detectKnownJobBoard();
        if (
          known === "linkedin" ||
          known === "greenhouse" ||
          known === "lever" ||
          known === "workday"
        ) {
          return known;
        }
        return null;
      } catch {
        return null;
      }
    },

    hasJobSignalKeywords() {
      try {
        const title = (document.title || "").toLowerCase();
        for (let i = 0; i < JOB_SIGNAL_KEYWORDS.length; i += 1) {
          if (title.includes(JOB_SIGNAL_KEYWORDS[i])) return true;
        }

        const body = document.body;
        if (body && body.innerText) {
          const text = body.innerText.slice(0, 8000).toLowerCase();
          for (let j = 0; j < JOB_SIGNAL_KEYWORDS.length; j += 1) {
            if (text.includes(JOB_SIGNAL_KEYWORDS[j])) return true;
          }
        }
      } catch {
        /* ignore */
      }
      return false;
    },

    hasJobPageSignals() {
      return this.isLikelyJobPage();
    },

    isLinkedInJobPage() {
      try {
        const pathname = window.location.pathname.toLowerCase();
        const params = new URLSearchParams(window.location.search);

        if (/\/jobs\/view\//.test(pathname)) return true;
        if (params.get("currentJobId")) return true;
        return false;
      } catch {
        return false;
      }
    },

    isLikelyJobPage() {
      try {
        if (isUnsupportedLookupPage()) return false;

        const host = normalizeHost(window.location.hostname);
        const path = (window.location.pathname || "").toLowerCase();
        if (hasCareersHostOrPath(host, path)) return true;

        const board = this.detectKnownJobBoard();
        if (board) {
          if (board === "linkedin") return this.isLinkedInJobPage();
          return true;
        }

        if (JOB_PATH_PATTERN.test(path)) return true;
        if (this.extractJobPostingCompanyFromJsonLd()) return true;

        const title = (document.title || "").toLowerCase();
        if (
          /(engineer|developer|designer|analyst|manager|intern|scientist)/i.test(title) &&
          /(career|job|hiring|opening|position)/i.test(title)
        ) {
          return true;
        }

        return false;
      } catch {
        return false;
      }
    },

    slugToTitleCase(slug) {
      if (!slug || typeof slug !== "string") return "";
      return slug
        .replace(COMPANY_SUFFIX_PATTERN, " ")
        .replace(/[-_+.]+/g, " ")
        .split(" ")
        .filter((word) => word.length > 0)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
    },

    extractCompanyNameFromPageTitle() {
      const title = cleanCompanyName(document.title || "");
      if (!title) return "";

      const atMatch = title.match(/\bat\s+(.+)$/i);
      if (atMatch && atMatch[1]) {
        const company = cleanCompanyName(atMatch[1]);
        if (company && !/^(careers|jobs|linkedin|hiring)$/i.test(company)) {
          return company;
        }
      }

      const separators = [" - ", " | ", " · ", " • ", " — "];
      for (let i = 0; i < separators.length; i += 1) {
        const separator = separators[i];
        if (!title.includes(separator)) continue;

        const parts = title.split(separator).map((part) => cleanCompanyName(part));
        for (let j = parts.length - 1; j >= 0; j -= 1) {
          const candidate = parts[j];
          if (
            candidate &&
            !/^(careers|jobs|linkedin|hiring|job application|apply)$/i.test(candidate) &&
            !/(engineer|developer|designer|analyst|manager|intern)/i.test(candidate)
          ) {
            return candidate;
          }
        }
      }

      return "";
    },

    extractCompanyFromHostname() {
      try {
        if (isUnsupportedLookupPage()) return null;

        const host = window.location.hostname.toLowerCase().replace(/^www\./, "");
        const parts = host.split(".");
        if (parts.length < 2) return null;

        if (HOST_PREFIXES.includes(parts[0]) && parts.length >= 3) {
          return finalizeCompanyName(this.slugToTitleCase(parts[1]));
        }

        if (parts.length === 2 && parts[1] === "jobs") {
          return finalizeCompanyName(this.slugToTitleCase(parts[0]));
        }

        if (parts.length === 2) {
          return finalizeCompanyName(this.slugToTitleCase(parts[0]));
        }

        return null;
      } catch {
        return null;
      }
    },

    extractCompanyFromLinkedIn(root) {
      const scope = root || linkedInJobRoot();

      const linkedinSelectors = [
        ".job-details-jobs-unified-top-card__company-name a",
        ".jobs-unified-top-card__company-name a",
        ".jobs-unified-top-card__subtitle-primary-grouping a",
        ".topcard__org-name-link",
        "a[data-tracking-control-name='public_jobs_topcard-org-name']",
        ".job-details-jobs-unified-top-card__company-name",
        ".jobs-unified-top-card__company-name",
        "[data-test-text='company-name']",
        ".jobs-details-top-card__company-url",
        ".job-details-jobs-unified-top-card__primary-description-container a",
        ".jobs-details__main-content .artdeco-entity-lockup__subtitle span",
        ".jobs-details__main-content .artdeco-entity-lockup__subtitle a",
        '[class*="job-details"] [class*="company-name"] a',
        '[class*="job-details"] [class*="company-name"]',
        'a[href*="/company/"][data-test-app-aware-link]',
        '.jobs-search__job-details--container a[href*="/company/"]',
        'div[data-view-name="job-company-name"] a',
        'div[data-view-name="job-company-name"]',
      ];

      for (let i = 0; i < linkedinSelectors.length; i += 1) {
        const value = textFromSelector(linkedinSelectors[i], scope);
        if (value) return value;
      }

      try {
        const companyLinks = scope.querySelectorAll('a[href*="/company/"]');
        for (let i = 0; i < companyLinks.length; i += 1) {
          const value = cleanCompanyName(companyLinks[i].textContent || "");
          if (value && value.length > 1 && !/^\d+$/.test(value)) return value;
        }
      } catch {
        /* fall through */
      }

      const jsonLdCompany = extractFromJsonLd(scope);
      if (jsonLdCompany) return jsonLdCompany;

      try {
        const meta = document.querySelector('meta[property="og:title"]');
        if (meta && meta.getAttribute("content")) {
          const content = meta.getAttribute("content") || "";
          const atParts = content.split(" at ");
          if (atParts.length > 1) {
            const company = cleanCompanyName(atParts[atParts.length - 1]);
            if (company) return company;
          }
        }
      } catch {
        /* fall through */
      }

      const titleCompany = this.extractCompanyNameFromPageTitle();
      if (titleCompany) return titleCompany;

      return "";
    },

    extractJobPostingCompanyFromJsonLd() {
      try {
        const scripts = document.querySelectorAll('script[type="application/ld+json"]');
        for (let i = 0; i < scripts.length; i += 1) {
          try {
            const data = JSON.parse(scripts[i].textContent || "");
            const items = [];
            flattenJsonLd(data, items);

            for (let j = 0; j < items.length; j += 1) {
              const item = items[j];
              if (!isJobPostingType(item["@type"])) continue;

              const org = item.hiringOrganization;
              if (org && org.name) {
                const name = finalizeCompanyName(String(org.name));
                if (name) return name;
              }
            }
          } catch {
            /* try next script */
          }
        }
      } catch {
        /* ignore */
      }

      return null;
    },

    trimTitleCompany(value) {
      if (!value || typeof value !== "string") return "";
      return cleanCompanyName(value)
        .replace(/\s*[-|]\s*(careers|jobs)\s*$/i, "")
        .trim();
    },

    extractCompanyGeneric() {
      let careersContext = false;

      try {
        if (isUnsupportedLookupPage()) return null;

        const host = normalizeHost(window.location.hostname);
        const path = (window.location.pathname || "").toLowerCase();
        careersContext = hasCareersHostOrPath(host, path);

        const fromJsonLd = this.extractJobPostingCompanyFromJsonLd();
        if (fromJsonLd) return finalizeCompanyName(fromJsonLd);
      } catch {
        /* never throw */
      }

      try {
        const pathname = window.location.pathname || "";
        if (JOB_PATH_PATTERN.test(pathname)) {
          const fromHost = this.extractCompanyFromHostname();
          if (fromHost) return fromHost;
        }
      } catch {
        /* ignore */
      }

      if (!careersContext) {
        return null;
      }

      try {
        const meta = document.querySelector('meta[property="og:site_name"]');
        if (meta) {
          const content = cleanCompanyName(meta.getAttribute("content") || "");
          if (content && !isJobBoardBrandedSiteName(content)) {
            return finalizeCompanyName(content);
          }
        }
      } catch {
        /* ignore */
      }

      try {
        if (!this.hasJobSignalKeywords()) return null;

        const title = document.title || "";
        if (!title) return null;

        const atParts = title.split(/\s+at\s+/i);
        if (atParts.length > 1) {
          const company = this.trimTitleCompany(atParts[atParts.length - 1]);
          if (company) return finalizeCompanyName(company);
        }

        const separators = [" - ", " | "];
        for (let i = 0; i < separators.length; i += 1) {
          const separator = separators[i];
          if (!title.includes(separator)) continue;

          const parts = title.split(separator);
          const lastSegment = parts[parts.length - 1];
          if (!lastSegment || lastSegment.trim().length > 40) continue;

          const company = this.trimTitleCompany(lastSegment);
          if (company && !isJobBoardBrandedSiteName(company)) {
            return finalizeCompanyName(company);
          }
        }
      } catch {
        /* ignore */
      }

      try {
        const fromHost = this.extractCompanyFromHostname();
        if (fromHost) return fromHost;
      } catch {
        /* ignore */
      }

      return null;
    },

    extractCompanyName() {
      try {
        if (isUnsupportedLookupPage()) return null;

        const board = this.detectJobBoard();

        if (board === "linkedin") {
          const company = this.extractCompanyFromLinkedIn();
          return company || null;
        }

        if (board === "greenhouse") {
          const greenhouseSelectors = [
            ".company-name",
            ".app-title",
            "#header .company",
            "[data-testid='company-name']",
            "meta[property='og:site_name']",
          ];

          for (let i = 0; i < greenhouseSelectors.length; i += 1) {
            const selector = greenhouseSelectors[i];
            const value = selector.indexOf("meta") === 0
              ? attributeFromSelector(selector, "content")
              : textFromSelector(selector);
            if (value) return value;
          }

          const pathMatch = window.location.pathname.match(/^\/([^/]+)\/jobs(?:\/|$)/i);
          if (pathMatch && pathMatch[1]) {
            const formatted = this.slugToTitleCase(pathMatch[1]);
            if (formatted) return formatted;
          }

          const subdomain = window.location.hostname.split(".")[0];
          const formatted = this.slugToTitleCase(subdomain);
          if (formatted) return formatted;
        }

        if (board === "lever") {
          const img = document.querySelector(".main-header-logo img");
          if (img && img.getAttribute("alt")) {
            const alt = cleanCompanyName(img.getAttribute("alt"));
            if (alt) return alt;
          }

          const pathMatch = window.location.pathname.match(/^\/([^/]+)\//);
          if (pathMatch && pathMatch[1]) {
            const formatted = this.slugToTitleCase(pathMatch[1]);
            if (formatted) return formatted;
          }
        }

        if (board === "workday") {
          const workdaySelectors = [
            "[data-automation-id='companyLogo'] img",
            "[data-automation-id='jobPostingHeader'] [data-automation-id='companyName']",
            "[data-automation-id='jobPostingHeader'] a[href*='/company/']",
            "[data-automation-id='jobPostingHeader'] .css-1q2dra3",
            "[data-automation-id='company']",
            ".css-1q2dra3",
          ];

          for (let i = 0; i < workdaySelectors.length; i += 1) {
            const selector = workdaySelectors[i];
            const value = selector.indexOf("img") >= 0
              ? firstNonEmpty([
                  attributeFromSelector(selector, "alt"),
                  attributeFromSelector(selector, "aria-label"),
                  attributeFromSelector(selector, "title"),
                ])
              : textFromSelector(selector);
            if (value) return value;
          }

          const hostParts = window.location.hostname.toLowerCase().split(".");
          const workdayIndex = hostParts.findIndex((part) => part === "myworkdayjobs");
          if (workdayIndex > 0) {
            const formatted = this.slugToTitleCase(hostParts[workdayIndex - 1]);
            if (formatted) return formatted;
          }
        }

        return this.extractCompanyGeneric();
      } catch {
        return null;
      }
    },
  };
})();
