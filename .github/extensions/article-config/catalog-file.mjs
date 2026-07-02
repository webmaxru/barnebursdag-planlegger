// Parse and regenerate src/lib/catalog.ts for the article-config canvas.
//
// The catalog is a plain `export const DEFAULT_CATALOG: GoodItem[] = [ ... ]`
// of object literals whose values are all JSON-ish literals (strings, numbers,
// booleans, arrays, nested objects). We read it by locating the array literal
// and evaluating it; we write it back by regenerating the array body while
// preserving the original file preamble (imports + doc comments + version line).

export const CATEGORY_ORDER = ["mat", "drikke", "servise", "pynt", "godteri"];

export const SECTION_LABEL = {
    mat: "MAT",
    drikke: "DRIKKE",
    servise: "SERVISE",
    pynt: "PYNT",
    godteri: "GODTERI",
};

const MODES = ["perChild", "perGuest", "perTable", "ageCount", "fixed"];

// Stable, readable field order used when regenerating each item object.
const FIELD_ORDER = [
    "id", "name", "emoji", "category", "unit", "mode",
    "perChild", "factor", "divisor", "growOn", "fixedQty",
    "packSize", "packUnit", "priceMinNok", "priceMaxNok",
    "homeOnly", "allergyTags", "allergyScope", "altNote",
    "kassalSearch", "audience", "showIf", "breadKind", "enabled",
];

/** Locate the `[ ... ]` literal assigned to DEFAULT_CATALOG (string/comment aware). */
function locateArray(text) {
    const decl = /export\s+const\s+DEFAULT_CATALOG\s*:\s*GoodItem\[\]\s*=\s*/.exec(text);
    if (!decl) throw new Error("Could not find 'export const DEFAULT_CATALOG' in the file.");
    const preambleEnd = decl.index;
    const start = text.indexOf("[", decl.index + decl[0].length);
    if (start < 0) throw new Error("Could not find the start of the catalog array ([).");

    let depth = 0;
    let str = null; // active quote char
    for (let i = start; i < text.length; i++) {
        const c = text[i];
        if (str) {
            if (c === "\\") { i++; continue; }
            if (c === str) str = null;
            continue;
        }
        if (c === "/" && text[i + 1] === "/") {
            const nl = text.indexOf("\n", i);
            i = nl < 0 ? text.length : nl;
            continue;
        }
        if (c === "/" && text[i + 1] === "*") {
            const end = text.indexOf("*/", i + 2);
            i = end < 0 ? text.length : end + 1;
            continue;
        }
        if (c === '"' || c === "'" || c === "`") { str = c; continue; }
        if (c === "[") depth++;
        else if (c === "]") {
            depth--;
            if (depth === 0) return { preambleEnd, start, end: i };
        }
    }
    throw new Error("Could not find the end of the catalog array (]).");
}

/**
 * Parse catalog.ts text into { version, items, preamble }.
 * `preamble` is everything before `export const DEFAULT_CATALOG`, reused verbatim
 * on save (only the version number inside it is swapped).
 */
export function parseCatalog(text) {
    const verMatch = /CATALOG_VERSION\s*=\s*(\d+)/.exec(text);
    const version = verMatch ? Number(verMatch[1]) : 1;

    const { preambleEnd, start, end } = locateArray(text);
    const preamble = text.slice(0, preambleEnd);
    const arrayText = text.slice(start, end + 1);

    let items;
    try {
        // Values are all literals (no identifiers / calls), so this is safe to eval.
        items = new Function(`"use strict"; return (${arrayText});`)();
    } catch (err) {
        throw new Error("Could not parse the catalog: " + (err && err.message ? err.message : String(err)));
    }
    if (!Array.isArray(items)) throw new Error("DEFAULT_CATALOG is not an array.");

    return { version, items, preamble };
}

function quoteStr(s) {
    return "'" + String(s).replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n") + "'";
}

function keyStr(k) {
    return /^[A-Za-z_$][\w$]*$/.test(k) ? k : quoteStr(k);
}

function serializeValue(v) {
    if (v === null || v === undefined) return "undefined";
    if (typeof v === "string") return quoteStr(v);
    if (typeof v === "number") return Object.is(v, -0) ? "0" : String(v);
    if (typeof v === "boolean") return v ? "true" : "false";
    if (Array.isArray(v)) return "[" + v.map(serializeValue).join(", ") + "]";
    if (typeof v === "object") {
        const parts = Object.entries(v)
            .filter(([, vv]) => vv !== undefined)
            .map(([k, vv]) => `${keyStr(k)}: ${serializeValue(vv)}`);
        return "{ " + parts.join(", ") + " }";
    }
    return "undefined";
}

const MAX_WIDTH = 96;

function formatItem(item) {
    const seen = new Set();
    const tokens = [];
    const emit = (k) => {
        if (seen.has(k)) return;
        seen.add(k);
        const v = item[k];
        if (v === undefined || v === null) return;
        if (Array.isArray(v) && v.length === 0) return;
        tokens.push(`${keyStr(k)}: ${serializeValue(v)}`);
    };
    for (const k of FIELD_ORDER) emit(k);
    // Preserve any unexpected extra keys so we never silently drop data.
    for (const k of Object.keys(item)) emit(k);

    const indent = "    ";
    const lines = [];
    let cur = "";
    for (const t of tokens) {
        const candidate = cur ? cur + ", " + t : t;
        if (cur && indent.length + candidate.length + 1 > MAX_WIDTH) {
            lines.push(cur + ",");
            cur = t;
        } else {
            cur = candidate;
        }
    }
    if (cur) lines.push(cur);
    return "  {\n" + lines.map((l) => indent + l).join("\n") + "\n  },";
}

/** Regenerate the full catalog.ts text from { version, items, preamble }. */
export function serializeCatalog({ version, items, preamble }) {
    let head = preamble.replace(/(CATALOG_VERSION\s*=\s*)\d+/, `$1${version}`);
    head = head.replace(/\s*$/, "") + "\n";

    const used = new Set();
    const sections = [];
    for (const cat of CATEGORY_ORDER) {
        const its = items.filter((i) => i.category === cat);
        its.forEach((i) => used.add(i));
        if (!its.length) continue;
        sections.push(
            `  // ---------------- ${SECTION_LABEL[cat] || cat.toUpperCase()} ----------------\n` +
            its.map(formatItem).join("\n")
        );
    }
    const leftovers = items.filter((i) => !used.has(i));
    if (leftovers.length) {
        sections.push(
            `  // ---------------- ANNET ----------------\n` + leftovers.map(formatItem).join("\n")
        );
    }

    const body = sections.join("\n\n");
    return `${head}export const DEFAULT_CATALOG: GoodItem[] = [\n${body}\n];\n`;
}

export { MODES };
