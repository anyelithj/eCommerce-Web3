import assert from "node:assert/strict";
import { test } from "node:test";
import { stripText } from "./publicar-sin-comentarios.mjs";

test("TS/TSX: borra comentarios sin tocar strings, regex, URLs ni texto JSX", () => {
  const src = [
    "// cabecera",
    "// hereda de @ecommerce/eslint-config (prosa, no directiva)",
    '"use client";',
    "/** doc */",
    'const url = "http://x.com"; // fin',
    "const re = /\\/\\/no/g;",
    "// eslint-disable-next-line no-console",
    "const t = `a // b ${1 /* c */}`;",
    "export const C = () => (",
    "  <p>",
    "    {/* jsx */}",
    "    // texto visible",
    "  </p>",
    ");",
    "",
  ].join("\n");
  assert.equal(
    stripText("a.tsx", src),
    [
      '"use client";',
      'const url = "http://x.com";',
      "const re = /\\/\\/no/g;",
      "// eslint-disable-next-line no-console",
      "const t = `a // b ${1 }`;",
      "export const C = () => (",
      "  <p>",
      "    // texto visible",
      "  </p>",
      ");",
      "",
    ].join("\n")
  );
});

test("JSON con comentarios (turbo.json, tsconfig)", () => {
  assert.equal(stripText("t.json", '{\n  // c\n  "a": "//x" // d\n}\n'), '{\n  "a": "//x"\n}\n');
});

test("Rust: lifetimes, chars con comillas, raw strings y comentarios anidados", () => {
  const src =
    "//! módulo\nfn f<'a>(s: &'a str) -> char { // fin\n    let _r = r#\"// no\"#; /* a /* b */ c */\n    '\"'\n}\n";
  assert.equal(
    stripText("lib.rs", src),
    "fn f<'a>(s: &'a str) -> char {\n    let _r = r#\"// no\"#;\n    '\"'\n}\n"
  );
});

test("YAML/Docker/.env: '#' dentro de comillas o URLs se conserva", () => {
  const src = '# titulo\nrun: echo "a # b" # fin\nurl: http://x#frag\n';
  assert.equal(stripText("ci.yml", src), 'run: echo "a # b"\nurl: http://x#frag\n');
  assert.equal(
    stripText("Dockerfile", "# syntax=docker/dockerfile:1\n# c\nFROM node\n"),
    "# syntax=docker/dockerfile:1\nFROM node\n"
  );
  assert.equal(
    stripText("commit-msg", "#!/usr/bin/env sh\n# c\npnpm x\n"),
    "#!/usr/bin/env sh\npnpm x\n"
  );
});

test("CSS y Vue", () => {
  assert.equal(
    stripText("a.css", '/* c */\na { content: "/* no */"; } /* d */\n'),
    'a { content: "/* no */"; }\n'
  );
  const vue =
    '<template>\n  <!-- c -->\n  <div />\n</template>\n<script setup lang="ts">\n// c\nconst a = 1;\n</script>\n';
  assert.equal(
    stripText("a.vue", vue),
    '<template>\n  <div />\n</template>\n<script setup lang="ts">\nconst a = 1;\n</script>\n'
  );
});

test("Formatos sin cambios: Markdown y SQL", () => {
  assert.equal(stripText("README.md", "# t"), null);
  assert.equal(stripText("m.sql", "-- c"), null);
});
