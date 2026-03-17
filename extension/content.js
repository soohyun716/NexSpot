(() => {
  if (window.__NEXSPOT_LOADED__) return;
  window.__NEXSPOT_LOADED__ = true;

  const STATE = {
    guide: null,
    currentStepIndex: 0,
    tooltipHidden: false,
    stepTargetCache: new Map(),
    retryTimer: null,
    rafId: null,
    boundTarget: null,
    boundHandler: null
  };

  const ROOT_ID = "nexspot-root";
  const MAX_RETRIES = 3;
  const RETRY_DELAYS = [0, 400, 900, 1600];

  const sensitiveKeywords = [
    "password",
    "비밀번호",
    "otp",
    "보안카드",
    "인증번호",
    "계좌번호",
    "account number",
    "balance",
    "잔액",
    "주민등록",
    "resident",
    "card number",
    "카드번호",
    "security code",
    "cvv",
    "pin",
    "token value",
    "personal access token",
    "access token"
  ];

  let rootEl = null;
  let highlightEl = null;
  let tooltipEl = null;
  let floatingReopenBtn = null;
  let tooltipTitleEl = null;
  let tooltipSubEl = null;
  let prevBtnEl = null;
  let nextBtnEl = null;
  let closeBtnEl = null;

  function normalizeText(text = "") {
    return String(text).replace(/\s+/g, " ").trim().toLowerCase();
  }

  function containsSensitiveKeyword(text = "") {
    const normalized = normalizeText(text);
    return sensitiveKeywords.some((keyword) => normalized.includes(keyword));
  }

  function getElementText(el) {
    if (!el) return "";

    return normalizeText(
      [
        el.innerText,
        el.textContent,
        el.getAttribute("aria-label"),
        el.getAttribute("title"),
        el.getAttribute("placeholder"),
        el.getAttribute("value"),
        el.getAttribute("name"),
        el.getAttribute("id"),
        el.getAttribute("data-testid"),
        el.alt
      ]
        .filter(Boolean)
        .join(" ")
    );
  }

  function getRoleLike(el) {
    if (!el) return "";

    return normalizeText(
      [
        el.tagName?.toLowerCase(),
        el.getAttribute("role"),
        el.getAttribute("type")
      ]
        .filter(Boolean)
        .join(" ")
    );
  }

  function isSensitiveElement(el) {
    if (!el) return false;
    if (containsSensitiveKeyword(getElementText(el))) return true;

    const attrs = [
      el.getAttribute("name"),
      el.getAttribute("id"),
      el.getAttribute("placeholder"),
      el.getAttribute("aria-label"),
      el.getAttribute("title")
    ]
      .filter(Boolean)
      .join(" ");

    if (containsSensitiveKeyword(attrs)) return true;
    if (normalizeText(el.getAttribute("type")) === "password") return true;

    return false;
  }

  function isVisible(el) {
    if (!el || !(el instanceof Element)) return false;

    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);

    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      style.opacity !== "0"
    );
  }

  function clearRetryTimer() {
    if (STATE.retryTimer) {
      clearTimeout(STATE.retryTimer);
      STATE.retryTimer = null;
    }
  }

  function clearRaf() {
    if (STATE.rafId) {
      cancelAnimationFrame(STATE.rafId);
      STATE.rafId = null;
    }
  }

  function findClickableParent(el) {
    let node = el;

    while (node && node !== document.body) {
      const tag = node.tagName?.toLowerCase();
      const role = node.getAttribute?.("role");

      if (
        tag === "button" ||
        tag === "a" ||
        tag === "summary" ||
        role === "button" ||
        role === "menuitem" ||
        role === "tab" ||
        role === "link"
      ) {
        return node;
      }

      node = node.parentElement;
    }

    return el;
  }

  function getCandidateNodeList() {
    return document.querySelectorAll(
      [
        "button",
        "a",
        "summary",
        "img",
        "[role='button']",
        "[role='menuitem']",
        "[role='tab']",
        "[role='link']",
        "[aria-label]",
        "[title]",
        "[data-testid]"
      ].join(",")
    );
  }

  function dedupeElements(elements) {
    const seen = new Set();
    const result = [];

    for (const el of elements) {
      if (!el || seen.has(el)) continue;
      seen.add(el);
      result.push(el);
    }

    return result;
  }

  function collectCandidates(hints) {
    const results = [];

    for (const selector of hints.selectors || []) {
      if (!selector) continue;

      try {
        const found = document.querySelectorAll(selector);
        for (const el of found) {
          results.push(findClickableParent(el));
        }
      } catch (error) {}
    }

    if (results.length < 12) {
      const limited = getCandidateNodeList();
      for (const el of limited) {
        results.push(findClickableParent(el));
      }
    }

    return dedupeElements(results);
  }

  function scoreElement(el, hints) {
    if (!isVisible(el)) return -9999;
    if (isSensitiveElement(el)) return -9999;

    let score = 0;
    const text = getElementText(el);
    const roleText = getRoleLike(el);
    const rect = el.getBoundingClientRect();

    for (const selector of hints.selectors || []) {
      try {
        if (selector && el.matches(selector)) score += 70;
      } catch (error) {}
    }

    for (const targetText of hints.texts || []) {
      const t = normalizeText(targetText);
      if (!t) continue;

      if (text === t) score += 80;
      else if (text.includes(t)) score += 40;
    }

    for (const targetRole of hints.roles || []) {
      const r = normalizeText(targetRole);
      if (!r) continue;
      if (roleText.includes(r)) score += 20;
    }

    const tag = el.tagName?.toLowerCase();
    if (tag === "button") score += 8;
    if (tag === "a") score += 6;
    if (tag === "summary") score += 8;
    if (tag === "img" && text.includes("avatar")) score += 10;

    if (rect.top >= 0 && rect.top <= window.innerHeight) score += 10;
    if (rect.width < 18 || rect.height < 12) score -= 20;
    if (el.disabled) score -= 100;

    return score;
  }

  function findTarget(step) {
    if (!step) return null;

    const cached = STATE.stepTargetCache.get(step.id);
    if (cached && document.contains(cached) && isVisible(cached)) {
      return cached;
    }

    const hints = step.targetHints || { selectors: [], texts: [], roles: [] };
    const candidates = collectCandidates(hints);

    let best = null;
    let bestScore = -9999;

    for (const el of candidates) {
      const score = scoreElement(el, hints);
      if (score > bestScore) {
        bestScore = score;
        best = el;
      }
    }

    if (best && bestScore >= 20) {
      const corrected = findClickableParent(best);
      STATE.stepTargetCache.set(step.id, corrected);
      return corrected;
    }

    return null;
  }

  function getCurrentStep() {
    if (!STATE.guide?.steps?.length) return null;
    return STATE.guide.steps[STATE.currentStepIndex] || null;
  }

  function clearBindings() {
    if (STATE.boundTarget && STATE.boundHandler) {
      STATE.boundTarget.removeEventListener("click", STATE.boundHandler, true);
    }
    STATE.boundTarget = null;
    STATE.boundHandler = null;
  }

  function bindStepAction(step, target) {
    clearBindings();

    if (!step?.action || !target) return;

    const actionType = step.action.type;
    if (!["click_then_navigate", "click_then_wait_dom"].includes(actionType)) return;

    const handler = () => {
      chrome.runtime.sendMessage({
        type: "NEXSPOT_STEP_INTERACTION",
        payload: {
          stepId: step.id,
          actionType
        }
      });
    };

    target.addEventListener("click", handler, {
      capture: true,
      once: true
    });

    STATE.boundTarget = target;
    STATE.boundHandler = handler;
  }

  function ensureRoot() {
    if (rootEl && document.documentElement.contains(rootEl)) return;

    rootEl = document.createElement("div");
    rootEl.id = ROOT_ID;
    rootEl.style.position = "fixed";
    rootEl.style.inset = "0";
    rootEl.style.zIndex = "2147483647";
    rootEl.style.pointerEvents = "none";
    rootEl.style.isolation = "isolate";
    rootEl.style.transform = "translateZ(0)";
    document.documentElement.appendChild(rootEl);

    highlightEl = document.createElement("div");
    highlightEl.style.position = "fixed";
    highlightEl.style.border = "3px solid #3b82f6";
    highlightEl.style.borderRadius = "12px";
    highlightEl.style.boxShadow = "0 0 0 9999px rgba(0,0,0,0.45)";
    highlightEl.style.pointerEvents = "none";
    highlightEl.style.zIndex = "2147483647";
    highlightEl.style.display = "none";
    rootEl.appendChild(highlightEl);

    tooltipEl = document.createElement("div");
    tooltipEl.style.position = "fixed";
    tooltipEl.style.maxWidth = "340px";
    tooltipEl.style.background = "#ffffff";
    tooltipEl.style.color = "#111827";
    tooltipEl.style.borderRadius = "16px";
    tooltipEl.style.padding = "14px";
    tooltipEl.style.boxShadow = "0 12px 28px rgba(0,0,0,0.2)";
    tooltipEl.style.fontFamily =
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    tooltipEl.style.pointerEvents = "auto";
    tooltipEl.style.zIndex = "2147483648";
    tooltipEl.style.display = "none";
    rootEl.appendChild(tooltipEl);

    const header = document.createElement("div");
    header.style.display = "flex";
    header.style.alignItems = "flex-start";
    header.style.justifyContent = "space-between";
    header.style.gap = "10px";
    tooltipEl.appendChild(header);

    tooltipTitleEl = document.createElement("div");
    tooltipTitleEl.style.fontSize = "14px";
    tooltipTitleEl.style.fontWeight = "700";
    tooltipTitleEl.style.lineHeight = "1.5";
    tooltipTitleEl.style.flex = "1";
    header.appendChild(tooltipTitleEl);

    const hideBtn = document.createElement("button");
    hideBtn.textContent = "✕";
    hideBtn.style.border = "none";
    hideBtn.style.background = "transparent";
    hideBtn.style.color = "#64748b";
    hideBtn.style.fontSize = "16px";
    hideBtn.style.cursor = "pointer";
    hideBtn.style.padding = "0";
    hideBtn.style.lineHeight = "1";
    hideBtn.onclick = () => {
      STATE.tooltipHidden = true;
      renderStepAttempt(0);
    };
    header.appendChild(hideBtn);

    tooltipSubEl = document.createElement("div");
    tooltipSubEl.style.marginTop = "8px";
    tooltipSubEl.style.fontSize = "12px";
    tooltipSubEl.style.color = "#6b7280";
    tooltipEl.appendChild(tooltipSubEl);

    const btnWrap = document.createElement("div");
    btnWrap.style.display = "flex";
    btnWrap.style.gap = "8px";
    btnWrap.style.marginTop = "12px";
    tooltipEl.appendChild(btnWrap);

    prevBtnEl = document.createElement("button");
    prevBtnEl.textContent = "이전";
    styleButton(prevBtnEl, false);
    prevBtnEl.onclick = () => {
      chrome.runtime.sendMessage({ type: "NEXSPOT_PREV_STEP" });
    };

    nextBtnEl = document.createElement("button");
    nextBtnEl.textContent = "다음";
    styleButton(nextBtnEl, true);
    nextBtnEl.onclick = () => {
      chrome.runtime.sendMessage({ type: "NEXSPOT_NEXT_STEP" });
    };

    closeBtnEl = document.createElement("button");
    closeBtnEl.textContent = "종료";
    styleButton(closeBtnEl, false);
    closeBtnEl.onclick = () => {
      chrome.runtime.sendMessage({ type: "NEXSPOT_CLEAR" });
    };

    btnWrap.append(prevBtnEl, nextBtnEl, closeBtnEl);

    floatingReopenBtn = document.createElement("button");
    floatingReopenBtn.textContent = "가이드 보기";
    floatingReopenBtn.style.position = "fixed";
    floatingReopenBtn.style.top = "20px";
    floatingReopenBtn.style.right = "20px";
    floatingReopenBtn.style.zIndex = "2147483648";
    floatingReopenBtn.style.pointerEvents = "auto";
    floatingReopenBtn.style.border = "none";
    floatingReopenBtn.style.background = "#2563eb";
    floatingReopenBtn.style.color = "#fff";
    floatingReopenBtn.style.borderRadius = "999px";
    floatingReopenBtn.style.padding = "10px 14px";
    floatingReopenBtn.style.fontSize = "12px";
    floatingReopenBtn.style.cursor = "pointer";
    floatingReopenBtn.style.boxShadow = "0 8px 20px rgba(0,0,0,0.18)";
    floatingReopenBtn.style.display = "none";
    floatingReopenBtn.onclick = () => {
      STATE.tooltipHidden = false;
      renderStepAttempt(0);
    };
    rootEl.appendChild(floatingReopenBtn);

    window.addEventListener("resize", handleViewportUpdate, { passive: true });
    window.addEventListener("scroll", handleViewportUpdate, { passive: true });
  }

  function styleButton(button, primary) {
    button.style.border = primary ? "none" : "1px solid #d1d5db";
    button.style.background = primary ? "#2563eb" : "#fff";
    button.style.color = primary ? "#fff" : "#111827";
    button.style.borderRadius = "10px";
    button.style.padding = "8px 12px";
    button.style.cursor = "pointer";
    button.style.fontSize = "12px";
  }

  function positionTooltipNearRect(rect) {
    let tooltipTop = rect.bottom + 12;
    let tooltipLeft = rect.left;

    if (tooltipTop + 200 > window.innerHeight) {
      tooltipTop = Math.max(12, rect.top - 190);
    }

    if (tooltipLeft + 360 > window.innerWidth) {
      tooltipLeft = Math.max(12, window.innerWidth - 360);
    }

    tooltipEl.style.top = `${tooltipTop}px`;
    tooltipEl.style.left = `${tooltipLeft}px`;
    tooltipEl.style.right = "auto";
  }

  function updateOverlay(step, target) {
    ensureRoot();

    if (!step) {
      highlightEl.style.display = "none";
      tooltipEl.style.display = "none";
      floatingReopenBtn.style.display = "none";
      return;
    }

    if (target) {
      const rect = target.getBoundingClientRect();

      highlightEl.style.display = "block";
      highlightEl.style.left = `${rect.left - 6}px`;
      highlightEl.style.top = `${rect.top - 6}px`;
      highlightEl.style.width = `${rect.width + 12}px`;
      highlightEl.style.height = `${rect.height + 12}px`;
    } else {
      highlightEl.style.display = "none";
    }

    if (STATE.tooltipHidden) {
      tooltipEl.style.display = "none";
      floatingReopenBtn.style.display = "block";
      return;
    }

    floatingReopenBtn.style.display = "none";
    tooltipEl.style.display = "block";
    tooltipTitleEl.textContent = `${STATE.currentStepIndex + 1}. ${step.instruction}`;
    tooltipSubEl.textContent = target
      ? "해당 UI 후보를 찾았어요."
      : step.fallback || "현재 페이지에서 정확한 UI를 찾지 못했어요.";

    prevBtnEl.disabled = STATE.currentStepIndex <= 0;
    nextBtnEl.disabled =
      STATE.currentStepIndex >= (STATE.guide?.steps?.length || 1) - 1;

    prevBtnEl.style.opacity = prevBtnEl.disabled ? "0.5" : "1";
    nextBtnEl.style.opacity = nextBtnEl.disabled ? "0.5" : "1";

    if (target) {
      positionTooltipNearRect(target.getBoundingClientRect());
    } else {
      tooltipEl.style.top = "20px";
      tooltipEl.style.right = "20px";
      tooltipEl.style.left = "auto";
    }
  }

  function scrollIntoViewIfNeeded(el) {
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const outside =
      rect.top < 80 || rect.bottom > window.innerHeight - 80;

    if (outside) {
      el.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "center"
      });
    }
  }

  function renderAfterStableLayout(step, target) {
    clearRaf();

    STATE.rafId = requestAnimationFrame(() => {
      STATE.rafId = requestAnimationFrame(() => {
        updateOverlay(step, target);
      });
    });
  }

  function renderStepAttempt(attempt = 0) {
    clearRetryTimer();
    clearRaf();
    clearBindings();

    const step = getCurrentStep();
    if (!step) {
      updateOverlay(null, null);
      return;
    }

    const target = findTarget(step);

    if (target) {
      scrollIntoViewIfNeeded(target);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const refreshedTarget = findTarget(step) || target;
          bindStepAction(step, refreshedTarget);
          renderAfterStableLayout(step, refreshedTarget);
        });
      });

      return;
    }

    renderAfterStableLayout(step, null);

    if (attempt < MAX_RETRIES) {
      STATE.retryTimer = setTimeout(() => {
        renderStepAttempt(attempt + 1);
      }, RETRY_DELAYS[attempt + 1] || 1000);
    }
  }

  function handleViewportUpdate() {
    const step = getCurrentStep();
    if (!step) return;

    const cached = STATE.stepTargetCache.get(step.id);
    if (!cached || !document.contains(cached) || !isVisible(cached)) return;

    renderAfterStableLayout(step, cached);
  }

  function clearTimersAndBindings() {
    clearRetryTimer();
    clearRaf();
    clearBindings();
  }

  function setStateFromPayload(payload) {
    clearTimersAndBindings();

    STATE.guide = payload.guide || null;
    STATE.currentStepIndex = payload.currentStepIndex || 0;

    renderStepAttempt(0);
  }

  function clearGuide() {
    clearTimersAndBindings();

    STATE.guide = null;
    STATE.currentStepIndex = 0;
    STATE.tooltipHidden = false;
    STATE.stepTargetCache.clear();

    if (rootEl && rootEl.parentNode) {
      rootEl.parentNode.removeChild(rootEl);
    }

    rootEl = null;
    highlightEl = null;
    tooltipEl = null;
    floatingReopenBtn = null;
    tooltipTitleEl = null;
    tooltipSubEl = null;
    prevBtnEl = null;
    nextBtnEl = null;
    closeBtnEl = null;
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "NEXSPOT_PING") {
      sendResponse({ ok: true });
      return;
    }

    if (message.type === "NEXSPOT_SET_GUIDE") {
      STATE.tooltipHidden = false;
      setStateFromPayload(message.payload);
      sendResponse({ ok: true });
      return;
    }

    if (message.type === "NEXSPOT_RESTORE_STATE") {
      setStateFromPayload(message.payload);
      sendResponse({ ok: true });
      return;
    }

    if (message.type === "NEXSPOT_CLEAR") {
      clearGuide();
      sendResponse({ ok: true });
    }
  });
})();