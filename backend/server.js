import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * AI에게 전달할 시스템 프롬프트
 */
function buildSystemPrompt() {
  return `
너는 "넥스팟(NexSpot)"이라는 웹 UI 가이드 서비스의 안내 생성기다.
사용자의 질문을 보고 GitHub UI 기준으로 단계별 가이드를 생성해야 한다.

매우 중요:
- 반드시 순수 JSON만 출력한다. (마크다운 코드블록 금지)
- GitHub의 요소들을 영어 원문으로 정확히 타겟팅해라.
- 그 요소/단계가 무엇인지 서술하는 것은 한국어로 설명해라.

구조 예시:
{
  "blocked": false,
  "reason": null,
  "guideTitle": "string",
  "meta": {
    "source": "openai",
    "requestedTask": "string",
    "currentUrl": "string",
    "currentTitle": "string"
  },
  "steps": [
    {
      "id": "string",
      "instruction": "string",
      "action": {
        "type": "click_then_wait_dom | click_then_navigate | type | scroll"
      },
      "targetHints": {
        "selectors": ["string"],
        "texts": ["string"],
        "roles": ["string"]
      },
      "fallback": "string"
    }
  ]
}
Rules:
1. "blocked" must always be false for safe, general UI navigation requests.
2. "reason" must be null if "blocked" is false.
3. "guideTitle" should briefly summarize the user's intended task.
4. "meta.source" must always be "openai".
5. "steps" should contain approximately 1 to 8 steps.
6. "instruction" should be concise and beginner-friendly for GitHub users.
7. "selectors" should include 1 to 4 likely candidates commonly found in GitHub UI.
7.1. Avoid generic selectors like "button"; instead, specify identifiable attributes such as text content.
7.2. When clicking the profile menu (avatar), use the selector: "button[aria-haspopup='menu']".
7.3. When locating the GitHub global "+" (Create) button, use: "button[aria-labelledby*='global-create']".
7.4. When locating the top-left navigation button, use: "button[aria-haspopup='dialog']".
8. "texts" should include realistic labels that are likely to appear on actual buttons or menus.
9. "roles" should be specified as one of: button, link, textbox, radio, summary, input, menuitem, etc.
10. Actions such as delete, update settings, or create are allowed as long as they are part of UI navigation guidance.
11. Even if the user's request is not directly related to GitHub, assume GitHub as the MVP context and guide the closest relevant GitHub UI action.
12. Ensure the JSON format is always valid.
13. If the UI element is a toggle-type button, the action must be "click_then_wait_dom".
13.1. Most elements within navigation menus should use "click_then_wait_dom" as the action.
`;
}

// 규칙:
// 1. blocked는 안전한 일반 UI 탐색 요청이면 항상 false.
// 2. reason은 blocked가 false면 null.
// 3. guideTitle은 사용자가 하려는 작업을 짧게 요약.
// 4. meta.source는 반드시 "openai".
// 5. steps는 1~8개 정도.
// 6. GitHub 초보자도 이해할 수 있도록 instruction은 친절하고 짧게.
// 7. selectors는 가능한 GitHub에서 자주 등장할 법한 후보를 1~4개 작성.
// 7.1. 단순히 "button"이렇게만 쓰지 말고 어떤 텍스트를 포함하는지 구체적으로 작성해라. 
// 7.2. 프로필 메뉴(아바타), 프로필 아이콘은 클릭하는 경우 selectors는 "button[aria-haspopup='menu']"이다.
// 7.3. GitHub 오른쪽 상단의 + 버튼(Create 메뉴)을 찾는 단계인 경우 selectors의 selectors는 "button[aria-labelledby*='global-create']"이다.
// 7.4. 네비바의 왼쪽 상단을 찾는 경우 selectors는 "button[aria-haspopup='dialog']"이다.
// 8. texts는 실제 버튼/메뉴에 적힐 가능성이 높은 텍스트를 넣어라.
// 9. roles는 button, link, textbox, radio, summary, input, menuitem 등으로 작성.
// 10. 삭제, 설정 변경, 생성 같은 작업도 UI 탐색 안내 차원에서 허용한다.
// 11. 사용자의 질문이 GitHub와 직접 관련이 없어도, 현재 MVP 대상은 GitHub라고 가정하고 가장 가까운 GitHub UI 작업으로 안내해라.
// 12. JSON 유효성을 반드시 지켜라.
// 13. 토글 형식으로 되어있는 버튼이라면 action은 click_then_wait_dom이어야 한다. 
// 13.1. 네비바 내부의 요소들은 대부분 action이 click_then_wait_dom이다.

/**
 * OpenAI Structured Outputs용 JSON Schema
 */
async function generateGuideWithGroq({ userRequest, url, title }) {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5.4",
      messages: [
        { role: "system", content: buildSystemPrompt() },
        {
          role: "user",
          content: `사용자 요청: ${userRequest}\n현재 URL: ${url}\n페이지 제목: ${title}`
        }
      ],
      // JSON 모드 강제 (응답이 항상 JSON 형식이 되도록 함)
      response_format: { type: "json_object" },
      temperature: 0.2
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) throw new Error("OpenAI로부터 응답을 받지 못했습니다.");

    const parsed = JSON.parse(raw);

    // steps 방어적으로 정리
    const safeSteps = Array.isArray(parsed.steps) ? parsed.steps : [];

    // AI가 보낸 순서를 그대로 배열 기준으로 다시 고정하고,
    // id를 무조건 1부터 시작하는 정수로 재부여
    parsed.steps = safeSteps.map((step, index) => ({
      ...step,
      id: index + 1
    }));

    // 데이터 보정
    parsed.meta = {
      source: "openai",
      requestedTask: userRequest,
      currentUrl: url,
      currentTitle: title
    };

    return parsed;
  } catch (error) {
    console.error("AI Generation Error:", error);
    throw error;
  }
}




// 헬스 체크 엔드포인트
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

/**
 * 가이드 생성 API
 */
app.post("/api/guide", async (req, res) => {
  try {
    const { userRequest, url, title } = req.body;

    if (!userRequest) {
      return res.status(400).json({ error: "userRequest가 필요합니다." });
    }

    const guide = await generateGuideWithGroq({
      userRequest,
      url: url || "",
      title: title || ""
    });

    return res.json(guide);
  } catch (error) {
    return res.status(500).json({
      blocked: true,
      reason: error.message || "서버 내부 오류",
      steps: []
    });
  }
});

app.listen(port, () => {
  console.log(`🚀 NexSpot JS Server running on http://localhost:${port}`);
});
