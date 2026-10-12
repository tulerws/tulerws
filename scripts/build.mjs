// Builds every image of the profile README (assets/tiles/*.svg) from one place, so the look stays consistent.
// `node scripts/build.mjs` — set GH_TOKEN to read the live numbers of the "Now" tile (it falls back gracefully).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "assets/tiles");
mkdirSync(out, { recursive: true });
const font = readFileSync(join(root, "assets/fonts/manrope-latin.woff2")).toString("base64");
const orb = readFileSync(join(root, "assets/orb.png")).toString("base64");

const c = { paper: "#e8ebdf", white: "#f4f5ee", ink: "#18231b", muted: "#58624f", line: "#c8cebf", night: "#101d17", nightText: "#e4eadf", nightMuted: "#97a99e", sage: "#aec695" };
const esc = (text) => String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function svg(width, height, title, body, { radius = 22, fill = c.paper, stroke = c.line, defs = "" } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(title)}">
  <title>${esc(title)}</title>
  <defs>
    <style>
      @font-face { font-family: "Manrope"; font-weight: 400 700; src: url(data:font/woff2;base64,${font}) format("woff2"); }
      text { font-family: Manrope, "Segoe UI", Helvetica, Arial, sans-serif; }
    </style>
    <clipPath id="clip"><rect x="5" y="5" width="${width - 10}" height="${height - 10}" rx="${radius}"/></clipPath>
    ${defs}
  </defs>
  <rect x="5" y="5" width="${width - 10}" height="${height - 10}" rx="${radius}" fill="${fill}"/>
  <g clip-path="url(#clip)">${body.clipped ?? ""}</g>
  ${body.top ?? body}
  <rect x="5" y="5" width="${width - 10}" height="${height - 10}" rx="${radius}" fill="none" stroke="${stroke}" stroke-width="1.5"/>
</svg>
`;
}
const label = (x, y, text, color) => `<text x="${x}" y="${y}" fill="${color}" font-size="11" font-weight="700" letter-spacing="2">${esc(text)}</text>`;
const save = (name, content) => writeFileSync(join(out, name), content);

// ── the Lume pixel dinosaur (the one the app and the landing draw) ───────────
const dinoPath = "M4 16h3v-2h3V9h3V6h11v2h3v8h-9v2h4v4h-5v4h-4v-5h-3v5H7v-5H5v-2H3v-4h1z";
const dinoBelly = "M10 15h3v2h5v3h-8z";
const dino = (x, y, s, body = "#3f7a57", belly = "#cfe0b8") => `<g transform="translate(${x} ${y}) scale(${s})" shape-rendering="crispEdges">
    <path d="${dinoPath}" fill="${body}"/><path d="${dinoBelly}" fill="${belly}"/>
    <rect x="21" y="9" width="3" height="3" fill="#f4f5ee"/><rect x="23" y="9" width="1" height="2" fill="${c.ink}"/>
    <rect x="7" y="25" width="5" height="2" fill="${body}"/><rect x="13" y="25" width="5" height="2" fill="${body}"/></g>`;

// ── the ring of plates around the orb ────────────────────────────────────────
function ring(cx, cy, a, b, { light, dark, count = 76, rotate = -13, thin = 2.4, wide = 9.5, low = 40, high = 22 }) {
  const mix = (t) => dark.map((v, i) => Math.round(v + (light[i] - v) * t));
  const plates = [];
  for (let k = 0; k < count; k++) {
    const theta = (2 * Math.PI * k) / count;
    const x = a * Math.cos(theta), y = b * Math.sin(theta);
    const depth = (Math.sin(theta) + 1) / 2;
    const [r, g, bl] = mix(0.5 + 0.5 * Math.cos(theta - 2.3));
    const h = low + high * depth, w = thin + wide * Math.abs(Math.cos(theta));
    plates.push([depth, `<rect x="${(-w / 2).toFixed(1)}" y="${(-h / 2).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="1.4" transform="translate(${x.toFixed(1)} ${y.toFixed(1)})" fill="rgb(${r},${g},${bl})"/>`]);
  }
  plates.sort((p, q) => p[0] - q[0]);
  return `<g transform="translate(${cx} ${cy}) rotate(${rotate})">${plates.map((p) => p[1]).join("")}</g>`;
}
const orbImage = (cx, cy, w) => `<image x="${cx - w / 2}" y="${cy - (w * 88) / 312}" width="${w}" height="${(w * 176) / 312}" xlink:href="data:image/png;base64,${orb}" filter="url(#lift)"/>`;
const liftFilter = (opacity) => `<filter id="lift" x="-30%" y="-40%" width="160%" height="200%"><feDropShadow dx="0" dy="8" stdDeviation="8" flood-color="#000" flood-opacity="${opacity}"/></filter>`;

// ── live numbers for the "Now" tile ──────────────────────────────────────────
async function github(path) {
  const headers = { accept: "application/vnd.github+json", "user-agent": "tulerws-profile" };
  if (process.env.GH_TOKEN) headers.authorization = `Bearer ${process.env.GH_TOKEN}`;
  const response = await fetch(`https://api.github.com${path}`, { headers });
  if (!response.ok) throw new Error(`${path}: ${response.status}`);
  return response.json();
}
async function liveNumbers() {
  const fallback = { version: "0.18", date: "", commits: null };
  try {
    const release = await github("/repos/Lume-agents/Lume/releases/latest");
    const since = new Date(Date.now() - 30 * 86400_000).toISOString();
    let commits = 0;
    for (let page = 1; page <= 5; page++) {
      const batch = await github(`/repos/Lume-agents/Lume/commits?since=${since}&per_page=100&page=${page}`);
      commits += batch.length;
      if (batch.length < 100) break;
    }
    const date = new Date(release.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
    return { version: release.tag_name.replace(/^v/, ""), date, commits };
  } catch (error) {
    console.warn("Live numbers unavailable, using the fallback:", error.message);
    return fallback;
  }
}

// ── tiles ────────────────────────────────────────────────────────────────────
function header() {
  const W = 1000, H = 220;
  const ground = 168;
  const body = `
  <g fill="#c4cdb4"><rect x="640" y="46" width="34" height="5"/><rect x="646" y="41" width="24" height="5"/><rect x="800" y="70" width="28" height="4"/><rect x="805" y="66" width="18" height="4"/></g>
  <rect x="610" y="${ground}" width="352" height="2" fill="#a9b79a"/>
  <g fill="#b6c2a6"><rect x="650" y="${ground + 8}" width="14" height="2"/><rect x="720" y="${ground + 14}" width="22" height="2"/><rect x="860" y="${ground + 9}" width="12" height="2"/><rect x="915" y="${ground + 16}" width="18" height="2"/></g>
  ${dino(744, ground - 4 * 27 + 2, 4)}
  <text x="44" y="108" fill="${c.ink}" font-size="60" font-weight="500" letter-spacing="-3.2">João Pedro</text>
  <text x="46" y="146" fill="${c.ink}" font-size="19" font-weight="500" letter-spacing="-.4">Full-stack developer in Rio de Janeiro.</text>
  <text x="46" y="174" fill="${c.muted}" font-size="15" font-weight="400" letter-spacing="-.1">Web, mobile and tools for working with LLMs. Right now: Lume.</text>`;
  save("header.svg", svg(W, H, "João Pedro — full-stack developer in Rio de Janeiro", body, { radius: 26 }));
}

function lume(live) {
  const W = 1000, H = 210;
  const clipped = `<g opacity=".95">${ring(790, 106, 176, 50, { light: [174, 198, 149], dark: [56, 82, 66], thin: 2.2, wide: 8, low: 24, high: 14, count: 84 })}</g>
  <rect width="${W}" height="${H}" fill="url(#fade)"/>`;
  const facts = [live.version ? `v${live.version}` : null, live.date || null, live.commits != null ? `${live.commits} commits in 30 days` : null].filter(Boolean).join("  ·  ");
  const top = `${orbImage(790, 104, 170)}
  ${label(44, 54, "FEATURED PROJECT", c.sage)}
  <text x="42" y="116" fill="${c.nightText}" font-size="54" font-weight="500" letter-spacing="-3">Lume</text>
  <text x="44" y="148" fill="${c.nightText}" font-size="17" font-weight="500" letter-spacing="-.3">A quiet command center for your AI agents.</text>
  <text x="44" y="178" fill="${c.sage}" font-size="13.5" font-weight="700">lumeagents.dev ↗</text>
  <text x="196" y="178" fill="#7f9a89" font-size="12.5">${esc(facts)}</text>`;
  const defs = `${liftFilter(0.45)}<linearGradient id="fade" x1="0" x2="1"><stop offset="0" stop-color="${c.night}" stop-opacity=".95"/><stop offset=".45" stop-color="${c.night}" stop-opacity=".6"/><stop offset=".62" stop-color="${c.night}" stop-opacity="0"/></linearGradient>`;
  save("lume.svg", svg(W, H, "Lume — a quiet command center for your AI agents", { clipped, top }, { fill: c.night, stroke: "#2c4a3c", defs, radius: 26 }));
}

header();
lume(await liveNumbers());
console.log("tiles written to assets/tiles");
