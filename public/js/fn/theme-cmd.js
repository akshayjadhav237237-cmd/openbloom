// public/js/fn/theme-cmd.js
// Command module to toggle between classic amber dark terminal and light theme

const THEME_KEY = "openbloom:theme";

export function applyTheme(theme) {
  if (typeof document === "undefined") return;
  if (theme === "light") {
    document.body.classList.add("light-theme");
  } else {
    document.body.classList.remove("light-theme");
  }
}

export function initTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) applyTheme(saved);
  } catch {}
}

export default [
  {
    id: "THEME",
    name: "Terminal Color Theme",
    group: "System",
    needs: false,
    opts: ["LIGHT", "DARK", "TOGGLE"],
    source: "Client Appearance",
    async render(ctx) {
      const mode = (ctx.args[0] || "TOGGLE").toUpperCase();
      let current = document.body.classList.contains("light-theme") ? "light" : "dark";
      let target = current === "light" ? "dark" : "light";

      if (mode === "LIGHT") target = "light";
      if (mode === "DARK") target = "dark";

      applyTheme(target);
      try {
        localStorage.setItem(THEME_KEY, target);
      } catch {}

      ctx.toast(`Theme set to ${target.toUpperCase()}`);

      ctx.el.innerHTML = `
        <div style="padding:16px; font-size:13px; line-height:1.6;">
          <h3 class="amber" style="margin-bottom:8px;">🎨 Terminal Appearance</h3>
          <p>Current active theme: <b>${target.toUpperCase()}</b></p>
          <p class="dim" style="margin-top:6px;">You can switch themes anytime by typing:</p>
          <ul style="margin-left:18px; margin-top:4px;">
            <li><code>THEME LIGHT</code> - Clean daylight mode</li>
            <li><code>THEME DARK</code> - Classic Bloomberg amber terminal</li>
            <li><code>THEME</code> - Toggle between modes</li>
          </ul>
        </div>
      `;
    },
  },
];
