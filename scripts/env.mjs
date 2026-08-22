import fs from "node:fs";

/**
 * Reads .env.local / .env into process.env without adding a dependency.
 *
 * Strips a leading UTF-8 BOM: Windows tooling (PowerShell's Set-Content, most
 * editors' "UTF-8" default) writes one, and it silently swallows the first
 * variable in the file — which is exactly as fun to debug as it sounds.
 */
export function loadEnv(files = [".env.local", ".env"]) {
  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    const body = fs.readFileSync(file, "utf8").replace(/^﻿/, "");
    for (const line of body.split("\n")) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim();
    }
  }
}
