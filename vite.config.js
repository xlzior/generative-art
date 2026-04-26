import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const sketchesRoot = path.resolve(projectRoot, "src/sketches");

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 2_000_000) {
        reject(new Error("Request body too large"));
      }
    });

    req.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch {
        reject(new Error("Invalid JSON payload"));
      }
    });

    req.on("error", reject);
  });
}

function isWithinSketchesRoot(filePath) {
  const normalizedRoot = path.normalize(sketchesRoot + path.sep);
  const normalizedPath = path.normalize(filePath);
  return normalizedPath.startsWith(normalizedRoot);
}

export default defineConfig({
  plugins: [
    {
      name: "save-sketch-defaults",
      configureServer(server) {
        server.middlewares.use("/__sketch-defaults", async (req, res, next) => {
          if (req.method !== "POST") {
            return next();
          }

          try {
            const { defaultsFile, defaults } = await readJsonBody(req);

            if (
              typeof defaultsFile !== "string" ||
              defaultsFile.trim() === ""
            ) {
              throw new Error("defaultsFile is required");
            }

            if (!defaults || typeof defaults !== "object") {
              throw new Error("defaults must be an object");
            }

            for (const value of Object.values(defaults)) {
              if (!Number.isFinite(value)) {
                throw new Error("defaults values must be numeric");
              }
            }

            const outputPath = path.resolve(sketchesRoot, defaultsFile);

            if (
              !isWithinSketchesRoot(outputPath) ||
              path.basename(outputPath) !== "defaults.json"
            ) {
              throw new Error("Invalid defaults file path");
            }

            await fs.writeFile(
              outputPath,
              `${JSON.stringify(defaults, null, 2)}\n`,
              "utf8",
            );

            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ ok: true }));
          } catch (error) {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ ok: false, message: error.message }));
          }

          return undefined;
        });
      },
    },
  ],
});
