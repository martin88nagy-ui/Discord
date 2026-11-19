document.addEventListener("DOMContentLoaded", () => {
  // Helyi fejlesztői backend. Éles használat előtt HTTPS-es, hostolt API-cím szükséges.
  const API_BASE = "http://127.0.0.1:8000";

  const $ = (id) => document.getElementById(id);
  const loginView = $("loginView");
  const dashboardView = $("dashboardView");
  const form = $("loginForm");
  const notice = $("loginNotice");
  const loginButton = $("loginButton");
  const logoutButton = $("logoutButton");
  const refreshAuditButton = $("refreshAuditButton");
  const refreshAdminsButton = $("refreshAdminsButton");
  const createAdminForm = $("createAdminForm");
  const createAdminButton = $("createAdminButton");
  const auditNotice = $("auditNotice");
  const auditList = $("auditList");
  const adminListNotice = $("adminListNotice");
  const adminList = $("adminList");

  // A token kizárólag memóriában él, nem kerül localStorage/sessionStorage tárba.
  let accessToken = null;
  let currentAdmin = null;

  function showNotice(message, isError = false) {
    notice.textContent = message;
    notice.classList.toggle("notice-error", isError);
    notice.classList.add("notice-emphasis");
  }

  function showDashboard(admin) {
    currentAdmin = admin;
    $("adminUsername").textContent = admin.username ?? "–";
    $("adminId").textContent = admin.id ?? "–";
    $("adminRole").textContent = admin.role ?? "–";
    $("adminStatus").textContent = admin.is_active ? "Aktív" : "Inaktív";
    loginView.hidden = true;
    dashboardView.hidden = false;
    loadAdmins();
    loadAudit();
  }

  function showLogin() {
    accessToken = null;
    currentAdmin = null;
    dashboardView.hidden = true;
    loginView.hidden = false;
  }

  async function apiRequest(path, options = {}) {
    const headers = new Headers(options.headers || {});
    headers.set("Accept", "application/json");
    if (options.body) headers.set("Content-Type", "application/json");
    if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      cache: "no-store"
    });

    if (!response.ok) {
      let message = `HTTP ${response.status}`;
      try {
        const data = await response.json();
        message = data.detail || message;
      } catch (_) {}
      throw new Error(typeof message === "string" ? message : JSON.stringify(message));
    }

    if (response.status === 204) return null;
    return response.json();
  }

  function formatDate(value) {
    if (!value) return "–";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "–" : date.toLocaleString("hu-HU");
  }

  function makeElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    loginButton.disabled = true;
    loginButton.textContent = "Bejelentkezés…";
    showNotice("Kapcsolódás a helyi backendhez…");

    const username = $("username").value.trim();
    const password = $("password").value;

    try {
      const result = await apiRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password })
      });
      accessToken = result.access_token;
      $("password").value = "";
      showDashboard(result.admin);
    } catch (error) {
      accessToken = null;
      showNotice(
        error instanceof TypeError
          ? "Nem érhető el a helyi backend. Ellenőrizd, hogy fut-e a szerver a CMD-ablakban."
          : `Bejelentkezés sikertelen: ${error.message}`,
        true
      );
    } finally {
      loginButton.disabled = false;
      loginButton.innerHTML = 'Bejelentkezés <span>→</span>';
    }
  });

  async function loadAdmins() {
    adminListNotice.textContent = "Adminlista betöltése…";
    adminList.replaceChildren();
    try {
      const admins = await apiRequest("/api/admin/users");
      $("adminCount").textContent = `${admins.length} fiók`;
      if (!admins.length) {
        adminListNotice.textContent = "Még nincs adminfiók.";
        return;
      }
      adminListNotice.textContent = "";
      admins.forEach((admin) => adminList.append(buildAdminRow(admin)));
    } catch (error) {
      adminListNotice.textContent = `Az adminlista nem tölthető be: ${error.message}`;
      $("adminCount").textContent = "–";
    }
  }

  function buildAdminRow(admin) {
    const row = makeElement("article", "admin-row");
    const identity = makeElement("div", "admin-identity");
    const name = makeElement("strong", "admin-name", admin.username);
    const meta = makeElement("span", "admin-meta", `ID #${admin.id} · Létrehozva: ${formatDate(admin.created_at)}`);
    const role = makeElement("span", `role-pill role-${admin.role}`, admin.role === "owner" ? "Tulajdonos" : admin.role === "admin" ? "Admin" : "Moderátor");
    const status = makeElement("span", admin.is_active ? "state-pill state-active" : "state-pill state-inactive", admin.is_active ? "Aktív" : "Letiltva");
    identity.append(name, meta, role, status);
    row.append(identity);

    const controls = makeElement("div", "admin-row-controls");
    if (admin.role !== "owner") {
      const roleSelect = document.createElement("select");
      roleSelect.className = "admin-role-select";
      roleSelect.setAttribute("aria-label", `${admin.username} jogosultsága`);
      [["moderator", "Moderátor"], ["admin", "Admin"]].forEach(([value, label]) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        option.selected = admin.role === value;
        roleSelect.append(option);
      });
      const saveRole = makeElement("button", "button small-button", "Jogosultság mentése");
      saveRole.type = "button";
      saveRole.addEventListener("click", async () => {
        saveRole.disabled = true;
        try {
          await apiRequest(`/api/admin/users/${admin.id}`, {
            method: "PATCH",
            body: JSON.stringify({ role: roleSelect.value })
          });
          await Promise.all([loadAdmins(), loadAudit()]);
        } catch (error) {
          window.alert(`Nem sikerült módosítani: ${error.message}`);
        } finally {
          saveRole.disabled = false;
        }
      });

      const toggle = makeElement("button", "button small-button secondary-button", admin.is_active ? "Letiltás" : "Aktiválás");
      toggle.type = "button";
      toggle.disabled = currentAdmin && Number(currentAdmin.id) === Number(admin.id);
      toggle.title = toggle.disabled ? "A saját fiókodat itt nem tilthatod le." : "";
      toggle.addEventListener("click", async () => {
        const nextState = !admin.is_active;
        if (!window.confirm(`Biztosan ${nextState ? "aktiválod" : "letiltod"} ezt a fiókot: ${admin.username}?`)) return;
        toggle.disabled = true;
        try {
          await apiRequest(`/api/admin/users/${admin.id}`, {
            method: "PATCH",
            body: JSON.stringify({ is_active: nextState })
          });
          await Promise.all([loadAdmins(), loadAudit()]);
        } catch (error) {
          window.alert(`Nem sikerült módosítani: ${error.message}`);
        } finally {
          toggle.disabled = false;
        }
      });

      const remove = makeElement("button", "button small-button danger-button", "Törlés");
      remove.type = "button";
      remove.disabled = currentAdmin && Number(currentAdmin.id) === Number(admin.id);
      remove.title = remove.disabled ? "A saját fiókodat nem törölheted." : "";
      remove.addEventListener("click", async () => {
        if (!window.confirm(`Végleg törlöd ezt az adminfiókot: ${admin.username}? Ez a művelet nem visszavonható.`)) return;
        remove.disabled = true;
        try {
          await apiRequest(`/api/admin/users/${admin.id}`, { method: "DELETE" });
          await Promise.all([loadAdmins(), loadAudit()]);
        } catch (error) {
          window.alert(`Nem sikerült törölni: ${error.message}`);
        } finally {
          remove.disabled = false;
        }
      });
      controls.append(roleSelect, saveRole, toggle, remove);
    } else {
      controls.append(makeElement("span", "owner-lock", "🔒 Védett fiók"));
    }
    row.append(controls);
    return row;
  }

  createAdminForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const username = $("newAdminUsername").value.trim();
    const password = $("newAdminPassword").value;
    const role = $("newAdminRole").value;
    createAdminButton.disabled = true;
    createAdminButton.textContent = "Létrehozás…";
    try {
      await apiRequest("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({ username, password, role })
      });
      createAdminForm.reset();
      $("newAdminRole").value = "moderator";
      adminListNotice.textContent = "Az adminfiók sikeresen létrejött.";
      await Promise.all([loadAdmins(), loadAudit()]);
    } catch (error) {
      adminListNotice.textContent = `Nem sikerült létrehozni a fiókot: ${error.message}`;
    } finally {
      createAdminButton.disabled = false;
      createAdminButton.textContent = "Admin létrehozása";
    }
  });

  async function loadAudit() {
    auditNotice.textContent = "Napló betöltése…";
    auditList.replaceChildren();
    try {
      const entries = await apiRequest("/api/admin/audit?limit=20");
      if (!entries.length) {
        auditNotice.textContent = "Még nincs megjeleníthető naplóbejegyzés.";
        return;
      }
      auditNotice.textContent = "";
      for (const entry of entries) {
        const item = makeElement("article", "audit-entry");
        const title = makeElement("strong", "", entry.action || "Művelet");
        const details = makeElement("span", "", [entry.target, entry.details].filter(Boolean).join(" · ") || "Nincs további részlet");
        const time = makeElement("time", "", formatDate(entry.created_at));
        item.append(title, details, time);
        auditList.append(item);
      }
    } catch (error) {
      auditNotice.textContent = `A napló nem tölthető be: ${error.message}`;
    }
  }

  refreshAdminsButton.addEventListener("click", loadAdmins);
  refreshAuditButton.addEventListener("click", loadAudit);

  logoutButton.addEventListener("click", async () => {
    try {
      await apiRequest("/api/auth/logout", { method: "POST" });
    } catch (_) {
      // A token a szerver válaszától függetlenül törlődik a memóriából.
    }
    showLogin();
    showNotice("Kijelentkeztél.");
  });
});