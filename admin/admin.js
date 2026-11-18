document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  const notice = document.getElementById("loginNotice");

  if (!form || !notice) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    notice.textContent = "A bejelentkezés még nem működik: a szerveroldali hitelesítés nincs beállítva. Ne adj meg valódi vagy máshol használt jelszót ezen az előnézeti oldalon.";
    notice.classList.add("notice-emphasis");
  });
});