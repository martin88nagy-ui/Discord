document.addEventListener("DOMContentLoaded", () => {
  // Helyi fejlesztői backend. Nyilvános használat előtt ezt HTTPS-es backendcímre kell cserélni.
  const API_BASE = "http://127.0.0.1:8000";

  const loginView = document.getElementById("loginView");
  const dashboardView = document.getElementById("dashboardView");
  const form = document.getElementById("loginForm");
  const notice = document.getElementById("loginNotice");
  const loginButton = document.getElementById("loginButton");
  const logoutButton = document.getElementById("logoutButton");
  const refreshAuditButton = document.getElementById("refreshAuditButton");
  const auditNotice = document.getElementById("auditNotice");
  const auditList = document.getElementById("auditList");

  // A token csak memóriában él: frissítéskor törlődik, nem kerül localStorage-be.
  let accessToken = null;

  function showNotice(message, isError = false) {
    notice.textContent = message;
    notice.classList.toggle("notice-error", isError);
    notice.classList.add("notice-emphasis");
  }

  function showDashboard(admin) {
    document.getElementById("adminUsername").textContent = admin.username ?? "–";
    document.getElementById("adminId").textContent = admin.id ?? "–";
    document.getElementById("adminRole").textContent = admin.role ?? "–";
    document.getElementById("adminStatus").textContent = admin.is_active ? "Aktív" : "Inaktív";
    loginView.hidden = true;
    dashboardView.hidden = false;
    loadAudit();
  }

  function showLogin() {
    accessToken = null;
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

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    loginButton.disabled = true;
    loginButton.textContent = "Bejelentkezés…";
    showNotice("Kapcsolódás a helyi backendhez…");

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    try {
      const result = await apiRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password })
      });
      accessToken = result.access_token;
      document.getElementById("password").value = "";
      showDashboard(result.admin);
    } catch (error) {
      accessToken = null;
      const isNetworkError = error instanceof TypeError;
      showNotice(
        isNetworkError
          ? "Nem érhető el a helyi backend. Ellenőrizd, hogy fut-e a CMD-ablakban a szerver."
          : `Bejelentkezés sikertelen: ${error.message}`,
        true
      );
    } finally {
      loginButton.disabled = false;
      loginButton.innerHTML = 'Bejelentkezés <span>→</span>';
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
        const item = document.createElement("article");
        item.className = "audit-entry";
        const title = document.createElement("strong");
        title.textContent = entry.action || "Művelet";
        const details = document.createElement("span");
        details.textContent = [entry.target, entry.details].filter(Boolean).join(" · ") || "Nincs további részlet";
        const time = document.createElement("time");
        time.textContent = entry.created_at ? new Date(entry.created_at).toLocaleString("hu-HU") : "";
        item.append(title, details, time);
        auditList.append(item);
      }
    } catch (error) {
      auditNotice.textContent = `A napló nem tölthető be: ${error.message}`;
    }
  }

  refreshAuditButton.addEventListener("click", loadAudit);

  logoutButton.addEventListener("click", async () => {
    try {
      await apiRequest("/api/auth/logout", { method: "POST" });
    } catch (_) {
      // A helyi token akkor is törlődik a böngésző memóriájából, ha a szerver nem válaszol.
    }
    showLogin();
    showNotice("Kijelentkeztél.");
  });
});