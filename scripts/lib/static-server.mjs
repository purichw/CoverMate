import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OWNER_ROOT_ROUTES = new Set(["admin/content", "admin/edit", "admin/preview"]);

export function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".html") return "text/html; charset=utf-8";
  if (ext === ".js" || ext === ".mjs") return "application/javascript; charset=utf-8";
  if (ext === ".css") return "text/css; charset=utf-8";
  if (ext === ".svg") return "image/svg+xml";
  if (ext === ".png") return "image/png";
  if (ext === ".ico") return "image/x-icon";
  if (ext === ".json" || ext === ".webmanifest") return "application/json; charset=utf-8";
  return "application/octet-stream";
}

export function resolveStaticFilePath(urlPath, options = {}) {
  return resolveStaticFileCandidates(urlPath, options)[0] || null;
}

export function resolveStaticFileCandidates(urlPath, options = {}) {
  const rootDir = path.resolve(options.rootDir || REPO_ROOT);
  const fallbackFile = options.fallbackFile || "index.html";
  let pathname = decodeURIComponent(urlPath || "/").replace(/^\/+/, "");
  pathname = pathname.replace(/^"+|"+$/g, "");
  if (!pathname || (options.ownerRoutesToRoot && OWNER_ROOT_ROUTES.has(pathname))) {
    pathname = fallbackFile;
  }
  const candidates = [pathname];
  if (!path.extname(pathname)) {
    candidates.push(`${pathname}.html`, `${pathname}/index.html`);
  }
  return candidates.map((candidate) => {
    const filePath = path.resolve(rootDir, candidate);
    if (!filePath.startsWith(rootDir + path.sep) && filePath !== rootDir) return null;
    return filePath;
  }).filter(Boolean);
}

export function startStaticServer(options = {}) {
  const rootDir = path.resolve(options.rootDir || REPO_ROOT);
  const host = options.host || "127.0.0.1";
  const createFileCandidates = options.resolveFileCandidates || ((urlPath) =>
    resolveStaticFileCandidates(urlPath, {
      rootDir,
      fallbackFile: options.fallbackFile,
      ownerRoutesToRoot: options.ownerRoutesToRoot
    }));
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url || "/", `http://${host}`);
      const candidates = createFileCandidates(url.pathname);
      if (!candidates.length) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
      }
      for (const filePath of candidates) {
        try {
          const data = await fs.readFile(filePath);
          res.writeHead(200, { "content-type": contentType(filePath) });
          res.end(data);
          return;
        } catch {
          // Try the next clean-URL candidate.
        }
      }
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("Not found");
    } catch {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("Not found");
    }
  });

  return new Promise((resolve) => {
    server.listen(0, host, () => {
      const address = server.address();
      resolve({ server, baseUrl: `http://${host}:${address.port}` });
    });
  });
}
