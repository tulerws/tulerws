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

function lume() {
  const W = 640, H = 300;
  const clipped = `<g opacity=".95">${ring(448, 150, 142, 70, { light: [174, 198, 149], dark: [56, 82, 66], thin: 2.2, wide: 8.5, low: 34, high: 20, count: 68 })}</g>
  <rect width="${W}" height="${H}" fill="url(#fade)"/>`;
  const top = `${orbImage(448, 148, 176)}
  ${label(36, 52, "FEATURED PROJECT", c.sage)}
  <text x="34" y="122" fill="${c.nightText}" font-size="56" font-weight="500" letter-spacing="-3">Lume</text>
  <text x="36" y="158" fill="${c.nightText}" font-size="16" font-weight="500" letter-spacing="-.3">A quiet command center</text>
  <text x="36" y="180" fill="${c.nightText}" font-size="16" font-weight="500" letter-spacing="-.3">for your AI agents.</text>
  <text x="36" y="236" fill="${c.sage}" font-size="14" font-weight="700">lumeagents.dev ↗</text>
  <text x="36" y="266" fill="#6f8a79" font-size="10.5" font-weight="700" letter-spacing="1.6">OPEN SOURCE · RUST · TAURI · SVELTE</text>`;
  const defs = `${liftFilter(0.45)}<linearGradient id="fade" x1="0" x2="1"><stop offset="0" stop-color="${c.night}" stop-opacity=".92"/><stop offset=".42" stop-color="${c.night}" stop-opacity=".55"/><stop offset=".62" stop-color="${c.night}" stop-opacity="0"/></linearGradient>`;
  save("lume.svg", svg(W, H, "Lume — a quiet command center for your AI agents", { clipped, top }, { fill: c.night, stroke: "#2c4a3c", defs }));
}

function now(live) {
  const W = 320, H = 300;
  const stat = live.commits != null ? `${live.commits}` : "—";
  const body = `
  ${label(30, 52, "NOW", c.muted)}
  <circle cx="288" cy="48" r="4.5" fill="#4d9d76"><animate attributeName="opacity" values="1;.3;1" dur="2.6s" repeatCount="indefinite"/></circle>
  <text x="28" y="108" fill="${c.ink}" font-size="15" font-weight="500" letter-spacing="-.2">Shipping Lume</text>
  <text x="26" y="160" fill="${c.ink}" font-size="50" font-weight="500" letter-spacing="-3">${esc(live.version)}</text>
  <text x="28" y="186" fill="${c.muted}" font-size="13" font-weight="400">${live.date ? `released ${esc(live.date)}` : "latest release"}</text>
  <path d="M30 208h260" stroke="${c.line}"/>
  <text x="28" y="250" fill="${c.ink}" font-size="30" font-weight="500" letter-spacing="-1.4">${stat}</text>
  <text x="30" y="272" fill="${c.muted}" font-size="12.5">commits in the last 30 days</text>`;
  save("now.svg", svg(W, H, `Now: shipping Lume ${live.version}`, body));
}

function relay() {
  const W = 320, H = 150;
  const body = `
  ${label(30, 40, "OPEN SOURCE", c.muted)}
  <text x="28" y="76" fill="${c.ink}" font-size="25" font-weight="500" letter-spacing="-1.2">Lume Relay</text>
  <text x="30" y="100" fill="${c.muted}" font-size="12.5">A blind, end-to-end encrypted relay</text>
  <text x="30" y="117" fill="${c.muted}" font-size="12.5">for Lume Remote.</text>
  <text x="290" y="126" fill="${c.ink}" font-size="11" font-weight="700" text-anchor="end" letter-spacing="1">AGPL-3.0</text>`;
  save("relay.svg", svg(W, H, "Lume Relay — a blind, end-to-end encrypted relay", body, { fill: c.white }));
}

function invicto() {
  const W = 320, H = 150;
  const defs = `<linearGradient id="g1" x1="20" x2="108" y1="16" y2="116" gradientUnits="userSpaceOnUse"><stop stop-color="#143C3F"/><stop offset=".55" stop-color="#07110E"/><stop offset="1" stop-color="#1C1410"/></linearGradient>
    <linearGradient id="g2" x1="39" x2="89" y1="22" y2="106" gradientUnits="userSpaceOnUse"><stop stop-color="#FFE083"/><stop offset=".5" stop-color="#F4B72A"/><stop offset="1" stop-color="#9F6415"/></linearGradient>`;
  const body = `
  <g opacity=".85" transform="translate(30 30) scale(.3125)"><rect width="128" height="128" rx="28" fill="url(#g1)"/>
    <path d="M64 15 105 31v30c0 28.5-16.8 47-41 57-24.2-10-41-28.5-41-57V31Z" fill="#0A1E1C" stroke="url(#g2)" stroke-width="6" stroke-linejoin="round"/>
    <path d="M50 37h28M64 37v57M50 94h28" fill="none" stroke="url(#g2)" stroke-width="10" stroke-linecap="round"/>
    <path d="m64 20 4.7 9.3 10.3 1.5-7.5 7.2 1.8 10.2-9.3-4.9-9.3 4.9 1.8-10.2-7.5-7.2 10.3-1.5Z" fill="url(#g2)" stroke="#07110E" stroke-width="2"/></g>
  <text x="78" y="56" fill="#cfc7b3" font-size="21" font-weight="500" letter-spacing="-.8">Invicto</text>
  <text x="30" y="96" fill="#8b8371" font-size="12.5">Historic football draft you can</text>
  <text x="30" y="113" fill="#8b8371" font-size="12.5">play in the browser.</text>
  <text x="290" y="126" fill="#6c6454" font-size="11" font-weight="700" text-anchor="end" letter-spacing="1">REACT · VITE</text>`;
  save("invicto.svg", svg(W, H, "Invicto — historic football draft", body, { fill: "#14140f", stroke: "#2f2a1f", defs }));
}

function stack() {
  const W = 320, H = 150;
  const rows = [["Backend", "C# · .NET · Java · Python · Rust"], ["Frontend", "Svelte · Angular · React · TypeScript"], ["Mobile", "Flutter · Kotlin"], ["Data", "Postgres · SQL Server · Docker · AWS"]];
  const body = `${label(30, 40, "STACK", c.muted)}
  ${rows.map(([k, v], i) => `<text x="30" y="${68 + i * 20}" fill="${c.ink}" font-size="11.5" font-weight="700">${esc(k)}</text><text x="104" y="${68 + i * 20}" fill="${c.muted}" font-size="11">${esc(v)}</text>`).join("\n  ")}`;
  save("stack.svg", svg(W, H, "Stack", body));
}

header(); lume(); relay(); invicto(); stack();
now(await liveNumbers());
console.log("tiles written to assets/tiles");
