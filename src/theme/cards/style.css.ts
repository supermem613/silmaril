export const cardsGlobalCss = `  :root{
    --ink:#e8eef7; --muted:#9fb0c6; --accent:#5ec8ff; --accent2:#ffcf5e;
    --good:#57e08a; --bad:#ff7a90; --card:rgba(20,28,42,.92); --edge:rgba(126,166,214,.28);
  }
  html,body{height:100%;margin:0}
  body{
    background:#0a0f1a;
    color:var(--ink);
    font-family:"Segoe UI",system-ui,-apple-system,sans-serif;
    /* dot grid so the single-canvas / map feel is unmistakable */
    background-image:radial-gradient(rgba(126,166,214,.13) 1px, transparent 1px);
    background-size:46px 46px;
    -webkit-font-smoothing:antialiased;
  }

  /* Fallback for browsers without transform support */
  .fallback-message{
    max-width:680px;margin:12% auto;padding:24px 28px;border:1px solid var(--edge);
    border-radius:12px;background:var(--card);line-height:1.5;font-size:20px;display:none;
  }
  .impress-not-supported .fallback-message{display:block}

  #impress{ }

  .step{
    width:900px;padding:48px 56px;box-sizing:border-box;
    background:var(--card);border:1px solid var(--edge);border-radius:18px;
    box-shadow:0 24px 80px rgba(0,0,0,.5);
    opacity:.22;transition:opacity .8s ease;
    font-size:24px;line-height:1.45;
  }
  .step.active{opacity:1}

  .eyebrow{font-size:15px;letter-spacing:.22em;text-transform:uppercase;color:var(--accent);margin:0 0 14px}
  h1{font-size:64px;line-height:1.05;margin:0 0 18px;font-weight:800;letter-spacing:-.02em}
  h2{font-size:40px;line-height:1.1;margin:0 0 20px;font-weight:750;letter-spacing:-.01em}
  p{margin:0 0 16px}
  .lede{font-size:28px;color:var(--muted)}
  ul{margin:0;padding-left:1.1em}
  li{margin:0 0 12px}
  strong{color:#fff}
  code{font-family:"Cascadia Code",Consolas,monospace;background:rgba(94,200,255,.12);
    color:var(--accent);padding:2px 7px;border-radius:6px;font-size:.86em}
  .pill{display:inline-block;font-size:14px;letter-spacing:.06em;padding:4px 12px;border-radius:999px;
    border:1px solid var(--edge);color:var(--muted);margin:0 6px 6px 0}
  .good{color:var(--good)} .bad{color:var(--bad)} .warn{color:var(--accent2)}
  .tag{position:absolute;top:-14px;left:28px;font-size:13px;letter-spacing:.14em;text-transform:uppercase;
    background:var(--accent);color:#04121e;padding:4px 12px;border-radius:999px;font-weight:700}

  /* the zoomed-out overview card is huge, so scale its type down visually */
  #overview{border-style:dashed;background:rgba(12,18,30,.72);text-align:center}
  #overview h1{font-size:150px}
  #overview .lede{font-size:52px}

  table{border-collapse:collapse;width:100%;font-size:20px;margin-top:6px}
  th,td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--edge);vertical-align:top}
  th{color:var(--accent);font-weight:700;font-size:15px;letter-spacing:.06em;text-transform:uppercase}

  .hint{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:20;
    font-size:14px;color:var(--muted);background:rgba(10,15,26,.8);border:1px solid var(--edge);
    padding:8px 16px;border-radius:999px}
  .hint kbd{background:rgba(94,200,255,.15);border:1px solid var(--edge);border-radius:5px;
    padding:1px 7px;color:var(--accent);font-family:inherit}`;

export const cardsSceneryCss = ``;

export const cardsRegionCss = ``;
