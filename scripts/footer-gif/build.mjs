// Renders the Lume footer runner (the same code the landing page runs) into assets/footer.gif.
// A headless Chromium steps the game on a fixed clock; the frames are quantized and written with gifenc.
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync, existsSync, readdirSync } from "node:fs";
import { tmpdir, homedir } from "node:os";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { once } from "node:events";
import gifenc from "gifenc";
const { GIFEncoder } = gifenc;

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../..");
const FRAMES = Number(process.env.FRAMES || 300), STEP_MS = 40, SCALE = 3, SEED = process.env.SEED || 7;
const BACKGROUND = [0x10, 0x1d, 0x17];

function findBrowser() {
  const cache = join(homedir(), ".cache/puppeteer/chrome-headless-shell");
  const found = existsSync(cache) ? readdirSync(cache).sort().reverse().map((v) => join(cache, v, "chrome-headless-shell-linux64/chrome-headless-shell")) : [];
  const candidate = [process.env.CHROME_BIN, ...found, "/usr/bin/chromium", "/usr/bin/google-chrome"].find((path) => path && existsSync(path));
  if (!candidate) throw new Error("No Chromium found. Set CHROME_BIN.");
  return candidate;
}

const server = createServer((request, response) => {
  const path = new URL(request.url, "http://localhost").pathname.replace(/^\/+/, "") || "harness.html";
  const file = join(here, path);
  if (!file.startsWith(here) || !existsSync(file)) return response.writeHead(404).end();
  response.setHeader("content-type", { ".html": "text/html", ".js": "text/javascript" }[extname(file)] ?? "application/octet-stream");
  response.end(readFileSync(file));
});
server.listen(0, "127.0.0.1");
await once(server, "listening");

const profile = mkdtempSync(join(tmpdir(), "footer-gif-"));
const browser = spawn(findBrowser(), ["--headless=new", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage", `--user-data-dir=${profile}`, "--remote-debugging-port=0", "about:blank"], { stdio: ["ignore", "ignore", "pipe"] });
try {
  const endpoint = await new Promise((resolve, reject) => {
    let log = "";
    const timer = setTimeout(() => reject(new Error("Chromium did not start: " + log.slice(-400))), 20000);
    browser.stderr.on("data", (chunk) => { log += chunk; const match = log.match(/DevTools listening on (ws:\/\/\S+)/); if (match) { clearTimeout(timer); resolve(match[1]); } });
  });
  const socket = new WebSocket(endpoint);
  await once(socket, "open");
  let sequence = 0;
  const pending = new Map();
  socket.addEventListener("message", ({ data }) => {
    const message = JSON.parse(data);
    if (message.id && pending.has(message.id)) { const { resolve, reject } = pending.get(message.id); pending.delete(message.id); message.error ? reject(new Error(message.error.message)) : resolve(message.result); }
  });
  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => { const id = ++sequence; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) })); });
  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
  const call = (method, params) => send(method, params, sessionId);
  const evaluate = async (expression) => {
    const result = await call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  };
  await call("Runtime.enable");
  await call("Emulation.setDeviceMetricsOverride", { width: 888, height: 168, deviceScaleFactor: 1, mobile: false });
  await call("Page.navigate", { url: `http://127.0.0.1:${server.address().port}/harness.html?seed=${SEED}` });
  for (let i = 0; i < 100 && !(await evaluate("window.__ready === true && window.__callback !== null")); i++) await new Promise((r) => setTimeout(r, 100));
  if (!(await evaluate("window.__callback !== null"))) throw new Error("The runner never asked for a frame (is it visible?).");

  const frames = [];
  let width = 0, height = 0;
  for (let i = 0; i < FRAMES; i++) {
    const packed = await evaluate(`(() => {
      const callback = window.__callback; window.__callback = null; window.__time += ${STEP_MS}; callback(window.__time);
      const canvas = document.querySelector("canvas"); const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
      let text = ""; for (let i = 0; i < data.length; i += 8192) text += String.fromCharCode(...data.subarray(i, i + 8192));
      return { width: canvas.width, height: canvas.height, data: btoa(text) };
    })()`);
    width = packed.width; height = packed.height;
    frames.push(Buffer.from(packed.data, "base64"));
    // Debug aid: SHOTS=40,120 writes a screenshot of those frames to SHOT_DIR.
    if (process.env.SHOTS?.split(",").includes(String(i))) {
      const { data } = await call("Page.captureScreenshot", { format: "png" });
      writeFileSync(join(process.env.SHOT_DIR || tmpdir(), `footer-frame-${i}.png`), Buffer.from(data, "base64"));
    }
  }

  // Composite on the footer's night green, collect the exact colors (the game draws with flat rectangles).
  const palette = new Map();
  const indexed = frames.map((rgba) => {
    const out = new Uint8Array(width * height);
    for (let p = 0; p < width * height; p++) {
      const alpha = rgba[p * 4 + 3] / 255;
      const color = [0, 1, 2].map((k) => Math.round(rgba[p * 4 + k] * alpha + BACKGROUND[k] * (1 - alpha)));
      const key = (color[0] << 16) | (color[1] << 8) | color[2];
      if (!palette.has(key)) palette.set(key, palette.size);
      out[p] = palette.get(key);
    }
    return out;
  });
  if (palette.size > 256) throw new Error(`The scene uses ${palette.size} colors; expected a flat-colored pixel scene.`);
  const colors = [...palette.keys()].map((key) => [(key >> 16) & 255, (key >> 8) & 255, key & 255]);
  while (colors.length < 2) colors.push([0, 0, 0]);

  const encoder = GIFEncoder();
  const W = width * SCALE, H = height * SCALE;
  for (const frame of indexed) {
    const big = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) { const row = Math.floor(y / SCALE) * width; for (let x = 0; x < W; x++) big[y * W + x] = frame[row + Math.floor(x / SCALE)]; }
    encoder.writeFrame(big, W, H, { palette: colors, delay: STEP_MS, repeat: 0 });
  }
  encoder.finish();
  const bytes = encoder.bytes();
  writeFileSync(join(root, "assets/footer.gif"), bytes);
  console.log(`assets/footer.gif: ${W}x${H}, ${frames.length} frames, ${colors.length} colors, ${(bytes.length / 1024).toFixed(0)} KB`);
  socket.close();
} finally {
  browser.kill();
  server.close();
}
