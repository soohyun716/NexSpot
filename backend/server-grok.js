import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Groq from "groq-sdk";

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Groq 클라이언트 초기화
const groq = new Groq({
	apiKey: process.env.GROQ_API_KEY
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

규칙:
1. blocked는 안전한 일반 UI 탐색 요청이면 항상 false.
2. reason은 blocked가 false면 null.
3. guideTitle은 사용자가 하려는 작업을 짧게 요약.
4. meta.source는 반드시 "openai".
5. steps는 1~8개 정도.
6. GitHub 초보자도 이해할 수 있도록 instruction은 친절하고 짧게.
7. selectors는 가능한 GitHub에서 자주 등장할 법한 후보를 1~4개 작성.
7.1. 단순히 "button"이렇게만 쓰지 말고 어떤 텍스트를 포함하는지 구체적으로 작성해라. 
7.2. 프로필 메뉴(아바타), 프로필 아이콘은 클릭하는 경우 selectors는 "button[aria-haspopup='menu']"이다.
7.3. GitHub 오른쪽 상단의 + 버튼(Create 메뉴)을 찾는 단계인 경우 selectors의 selectors는 "button[aria-labelledby*='global-create']"이다.
7.4. 네비바의 왼쪽 상단을 찾는 경우 selectors는 "button[aria-haspopup='dialog']"이다.
8. texts는 실제 버튼/메뉴에 적힐 가능성이 높은 텍스트를 넣어라.
9. roles는 button, link, textbox, radio, summary, input, menuitem 등으로 작성.
10. 삭제, 설정 변경, 생성 같은 작업도 UI 탐색 안내 차원에서 허용한다.
11. 사용자의 질문이 GitHub와 직접 관련이 없어도, 현재 MVP 대상은 GitHub라고 가정하고 가장 가까운 GitHub UI 작업으로 안내해라.
12. JSON 유효성을 반드시 지켜라.
13. 토글 형식으로 되어있는 버튼이라면 action은 click_then_wait_dom이어야 한다. 
13.1. 네비바 내부의 요소들은 대부분 action이 click_then_wait_dom이다.
`;
}

// 너는 "노션(Notion) 입문자용 UI 가이드" 생성기다. 
// 노션의 복잡한 블록 구조와 워크스페이스 내비게이션을 기반으로 단계별 JSON 가이드를 생성해야 한다.

// [매우 중요 규칙]
// 1. 노션은 대부분 div 구조이므로, placeholder 텍스트나 aria-label을 최우선으로 탐색해라.
// 2. '블록 추가'는 무조건 '/' 명령어나 '+' 버튼을 언급해야 한다.
// 3. 사이드바의 '새 페이지', 상단 우측의 '공유', '댓글' 등의 위치를 정확히 알고 있어야 한다.

// [targetHints 작성 가이드]
// - 페이지 제목 입력: selectors에 "div[placeholder='Untitled']", "div.notion-page-controls + div" 포함.
// - 왼쪽 사이드바 새 페이지: selectors에 "div[role='button']:has(span:contains('New page'))", texts에 ["New page"] 포함.
// - 블록 메뉴(여섯 점 아이콘): selectors에 ".notion-block-extras-button", roles에 ["button"].
// - 상단 점 세 개 메뉴(More): selectors에 ".notion-topbar-more-button".

// [응답 JSON 구조]
// {
//   "blocked": false,
//   "guideTitle": "노션 작업 안내",
//   "steps": [
//     {
//       "id": "notion_step_1",
//       "instruction": "왼쪽 사이드바 하단의 '+ New page'를 클릭하여 새 페이지를 만드세요.",
//       "action": { "type": "click_then_wait_dom" },
//       "targetHints": {
//         "selectors": [".notion-sidebar-new-page-button", "[role='button']"],
//         "texts": ["New page", "새 페이지"],
//         "roles": ["button"]
//       },
//       "fallback": "사이드바에서 '새 페이지' 버튼을 찾으세요."
//     }
//   ]
// }
// `;
// }

// 너는 "넥스팟(NexSpot)"이라는 Figma 전문 웹 UI 가이드" 생성기다. 
// Figma는 일반 웹과 달리 Canvas 기반이므로, HTML 요소가 아닌 '레이어 이름'과 '기능적 역할'을 기반으로 안내해야 한다.

// [매우 중요 규칙]
// 1. 반드시 순수 JSON만 출력한다.
// 2. Figma 인터페이스(좌측 레이어 패널, 상단 툴바, 우측 프로퍼티 패널, 중앙 캔버스)를 완벽히 이해하고 있어야 한다.
// 3. targetHints의 selectors에는 Figma 특유의 데이터 속성(예: [data-testid='...'])이나 역할 기반 셀렉터를 제안해라.
// 4. Figma 초보자가 길을 잃지 않도록 아주 구체적인 위치(예: "우측 사이드바 상단의 'Design' 탭")를 언급해라.

// [응답 JSON 구조 예시]
// {
//   "blocked": false,
//   "guideTitle": "Figma 작업 가이드",
//   "steps": [
//     {
//       "id": "figma_step_1",
//       "instruction": "상단 툴바에서 'Rectangle' 도구(단축키 R)를 클릭하세요.",
//       "action": { "type": "click_then_wait_dom" },
//       "targetHints": {
//         "selectors": ["button[aria-label='Rectangle']", "[data-testid='toolbar-rectangle']"],
//         "texts": ["Rectangle", "R"],
//         "roles": ["button"]
//       },
//       "fallback": "상단 툴바의 네모 모양 아이콘을 찾으세요."
//     }
//   ]
// }

// [Figma 주요 요소 가이드]
// - 좌측 상단 메인 메뉴: "button[aria-label='Main menu']"
// - 우측 공유 버튼: "button:contains('Share')"
// - 레이어 패널 검색: "input[placeholder='Search layers']"
// - 프로퍼티 패널 수치 입력: "input[aria-label='W'], input[aria-label='H']"
// `;
// }



/**
 * Groq API 호출 로직
 */
async function generateGuideWithGroq({ userRequest, url, title }) {
	try {
		const completion = await groq.chat.completions.create({
			model: "llama-3.3-70b-versatile",
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
		if (!raw) throw new Error("Groq로부터 응답을 받지 못했습니다.");

		const parsed = JSON.parse(raw);

		// 데이터 보정 (필요한 경우)
		parsed.meta = {
			source: "groq",
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