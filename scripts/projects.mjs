// Two small project cards for the README: Lume (the orb inside its ring of plates, lit by a slow wave
// like the landing's hero) and Invicto (quiet, same layout). Both are dark cards that work on any theme.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const font = readFileSync(join(root, "assets/fonts/manrope-latin.woff2")).toString("base64");
const orb = readFileSync(join(root, "assets/orb.png")).toString("base64");
const W = 490, H = 170, M = 5, CX = 352, CY = 86;

function card({ title, lines, extraDefs = "", style = "", art, fill, stroke, titleColor, textColor }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${title}: ${lines.join(" ")}">
  <title>${title}: ${lines.join(" ")}</title>
  <defs>
    <style>
      @font-face { font-family: "Manrope"; font-weight: 400 700; src: url(data:font/woff2;base64,${font}) format("woff2"); }
      text { font-family: Manrope, "Segoe UI", Helvetica, Arial, sans-serif; }
      ${style}
    </style>
    <clipPath id="clip"><rect x="${M}" y="${M}" width="${W - 2 * M}" height="${H - 2 * M}" rx="20"/></clipPath>
    ${extraDefs}
  </defs>
  <rect x="${M}" y="${M}" width="${W - 2 * M}" height="${H - 2 * M}" rx="20" fill="${fill}"/>
  <g clip-path="url(#clip)">${art.clipped ?? ""}</g>
  ${art.top ?? ""}
  <text x="30" y="88" fill="${titleColor}" font-size="38" font-weight="500" letter-spacing="-2">${title}</text>
  ${lines.map((line, i) => `<text x="31" y="${114 + i * 18}" fill="${textColor}" font-size="12.5" letter-spacing="-.05">${line}</text>`).join("\n  ")}
  <rect x="${M}" y="${M}" width="${W - 2 * M}" height="${H - 2 * M}" rx="20" fill="none" stroke="${stroke}" stroke-width="1.5"/>
</svg>
`;
}

// ── Lume: ring of plates with a wave of light, the orb in the middle ─────────
function lume() {
  const a = 112, b = 42, count = 60, wave = 7;
  const light = [186, 206, 164], dark = [62, 88, 72];
  const mix = (t) => dark.map((v, i) => Math.round(v + (light[i] - v) * t));
  const plates = [];
  for (let k = 0; k < count; k++) {
    const theta = (2 * Math.PI * k) / count;
    const x = a * Math.cos(theta), y = b * Math.sin(theta);
    const depth = (Math.sin(theta) + 1) / 2;
    const [r, g, bl] = mix(0.35 + 0.65 * (0.5 + 0.5 * Math.cos(theta - 2.3)));
    const h = 17 + 11 * depth, w = 1.7 + 6 * Math.abs(Math.cos(theta));
    const delay = (-(k / count) * wave).toFixed(2);
    plates.push([depth, `<rect class="plate" style="animation-delay:${delay}s" x="${(-w / 2).toFixed(1)}" y="${(-h / 2).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="1.1" transform="translate(${x.toFixed(1)} ${y.toFixed(1)})" fill="rgb(${r},${g},${bl})"/>`]);
  }
  plates.sort((p, q) => p[0] - q[0]);
  const ring = `<g transform="translate(${CX} ${CY}) rotate(-13)">${plates.map((p) => p[1]).join("")}</g>`;
  const orbWidth = 98;
  return card({
    title: "Lume",
    lines: ["A quiet command center", "for your AI agents."],
    fill: "#101d17", stroke: "#2c4a3c", titleColor: "#e4eadf", textColor: "#97a99e",
    style: `.plate { animation: wave ${wave}s ease-in-out infinite; } @keyframes wave { 0%, 100% { opacity: .42; } 50% { opacity: 1; } } @media (prefers-reduced-motion: reduce) { .plate { animation: none; } }`,
    extraDefs: `<radialGradient id="glow" cx="${CX / W}" cy="${CY / H}" r=".42"><stop offset="0" stop-color="#aec695" stop-opacity=".16"/><stop offset="1" stop-color="#aec695" stop-opacity="0"/></radialGradient>
    <filter id="lift" x="-30%" y="-40%" width="160%" height="200%"><feDropShadow dx="0" dy="5" stdDeviation="5" flood-color="#000" flood-opacity=".4"/></filter>`,
    art: { clipped: `<rect width="${W}" height="${H}" fill="url(#glow)"/>${ring}`, top: `<image x="${CX - orbWidth / 2}" y="${CY - (orbWidth * 88) / 312}" width="${orbWidth}" height="${(orbWidth * 176) / 312}" xlink:href="data:image/png;base64,${orb}" filter="url(#lift)"/>` },
  });
}

// ── Invicto: the same layout, quieter ────────────────────────────────────────
function invicto() {
  const shield = `<g transform="translate(${CX - 36} ${CY - 36}) scale(.5625)" opacity=".92"><rect width="128" height="128" rx="28" fill="url(#g1)"/>
    <path d="M64 15 105 31v30c0 28.5-16.8 47-41 57-24.2-10-41-28.5-41-57V31Z" fill="#0A1E1C" stroke="url(#g2)" stroke-width="6" stroke-linejoin="round"/>
    <path d="M50 37h28M64 37v57M50 94h28" fill="none" stroke="url(#g2)" stroke-width="10" stroke-linecap="round"/>
    <path d="m64 20 4.7 9.3 10.3 1.5-7.5 7.2 1.8 10.2-9.3-4.9-9.3 4.9 1.8-10.2-7.5-7.2 10.3-1.5Z" fill="url(#g2)" stroke="#07110E" stroke-width="2"/></g>`;
  const arcs = [58, 80, 104].map((r, i) => `<circle cx="${CX}" cy="${CY}" r="${r}" fill="none" stroke="#d1a44a" stroke-opacity="${0.14 - i * 0.04}" stroke-width="1"/>`).join("");
  return card({
    title: "Invicto",
    lines: ["A historic football draft", "you can play in the browser."],
    fill: "#14140f", stroke: "#2f2a1f", titleColor: "#d9d1bd", textColor: "#8b8371",
    extraDefs: `<linearGradient id="g1" x1="20" x2="108" y1="16" y2="116" gradientUnits="userSpaceOnUse"><stop stop-color="#143C3F"/><stop offset=".55" stop-color="#07110E"/><stop offset="1" stop-color="#1C1410"/></linearGradient>
    <linearGradient id="g2" x1="39" x2="89" y1="22" y2="106" gradientUnits="userSpaceOnUse"><stop stop-color="#FFE083"/><stop offset=".5" stop-color="#F4B72A"/><stop offset="1" stop-color="#9F6415"/></linearGradient>`,
    art: { clipped: arcs, top: shield },
  });
}

writeFileSync(join(root, "assets/project-lume.svg"), lume());
writeFileSync(join(root, "assets/project-invicto.svg"), invicto());
console.log("project cards written");
