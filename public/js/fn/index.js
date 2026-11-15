// Every terminal function, by its code. Each file exports a list of { id, name, group, source, needs, render(ctx) }.
// To add a screen: write public/js/fn/<area>.js (and lib/fn/<name>.js if it needs server data), then import it here.
import market from "./market.js";
import security from "./security.js";
import calendar from "./calendar.js";
import meta from "./meta.js";
import apiHelp from "./api.js";
import newsfilings from "./newsfilings.js";
import docsearch from "./docsearch.js";
import rates from "./rates.js";
import options from "./options.js";
import btst from "./btst.js";
import coverage from "./coverage.js";
import workspace from "./workspace.js";
import equity from "./equity.js";
import playbooks from "./playbooks.js";

// AI, workspace, alerts, and UX additions
import ai from "./ai.js";
import filingAi from "./filing-ai.js";
import strategyAi from "./strategy-ai.js";
import brief from "./brief.js";
import workspaceCmds from "./workspace-cmds.js";
import watchlistCmds from "./watchlist-cmds.js";
import alertsCmds from "./alerts-cmds.js";
import themeCmd from "./theme-cmd.js";

export const FUNCS = {};
for (const f of [
  ...market,
  ...security,
  ...calendar,
  ...newsfilings,
  ...docsearch,
  ...rates,
  ...options,
  ...btst,
  ...coverage,
  ...workspace,
  ...equity,
  ...playbooks,
  ...ai,
  ...filingAi,
  ...strategyAi,
  ...brief,
  ...workspaceCmds,
  ...watchlistCmds,
  ...alertsCmds,
  ...themeCmd,
  ...apiHelp,
  ...meta,
]) {
  FUNCS[f.id] = f;
}
