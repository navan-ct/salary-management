import { Buffer } from "node:buffer";

import { TextSourceCodeBase, VisitNodeStep } from "@eslint/plugin-kit";
import { loadModule, scanSync } from "libpg-query";

await loadModule();

function locationAt(bytes, offset) {
  const lines = bytes.toString("utf8", 0, offset).split(/\r\n|[\r\n]/u);

  return { line: lines.length, column: lines.at(-1).length + 1 };
}

class PostgreSQLSourceCode extends TextSourceCodeBase {
  traverse() {
    const target = this.ast;
    const args = [target];

    return [
      new VisitNodeStep({ target, phase: 1, args }),
      new VisitNodeStep({ target, phase: 2, args }),
    ];
  }
}

export const postgresql = {
  fileType: "text",
  lineStart: 1,
  columnStart: 1,
  nodeTypeKey: "type",
  validateLanguageOptions(options) {
    if (Object.keys(options).length > 0) {
      throw new TypeError("The PostgreSQL language does not accept options.");
    }
  },
  parse({ body }) {
    try {
      const bytes = Buffer.from(body);
      const comments = scanSync(body).tokens
        .filter(({ tokenName }) => tokenName === "SQL_COMMENT" || tokenName === "C_COMMENT")
        .map(({ start, end }) => ({
          loc: { start: locationAt(bytes, start), end: locationAt(bytes, end) },
        }));

      return {
        ok: true,
        ast: {
          type: "SqlDocument",
          loc: { start: { line: 1, column: 1 }, end: locationAt(bytes, bytes.length) },
          comments,
        },
      };
    } catch {
      return {
        ok: false,
        errors: [{ message: "Unable to tokenize PostgreSQL source.", line: 1, column: 1 }],
      };
    }
  },
  createSourceCode({ body }, { ast }) {
    return new PostgreSQLSourceCode({ text: body, ast });
  },
};
