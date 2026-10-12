// The project rows of the README, drawn on the same grid as the stack (label column, hairlines),
// so the page reads as one piece. One SVG per row so each can be its own link.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const font = readFileSync(join(root, "assets/fonts/manrope-latin.woff2")).toString("base64");
const orb = readFileSync(join(root, "assets/orb.png")).toString("base64");
const W = 1000, contentX = 230;

const theme = (dark) => ({ ink: dark ? "#e4eadf" : "#18231b", muted: dark ? "#8fa397" : "#58624f", line: dark ? "#2a3a31" : "#d4d9c8", accent: dark ? "#aec695" : "#3f7a57" });

function row({ name, title, detail, action, height, mark }, dark) {
  const t = theme(dark);
  const mid = height / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${height}" viewBox="0 0 ${W} ${height}" role="img" aria-label="${name}: ${title}">
  <title>${name}: ${title}</title>
  <defs><style>
    @font-face { font-family: "Manrope"; font-weight: 400 700; src: url(data:font/woff2;base64,${font}) format("woff2"); }
    text { font-family: Manrope, "Segoe UI", Helvetica, Arial, sans-serif; }
  </style>
  <linearGradient id="g1" x1="20" x2="108" y1="16" y2="116" gradientUnits="userSpaceOnUse"><stop stop-color="#143C3F"/><stop offset=".55" stop-color="#07110E"/><stop offset="1" stop-color="#1C1410"/></linearGradient>
  <linearGradient id="g2" x1="39" x2="89" y1="22" y2="106" gradientUnits="userSpaceOnUse"><stop stop-color="#FFE083"/><stop offset=".5" stop-color="#F4B72A"/><stop offset="1" stop-color="#9F6415"/></linearGradient></defs>
  <path d="M0 ${height - 1}h${W}" stroke="${t.line}"/>
  <text x="2" y="${mid + 4}" fill="${t.muted}" font-size="11" font-weight="700" letter-spacing="2">${name.toUpperCase()}</text>
  ${mark}
  <text x="${contentX + 126}" y="${mid - 2}" fill="${t.ink}" font-size="19" font-weight="500" letter-spacing="-.4">${title}</text>
  <text x="${contentX + 126}" y="${mid + 20}" fill="${t.muted}" font-size="13">${detail}</text>
  <text x="${W - 2}" y="${mid + 4}" fill="${t.accent}" font-size="13" font-weight="700" text-anchor="end">${action}</text>
</svg>
`;
}

const lumeMark = `<image x="${contentX - 8}" y="14" width="124" height="70" xlink:href="data:image/png;base64,${orb}"/>`;
const invictoMark = `<g transform="translate(${contentX + 20} 17)"><g opacity=".9" transform="scale(.3125)"><rect width="128" height="128" rx="28" fill="url(#g1)"/>
    <path d="M64 15 105 31v30c0 28.5-16.8 47-41 57-24.2-10-41-28.5-41-57V31Z" fill="#0A1E1C" stroke="url(#g2)" stroke-width="6" stroke-linejoin="round"/>
    <path d="M50 37h28M64 37v57M50 94h28" fill="none" stroke="url(#g2)" stroke-width="10" stroke-linecap="round"/>
    <path d="m64 20 4.7 9.3 10.3 1.5-7.5 7.2 1.8 10.2-9.3-4.9-9.3 4.9 1.8-10.2-7.5-7.2 10.3-1.5Z" fill="url(#g2)" stroke="#07110E" stroke-width="2"/></g></g>`;

const rows = {
  lume: { name: "Lume", title: "A quiet command center for your AI agents.", detail: "Open source · Rust, Tauri, Svelte · Lume Remote and its encrypted Relay", action: "lumeagents.dev ↗", height: 98, mark: lumeMark },
  invicto: { name: "Invicto", title: "A historic football draft you can play in the browser.", detail: "React · TypeScript · Vite", action: "Play ↗", height: 78, mark: invictoMark },
};
for (const [key, spec] of Object.entries(rows)) {
  writeFileSync(join(root, `assets/project-${key}-light.svg`), row(spec, false));
  writeFileSync(join(root, `assets/project-${key}-dark.svg`), row(spec, true));
}
console.log("project rows written");
