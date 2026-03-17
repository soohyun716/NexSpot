const requestInput = document.getElementById("requestInput");
const generateBtn = document.getElementById("generateBtn");
const resumeBtn = document.getElementById("resumeBtn");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const clearBtn = document.getElementById("clearBtn");
const statusEl = document.getElementById("status");

const stepBadge = document.getElementById("stepBadge");
const guideTitleEl = document.getElementById("guideTitle");
const stepInstructionEl = document.getElementById("stepInstruction");

function setStatus(message) {
  statusEl.textContent = message;
}

function renderState(state) {
  if (!state?.guide?.steps?.length) {
    stepBadge.textContent = "단계 정보 없음";
    guideTitleEl.textContent = "넥스팟 가이드 없음";
    stepInstructionEl.textContent = "아직 실행 중인 단계가 없습니다.";
    return;
  }

  const total = state.guide.steps.length;
  const index = state.currentStepIndex ?? 0;
  const currentStep = state.guide.steps[index];

  stepBadge.textContent = `${index + 1} / ${total} 단계`;
  guideTitleEl.textContent = state.guide.guideTitle || "가이드";
  stepInstructionEl.textContent =
    currentStep?.instruction || "현재 단계 설명이 없습니다.";
}

async function loadSavedState() {
  const result = await chrome.runtime.sendMessage({
    type: "NEXSPOT_GET_STATE"
  });

  if (!result?.ok) {
    setStatus("상태를 불러오지 못했습니다.");
    return;
  }

  const state = result.state;

  if (state?.userRequest) {
    requestInput.value = state.userRequest;
  }

  renderState(state);

  if (!state?.guide) {
    setStatus("아직 생성된 넥스팟 가이드가 없습니다.");
    return;
  }

  setStatus(
    `저장된 가이드 복원됨\n` +
      `제목: ${state.guide?.guideTitle || "-"}\n` +
      `현재 단계: ${(state.currentStepIndex ?? 0) + 1}\n` +
      `마지막 페이지: ${state.lastUrl || "-"}`
  );
}

generateBtn.addEventListener("click", async () => {
  const userRequest = requestInput.value.trim();

  if (!userRequest) {
    setStatus("가이드 요청 문장을 입력해 주세요.");
    return;
  }

  setStatus("넥스팟 가이드를 생성 중...");

  const result = await chrome.runtime.sendMessage({
    type: "GENERATE_GUIDE",
    payload: { userRequest }
  });

  if (!result?.ok) {
    setStatus(`오류: ${result?.error || "알 수 없는 오류"}`);
    return;
  }

  renderState(result.state);

  setStatus(
    `넥스팟 가이드 생성 완료\n` +
      `제목: ${result.guide?.guideTitle}\n` +
      `현재 단계: 1 / ${result.guide?.steps?.length || 0}\n` +
      `현재 페이지에 넥스팟을 표시했어요.`
  );
});

resumeBtn.addEventListener("click", async () => {
  const result = await chrome.runtime.sendMessage({
    type: "NEXSPOT_RESUME_ON_CURRENT_PAGE"
  });

  if (!result?.ok) {
    setStatus(`오류: ${result?.error || "이어 실행 실패"}`);
    return;
  }

  renderState(result.state);

  setStatus(
    `현재 페이지에서 넥스팟 가이드를 이어 실행했어요.\n` +
      `현재 단계: ${(result.state.currentStepIndex ?? 0) + 1}`
  );
});

prevBtn.addEventListener("click", async () => {
  const result = await chrome.runtime.sendMessage({
    type: "NEXSPOT_PREV_STEP"
  });

  if (result?.ok) {
    renderState(result.state);
    setStatus(`이전 단계로 이동했어요. 현재 단계: ${(result.state.currentStepIndex ?? 0) + 1}`);
  }
});

nextBtn.addEventListener("click", async () => {
  const result = await chrome.runtime.sendMessage({
    type: "NEXSPOT_NEXT_STEP"
  });

  if (result?.ok) {
    renderState(result.state);
    setStatus(`다음 단계로 이동했어요. 현재 단계: ${(result.state.currentStepIndex ?? 0) + 1}`);
  }
});

clearBtn.addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "NEXSPOT_CLEAR" });
  renderState(null);
  setStatus("가이드를 닫았습니다.");
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "NEXSPOT_PANEL_STATE") {
    renderState(message.payload);
  }
});

loadSavedState();