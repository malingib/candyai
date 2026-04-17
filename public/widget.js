(function () {
  // Prevent double-injection
  if (window.__MobiwaveWidgetLoaded) return;
  window.__MobiwaveWidgetLoaded = true;

  // ---- Config ----
  var currentScript =
    document.currentScript ||
    (function () {
      var scripts = document.getElementsByTagName("script");
      return scripts[scripts.length - 1];
    })();

  var businessId = currentScript ? currentScript.dataset.businessId : "";
  var SUPABASE_URL = "https://lgbjxbqkryzgkvggodzs.supabase.co";
  var SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnYmp4YnFrcnl6Z2t2Z2dvZHpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0OTA2NzQsImV4cCI6MjA4ODA2NjY3NH0.SCNN1VpEWjx0GjEAbHNiOfxobPpubWMRej-YjNnVBRE";
  var ORIGIN = (currentScript && currentScript.src ? new URL(currentScript.src).origin : "https://candyai.lovable.app");
  var LOGO = ORIGIN + "/logo.png";

  // ---- Styles ----
  var css = `
    .mw-launcher{position:fixed;bottom:24px;right:24px;width:56px;height:56px;border-radius:9999px;background:#2563eb;color:#fff;border:none;cursor:pointer;box-shadow:0 10px 25px -5px rgba(37,99,235,.45);display:flex;align-items:center;justify-content:center;z-index:2147483646;transition:transform .2s}
    .mw-launcher:hover{transform:scale(1.05)}
    .mw-launcher img{width:28px;height:28px;object-fit:contain}
    .mw-panel{position:fixed;bottom:24px;right:24px;width:380px;max-width:calc(100vw - 32px);height:520px;max-height:calc(100vh - 48px);background:#fff;border-radius:16px;box-shadow:0 20px 50px -10px rgba(0,0,0,.25);display:flex;flex-direction:column;overflow:hidden;z-index:2147483647;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;border:1px solid #e5e7eb}
    .mw-header{background:#2563eb;color:#fff;padding:14px 16px;display:flex;align-items:center;justify-content:space-between}
    .mw-header-left{display:flex;align-items:center;gap:12px}
    .mw-avatar{width:36px;height:36px;border-radius:9999px;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;overflow:hidden}
    .mw-avatar img{width:24px;height:24px;object-fit:contain}
    .mw-title{font-size:14px;font-weight:600;line-height:1.2}
    .mw-status{font-size:11px;opacity:.85;display:flex;align-items:center;gap:6px;margin-top:2px}
    .mw-dot{width:6px;height:6px;border-radius:9999px;background:#34d399}
    .mw-close{background:none;border:none;color:#fff;cursor:pointer;opacity:.7;font-size:20px;line-height:1;padding:4px}
    .mw-close:hover{opacity:1}
    .mw-messages{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px;background:#f9fafb}
    .mw-msg{display:flex;gap:8px;align-items:flex-start}
    .mw-msg.user{flex-direction:row-reverse}
    .mw-msg-avatar{width:28px;height:28px;border-radius:9999px;background:#dbeafe;flex-shrink:0;display:flex;align-items:center;justify-content:center;overflow:hidden}
    .mw-msg-avatar img{width:20px;height:20px;object-fit:contain}
    .mw-msg-bubble{max-width:75%;padding:10px 14px;border-radius:16px;font-size:14px;line-height:1.5;color:#111827;background:#fff;border:1px solid #e5e7eb;border-bottom-left-radius:4px;white-space:pre-wrap;word-wrap:break-word}
    .mw-msg.user .mw-msg-bubble{background:#2563eb;color:#fff;border-color:#2563eb;border-bottom-right-radius:4px;border-bottom-left-radius:16px}
    .mw-typing{display:flex;gap:4px;padding:4px 0}
    .mw-typing span{width:6px;height:6px;border-radius:9999px;background:#9ca3af;animation:mw-bounce 1.4s infinite}
    .mw-typing span:nth-child(2){animation-delay:.2s}
    .mw-typing span:nth-child(3){animation-delay:.4s}
    @keyframes mw-bounce{0%,60%,100%{transform:translateY(0);opacity:.5}30%{transform:translateY(-6px);opacity:1}}
    .mw-input-bar{padding:12px;border-top:1px solid #e5e7eb;background:#fff;display:flex;gap:8px}
    .mw-input{flex:1;border:1px solid #d1d5db;border-radius:12px;padding:10px 14px;font-size:14px;outline:none;font-family:inherit}
    .mw-input:focus{border-color:#2563eb}
    .mw-send{background:#2563eb;color:#fff;border:none;border-radius:12px;width:40px;height:40px;cursor:pointer;display:flex;align-items:center;justify-content:center}
    .mw-send:disabled{opacity:.5;cursor:not-allowed}
    .mw-footer{text-align:center;font-size:10px;color:#9ca3af;padding:6px}
  `;

  var style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  // ---- State ----
  var messages = [
    { role: "assistant", content: "Hi! 👋 How can I help you today?" },
  ];
  var isOpen = false;
  var isLoading = false;

  // ---- DOM ----
  var launcher = document.createElement("button");
  launcher.className = "mw-launcher";
  launcher.setAttribute("aria-label", "Open chat");
  launcher.innerHTML = '<img src="' + LOGO + '" alt="Chat" />';
  document.body.appendChild(launcher);

  var panel = document.createElement("div");
  panel.className = "mw-panel";
  panel.style.display = "none";
  panel.innerHTML =
    '<div class="mw-header">' +
      '<div class="mw-header-left">' +
        '<div class="mw-avatar"><img src="' + LOGO + '" alt="" /></div>' +
        '<div><div class="mw-title">Mobiwave AI</div>' +
        '<div class="mw-status"><span class="mw-dot"></span>Online</div></div>' +
      '</div>' +
      '<button class="mw-close" aria-label="Close">×</button>' +
    '</div>' +
    '<div class="mw-messages" id="mw-messages"></div>' +
    '<form class="mw-input-bar" id="mw-form">' +
      '<input class="mw-input" id="mw-input" placeholder="Type a message..." autocomplete="off" />' +
      '<button class="mw-send" type="submit" aria-label="Send">' +
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>' +
      '</button>' +
    '</form>' +
    '<div class="mw-footer">Powered by Mobiwave AI</div>';
  document.body.appendChild(panel);

  var msgEl = panel.querySelector("#mw-messages");
  var inputEl = panel.querySelector("#mw-input");
  var formEl = panel.querySelector("#mw-form");
  var closeBtn = panel.querySelector(".mw-close");

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function render() {
    var html = messages
      .map(function (m) {
        var avatar =
          m.role === "user"
            ? '<div class="mw-msg-avatar"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>'
            : '<div class="mw-msg-avatar"><img src="' + LOGO + '" alt="" /></div>';
        return (
          '<div class="mw-msg ' + m.role + '">' +
          avatar +
          '<div class="mw-msg-bubble">' + escapeHtml(m.content) + '</div>' +
          '</div>'
        );
      })
      .join("");
    if (isLoading) {
      html +=
        '<div class="mw-msg assistant">' +
        '<div class="mw-msg-avatar"><img src="' + LOGO + '" alt="" /></div>' +
        '<div class="mw-msg-bubble"><div class="mw-typing"><span></span><span></span><span></span></div></div>' +
        '</div>';
    }
    msgEl.innerHTML = html;
    msgEl.scrollTop = msgEl.scrollHeight;
  }

  function toggle(open) {
    isOpen = open;
    panel.style.display = open ? "flex" : "none";
    launcher.style.display = open ? "none" : "flex";
    if (open) { render(); inputEl.focus(); }
  }

  launcher.addEventListener("click", function () { toggle(true); });
  closeBtn.addEventListener("click", function () { toggle(false); });

  formEl.addEventListener("submit", function (e) {
    e.preventDefault();
    var text = inputEl.value.trim();
    if (!text || isLoading) return;
    messages.push({ role: "user", content: text });
    inputEl.value = "";
    isLoading = true;
    render();
    sendToAI(text);
  });

  function sendToAI() {
    fetch(SUPABASE_URL + "/functions/v1/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ messages: messages, business_id: businessId }),
    })
      .then(function (resp) {
        if (!resp.ok || !resp.body) throw new Error("Network error");
        var reader = resp.body.getReader();
        var decoder = new TextDecoder();
        var buffer = "";
        var assistantContent = "";
        messages.push({ role: "assistant", content: "" });

        function pump() {
          return reader.read().then(function (chunk) {
            if (chunk.done) {
              isLoading = false;
              render();
              return;
            }
            buffer += decoder.decode(chunk.value, { stream: true });
            var lines = buffer.split("\n");
            buffer = lines.pop() || "";
            for (var i = 0; i < lines.length; i++) {
              var line = lines[i];
              if (!line.startsWith("data: ")) continue;
              var data = line.slice(6).trim();
              if (data === "[DONE]") { isLoading = false; render(); return; }
              try {
                var json = JSON.parse(data);
                var delta = json.choices && json.choices[0] && json.choices[0].delta && json.choices[0].delta.content;
                if (delta) {
                  assistantContent += delta;
                  messages[messages.length - 1].content = assistantContent;
                  isLoading = false;
                  render();
                }
              } catch (e) {}
            }
            return pump();
          });
        }
        return pump();
      })
      .catch(function () {
        isLoading = false;
        messages.push({ role: "assistant", content: "Sorry, I'm having trouble connecting. Please try again." });
        render();
      });
  }
})();
