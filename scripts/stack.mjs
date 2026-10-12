// Draws the stack of the README as one SVG per color scheme: brand-colored glyphs, no boxes.
// Glyphs come from simple-icons; the few that library no longer ships come from devicon (assets/icons).
import * as si from "simple-icons";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const font = readFileSync(join(root, "assets/fonts/manrope-latin.woff2")).toString("base64");

const simple = (key) => ({ box: 24, path: si[key].path, color: `#${si[key].hex}`, title: si[key].title });
const devicon = (file, title, color) => {
  const svg = readFileSync(join(root, "assets/icons", file), "utf8");
  return { box: 128, path: [...svg.matchAll(/ d="([^"]+)"/g)].map((m) => m[1]).join(" "), color, title };
};

const groups = [
  ["Back-end", [devicon("csharp-plain.svg", "C#", "#9B4F96"), simple("siDotnet"), devicon("java-plain.svg", "Java", "#E76F00"), simple("siPython"), simple("siNodedotjs"), simple("siRust"), simple("siPhp")]],
  ["Front-end & mobile", [simple("siTypescript"), { ...simple("siAngular"), color: "#DD0031" }, simple("siReact"), simple("siSvelte"), simple("siVuedotjs"), simple("siFlutter"), simple("siDart"), simple("siKotlin"), simple("siBootstrap"), simple("siTailwindcss")]],
  ["Data", [devicon("microsoftsqlserver-plain.svg", "SQL Server", "#CC2927"), simple("siPostgresql"), { ...simple("siSqlite"), color: "#1F8DC9" }, simple("siMongodb")]],
  ["Cloud & tools", [devicon("aws-plain-wordmark.svg", "Amazon Web Services", "#FF9900"), simple("siDocker"), simple("siGit"), simple("siGnubash"), simple("siRabbitmq"), simple("siTauri")]],
];

const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
// Brand colors that vanish on the page background fall back to the page's ink.
const tint = (color, dark) => (dark ? (luminance(color) < 0.15 ? "#e4eadf" : color) : luminance(color) > 0.75 ? "#18231b" : luminance(color) < 0.06 ? "#18231b" : color);

function build(dark) {
  const W = 1000, size = 34, gap = 22, labelWidth = 230, rowHeight = 58, top = 6;
  const H = top + groups.length * rowHeight + 6;
  const muted = dark ? "#8fa397" : "#58624f", line = dark ? "#2a3a31" : "#d4d9c8";
  const rows = groups.map(([name, icons], row) => {
    const y = top + row * rowHeight;
    const cells = icons.map((icon, i) => {
      const x = labelWidth + i * (size + gap);
      const scale = size / icon.box;
      return `<g transform="translate(${x} ${y + (rowHeight - size) / 2 - 2}) scale(${scale})" fill="${tint(icon.color, dark)}"><title>${icon.title}</title><path d="${icon.path}"/></g>`;
    }).join("\n    ");
    return `<path d="M0 ${y + rowHeight - 1}h${W}" stroke="${line}" stroke-width="1"/>
    <text x="2" y="${y + rowHeight / 2 + 1}" fill="${muted}" font-size="11" font-weight="700" letter-spacing="2">${name.toUpperCase().replace("&", "&amp;")}</text>
    ${cells}`;
  }).join("\n    ");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Tech stack: ${groups.flatMap(([, icons]) => icons.map((i) => i.title)).join(", ")}">
  <title>Tech stack</title>
  <defs><style>
    @font-face { font-family: "Manrope"; font-weight: 400 700; src: url(data:font/woff2;base64,${font}) format("woff2"); }
    text { font-family: Manrope, "Segoe UI", Helvetica, Arial, sans-serif; }
  </style></defs>
    ${rows}
</svg>
`;
}

writeFileSync(join(root, "assets/stack-light.svg"), build(false));
writeFileSync(join(root, "assets/stack-dark.svg"), build(true));
console.log("stack-light.svg and stack-dark.svg written");
