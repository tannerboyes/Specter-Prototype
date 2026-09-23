/* Specter Prototype tracker — rendering logic. Edit data.js, not this file, to update content. */

const STATUS_LABEL = {
  "not-started": "Not Started",
  "in-progress": "In Progress",
  "blocked": "Blocked",
  "complete": "Complete",
  "todo": "To Do",
  "done": "Done",
};

function badge(status) {
  const label = STATUS_LABEL[status] || status;
  return `<span class="badge badge-${status}">${label}</span>`;
}

function priorityBadge(p) {
  return `<span class="badge badge-${p}">${p}</span>`;
}

function avg(nums) {
  if (!nums.length) return 0;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

/* ---------- Dashboard ---------- */

function renderDashboard() {
  const overallProgress = avg(DATA.systems.map((s) => s.progress));
  const toolingProgress = avg(DATA.tooling.map((t) => t.progress));
  const openTasks = DATA.tasks.filter((t) => t.status !== "done").length;
  const doneTasks = DATA.tasks.filter((t) => t.status === "done").length;
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

let taskFilter = "all";

function renderTasks() {
  const filtered = taskFilter === "all"
    ? DATA.tasks
    : DATA.tasks.filter((t) => t.status === taskFilter);

  document.getElementById("tasks").innerHTML = `
    <h1>Tasks</h1>
    <p class="view-sub">Everything actionable across the car, tooling, and processes.</p>
    <div class="task-filters">
      ${["all", "todo", "in-progress", "done"].map((f) => `
        <button data-filter="${f}" class="${taskFilter === f ? "active" : ""}">
          ${f === "all" ? "All" : STATUS_LABEL[f]}
        </button>
      `).join("")}
    </div>
    <table class="tasks">
      <thead>
        <tr><th>Task</th><th>Area</th><th>Priority</th><th>Status</th></tr>
      </thead>
      <tbody>
        ${filtered.map((t) => `
          <tr>
            <td>
              ${t.title}
              ${t.notes ? `<div class="task-notes">${t.notes}</div>` : ""}
            </td>
            <td>${t.area}</td>
            <td>${priorityBadge(t.priority)}</td>
            <td>${badge(t.status)}</td>
          </tr>
        `).join("") || `<tr><td colspan="4" class="task-notes">No tasks in this view.</td></tr>`}
      </tbody>
    </table>
  `;

  document.querySelectorAll(".task-filters button").forEach((btn) => {
    btn.addEventListener("click", () => {
      taskFilter = btn.dataset.filter;
      renderTasks();
    });
  });
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

const BENCH_STORAGE_KEY = "specter-bench-tasks";
let benchTasks = [];

function loadBenchTasks() {
  try {
    const raw = localStorage.getItem(BENCH_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return DATA.bench.map((t) => ({ ...t }));
}

function saveBenchTasks() {
  try { localStorage.setItem(BENCH_STORAGE_KEY, JSON.stringify(benchTasks)); } catch (e) {}
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function benchItemHtml(t) {
  return `
    <div class="bench-item ${t.done ? "done" : ""}" data-id="${t.id}">
      <label class="bench-check">
        <input type="checkbox" ${t.done ? "checked" : ""} />
        <span>${escapeHtml(t.title)}</span>
      </label>
      <button type="button" class="bench-delete" aria-label="Delete task">&times;</button>
    </div>
  `;
}

function renderBench() {
  document.getElementById("bench").innerHTML = `
    <h1>Bench</h1>
    <p class="view-sub">Quick-capture tasks — add anything that needs doing at the bench. Saved in this browser.</p>
    <form class="bench-form" id="bench-form">
      <input type="text" id="bench-input" placeholder="Add a task..." autocomplete="off" />
      <button type="submit">Add</button>
    </form>
    <div class="bench-list">
      ${benchTasks.length ? benchTasks.map(benchItemHtml).join("") : `<p class="view-sub">Nothing on the bench right now.</p>`}
    </div>
  `;

  document.getElementById("bench-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.getElementById("bench-input");
    const title = input.value.trim();
    if (!title) return;
    benchTasks.unshift({ id: "b" + Date.now(), title, done: false });
    saveBenchTasks();
    renderBench();
  });

  document.querySelectorAll(".bench-item").forEach((el) => {
    const id = el.dataset.id;
    el.querySelector('input[type="checkbox"]').addEventListener("change", (e) => {
      const task = benchTasks.find((t) => t.id === id);
      if (task) task.done = e.target.checked;
      saveBenchTasks();
      renderBench();
    });
    el.querySelector(".bench-delete").addEventListener("click", () => {
      benchTasks = benchTasks.filter((t) => t.id !== id);
      saveBenchTasks();
      renderBench();
    });
  });
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
  benchTasks = loadBenchTasks();
  renderDashboard();
  renderCar();
  renderTooling();
  renderTasks();
  renderBench();
  renderLog();
  initNav();
});
