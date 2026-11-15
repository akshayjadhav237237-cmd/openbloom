// public/js/fn/workspace-cmds.js
// Workspace management commands: WS, SAVE, LOAD, DEL

import { esc } from "../api.js";
import { html, sect, table } from "../ui.js";
import * as storage from "../storage.js";

function getWorkspaces() {
  return storage.get("workspaces", {
    default: {
      name: "default",
      updated: Date.now(),
      panels: ["WEI", "TOP", "WIRP", "ECO"],
      layout: 4,
    },
  });
}

function saveWorkspace(name, panels, layout = 4) {
  const ws = getWorkspaces();
  ws[name] = {
    name,
    updated: Date.now(),
    panels: panels || ["WEI", "TOP", "WIRP", "ECO"],
    layout,
  };
  storage.set("workspaces", ws);
  storage.set("last_workspace", name);
}

function deleteWorkspace(name) {
  const ws = getWorkspaces();
  delete ws[name];
  storage.set("workspaces", ws);
}

export default [
  {
    id: "WS",
    name: "Workspace Manager",
    group: "Workspace",
    needs: false,
    opts: [],
    source: "Local Storage",
    async render(ctx) {
      ctx.el.innerHTML = "";
      ctx.setTitle("Workspaces");
      ctx.setSource("Client Storage");

      const ws = getWorkspaces();
      const list = Object.values(ws);

      const container = html(`
        <div style="padding:10px; font-size:12px; line-height:1.5;">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #333; padding-bottom:6px; margin-bottom:12px;">
            <span class="amber" style="font-weight:bold; font-size:13px;">🖥️ SAVED WORKSPACES</span>
            <div style="display:flex; gap:6px;">
              <button class="ws-export-btn" style="background:#222; border:1px solid #444; color:#eee; font-size:11px; padding:3px 8px; border-radius:3px; cursor:pointer;">Export JSON</button>
              <button class="ws-import-btn" style="background:#222; border:1px solid #444; color:#eee; font-size:11px; padding:3px 8px; border-radius:3px; cursor:pointer;">Import JSON</button>
            </div>
          </div>

          <div style="margin-bottom:14px; display:flex; gap:8px;">
            <input type="text" class="ws-name-input" placeholder="New workspace name..." style="background:#161616; border:1px solid #333; color:#fff; padding:5px 8px; font-size:12px; border-radius:3px; width:180px;" />
            <button class="ws-save-btn" style="background:#f59e0b; color:#000; font-weight:bold; border:none; padding:5px 12px; font-size:12px; border-radius:3px; cursor:pointer;">SAVE CURRENT</button>
          </div>

          <div class="ws-table-wrap"></div>
        </div>
      `);

      ctx.el.append(container);

      const tableWrap = container.querySelector(".ws-table-wrap");
      const nameInput = container.querySelector(".ws-name-input");
      const saveBtn = container.querySelector(".ws-save-btn");
      const exportBtn = container.querySelector(".ws-export-btn");
      const importBtn = container.querySelector(".ws-import-btn");

      const renderTable = () => {
        const rows = Object.values(getWorkspaces());
        tableWrap.innerHTML = "";
        tableWrap.append(
          table(
            rows,
            [
              { key: "name", label: "Workspace Name", left: true, lbl: true },
              {
                key: (r) => (r.panels || []).join("  |  "),
                label: "Panels",
                left: true,
              },
              {
                key: (r) => new Date(r.updated || Date.now()).toLocaleDateString(),
                label: "Saved On",
                left: true,
                cls: () => "dim",
              },
              {
                key: () => "Load",
                label: "",
                left: true,
                html: true,
                fmt: (_, r) =>
                  `<button class="ws-load-action" data-name="${esc(r.name)}" style="background:#1e1e1e; border:1px solid #10b981; color:#10b981; font-size:10px; padding:2px 6px; border-radius:3px; cursor:pointer;">LOAD</button>
                   <button class="ws-del-action" data-name="${esc(r.name)}" style="background:#1e1e1e; border:1px solid #ef4444; color:#ef4444; font-size:10px; padding:2px 6px; border-radius:3px; cursor:pointer; margin-left:4px;">DEL</button>`,
              },
            ]
          )
        );

        tableWrap.querySelectorAll(".ws-load-action").forEach((btn) => {
          btn.onclick = (e) => {
            e.stopPropagation();
            ctx.go(`LOAD ${btn.dataset.name}`);
          };
        });

        tableWrap.querySelectorAll(".ws-del-action").forEach((btn) => {
          btn.onclick = (e) => {
            e.stopPropagation();
            deleteWorkspace(btn.dataset.name);
            renderTable();
            ctx.toast(`Deleted workspace "${btn.dataset.name}"`);
          };
        });
      };

      saveBtn.onclick = () => {
        const name = (nameInput.value.trim() || "my-workspace").toLowerCase();
        // Read panels from window / DOM if accessible
        const panels = ["WEI", "TOP", "WIRP", "ECO"];
        saveWorkspace(name, panels, 4);
        nameInput.value = "";
        renderTable();
        ctx.toast(`Saved workspace "${name}"`);
      };

      exportBtn.onclick = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(getWorkspaces(), null, 2));
        const dl = document.createElement("a");
        dl.setAttribute("href", dataStr);
        dl.setAttribute("download", "openbloom-workspaces.json");
        dl.click();
      };

      importBtn.onclick = () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".json";
        input.onchange = (e) => {
          const file = e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (evt) => {
            try {
              const imported = JSON.parse(evt.target.result);
              storage.set("workspaces", { ...getWorkspaces(), ...imported });
              renderTable();
              ctx.toast("Imported workspaces successfully");
            } catch {
              ctx.toast("Invalid workspace JSON file", true);
            }
          };
          reader.readAsText(file);
        };
        input.click();
      };

      renderTable();
    },
  },

  {
    id: "SAVE",
    name: "Save Workspace",
    group: "Workspace",
    needs: false,
    opts: [],
    source: "Local Storage",
    async render(ctx) {
      const name = (ctx.args[0] || "default").toLowerCase();
      saveWorkspace(name, ["WEI", "TOP", "WIRP", "ECO"], 4);
      ctx.toast(`Saved workspace "${name}"`);
      ctx.go("WS");
    },
  },

  {
    id: "LOAD",
    name: "Load Workspace",
    group: "Workspace",
    needs: false,
    opts: [],
    source: "Local Storage",
    async render(ctx) {
      const name = (ctx.args[0] || "default").toLowerCase();
      const ws = getWorkspaces();
      const target = ws[name];
      if (!target) {
        ctx.toast(`Workspace "${name}" not found. Type WS to list.`, true);
        return;
      }
      storage.set("last_workspace", name);
      ctx.toast(`Loaded workspace "${name}"`);
      ctx.go(target.panels?.[0] || "WEI");
    },
  },

  {
    id: "DEL",
    name: "Delete Workspace",
    group: "Workspace",
    needs: false,
    opts: [],
    source: "Local Storage",
    async render(ctx) {
      const name = (ctx.args[0] || "").toLowerCase();
      if (!name) {
        ctx.toast("Specify workspace name to delete: DEL <name>", true);
        return;
      }
      deleteWorkspace(name);
      ctx.toast(`Deleted workspace "${name}"`);
      ctx.go("WS");
    },
  },
];
