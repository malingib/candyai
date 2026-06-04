/* Mobiwave AI Chat Widget v2 */
(function () {
  if (window.__MobiwaveWidgetLoaded) return;
  window.__MobiwaveWidgetLoaded = true;

  // ============================================================
  // SECTION 1: Config & State
  // ============================================================
  var scripts = document.getElementsByTagName("script");
  var businessId = "";
  var currentScript = null;

  for (var i = 0; i < scripts.length; i++) {
    if (scripts[i].src.indexOf("widget.js") !== -1 && scripts[i].dataset.businessId) {
      currentScript = scripts[i];
      businessId = scripts[i].dataset.businessId;
      break;
    }
  }

  if (!businessId && document.currentScript && document.currentScript.dataset.businessId) {
    currentScript = document.currentScript;
    businessId = currentScript.dataset.businessId;
  }

  var WIDGET_VERSION = "2.1.0";
  var ORIGIN = (currentScript && currentScript.src ? new URL(currentScript.src).origin : "https://candyai.lovable.app");
  var turnstileSiteKey = (currentScript && currentScript.dataset.turnstileSiteKey) || "";
  var DEFAULT_LOGO = ORIGIN + "/logo.png";
  var guestToken = "";
  var supabaseUrl = "";
  var configFetched = false;

  var MOBIWAVE_AI_SITE = "https://mobiwaveai.co.ke";
  var MOBIWAVE_INNOVATIONS_SITE = "https://mobiwave.co.ke";

  var theme = {
    primary: "#2563eb",
    businessName: "Mobiwave AI",
    welcome: "Hi! 👋 How can I help you today?",
    logoUrl: "",
    website: MOBIWAVE_AI_SITE,
    whatsapp: "",
    call: "",
  };

  var widgetConfig = {
    border_radius: 16,
    font_family: "system",
    dark_mode: false,
    width: 380,
    height: 580,
    button_radius: 8,
    animations: true,
    show_branding: true,
    show_avatar: true,
    position_x: 24,
    position_y: 24,
  };

  var FONT_MAP = {
    system: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    inter: "'Inter', sans-serif",
    roboto: "'Roboto', sans-serif",
    "open-sans": "'Open Sans', sans-serif",
  };

  // State
  var messages = [{ role: "assistant", content: theme.welcome }];
  var isOpen = false;
  var isLoading = false;
  var conversationId = null;
  var conversationReady = false;
  var conversationStarting = false;
  var leadFormOpen = false;
  var leadCaptured = false;
  var widgetBlocked = false;
  var widgetBlockedReason = "";
  var knownMsgIds = Object.create(null);
  var realtimeChannel = null;
  var realtimeTypingTopic = null;
  var unreadAgent = 0;
  var agentTyping = false;
  var agentTypingTimer = null;
  var visitorTypingDebounce = null;
  var visitorTypingLastSent = 0;
  var lastMessageSentAt = 0;
  var MIN_SEND_INTERVAL_MS = 1000;
  var MAX_MESSAGE_CHARS = 2000;
  var MAX_NAME_CHARS = 100;
  var MAX_EMAIL_CHARS = 255;
  var MAX_PHONE_CHARS = 30;
  var networkRetryCount = 0;
  var MAX_NETWORK_RETRIES = 2;
  var analyticsPingSent = false;
  var turnstileToken = null;
  var turnstileWidgetId = null;
  var turnstileLoaded = false;
  var TURNSTILE_CONTAINER_ID = "mw-turnstile";

  var currentPageUrl = window.location.href;
  var currentPageTitle = document.title;

  // ============================================================
  // SECTION 2: Helpers
  // ============================================================
  function escapeHtml(s) {
    if (!s) return "";
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function resolveLogo(url) {
    if (!url || typeof url !== "string") return DEFAULT_LOGO;
    var v = url.trim();
    if (!v) return DEFAULT_LOGO;
    try {
      return new URL(v, window.location.origin).toString();
    } catch (e) {
      return DEFAULT_LOGO;
    }
  }

  function sanitizeText(value, maxLen) {
    return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLen);
  }

  function sanitizePhone(value) {
    return sanitizeText(value, MAX_PHONE_CHARS).replace(/[^\d+\-\s()]/g, "");
  }

  function sanitizeEmail(value) {
    return sanitizeText(value, MAX_EMAIL_CHARS).toLowerCase();
  }

  function sanitizeUuid(value) {
    var v = sanitizeText(value, 64);
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v) ? v : "";
  }

  function getTimestamp() {
    return new Date().toISOString();
  }

  function safeStorageGet(key) {
    try { return window.localStorage ? window.localStorage.getItem(key) : null; } catch (e) { return null; }
  }

  function safeStorageSet(key, value) {
    try { if (window.localStorage) window.localStorage.setItem(key, value); } catch (e) { /* ignore */ }
  }

  function safeStorageRemove(key) {
    try { if (window.localStorage) window.localStorage.removeItem(key); } catch (e) { /* ignore */ }
  }

  var storagePrefix = "mw-widget:" + (businessId || "unknown") + ":" + window.location.origin;
  var visitorIdKey = storagePrefix + ":visitor-id";
  var conversationIdKey = storagePrefix + ":conversation-id";
  var leadCapturedKey = storagePrefix + ":lead-captured";
  var visitorId = safeStorageGet(visitorIdKey);
  if (!/^[a-f0-9]{32}$/i.test(visitorId || "")) {
    visitorId = (window.crypto && window.crypto.getRandomValues)
      ? Array.from(window.crypto.getRandomValues(new Uint8Array(16))).map(function (b) { return b.toString(16).padStart(2, "0"); }).join("")
      : String(Date.now()) + String(Math.random()).replace(/\D/g, "").slice(0, 16);
    safeStorageSet(visitorIdKey, visitorId);
  }
  var savedConversationId = safeStorageGet(conversationIdKey);
  if (sanitizeUuid(savedConversationId)) conversationId = savedConversationId;
  if (safeStorageGet(leadCapturedKey) === "1") leadCaptured = true;

  function loadTurnstile() {
    if (!turnstileSiteKey || turnstileLoaded) return;
    if (typeof window.turnstile !== "undefined") { turnstileLoaded = true; return; }
    var s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.defer = true;
    s.onload = function () { turnstileLoaded = true; renderTurnstile(); };
    document.head.appendChild(s);
  }

  function renderTurnstile() {
    if (!turnstileSiteKey || !turnstileLoaded || typeof window.turnstile === "undefined") return;
    var container = document.getElementById(TURNSTILE_CONTAINER_ID);
    if (!container || container.dataset.turnstileRendered) return;
    try {
      turnstileWidgetId = window.turnstile.render(container, {
        sitekey: turnstileSiteKey,
        callback: function (token) { turnstileToken = token; },
        "expired-callback": function () { turnstileToken = null; },
        "error-callback": function () { turnstileToken = null; },
      });
      container.dataset.turnstileRendered = "1";
    } catch (e) { /* best-effort */ }
  }

  function resetTurnstileToken() {
    turnstileToken = null;
    if (turnstileWidgetId && typeof window.turnstile !== "undefined") {
      try { window.turnstile.reset(turnstileWidgetId); } catch (e) { /* best-effort */ }
    }
  }

  // ============================================================
  // SECTION 3: Analytics
  // ============================================================
  function pingAnalytics(event, extra) {
    try {
      var payload = {
        action: "analytics",
        business_id: businessId,
        conversation_id: conversationId,
        event: event,
        page_url: currentPageUrl,
        page_title: currentPageTitle,
        widget_version: WIDGET_VERSION,
        timestamp: getTimestamp(),
      };
      if (extra) {
        for (var k in extra) {
          if (extra.hasOwnProperty(k)) payload[k] = extra[k];
        }
      }
      navigator.sendBeacon(ORIGIN + "/functions/v1/widget-conversation", JSON.stringify(payload));
    } catch (e) { /* analytics are best-effort */ }
  }

  function sendPageView() {
    if (analyticsPingSent) return;
    analyticsPingSent = true;
    pingAnalytics("page_viewed");
  }

  // ============================================================
  // SECTION 4: API
  // ============================================================
  function postWidget(payload) {
    if (!guestToken) return Promise.reject(new Error("Config not loaded"));
    var p = {
      action: payload.action,
      business_id: businessId,
    };
    if (payload.conversation_id) p.conversation_id = payload.conversation_id;
    if (payload.role) p.role = payload.role;
    if (payload.content) p.content = payload.content;
    if (payload.name) p.name = payload.name;
    if (payload.email) p.email = payload.email;
    if (payload.phone) p.phone = payload.phone;
    if (payload.analytics_event) p.analytics_event = payload.analytics_event;
    if (payload.page_url) p.page_url = payload.page_url;
    if (payload.page_title) p.page_title = payload.page_title;
    if (visitorId) p.visitor_id = visitorId;

    return fetch(ORIGIN + "/functions/v1/widget-conversation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + guestToken,
      },
      body: JSON.stringify(p),
    }).then(function (r) { return r.json(); });
  }

  function showOfflineError() {
    var msg = "Sorry, I'm having trouble connecting right now. ";
    if (theme.whatsapp) {
      var waNum = sanitizePhone(theme.whatsapp).replace(/[^\d]/g, "");
      msg += "You can reach us on WhatsApp at wa.me/" + waNum + ". ";
    }
    if (theme.call) {
      msg += "Or call " + theme.call + ". ";
    }
    msg += "Please try again shortly.";
    messages.push({ role: "assistant", content: msg });
    isLoading = false;
    render();
  }

  function fetchWithTimeout(url, options, timeoutMs) {
    timeoutMs = timeoutMs || 15000;
    return new Promise(function (resolve, reject) {
      var controller = new AbortController();
      var timeout = setTimeout(function () { controller.abort(); reject(new Error("timeout")); }, timeoutMs);
      options = options || {};
      options.signal = controller.signal;
      fetch(url, options).then(function (r) { clearTimeout(timeout); resolve(r); }, function (e) { clearTimeout(timeout); reject(e); });
    });
  }

  // ============================================================
  // SECTION 5: Conversation
  // ============================================================
  function ensureConversation() {
    if (conversationId && conversationReady) {
      subscribeRealtime(conversationId);
      return Promise.resolve(conversationId);
    }
    if (conversationStarting || !businessId) return Promise.resolve(conversationId);
    conversationStarting = true;
    return postWidget({ action: "start", conversation_id: sanitizeUuid(safeStorageGet(conversationIdKey)), page_url: currentPageUrl, page_title: currentPageTitle })
      .then(function (data) {
        if (data && (data.code === "embed_limit_reached" || data.code === "domain_unverified")) {
          widgetBlocked = true;
          widgetBlockedReason = data.error || "This chat widget is not active for this website.";
          messages.push({
            role: "assistant",
            content: "⚠️ Widget unavailable on this website.\n\n" + widgetBlockedReason + "\n\nPlease contact the business owner to activate this domain.",
          });
          render();
          return null;
        }
        if (data && data.error && !data.conversation_id) {
          widgetBlocked = true;
          widgetBlockedReason = data.error;
          messages.push({ role: "assistant", content: "⚠️ " + widgetBlockedReason });
          render();
          return null;
        }
        if (data && data.conversation_id) {
          conversationId = data.conversation_id;
          conversationReady = true;
          safeStorageSet(conversationIdKey, conversationId);
          if (data.lead_captured) {
            leadCaptured = true;
            safeStorageSet(leadCapturedKey, "1");
          }
          subscribeRealtime(conversationId);
          pingAnalytics(data.returning ? "conversation_returned" : "conversation_started");
        }
        conversationStarting = false;
        return conversationId;
      })
      .catch(function () {
        conversationStarting = false;
        safeStorageRemove(conversationIdKey);
        showOfflineError();
        return null;
      });
  }

  function persistMessage(role, content) {
    if (!conversationId || !businessId || !content) return;
    postWidget({
      action: "message",
      conversation_id: conversationId,
      role: role,
      content: content,
    }).then(function (resp) {
      if (resp && resp.message_id) knownMsgIds[resp.message_id] = true;
      pingAnalytics("message_sent", { message_role: role, message_length: content.length });
    }).catch(function () {});
  }

  // ============================================================
  // SECTION 6: Realtime
  // ============================================================
  function subscribeRealtime(convId) {
    if (!convId || realtimeChannel) return;
    try {
      var realtimeBase = supabaseUrl || ORIGIN;
      var wsUrl = realtimeBase.replace(/^http/, "ws") + "/realtime/v1/websocket?apikey=" + encodeURIComponent(guestToken) + "&vsn=1.0.0";
      var ws = new WebSocket(wsUrl);
      realtimeChannel = ws;
      var msgTopic = "realtime:public:messages:conversation_id=eq." + convId;
      var typingTopic = "realtime:widget-typing:" + convId;
      var ref = 0;
      var heartbeat;

      ws.onopen = function () {
        ws.send(JSON.stringify({
          topic: msgTopic,
          event: "phx_join",
          payload: { config: { postgres_changes: [{ event: "INSERT", schema: "public", table: "messages", filter: "conversation_id=eq." + convId }] } },
          ref: String(++ref),
        }));
        ws.send(JSON.stringify({
          topic: typingTopic,
          event: "phx_join",
          payload: { config: { broadcast: { self: false } } },
          ref: String(++ref),
        }));
        heartbeat = setInterval(function () {
          try { ws.send(JSON.stringify({ topic: "phoenix", event: "heartbeat", payload: {}, ref: String(++ref) })); } catch (e) {}
        }, 25000);
      };

      ws.onmessage = function (ev) {
        try {
          var data = JSON.parse(ev.data);
          if (data.event === "broadcast" && data.topic === typingTopic) {
            var p = data.payload && data.payload.payload;
            if (p) {
              if (typeof p.typing === "boolean") { setAgentTyping(!!p.typing); return; }
              if (p.role === "assistant" && p.content) {
                setAgentTyping(false);
                messages.push({ role: "assistant", content: p.content });
                if (isOpen) render(); else { unreadAgent += 1; updateLauncherBadge(); }
              }
            }
            return;
          }
          if (data.event !== "postgres_changes") return;
          var rec = data.payload && data.payload.data && data.payload.data.record;
          if (!rec || !rec.id) return;
          if (knownMsgIds[rec.id]) return;
          knownMsgIds[rec.id] = true;
          if (rec.role !== "assistant") return;
          setAgentTyping(false);
          messages.push({ role: "assistant", content: rec.content });
          if (isOpen) render(); else { unreadAgent += 1; updateLauncherBadge(); }
        } catch (e) {}
      };

      ws.onclose = function () {
        clearInterval(heartbeat);
        realtimeChannel = null;
        ref = 0;
        realtimeTypingTopic = null;
        setAgentTyping(false);
        setTimeout(function () { if (conversationId) subscribeRealtime(conversationId); }, 3000);
      };
      ws.onerror = function () { try { ws.close(); } catch (e) {} };

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

  // ============================================================
  // SECTION 7: Lead Form
  // ============================================================
  function openLeadForm() {
    leadFormOpen = true;
    leadFormEl.style.display = "flex";
    actionsEl.style.display = "none";
    formEl.style.display = "none";
    leadErrorEl.style.display = "none";
    leadNameEl.focus();
  }

  function closeLeadForm() {
    leadFormOpen = false;
    leadFormEl.style.display = "none";
    formEl.style.display = "flex";
    renderActions();
  }

  function submitLead() {
    var name = sanitizeText(leadNameEl.value, MAX_NAME_CHARS);
    var email = sanitizeEmail(leadEmailEl.value);
    var phone = sanitizePhone(leadPhoneEl.value);

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
        conversation_id: conversationId,
        name: name, email: email, phone: phone,
      });
    }).then(function (resp) {
      if (resp && resp.error) { leadErrorEl.textContent = resp.error; leadErrorEl.style.display = "block"; return; }
      leadCaptured = true;
      safeStorageSet(leadCapturedKey, "1");
      messages.push({ role: "assistant", content: "Thanks! We've got your details and will be in touch shortly. 🙌" });
      persistMessage("assistant", messages[messages.length - 1].content);
      closeLeadForm();
      render();
    }).catch(function () {
      leadErrorEl.textContent = "Something went wrong. Please try again.";
      leadErrorEl.style.display = "block";
    });
  }

  // ============================================================
  // SECTION 8: AI Chat
  // ============================================================
  function sendToAI() {
    function formatResetAt(resetIso) {
      if (!resetIso) return "";
      try { var dt = new Date(resetIso); return isNaN(dt.getTime()) ? "" : dt.toLocaleString(); } catch (e) { return ""; }
    }

    function mapChatError(status, payload) {
      var fallback = "Sorry, our chat assistant is temporarily unavailable. Please try again shortly.";
      if (!payload || typeof payload !== "object") return fallback;
      var message = typeof payload.error === "string" ? payload.error : fallback;
      var limit = payload.limit && typeof payload.limit === "object" ? payload.limit : null;
      if (status !== 402 || !limit) return message;
      var reason = String(limit.reason || "");
      var used = typeof limit.chats_used === "number" ? limit.chats_used : null;
      var cap = typeof limit.chats_limit === "number" ? limit.chats_limit : null;
      var resetAt = formatResetAt(limit.resets_at);
      var usageLine = (used !== null && cap !== null) ? ("Usage: " + used + "/" + cap + " chats.") : "";
      var resetLine = resetAt ? ("Next reset: " + resetAt + ".") : "";

      if (reason === "trial_expired_payment_required" || reason === "subscription_expired_payment_required" || reason === "plan_expired") {
        return "⚠️ Live chat is temporarily unavailable.\n\nPlease use WhatsApp or Call below to reach the team directly.";
      }
      return "⚠️ Chat limit reached.\n\nThis business account has hit its current chat quota.\n" + (usageLine ? ("\n" + usageLine) : "") + (resetLine ? ("\n" + resetLine) : "") + "\nYou can still contact the team via the buttons below.";
    }

    function handleStream(resp) {
      if (!resp.ok) {
        isLoading = false;
        return resp.json().catch(function () { return {}; }).then(function (payload) {
          var msg = mapChatError(resp.status, payload);
          throw new Error(msg);
        });
      }
      if (!resp.body) throw new Error("Network error");
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
              isLoading = false;
              render();
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
    }

    networkRetryCount = 0;

    function attemptSend() {
      var pageContext = "Page URL: " + currentPageUrl + "\nPage title: " + currentPageTitle;

      return fetchWithTimeout(ORIGIN + "/functions/v1/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: guestToken,
          Authorization: "Bearer " + guestToken,
        },
        body: JSON.stringify({
          messages: messages,
          demo: false,
          user_id: sanitizeUuid(businessId),
          conversation_id: sanitizeUuid(conversationId),
          page_url: currentPageUrl,
          page_title: currentPageTitle,
          turnstile_token: turnstileToken || "",
        }),
      }, 25000).then(function (resp) {
        return handleStream(resp).then(function () { resetTurnstileToken(); });
      }).catch(function (err) {
        resetTurnstileToken();
        isLoading = false;
        if (err && err.message === "timeout" && networkRetryCount < MAX_NETWORK_RETRIES) {
          networkRetryCount++;
          messages.push({ role: "assistant", content: "Request timed out. Retrying… (" + networkRetryCount + "/" + MAX_NETWORK_RETRIES + ")" });
          render();
          return attemptSend();
        }
        var text = (err && err.message) ? String(err.message) : "Sorry, I'm having trouble connecting. Please try again.";
        if (networkRetryCount >= MAX_NETWORK_RETRIES) {
          text = "We're having trouble reaching our servers. ";
          if (theme.whatsapp) {
            var waNum = sanitizePhone(theme.whatsapp).replace(/[^\d]/g, "");
            text += "Message us on WhatsApp at wa.me/" + waNum + " ";
          }
          if (theme.call) text += "or call " + theme.call + ". ";
          text += "We apologize for the inconvenience.";
        }
        messages.push({ role: "assistant", content: text });
        render();
      });
    }

    attemptSend();
  }

  // ============================================================
  // SECTION 9: Styles
  // ============================================================
  var css = ".mw-launcher{position:fixed !important;bottom:24px !important;right:24px !important;left:auto !important;top:auto !important;width:68px !important;height:68px !important;border-radius:9999px !important;background:linear-gradient(140deg,var(--mw-primary),#1d4ed8);color:#fff;border:none;cursor:pointer;box-shadow:0 14px 34px -12px rgba(0,0,0,.42);display:flex;align-items:center;justify-content:center;z-index:2147483646 !important;transition:transform .2s, box-shadow .2s;margin:0 !important;padding:0 !important;float:none !important;transform:none !important}" +
    ".mw-launcher::before{content:\"\";position:absolute;inset:-4px;border-radius:9999px;background:conic-gradient(from 180deg at 50% 50%, rgba(37,99,235,.45), rgba(37,99,235,.1), rgba(37,99,235,.45));z-index:-1}" +
    ".mw-launcher:hover{transform:translateY(-2px) scale(1.03) !important;box-shadow:0 18px 40px -12px rgba(0,0,0,.5)}" +
    ".mw-launcher:active{transform:scale(.98) !important}" +
    ".mw-launcher img{width:34px;height:34px;object-fit:contain}" +
    ".mw-launcher-logo-wrap{width:48px;height:48px;border-radius:9999px;background:rgba(255,255,255,.16);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center}" +
    ".mw-panel{position:fixed !important;left:auto !important;top:auto !important;max-width:calc(100vw - 32px);max-height:calc(100vh - 48px);background:#fff;border-radius:16px;box-shadow:0 20px 50px -10px rgba(0,0,0,.25);display:flex;flex-direction:column;overflow:hidden;z-index:2147483647 !important;border:1px solid #e5e7eb;margin:0 !important;float:none !important;transform:none !important}" +
    ".mw-header{background:var(--mw-primary);color:#fff;padding:14px 16px;display:flex;align-items:center;justify-content:space-between}" +
    ".mw-header-left{display:flex;align-items:center;gap:12px}" +
    ".mw-avatar{width:36px;height:36px;border-radius:9999px;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;overflow:hidden}" +
    ".mw-avatar img{width:24px;height:24px;object-fit:contain}" +
    ".mw-title{font-size:14px;font-weight:600;line-height:1.2}" +
    ".mw-status{font-size:11px;opacity:.85;display:flex;align-items:center;gap:6px;margin-top:2px}" +
    ".mw-dot{width:6px;height:6px;border-radius:9999px;background:#34d399}" +
    ".mw-close{background:none;border:none;color:#fff;cursor:pointer;opacity:.7;font-size:20px;line-height:1;padding:4px}" +
    ".mw-close:hover{opacity:1}" +
    ".mw-messages{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px;background:#f9fafb}" +
    ".mw-msg{display:flex;gap:8px;align-items:flex-start}" +
    ".mw-msg.user{flex-direction:row-reverse}" +
    ".mw-msg-avatar{width:28px;height:28px;border-radius:9999px;background:#dbeafe;flex-shrink:0;display:flex;align-items:center;justify-content:center;overflow:hidden}" +
    ".mw-msg-avatar img{width:20px;height:20px;object-fit:contain}" +
    ".mw-msg-bubble{max-width:75%;padding:10px 14px;border-radius:16px;font-size:14px;line-height:1.5;color:#111827;background:#fff;border:1px solid #e5e7eb;border-bottom-left-radius:4px;white-space:pre-wrap;word-wrap:break-word}" +
    ".mw-msg.user .mw-msg-bubble{background:var(--mw-primary);color:#fff;border-color:var(--mw-primary);border-bottom-right-radius:4px;border-bottom-left-radius:16px}" +
    ".mw-typing{display:flex;gap:4px;padding:4px 0}" +
    ".mw-typing span{width:6px;height:6px;border-radius:9999px;background:#9ca3af}" +
    ".mw-typing span:nth-child(2){animation-delay:.2s}" +
    ".mw-typing span:nth-child(3){animation-delay:.4s}" +
    ".mw-actions{display:flex;gap:8px;padding:8px 12px;background:#fff;border-top:1px solid #e5e7eb;flex-wrap:wrap}" +
    ".mw-action-btn{flex:1;min-width:90px;display:flex;align-items:center;justify-content:center;gap:6px;padding:8px;border-radius:8px;border:1px solid #e5e7eb;background:#fff;color:#111827;text-decoration:none;font-size:12px;font-weight:500;cursor:pointer;transition:background .15s;font-family:inherit}" +
    ".mw-action-btn:hover{background:#f3f4f6}" +
    ".mw-action-btn.wa{color:#25D366;border-color:#25D366}" +
    ".mw-action-btn.wa:hover{background:#25D36610}" +
    ".mw-action-btn.lead{color:var(--mw-primary);border-color:var(--mw-primary)}" +
    ".mw-action-btn.lead:hover{background:#2563eb10}" +
    ".mw-action-btn svg{width:14px;height:14px}" +
    ".mw-input-bar{padding:12px;border-top:1px solid #e5e7eb;background:#fff;display:flex;gap:8px}" +
    ".mw-input{flex:1;border:1px solid #d1d5db;border-radius:12px;padding:10px 14px;font-size:14px;outline:none;font-family:inherit}" +
    ".mw-input:focus{border-color:var(--mw-primary)}" +
    ".mw-send{background:var(--mw-primary);color:#fff;border:none;border-radius:12px;width:40px;height:40px;cursor:pointer;display:flex;align-items:center;justify-content:center}" +
    ".mw-send:disabled{opacity:.5;cursor:not-allowed}" +
    ".mw-footer{text-align:center;font-size:10px;color:#9ca3af;padding:6px}" +
    ".mw-link{color:inherit;text-decoration:none;border-bottom:1px dotted rgba(37,99,235,.35)}" +
    ".mw-link:hover{text-decoration:underline}" +
    ".mw-lead-form{padding:12px;background:#f9fafb;border-top:1px solid #e5e7eb;display:none;flex-direction:column;gap:8px}" +
    ".mw-lead-form input{border:1px solid #d1d5db;border-radius:8px;padding:8px 12px;font-size:13px;outline:none;font-family:inherit}" +
    ".mw-lead-form input:focus{border-color:var(--mw-primary)}" +
    ".mw-lead-row{display:flex;gap:8px}" +
    ".mw-lead-submit{background:var(--mw-primary);color:#fff;border:none;border-radius:8px;padding:8px;font-size:13px;font-weight:500;cursor:pointer;flex:1;font-family:inherit}" +
    ".mw-lead-cancel{background:#fff;color:#6b7280;border:1px solid #d1d5db;border-radius:8px;padding:8px;font-size:13px;cursor:pointer;font-family:inherit}" +
    ".mw-lead-error{color:#dc2626;font-size:12px}" +
    ".mw-launcher-badge{position:absolute;top:-4px;right:-4px;min-width:18px;height:18px;padding:0 5px;border-radius:9999px;background:#dc2626;color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 2px #fff}" +
    ".mw-warn-banner{padding:8px 12px;background:#fef3c7;color:#92400e;font-size:12px;text-align:center;border-bottom:1px solid #fde68a}" +
    ".mw-turnstile{padding:8px 12px 4px;background:#fff;border-top:1px solid #e5e7eb;display:flex;justify-content:center}" +
    ".mw-turnstile iframe{max-width:100%}" +
    "@keyframes mw-bounce{0%,60%,100%{transform:translateY(0);opacity:.5}30%{transform:translateY(-6px);opacity:1}}" +
    "@keyframes mw-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}" +
    "@keyframes mw-spin{to{transform:rotate(360deg)}}" +
    ".mw-dark .mw-panel{background:#1f2937;border-color:#374151;color:#f3f4f6}" +
    ".mw-dark .mw-messages{background:#111827}" +
    ".mw-dark .mw-msg-bubble{background:#374151;color:#f3f4f6;border-color:#4b5563}" +
    ".mw-dark .mw-msg.user .mw-msg-bubble{background:var(--mw-primary);color:#fff;border-color:var(--mw-primary)}" +
    ".mw-dark .mw-input-bar{background:#1f2937;border-color:#374151}" +
    ".mw-dark .mw-input{background:#374151;color:#f3f4f6;border-color:#4b5563}" +
    ".mw-dark .mw-input::placeholder{color:#9ca3af}" +
    ".mw-dark .mw-input:focus{border-color:var(--mw-primary)}" +
    ".mw-dark .mw-actions{background:#1f2937;border-color:#374151}" +
    ".mw-dark .mw-action-btn{background:#374151;color:#f3f4f6;border-color:#4b5563}" +
    ".mw-dark .mw-action-btn:hover{background:#4b5563}" +
    ".mw-dark .mw-footer{background:#1f2937}" +
    ".mw-dark .mw-warn-banner{background:#78350f;color:#fde68a;border-color:#92400e}" +
    ".mw-dark .mw-lead-form{background:#111827;border-color:#374151}" +
    ".mw-dark .mw-lead-form input{background:#374151;color:#f3f4f6;border-color:#4b5563}" +
    ".mw-dark .mw-lead-cancel{background:#374151;color:#d1d5db;border-color:#4b5563}" +
    ".mw-dark .mw-turnstile{background:#1f2937;border-color:#374151}" +
    ".mw-dark .mw-link{border-bottom-color:rgba(96,165,250,.35)}" +
    ".mw-launcher.mw-launcher-left{left:24px !important;right:auto !important}" +
    ".mw-panel.mw-panel-left{left:24px !important;right:auto !important}";

  // Animation keyframes - conditionally added if animations are enabled
  function addAnimationStyles() {
    var animEl = document.getElementById("mw-anim-styles");
    if (animEl) return;
    var s = document.createElement("style");
    s.id = "mw-anim-styles";
    s.textContent =
      ".mw-launcher{animation:mw-float 2.8s ease-in-out infinite}" +
      ".mw-launcher::before{animation:mw-spin 3s linear infinite}" +
      ".mw-typing span{animation:mw-bounce 1.4s infinite}";
    document.head.appendChild(s);
  }

  function removeAnimationStyles() {
    var animEl = document.getElementById("mw-anim-styles");
    if (animEl) animEl.remove();
  }

  var style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  function applyTheme() {
    document.documentElement.style.setProperty("--mw-primary", theme.primary);
  }
  applyTheme();

  // ============================================================
  // SECTION 10: DOM
  // ============================================================
  var launcher = document.createElement("button");
  launcher.className = "mw-launcher";
  launcher.setAttribute("aria-label", "Open chat");
  launcher.innerHTML = '<span class="mw-launcher-logo-wrap"><img src="' + escapeHtml(DEFAULT_LOGO) + '" alt="Chat" /></span>';

  var panel = document.createElement("div");
  panel.className = "mw-panel";
  panel.style.display = "none";
  panel.innerHTML =
    '<div class="mw-header">' +
      '<div class="mw-header-left">' +
        '<div class="mw-avatar"><img src="' + escapeHtml(DEFAULT_LOGO) + '" alt="" /></div>' +
        '<div><div class="mw-title" id="mw-biz-name"></div>' +
        '<div class="mw-status"><span class="mw-dot"></span>Online</div></div>' +
      '</div>' +
      '<button class="mw-close" aria-label="Close">\u00d7</button>' +
    '</div>' +
    '<div class="mw-messages" id="mw-messages"></div>' +
    '<div class="mw-warn-banner" id="mw-warn-banner" style="display:none"></div>' +
    '<div class="mw-actions" id="mw-actions"></div>' +
    '<div class="mw-turnstile" id="mw-turnstile"></div>' +
    '<div class="mw-lead-form" id="mw-lead-form">' +
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
    '<div class="mw-footer"><a class="mw-link" href="' + escapeHtml(MOBIWAVE_AI_SITE) + '" target="_blank" rel="noopener">Mobiwave AI</a> \u00b7 Powered by <a class="mw-link" href="' + escapeHtml(MOBIWAVE_INNOVATIONS_SITE) + '" target="_blank" rel="noopener">Mobiwave Innovations</a></div>';

  function init() {
    if (document.body) {
      document.body.appendChild(launcher);
      document.body.appendChild(panel);
      updateBizNameUI();
      applyCustomConfig();
      sendPageView();
    } else {
      setTimeout(init, 50);
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  var msgEl = document.getElementById("mw-messages");
  var warnBanner = document.getElementById("mw-warn-banner");
  var inputEl = document.getElementById("mw-input");
  var formEl = document.getElementById("mw-form");
  var closeBtn = panel.querySelector(".mw-close");
  var bizNameEl = document.getElementById("mw-biz-name");
  var actionsEl = document.getElementById("mw-actions");
  var leadFormEl = document.getElementById("mw-lead-form");
  var leadNameEl = document.getElementById("mw-lead-name");
  var leadEmailEl = document.getElementById("mw-lead-email");
  var leadPhoneEl = document.getElementById("mw-lead-phone");
  var leadErrorEl = document.getElementById("mw-lead-error");

  function updateBizNameUI() {
    if (bizNameEl) {
      bizNameEl.innerHTML = '<a class="mw-link" id="mw-biz-link" target="_blank" rel="noopener"></a>';
      var link = document.getElementById("mw-biz-link");
      link.href = escapeHtml(theme.website);
      link.textContent = theme.businessName;
    }
  }

  function setAgentTyping(on) {
    if (agentTypingTimer) { clearTimeout(agentTypingTimer); agentTypingTimer = null; }
    agentTyping = !!on;
    if (on) { agentTypingTimer = setTimeout(function () { agentTyping = false; if (isOpen) render(); }, 5000); }
    if (isOpen) render();
  }

  function updateLauncherBadge() {
    var existing = launcher.querySelector(".mw-launcher-badge");
    if (unreadAgent <= 0) { if (existing) existing.remove(); return; }
    if (!existing) {
      existing = document.createElement("span");
      existing.className = "mw-launcher-badge";
      launcher.appendChild(existing);
    }
    existing.textContent = unreadAgent > 9 ? "9+" : String(unreadAgent);
  }

  // ============================================================
  // SECTION 10b: Custom Config Application
  // ============================================================
  function applyCustomConfig() {
    var fontFamily = FONT_MAP[widgetConfig.font_family] || FONT_MAP.system;
    panel.style.fontFamily = fontFamily;
    panel.style.width = widgetConfig.width + "px";
    panel.style.height = widgetConfig.height + "px";
    panel.style.borderRadius = widgetConfig.border_radius + "px";

    var pos = "right";
    var px = widgetConfig.position_x + "px";
    var py = widgetConfig.position_y + "px";

    launcher.style.bottom = py;
    launcher.style.right = px;
    launcher.style.left = "auto";
    launcher.className = "mw-launcher";

    panel.style.bottom = py;
    panel.style.right = px;
    panel.style.left = "auto";
    panel.className = "mw-panel";

    var bubbles = panel.querySelectorAll(".mw-msg-bubble");
    for (var i = 0; i < bubbles.length; i++) {
      bubbles[i].style.borderRadius = widgetConfig.border_radius + "px";
      bubbles[i].style.borderBottomLeftRadius = "4px";
    }
    var userBubbles = panel.querySelectorAll(".mw-msg.user .mw-msg-bubble");
    for (var i = 0; i < userBubbles.length; i++) {
      userBubbles[i].style.borderBottomRightRadius = "4px";
      userBubbles[i].style.borderBottomLeftRadius = widgetConfig.border_radius + "px";
    }

    var input = document.getElementById("mw-input");
    if (input) input.style.borderRadius = widgetConfig.border_radius + "px";

    var sendBtn = panel.querySelector(".mw-send");
    if (sendBtn) sendBtn.style.borderRadius = widgetConfig.button_radius + "px";

    var actionBtns = panel.querySelectorAll(".mw-action-btn");
    for (var i = 0; i < actionBtns.length; i++) {
      actionBtns[i].style.borderRadius = widgetConfig.button_radius + "px";
    }

    var leadSubmit = document.getElementById("mw-lead-submit");
    if (leadSubmit) leadSubmit.style.borderRadius = widgetConfig.button_radius + "px";
    var leadCancel = document.getElementById("mw-lead-cancel");
    if (leadCancel) leadCancel.style.borderRadius = widgetConfig.button_radius + "px";

    var avatarEls = panel.querySelectorAll(".mw-avatar, .mw-msg-avatar");
    for (var i = 0; i < avatarEls.length; i++) {
      avatarEls[i].style.display = widgetConfig.show_avatar ? "" : "none";
    }

    var footer = panel.querySelector(".mw-footer");
    if (footer) footer.style.display = widgetConfig.show_branding ? "" : "none";

    if (widgetConfig.dark_mode) {
      panel.classList.add("mw-dark");
    } else {
      panel.classList.remove("mw-dark");
    }

    if (widgetConfig.animations) {
      addAnimationStyles();
    } else {
      removeAnimationStyles();
    }
  }

  function applyCustomConfigToMessages() {
    var msgBubbles = panel.querySelectorAll(".mw-msg-bubble");
    for (var i = 0; i < msgBubbles.length; i++) {
      msgBubbles[i].style.borderRadius = widgetConfig.border_radius + "px";
      if (msgBubbles[i].closest(".mw-msg.user")) {
        msgBubbles[i].style.borderBottomRightRadius = "4px";
        msgBubbles[i].style.borderBottomLeftRadius = widgetConfig.border_radius + "px";
      } else {
        msgBubbles[i].style.borderBottomLeftRadius = "4px";
      }
    }
    var avatarEls = panel.querySelectorAll(".mw-avatar, .mw-msg-avatar");
    for (var i = 0; i < avatarEls.length; i++) {
      avatarEls[i].style.display = widgetConfig.show_avatar ? "" : "none";
    }
  }

  // ============================================================
  // SECTION 11: Render
  // ============================================================
  function renderActions() {
    var html = "";
    if (!leadCaptured) {
      html += '<button type="button" class="mw-action-btn lead" id="mw-lead-cta">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>' +
        'Talk to us</button>';
    }
    if (theme.whatsapp) {
      var waNum = sanitizePhone(theme.whatsapp).replace(/[^\d]/g, "");
      html += '<a class="mw-action-btn wa" target="_blank" rel="noopener" href="https://wa.me/' + encodeURIComponent(waNum) + '">' +
        '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>' +
        'WhatsApp</a>';
    }
    if (theme.call) {
      html += '<a class="mw-action-btn" href="tel:' + encodeURIComponent(sanitizePhone(theme.call)) + '">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>' +
        'Call</a>';
    }
    actionsEl.innerHTML = html;
    actionsEl.style.display = html ? "flex" : "none";
    var leadCta = document.getElementById("mw-lead-cta");
    if (leadCta) leadCta.addEventListener("click", openLeadForm);

    var actionBtns = actionsEl.querySelectorAll(".mw-action-btn");
    for (var i = 0; i < actionBtns.length; i++) {
      actionBtns[i].style.borderRadius = widgetConfig.button_radius + "px";
    }
  }

  function render() {
    inputEl.disabled = !!widgetBlocked;
    var sendBtn = formEl.querySelector(".mw-send");
    if (sendBtn) sendBtn.disabled = !!widgetBlocked;
    inputEl.placeholder = widgetBlocked ? "Widget unavailable for this website" : "Type a message...";

    if (widgetBlocked && warnBanner) {
      warnBanner.style.display = "block";
      warnBanner.textContent = widgetBlockedReason || "Chat unavailable";
    } else if (warnBanner) {
      warnBanner.style.display = "none";
    }

    var html = messages.map(function (m) {
      var avatar = m.role === "user"
        ? '<div class="mw-msg-avatar"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>'
        : '<div class="mw-msg-avatar"><img src="' + escapeHtml(DEFAULT_LOGO) + '" alt="" /></div>';
      return '<div class="mw-msg ' + m.role + '">' + avatar +
        '<div class="mw-msg-bubble">' + escapeHtml(m.content) + '</div></div>';
    }).join("");

    if (isLoading || agentTyping) {
      var label = (agentTyping && !isLoading) ? '<div style="font-size:10px;color:#6b7280;margin-bottom:2px">Agent is typing\u2026</div>' : "";
      html += '<div class="mw-msg assistant"><div class="mw-msg-avatar"><img src="' + escapeHtml(DEFAULT_LOGO) + '" alt="" /></div>' +
        '<div class="mw-msg-bubble">' + label + '<div class="mw-typing"><span></span><span></span><span></span></div></div></div>';
    }

    msgEl.innerHTML = html;
    msgEl.scrollTop = msgEl.scrollHeight;

    var msgBubbles = panel.querySelectorAll(".mw-msg-bubble");
    for (var i = 0; i < msgBubbles.length; i++) {
      msgBubbles[i].style.borderRadius = widgetConfig.border_radius + "px";
      if (msgBubbles[i].closest(".mw-msg.user")) {
        msgBubbles[i].style.borderBottomRightRadius = "4px";
        msgBubbles[i].style.borderBottomLeftRadius = widgetConfig.border_radius + "px";
      } else {
        msgBubbles[i].style.borderBottomLeftRadius = "4px";
      }
    }
    var avatarEls = panel.querySelectorAll(".mw-avatar, .mw-msg-avatar");
    for (var i = 0; i < avatarEls.length; i++) {
      avatarEls[i].style.display = widgetConfig.show_avatar ? "" : "none";
    }
  }

  // ============================================================
  // SECTION 12: Widget lifecycle
  // ============================================================
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
      pingAnalytics("widget_opened");
      if (turnstileSiteKey) { loadTurnstile(); }
    } else {
      pingAnalytics("widget_closed");
    }
  }

  launcher.addEventListener("click", function () { toggle(true); });
  closeBtn.addEventListener("click", function () { toggle(false); });

  inputEl.addEventListener("input", function () {
    var hasText = inputEl.value.length > 0;
    Promise.resolve(ensureConversation()).then(function () {
      var now = Date.now();
      if (hasText && now - visitorTypingLastSent > 1500) {
        visitorTypingLastSent = now;
        sendVisitorTyping(true);
      }
      if (visitorTypingDebounce) clearTimeout(visitorTypingDebounce);
      visitorTypingDebounce = setTimeout(function () {
        visitorTypingLastSent = 0;
        sendVisitorTyping(false);
      }, 2500);
    });
  });

  formEl.addEventListener("submit", function (e) {
    e.preventDefault();
    if (widgetBlocked) return;
    var text = sanitizeText(inputEl.value, MAX_MESSAGE_CHARS);
    if (!text || isLoading) return;
    var now = Date.now();
    if (now - lastMessageSentAt < MIN_SEND_INTERVAL_MS) return;
    lastMessageSentAt = now;
    messages.push({ role: "user", content: text });
    inputEl.value = "";
    isLoading = true;
    if (visitorTypingDebounce) { clearTimeout(visitorTypingDebounce); visitorTypingDebounce = null; }
    visitorTypingLastSent = 0;
    sendVisitorTyping(false);
    render();

    Promise.resolve(ensureConversation()).then(function () {
      persistMessage("user", text);
      sendToAI();
    });
  });

  // Lead form events
  document.getElementById("mw-lead-cancel").addEventListener("click", closeLeadForm);
  document.getElementById("mw-lead-submit").addEventListener("click", submitLead);

  // ============================================================
  // SECTION 13: Widget config fetch
  // ============================================================
  function initCustomConfig(data) {
    if (!data) return;
    var raw = data.widget_config;
    if (raw && typeof raw === "string") {
      try {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          for (var k in parsed) {
            if (parsed.hasOwnProperty(k) && widgetConfig.hasOwnProperty(k)) {
              widgetConfig[k] = parsed[k];
            }
          }
        }
      } catch (e) { /* keep defaults */ }
    }
    applyCustomConfig();
  }

  function fetchWidgetConfig(id) {
    var url = ORIGIN + "/functions/v1/widget-config?business_id=" + encodeURIComponent(id);
    if (visitorId) url += "&visitor_id=" + encodeURIComponent(visitorId);

    fetch(url, { method: "GET" }).then(function (r) {
      if (!r.ok) throw new Error("Config fetch failed");
      return r.json();
    }).then(function (data) {
      configFetched = true;
      guestToken = data.guest_token || "";
      supabaseUrl = data.supabase_url || "";

      if (data.primary_color) theme.primary = data.primary_color;
      if (data.business_name) theme.businessName = data.business_name;
      if (data.welcome_message) theme.welcome = data.welcome_message;
      if (data.logo_url) theme.logoUrl = data.logo_url;
      if (data.website && typeof data.website === "string") theme.website = data.website;
      theme.whatsapp = data.whatsapp_number || "";
      theme.call = data.call_number || "";

      var logo = resolveLogo(theme.logoUrl);
      launcher.innerHTML = '<span class="mw-launcher-logo-wrap"><img src="' + escapeHtml(logo) + '" alt="Chat" onerror="this.onerror=null;this.src=\'' + escapeHtml(DEFAULT_LOGO) + '\'" /></span>';
      applyTheme();
      updateBizNameUI();
      if (messages.length === 1 && messages[0].role === "assistant") {
        messages[0].content = theme.welcome;
        if (isOpen) render();
      }
      if (isOpen) renderActions();

      initCustomConfig(data);
    }).catch(function () { /* keep defaults */ });
  }

  if (businessId) fetchWidgetConfig(businessId);
})();
