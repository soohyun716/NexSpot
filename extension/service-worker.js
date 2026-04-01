const API_BASE_URL = "http://localhost:4000";
const STATE_KEY = "NexState";

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });
  return tab;
}

async function ensureContentScriptInjected(tabId) {
  try {
    await chrome.tabs.sendMessage(tabId, { type: "NEXSPOT_PING" });
  } catch (error) {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"]
    });
  }
}

async function saveState(nextState) {
  await chrome.storage.local.set({
    [STATE_KEY]: nextState
  });
}

async function getState() {
  const data = await chrome.storage.local.get([STATE_KEY]);
  return data[STATE_KEY] || null;
}

async function clearState() {
  await chrome.storage.local.remove([STATE_KEY]);
}

async function sendStateToPanel() {
  const state = await getState();
  try {
    await chrome.runtime.sendMessage({
      type: "NEXSPOT_PANEL_STATE",
      payload: state
    });
  } catch (error) {}
}

function getCurrentStep(state) {
  if (!state?.guide?.steps?.length) return null;
  return state.guide.steps[state.currentStepIndex] || null;
}

function getNextStepIndex(state) {
  if (!state?.guide?.steps?.length) return 0;
  return Math.min(state.currentStepIndex + 1, state.guide.steps.length - 1);
}

async function restoreGuideToTab(tabId, url) {
  const state = await getState();
  if (!state?.guide) return;
  if (!url || url.startsWith("chrome://")) return;

  try {
    await ensureContentScriptInjected(tabId);
    await chrome.tabs.sendMessage(tabId, {
      type: "NEXSPOT_RESTORE_STATE",
      payload: state
    });
  } catch (error) {
    console.error("Failed to restore guide:", error);
  }
}

async function maybeAdvanceAfterNavigation(tabId, url) {
  const state = await getState();
  if (!state?.guide?.steps?.length) return;

  const currentStep = getCurrentStep(state);
  if (!currentStep?.action) return;

  if (currentStep.action.type !== "click_then_navigate") {
    await restoreGuideToTab(tabId, url);
    return;
  }

  const recentClickAt = state.lastInteractionAt || 0;
  const now = Date.now();

  if (now - recentClickAt > 10000) {
    await restoreGuideToTab(tabId, url);
    return;
  }

  const nextIndex = getNextStepIndex(state);

  if (nextIndex !== state.currentStepIndex) {
    state.currentStepIndex = nextIndex;
    state.lastUrl = url;
    state.lastNavigationAt = now;

    await saveState(state);
    await sendStateToPanel();
  }

  await restoreGuideToTab(tabId, url);
}

chrome.runtime.onInstalled.addListener(() => {
  console.log("NexSpot installed");
});

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error("sidePanel error:", error));
  
chrome.runtime.onInstalled.addListener(async () => {
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

chrome.action.onClicked.addListener(async (tab) => {
  await chrome.sidePanel.open({ windowId: tab.windowId });
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete") return;
  if (!tab.url || tab.url.startsWith("chrome://")) return;

  await maybeAdvanceAfterNavigation(tabId, tab.url);
});

chrome.webNavigation.onHistoryStateUpdated.addListener(async (details) => {
  if (details.frameId !== 0) return;
  if (!details.url || details.url.startsWith("chrome://")) return;

  await maybeAdvanceAfterNavigation(details.tabId, details.url);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GENERATE_GUIDE") {
    (async () => {
      try {
        const tab = await getActiveTab();

        if (!tab?.id) {
          sendResponse({ ok: false, error: "No active tab found" });
          return;
        }

        await ensureContentScriptInjected(tab.id);

        const response = await fetch(`${API_BASE_URL}/api/guide`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            userRequest: message.payload.userRequest,
            url: tab.url,
            title: tab.title
          })
        });

        const guide = await response.json();

        if (!response.ok) {
          sendResponse({ ok: false, error: guide.error || "Guide API failed" });
          return;
        }

        const state = {
          userRequest: message.payload.userRequest,
          guide,
          currentStepIndex: 0,
          lastUrl: tab.url,
          lastInteractionAt: 0,
          lastNavigationAt: 0
        };

        await saveState(state);

        await chrome.tabs.sendMessage(tab.id, {
          type: "NEXSPOT_SET_GUIDE",
          payload: state
        });

        await sendStateToPanel();
        sendResponse({ ok: true, guide, state });
      } catch (error) {
        sendResponse({
          ok: false,
          error: error?.message || "Unknown error"
        });
      }
    })();

    return true;
  }

  if (message.type === "NEXSPOT_RESUME_ON_CURRENT_PAGE") {
    (async () => {
      try {
        const tab = await getActiveTab();
        const state = await getState();

        if (!tab?.id) {
          sendResponse({ ok: false, error: "No active tab found" });
          return;
        }

        if (!state?.guide) {
          sendResponse({ ok: false, error: "No saved guide found" });
          return;
        }

        state.lastUrl = tab.url;
        await saveState(state);

        await ensureContentScriptInjected(tab.id);
        await chrome.tabs.sendMessage(tab.id, {
          type: "NEXSPOT_RESTORE_STATE",
          payload: state
        });

        await sendStateToPanel();
        sendResponse({ ok: true, state });
      } catch (error) {
        sendResponse({
          ok: false,
          error: error?.message || "Failed to resume on current page"
        });
      }
    })();

    return true;
  }

  if (message.type === "NEXSPOT_STEP_INTERACTION") {
    (async () => {
      const state = await getState();

      if (!state?.guide?.steps?.length) {
        sendResponse({ ok: false, error: "No active guide" });
        return;
      }

      const currentStep = getCurrentStep(state);
      if (!currentStep) {
        sendResponse({ ok: false, error: "No current step" });
        return;
      }

      state.lastInteractionAt = Date.now();
      await saveState(state);

      if (message.payload?.actionType === "click_then_wait_dom") {
        const nextIndex = getNextStepIndex(state);

        if (nextIndex !== state.currentStepIndex) {
          state.currentStepIndex = nextIndex;
          await saveState(state);
          await sendStateToPanel();

          const tabId = sender?.tab?.id;
          if (tabId) {
            try {
              await chrome.tabs.sendMessage(tabId, {
                type: "NEXSPOT_RESTORE_STATE",
                payload: state
              });
            } catch (error) {}
          }
        }
      }

      sendResponse({ ok: true });
    })();

    return true;
  }

  if (message.type === "NEXSPOT_NEXT_STEP") {
    (async () => {
      const tab = await getActiveTab();
      const state = await getState();

      if (!tab?.id || !state?.guide) {
        sendResponse({ ok: false, error: "No active guide" });
        return;
      }

      const maxIndex = Math.max(0, (state.guide.steps?.length || 1) - 1);
      state.currentStepIndex = Math.min(maxIndex, (state.currentStepIndex || 0) + 1);
      state.lastUrl = tab.url;

      await saveState(state);

      try {
        await chrome.tabs.sendMessage(tab.id, {
          type: "NEXSPOT_RESTORE_STATE",
          payload: state
        });
      } catch (error) {}

      await sendStateToPanel();
      sendResponse({ ok: true, state });
    })();

    return true;
  }

  if (message.type === "NEXSPOT_PREV_STEP") {
    (async () => {
      const tab = await getActiveTab();
      const state = await getState();

      if (!tab?.id || !state?.guide) {
        sendResponse({ ok: false, error: "No active guide" });
        return;
      }

      state.currentStepIndex = Math.max(0, (state.currentStepIndex || 0) - 1);
      state.lastUrl = tab.url;

      await saveState(state);

      try {
        await chrome.tabs.sendMessage(tab.id, {
          type: "NEXSPOT_RESTORE_STATE",
          payload: state
        });
      } catch (error) {}

      await sendStateToPanel();
      sendResponse({ ok: true, state });
    })();

    return true;
  }

  if (message.type === "NEXSPOT_CLEAR") {
    (async () => {
      const tab = await getActiveTab();

      await clearState();

      if (tab?.id) {
        try {
          await chrome.tabs.sendMessage(tab.id, { type: "NEXSPOT_CLEAR" });
        } catch (error) {}
      }

      await sendStateToPanel();
      sendResponse({ ok: true });
    })();

    return true;
  }

  if (message.type === "SNEXSPOT_GET_STATE") {
    (async () => {
      const state = await getState();
      sendResponse({ ok: true, state });
    })();

    return true;
  }
});