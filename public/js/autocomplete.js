// public/js/autocomplete.js
// Enhanced command bar autocomplete and history navigator

import { FUNCS } from "./fn/index.js";

const HISTORY_KEY = "openbloom:cmd_history";

export function getHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function pushHistory(cmd) {
  if (!cmd || typeof cmd !== "string") return;
  const trimmed = cmd.trim();
  if (!trimmed) return;
  try {
    let hist = getHistory().filter((c) => c !== trimmed);
    hist.unshift(trimmed);
    if (hist.length > 50) hist = hist.slice(0, 50);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(hist));
  } catch {}
}

/**
 * Searches commands with fuzzy scoring on code, name, and group.
 * @param {string} query
 * @returns {Array<{ id: string, name: string, group: string, score: number }>}
 */
export function searchCommands(query) {
  if (!query) return [];
  const q = query.trim().toUpperCase();
  const list = Object.values(FUNCS);

  const scored = [];
  for (const fn of list) {
    let score = 0;
    const id = fn.id.toUpperCase();
    const name = (fn.name || "").toUpperCase();
    const group = (fn.group || "").toUpperCase();

    if (id === q) score += 100;
    else if (id.startsWith(q)) score += 50;
    else if (id.includes(q)) score += 25;

    if (name.includes(q)) score += 15;
    if (group.includes(q)) score += 5;

    if (score > 0) {
      scored.push({ id: fn.id, name: fn.name, group: fn.group, score });
    }
  }

  scored.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  return scored.slice(0, 8);
}

/**
 * Attaches arrow-key history and enhanced fuzzy autocomplete to input.
 * @param {HTMLInputElement} inputEl
 * @param {HTMLElement} suggestEl
 * @param {Function} onSelect
 */
export function attachAutocomplete(inputEl, suggestEl, onSelect) {
  if (!inputEl) return;

  let historyIdx = -1;
  let activeIndex = -1;
  let currentResults = [];

  const closeSuggest = () => {
    if (suggestEl) {
      suggestEl.hidden = true;
      suggestEl.innerHTML = "";
    }
    activeIndex = -1;
    currentResults = [];
  };

  inputEl.addEventListener("keydown", (e) => {
    const history = getHistory();

    // Command History navigation with Up/Down when suggestions are closed
    if (suggestEl.hidden || !currentResults.length) {
      if (e.key === "ArrowUp") {
        if (history.length && historyIdx < history.length - 1) {
          e.preventDefault();
          historyIdx++;
          inputEl.value = history[historyIdx];
        }
        return;
      }
      if (e.key === "ArrowDown") {
        if (historyIdx > 0) {
          e.preventDefault();
          historyIdx--;
          inputEl.value = history[historyIdx];
        } else if (historyIdx === 0) {
          historyIdx = -1;
          inputEl.value = "";
        }
        return;
      }
    }

    // Dropdown list navigation when suggestions are open
    if (!suggestEl.hidden && currentResults.length) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        activeIndex = (activeIndex + 1) % currentResults.length;
        highlightActive();
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        activeIndex = (activeIndex - 1 + currentResults.length) % currentResults.length;
        highlightActive();
        return;
      }
      if (e.key === "Enter" && activeIndex >= 0) {
        e.preventDefault();
        const sel = currentResults[activeIndex];
        if (sel) {
          inputEl.value = sel.id;
          closeSuggest();
          if (typeof onSelect === "function") onSelect(sel.id);
        }
        return;
      }
      if (e.key === "Escape") {
        closeSuggest();
        return;
      }
    }
  });

  const highlightActive = () => {
    if (!suggestEl) return;
    const items = suggestEl.querySelectorAll(".suggest-item");
    items.forEach((item, idx) => {
      if (idx === activeIndex) {
        item.classList.add("active");
        item.style.backgroundColor = "#282828";
      } else {
        item.classList.remove("active");
        item.style.backgroundColor = "";
      }
    });
  };

  inputEl.addEventListener("input", () => {
    historyIdx = -1;
    const val = inputEl.value.trim();
    if (!val || val.includes(" ")) {
      closeSuggest();
      return;
    }

    currentResults = searchCommands(val);
    if (!currentResults.length || !suggestEl) {
      closeSuggest();
      return;
    }

    activeIndex = -1;
    suggestEl.hidden = false;
    suggestEl.innerHTML = currentResults
      .map(
        (r, i) => `
        <div class="suggest-item" data-idx="${i}" style="padding:6px 10px; cursor:pointer; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #222;">
          <span style="font-weight:bold; color:#f59e0b;">${r.id}</span>
          <span style="font-size:11px; color:#888;">${r.name || ""}</span>
          <span style="font-size:10px; color:#555; text-transform:uppercase;">${r.group || ""}</span>
        </div>`
      )
      .join("");

    suggestEl.querySelectorAll(".suggest-item").forEach((el) => {
      el.onclick = () => {
        const idx = parseInt(el.getAttribute("data-idx"), 10);
        const sel = currentResults[idx];
        if (sel) {
          inputEl.value = sel.id;
          closeSuggest();
          if (typeof onSelect === "function") onSelect(sel.id);
        }
      };
    });
  });

  document.addEventListener("click", (e) => {
    if (!inputEl.contains(e.target) && !suggestEl?.contains(e.target)) {
      closeSuggest();
    }
  });
}
