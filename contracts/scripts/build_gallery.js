#!/usr/bin/env node
/**
 * build_gallery.js
 *
 * Build a lightweight HTML gallery for exported PATH SVGs using Node.js.
 * Finder's thumbnails miss filters/blend modes, so open the generated HTML
 * in Safari/Chrome to see the real output.
 */

const fs = require("fs");
const path = require("path");

const DEFAULT_TITLE = "PATH SVG Gallery";
const DEFAULT_PATTERN = "*.svg";

function printUsage() {
  console.log(`Usage: node scripts/build_gallery.js <source> [options]

Options:
  -o, --output <file>     Path to the gallery HTML file (default: <source>/gallery.html)
      --pattern <glob>    Glob pattern used to filter SVG files (default: ${DEFAULT_PATTERN})
      --recursive         Search directories recursively
      --title <text>      Title for the generated page (default: "${DEFAULT_TITLE}")`);
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const options = {
    source: null,
    output: null,
    pattern: DEFAULT_PATTERN,
    recursive: false,
    title: DEFAULT_TITLE,
  };

  while (args.length > 0) {
    const current = args.shift();
    switch (current) {
      case "-h":
      case "--help":
        printUsage();
        process.exit(0);
        break;
      case "-o":
      case "--output":
        if (args.length === 0) {
          throw new Error(`${current} requires a value.`);
        }
        options.output = args.shift();
        break;
      case "--pattern":
        if (args.length === 0) {
          throw new Error("--pattern requires a value.");
        }
        options.pattern = args.shift();
        break;
      case "--recursive":
        options.recursive = true;
        break;
      case "--title":
        if (args.length === 0) {
          throw new Error("--title requires a value.");
        }
        options.title = args.shift();
        break;
      default:
        if (current.startsWith("-")) {
          throw new Error(`Unknown option: ${current}`);
        }
        if (options.source) {
          throw new Error(`Source directory already provided (${options.source}).`);
        }
        options.source = current;
    }
  }

  if (!options.source) {
    throw new Error("Missing required <source> argument.");
  }

  return options;
}

function globToRegex(pattern) {
  const escaped = pattern
    .split("")
    .map((char) => {
      if (char === "*") return ".*";
      if (char === "?") return ".";
      return char.replace(/[-/\\^$+?.()|[\]{}]/g, "\\$&");
    })
    .join("");
  return new RegExp(`^${escaped}$`, "i");
}

function collectFiles(baseDir, patternRegex, recursive, relativePrefix = ".") {
  const entries = fs.readdirSync(baseDir, { withFileTypes: true });
  const results = [];

  for (const entry of entries) {
    const entryPath = path.join(baseDir, entry.name);
    const relPath = path.posix.join(
      relativePrefix === "." ? "" : relativePrefix,
      entry.name
    );

    if (entry.isDirectory()) {
      if (recursive) {
        results.push(
          ...collectFiles(entryPath, patternRegex, true, relPath)
        );
      }
      continue;
    }

    if (entry.isFile() && patternRegex.test(relPath)) {
      results.push(entryPath);
    }
  }

  return results;
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildTile(index, filePath, relSrc) {
  const label = `${String(index).padStart(2, "0")} · ${path.basename(filePath)}`;
  const safeLabel = escapeHtml(label);
  const safeSrc = escapeHtml(relSrc);
  return `      <figure class="tile">
        <div class="thumb">
          <img src="${safeSrc}" loading="lazy" alt="${safeLabel}">
        </div>
        <figcaption>${safeLabel}</figcaption>
      </figure>
`;
}

function buildHtml(title, tilesMarkup) {
  const inner =
    tilesMarkup.length > 0
      ? tilesMarkup.join("")
      : `      <p class="empty">No SVG files matched the provided pattern.</p>
`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
    <style>
      :root {
        color-scheme: dark;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #050505;
        color: #ececec;
      }
      body {
        margin: 0;
      }
      header {
        padding: 24px;
        border-bottom: 1px solid #1b1b1b;
      }
      h1 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 600;
      }
      main {
        padding: 24px;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
        gap: 24px;
      }
      .tile {
        background: #0c0c0c;
        border: 1px solid #1f1f1f;
        border-radius: 12px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        box-shadow: 0 8px 24px rgba(0,0,0,0.45);
      }
      .thumb {
        background: #000;
        padding: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 240px;
      }
      .thumb img {
        width: 100%;
        height: auto;
        display: block;
        background: #000;
        border-radius: 6px;
      }
      figcaption {
        font-size: 0.8rem;
        padding: 10px 14px 12px;
        color: #b5b5b5;
        border-top: 1px solid #1b1b1b;
      }
      .empty {
        grid-column: 1 / -1;
        text-align: center;
        opacity: 0.75;
      }
    </style>
  </head>
  <body>
    <header>
      <h1>${escapeHtml(title)}</h1>
    </header>
    <main>
      <div class="grid">
${inner}      </div>
    </main>
  </body>
</html>
`;
}

function main() {
  let options;
  try {
    options = parseArgs(process.argv);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    printUsage();
    process.exit(1);
  }

  const sourceDir = path.resolve(options.source);
  if (!fs.existsSync(sourceDir) || !fs.statSync(sourceDir).isDirectory()) {
    console.error(`Error: ${sourceDir} is not a directory.`);
    process.exit(1);
  }

  const outputPath = path.resolve(
    options.output || path.join(sourceDir, "gallery.html")
  );
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const patternRegex = globToRegex(options.pattern);
  const files = collectFiles(sourceDir, patternRegex, options.recursive).sort();

  const tiles = files.map((filePath, idx) => {
    const rel = path.relative(path.dirname(outputPath), filePath);
    const relPosix = rel.split(path.sep).join("/");
    return buildTile(idx + 1, filePath, relPosix);
  });

  const htmlContent = buildHtml(options.title, tiles);
  fs.writeFileSync(outputPath, htmlContent, "utf8");
  console.log(`Gallery written to ${outputPath}`);
}

if (require.main === module) {
  main();
}
