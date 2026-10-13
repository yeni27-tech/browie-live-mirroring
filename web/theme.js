// Dipasang sebelum CSS dimuat supaya tidak berkedip terang→gelap. "auto" = ikut setelan sistem.
(function () {
  try { var t = localStorage.getItem("lm-theme"); if (t === "light" || t === "dark") document.documentElement.setAttribute("data-theme", t); } catch (e) {}
})();
