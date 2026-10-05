import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const KEEP =
  /^(\/\/\/\s*<reference|\/\*!)|^(\/\/|\/\*+|#)\s*(eslint-|eslint\s|global\s|@ts-|prettier-ignore|istanbul\s|[#@]__PURE__|webpackChunkName|@vite-ignore)/;
const MARK = "\u0000";

export function cleanup(text, ranges, maxBlank = 1) {
  const sorted = ranges.filter(([s, e]) => e > s).sort((a, b) => a[0] - b[0]);
  let out = "";
  let last = 0;
  for (const [s, e] of sorted) {
    if (s < last) continue;
    out += text.slice(last, s) + MARK;
    last = e;
  }
  out += text.slice(last);
  const lines = [];
  for (const line of out.split("\n")) {
    if (!line.includes(MARK)) {
      lines.push(line);
      continue;
    }
    const indent = /^[ \t]*/.exec(line)[0];
    const cr = line.endsWith("\r") ? "\r" : "";
    let rest = line.slice(indent.length);
    while (rest.startsWith(MARK)) rest = rest.slice(1).replace(/^[ \t]*/, "");
    const clean = (indent + rest).replaceAll(MARK, "").trimEnd();
    if (clean.trim() !== "") lines.push(clean + cr);
  }
  const result = [];
  let blanks = 0;
  for (const line of lines) {
    blanks = line.trim() === "" ? blanks + 1 : 0;
    if (blanks <= maxBlank && !(blanks && result.length === 0)) result.push(line);
  }
  return result.join("\n");
}

function scriptKind(file) {
  const ext = extname(file);
  if (ext === ".tsx") return ts.ScriptKind.TSX;
  if (ext === ".json") return ts.ScriptKind.JSON;
  if ([".js", ".mjs", ".cjs", ".jsx"].includes(ext)) return ts.ScriptKind.JSX;
  return ts.ScriptKind.TS;
}

export function tsRanges(text, file = "x.ts") {
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, scriptKind(file));
  const found = new Map();
  const jsxText = [];
  const add = (r) => {
    if (!KEEP.test(text.slice(r.pos, r.end))) found.set(r.pos, r.end);
  };
  const visit = (node) => {
    if (node.kind >= ts.SyntaxKind.FirstJSDocNode && node.kind <= ts.SyntaxKind.LastJSDocNode)
      return;
    if (node.kind === ts.SyntaxKind.JsxText) jsxText.push([node.pos, node.end]);
    if (ts.isJsxExpression(node) && !node.expression) {
      found.set(node.getStart(sf), node.end);
      return;
    }
    (ts.getLeadingCommentRanges(text, node.pos) ?? []).forEach(add);
    (ts.getTrailingCommentRanges(text, node.end) ?? []).forEach(add);
    node.getChildren(sf).forEach(visit);
  };
  visit(sf);
  return [...found].filter(([s]) => !jsxText.some(([a, b]) => s >= a && s < b));
}

export function cssRanges(text) {
  const ranges = [];
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"' || c === "'") {
      for (i++; i < text.length && text[i] !== c; i++) if (text[i] === "\\") i++;
    } else if (c === "/" && text[i + 1] === "*") {
      const end = text.indexOf("*/", i + 2);
      const stop = end === -1 ? text.length : end + 2;
      if (!KEEP.test(text.slice(i, stop))) ranges.push([i, stop]);
      i = stop - 1;
    }
  }
  return ranges;
}

export function rustRanges(text) {
  const ranges = [];
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    const raw = /^b?r(#*)"/.exec(text.slice(i, i + 260));
    if (raw && !/\w/.test(text[i - 1] ?? "")) {
      const close = '"' + raw[1];
      const end = text.indexOf(close, i + raw[0].length);
      i = end === -1 ? text.length : end + close.length;
    } else if (c === '"') {
      for (i++; i < text.length && text[i] !== '"'; i++) if (text[i] === "\\") i++;
      i++;
    } else if (c === "'") {
      const ch = String.fromCodePoint(text.codePointAt(i + 1) ?? 32);
      if (text[i + 1] === "\\") i = text.indexOf("'", i + 3) + 1;
      else if (text[i + 1 + ch.length] === "'") i += 2 + ch.length;
      else i++;
    } else if (c === "/" && text[i + 1] === "/") {
      const end = text.indexOf("\n", i);
      const stop = end === -1 ? text.length : end;
      ranges.push([i, text[stop - 1] === "\r" ? stop - 1 : stop]);
      i = stop;
    } else if (c === "/" && text[i + 1] === "*") {
      let depth = 1;
      let j = i + 2;
      while (j < text.length && depth) {
        if (text.startsWith("/*", j)) depth++;
        else if (text.startsWith("*/", j)) depth--;
        j += text.startsWith("/*", j) || text.startsWith("*/", j) ? 2 : 1;
      }
      ranges.push([i, j]);
      i = j;
    } else i++;
  }
  return ranges;
}

export function lineRanges(text, marker = "#", file = "") {
  const ranges = [];
  let offset = 0;
  const isDockerfile = basename(file) === "Dockerfile";
  text.split("\n").forEach((line, n) => {
    const keep =
      (n === 0 && line.startsWith("#!")) ||
      (isDockerfile && /^#\s*(syntax|escape|check)=/.test(line));
    let quote = null;
    for (let i = 0; !keep && i < line.length; i++) {
      const c = line[i];
      if (quote) {
        if (c === "\\" && quote === '"') i++;
        else if (c === quote) quote = null;
      } else if (c === '"' || c === "'") quote = c;
      else if (line.startsWith(marker, i) && (i === 0 || /\s/.test(line[i - 1]))) {
        if (!KEEP.test(line.slice(i)))
          ranges.push([offset + i, offset + line.length - (line.endsWith("\r") ? 1 : 0)]);
        break;
      }
    }
    offset += line.length + 1;
  });
  return ranges;
}

export function vueRanges(text) {
  const ranges = [];
  const blocks = [];
  for (const m of text.matchAll(/(<(script|style)\b[^>]*>)([\s\S]*?)<\/\2>/g)) {
    const start = m.index + m[1].length;
    blocks.push([m.index, m.index + m[0].length]);
    const inner =
      m[2] === "script"
        ? tsRanges(m[3], /lang="tsx"/.test(m[1]) ? "x.tsx" : "x.ts")
        : cssRanges(m[3]);
    ranges.push(...inner.map(([s, e]) => [s + start, e + start]));
  }
  for (const m of text.matchAll(/<!--[\s\S]*?-->/g)) {
    if (!blocks.some(([a, b]) => m.index >= a && m.index < b))
      ranges.push([m.index, m.index + m[0].length]);
  }
  return ranges;
}

const PY_SCRIPT = `
import io, json, sys, tokenize
out = {}
for path in json.loads(sys.stdin.read()):
    src = open(path, encoding="utf-8").read()
    found = []
    try:
        for tok in tokenize.generate_tokens(io.StringIO(src).readline):
            if tok.type == tokenize.COMMENT:
                found.append([tok.start[0], tok.start[1], tok.string])
    except (tokenize.TokenError, SyntaxError):
        found = None
    out[path] = found
sys.stdout.write(json.dumps(out))
`;
const PY_KEEP = /^#!|noqa|type:\s*ignore|pragma|fmt:|-\*- coding|pyright:|mypy:/;

export function stripPython(paths) {
  if (paths.length === 0) return {};
  const python = process.platform === "win32" ? "python" : "python3";
  const res = spawnSync(python, ["-c", PY_SCRIPT], {
    input: JSON.stringify(paths),
    encoding: "utf8",
    maxBuffer: 1 << 28,
  });
  if (res.status !== 0) throw new Error(`Python no disponible o falló: ${res.stderr || res.error}`);
  const result = {};
  for (const [path, comments] of Object.entries(JSON.parse(res.stdout))) {
    const text = readFileSync(path, "utf8");
    if (comments === null) {
      result[path] = text;
      continue;
    }
    const starts = [0];
    for (let i = 0; i < text.length; i++) if (text[i] === "\n") starts.push(i + 1);
    const ranges = comments
      .filter(([line, , body]) => !(PY_KEEP.test(body) || (line === 1 && body.startsWith("#!"))))
      .map(([line, col, body]) => {
        const lineStart = starts[line - 1];
        const s = lineStart + [...text.slice(lineStart)].slice(0, col).join("").length;
        return [s, s + body.length];
      });
    result[path] = cleanup(text, ranges, 2);
  }
  return result;
}

const HASH_FILES = new Set([
  ".yml",
  ".yaml",
  ".toml",
  ".conf",
  ".ini",
  ".example",
  ".gitignore",
  ".gitattributes",
  ".dockerignore",
  ".prettierignore",
]);
const HASH_NAMES = new Set(["Dockerfile", "pre-commit", "commit-msg", ".env.example"]);
const TS_EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json"]);

export function stripText(file, text) {
  const ext = extname(file) || basename(file);
  if (TS_EXT.has(ext)) return cleanup(text, tsRanges(text, file));
  if (ext === ".vue") return cleanup(text, vueRanges(text));
  if (ext === ".css") return cleanup(text, cssRanges(text));
  if (ext === ".rs") return cleanup(text, rustRanges(text));
  if (ext === ".prisma") return cleanup(text, lineRanges(text, "//", file));
  if (HASH_FILES.has(ext) || HASH_NAMES.has(basename(file)))
    return cleanup(text, lineRanges(text, "#", file));
  return null;
}

function emptyExceptGit(dir) {
  for (const entry of readdirSync(dir))
    if (entry !== ".git") rmSync(join(dir, entry), { recursive: true, force: true });
}

function git(cwd, ...args) {
  const res = spawnSync("git", args, { cwd, encoding: "utf8", maxBuffer: 1 << 28 });
  if (res.status !== 0) throw new Error(`git ${args.join(" ")}: ${res.stderr}`);
  return res.stdout;
}

function main() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const args = process.argv.slice(2);
  const destArg = args.includes("--dest") ? args[args.indexOf("--dest") + 1] : undefined;
  const dest = resolve(root, destArg ?? `../${basename(root)}-publico`);
  if (dest === root) throw new Error("El destino no puede ser este mismo repositorio");

  if (!existsSync(join(dest, ".git"))) {
    mkdirSync(dest, { recursive: true });
    git(dest, "init", "-b", "main");
    git(dest, "config", "core.longpaths", "true");
    console.log(
      `Repositorio espejo creado en ${dest}. Conéctalo a GitHub:\n  git -C "${dest}" remote add origin <url-del-repo>`
    );
  }
  emptyExceptGit(dest);

  const files = git(root, "ls-files", "-z", "--cached", "--others", "--exclude-standard")
    .split("\0")
    .filter(Boolean);
  const pyFiles = [];
  let stripped = 0;
  for (const file of files) {
    const src = join(root, file);
    if (!existsSync(src)) continue;
    const out = join(dest, file);
    mkdirSync(dirname(out), { recursive: true });
    if (file.endsWith(".py")) {
      pyFiles.push(file);
      continue;
    }
    const text = stripText(file, readFileSync(src, "utf8"));
    if (text === null) copyFileSync(src, out);
    else {
      writeFileSync(out, text);
      stripped++;
    }
  }
  const py = stripPython(pyFiles.map((f) => join(root, f)));
  for (const file of pyFiles) writeFileSync(join(dest, file), py[join(root, file)]);
  stripped += pyFiles.length;

  console.log(`${files.length} archivos copiados, ${stripped} sin comentarios => ${dest}`);

  for (const [cmd, cmdArgs, cwd] of [
    ["cargo", ["fmt"], join(dest, "apps/ecommerce-rust")],
    ["ruff", ["format", "."], join(dest, "apps/ecommerce-fastapi")],
  ]) {
    if (!existsSync(cwd)) continue;
    const res = spawnSync(cmd, cmdArgs, {
      cwd,
      encoding: "utf8",
      shell: process.platform === "win32",
    });
    if (res.status !== 0)
      console.warn(
        `[aviso] "${cmd} ${cmdArgs.join(" ")}" no se ejecutó en ${cwd}; la CI podría marcar formato.`
      );
  }
  git(dest, "add", "-A");
  if (git(dest, "status", "--porcelain").trim() === "")
    return console.log("Sin cambios que commitear.");
  const lastSubject = spawnSync("git", ["log", "-1", "--format=%s"], { cwd: root, encoding: "utf8" });
  const message = args.includes("-m")
    ? args[args.indexOf("-m") + 1]
    : (lastSubject.status === 0 && lastSubject.stdout.trim()) || "chore: sync";
  git(dest, "commit", "-m", message);
  console.log(`Commit en el espejo: "${message}"`);
  if (args.includes("--push"))
    console.log(git(dest, "push", "-u", "origin", "main") || "Push completado.");
  else console.log(`Revisa y sube con: git -C "${dest}" push -u origin main`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main();
