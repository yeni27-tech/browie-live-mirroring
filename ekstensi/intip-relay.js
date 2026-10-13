// Jembatan MODE INTIP: meneruskan BENTUK data (tanpa nilai) dari intip-hook.js ke background.
window.addEventListener("message", (e) => {
  if (e.source !== window || e.origin !== location.origin) return;
  const d = e.data;
  if (!d || d.__lm !== "intip" || !d.rec) return;
  try { chrome.runtime.sendMessage({ type: "intip-seen", rec: d.rec }); } catch (err) {}
});
