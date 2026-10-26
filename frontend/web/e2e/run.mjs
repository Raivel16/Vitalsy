// RNF-18: corre la suite E2E en dos fases y une sus reportes.
//   parallel: M1–M4, acceso, permisos y piso lleno (E2E_WORKERS, 4 por defecto)
//   serial:   reloj, M5 camas, M6 personal y día completo (1 worker; comparten estado global)
// Uso: npm run e2e [-- <filtro de archivos> | -g "<título>" ...]
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const results = "e2e-results";
const args = process.argv.slice(2);
const seed = process.env.E2E_SEED ?? String(Math.floor(Math.random() * 2 ** 31));
const workers = process.env.E2E_WORKERS ?? "4";

rmSync(results, { recursive: true, force: true });
console.log(`Semilla E2E: ${seed}  (repita con: $env:E2E_SEED=${seed}; npm run e2e …)`);

// Se lanza la CLI con node y sin shell: así un -g "título con espacios" llega intacto también
// en Windows (con shell: true, Node une los argumentos sin comillas).
const cli = fileURLToPath(new URL("../node_modules/@playwright/test/cli.js", import.meta.url));
function pw(cliArgs, env = {}, stdio = "inherit") {
  return spawnSync(process.execPath, [cli, ...cliArgs], { stdio, encoding: "utf8", env: { ...process.env, ...env } });
}

// Con un filtro que no encuentra pruebas, cada fase pasaría «en verde» sin probar nada.
if (args.length > 0) {
  const listed = pw(["test", "--list", "--project=parallel", "--project=serial", ...args], { E2E_SEED: seed }, "pipe");
  if (!/Total: [1-9]/.test(listed.stdout ?? "")) {
    console.error(`Ninguna prueba coincide con: ${args.join(" ")}`);
    process.exit(1);
  }
}

function playwright(phase, extra) {
  return pw(["test", ...extra, "--pass-with-no-tests", ...args], { E2E_PHASE: phase, E2E_SEED: seed }).status ?? 1;
}

const status = Math.max(
  playwright("parallel", ["--project=parallel", `--workers=${workers}`]),
  playwright("serial", ["--project=serial", "--workers=1"]),
);

// Un solo reporte HTML con ambas fases.
const blobDir = join(results, "blob");
mkdirSync(blobDir, { recursive: true });
for (const phase of ["parallel", "serial"]) {
  const zip = join(results, `blob-${phase}`, `${phase}.zip`);
  if (existsSync(zip)) copyFileSync(zip, join(blobDir, `${phase}.zip`));
}
if (readdirSync(blobDir).length > 0) {
  pw(["merge-reports", "--reporter", "html", blobDir], { PLAYWRIGHT_HTML_OUTPUT_DIR: join(results, "html"), PLAYWRIGHT_HTML_OPEN: "never" });
}

// Un solo CSV de hallazgos (cabecera una vez).
const csvs = ["parallel", "serial"].map((p) => join(results, `hallazgos-${p}.csv`)).filter((f) => existsSync(f));
if (csvs.length > 0) {
  const [first, ...rest] = csvs.map((f) => readFileSync(f, "utf8").split(/\r?\n/).filter(Boolean));
  const rows = [...first, ...rest.flatMap((lines) => lines.slice(1))];
  writeFileSync(join(results, "hallazgos.csv"), `${rows.join("\r\n")}\r\n`, "utf8");
  console.log(`Hallazgos: ${join(results, "hallazgos.csv")} (${rows.length - 1} filas)`);
}

console.log(`Reporte: npm run e2e:report · Semilla E2E: ${seed}`);
process.exit(status);
