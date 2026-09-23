/* Specter Prototype tracker — rendering logic. Edit data.js, not this file, to update content. */

/* ---------- Dashboard ---------- */

function renderDashboard() {
  const openTasks = taskItems.filter((t) => !t.done).length;
  const doneTasks = taskItems.filter((t) => t.done).length;
  const benchOpen = benchItems.filter((b) => b.status !== "approved").length;
  const shipmentsInbound = shipments.filter((s) => s.status !== "delivered").length;
  const blockedSystems = DATA.systems.filter((s) => s.status === "blocked").length;

  document.getElementById("dashboard").innerHTML = `
    <h1>Development Dashboard</h1>
    <p class="view-sub">${DATA.meta.tagline}</p>

    <div class="grid">
      <div class="card card-link" data-nav="tasks">
        <div class="card-title">Open Tasks</div>
        <div class="card-value">${openTasks}</div>
      </div>
      <div class="card card-link" data-nav="tasks">
        <div class="card-title">Completed Tasks</div>
        <div class="card-value">${doneTasks}</div>
      </div>
      <div class="card card-link" data-nav="bench">
        <div class="card-title">Bench Decisions Needed</div>
        <div class="card-value">${benchOpen}</div>
      </div>
      <div class="card card-link" data-nav="shipments">
        <div class="card-title">Shipments Inbound</div>
        <div class="card-value">${shipmentsInbound}</div>
      </div>
      ${blockedSystems > 0 ? `
      <div class="card">
        <div class="card-title">Blocked Systems</div>
        <div class="card-value" style="color:var(--red)">${blockedSystems}</div>
      </div>` : ""}
    </div>

    <h2>Recent Log Entries</h2>
    ${allLogEntries().slice(0, 3).map(logEntryHtml).join("") || `<p class="view-sub">No entries yet.</p>`}
  `;

  document.querySelectorAll("#dashboard .card-link").forEach((card) => {
    card.addEventListener("click", () => showView(card.dataset.nav));
  });
}


/* ---------- Tasks ---------- */
/*
 * Things to check, measure or decide at the shop — nothing to buy (that's
 * what Bench is for). No backend, so persisted per-browser in localStorage.
 */

const TASK_STORAGE_KEY = "specter-task-items";
let taskItems = [];
let taskFormOpen = false;
let taskLinkCounter = 0;
let taskEditingId = null;

function loadTaskItems() {
  try {
    const raw = localStorage.getItem(TASK_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [];
}

function saveTaskItems() {
  try { localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(taskItems)); } catch (e) {}
}

function taskLinkRowHtml(rowId, link) {
  link = link || {};
  return `
    <div class="bench-link-row" data-row-id="${rowId}">
      <input type="text" class="al-label" placeholder="Link name (optional)" value="${escapeAttr(link.label || "")}" />
      <input type="url" class="al-url" placeholder="https://..." value="${escapeAttr(link.url || "")}" />
      <button type="button" class="bench-remove-option" data-remove-link="${rowId}">Remove</button>
    </div>
  `;
}

function taskFormHtml() {
  const editing = taskEditingId ? taskItems.find((i) => i.id === taskEditingId) : null;
  const linkRowsHtml = editing
    ? editing.links.map((l, i) => taskLinkRowHtml("pl" + i, l)).join("")
    : "";

  return `
    <div class="bench-form-panel">
      <h2 class="bench-form-title">${editing ? "Edit task" : "Add a task"}</h2>
      <p class="view-sub">Something to check, measure or decide at the shop.</p>

      <form id="task-form">
        <label class="field-label" for="af-name">Your name</label>
        <input type="text" id="af-name" value="${editing ? escapeAttr(editing.submitter) : ""}" required />

        <label class="field-label" for="af-what">What needs doing</label>
        <input type="text" id="af-what" placeholder="e.g. Confirm the rear door pattern" value="${editing ? escapeAttr(editing.whatNeedsDoing) : ""}" required />

        <label class="field-label" for="af-category">Category</label>
        <input type="text" id="af-category" placeholder="e.g. Interior" value="${editing ? escapeAttr(editing.category) : ""}" />
        <div class="bench-pills" id="task-category-pills">
          ${BENCH_CATEGORIES.map((c) => `<button type="button" class="pill ${editing && editing.category === c ? "active" : ""}" data-cat="${escapeAttr(c)}">${escapeHtml(c)}</button>`).join("")}
        </div>

        <label class="field-label" for="af-reason">What to check or decide, and why</label>
        <textarea id="af-reason" rows="3" required>${editing ? escapeHtml(editing.reason) : ""}</textarea>

        <label class="field-label" for="af-checkfirst">Check first (optional)</label>
        <textarea id="af-checkfirst" rows="2">${editing ? escapeHtml(editing.checkFirst) : ""}</textarea>

        <div class="bench-options-divider">Reference links (optional)</div>
        <div id="task-links-container">${linkRowsHtml}</div>
        <button type="button" id="task-add-link" class="bench-secondary-btn bench-add-link-btn">+ Add a link</button>

        <div class="bench-form-actions">
          <button type="button" id="task-cancel" class="bench-secondary-btn">Cancel</button>
          <button type="submit" class="bench-primary-btn">${editing ? "Save changes" : "Add"}</button>
        </div>
      </form>
    </div>
  `;
}

function wireTaskForm() {
  const pills = document.getElementById("task-category-pills");
  const categoryInput = document.getElementById("af-category");
  pills.addEventListener("click", (e) => {
    const btn = e.target.closest(".pill");
    if (!btn) return;
    categoryInput.value = btn.dataset.cat;
    pills.querySelectorAll(".pill").forEach((p) => p.classList.toggle("active", p === btn));
  });

  const linksContainer = document.getElementById("task-links-container");

  document.getElementById("task-add-link").addEventListener("click", () => {
    taskLinkCounter += 1;
    linksContainer.insertAdjacentHTML("beforeend", taskLinkRowHtml("l" + taskLinkCounter));
  });

  linksContainer.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-remove-link]");
    if (!btn) return;
    document.querySelector(`.bench-link-row[data-row-id="${btn.dataset.removeLink}"]`).remove();
  });

  document.getElementById("task-cancel").addEventListener("click", () => {
    closeTaskForm();
  });

  document.getElementById("task-form").addEventListener("submit", (e) => {
    e.preventDefault();

    const links = Array.from(linksContainer.querySelectorAll(".bench-link-row"))
      .map((row) => ({
        label: row.querySelector(".al-label").value.trim(),
        url: row.querySelector(".al-url").value.trim(),
      }))
      .filter((l) => l.url)
      .map((l) => ({ label: l.label || l.url, url: l.url }));

    const submitter = document.getElementById("af-name").value.trim();
    const whatNeedsDoing = document.getElementById("af-what").value.trim();
    const category = document.getElementById("af-category").value.trim();
    const reason = document.getElementById("af-reason").value.trim();
    const checkFirst = document.getElementById("af-checkfirst").value.trim();

    if (taskEditingId) {
      const item = taskItems.find((i) => i.id === taskEditingId);
      if (item) {
        item.submitter = submitter;
        item.whatNeedsDoing = whatNeedsDoing;
        item.category = category;
        item.reason = reason;
        item.checkFirst = checkFirst;
        item.links = links;
      }
    } else {
      taskItems.unshift({
        id: "task" + Date.now(),
        createdAt: new Date().toISOString().slice(0, 10),
        submitter,
        whatNeedsDoing,
        category,
        reason,
        checkFirst,
        links,
        done: false,
        doneAt: null,
      });
    }

    saveTaskItems();
    closeTaskForm();
  });
}

function openTaskForm(item) {
  taskFormOpen = true;
  taskEditingId = item ? item.id : null;
  taskLinkCounter = item ? item.links.length : 0;
  renderTasks();
}

function closeTaskForm() {
  taskFormOpen = false;
  taskEditingId = null;
  renderTasks();
  renderDashboard();
}

function taskItemCardHtml(item) {
  return `
    <div class="bench-item-card">
      <div class="item-head">
        <div class="item-name">
          ${escapeHtml(item.whatNeedsDoing)}
          ${item.category ? `<span class="item-cat">${escapeHtml(item.category)}</span>` : ""}
          ${editIconHtml(item.id)}
        </div>
        <span class="badge ${item.done ? "badge-complete" : "badge-in-progress"}">${item.done ? "Done" : "Open"}</span>
      </div>
      <div class="bench-item-meta">Added by ${escapeHtml(item.submitter || "Unknown")} &middot; ${escapeHtml(item.createdAt)}</div>
      <div class="item-notes">${escapeHtml(item.reason)}</div>
      ${item.checkFirst ? `<p class="bench-before"><strong>Check first:</strong> ${escapeHtml(item.checkFirst)}</p>` : ""}
      ${item.links.length ? `
        <div class="bench-more-links">
          ${item.links.map((l) => `<a href="${escapeAttr(l.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(l.label)}</a>`).join("")}
        </div>` : ""}

      <div class="bench-item-actions">
        ${item.done
          ? `<button type="button" class="bench-secondary-btn task-reopen-btn" data-item="${item.id}">Reopen</button>`
          : `<button type="button" class="bench-approve-btn" data-item="${item.id}">Mark done</button>`}
        <button type="button" class="bench-delete-item" data-item="${item.id}">Delete</button>
      </div>
    </div>
  `;
}

function wireTaskList() {
  document.querySelectorAll("#tasks [data-edit-item]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = taskItems.find((i) => i.id === btn.dataset.editItem);
      if (item) openTaskForm(item);
    });
  });

  document.querySelectorAll("#tasks .task-reopen-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = taskItems.find((i) => i.id === btn.dataset.item);
      if (!item) return;
      item.done = false;
      item.doneAt = null;
      saveTaskItems();
      renderTasks();
      renderDashboard();
    });
  });

  document.querySelectorAll("#tasks .bench-approve-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = taskItems.find((i) => i.id === btn.dataset.item);
      if (!item) return;
      item.done = true;
      item.doneAt = new Date().toISOString().slice(0, 10);
      saveTaskItems();
      addLogEntry(
        "Task completed",
        `"${item.whatNeedsDoing}"${item.category ? " (" + item.category + ")" : ""} marked done${item.submitter ? " by " + item.submitter : ""}.`
      );
      renderTasks();
      renderDashboard();
      renderLog();
    });
  });

  document.querySelectorAll("#tasks .bench-delete-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!confirm("Delete this task?")) return;
      taskItems = taskItems.filter((i) => i.id !== btn.dataset.item);
      saveTaskItems();
      renderTasks();
      renderDashboard();
    });
  });
}

function renderTasks() {
  const el = document.getElementById("tasks");

  const header = taskFormOpen
    ? taskFormHtml()
    : `
      <h1>Tasks</h1>
      <p class="view-sub">Things to check, measure or decide at the shop — nothing to buy.</p>
      <button type="button" id="task-open" class="bench-primary-btn">+ Add task</button>
    `;

  const list = taskItems.length
    ? `<div class="bench-item-list">${taskItems.map(taskItemCardHtml).join("")}</div>`
    : `<p class="view-sub">Nothing on the list right now.</p>`;

  el.innerHTML = `${header}<div class="bench-list-wrap">${list}</div>`;

  if (taskFormOpen) {
    wireTaskForm();
  } else {
    document.getElementById("task-open").addEventListener("click", () => openTaskForm(null));
  }
  wireTaskList();
}

/* ---------- Build Log ---------- */

const LOG_STORAGE_KEY = "specter-activity-log";
let activityLog = [];

function loadActivityLog() {
  try {
    const raw = localStorage.getItem(LOG_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [];
}

function saveActivityLog() {
  try { localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(activityLog)); } catch (e) {}
}

function addLogEntry(title, body) {
  activityLog.unshift({ date: new Date().toISOString().slice(0, 10), title, body });
  saveActivityLog();
}

function allLogEntries() {
  return [...activityLog, ...DATA.log].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

function logEntryHtml(entry) {
  return `
    <div class="log-entry">
      <div class="log-date">${escapeHtml(entry.date)}</div>
      <div class="log-title">${escapeHtml(entry.title)}</div>
      <div class="log-body">${escapeHtml(entry.body)}</div>
    </div>
  `;
}

function renderLog() {
  document.getElementById("log").innerHTML = `
    <h1>Build Log</h1>
    <p class="view-sub">Dated journal of progress, decisions, and notes.</p>
    ${allLogEntries().map(logEntryHtml).join("") || `<p class="view-sub">No entries yet.</p>`}
  `;
}

/* ---------- Bench ---------- */
/*
 * The Bench is a "part that needs a decision" tracker. Someone submits a
 * part with one or more purchase options (link, vendor, price, picture);
 * the shop reviews and approves one option to order. No backend, so
 * everything persists in this browser's localStorage.
 */

const BENCH_STORAGE_KEY = "specter-bench-items";
const BENCH_CATEGORIES = [
  "Glass", "Body & Trim", "Interior", "Audio", "Lighting", "Drivetrain",
  "Chassis & Exterior Steel", "Electrical", "Hardware", "Cage & Rack",
  "HVAC", "Wheels",
];

let benchItems = [];
let benchFormOpen = false;
let benchOptionCounter = 0;
let benchEditingId = null;

const BENCH_COUNTER_KEY = "specter-bench-counter";

function nextBenchNumber() {
  let n = 1;
  try {
    const raw = localStorage.getItem(BENCH_COUNTER_KEY);
    n = raw ? parseInt(raw, 10) + 1 : 1;
  } catch (e) {}
  try { localStorage.setItem(BENCH_COUNTER_KEY, String(n)); } catch (e) {}
  return n;
}

function extractDomainLabel(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toUpperCase();
  } catch (e) {
    return url;
  }
}

function editIconHtml(itemId) {
  return `<button type="button" class="edit-icon" data-edit-item="${itemId}" aria-label="Edit">&#9998;</button>`;
}

function expandableHtml(text) {
  if (!text) return "";
  return `
    <div class="expandable">
      <p class="expandable-text">${escapeHtml(text)}</p>
      <button type="button" class="more-toggle">More <span class="chevron">&#9662;</span></button>
    </div>
  `;
}

function wireExpandables(root) {
  const boxes = root.querySelectorAll(".expandable");

  const measure = () => {
    boxes.forEach((box) => {
      const textEl = box.querySelector(".expandable-text");
      const btn = box.querySelector(".more-toggle");
      // -webkit-line-clamp discards the overflow at layout time rather than
      // just hiding it, so scrollHeight === clientHeight even when clamped.
      // Briefly un-clamp to measure the true full height, then restore.
      const clampedHeight = textEl.clientHeight;
      textEl.classList.add("measuring");
      const fullHeight = textEl.scrollHeight;
      textEl.classList.remove("measuring");
      btn.style.display = fullHeight <= clampedHeight + 2 ? "none" : "";
    });
  };

  measure();
  // The custom typeface loads asynchronously; re-measure once it's in so
  // wrapping (and therefore overflow) reflects the final rendered font.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(measure);
  }

  boxes.forEach((box) => {
    const btn = box.querySelector(".more-toggle");
    btn.addEventListener("click", () => {
      const expanded = box.classList.toggle("expanded");
      btn.innerHTML = expanded ? `Less <span class="chevron up">&#9662;</span>` : `More <span class="chevron">&#9662;</span>`;
    });
  });
}

function loadBenchItems() {
  try {
    const raw = localStorage.getItem(BENCH_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [];
}

function saveBenchItems() {
  try { localStorage.setItem(BENCH_STORAGE_KEY, JSON.stringify(benchItems)); } catch (e) {}
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/`/g, "&#96;");
}

function trashIconHtml() {
  return `<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 4.2h11M6.2 4.2V2.4a.6.6 0 0 1 .6-.6h2.4a.6.6 0 0 1 .6.6v1.8M3.6 4.2l.6 8.9c.04.6.53 1 1.1 1h5.4c.57 0 1.06-.4 1.1-1l.6-8.9M6.6 7v4.2M9.4 7v4.2"/></svg>`;
}

/* ---- More-links parsing: one per line, "Name | https://..." or a bare URL ---- */

function parseMoreLinks(text) {
  return (text || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("|");
      if (parts.length > 1) {
        return { label: parts[0].trim(), url: parts.slice(1).join("|").trim() };
      }
      return { label: line, url: line };
    });
}

/* ---- Add-item form ---- */

function benchOptionBlockHtml(blockId, number, opt) {
  opt = opt || {};
  return `
    <div class="bench-option-block" data-block-id="${blockId}">
      <div class="bench-option-head">
        <span class="bench-option-num">OPTION ${number}</span>
        <button type="button" class="bench-remove-option" data-remove="${blockId}">Remove option</button>
      </div>

      <label class="field-label" for="${blockId}-what">What it is</label>
      <input type="text" id="${blockId}-what" class="bo-what" placeholder="e.g. Genuine upper shroud LR048112" value="${escapeAttr(opt.whatItIs || "")}" required />

      <div class="bench-option-row">
        <div>
          <label class="field-label" for="${blockId}-vendor">Vendor</label>
          <input type="text" id="${blockId}-vendor" class="bo-vendor" value="${escapeAttr(opt.vendor || "")}" />
        </div>
        <div>
          <label class="field-label" for="${blockId}-partnum">Part number</label>
          <input type="text" id="${blockId}-partnum" class="bo-partnum" value="${escapeAttr(opt.partNumber || "")}" />
        </div>
      </div>

      <label class="field-label" for="${blockId}-link">Link</label>
      <input type="url" id="${blockId}-link" class="bo-link" placeholder="https://..." value="${escapeAttr(opt.link || "")}" />

      <label class="field-label" for="${blockId}-picture">Picture (optional)</label>
      <input type="url" id="${blockId}-picture" class="bo-picture" placeholder="https://....jpg" value="${escapeAttr(opt.picture || "")}" />
      <p class="field-hint">Press and hold the product photo on that page and choose Copy (on a computer, right-click &rarr; Copy image address), then paste it here. It shows as a thumbnail linked to the page.</p>

      <label class="field-label" for="${blockId}-notes">Notes</label>
      <textarea id="${blockId}-notes" class="bo-notes" rows="2">${escapeHtml(opt.notes || "")}</textarea>

      <label class="field-label" for="${blockId}-morelinks">More links (optional)</label>
      <textarea id="${blockId}-morelinks" class="bo-morelinks" rows="2" placeholder="https://...">${escapeHtml(opt.moreLinks || "")}</textarea>
      <p class="field-hint">One per line. To name a link, put the name first: Lower shroud | https://...</p>

      <label class="bench-recommend">
        <input type="radio" name="bench-recommended" value="${blockId}" ${opt.recommended ? "checked" : ""} />
        Recommended option
      </label>
    </div>
  `;
}

function benchFormHtml() {
  const editing = benchEditingId ? benchItems.find((i) => i.id === benchEditingId) : null;
  const opts = editing && editing.options.length ? editing.options : [null];
  const optionBlocksHtml = opts.map((opt, i) => benchOptionBlockHtml(opt ? opt.id : "o0", i + 1, opt)).join("");

  return `
    <div class="bench-form-panel">
      <h2 class="bench-form-title">${editing ? "Edit bench item" : "Add an item to the bench"}</h2>
      <p class="view-sub">A part that needs a decision. Give each option a link and a picture; the shop approves an option to order.</p>

      <form id="bench-form">
        <label class="field-label" for="bf-name">Your name</label>
        <input type="text" id="bf-name" value="${editing ? escapeAttr(editing.submitter) : ""}" required />

        <label class="field-label" for="bf-part">What the part is</label>
        <input type="text" id="bf-part" placeholder="e.g. Rear wiper for the rear door" value="${editing ? escapeAttr(editing.partName) : ""}" required />

        <label class="field-label" for="bf-category">Category</label>
        <input type="text" id="bf-category" placeholder="e.g. Interior" value="${editing ? escapeAttr(editing.category) : ""}" />
        <div class="bench-pills" id="bench-category-pills">
          ${BENCH_CATEGORIES.map((c) => `<button type="button" class="pill ${editing && editing.category === c ? "active" : ""}" data-cat="${escapeAttr(c)}">${escapeHtml(c)}</button>`).join("")}
        </div>

        <label class="field-label" for="bf-reason">What needs deciding and why</label>
        <textarea id="bf-reason" rows="3" required>${editing ? escapeHtml(editing.reason) : ""}</textarea>

        <label class="field-label" for="bf-before">Before ordering (optional)</label>
        <textarea id="bf-before" rows="2">${editing ? escapeHtml(editing.beforeOrdering) : ""}</textarea>
        <p class="field-hint">Anything the shop must measure or confirm before this is ordered.</p>

        <div class="bench-options-divider">Options</div>
        <div id="bench-options-container">
          ${optionBlocksHtml}
        </div>
        <button type="button" id="bench-add-option" class="bench-secondary-btn">+ Add another option</button>

        <div class="bench-form-actions">
          <button type="button" id="bench-cancel" class="bench-secondary-btn">Cancel</button>
          <button type="submit" class="bench-primary-btn">${editing ? "Save changes" : "Submit to the bench"}</button>
        </div>
      </form>
    </div>
  `;
}

function refreshBenchOptionNumbering() {
  const blocks = document.querySelectorAll("#bench-options-container .bench-option-block");
  blocks.forEach((block, i) => {
    block.querySelector(".bench-option-num").textContent = `OPTION ${i + 1}`;
    block.querySelector(".bench-remove-option").style.display = blocks.length > 1 ? "" : "none";
  });
}

function wireBenchForm() {
  const pills = document.getElementById("bench-category-pills");
  const categoryInput = document.getElementById("bf-category");
  pills.addEventListener("click", (e) => {
    const btn = e.target.closest(".pill");
    if (!btn) return;
    categoryInput.value = btn.dataset.cat;
    pills.querySelectorAll(".pill").forEach((p) => p.classList.toggle("active", p === btn));
  });

  const optionsContainer = document.getElementById("bench-options-container");

  document.getElementById("bench-add-option").addEventListener("click", () => {
    benchOptionCounter += 1;
    const blockId = "o" + benchOptionCounter;
    optionsContainer.insertAdjacentHTML("beforeend", benchOptionBlockHtml(blockId, 0));
    refreshBenchOptionNumbering();
  });

  optionsContainer.addEventListener("click", (e) => {
    const btn = e.target.closest(".bench-remove-option");
    if (!btn) return;
    const block = document.querySelector(`.bench-option-block[data-block-id="${btn.dataset.remove}"]`);
    if (block && optionsContainer.querySelectorAll(".bench-option-block").length > 1) {
      block.remove();
      refreshBenchOptionNumbering();
    }
  });

  document.getElementById("bench-cancel").addEventListener("click", () => {
    closeBenchForm();
  });

  document.getElementById("bench-form").addEventListener("submit", (e) => {
    e.preventDefault();

    const recommendedInput = document.querySelector('input[name="bench-recommended"]:checked');
    const recommendedBlockId = recommendedInput ? recommendedInput.value : null;

    const options = Array.from(optionsContainer.querySelectorAll(".bench-option-block")).map((block) => {
      const blockId = block.dataset.blockId;
      return {
        id: blockId,
        whatItIs: block.querySelector(".bo-what").value.trim(),
        vendor: block.querySelector(".bo-vendor").value.trim(),
        partNumber: block.querySelector(".bo-partnum").value.trim(),
        link: block.querySelector(".bo-link").value.trim(),
        picture: block.querySelector(".bo-picture").value.trim(),
        notes: block.querySelector(".bo-notes").value.trim(),
        moreLinks: block.querySelector(".bo-morelinks").value.trim(),
        recommended: blockId === recommendedBlockId,
      };
    });

    const submitter = document.getElementById("bf-name").value.trim();
    const partName = document.getElementById("bf-part").value.trim();
    const category = document.getElementById("bf-category").value.trim();
    const reason = document.getElementById("bf-reason").value.trim();
    const beforeOrdering = document.getElementById("bf-before").value.trim();

    if (benchEditingId) {
      const item = benchItems.find((i) => i.id === benchEditingId);
      if (item) {
        item.submitter = submitter;
        item.partName = partName;
        item.category = category;
        item.reason = reason;
        item.beforeOrdering = beforeOrdering;
        item.options = options;
        if (item.approvedOptionId && !options.some((o) => o.id === item.approvedOptionId)) {
          item.approvedOptionId = null;
          item.status = "needs-decision";
        }
      }
    } else {
      benchItems.unshift({
        id: "bench" + Date.now(),
        number: nextBenchNumber(),
        createdAt: new Date().toISOString().slice(0, 10),
        submitter,
        partName,
        category,
        reason,
        beforeOrdering,
        options,
        status: "needs-decision",
        approvedOptionId: null,
      });
    }

    saveBenchItems();
    closeBenchForm();
  });
}

function openBenchForm(item) {
  benchFormOpen = true;
  benchEditingId = item ? item.id : null;
  if (item && item.options.length) {
    const nums = item.options.map((o) => {
      const m = /^o(\d+)$/.exec(o.id);
      return m ? parseInt(m[1], 10) : -1;
    });
    benchOptionCounter = Math.max(0, ...nums) + 1;
  } else {
    benchOptionCounter = 0;
  }
  renderBench();
}

function closeBenchForm() {
  benchFormOpen = false;
  benchEditingId = null;
  renderBench();
  renderDashboard();
}

/* ---- Saved item list ---- */

function benchOptionCardHtml(item, opt) {
  const isApproved = item.approvedOptionId === opt.id;
  const links = parseMoreLinks(opt.moreLinks);
  return `
    <div class="bench-option-card ${isApproved ? "approved" : ""}">
      ${opt.recommended ? `<span class="option-recommended-tag">Recommended</span>` : ""}
      <div class="bench-option-card-head">
        ${opt.picture ? `
          <a href="${escapeAttr(opt.link || opt.picture)}" target="_blank" rel="noopener noreferrer" class="bench-thumb-link" aria-label="View photo">
            <span class="bench-thumb-fallback">&#8599;</span>
            <img src="${escapeAttr(opt.picture)}" alt="${escapeAttr(opt.whatItIs || "part photo")}" class="bench-thumb" onerror="this.style.display='none'" />
          </a>` : ""}
        <div class="bench-option-head-text">
          <div class="bench-option-title-row">
            <div class="bench-option-what">${escapeHtml(opt.whatItIs || "Untitled option")}</div>
            ${editIconHtml(item.id)}
          </div>
          ${(opt.vendor || opt.partNumber) ? `<div class="bench-option-meta">${[opt.vendor, opt.partNumber].filter(Boolean).map(escapeHtml).join(" &middot; ")}</div>` : ""}
        </div>
      </div>

      ${expandableHtml(opt.notes)}

      <div class="bench-option-footer">
        ${opt.link ? `<a href="${escapeAttr(opt.link)}" target="_blank" rel="noopener noreferrer" class="bench-link-btn">${escapeHtml(extractDomainLabel(opt.link))} &#8599;</a>` : ""}
        ${links.length ? `
          <div class="bench-more-links">
            ${links.map((l) => `<a href="${escapeAttr(l.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(l.label)}</a>`).join("")}
          </div>` : ""}
      </div>

      ${isApproved
        ? `<span class="bench-approved-tag">&#10003; Approved to order</span>`
        : (item.status !== "approved" ? `<button type="button" class="bench-approve-btn" data-item="${item.id}" data-option="${opt.id}">&#10003; Approve to order</button>` : "")}
    </div>
  `;
}

function benchItemCardHtml(item) {
  const statusLabel = item.status === "approved" ? "APPROVED" : "OPEN &mdash; DECISION NEEDED";
  return `
    <div class="bench-item-card">
      <div class="bench-eyebrow">
        <span>${escapeHtml((item.category || "Uncategorized").toUpperCase())}</span>
        <span class="bench-eyebrow-sep">&middot;</span>
        <span class="bench-eyebrow-status ${item.status === "approved" ? "is-approved" : "is-open"}">${statusLabel}</span>
        <span class="bench-item-number">${String(item.number || 0).padStart(2, "0")}</span>
      </div>

      <div class="bench-title-row">
        <h3 class="bench-item-title">${escapeHtml(item.partName)}</h3>
        ${editIconHtml(item.id)}
      </div>

      <div class="bench-item-meta">Submitted by ${escapeHtml(item.submitter || "Unknown")} &middot; ${escapeHtml(item.createdAt)}</div>

      ${expandableHtml(item.reason)}

      ${item.beforeOrdering ? `
        <p class="bench-before"><strong>Before ordering:</strong> ${escapeHtml(item.beforeOrdering)} ${editIconHtml(item.id)}</p>
      ` : ""}

      <div class="bench-options-list">
        ${item.options.map((opt) => benchOptionCardHtml(item, opt)).join("")}
      </div>

      <div class="bench-item-actions">
        ${item.status === "approved" ? `<button type="button" class="bench-secondary-btn bench-reopen-btn" data-item="${item.id}">Reopen decision</button>` : ""}
        <button type="button" class="bench-delete-item icon-trash-btn" data-item="${item.id}" aria-label="Delete item" title="Delete item">${trashIconHtml()}</button>
      </div>
    </div>
  `;
}

function wireBenchList() {
  document.querySelectorAll("#bench [data-edit-item]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = benchItems.find((i) => i.id === btn.dataset.editItem);
      if (item) openBenchForm(item);
    });
  });

  document.querySelectorAll("#bench .bench-approve-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = benchItems.find((i) => i.id === btn.dataset.item);
      if (!item) return;
      item.status = "approved";
      item.approvedOptionId = btn.dataset.option;
      saveBenchItems();
      const chosen = item.options.find((o) => o.id === item.approvedOptionId);
      addLogEntry(
        "Bench item approved",
        `"${item.partName}" approved to order${chosen ? " — " + chosen.whatItIs : ""}.`
      );
      createShipmentFromBenchApproval(item, chosen);
      renderBench();
      renderShipments();
      renderDashboard();
      renderLog();
    });
  });

  document.querySelectorAll("#bench .bench-reopen-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = benchItems.find((i) => i.id === btn.dataset.item);
      if (!item) return;
      item.status = "needs-decision";
      item.approvedOptionId = null;
      saveBenchItems();
      renderBench();
      renderDashboard();
    });
  });

  document.querySelectorAll("#bench .bench-delete-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!confirm("Delete this bench item?")) return;
      benchItems = benchItems.filter((i) => i.id !== btn.dataset.item);
      saveBenchItems();
      renderBench();
      renderDashboard();
    });
  });
}

function renderBench() {
  const el = document.getElementById("bench");

  const header = benchFormOpen
    ? benchFormHtml()
    : `
      <h1>Bench</h1>
      <p class="view-sub">Parts that need a decision before they're ordered. Saved in this browser.</p>
      <button type="button" id="bench-open" class="bench-primary-btn">+ Add an item to the bench</button>
    `;

  const list = benchItems.length
    ? `<div class="bench-item-list">${benchItems.map(benchItemCardHtml).join("")}</div>`
    : `<p class="view-sub">Nothing on the bench right now.</p>`;

  el.innerHTML = `${header}<div class="bench-list-wrap">${list}</div>`;

  if (benchFormOpen) {
    wireBenchForm();
  } else {
    document.getElementById("bench-open").addEventListener("click", () => openBenchForm(null));
  }
  wireBenchList();
  wireExpandables(el);
}

/* ---------- Shipments ---------- */
/*
 * Auto-created when a bench item is approved to order. Tracks each
 * shipment from ordered -> in transit -> delivered.
 */

const SHIPMENT_STORAGE_KEY = "specter-shipments";
let shipments = [];

function loadShipments() {
  try {
    const raw = localStorage.getItem(SHIPMENT_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [];
}

function saveShipments() {
  try { localStorage.setItem(SHIPMENT_STORAGE_KEY, JSON.stringify(shipments)); } catch (e) {}
}

function createShipmentFromBenchApproval(item, chosenOption) {
  shipments.unshift({
    id: "ship" + Date.now(),
    benchItemId: item.id,
    partName: item.partName,
    optionName: chosenOption ? chosenOption.whatItIs : "",
    vendor: chosenOption ? chosenOption.vendor : "",
    orderedDate: new Date().toISOString().slice(0, 10),
    trackingNumber: "",
    status: "ordered",
    deliveredDate: null,
  });
  saveShipments();
}

function shipmentBadge(status) {
  const map = {
    "ordered": { cls: "not-started", label: "Ordered" },
    "in-transit": { cls: "in-progress", label: "In Transit" },
    "delivered": { cls: "complete", label: "Delivered" },
  };
  const m = map[status] || { cls: "not-started", label: status };
  return `<span class="badge badge-${m.cls}">${m.label}</span>`;
}

function shipmentCardHtml(s) {
  return `
    <div class="bench-item-card">
      <div class="bench-eyebrow">
        <span>${escapeHtml(s.vendor || "Vendor unknown")}</span>
        <span class="bench-eyebrow-sep">&middot;</span>
        <span>Ordered ${escapeHtml(s.orderedDate)}</span>
        <span class="bench-item-number">${shipmentBadge(s.status)}</span>
      </div>

      <div class="bench-title-row">
        <h3 class="bench-item-title">${escapeHtml(s.partName)}</h3>
      </div>
      ${s.optionName ? `<div class="bench-item-meta">${escapeHtml(s.optionName)}</div>` : ""}

      <label class="field-label" for="track-${s.id}">Tracking number (optional)</label>
      <input type="text" id="track-${s.id}" class="ship-tracking-input" data-item="${s.id}" value="${escapeAttr(s.trackingNumber || "")}" placeholder="Add tracking number..." />

      <div class="bench-item-actions">
        ${s.status === "ordered" ? `<button type="button" class="bench-approve-btn ship-advance-btn" data-item="${s.id}" data-next="in-transit">Mark in transit</button>` : ""}
        ${s.status === "in-transit" ? `<button type="button" class="bench-approve-btn ship-advance-btn" data-item="${s.id}" data-next="delivered">Mark delivered</button>` : ""}
        ${s.status === "delivered" ? `<button type="button" class="bench-secondary-btn ship-reopen-btn" data-item="${s.id}">Reopen</button>` : ""}
        <button type="button" class="bench-delete-item icon-trash-btn ship-delete-btn" data-item="${s.id}" aria-label="Delete shipment" title="Delete shipment">${trashIconHtml()}</button>
      </div>
    </div>
  `;
}

function wireShipmentsList() {
  document.querySelectorAll("#shipments .ship-advance-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const s = shipments.find((x) => x.id === btn.dataset.item);
      if (!s) return;
      s.status = btn.dataset.next;
      if (s.status === "delivered") s.deliveredDate = new Date().toISOString().slice(0, 10);
      saveShipments();
      renderShipments();
      renderDashboard();
    });
  });

  document.querySelectorAll("#shipments .ship-reopen-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const s = shipments.find((x) => x.id === btn.dataset.item);
      if (!s) return;
      s.status = "in-transit";
      s.deliveredDate = null;
      saveShipments();
      renderShipments();
      renderDashboard();
    });
  });

  document.querySelectorAll("#shipments .ship-delete-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!confirm("Delete this shipment record?")) return;
      shipments = shipments.filter((x) => x.id !== btn.dataset.item);
      saveShipments();
      renderShipments();
      renderDashboard();
    });
  });

  document.querySelectorAll("#shipments .ship-tracking-input").forEach((input) => {
    input.addEventListener("change", () => {
      const s = shipments.find((x) => x.id === input.dataset.item);
      if (!s) return;
      s.trackingNumber = input.value.trim();
      saveShipments();
    });
  });
}

function renderShipments() {
  document.getElementById("shipments").innerHTML = `
    <h1>Shipments</h1>
    <p class="view-sub">Inbound shipments from approved bench orders.</p>
    ${shipments.length
      ? `<div class="bench-item-list">${shipments.map(shipmentCardHtml).join("")}</div>`
      : `<p class="view-sub">Nothing inbound right now. Approving a bench item to order adds it here.</p>`}
  `;
  wireShipmentsList();
}

/* ---------- Tab navigation ---------- */

function showView(id) {
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  document.querySelectorAll("nav.tabs button").forEach((b) => {
    b.classList.toggle("active", b.dataset.view === id);
  });
  try { localStorage.setItem("specter-active-view", id); } catch (e) {}
}

function initNav() {
  document.querySelectorAll("nav.tabs button").forEach((btn) => {
    btn.addEventListener("click", () => showView(btn.dataset.view));
  });
  let start = "dashboard";
  try {
    const saved = localStorage.getItem("specter-active-view");
    if (saved && document.getElementById(saved)) start = saved;
  } catch (e) {}
  showView(start);
}

/* ---------- Init ---------- */

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("updated").textContent = `Updated ${DATA.meta.updated}`;
  benchItems = loadBenchItems();
  taskItems = loadTaskItems();
  activityLog = loadActivityLog();
  shipments = loadShipments();
  renderDashboard();
  renderTasks();
  renderBench();
  renderShipments();
  renderLog();
  initNav();
});
