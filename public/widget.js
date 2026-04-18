(function () {
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

  // ---- Theme defaults (overridden by get-contact-info) ----
  var theme = {
    primary: "#2563eb",
    businessName: "Mobiwave AI",
    welcome: "Hi! 👋 How can I help you today?",
    whatsapp: "",
    call: "",
  };

  // ---- Styles (use CSS vars for theming) ----
  var css = `
    .mw-launcher{position:fixed;bottom:24px;right:24px;width:56px;height:56px;border-radius:9999px;background:var(--mw-primary);color:#fff;border:none;cursor:pointer;box-shadow:0 10px 25px -5px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;z-index:2147483646;transition:transform .2s}
    .mw-launcher:hover{transform:scale(1.05)}
    .mw-launcher img{width:28px;height:28px;object-fit:contain}
    .mw-panel{position:fixed;bottom:24px;right:24px;width:380px;max-width:calc(100vw - 32px);height:560px;max-height:calc(100vh - 48px);background:#fff;border-radius:16px;box-shadow:0 20px 50px -10px rgba(0,0,0,.25);display:flex;flex-direction:column;overflow:hidden;z-index:2147483647;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;border:1px solid #e5e7eb}
    .mw-header{background:var(--mw-primary);color:#fff;padding:14px 16px;display:flex;align-items:center;justify-content:space-between}
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
    .mw-msg.user .mw-msg-bubble{background:var(--mw-primary);color:#fff;border-color:var(--mw-primary);border-bottom-right-radius:4px;border-bottom-left-radius:16px}
    .mw-typing{display:flex;gap:4px;padding:4px 0}
    .mw-typing span{width:6px;height:6px;border-radius:9999px;background:#9ca3af;animation:mw-bounce 1.4s infinite}
    .mw-typing span:nth-child(2){animation-delay:.2s}
    .mw-typing span:nth-child(3){animation-delay:.4s}
    @keyframes mw-bounce{0%,60%,100%{transform:translateY(0);opacity:.5}30%{transform:translateY(-6px);opacity:1}}
    .mw-contact-bar{display:flex;gap:8px;padding:8px 12px;background:#fff;border-top:1px solid #e5e7eb}
    .mw-contact-btn{flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:8px;border-radius:8px;border:1px solid #e5e7eb;background:#fff;color:#111827;text-decoration:none;font-size:12px;font-weight:500;cursor:pointer;transition:background .15s}
    .mw-contact-btn:hover{background:#f3f4f6}
    .mw-contact-btn.wa{color:#25D366;border-color:#25D366}
    .mw-contact-btn.wa:hover{background:#25D36610}
    .mw-contact-btn svg{width:14px;height:14px}
    .mw-input-bar{padding:12px;border-top:1px solid #e5e7eb;background:#fff;display:flex;gap:8px}
    .mw-input{flex:1;border:1px solid #d1d5db;border-radius:12px;padding:10px 14px;font-size:14px;outline:none;font-family:inherit}
    .mw-input:focus{border-color:var(--mw-primary)}
    .mw-send{background:var(--mw-primary);color:#fff;border:none;border-radius:12px;width:40px;height:40px;cursor:pointer;display:flex;align-items:center;justify-content:center}
    .mw-send:disabled{opacity:.5;cursor:not-allowed}
    .mw-footer{text-align:center;font-size:10px;color:#9ca3af;padding:6px}
  `;

  var style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  function applyTheme() {
    document.documentElement.style.setProperty("--mw-primary", theme.primary);
  }
  applyTheme();

  // ---- State ----
  var messages = [{ role: "assistant", content: theme.welcome }];
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
        '<div><div class="mw-title" id="mw-biz-name">' + escapeHtml(theme.businessName) + '</div>' +
        '<div class="mw-status"><span class="mw-dot"></span>Online</div></div>' +
      '</div>' +
      '<button class="mw-close" aria-label="Close">×</button>' +
    '</div>' +
    '<div class="mw-messages" id="mw-messages"></div>' +
    '<div class="mw-contact-bar" id="mw-contact-bar" style="display:none"></div>' +
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
  var bizNameEl = panel.querySelector("#mw-biz-name");
  var contactBar = panel.querySelector("#mw-contact-bar");

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function renderContactBar() {
    var html = "";
    if (theme.whatsapp) {
      var waNum = String(theme.whatsapp).replace(/[^\d]/g, "");
      html +=
        '<a class="mw-contact-btn wa" target="_blank" rel="noopener" href="https://wa.me/' + waNum + '">' +
        '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>' +
        'WhatsApp</a>';
    }
    if (theme.call) {
      html +=
        '<a class="mw-contact-btn" href="tel:' + escapeHtml(theme.call) + '">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>' +
        'Call</a>';
    }
    if (html) {
      contactBar.innerHTML = html;
      contactBar.style.display = "flex";
    } else {
      contactBar.style.display = "none";
    }
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
    sendToAI();
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
            if (chunk.done) { isLoading = false; render(); return; }
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

  // ---- Fetch theme/contact for this business ----
  if (businessId) {
    fetch(SUPABASE_URL + "/functions/v1/get-contact-info", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ user_id: businessId }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.primary_color) theme.primary = data.primary_color;
        if (data.business_name) theme.businessName = data.business_name;
        if (data.welcome_message) theme.welcome = data.welcome_message;
        theme.whatsapp = data.whatsapp_number || "";
        theme.call = data.call_number || "";
        applyTheme();
        bizNameEl.textContent = theme.businessName;
        // Replace initial welcome message if user hasn't typed yet
        if (messages.length === 1 && messages[0].role === "assistant") {
          messages[0].content = theme.welcome;
          if (isOpen) render();
        }
        renderContactBar();
      })
      .catch(function () { /* keep defaults */ });
  }
})();
