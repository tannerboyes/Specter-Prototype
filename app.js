/* Specter Prototype tracker — rendering logic. Edit data.js, not this file, to update content. */

const STATUS_LABEL = {
  "not-started": "Not Started",
  "in-progress": "In Progress",
  "blocked": "Blocked",
  "complete": "Complete",
};

function badge(status) {
  const label = STATUS_LABEL[status] || status;
  return `<span class="badge badge-${status}">${label}</span>`;
}

function avg(nums) {
  if (!nums.length) return 0;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

/* ---------- Dashboard ---------- */

function renderDashboard() {
  const overallProgress = avg(DATA.systems.map((s) => s.progress));
  const toolingProgress = avg(DATA.tooling.map((t) => t.progress));
  const openTasks = taskItems.filter((t) => !t.done).length;
  const doneTasks = taskItems.filter((t) => t.done).length;
  const blockedSystems = DATA.systems.filter((s) => s.status === "blocked").length;

  document.getElementById("dashboard").innerHTML = `
    <h1>${DATA.meta.carName}</h1>
    <p class="view-sub">${DATA.meta.tagline}</p>

    <div class="grid">
      <div class="card">
        <div class="card-title">Overall Car Progress</div>
        <div class="card-value">${overallProgress}%</div>
      </div>
      <div class="card">
        <div class="card-title">Tooling & Machinery Readiness</div>
        <div class="card-value">${toolingProgress}%</div>
      </div>
      <div class="card">
        <div class="card-title">Open Tasks</div>
        <div class="card-value">${openTasks}</div>
      </div>
      <div class="card">
        <div class="card-title">Completed Tasks</div>
        <div class="card-value">${doneTasks}</div>
      </div>
      ${blockedSystems > 0 ? `
      <div class="card">
        <div class="card-title">Blocked Systems</div>
        <div class="card-value" style="color:var(--red)">${blockedSystems}</div>
      </div>` : ""}
    </div>

    <h2>Vehicle Systems Snapshot</h2>
    <div class="grid">
      ${DATA.systems.map((s) => `
        <div class="card">
          <div class="card-title">${s.name} ${badge(s.status)}</div>
        </div>
      `).join("")}
    </div>

    <h2>Recent Log Entries</h2>
    ${DATA.log.slice(0, 3).map(logEntryHtml).join("") || `<p class="view-sub">No entries yet.</p>`}
  `;
}

/* ---------- Car No. 1 ---------- */

function renderCar() {
  document.getElementById("car").innerHTML = `
    <h1>${DATA.meta.carName}</h1>
    <p class="view-sub">Vehicle systems and build progress.</p>
    ${DATA.systems.map((s) => `
      <div class="item">
        <div class="item-head">
          <div class="item-name">${s.name}<span class="item-cat">${s.category}</span></div>
          ${badge(s.status)}
        </div>
        ${s.notes ? `<div class="item-notes">${s.notes}</div>` : ""}
      </div>
    `).join("")}
  `;
}

/* ---------- Tooling & Machinery ---------- */

function renderTooling() {
  document.getElementById("tooling").innerHTML = `
    <h1>Tooling &amp; Machinery</h1>
    <p class="view-sub">Equipment and fixtures needed to build the car.</p>
    ${DATA.tooling.map((t) => `
      <div class="item">
        <div class="item-head">
          <div class="item-name">${t.name}</div>
          ${badge(t.status)}
        </div>
        ${t.notes ? `<div class="item-notes">${t.notes}</div>` : ""}
      </div>
    `).join("")}

    <h2>Process Development</h2>
    ${DATA.processes.map((p) => `
      <div class="item">
        <div class="item-head">
          <div class="item-name">${p.name}</div>
          ${badge(p.status)}
        </div>
        ${p.notes ? `<div class="item-notes">${p.notes}</div>` : ""}
      </div>
    `).join("")}
  `;
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

function taskLinkRowHtml(rowId) {
  return `
    <div class="bench-link-row" data-row-id="${rowId}">
      <input type="text" class="al-label" placeholder="Link name (optional)" />
      <input type="url" class="al-url" placeholder="https://..." />
      <button type="button" class="bench-remove-option" data-remove-link="${rowId}">Remove</button>
    </div>
  `;
}

function taskFormHtml() {
  return `
    <div class="bench-form-panel">
      <h2 class="bench-form-title">Add a task</h2>
      <p class="view-sub">Something to check, measure or decide at the shop.</p>

      <form id="task-form">
        <label class="field-label" for="af-name">Your name</label>
        <input type="text" id="af-name" required />

        <label class="field-label" for="af-what">What needs doing</label>
        <input type="text" id="af-what" placeholder="e.g. Confirm the rear door pattern" required />

        <label class="field-label" for="af-category">Category</label>
        <input type="text" id="af-category" placeholder="e.g. Interior" />
        <div class="bench-pills" id="task-category-pills">
          ${BENCH_CATEGORIES.map((c) => `<button type="button" class="pill" data-cat="${escapeAttr(c)}">${escapeHtml(c)}</button>`).join("")}
        </div>

        <label class="field-label" for="af-reason">What to check or decide, and why</label>
        <textarea id="af-reason" rows="3" required></textarea>

        <label class="field-label" for="af-checkfirst">Check first (optional)</label>
        <textarea id="af-checkfirst" rows="2"></textarea>

        <div class="bench-options-divider">Reference links (optional)</div>
        <div id="task-links-container"></div>
        <button type="button" id="task-add-link" class="bench-secondary-btn bench-add-link-btn">+ Add a link</button>

        <div class="bench-form-actions">
          <button type="button" id="task-cancel" class="bench-secondary-btn">Cancel</button>
          <button type="submit" class="bench-primary-btn">Add</button>
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

    taskItems.unshift({
      id: "task" + Date.now(),
      createdAt: new Date().toISOString().slice(0, 10),
      submitter: document.getElementById("af-name").value.trim(),
      whatNeedsDoing: document.getElementById("af-what").value.trim(),
      category: document.getElementById("af-category").value.trim(),
      reason: document.getElementById("af-reason").value.trim(),
      checkFirst: document.getElementById("af-checkfirst").value.trim(),
      links,
      done: false,
      doneAt: null,
    });

    saveTaskItems();
    closeTaskForm();
  });
}

function openTaskForm() {
  taskFormOpen = true;
  taskLinkCounter = 0;
  renderTasks();
}

function closeTaskForm() {
  taskFormOpen = false;
  renderTasks();
}

function taskItemCardHtml(item) {
  return `
    <div class="bench-item-card">
      <div class="item-head">
        <div class="item-name">
          ${escapeHtml(item.whatNeedsDoing)}
          ${item.category ? `<span class="item-cat">${escapeHtml(item.category)}</span>` : ""}
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
  document.querySelectorAll(".task-reopen-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = taskItems.find((i) => i.id === btn.dataset.item);
      if (!item) return;
      item.done = false;
      item.doneAt = null;
      saveTaskItems();
      renderTasks();
    });
  });

  document.querySelectorAll(".bench-approve-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = taskItems.find((i) => i.id === btn.dataset.item);
      if (!item) return;
      item.done = true;
      item.doneAt = new Date().toISOString().slice(0, 10);
      saveTaskItems();
      renderTasks();
    });
  });

  document.querySelectorAll(".bench-delete-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!confirm("Delete this task?")) return;
      taskItems = taskItems.filter((i) => i.id !== btn.dataset.item);
      saveTaskItems();
      renderTasks();
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
    document.getElementById("task-open").addEventListener("click", openTaskForm);
  }
  wireTaskList();
}

/* ---------- Build Log ---------- */

function logEntryHtml(entry) {
  return `
    <div class="log-entry">
      <div class="log-date">${entry.date}</div>
      <div class="log-title">${entry.title}</div>
      <div class="log-body">${entry.body}</div>
    </div>
  `;
}

function renderLog() {
  document.getElementById("log").innerHTML = `
    <h1>Build Log</h1>
    <p class="view-sub">Dated journal of progress, decisions, and notes.</p>
    ${DATA.log.map(logEntryHtml).join("") || `<p class="view-sub">No entries yet.</p>`}
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

function benchOptionBlockHtml(blockId, number) {
  return `
    <div class="bench-option-block" data-block-id="${blockId}">
      <div class="bench-option-head">
        <span class="bench-option-num">OPTION ${number}</span>
        <button type="button" class="bench-remove-option" data-remove="${blockId}">Remove option</button>
      </div>

      <label class="field-label" for="${blockId}-what">What it is</label>
      <input type="text" id="${blockId}-what" class="bo-what" placeholder="e.g. Genuine upper shroud LR048112" required />

      <div class="bench-option-row">
        <div>
          <label class="field-label" for="${blockId}-vendor">Vendor</label>
          <input type="text" id="${blockId}-vendor" class="bo-vendor" />
        </div>
        <div>
          <label class="field-label" for="${blockId}-partnum">Part number</label>
          <input type="text" id="${blockId}-partnum" class="bo-partnum" />
        </div>
      </div>

      <label class="field-label" for="${blockId}-link">Link</label>
      <input type="url" id="${blockId}-link" class="bo-link" placeholder="https://..." />

      <label class="field-label" for="${blockId}-picture">Picture (optional)</label>
      <input type="url" id="${blockId}-picture" class="bo-picture" placeholder="https://....jpg" />
      <p class="field-hint">Press and hold the product photo on that page and choose Copy (on a computer, right-click &rarr; Copy image address), then paste it here. It shows as a thumbnail linked to the page.</p>

      <label class="field-label" for="${blockId}-notes">Notes</label>
      <textarea id="${blockId}-notes" class="bo-notes" rows="2"></textarea>

      <label class="field-label" for="${blockId}-morelinks">More links (optional)</label>
      <textarea id="${blockId}-morelinks" class="bo-morelinks" rows="2" placeholder="https://..."></textarea>
      <p class="field-hint">One per line. To name a link, put the name first: Lower shroud | https://...</p>

      <label class="bench-recommend">
        <input type="radio" name="bench-recommended" value="${blockId}" />
        Recommended option
      </label>
    </div>
  `;
}

function benchFormHtml() {
  const firstBlockId = "o0";
  return `
    <div class="bench-form-panel">
      <h2 class="bench-form-title">Add an item to the bench</h2>
      <p class="view-sub">A part that needs a decision. Give each option a link and a picture; the shop approves an option to order.</p>

      <form id="bench-form">
        <label class="field-label" for="bf-name">Your name</label>
        <input type="text" id="bf-name" required />

        <label class="field-label" for="bf-part">What the part is</label>
        <input type="text" id="bf-part" placeholder="e.g. Rear wiper for the rear door" required />

        <label class="field-label" for="bf-category">Category</label>
        <input type="text" id="bf-category" placeholder="e.g. Interior" />
        <div class="bench-pills" id="bench-category-pills">
          ${BENCH_CATEGORIES.map((c) => `<button type="button" class="pill" data-cat="${escapeAttr(c)}">${escapeHtml(c)}</button>`).join("")}
        </div>

        <label class="field-label" for="bf-reason">What needs deciding and why</label>
        <textarea id="bf-reason" rows="3" required></textarea>

        <label class="field-label" for="bf-before">Before ordering (optional)</label>
        <textarea id="bf-before" rows="2"></textarea>
        <p class="field-hint">Anything the shop must measure or confirm before this is ordered.</p>

        <div class="bench-options-divider">Options</div>
        <div id="bench-options-container">
          ${benchOptionBlockHtml(firstBlockId, 1)}
        </div>
        <button type="button" id="bench-add-option" class="bench-secondary-btn">+ Add another option</button>

        <div class="bench-form-actions">
          <button type="button" id="bench-cancel" class="bench-secondary-btn">Cancel</button>
          <button type="submit" class="bench-primary-btn">Submit to the bench</button>
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

    benchItems.unshift({
      id: "bench" + Date.now(),
      createdAt: new Date().toISOString().slice(0, 10),
      submitter: document.getElementById("bf-name").value.trim(),
      partName: document.getElementById("bf-part").value.trim(),
      category: document.getElementById("bf-category").value.trim(),
      reason: document.getElementById("bf-reason").value.trim(),
      beforeOrdering: document.getElementById("bf-before").value.trim(),
      options,
      status: "needs-decision",
      approvedOptionId: null,
    });

    saveBenchItems();
    closeBenchForm();
  });
}

function openBenchForm() {
  benchFormOpen = true;
  benchOptionCounter = 0;
  renderBench();
}

function closeBenchForm() {
  benchFormOpen = false;
  renderBench();
}

/* ---- Saved item list ---- */

function benchOptionCardHtml(item, opt) {
  const isApproved = item.approvedOptionId === opt.id;
  const links = parseMoreLinks(opt.moreLinks);
  return `
    <div class="bench-option-card ${isApproved ? "approved" : ""}">
      <div class="bench-option-card-head">
        <div>
          <div class="bench-option-what">
            ${escapeHtml(opt.whatItIs || "Untitled option")}
            ${opt.recommended ? `<span class="badge badge-recommended">Recommended</span>` : ""}
            ${isApproved ? `<span class="badge badge-complete">Approved</span>` : ""}
          </div>
          ${(opt.vendor || opt.partNumber) ? `<div class="bench-option-meta">${[opt.vendor, opt.partNumber].filter(Boolean).join(" &middot; ")}</div>` : ""}
        </div>
        ${opt.picture ? `
          <a href="${escapeAttr(opt.link || opt.picture)}" target="_blank" rel="noopener noreferrer" class="bench-thumb-link">
            <img src="${escapeAttr(opt.picture)}" alt="${escapeAttr(opt.whatItIs || "part photo")}" class="bench-thumb" />
          </a>` : ""}
      </div>

      ${opt.link ? `<a href="${escapeAttr(opt.link)}" target="_blank" rel="noopener noreferrer" class="bench-option-link">${escapeHtml(opt.link)}</a>` : ""}
      ${opt.notes ? `<div class="item-notes">${escapeHtml(opt.notes)}</div>` : ""}
      ${links.length ? `
        <div class="bench-more-links">
          ${links.map((l) => `<a href="${escapeAttr(l.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(l.label)}</a>`).join("")}
        </div>` : ""}

      ${item.status !== "approved" ? `
        <button type="button" class="bench-approve-btn" data-item="${item.id}" data-option="${opt.id}">Approve this option</button>
      ` : ""}
    </div>
  `;
}

function benchItemCardHtml(item) {
  return `
    <div class="bench-item-card">
      <div class="item-head">
        <div class="item-name">
          ${escapeHtml(item.partName)}
          ${item.category ? `<span class="item-cat">${escapeHtml(item.category)}</span>` : ""}
        </div>
        <span class="badge ${item.status === "approved" ? "badge-complete" : "badge-in-progress"}">
          ${item.status === "approved" ? "Approved" : "Needs Decision"}
        </span>
      </div>
      <div class="bench-item-meta">Submitted by ${escapeHtml(item.submitter || "Unknown")} &middot; ${escapeHtml(item.createdAt)}</div>
      <div class="item-notes">${escapeHtml(item.reason)}</div>
      ${item.beforeOrdering ? `<p class="bench-before"><strong>Before ordering:</strong> ${escapeHtml(item.beforeOrdering)}</p>` : ""}

      <div class="bench-options-list">
        ${item.options.map((opt) => benchOptionCardHtml(item, opt)).join("")}
      </div>

      <div class="bench-item-actions">
        ${item.status === "approved" ? `<button type="button" class="bench-secondary-btn bench-reopen-btn" data-item="${item.id}">Reopen decision</button>` : ""}
        <button type="button" class="bench-delete-item" data-item="${item.id}">Delete item</button>
      </div>
    </div>
  `;
}

function wireBenchList() {
  document.querySelectorAll(".bench-approve-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = benchItems.find((i) => i.id === btn.dataset.item);
      if (!item) return;
      item.status = "approved";
      item.approvedOptionId = btn.dataset.option;
      saveBenchItems();
      renderBench();
    });
  });

  document.querySelectorAll(".bench-reopen-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = benchItems.find((i) => i.id === btn.dataset.item);
      if (!item) return;
      item.status = "needs-decision";
      item.approvedOptionId = null;
      saveBenchItems();
      renderBench();
    });
  });

  document.querySelectorAll(".bench-delete-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!confirm("Delete this bench item?")) return;
      benchItems = benchItems.filter((i) => i.id !== btn.dataset.item);
      saveBenchItems();
      renderBench();
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
    document.getElementById("bench-open").addEventListener("click", openBenchForm);
  }
  wireBenchList();
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
  renderDashboard();
  renderCar();
  renderTooling();
  renderTasks();
  renderBench();
  renderLog();
  initNav();
});
