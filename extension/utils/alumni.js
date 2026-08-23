// utils/alumni.js — shared alumni display helpers for popup + content overlay.

(function () {
  const RUTGERS_CHAPTER = "New Brunswick (Rutgers)";

  function isRutgersChapter(chapter) {
    if (!chapter) return false;
    if (chapter === RUTGERS_CHAPTER) return true;
    return String(chapter).toLowerCase().includes("rutgers");
  }

  function formatGradYear(year) {
    if (!year && year !== 0) return "";
    return `'${String(year).slice(-2)}`;
  }

  function formatAlumniMeta(person) {
    const gradYear = formatGradYear(person && person.graduation_year);
    const college = person && person.chapter ? String(person.chapter).trim() : "";
    if (gradYear && college) return `${gradYear} · ${college}`;
    return gradYear || college;
  }

  function sortAlumniForDisplay(alumni) {
    if (!Array.isArray(alumni)) return [];

    return [...alumni].sort((left, right) => {
      const leftRutgers = isRutgersChapter(left.chapter);
      const rightRutgers = isRutgersChapter(right.chapter);
      if (leftRutgers !== rightRutgers) {
        return leftRutgers ? -1 : 1;
      }

      const leftYear = left.graduation_year || 0;
      const rightYear = right.graduation_year || 0;
      return rightYear - leftYear;
    });
  }

  // Name as a LinkedIn link when linkedin_url is present; plain text otherwise.
  function renderAlumniNameHtml(person, className, escapeHtml, companyAttr) {
    const name = escapeHtml((person && person.full_name) || "");
    if (!person || !person.linkedin_url) {
      return `<div class="${className}">${name}</div>`;
    }

    const url = escapeHtml(person.linkedin_url);
    const company = companyAttr || "";
    return `<a class="${className} ${className}-link" href="${url}" target="_blank" rel="noopener noreferrer" data-ktp-contact="linkedin" data-ktp-company="${company}">${name}</a>`;
  }

  const KTPAlumni = {
    RUTGERS_CHAPTER,
    isRutgersChapter,
    formatGradYear,
    formatAlumniMeta,
    sortAlumniForDisplay,
    renderAlumniNameHtml,
  };

  if (typeof self !== "undefined") {
    self.KTPAlumni = KTPAlumni;
  }
  if (typeof window !== "undefined") {
    window.KTPAlumni = KTPAlumni;
  }
})();
