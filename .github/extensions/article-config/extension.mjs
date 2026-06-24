// Extension: article-config
// A card-based canvas for the dev team to configure the goods catalog
// ("articles") of the barnebursdag planner. It reads and writes the live
// repo file src/lib/catalog.ts: cards are grouped by category, with add /
// remove / edit / duplicate / enable and an editable CATALOG_VERSION. Changes
// land in a shared in-memory working copy and are written to disk on Save, so
// they can be committed and shared via git.

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { joinSession, createCanvas, CanvasError } from "@github/copilot-sdk/extension";

import { CATEGORY_ORDER } from "./catalog-file.mjs";
import {
    getStore,
    subscribe,
    snapshot,
    setState,
    addItem,
    updateItem,
    removeItem,
    setVersion,
    save,
    reload,
} from "./store.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "public");
// .github/extensions/article-config -> repo root is three levels up.
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const DEFAULT_REL = "src/lib/catalog.ts";

let session;

function resolveCatalogPath(input) {
    const rel = (input && typeof input.path === "string" && input.path.trim()) || DEFAULT_REL;
    if (path.isAbsolute(rel)) return rel;
    // The extension lives at <repo>/.github/extensions/article-config, so REPO_ROOT
    // (derived from its own location) is the reliable base for repo-relative paths.
    return path.resolve(REPO_ROOT, rel);
}

const CONTENT_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
};

const STATIC_FILES = {
    "/": "index.html",
    "/index.html": "index.html",
    "/styles.css": "styles.css",
    "/client.js": "client.js",
};

function sendJson(res, code, obj) {
    const body = JSON.stringify(obj);
    res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
    res.end(body);
}

function readBody(req) {
    return new Promise((resolve) => {
        let data = "";
        req.on("data", (c) => (data += c));
        req.on("end", () => {
            if (!data) return resolve({});
            try { resolve(JSON.parse(data)); } catch { resolve({}); }
        });
        req.on("error", () => resolve({}));
    });
}

async function serveStatic(res, fileName) {
    try {
        const full = path.join(PUBLIC_DIR, fileName);
        const buf = await readFile(full);
        res.writeHead(200, { "Content-Type": CONTENT_TYPES[path.extname(full)] || "application/octet-stream", "Cache-Control": "no-store" });
        res.end(buf);
    } catch {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Not found");
    }
}

function handleSse(req, res, store) {
    res.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
    });
    res.write(": connected\n\n");
    const unsub = subscribe(store, (snap) => {
        res.write(`data: ${JSON.stringify(snap)}\n\n`);
    });
    const heartbeat = setInterval(() => res.write(": hb\n\n"), 25000);
    req.on("close", () => {
        clearInterval(heartbeat);
        unsub();
    });
}

async function createInstanceServer(catalogPath) {
    const server = createServer(async (req, res) => {
        try {
            const url = new URL(req.url, "http://127.0.0.1");
            const route = url.pathname;

            if (req.method === "GET" && STATIC_FILES[route]) {
                return void (await serveStatic(res, STATIC_FILES[route]));
            }

            if (req.method === "GET" && route === "/events") {
                const store = await getStore(catalogPath);
                return void handleSse(req, res, store);
            }

            if (req.method === "GET" && route === "/api/state") {
                const store = await getStore(catalogPath);
                return void sendJson(res, 200, snapshot(store));
            }

            if (req.method === "POST" && route.startsWith("/api/")) {
                const body = await readBody(req);
                const store = await getStore(catalogPath);
                store._origin = body.clientId;
                try {
                    if (route === "/api/sync") return void sendJson(res, 200, setState(store, body));
                    if (route === "/api/save") return void sendJson(res, 200, await save(store));
                    if (route === "/api/reload") return void sendJson(res, 200, await reload(store));
                } catch (err) {
                    return void sendJson(res, 400, { error: err && err.message ? err.message : String(err) });
                }
            }

            res.writeHead(404, { "Content-Type": "text/plain" });
            res.end("Not found");
        } catch (err) {
            sendJson(res, 500, { error: err && err.message ? err.message : String(err) });
        }
    });

    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    return { server, url: `http://127.0.0.1:${port}/` };
}

// One server per open canvas instance; all servers share the file-keyed store.
const instances = new Map(); // instanceId -> { server, url, catalogPath }

async function openStatus(catalogPath) {
    try {
        const store = await getStore(catalogPath);
        return `${store.items.length} items • v${store.version}${store.dirty ? " • unsaved" : ""}`;
    } catch {
        return undefined;
    }
}

/* ---------------- agent-callable actions ---------------- */

async function defaultStore() {
    return getStore(resolveCatalogPath());
}

function groupedView(store) {
    const categories = CATEGORY_ORDER.map((id) => {
        const items = store.items.filter((i) => i.category === id);
        return { category: id, count: items.length, items };
    });
    return { filePath: store.filePath, version: store.version, dirty: store.dirty, total: store.items.length, categories };
}

const actions = [
    {
        name: "list_articles",
        description: "List all configured articles (catalog items) grouped by category, with version and unsaved-changes status.",
        handler: async () => {
            const store = await defaultStore();
            store._origin = undefined;
            return groupedView(store);
        },
    },
    {
        name: "add_article",
        description: "Add a new article to the catalog working copy. Provide at least category and name; other GoodItem fields (emoji, unit, mode, perChild, factor, packSize, priceMinNok, priceMaxNok, etc.) are optional. Does not save to disk.",
        inputSchema: {
            type: "object",
            properties: {
                category: { type: "string", enum: CATEGORY_ORDER, description: "Target category." },
                name: { type: "string" },
                emoji: { type: "string" },
                unit: { type: "string" },
                mode: { type: "string", enum: ["perChild", "perGuest", "perTable", "ageCount", "fixed"] },
                id: { type: "string", description: "Optional id; auto-generated and de-duplicated if omitted or taken." },
            },
            required: ["category", "name"],
            additionalProperties: true,
        },
        handler: async (ctx) => {
            const store = await defaultStore();
            store._origin = undefined;
            const { clientId, ...item } = ctx.input || {};
            return { added: addItem(store, item), dirty: store.dirty };
        },
    },
    {
        name: "update_article",
        description: "Patch an existing article by id. Pass the fields to change in `patch` (e.g. { priceMinNok: 30, enabled: false }). Changing `id` re-keys the article. Does not save to disk.",
        inputSchema: {
            type: "object",
            properties: {
                id: { type: "string", description: "Current id of the article to update." },
                patch: { type: "object", description: "Fields to change.", additionalProperties: true },
            },
            required: ["id"],
            additionalProperties: false,
        },
        handler: async (ctx) => {
            const input = ctx.input || {};
            if (!input.id) throw new CanvasError("invalid_input", "id is required.");
            const store = await defaultStore();
            store._origin = undefined;
            try {
                return { updated: updateItem(store, input.id, input.patch || {}), dirty: store.dirty };
            } catch (err) {
                throw new CanvasError("update_failed", err.message);
            }
        },
    },
    {
        name: "remove_article",
        description: "Remove an article from the catalog working copy by id. Does not save to disk.",
        inputSchema: {
            type: "object",
            properties: { id: { type: "string" } },
            required: ["id"],
            additionalProperties: false,
        },
        handler: async (ctx) => {
            const store = await defaultStore();
            store._origin = undefined;
            try {
                return { ...removeItem(store, (ctx.input || {}).id), dirty: store.dirty };
            } catch (err) {
                throw new CanvasError("remove_failed", err.message);
            }
        },
    },
    {
        name: "set_catalog_version",
        description: "Set CATALOG_VERSION (bump this when the default catalog's shape or content changes). Does not save to disk.",
        inputSchema: {
            type: "object",
            properties: { version: { type: "integer", minimum: 1 } },
            required: ["version"],
            additionalProperties: false,
        },
        handler: async (ctx) => {
            const store = await defaultStore();
            store._origin = undefined;
            return setVersion(store, Number((ctx.input || {}).version));
        },
    },
    {
        name: "save_catalog",
        description: "Write the current working copy to src/lib/catalog.ts on disk (regenerates the file, grouped by category). Validates ids/categories first.",
        handler: async () => {
            const store = await defaultStore();
            store._origin = undefined;
            try {
                return await save(store);
            } catch (err) {
                throw new CanvasError("save_failed", err.message);
            }
        },
    },
    {
        name: "reload_catalog",
        description: "Discard the working copy and re-read articles from src/lib/catalog.ts on disk.",
        handler: async () => {
            const store = await defaultStore();
            store._origin = undefined;
            try {
                return await reload(store);
            } catch (err) {
                throw new CanvasError("reload_failed", err.message);
            }
        },
    },
];

session = await joinSession({
    canvases: [
        createCanvas({
            id: "article-config",
            displayName: "Article catalog",
            description: "Card-based editor for the party goods catalog (articles), grouped by category, that reads/writes src/lib/catalog.ts.",
            actions,
            inputSchema: {
                type: "object",
                properties: {
                    path: { type: "string", description: "Optional path to the catalog file, relative to the repo root. Defaults to src/lib/catalog.ts." },
                },
                additionalProperties: false,
            },
            open: async (ctx) => {
                let entry = instances.get(ctx.instanceId);
                if (!entry) {
                    const catalogPath = resolveCatalogPath(ctx.input);
                    const srv = await createInstanceServer(catalogPath);
                    entry = { ...srv, catalogPath };
                    instances.set(ctx.instanceId, entry);
                }
                return {
                    title: "Article catalog",
                    url: entry.url,
                    status: await openStatus(entry.catalogPath),
                };
            },
            onClose: async (ctx) => {
                const entry = instances.get(ctx.instanceId);
                if (entry) {
                    instances.delete(ctx.instanceId);
                    await new Promise((resolve) => entry.server.close(() => resolve()));
                }
            },
        }),
    ],
});
