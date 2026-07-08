/**
 * AI Support Widget
 * Embed with: <script src=".../widget.js" data-widget-key="..." data-api-url="..." async></script>
 *
 * Self-contained: no bundler, no framework, no external CSS. Renders inside a
 * Shadow DOM so host-page styles can never leak in (or out).
 */
(function () {
  var scriptTag = document.currentScript;
  var WIDGET_KEY = scriptTag.getAttribute("data-widget-key");
  var API_URL = (scriptTag.getAttribute("data-api-url") || "").replace(/\/$/, "");

  if (!WIDGET_KEY || !API_URL) {
    console.error("[SupportBot widget] Missing data-widget-key or data-api-url on the embed script tag.");
    return;
  }

  var SESSION_KEY = "supportbot_session_" + WIDGET_KEY;
  var sessionId = localStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = "sess_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(SESSION_KEY, sessionId);
  }

  var host = document.createElement("div");
  host.id = "supportbot-widget-root";
  document.body.appendChild(host);
  var root = host.attachShadow({ mode: "open" });

  var style = document.createElement("style");
  style.textContent = [
    ":host { all: initial; }",
    "* { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }",
    ".sb-bubble { position: fixed; bottom: 24px; right: 24px; width: 56px; height: 56px; border-radius: 999px;",
    "  background: #4F5DFF; box-shadow: 0 4px 16px rgba(79,93,255,0.35); display: flex; align-items: center;",
    "  justify-content: center; cursor: pointer; z-index: 2147483000; border: none; transition: transform .15s ease; }",
    ".sb-bubble:hover { transform: scale(1.06); }",
    ".sb-bubble svg { width: 26px; height: 26px; }",
    ".sb-panel { position: fixed; bottom: 92px; right: 24px; width: 360px; max-width: calc(100vw - 32px);",
    "  height: 520px; max-height: calc(100vh - 140px); background: #fff; border-radius: 16px;",
    "  box-shadow: 0 12px 40px rgba(20,26,46,0.18); display: flex; flex-direction: column; overflow: hidden;",
    "  z-index: 2147483000; opacity: 0; transform: translateY(12px); pointer-events: none; transition: all .18s ease; }",
    ".sb-panel.open { opacity: 1; transform: translateY(0); pointer-events: all; }",
    ".sb-header { background: #10142B; color: #fff; padding: 14px 16px; display: flex; align-items: center; gap: 8px; }",
    ".sb-dot { width: 8px; height: 8px; border-radius: 999px; background: #22c55e; }",
    ".sb-title { font-weight: 600; font-size: 14px; }",
    ".sb-close { margin-left: auto; background: none; border: none; color: rgba(255,255,255,.6); cursor: pointer; font-size: 18px; }",
    ".sb-messages { flex: 1; overflow-y: auto; padding: 14px; background: #F7F8FB; display: flex; flex-direction: column; gap: 10px; }",
    ".sb-msg { max-width: 82%; padding: 8px 12px; border-radius: 12px; font-size: 13.5px; line-height: 1.4; white-space: pre-wrap; }",
    ".sb-msg.user { align-self: flex-end; background: #4F5DFF; color: #fff; border-bottom-right-radius: 4px; }",
    ".sb-msg.bot { align-self: flex-start; background: #fff; border: 1px solid rgba(0,0,0,.06); border-bottom-left-radius: 4px; }",
    ".sb-rich-list { margin: 4px 0 0; padding-left: 18px; }",
    ".sb-rich-table { border-collapse: collapse; margin-top: 6px; width: 100%; }",
    ".sb-rich-table th, .sb-rich-table td { border: 1px solid rgba(0,0,0,.08); padding: 4px 6px; font-size: 12px; text-align: left; }",
    ".sb-rich-card { border: 1px solid rgba(0,0,0,.08); border-radius: 8px; padding: 8px; margin-top: 6px; }",
    ".sb-rich-card-title { font-weight: 600; margin-bottom: 2px; }",
    ".sb-rich-links a { color: #4F5DFF; display: block; margin-top: 4px; }",
    ".sb-followups { display: flex; flex-wrap: wrap; gap: 6px; padding: 0 14px 10px; }",
    ".sb-followup-chip { border: 1px solid rgba(79,93,255,.3); color: #4F5DFF; background: #fff; border-radius: 999px;",
    "  padding: 5px 10px; font-size: 12px; cursor: pointer; }",
    ".sb-followup-chip:hover { background: #E7E8FF; }",
    ".sb-inputbar { display: flex; gap: 8px; padding: 10px; border-top: 1px solid rgba(0,0,0,.06); background: #fff; }",
    ".sb-input { flex: 1; border: 1px solid rgba(0,0,0,.12); border-radius: 999px; padding: 8px 14px; font-size: 13.5px; outline: none; }",
    ".sb-input:focus { border-color: #4F5DFF; }",
    ".sb-send { background: #4F5DFF; color: #fff; border: none; border-radius: 999px; width: 36px; height: 36px;",
    "  cursor: pointer; display: flex; align-items: center; justify-content: center; }",
    ".sb-typing { align-self: flex-start; display: flex; gap: 3px; padding: 10px 12px; background: #fff;",
    "  border: 1px solid rgba(0,0,0,.06); border-radius: 12px; }",
    ".sb-typing span { width: 6px; height: 6px; border-radius: 999px; background: #b7bbd6; animation: sb-bounce 1s infinite; }",
    ".sb-typing span:nth-child(2) { animation-delay: .15s; } .sb-typing span:nth-child(3) { animation-delay: .3s; }",
    "@keyframes sb-bounce { 0%,60%,100% { transform: translateY(0); } 30% { transform: translateY(-4px); } }",
  ].join("\n");
  root.appendChild(style);

  var bubble = document.createElement("button");
  bubble.className = "sb-bubble";
  bubble.setAttribute("aria-label", "Open chat support");
  bubble.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>';
  root.appendChild(bubble);

  var panel = document.createElement("div");
  panel.className = "sb-panel";
  panel.innerHTML =
    '<div class="sb-header"><span class="sb-dot"></span><span class="sb-title" id="sb-bot-name">Support</span>' +
    '<button class="sb-close" aria-label="Close chat">\u2715</button></div>' +
    '<div class="sb-messages" id="sb-messages"></div>' +
    '<div class="sb-followups" id="sb-followups"></div>' +
    '<div class="sb-inputbar"><input class="sb-input" id="sb-input" placeholder="Type a message..." />' +
    '<button class="sb-send" id="sb-send" aria-label="Send">' +
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="white" stroke-width="2"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4 20-7z"/></svg>' +
    "</button></div>";
  root.appendChild(panel);

  var messagesEl = panel.querySelector("#sb-messages");
  var followupsEl = panel.querySelector("#sb-followups");
  var inputEl = panel.querySelector("#sb-input");
  var sendBtn = panel.querySelector("#sb-send");
  var closeBtn = panel.querySelector(".sb-close");
  var titleEl = panel.querySelector("#sb-bot-name");

  var isOpen = false;
  function togglePanel() {
    isOpen = !isOpen;
    panel.classList.toggle("open", isOpen);
    if (isOpen && messagesEl.childElementCount === 0) bootstrap();
  }
  bubble.addEventListener("click", togglePanel);
  closeBtn.addEventListener("click", togglePanel);

  function el(html) {
    var t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstChild;
  }

  function renderRich(rich) {
    if (!rich || rich.type === "text") return "";
    if (rich.type === "list" && rich.items) {
      return '<ul class="sb-rich-list">' + rich.items.map((i) => "<li>" + escapeHtml(i) + "</li>").join("") + "</ul>";
    }
    if (rich.type === "table" && rich.headers && rich.rows) {
      var head = "<tr>" + rich.headers.map((h) => "<th>" + escapeHtml(h) + "</th>").join("") + "</tr>";
      var body = rich.rows
        .map((row) => "<tr>" + row.map((c) => "<td>" + escapeHtml(c) + "</td>").join("") + "</tr>")
        .join("");
      return '<table class="sb-rich-table">' + head + body + "</table>";
    }
    if (rich.type === "card") {
      return (
        '<div class="sb-rich-card">' +
        (rich.title ? '<div class="sb-rich-card-title">' + escapeHtml(rich.title) + "</div>" : "") +
        (rich.description ? "<div>" + escapeHtml(rich.description) + "</div>" : "") +
        "</div>"
      );
    }
    if (rich.type === "links" && rich.links) {
      return (
        '<div class="sb-rich-links">' +
        rich.links.map((l) => '<a href="' + l.url + '" target="_blank" rel="noopener">' + escapeHtml(l.label) + "</a>").join("") +
        "</div>"
      );
    }
    return "";
  }

  function escapeHtml(str) {
    var d = document.createElement("div");
    d.textContent = String(str);
    return d.innerHTML;
  }

  function addMessage(role, content, rich) {
    var bubbleEl = el(
      '<div class="sb-msg ' + (role === "USER" ? "user" : "bot") + '">' + escapeHtml(content) + renderRich(rich) + "</div>"
    );
    messagesEl.appendChild(bubbleEl);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function showTyping() {
    var t = el('<div class="sb-typing" id="sb-typing-indicator"><span></span><span></span><span></span></div>');
    messagesEl.appendChild(t);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }
  function hideTyping() {
    var t = root.getElementById ? null : panel.querySelector("#sb-typing-indicator");
    var found = root.querySelector("#sb-typing-indicator");
    if (found) found.remove();
  }

  function renderFollowups(list) {
    followupsEl.innerHTML = "";
    (list || []).slice(0, 4).forEach((q) => {
      var chip = el('<button class="sb-followup-chip"></button>');
      chip.textContent = q;
      chip.addEventListener("click", () => sendMessage(q));
      followupsEl.appendChild(chip);
    });
  }

  async function bootstrap() {
    try {
      var res = await fetch(API_URL + "/api/chat/" + WIDGET_KEY + "/config");
      var config = await res.json();
      titleEl.textContent = config.botName || "Support";
      addMessage("ASSISTANT", config.welcomeMessage || "Hi! How can I help?");
      renderFollowups(config.suggestedQuestions);
    } catch (e) {
      addMessage("ASSISTANT", "Sorry, I'm having trouble connecting right now. Please try again shortly.");
    }
  }

  async function sendMessage(text) {
    if (!text) return;
    addMessage("USER", text);
    inputEl.value = "";
    followupsEl.innerHTML = "";
    showTyping();
    try {
      var res = await fetch(API_URL + "/api/chat/" + WIDGET_KEY + "/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sessionId, message: text }),
      });
      var data = await res.json();
      hideTyping();
      if (!res.ok) {
        addMessage("ASSISTANT", "Something went wrong on our end. A team member will follow up if needed.");
        return;
      }
      addMessage("ASSISTANT", data.message.content, data.message.richContent);
      renderFollowups(data.suggestedFollowups);
    } catch (e) {
      hideTyping();
      addMessage("ASSISTANT", "Sorry, I couldn't reach the server. Please check your connection and try again.");
    }
  }

  sendBtn.addEventListener("click", () => sendMessage(inputEl.value.trim()));
  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendMessage(inputEl.value.trim());
  });
})();
