#!/usr/bin/env node
/**
 * Static build for the Capacitor shell.
 *
 * Runs the SPA (client-only) Vite build and copies the client output into a
 * top-level `dist/` folder — the `webDir` Capacitor reads. The SSR web build
 * (`npm run build:web`) is untouched.
 */
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const API_BASE = process.env.VITE_API_BASE_URL || "https://maxoutshop.lovable.app";

const result = spawnSync("npx", ["vite", "build"], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, MOBILE_BUILD: "1", VITE_API_BASE_URL: API_BASE },
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

const clientDir = join(root, "dist", "client");
const distDir = join(root, "dist");

if (!existsSync(join(clientDir, "index.html"))) {
  console.error(`[build:mobile] Expected ${join(clientDir, "index.html")} to exist.`);
  process.exit(1);
}

// Move dist/client/* up to dist/ (via a temp dir so we never copy into ourselves).
const staging = mkdtempSync(join(root, ".maxout-mobile-"));
cpSync(clientDir, staging, { recursive: true });
rmSync(distDir, { recursive: true, force: true });
cpSync(staging, distDir, { recursive: true });
rmSync(staging, { recursive: true, force: true });

const html = readFileSync(join(distDir, "index.html"), "utf8");
if (!/<script[^>]+src="\/assets\//.test(html)) {
  console.error("[build:mobile] dist/index.html does not reference the built assets.");
  process.exit(1);
}

console.log(`[build:mobile] dist/ ready (API base: ${API_BASE})`);
