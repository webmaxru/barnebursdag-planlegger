// Shared, file-path-keyed working copy of the catalog for the article-config canvas.
//
// State is keyed by the absolute catalog file path (the durable domain id), NOT
// by canvas instanceId — so multiple open panels and agent actions all edit the
// same in-memory copy and stay in sync. Nothing is written to disk until save().

import { readFile, writeFile } from "node:fs/promises";
import {
    parseCatalog,
    serializeCatalog,
    CATEGORY_ORDER,
    MODES,
} from "./catalog-file.mjs";

const stores = new Map(); // filePath -> store

function slug(s) {
    return String(s || "")
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[æå]/g, "a")
        .replace(/ø/g, "o")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

export function uniqueId(items, base) {
    let root = slug(base) || "vare";
    if (!items.some((i) => i.id === root)) return root;
    let n = 2;
    while (items.some((i) => i.id === `${root}-${n}`)) n++;
    return `${root}-${n}`;
}

function normalizeNew(items, raw = {}) {
    const category = CATEGORY_ORDER.includes(raw.category) ? raw.category : "mat";
    const mode = MODES.includes(raw.mode) ? raw.mode : "perGuest";
    const item = {
        id: raw.id ? uniqueId(items, raw.id) : uniqueId(items, raw.name || category),
        name: raw.name || "Ny vare",
        emoji: raw.emoji || "🛒",
        category,
        unit: raw.unit || "stk",
        mode,
        enabled: raw.enabled !== false,
    };
    const carry = [
        "perChild", "factor", "divisor", "growOn", "fixedQty",
        "packSize", "packUnit", "priceMinNok", "priceMaxNok",
        "homeOnly", "allergyTags", "allergyScope", "altNote",
        "kassalSearch", "audience", "showIf", "breadKind",
    ];
    for (const k of carry) if (raw[k] !== undefined) item[k] = raw[k];
    if ((mode === "perGuest" || mode === "perTable") && item.factor === undefined) item.factor = 1;
    return item;
}

function broadcast(store) {
    const snap = snapshot(store);
    for (const fn of store.listeners) {
        try { fn(snap); } catch { /* listener errors are non-fatal */ }
    }
}

export function snapshot(store) {
    return {
        rev: store.rev,
        dirty: store.dirty,
        version: store.version,
        filePath: store.filePath,
        origin: store._origin,
        items: store.items,
    };
}

async function load(filePath) {
    const text = await readFile(filePath, "utf8");
    const { version, items, preamble } = parseCatalog(text);
    return { filePath, version, items, preamble, rev: 1, dirty: false, listeners: new Set() };
}

export async function getStore(filePath) {
    let store = stores.get(filePath);
    if (!store) {
        store = await load(filePath);
        stores.set(filePath, store);
    }
    return store;
}

export function subscribe(store, fn) {
    store.listeners.add(fn);
    return () => store.listeners.delete(fn);
}

/** Replace the whole working copy (used by the iframe sync endpoint). */
export function setState(store, { items, version }) {
    if (Array.isArray(items)) store.items = items;
    if (typeof version === "number" && Number.isFinite(version)) store.version = version;
    store.dirty = true;
    store.rev++;
    broadcast(store);
    return snapshot(store);
}

export function addItem(store, raw) {
    const item = normalizeNew(store.items, raw);
    store.items.push(item);
    store.dirty = true;
    store.rev++;
    broadcast(store);
    return item;
}

export function updateItem(store, id, patch = {}) {
    const idx = store.items.findIndex((i) => i.id === id);
    if (idx < 0) throw new Error("No item found with id: " + id);
    if (patch.id && patch.id !== id && store.items.some((i, j) => j !== idx && i.id === patch.id)) {
        throw new Error("ID already exists: " + patch.id);
    }
    const next = { ...store.items[idx], ...patch };
    store.items[idx] = next;
    store.dirty = true;
    store.rev++;
    broadcast(store);
    return next;
}

export function removeItem(store, id) {
    const before = store.items.length;
    store.items = store.items.filter((i) => i.id !== id);
    if (store.items.length === before) throw new Error("No item found with id: " + id);
    store.dirty = true;
    store.rev++;
    broadcast(store);
    return { removed: id };
}

export function setVersion(store, version) {
    if (!Number.isFinite(version)) throw new Error("Invalid version.");
    store.version = version;
    store.dirty = true;
    store.rev++;
    broadcast(store);
    return snapshot(store);
}

export function validate(items) {
    const errors = [];
    const ids = new Set();
    items.forEach((it, i) => {
        const where = it.name || it.id || `#${i + 1}`;
        if (!it.id || !/^[a-z0-9][a-z0-9-]*$/i.test(it.id)) errors.push(`Invalid id on "${where}".`);
        else if (ids.has(it.id)) errors.push(`Duplicate id: ${it.id}.`);
        else ids.add(it.id);
        if (!it.name || !it.name.trim()) errors.push(`Item "${it.id || where}" is missing a name.`);
        if (!CATEGORY_ORDER.includes(it.category)) errors.push(`Item "${where}" has an invalid category.`);
        if (!MODES.includes(it.mode)) errors.push(`Item "${where}" has an invalid calculation mode.`);
    });
    if (errors.length) throw new Error(errors.join(" "));
}

export async function save(store) {
    validate(store.items);
    const text = serializeCatalog(store);
    await writeFile(store.filePath, text, "utf8");
    store.dirty = false;
    store.rev++;
    broadcast(store);
    return { filePath: store.filePath, bytes: Buffer.byteLength(text, "utf8") };
}

export async function reload(store) {
    const text = await readFile(store.filePath, "utf8");
    const { version, items, preamble } = parseCatalog(text);
    store.version = version;
    store.items = items;
    store.preamble = preamble;
    store.dirty = false;
    store.rev++;
    broadcast(store);
    return snapshot(store);
}
