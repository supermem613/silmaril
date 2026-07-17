export const cardsGlobalCss = `:root { color-scheme: dark; }
body {
  margin: 0;
  min-height: 100vh;
  overflow: hidden;
  background: linear-gradient(135deg, #020617 0%, #111827 35%, #0f172a 100%);
  color: #f8fafc;
  font-family: Inter, "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
}
#impress {
  position: relative;
  min-height: 100vh;
  padding: 2.5rem;
  box-sizing: border-box;
  background: radial-gradient(circle at top left, rgba(249, 115, 22, 0.18), transparent 32%),
    radial-gradient(circle at bottom right, rgba(59, 130, 246, 0.2), transparent 26%);
  overflow: hidden;
}
#impress::before {
  content: "";
  position: absolute;
  inset: 0;
  background-image: radial-gradient(rgba(248, 250, 252, 0.22) 1px, transparent 1px);
  background-size: 28px 28px;
  mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.95), rgba(0, 0, 0, 0));
  pointer-events: none;
}
#impress::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(120deg, rgba(255, 255, 255, 0.04), transparent 50%, rgba(255, 255, 255, 0.05));
  pointer-events: none;
}`;

export const cardsSceneryCss = `.step {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 20rem;
  min-height: 14rem;
  padding: 1.5rem;
  box-sizing: border-box;
}
.step-card {
  position: relative;
  width: 100%;
  min-height: 12rem;
  padding: 1.5rem 1.75rem;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 1.75rem;
  background: rgba(15, 23, 42, 0.74);
  box-shadow: 0 24px 48px rgba(2, 6, 23, 0.42);
  backdrop-filter: blur(16px);
}
.step-card::before {
  content: "";
  position: absolute;
  inset: 1px;
  border-radius: inherit;
  border: 1px solid rgba(248, 250, 252, 0.1);
  pointer-events: none;
}
.step.overview {
  min-width: 0;
  min-height: 0;
}
.step.overview .step-card {
  border-style: dashed;
  background: rgba(15, 23, 42, 0.32);
  box-shadow: inset 0 0 0 1px rgba(248, 250, 252, 0.08);
}`;

export const cardsRegionCss = `.region-panel {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  height: 100%;
  justify-content: center;
}
.region-title {
  margin: 0;
  font-size: 1.28rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: #f8fafc;
}
.region-content {
  margin: 0;
  line-height: 1.6;
  color: rgba(248, 250, 252, 0.84);
}`;
