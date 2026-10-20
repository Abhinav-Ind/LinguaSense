const API = localStorage.getItem("linguasense_api") || "https://linguasense-backend.onrender.com/api";
const $ = (id) => document.getElementById(id);
let token = localStorage.getItem("linguasense_token") || "";
let user = null;
let authMode = "login";
let toastTimer;
const speechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognizer = null;

function toast(message) {
  const el = $("toast"); el.textContent = message; el.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
}
function showNotice(message, error = false) {
  const el = $("notice"); el.textContent = message; el.classList.toggle("hidden", !message);
  el.classList.toggle("error", error);
}
function setOutput(id, text) {
  const el = $(id); el.textContent = text || "";
  el.classList.toggle("empty-state", !text);
}
async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  let response;
  try { response = await fetch(`${API}${path}`, { ...options, headers }); }
  catch (_) { throw new Error("Cannot reach the Flask API. Start the backend and check its URL."); }
  let data = {};
  try { data = await response.json(); } catch (_) { }
  if (!response.ok) {
    if (response.status === 401 && token) signOut(false);
    throw new Error(data.error || "Something went wrong.");
  }
  return data;
}
function setBusy(button, busy, label) {
  if (busy) { button.dataset.oldLabel = button.innerHTML; button.disabled = true; button.innerHTML = `<span class="spinner">◌</span> ${label || "Working…"}`; }
  else { button.disabled = false; if (button.dataset.oldLabel) button.innerHTML = button.dataset.oldLabel; }
}
async function runAction(button, label, path, payload, outputId, after) {
  const original = button.innerHTML; setBusy(button, true, label);
  showNotice("");
  try {
    const data = await api(path, { method: "POST", body: JSON.stringify(payload) });
    setOutput(outputId, data.output);
    if (after) after(data);
    toast("Done — your result is ready.");
    return data;
  } catch (e) { showNotice(e.message, true); toast(e.message); }
  finally { setBusy(button, false); button.innerHTML = original; }
}
function showView(name) {
  document.querySelectorAll(".tool-view").forEach(v => v.classList.add("hidden"));
  const view = $(`view-${name}`); if (view) view.classList.remove("hidden");
  document.querySelectorAll(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.view === name));
  const titles = { refine: "Writing assistant", summarize: "Summarization", translate: "Translation", voice: "Voice studio", history: "Your history" };
  $("pageTitle").textContent = titles[name] || "LinguaSense";
  if (name === "history" && token) loadHistory();
}
function renderAuth() {
  const loggedIn = Boolean(token && user);
  $("authPanel").classList.toggle("hidden", loggedIn);
  $("workspace").classList.toggle("hidden", !loggedIn);
  $("authOpen").classList.toggle("hidden", loggedIn);
  $("userChip").classList.toggle("hidden", !loggedIn);
  $("logoutBtn").classList.toggle("hidden", !loggedIn);
  if (loggedIn) {
    $("userChip").textContent = (user.name || "U").charAt(0).toUpperCase();
    $("welcomeTitle").textContent = `Welcome back, ${user.name.split(" ")[0]}.`;
    $("personaSelect").value = user.persona || "Professional";
    $("sidePersona").textContent = user.persona || "Professional";
  }
}
function signOut(show = true) {
  token = ""; user = null; localStorage.removeItem("linguasense_token");
  renderAuth(); if (show) toast("Signed out.");
}
function setAuthMode(mode) {
  authMode = mode;
  document.querySelectorAll(".tab").forEach(b => b.classList.toggle("active", b.dataset.auth === mode));
  $("nameField").classList.toggle("hidden", mode !== "register");
  $("authSubmit").textContent = mode === "register" ? "Create account" : "Sign in";
  $("authMessage").textContent = "";
}
async function loadMe() {
  if (!token) { renderAuth(); return; }
  try { const data = await api("/auth/me"); user = data.user; renderAuth(); }
  catch (_) { signOut(false); renderAuth(); }
}
async function loadHealth() {
  try {
    const data = await api("/health", { headers: {} });
    $("connectionStatus").innerHTML = `<i></i> ${data.groq_configured ? "API connected" : "Add Groq key"}`;
    $("connectionStatus").classList.toggle("ok", data.groq_configured);
    if (!data.groq_configured) showNotice("Backend is running, but GROQ_API_KEY is missing. Add it to backend/.env and restart Flask.");
  } catch (_) {
    $("connectionStatus").innerHTML = "<i></i> API offline";
    showNotice("Start the Flask backend at http://127.0.0.1:5000 to use LinguaSense.", true);
  }
}
document.querySelectorAll(".nav-item").forEach(b => b.addEventListener("click", () => showView(b.dataset.view)));
document.querySelectorAll(".tab").forEach(b => b.addEventListener("click", () => setAuthMode(b.dataset.auth)));
$("authOpen").addEventListener("click", () => $("authPanel").classList.toggle("hidden"));
$("logoutBtn").addEventListener("click", () => signOut());
$("authForm").addEventListener("submit", async (e) => {
  e.preventDefault(); const form = new FormData(e.currentTarget);
  const payload = { email: form.get("email"), password: form.get("password") };
  if (authMode === "register") payload.name = form.get("name");
  $("authSubmit").disabled = true; $("authMessage").textContent = "";
  try {
    const data = await api(authMode === "register" ? "/auth/register" : "/auth/login", { method: "POST", body: JSON.stringify(payload) });
    token = data.token; user = data.user; localStorage.setItem("linguasense_token", token);
    renderAuth(); showNotice(""); toast(authMode === "register" ? "Account created." : "Welcome back!");
    if (document.querySelector(".nav-item.active")) showView(document.querySelector(".nav-item.active").dataset.view);
  } catch (err) { $("authMessage").textContent = err.message; }
  finally { $("authSubmit").disabled = false; }
});
$("personaSelect").addEventListener("change", async e => {
  try { const data = await api("/persona", { method: "PUT", body: JSON.stringify({ persona: e.target.value }) }); user.persona = data.persona; $("sidePersona").textContent = data.persona; toast("Persona updated."); }
  catch (err) { showNotice(err.message, true); e.target.value = user?.persona || "Professional"; }
});
$("refineInput").addEventListener("input", e => $("refineCount").textContent = `${e.target.value.length.toLocaleString()} characters`);
$("summaryInput").addEventListener("input", e => $("summaryCount").textContent = `${e.target.value.length.toLocaleString()} characters`);
$("translateInput").addEventListener("input", e => $("translateCount").textContent = `${e.target.value.length.toLocaleString()} characters`);
$("refineBtn").addEventListener("click", () => runAction($("refineBtn"), "Refining…", "/refine", { text: $("refineInput").value, instruction: $("refineAction").value }, "refineOutput"));
$("summaryBtn").addEventListener("click", () => runAction($("summaryBtn"), "Summarizing…", "/summarize", { text: $("summaryInput").value, style: $("summaryStyle").value }, "summaryOutput"));
$("summaryFileBtn").addEventListener("click", async () => {
  const fileInput = $("summaryFile"), file = fileInput.files?.[0], button = $("summaryFileBtn");
  if (!file) return showNotice("Choose a .txt, .pdf, or .docx file first.", true);
  if (file.size > 5 * 1024 * 1024) return showNotice("File is too large. Maximum upload size is 5 MB.", true);
  const form = new FormData(); form.append("file", file); form.append("style", $("summaryStyle").value);
  const original = button.innerHTML; setBusy(button, true, "Extracting & summarizing…"); showNotice("");
  try {
    const response = await fetch(`${API}/summarize-file`, { method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {}, body: form });
    let data = {}; try { data = await response.json(); } catch (_) { }
    if (!response.ok) { if (response.status === 401 && token) signOut(false); throw new Error(data.error || "Could not summarize this document."); }
    setOutput("summaryOutput", data.output);
    $("summaryInput").value = "";
    $("summaryCount").textContent = `${Number(data.extracted_characters).toLocaleString()} characters extracted from ${data.filename}`;
    $("summaryFileHelp").textContent = `Summarized ${data.filename} · ${Number(data.extracted_characters).toLocaleString()} characters extracted.`;
    toast("Document summarized successfully.");
  } catch (err) { showNotice(err.message, true); toast(err.message); }
  finally { setBusy(button, false); button.innerHTML = original; }
});
$("translateBtn").addEventListener("click", () => runAction($("translateBtn"), "Translating…", "/translate", { text: $("translateInput").value, target_language: $("targetLanguage").value, tone: $("translationTone").value }, "translateOutput", () => $("translationLanguage").textContent = $("targetLanguage").value.toUpperCase()));
document.querySelectorAll("[data-copy]").forEach(b => b.addEventListener("click", async () => {
  const text = $(b.dataset.copy).textContent;
  if (!text || $(b.dataset.copy).classList.contains("empty-state")) return toast("There is no result to copy yet.");
  try { await navigator.clipboard.writeText(text); toast("Copied to clipboard."); } catch (_) { toast("Clipboard access was blocked by the browser."); }
}));
document.querySelectorAll("[data-download]").forEach(b => b.addEventListener("click", () => {
  const el = $(b.dataset.download), text = el.textContent;
  if (!text || el.classList.contains("empty-state")) return toast("There is no result to download yet.");
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob), a = document.createElement("a");
  a.href = url; a.download = b.dataset.filename || "linguasense.txt"; a.click(); URL.revokeObjectURL(url);
}));
async function loadHistory() {
  const list = $("historyList"); list.innerHTML = '<div class="panel empty-card">Loading history…</div>';
  try {
    const data = await api("/history");
    if (!data.items.length) { list.innerHTML = '<div class="panel empty-card">No saved items yet. Your completed tasks will appear here.</div>'; return; }
    list.innerHTML = data.items.map(item => `<article class="history-card" data-id="${item.id}"><div class="history-card-top"><div><h3>${escapeHtml(item.title)}</h3><div class="history-meta">${escapeHtml(item.kind)} · ${new Date(item.created_at).toLocaleString()}</div></div><button class="button button-outline small delete-history" data-id="${item.id}">Delete</button></div><div class="history-preview">${escapeHtml(item.output_text.slice(0, 380))}${item.output_text.length > 380 ? "…" : ""}</div><div class="history-card-actions"><button class="button button-outline small use-history" data-output="${encodeURIComponent(item.output_text)}">Copy result</button><button class="button button-outline small show-history" data-input="${encodeURIComponent(item.input_text)}" data-output="${encodeURIComponent(item.output_text)}">View details</button></div><div class="history-detail hidden"></div></article>`).join("");
    list.querySelectorAll(".delete-history").forEach(b => b.addEventListener("click", async () => {
      try { await api(`/history/${b.dataset.id}`, { method: "DELETE" }); b.closest(".history-card").remove(); toast("History item deleted."); if (!list.children.length) list.innerHTML = '<div class="panel empty-card">No history items.</div>'; }
      catch (e) { toast(e.message); }
    }));
    list.querySelectorAll(".use-history").forEach(b => b.addEventListener("click", async () => { try { await navigator.clipboard.writeText(decodeURIComponent(b.dataset.output)); toast("Copied result."); } catch (_) { toast("Clipboard access blocked."); } }));
    list.querySelectorAll(".show-history").forEach(b => b.addEventListener("click", () => {
      const card = b.closest(".history-card"), box = card.querySelector(".history-detail");
      box.classList.toggle("hidden");
      box.innerHTML = `<p class="history-meta">INPUT</p><div class="history-preview">${escapeHtml(decodeURIComponent(b.dataset.input))}</div><p class="history-meta">OUTPUT</p><div class="history-preview">${escapeHtml(decodeURIComponent(b.dataset.output))}</div>`;
    }));
  } catch (e) { list.innerHTML = `<div class="panel empty-card">${escapeHtml(e.message)}</div>`; }
}
$("clearHistoryBtn").addEventListener("click", async () => {
  if (!confirm("Delete all your saved history? This cannot be undone.")) return;
  try { await api("/history", { method: "DELETE" }); loadHistory(); toast("History cleared."); }
  catch (e) { toast(e.message); }
});
function escapeHtml(str) { return String(str).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch])); }

if (speechRecognition) {
  recognizer = new speechRecognition(); recognizer.lang = "en-IN"; recognizer.continuous = true; recognizer.interimResults = true;
  recognizer.onstart = () => { $("voiceState").textContent = "Listening… speak naturally"; $("recordBtn").disabled = true; $("stopBtn").disabled = false; };
  recognizer.onresult = e => {
    let finalText = "", interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) finalText += e.results[i][0].transcript + " ";
      else interim += e.results[i][0].transcript;
    }
    if (finalText) $("voiceInput").value = ($("voiceInput").value + " " + finalText).trim();
    $("voiceState").textContent = interim ? `Hearing: ${interim}` : "Listening… speak naturally";
  };
  recognizer.onerror = e => { $("voiceState").textContent = `Speech recognition issue: ${e.error}. You can type in the box below.`; };
  recognizer.onend = () => { $("recordBtn").disabled = false; $("stopBtn").disabled = true; if ($("voiceState").textContent.startsWith("Listening")) $("voiceState").textContent = "Recording stopped."; };
  $("recordBtn").addEventListener("click", () => { try { recognizer.start(); } catch (_) { toast("Speech recognition is already running."); } });
  $("stopBtn").addEventListener("click", () => recognizer.stop());
} else {
  $("voiceState").textContent = "Speech recognition isn't available in this browser.";
  $("recordBtn").disabled = true;
  $("voiceHelp")?.classList?.remove("hidden");
}
$("voiceRefineBtn").addEventListener("click", () => runAction($("voiceRefineBtn"), "Refining…", "/voice/process", { text: $("voiceInput").value, action: "refine" }, "voiceOutput"));
$("voiceTranslateBtn").addEventListener("click", () => runAction($("voiceTranslateBtn"), "Translating…", "/voice/process", { text: $("voiceInput").value, action: "translate", target_language: $("voiceTarget").value }, "voiceOutput"));

(async function init() { await loadHealth(); await loadMe(); renderAuth(); })();
