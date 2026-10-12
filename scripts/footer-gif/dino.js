// The Lume dino, as the app draws it (LumeMascot.svelte): a 32 × 32 pixel grid.
export const dinoPaths = {
  body: "M4 16h3v-2h3V9h3V6h11v2h3v8h-9v2h4v4h-5v4h-4v-5h-3v5H7v-5H5v-2H3v-4h1z",
  belly: "M10 15h3v2h5v3h-8z",
  eyeLight: [21, 9, 3, 3],
  pupil: [23, 9, 1, 2],
  snout: [23, 13, 4, 2],
  closedEye: [21, 10, 4, 1],
  feet: [[7, 25, 5, 2], [13, 25, 5, 2]],
  dust: [[1, 22, 3, 2], [3, 26, 2, 1]],
  sleep: ["M24 3h5v1h-3v1h3v1h-5V5h2V4h-2z", "M27 0h3v1h-1v1h1v1h-3V2h1V1h-1z"],
};

export const dinoColors = { idle: "#8b9490", awake: "#63a57d", running: "#5f91b9" };

/** Inline SVG for DOM use; the state class drives the CSS animation. */
export function dinoSvg() {
  const [ex, ey, ew, eh] = dinoPaths.eyeLight, [px, py, pw, ph] = dinoPaths.pupil, [sx, sy, sw, sh] = dinoPaths.snout, [cx, cy, cw, ch] = dinoPaths.closedEye;
  return `<svg viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true"><g class="dino-body">
    <path class="d-body" d="${dinoPaths.body}"/><path class="d-belly" d="${dinoPaths.belly}"/>
    <rect class="d-snout" x="${sx}" y="${sy}" width="${sw}" height="${sh}"/>
    <rect class="d-closed" x="${cx}" y="${cy}" width="${cw}" height="${ch}"/>
    <g class="d-open"><rect class="d-eye" x="${ex}" y="${ey}" width="${ew}" height="${eh}"/><rect class="d-pupil" x="${px}" y="${py}" width="${pw}" height="${ph}"/></g>
    <g class="d-feet">${dinoPaths.feet.map(([x, y, w, h]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}"/>`).join("")}</g>
  </g>
  <g class="d-dust">${dinoPaths.dust.map(([x, y, w, h]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}"/>`).join("")}</g>
  <g class="d-sleep">${dinoPaths.sleep.map((d) => `<path d="${d}"/>`).join("")}</g></svg>`;
}

const bodyPath = typeof Path2D === "undefined" ? null : new Path2D(dinoPaths.body);
const bellyPath = typeof Path2D === "undefined" ? null : new Path2D(dinoPaths.belly);

/**
 * Draws the dino on a canvas whose pixels are the art's pixels. `frame` toggles the feet while running,
 * `jump` tucks them together, `shade` is the body color, `ink` the face/feet color.
 */
export function drawDino(context, x, y, { frame = 0, jump = false, shade = dinoColors.running, ink = "#20322c", eye = "#eaf2ee", dust = false } = {}) {
  context.save();
  context.translate(Math.round(x), Math.round(y));
  context.fillStyle = shade;
  context.fill(bodyPath);
  context.fillStyle = "rgba(255,255,255,.26)";
  context.fill(bellyPath);
  context.fillStyle = "rgba(24,48,39,.2)";
  context.fillRect(...dinoPaths.snout);
  context.fillStyle = eye;
  context.fillRect(...dinoPaths.eyeLight);
  context.fillStyle = ink;
  context.fillRect(...dinoPaths.pupil);
  // Feet: alternate while running, together in the air.
  const [left, right] = dinoPaths.feet;
  if (jump) { context.fillRect(left[0], left[1] - 1, left[2], left[3]); context.fillRect(right[0], right[1] - 1, right[2], right[3]); }
  else if (frame % 2) { context.fillRect(left[0], left[1], left[2], left[3]); context.fillRect(right[0] + 2, right[1] - 1, right[2] - 2, right[3]); }
  else { context.fillRect(left[0] + 1, left[1] - 1, left[2] - 1, left[3]); context.fillRect(right[0], right[1], right[2], right[3]); }
  if (dust) { context.fillStyle = "rgba(120,160,190,.55)"; for (const [dx, dy, w, h] of dinoPaths.dust) context.fillRect(dx - (frame % 2), dy, w, h); }
  context.restore();
}
