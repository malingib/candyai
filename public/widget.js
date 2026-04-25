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

  var theme = {
    primary: "#2563eb",
    businessName: "Mobiwave AI",
    welcome: "Hi! 👋 How can I help you today?",
    whatsapp: "",
    call: "",
  };

  // ---- Styles ----
  var css = `
    .mw-launcher{position:fixed;bottom:24px;right:24px;width:56px;height:56px;border-radius:9999px;background:var(--mw-primary);color:#fff;border:none;cursor:pointer;box-shadow:0 10px 25px -5px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;z-index:2147483646;transition:transform .2s}
    .mw-launcher:hover{transform:scale(1.05)}
    .mw-launcher img{width:28px;height:28px;object-fit:contain}
    .mw-panel{position:fixed;bottom:24px;right:24px;width:380px;max-width:calc(100vw - 32px);height:580px;max-height:calc(100vh - 48px);background:#fff;border-radius:16px;box-shadow:0 20px 50px -10px rgba(0,0,0,.25);display:flex;flex-direction:column;overflow:hidden;z-index:2147483647;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;border:1px solid #e5e7eb}
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
    .mw-actions{display:flex;gap:8px;padding:8px 12px;background:#fff;border-top:1px solid #e5e7eb;flex-wrap:wrap}
    .mw-action-btn{flex:1;min-width:90px;display:flex;align-items:center;justify-content:center;gap:6px;padding:8px;border-radius:8px;border:1px solid #e5e7eb;background:#fff;color:#111827;text-decoration:none;font-size:12px;font-weight:500;cursor:pointer;transition:background .15s;font-family:inherit}
    .mw-action-btn:hover{background:#f3f4f6}
    .mw-action-btn.wa{color:#25D366;border-color:#25D366}
    .mw-action-btn.wa:hover{background:#25D36610}
    .mw-action-btn.lead{color:var(--mw-primary);border-color:var(--mw-primary)}
    .mw-action-btn.lead:hover{background:#2563eb10}
    .mw-action-btn svg{width:14px;height:14px}
    .mw-input-bar{padding:12px;border-top:1px solid #e5e7eb;background:#fff;display:flex;gap:8px}
    .mw-input{flex:1;border:1px solid #d1d5db;border-radius:12px;padding:10px 14px;font-size:14px;outline:none;font-family:inherit}
    .mw-input:focus{border-color:var(--mw-primary)}
    .mw-send{background:var(--mw-primary);color:#fff;border:none;border-radius:12px;width:40px;height:40px;cursor:pointer;display:flex;align-items:center;justify-content:center}
    .mw-send:disabled{opacity:.5;cursor:not-allowed}
    .mw-footer{text-align:center;font-size:10px;color:#9ca3af;padding:6px}
    .mw-lead-form{padding:12px;background:#f9fafb;border-top:1px solid #e5e7eb;display:flex;flex-direction:column;gap:8px}
    .mw-lead-form input{border:1px solid #d1d5db;border-radius:8px;padding:8px 12px;font-size:13px;outline:none;font-family:inherit}
    .mw-lead-form input:focus{border-color:var(--mw-primary)}
    .mw-lead-row{display:flex;gap:8px}
    .mw-lead-submit{background:var(--mw-primary);color:#fff;border:none;border-radius:8px;padding:8px;font-size:13px;font-weight:500;cursor:pointer;flex:1;font-family:inherit}
    .mw-lead-cancel{background:#fff;color:#6b7280;border:1px solid #d1d5db;border-radius:8px;padding:8px;font-size:13px;cursor:pointer;font-family:inherit}
    .mw-lead-error{color:#dc2626;font-size:12px}
    .mw-launcher{position:relative}
    .mw-launcher-badge{position:absolute;top:-4px;right:-4px;min-width:18px;height:18px;padding:0 5px;border-radius:9999px;background:#dc2626;color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 2px #fff}
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
  var conversationId = null;
  var conversationStarting = false;
  var leadFormOpen = false;
  var leadCaptured = false;
  // IDs of messages we wrote ourselves — skip when they come back over realtime
  var knownMsgIds = Object.create(null);
  var realtimeChannel = null;
  var unreadAgent = 0;
  var agentTyping = false;
  var agentTypingTimer = null;

  // ---- Helpers ----
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function postWidget(payload) {
    return fetch(SUPABASE_URL + "/functions/v1/widget-conversation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(payload),
    }).then(function (r) { return r.json(); });
  }

  function ensureConversation() {
    if (conversationId || conversationStarting || !businessId) return Promise.resolve(conversationId);
    conversationStarting = true;
    return postWidget({ action: "start", business_id: businessId })
      .then(function (data) {
        if (data && data.conversation_id) {
          conversationId = data.conversation_id;
          subscribeRealtime(conversationId);
        }
        conversationStarting = false;
        return conversationId;
      })
      .catch(function () { conversationStarting = false; return null; });
  }

  function persistMessage(role, content) {
    if (!conversationId || !businessId || !content) return;
    postWidget({
      action: "message",
      business_id: businessId,
      conversation_id: conversationId,
      role: role,
      content: content,
    }).then(function (resp) {
      if (resp && resp.message_id) knownMsgIds[resp.message_id] = true;
    }).catch(function () {});
  }

  // ---- Supabase Realtime over WebSocket (vanilla, no SDK) ----
  function subscribeRealtime(convId) {
    if (!convId || realtimeChannel) return;
    try {
      var wsUrl = SUPABASE_URL.replace(/^http/, "ws") + "/realtime/v1/websocket?apikey=" + encodeURIComponent(SUPABASE_ANON_KEY) + "&vsn=1.0.0";
      var ws = new WebSocket(wsUrl);
      realtimeChannel = ws;
      var msgTopic = "realtime:public:messages:conversation_id=eq." + convId;
      var typingTopic = "realtime:widget-typing:" + convId;
      var ref = 0;
      var heartbeat;

      ws.onopen = function () {
        // Join messages postgres_changes channel
        ws.send(JSON.stringify({
          topic: msgTopic,
          event: "phx_join",
          payload: {
            config: {
              postgres_changes: [
                { event: "INSERT", schema: "public", table: "messages", filter: "conversation_id=eq." + convId },
              ],
            },
          },
          ref: String(++ref),
        }));
        // Join broadcast typing channel
        ws.send(JSON.stringify({
          topic: typingTopic,
          event: "phx_join",
          payload: { config: { broadcast: { self: false } } },
          ref: String(++ref),
        }));
        heartbeat = setInterval(function () {
          try {
            ws.send(JSON.stringify({ topic: "phoenix", event: "heartbeat", payload: {}, ref: String(++ref) }));
          } catch (e) {}
        }, 25000);
      };

      ws.onmessage = function (ev) {
        try {
          var data = JSON.parse(ev.data);
          // Agent typing broadcast
          if (data.event === "broadcast" && data.topic === typingTopic) {
            var p = data.payload && data.payload.payload;
            if (p && typeof p.typing === "boolean") setAgentTyping(!!p.typing);
            return;
          }
          if (data.event !== "postgres_changes") return;
          var rec = data.payload && data.payload.data && data.payload.data.record;
          if (!rec || !rec.id) return;
          if (knownMsgIds[rec.id]) return; // we wrote it
          knownMsgIds[rec.id] = true;
          if (rec.role !== "assistant") return; // only show agent/AI replies
          // Agent has now sent — typing indicator should clear
          setAgentTyping(false);
          messages.push({ role: "assistant", content: rec.content });
          if (isOpen) render(); else { unreadAgent += 1; updateLauncherBadge(); }
        } catch (e) {}
      };

      ws.onclose = function () {
        clearInterval(heartbeat);
        realtimeChannel = null;
        realtimeRef = 0;
        realtimeTypingTopic = null;
        setAgentTyping(false);
        // best-effort reconnect after 3s if we still have a conversation
        setTimeout(function () { if (conversationId) subscribeRealtime(conversationId); }, 3000);
      };
      ws.onerror = function () { try { ws.close(); } catch (e) {} };

      // Expose ref/topic so visitor-typing broadcaster can reuse the socket
      realtimeChannel.__getRef = function () { return String(++ref); };
      realtimeTypingTopic = typingTopic;
    } catch (e) { /* ignore */ }
  }

  function sendVisitorTyping(on) {
    var ws = realtimeChannel;
    if (!ws || ws.readyState !== 1 || !realtimeTypingTopic) return;
    try {
      ws.send(JSON.stringify({
        topic: realtimeTypingTopic,
        event: "broadcast",
        payload: { type: "broadcast", event: "visitor_typing", payload: { typing: !!on } },
        ref: ws.__getRef ? ws.__getRef() : "0",
      }));
    } catch (e) {}
  }

  function updateLauncherBadge() {
    var existing = launcher.querySelector(".mw-launcher-badge");
    if (unreadAgent <= 0) {
      if (existing) existing.remove();
      return;
    }
    if (!existing) {
      existing = document.createElement("span");
      existing.className = "mw-launcher-badge";
      launcher.appendChild(existing);
    }
    existing.textContent = unreadAgent > 9 ? "9+" : String(unreadAgent);
  }

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
    '<div class="mw-actions" id="mw-actions"></div>' +
    '<div class="mw-lead-form" id="mw-lead-form" style="display:none">' +
      '<input id="mw-lead-name" type="text" placeholder="Your name" maxlength="100" />' +
      '<input id="mw-lead-email" type="email" placeholder="Email" maxlength="255" />' +
      '<input id="mw-lead-phone" type="tel" placeholder="Phone (optional)" maxlength="30" />' +
      '<div class="mw-lead-error" id="mw-lead-error" style="display:none"></div>' +
      '<div class="mw-lead-row">' +
        '<button type="button" class="mw-lead-cancel" id="mw-lead-cancel">Cancel</button>' +
        '<button type="button" class="mw-lead-submit" id="mw-lead-submit">Submit</button>' +
      '</div>' +
    '</div>' +
    '<form class="mw-input-bar" id="mw-form">' +
      '<input class="mw-input" id="mw-input" placeholder="Type a message..." autocomplete="off" maxlength="2000" />' +
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
  var actionsEl = panel.querySelector("#mw-actions");
  var leadFormEl = panel.querySelector("#mw-lead-form");
  var leadErrorEl = panel.querySelector("#mw-lead-error");

  // ---- Action bar (lead CTA + WhatsApp/Call) ----
  function renderActions() {
    var html = "";
    if (!leadCaptured) {
      html +=
        '<button type="button" class="mw-action-btn lead" id="mw-lead-cta">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>' +
        'Talk to us</button>';
    }
    if (theme.whatsapp) {
      var waNum = String(theme.whatsapp).replace(/[^\d]/g, "");
      html +=
        '<a class="mw-action-btn wa" target="_blank" rel="noopener" href="https://wa.me/' + encodeURIComponent(waNum) + '">' +
        '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>' +
        'WhatsApp</a>';
    }
    if (theme.call) {
      html +=
        '<a class="mw-action-btn" href="tel:' + encodeURIComponent(theme.call) + '">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>' +
        'Call</a>';
    }
    actionsEl.innerHTML = html;
    actionsEl.style.display = html ? "flex" : "none";
    var leadCta = actionsEl.querySelector("#mw-lead-cta");
    if (leadCta) leadCta.addEventListener("click", openLeadForm);
  }

  function openLeadForm() {
    leadFormOpen = true;
    leadFormEl.style.display = "flex";
    actionsEl.style.display = "none";
    formEl.style.display = "none";
    leadErrorEl.style.display = "none";
    panel.querySelector("#mw-lead-name").focus();
  }

  function closeLeadForm() {
    leadFormOpen = false;
    leadFormEl.style.display = "none";
    formEl.style.display = "flex";
    renderActions();
  }

  panel.querySelector("#mw-lead-cancel").addEventListener("click", closeLeadForm);
  panel.querySelector("#mw-lead-submit").addEventListener("click", function () {
    var name = panel.querySelector("#mw-lead-name").value.trim();
    var email = panel.querySelector("#mw-lead-email").value.trim();
    var phone = panel.querySelector("#mw-lead-phone").value.trim();

    if (!name && !email && !phone) {
      leadErrorEl.textContent = "Please fill at least one field.";
      leadErrorEl.style.display = "block";
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      leadErrorEl.textContent = "Please enter a valid email.";
      leadErrorEl.style.display = "block";
      return;
    }
    leadErrorEl.style.display = "none";

    Promise.resolve(ensureConversation()).then(function () {
      return postWidget({
        action: "lead",
        business_id: businessId,
        conversation_id: conversationId,
        name: name, email: email, phone: phone,
      });
    }).then(function (resp) {
      if (resp && resp.error) {
        leadErrorEl.textContent = resp.error;
        leadErrorEl.style.display = "block";
        return;
      }
      leadCaptured = true;
      messages.push({ role: "assistant", content: "Thanks! We've got your details and will be in touch shortly. 🙌" });
      persistMessage("assistant", messages[messages.length - 1].content);
      closeLeadForm();
      render();
    }).catch(function () {
      leadErrorEl.textContent = "Something went wrong. Please try again.";
      leadErrorEl.style.display = "block";
    });
  });

  function setAgentTyping(on) {
    if (agentTypingTimer) { clearTimeout(agentTypingTimer); agentTypingTimer = null; }
    agentTyping = !!on;
    if (on) {
      agentTypingTimer = setTimeout(function () { agentTyping = false; if (isOpen) render(); }, 5000);
    }
    if (isOpen) render();
  }

  function render() {
    var html = messages.map(function (m) {
      var avatar = m.role === "user"
        ? '<div class="mw-msg-avatar"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>'
        : '<div class="mw-msg-avatar"><img src="' + LOGO + '" alt="" /></div>';
      return '<div class="mw-msg ' + m.role + '">' + avatar +
        '<div class="mw-msg-bubble">' + escapeHtml(m.content) + '</div></div>';
    }).join("");
    if (isLoading || agentTyping) {
      var label = agentTyping && !isLoading ? '<div style="font-size:10px;color:#6b7280;margin-bottom:2px">Agent is typing</div>' : '';
      html += '<div class="mw-msg assistant"><div class="mw-msg-avatar"><img src="' + LOGO + '" alt="" /></div>' +
        '<div class="mw-msg-bubble">' + label + '<div class="mw-typing"><span></span><span></span><span></span></div></div></div>';
    }
    msgEl.innerHTML = html;
    msgEl.scrollTop = msgEl.scrollHeight;
  }

  function toggle(open) {
    isOpen = open;
    panel.style.display = open ? "flex" : "none";
    launcher.style.display = open ? "none" : "flex";
    if (open) {
      unreadAgent = 0;
      updateLauncherBadge();
      render();
      renderActions();
      inputEl.focus();
      ensureConversation();
    }
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

    Promise.resolve(ensureConversation()).then(function () {
      persistMessage("user", text);
      sendToAI();
    });
  });

  function sendToAI() {
    fetch(SUPABASE_URL + "/functions/v1/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        messages: messages,
        user_id: businessId,
        conversation_id: conversationId,
      }),
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
              isLoading = false; render();
              if (assistantContent) persistMessage("assistant", assistantContent);
              return;
            }
            buffer += decoder.decode(chunk.value, { stream: true });
            var lines = buffer.split("\n");
            buffer = lines.pop() || "";
            for (var i = 0; i < lines.length; i++) {
              var line = lines[i];
              if (!line.startsWith("data: ")) continue;
              var data = line.slice(6).trim();
              if (data === "[DONE]") {
                isLoading = false; render();
                if (assistantContent) persistMessage("assistant", assistantContent);
                return;
              }
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
        var err = "Sorry, I'm having trouble connecting. Please try again.";
        messages.push({ role: "assistant", content: err });
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
        if (messages.length === 1 && messages[0].role === "assistant") {
          messages[0].content = theme.welcome;
          if (isOpen) render();
        }
        if (isOpen) renderActions();
      })
      .catch(function () { /* keep defaults */ });
  }
})();
