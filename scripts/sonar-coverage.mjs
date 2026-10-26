// Normaliza los reportes de cobertura a rutas relativas a la raíz del repo
// para que SonarQube los resuelva, y los deja en coverage-reports/ (versionado).
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "coverage-reports");
mkdirSync(out, { recursive: true });

const slash = (p) => p.split("\\").join("/");
const rootPrefix = slash(root) + "/";

const relativize = (p, pkg) => {
  const rel = slash(p).replace(rootPrefix, "");
  return rel.startsWith(pkg + "/") ? rel : `${pkg}/${rel}`;
};

const lcov = (pkg, target) => {
  const text = readFileSync(join(root, pkg, "coverage", "lcov.info"), "utf8");
  const fixed = text.replace(/^SF:(.+)$/gm, (_, p) => `SF:${relativize(p.trim(), pkg)}`);
  writeFileSync(join(out, target), fixed);
};

lcov("frontend/web", "lcov-frontend.info");
lcov("movil", "lcov-movil.info");

const clover = readFileSync(join(root, "backend/api/coverage.xml"), "utf8");
writeFileSync(
  join(out, "php-coverage.xml"),
  clover.replace(/<file name="([^"]+)"/g, (_, p) => `<file name="${relativize(p, "backend/api")}"`),
);
console.log("coverage-reports/ actualizado");
