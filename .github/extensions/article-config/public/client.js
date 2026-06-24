/* Article configuration canvas client.
 * Renders the catalog as category-grouped cards, edits a working copy in memory,
 * syncs it to the extension (debounced), and persists to src/lib/catalog.ts on Save.
 * Live updates from other panels / agent actions arrive over SSE.
 * UI text is English; the catalog data (article names, units, etc.) stays Norwegian. */

const CATS = [
  { id: "mat", label: "Food", emoji: "🍽️", color: "var(--cat-mat)" },
  { id: "drikke", label: "Drinks", emoji: "🥤", color: "var(--cat-drikke)" },
  { id: "servise", label: "Tableware & equipment", emoji: "🍴", color: "var(--cat-servise)" },
  { id: "pynt", label: "Decorations", emoji: "🎈", color: "var(--cat-pynt)" },
  { id: "godteri", label: "Candy & party bags", emoji: "🍬", color: "var(--cat-godteri)" },
];
const CAT_BY_ID = Object.fromEntries(CATS.map((c) => [c.id, c]));
const MODES = [
  { id: "perChild", label: "Per child (by age)" },
  { id: "perGuest", label: "Per guest" },
  { id: "perTable", label: "Per table" },
  { id: "ageCount", label: "Count = age" },
  { id: "fixed", label: "Fixed amount" },
];
const MODE_LABEL = Object.fromEntries(MODES.map((m) => [m.id, m.label]));
const BANDS = ["3-4", "5-6", "7-9"];
const DISH = { polser: "hot dogs", pizza: "pizza" };

const myId = "c" + Math.random().toString(36).slice(2, 10);
const app = document.getElementById("app");

let model = { items: [], version: 1, rev: 0, dirty: false, filePath: "" };
let editingId = null;
let focusNewId = null;
let pendingExternal = null;
let syncTimer = null;

/* ---------- utils ---------- */
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const num = (v) => {
  const n = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
};
function slug(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[æå]/g, "a").replace(/ø/g, "o")
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function uniqueId(base) {
  let root = slug(base) || "vare";
  if (!model.items.some((i) => i.id === root)) return root;
  let n = 2;
  while (model.items.some((i) => i.id === `${root}-${n}`)) n++;
  return `${root}-${n}`;
}
const itemById = (id) => model.items.find((i) => i.id === id);

let toastTimer = null;
function toast(msg, isErr) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = "toast show" + (isErr ? " err" : "");
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.className = "toast"; }, isErr ? 5000 : 2600);
}

/* ---------- server I/O ---------- */
async function api(path, body) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId: myId, ...(body || {}) }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}
function scheduleSync() {
  model.dirty = true;
  updateChrome();
  clearTimeout(syncTimer);
  syncTimer = setTimeout(syncNow, 350);
}
async function syncNow() {
  clearTimeout(syncTimer);
  try {
    await api("/api/sync", { items: model.items, version: model.version });
  } catch (e) {
    toast("Couldn't save working copy: " + e.message, true);
  }
}
async function save() {
  await syncNow();
  try {
    const r = await api("/api/save", {});
    model.dirty = false;
    updateChrome();
    toast("Saved to " + shortPath(r.filePath));
  } catch (e) {
    toast("Save failed: " + e.message, true);
  }
}
async function reloadFromFile() {
  try {
    const snap = await api("/api/reload", {});
    adopt(snap);
    toast("Reloaded from file");
  } catch (e) {
    toast("Couldn't read the file: " + e.message, true);
  }
}
function shortPath(p) {
  const m = /src[\\/].*/.exec(p || "");
  return m ? m[0].replace(/\\/g, "/") : p;
}

/* ---------- mutations (local) ---------- */
function addArticle(cat) {
  const id = uniqueId(cat + "-vare");
  // Default name/unit stay Norwegian so the new card fits the Norwegian catalog.
  const item = { id, name: "Ny vare", emoji: "🛒", category: cat, unit: "stk", mode: "perGuest", factor: 1, enabled: true };
  model.items.push(item);
  editingId = id;
  focusNewId = id;
  scheduleSync();
  render();
}
function duplicateArticle(id) {
  const src = itemById(id);
  if (!src) return;
  const copy = JSON.parse(JSON.stringify(src));
  copy.id = uniqueId(src.id + "-kopi");
  copy.name = src.name + " (kopi)";
  const idx = model.items.indexOf(src);
  model.items.splice(idx + 1, 0, copy);
  editingId = copy.id;
  focusNewId = copy.id;
  scheduleSync();
  render();
}
function removeArticle(id) {
  const it = itemById(id);
  if (!it) return;
  if (!confirm(`Delete "${it.name}"? This removes the item from the list.`)) return;
  model.items = model.items.filter((i) => i.id !== id);
  if (editingId === id) editingId = null;
  scheduleSync();
  render();
}
function setField(item, field, value) {
  if (value === undefined || value === "" || value === null) delete item[field];
  else item[field] = value;
}

/* ---------- SSE / conflict ---------- */
function adopt(snap) {
  model = { items: snap.items, version: snap.version, rev: snap.rev, dirty: snap.dirty, filePath: snap.filePath };
  editingId = null;
  pendingExternal = null;
  render();
}
function onSnapshot(snap) {
  model.rev = snap.rev;
  if (snap.origin === myId) {
    model.dirty = snap.dirty;
    updateChrome();
    return;
  }
  if (editingId || model.dirty) {
    pendingExternal = snap;
    showBanner();
  } else {
    adopt(snap);
  }
}
function showBanner() {
  if (document.querySelector(".banner")) return;
  const wrap = document.querySelector(".wrap");
  if (!wrap) return;
  const node = document.getElementById("tpl-banner").content.cloneNode(true);
  node.querySelector(".banner-text").textContent =
    "The list changed elsewhere (agent or another tab). Your unsaved changes were kept.";
  wrap.insertBefore(node, wrap.firstChild);
}
function connectSSE() {
  const es = new EventSource("/events");
  es.onmessage = (e) => {
    try { onSnapshot(JSON.parse(e.data)); } catch {}
  };
  es.onerror = () => {};
}

/* ---------- rendering ---------- */
function priceText(it) {
  if (it.priceMinNok == null && it.priceMaxNok == null) return null;
  if (it.priceMinNok != null && it.priceMaxNok != null && it.priceMinNok !== it.priceMaxNok)
    return `${it.priceMinNok}–${it.priceMaxNok} kr`;
  return `${it.priceMaxNok ?? it.priceMinNok} kr`;
}
function cardBadges(it) {
  const b = [];
  b.push(`<span class="badge mode">${esc(MODE_LABEL[it.mode] || it.mode)}</span>`);
  const p = priceText(it);
  if (p) b.push(`<span class="badge price">${esc(p)}</span>`);
  if (it.packUnit) b.push(`<span class="badge">${esc(it.packUnit)}</span>`);
  else if (it.unit) b.push(`<span class="badge">${esc(it.unit)}</span>`);
  if (it.homeOnly) b.push(`<span class="badge warn">Home only</span>`);
  if (it.audience === "kids") b.push(`<span class="badge">Kids only</span>`);
  if (it.showIf && it.showIf.mainDish) b.push(`<span class="badge">Only ${esc(DISH[it.showIf.mainDish] || it.showIf.mainDish)}</span>`);
  if (it.allergyScope) b.push(`<span class="badge">Allergy-safe: ${esc(it.allergyScope)}</span>`);
  (it.allergyTags || []).forEach((t) => b.push(`<span class="badge tag">contains ${esc(t)}</span>`));
  if (!it.enabled) b.push(`<span class="badge">Hidden</span>`);
  return b.join("");
}
function field(label, inner, cls) {
  return `<label class="field ${cls || ""}"><span>${label}</span>${inner}</label>`;
}
function selectField(label, id, fieldName, options, value, cls) {
  const opts = options
    .map((o) => `<option value="${esc(o.id)}"${o.id === (value ?? "") ? " selected" : ""}>${esc(o.label)}</option>`)
    .join("");
  return field(label, `<select data-id="${esc(id)}" data-field="${fieldName}">${opts}</select>`, cls);
}
function textField(label, id, fieldName, value, cls, attrs) {
  return field(label, `<input type="text" data-id="${esc(id)}" data-field="${fieldName}" value="${esc(value)}" ${attrs || ""} />`, cls);
}
function numField(label, id, fieldName, value, step) {
  return field(label, `<input type="number" step="${step || "1"}" data-id="${esc(id)}" data-field="${fieldName}" value="${value ?? ""}" />`);
}
function checkField(label, id, fieldName, checked) {
  return `<label class="field check"><input type="checkbox" data-id="${esc(id)}" data-field="${fieldName}"${checked ? " checked" : ""} /><span>${label}</span></label>`;
}

function renderEditor(it) {
  let modeBlock = "";
  if (it.mode === "perChild") {
    const pc = it.perChild || {};
    modeBlock =
      `<div class="field full"><span>Amount per child by age</span><div class="band">` +
      BANDS.map(
        (band) =>
          `<label class="field"><span>${band} yrs</span><input type="number" step="0.5" data-id="${esc(it.id)}" data-field="perChild.${band}" value="${pc[band] ?? 0}" /></label>`
      ).join("") +
      `</div></div>`;
  } else if (it.mode === "perGuest" || it.mode === "perTable") {
    modeBlock = numField(`Factor (per ${it.mode === "perTable" ? "table" : "guest"})`, it.id, "factor", it.factor ?? 1, "0.1");
    if (it.mode === "perTable") modeBlock += numField("Guests per unit", it.id, "divisor", it.divisor ?? 8);
  } else if (it.mode === "fixed") {
    modeBlock = numField("Fixed amount", it.id, "fixedQty", it.fixedQty ?? 1);
  } else if (it.mode === "ageCount") {
    modeBlock = `<div class="field full">${checkField('+ 1 extra ("one to grow on")', it.id, "growOn", !!it.growOn)}</div>`;
  }

  const advanced =
    `<details class="adv"${it.homeOnly || it.audience || it.allergyScope || (it.allergyTags && it.allergyTags.length) || it.altNote || (it.showIf && it.showIf.mainDish) || it.breadKind ? " open" : ""}>` +
    `<summary>Advanced fields (allergy, visibility, bread)</summary><div class="fields">` +
    checkField("Home party only (hide in kindergarten)", it.id, "homeOnly", !!it.homeOnly) +
    selectField("Who eats", it.id, "audience", [
      { id: "", label: "Default" },
      { id: "all", label: "Kids + adults" },
      { id: "kids", label: "Kids only" },
    ], it.audience) +
    selectField("Show only for main dish", it.id, "showIf.mainDish", [
      { id: "", label: "Always" },
      { id: "polser", label: "Hot dogs" },
      { id: "pizza", label: "Pizza" },
    ], it.showIf && it.showIf.mainDish) +
    selectField("Bread type", it.id, "breadKind", [
      { id: "", label: "Not bread" },
      { id: "lompe", label: "Lompe" },
      { id: "polsebrod", label: "Hot dog bun" },
    ], it.breadKind) +
    textField("Allergy-safe for (scope)", it.id, "allergyScope", it.allergyScope || "", "", 'placeholder="e.g. gluten"') +
    textField("Contains (comma-separated)", it.id, "allergyTags", (it.allergyTags || []).join(", "), "full", 'placeholder="svin, melk, egg"') +
    field("Alternative note", `<textarea data-id="${esc(it.id)}" data-field="altNote" placeholder="Shown when an allergy filter matches">${esc(it.altNote || "")}</textarea>`, "full") +
    `</div></details>`;

  return (
    `<div class="editor"><div class="fields">` +
    textField("Name", it.id, "name", it.name, "full") +
    textField("Emoji", it.id, "emoji", it.emoji || "", "", 'maxlength="4"') +
    textField("ID (key)", it.id, "id", it.id, "", 'spellcheck="false"') +
    selectField("Category", it.id, "category", CATS.map((c) => ({ id: c.id, label: c.label })), it.category) +
    textField("Unit", it.id, "unit", it.unit, "", 'placeholder="stk, dl, g"') +
    selectField("Calculation", it.id, "mode", MODES.map((m) => ({ id: m.id, label: m.label })), it.mode) +
    modeBlock +
    numField("Pack size", it.id, "packSize", it.packSize, "1") +
    textField("Pack label", it.id, "packUnit", it.packUnit || "", "", 'placeholder="pakke (8 stk)"') +
    numField("Price from (kr)", it.id, "priceMinNok", it.priceMinNok, "1") +
    numField("Price to (kr)", it.id, "priceMaxNok", it.priceMaxNok, "1") +
    textField("Kassal search", it.id, "kassalSearch", it.kassalSearch || "", "full", 'placeholder="search term for live price"') +
    advanced +
    `</div><div class="editor-foot">` +
    `<button type="button" class="btn primary small" data-act="done">Done</button>` +
    `<span class="spacer"></span>` +
    `<button type="button" class="btn danger small" data-act="del" data-id="${esc(it.id)}">Delete item</button>` +
    `</div></div>`
  );
}

function renderCard(it) {
  const cat = CAT_BY_ID[it.category] || { color: "var(--line)" };
  const editing = editingId === it.id;
  return (
    `<article class="card${it.enabled ? "" : " disabled"}${editing ? " editing" : ""}" style="--cat:${cat.color}" data-card="${esc(it.id)}">` +
    `<div class="card-top">` +
    `<div class="ico">${esc(it.emoji || "📦")}</div>` +
    `<div class="title"><div class="nm">${esc(it.name)}</div><div class="id">${esc(it.id)}</div></div>` +
    `<label class="switch" title="${it.enabled ? "Active" : "Hidden"}"><input type="checkbox" data-act="toggle" data-id="${esc(it.id)}"${it.enabled ? " checked" : ""} aria-label="Toggle item" /><span class="track"></span></label>` +
    `</div>` +
    `<div class="badges">${cardBadges(it)}</div>` +
    (editing
      ? renderEditor(it)
      : `<div class="card-actions">` +
        `<button type="button" class="btn small" data-act="edit" data-id="${esc(it.id)}">Edit</button>` +
        `<button type="button" class="btn ghost small" data-act="dup" data-id="${esc(it.id)}" title="Duplicate">Duplicate</button>` +
        `<span class="spacer"></span>` +
        `<button type="button" class="btn ghost icon" data-act="del" data-id="${esc(it.id)}" title="Delete" aria-label="Delete">🗑️</button>` +
        `</div>`) +
    `</article>`
  );
}

function renderSection(cat) {
  const items = model.items.filter((i) => i.category === cat.id);
  const cards = items.length
    ? `<div class="grid">${items.map(renderCard).join("")}</div>`
    : `<div class="empty">No items in this category yet.</div>`;
  return (
    `<section class="section" style="--cat:${cat.color}" id="sec-${cat.id}">` +
    `<div class="section-head">` +
    `<span class="emoji">${cat.emoji}</span>` +
    `<h2>${esc(cat.label)}</h2><span class="n">${items.length} ${items.length === 1 ? "item" : "items"}</span>` +
    `<span class="spacer"></span>` +
    `<button type="button" class="btn small add-here" data-act="add" data-cat="${cat.id}">+ Add</button>` +
    `</div>${cards}</section>`
  );
}

function summaryHtml() {
  const total = model.items.length;
  const active = model.items.filter((i) => i.enabled).length;
  const parts = [
    `<span class="chip">📦 <b>${total}</b> items total</span>`,
    `<span class="chip">✅ <b>${active}</b> active</span>`,
  ];
  for (const c of CATS) {
    const n = model.items.filter((i) => i.category === c.id).length;
    parts.push(`<span class="chip"><span class="swatch" style="background:${c.color}"></span>${esc(c.label)} <b>${n}</b></span>`);
  }
  return parts.join("");
}

function render() {
  app.setAttribute("aria-busy", "false");
  app.innerHTML =
    `<header class="topbar">` +
    `<div class="brand"><h1><span class="dot"></span> Article catalog</h1><div class="path">${esc(shortPath(model.filePath) || "src/lib/catalog.ts")}</div></div>` +
    `<div class="tools">` +
    `<span class="dirty-flag${model.dirty ? "" : " clean"}" id="dirtyFlag"><span class="pip"></span>${model.dirty ? "Unsaved changes" : "Saved"}</span>` +
    `<span class="ver"><label>CATALOG_VERSION</label><input type="number" min="1" step="1" data-field="version" value="${model.version}" aria-label="Catalog version" /><button type="button" class="btn icon small bump" data-act="bump" title="Increase version (+1)">+</button></span>` +
    `<button type="button" class="btn small" data-act="reload" title="Discard and reload from file">↺ Reload file</button>` +
    `<button type="button" class="btn primary" data-act="save" id="saveBtn"${model.dirty ? "" : " disabled"}>💾 Save to file</button>` +
    `</div></header>` +
    `<div class="wrap">` +
    `<div class="summary" id="summary">${summaryHtml()}</div>` +
    CATS.map(renderSection).join("") +
    `</div>`;

  if (pendingExternal) showBanner();

  if (focusNewId) {
    const card = app.querySelector(`[data-card="${CSS.escape(focusNewId)}"]`);
    if (card) {
      card.scrollIntoView({ behavior: "smooth", block: "center" });
      const nameInput = card.querySelector('input[data-field="name"]');
      if (nameInput) { nameInput.focus(); nameInput.select(); }
    }
    focusNewId = null;
  }
}

function updateChrome() {
  const flag = document.getElementById("dirtyFlag");
  if (flag) {
    flag.className = "dirty-flag" + (model.dirty ? "" : " clean");
    flag.innerHTML = `<span class="pip"></span>${model.dirty ? "Unsaved changes" : "Saved"}`;
  }
  const save = document.getElementById("saveBtn");
  if (save) save.disabled = !model.dirty;
  const sum = document.getElementById("summary");
  if (sum) sum.innerHTML = summaryHtml();
  const ver = app.querySelector('input[data-field="version"]');
  if (ver && document.activeElement !== ver) ver.value = model.version;
}

/* ---------- events ---------- */
app.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-act]");
  if (!btn) return;
  const act = btn.dataset.act;
  const id = btn.dataset.id;
  if (act === "save") return void save();
  if (act === "reload") return void reloadFromFile();
  if (act === "reload-external") return void (pendingExternal && adopt(pendingExternal));
  if (act === "bump") { model.version = (Number(model.version) || 1) + 1; scheduleSync(); updateChrome(); return; }
  if (act === "add") return addArticle(btn.dataset.cat);
  if (act === "edit") { editingId = id; render(); return; }
  if (act === "done") { editingId = null; render(); return; }
  if (act === "dup") return duplicateArticle(id);
  if (act === "del") return removeArticle(id);
});

app.addEventListener("input", (e) => {
  const el = e.target;
  if (!el.dataset || !el.dataset.field) return;
  if (el.dataset.field === "version" && !el.dataset.id) {
    model.version = Math.max(1, Math.round(num(el.value) || 1));
    scheduleSync();
    return;
  }
  if (el.tagName === "SELECT") return; // handled on change
  applyField(el);
});

app.addEventListener("change", (e) => {
  const el = e.target;
  if (el.dataset && el.dataset.act === "toggle") {
    const it = itemById(el.dataset.id);
    if (it) {
      it.enabled = el.checked;
      el.closest(".card").classList.toggle("disabled", !it.enabled);
      scheduleSync();
    }
    return;
  }
  if (el.tagName === "SELECT" && el.dataset.field) applyField(el, true);
});

function applyField(el, isChange) {
  const it = itemById(el.dataset.id);
  if (!it) return;
  const f = el.dataset.field;
  const isNum = el.type === "number";
  const isCheck = el.type === "checkbox";
  const raw = isCheck ? el.checked : el.value;

  if (f === "id") {
    const next = slug(raw) || it.id;
    if (next !== it.id) {
      if (model.items.some((x) => x !== it && x.id === next)) { toast("ID already exists", true); return; }
      if (editingId === it.id) editingId = next;
      it.id = next;
      el.value = next;
      const card = el.closest(".card");
      if (card) { card.dataset.card = next; card.querySelector(".title .id").textContent = next; }
    }
    scheduleSync();
    return;
  }

  if (f.startsWith("perChild.")) {
    const band = f.split(".")[1];
    it.perChild = { "3-4": 0, "5-6": 0, "7-9": 0, ...(it.perChild || {}) };
    it.perChild[band] = num(raw) ?? 0;
    scheduleSync();
    return;
  }
  if (f === "showIf.mainDish") {
    if (raw) it.showIf = { mainDish: raw };
    else delete it.showIf;
    scheduleSync();
    return;
  }
  if (f === "allergyTags") {
    const tags = String(raw).split(",").map((s) => s.trim()).filter(Boolean);
    if (tags.length) it.allergyTags = tags;
    else delete it.allergyTags;
    scheduleSync();
    return;
  }
  if (isCheck) {
    if (raw) it[f] = true; else delete it[f];
    scheduleSync();
    return;
  }
  if (isNum) {
    setField(it, f, num(raw));
    scheduleSync();
    return;
  }

  // plain string fields
  setField(it, f, raw);

  if (f === "name") {
    const card = el.closest(".card");
    if (card) card.querySelector(".title .nm").textContent = raw || "Ny vare";
  } else if (f === "emoji") {
    const card = el.closest(".card");
    if (card) card.querySelector(".ico").textContent = raw || "📦";
  }

  if (isChange && (f === "category" || f === "mode")) {
    scheduleSync();
    render();
    return;
  }
  scheduleSync();
}

/* ---------- boot ---------- */
(async function init() {
  try {
    const res = await fetch("/api/state");
    const snap = await res.json();
    model = { items: snap.items, version: snap.version, rev: snap.rev, dirty: snap.dirty, filePath: snap.filePath };
    render();
    connectSSE();
  } catch (e) {
    app.innerHTML = `<div class="error-box"><h2>Couldn't load the catalog</h2><p>${esc(e.message || e)}</p><p>Check that <code>src/lib/catalog.ts</code> exists and can be parsed.</p></div>`;
  }
})();
