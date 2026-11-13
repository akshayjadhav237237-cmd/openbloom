// public/js/tour.js
// 4-step onboarding tour for first-time visitors

const STEPS = [
  {
    badge: "Step 1 of 4: Command Bar",
    title: "⚡ Welcome to OpenBloom",
    body: "Navigate markets at lightning speed. Type any ticker (e.g. <code>NVDA</code>), function code (e.g. <code>WEI</code>, <code>MOST</code>, <code>TOP</code>), or combo (<code>AAPL DES</code>) into the top command bar and press Enter.",
  },
  {
    badge: "Step 2 of 4: Multi-Panel Grid",
    title: "🖥️ 4-Panel Trading Layout",
    body: "Your terminal starts in a 4-panel multi-asset configuration. Click any panel to interact, change time horizons, or type commands directly into focused panels.",
  },
  {
    badge: "Step 3 of 4: Documentation & Shortcuts",
    title: "📖 Instant Help & Cheat Sheets",
    body: "Need to explore available tools? Type <code>HELP</code> or click the top-right HELP link for full command references, sector keys, and Bloomberg-compatible workflows.",
  },
  {
    badge: "Step 4 of 4: Gemini AI Analyst",
    title: "🧠 Built-In Market Intelligence",
    body: "Leverage native Gemini AI to analyze SEC filings (<code>CF_AI</code>), auto-explain complex screens (<code>EXPLAIN</code>), chat about stocks (<code>AI</code>), or read the morning brief (<code>BRIEF</code>).",
  },
];

function isTourDismissed() {
  try {
    return localStorage.getItem("openbloom:tour_completed") === "true";
  } catch {
    return false;
  }
}

function markTourDismissed() {
  try {
    localStorage.setItem("openbloom:tour_completed", "true");
  } catch {}
}

export function initTour(force = false) {
  if (typeof document === "undefined") return;
  if (!force && isTourDismissed()) return;

  let currentStep = 0;
  const overlay = document.createElement("div");
  overlay.className = "tour-overlay";

  const renderStep = () => {
    const step = STEPS[currentStep];
    const isLast = currentStep === STEPS.length - 1;

    overlay.innerHTML = `
      <div class="tour-card" role="dialog" aria-modal="true" aria-labelledby="tour-title">
        <div class="tour-step-badge">${step.badge}</div>
        <div class="tour-title" id="tour-title">${step.title}</div>
        <div class="tour-body">${step.body}</div>
        <div class="tour-actions">
          <button class="tour-skip-btn">Skip Tour</button>
          <button class="tour-btn">${isLast ? "Get Started" : "Next →"}</button>
        </div>
      </div>
    `;

    const nextBtn = overlay.querySelector(".tour-btn");
    const skipBtn = overlay.querySelector(".tour-skip-btn");

    nextBtn.onclick = () => {
      if (isLast) {
        markTourDismissed();
        overlay.remove();
      } else {
        currentStep++;
        renderStep();
      }
    };

    skipBtn.onclick = () => {
      markTourDismissed();
      overlay.remove();
    };
  };

  renderStep();
  document.body.appendChild(overlay);
}
