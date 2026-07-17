import { existsSync, readFileSync } from "node:fs";
import { normalize, resolve } from "node:path";

function emit(code, diagnostic, message, inputPath, profile = "canvas") {
  const payload = {
    ok: code === 0,
    code,
    diagnostic,
    message,
    input: normalize(inputPath),
    profile,
  };
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

function parseArgs(argv) {
  const parsed = {
    inputPath: "",
    profile: "canvas",
    json: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--json") {
      parsed.json = true;
      continue;
    }

    if (arg === "--profile") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("Expected a profile name after --profile.");
      }
      parsed.profile = value;
      index += 1;
      continue;
    }

    if (arg.startsWith("--profile=")) {
      parsed.profile = arg.slice("--profile=".length);
      continue;
    }

    if (arg.startsWith("--")) {
      throw new Error(`Unsupported option: ${arg}`);
    }

    if (parsed.inputPath) {
      throw new Error("Expected a single HTML fixture path.");
    }

    parsed.inputPath = arg;
  }

  if (!parsed.inputPath) {
    throw new Error("Expected a single HTML fixture path.");
  }

  return parsed;
}

function validateCanvasProfile(html) {
  const failures = [];
  const documentMarkup = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");

  const htmlTagCount = (documentMarkup.match(/<html\b/gi) ?? []).length;
  const htmlCloseCount = (documentMarkup.match(/<\/html>/gi) ?? []).length;
  const bodyTagCount = (documentMarkup.match(/<body\b/gi) ?? []).length;
  const doctypeCount = (documentMarkup.match(/<!doctype\s+html>/gi) ?? []).length;
  if (htmlTagCount !== 1 || htmlCloseCount !== 1 || bodyTagCount !== 1 || doctypeCount > 1) {
    failures.push("one HTML document");
  }

  const remoteReferenceMatches = [
    ...html.matchAll(/\b(?:src|href|poster|action)\s*=\s*(["'])(https?:|\/\/)[^"']*\1/gi),
    ...html.matchAll(/url\(\s*(["']?)(https?:|\/\/)[^)"']*\1\s*\)/gi),
  ];
  if (remoteReferenceMatches.length > 0) {
    failures.push("no remote references");
  }

  const scriptMatches = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
  const hasInlineImpressAsset = scriptMatches.some(([, attrs, body]) => !/\bsrc\s*=/.test(attrs) && /impress/i.test(body));
  if (!hasInlineImpressAsset) {
    failures.push("inline impress asset");
  }

  const stepMatches = [...documentMarkup.matchAll(/<[^>]+\bclass\s*=\s*(["'])([^"']*\bstep\b[^"']*)\1/gi)];
  if (stepMatches.length === 0) {
    failures.push("at least one step");
  }

  const overviewMatches = [...documentMarkup.matchAll(/<[^>]+\bclass\s*=\s*(["'])([^"']*\boverview\b[^"']*)\1/gi)];
  if (overviewMatches.length === 0) {
    failures.push("overview step");
  }

  const explicitCspMeta = /<meta\b[^>]*http-equiv\s*=\s*["']content-security-policy["'][^>]*>/i.test(html);
  const hasCspSafePolicy = explicitCspMeta || (!remoteReferenceMatches.length && hasInlineImpressAsset);
  if (!hasCspSafePolicy) {
    failures.push("CSP-safe policy");
  }

  return failures;
}

function main() {
  try {
    const parsed = parseArgs(process.argv.slice(2));

    if (parsed.profile !== "canvas") {
      emit(2, "SILMARIL_INVALID_ARGUMENT", "Unsupported profile. Expected 'canvas'.", parsed.inputPath, parsed.profile);
      process.exit(2);
    }

    const resolvedInput = resolve(parsed.inputPath);
    if (!existsSync(resolvedInput)) {
      emit(2, "SILMARIL_INVALID_ARGUMENT", "Input file does not exist.", resolvedInput, parsed.profile);
      process.exit(2);
    }

    let html;
    try {
      html = readFileSync(resolvedInput, "utf8");
    } catch {
      emit(2, "SILMARIL_INVALID_ARGUMENT", "Input file could not be read.", resolvedInput, parsed.profile);
      process.exit(2);
    }

    const failures = validateCanvasProfile(html);
    if (failures.length === 0) {
      emit(0, "SILMARIL_OK", "Canvas profile validation passed.", resolvedInput, parsed.profile);
      process.exit(0);
    }

    emit(1, "SILMARIL_CANVAS_PROFILE_VALIDATION_FAILED", `Canvas profile validation failed: ${failures.join(", ")}.`, resolvedInput, parsed.profile);
    process.exit(1);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    emit(2, "SILMARIL_INTERNAL_ERROR", message, "", "canvas");
    process.exit(2);
  }
}

main();
