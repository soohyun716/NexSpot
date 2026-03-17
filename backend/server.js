// import express from "express";
// import cors from "cors";
// import dotenv from "dotenv";

// dotenv.config();

// const app = express();
// const port = process.env.PORT || 4000;

// app.use(cors());
// app.use(express.json());

// app.get("/health", (_, res) => {
// 	res.json({ ok: true });
// });

// app.post("/api/guide", async (req, res) => {
// 	const { userRequest, url, title } = req.body ?? {};

// 	const dummyGuide = {
// 		blocked: false,
// 		reason: null,
// 		guideTitle: "GitHub fine-grained personal access token 발급 가이드 (Dummy)",
// 		meta: {
// 			source: "dummy",
// 			requestedTask: userRequest || "GitHub 토큰 발급 방법",
// 			currentUrl: url || "",
// 			currentTitle: title || ""
// 		},
// 		steps: [
// 			{
// 				id: "open-profile-menu",
// 				instruction:
// 					"GitHub 우측 상단의 프로필 메뉴(아바타)를 찾으세요.",
// 				action: {
// 					type: "click_then_wait_dom"
// 				},
// 				targetHints: {
// 					selectors: [
// 						"summary[aria-labelledby*='user']",
// 						"summary[aria-label*='navigation']",
// 						"button[aria-haspopup='menu']",
// 						"img.avatar",

// 					],
// 					texts: [
// 						"Open user navigation menu",
// 						"View profile and more",
// 						"profile"
// 					],
// 					roles: ["button", "summary"]
// 				},
// 				fallback:
// 					"현재 페이지 우측 상단의 프로필 이미지나 사용자 메뉴를 직접 클릭하세요."
// 			},
// 			{
// 				id: "go-to-settings",
// 				instruction:
// 					"프로필 메뉴 안에서 Settings 항목을 찾으세요.",
// 				action: {
// 					type: "click_then_navigate"
// 				},
// 				targetHints: {
// 					selectors: [
// 						"a[href*='/settings']",
// 						"a",
// 						"button"
// 					],
// 					texts: [
// 						"Settings",
// 						"설정"
// 					],
// 					roles: ["link", "button", "a"]
// 				},
// 				fallback:
// 					"프로필 메뉴를 연 뒤 Settings를 클릭하세요."
// 			},
// 			{
// 				id: "open-developer-settings",
// 				instruction:
// 					"왼쪽 메뉴에서 Developer settings를 찾으세요.",
// 				action: {
// 					type: "click_then_navigate"
// 				},
// 				targetHints: {
// 					selectors: [
// 						"a[href*='developer_settings']",
// 						"a"
// 					],
// 					texts: [
// 						"Developer settings"
// 					],
// 					roles: ["link", "a"]
// 				},
// 				fallback:
// 					"설정 페이지 왼쪽 하단 근처에서 Developer settings를 찾으세요."
// 			},
// 			{
// 				id: "open-fine-grained-pats",
// 				instruction:
// 					"Personal access tokens 메뉴를 연 뒤 Fine-grained tokens 항목을 찾으세요.",
// 				action: {
// 					type: "click_then_wait_dom"
// 				},
// 				targetHints: {
// 					selectors: [
// 						"a[href*='personal-access-tokens']",
// 						"a[href*='fine_grained']",
// 						"a"
// 					],
// 					texts: [
// 						"Personal access tokens",
// 						"Fine-grained tokens",
// 						"Fine-grained personal access tokens"
// 					],
// 					roles: ["link", "a"]
// 				},
// 				fallback:
// 					"Developer settings 안에서 Personal access tokens → Fine-grained tokens로 이동하세요."
// 			},
// 			{
// 				id: "generate-new-token",
// 				instruction:
// 					"Generate new token 또는 비슷한 새 토큰 생성 버튼을 찾으세요.",
// 				action: {
// 					type: "click_then_navigate"
// 				},
// 				targetHints: {
// 					selectors: [
// 						"a[href*='new']",
// 						"button",
// 						"a"
// 					],
// 					texts: [
// 						"Generate new token",
// 						"Generate new token (fine-grained)",
// 						"New token",
// 						"Generate token"
// 					],
// 					roles: ["button", "link", "a"]
// 				},
// 				fallback:
// 					"Fine-grained tokens 페이지에서 새 토큰 생성 버튼을 클릭하세요."
// 			},
// 			{
// 				id: "fill-token-form",
// 				instruction:
// 					"토큰 이름, 만료일, 리소스 소유자, 저장소 접근 범위, 권한을 설정하세요. 필요한 최소 권한만 선택하세요.",
// 				action: {
// 					type: "click_then_navigate"
// 				},
// 				targetHints: {
// 					selectors: [
// 						"input[name*='name']",
// 						"input",
// 						"select",
// 						"textarea",
// 						"label"
// 					],
// 					texts: [
// 						"Token name",
// 						"Expiration",
// 						"Resource owner",
// 						"Repository access",
// 						"Permissions"
// 					],
// 					roles: ["textbox", "combobox", "input", "select"]
// 				},
// 				fallback:
// 					"양식에서 이름과 권한을 직접 입력하세요. 최소 권한 원칙으로 설정하세요."
// 			},
// 			{
// 				id: "create-token",
// 				instruction:
// 					"마지막으로 Generate token 버튼을 클릭하세요.",
// 				action: {
// 					type: "click_then_navigate"
// 				},
// 				targetHints: {
// 					selectors: [
// 						"button",
// 						"input[type='submit']"
// 					],
// 					texts: [
// 						"Generate token",
// 						"Create token"
// 					],
// 					roles: ["button", "submit"]
// 				},
// 				fallback:
// 					"폼 하단의 Generate token 버튼을 클릭하세요."
// 			},
// 			{
// 				id: "stop-before-reading-secret",
// 				instruction:
// 					"토큰이 생성되면 SmartSpot은 값을 읽거나 저장하지 않습니다. 화면에 표시된 토큰은 직접 복사해 안전한 곳에 저장하세요.",
// 				action: {
// 					type: "click_then_navigate"
// 				},
// 				targetHints: {
// 					selectors: [],
// 					texts: [],
// 					roles: []
// 				},
// 				fallback:
// 					"민감 정보 보호를 위해 SmartSpot은 생성된 토큰 문자열을 읽지 않습니다."
// 			}
// 		]
// 	};

// 	res.json(dummyGuide);
// });

// app.listen(port, () => {
// 	console.log(`SmartSpot dummy backend running on http://localhost:${port}`);
// });

// import express from "express";
// import cors from "cors";
// import dotenv from "dotenv";

// dotenv.config();

// const app = express();
// const port = process.env.PORT || 4000;

// app.use(cors());
// app.use(express.json());

// app.get("/health", (_, res) => {
// 	res.json({ ok: true });
// });

// app.post("/api/guide", async (req, res) => {
// 	const { userRequest, url, title } = req.body ?? {};

// 	const dummyGuide = {
// 		blocked: false,
// 		reason: null,
// 		guideTitle: "GitHub에서 새 레포지토리 생성하고 삭제하기",
// 		meta: {
// 			source: "dummy",
// 			requestedTask: userRequest || "GitHub 레포지토리 생성 및 삭제",
// 			currentUrl: url || "",
// 			currentTitle: title || ""
// 		},

// 		steps: [
// 			{
// 				id: "open-create-menu",
// 				instruction:
// 					"GitHub 오른쪽 상단의 + 버튼(Create 메뉴)을 찾으세요.",
// 				action: {
// 					type: "click_then_wait_dom"
// 				},
// 				targetHints: {
// 					selectors: [
// 						// "summary[aria-label*='create']",
// 						"button[aria-labelledby*='global-create']",
// 						"summary",
// 						"button"
// 					],

// 					texts: [
// 						"New repository",
// 						"새 저장소"
// 					],
// 					roles: ["button", "summary"]
// 				},
// 				fallback:
// 					"GitHub 오른쪽 상단의 + 버튼을 클릭하세요."
// 			},

// 			{
// 				id: "click-new-repository",
// 				instruction:
// 					"메뉴에서 'New repository'를 선택하세요.",
// 				action: {
// 					type: "click_then_navigate"
// 				},
// 				targetHints: {
// 					selectors: [
// 						"a[href*='repositories/new']",
// 						"a",
// 						"button"
// 					],
// 					texts: [
// 						"New repository",
// 						"새 저장소"
// 					],
// 					roles: ["link", "menuitem"]
// 				},
// 				fallback:
// 					"Create 메뉴에서 'New repository'를 클릭하세요."
// 			},

// 			{
// 				id: "enter-repository-name",
// 				instruction:
// 					"Repository name 입력칸에 원하는 레포지토리 이름을 입력하세요.",
// 				action: {
// 					type: "click_then_navigate"
// 				},
// 				targetHints: {
// 					selectors: [
// 						"input[name='repository[name]']",
// 						"input[name='repository_name']",
// 						"input"
// 					],
// 					texts: [
// 						"Repository name",
// 						"저장소 이름"
// 					],
// 					roles: ["textbox", "input"]
// 				},
// 				fallback:
// 					"레포지토리 이름 입력칸에 이름을 입력하세요."
// 			},

// 			{
// 				id: "choose-visibility",
// 				instruction:
// 					"레포지토리를 Public 또는 Private 중 하나로 설정하세요.",
// 				action: {
// 					type: "click_then_navigate"
// 				},
// 				targetHints: {
// 					selectors: [
// 						"input[value='public']",
// 						"input[value='private']",
// 						"input[type='radio']"
// 					],
// 					texts: [
// 						"Public",
// 						"Private"
// 					],
// 					roles: ["radio"]
// 				},
// 				fallback:
// 					"Public 또는 Private 옵션 중 하나를 선택하세요."
// 			},

// 			{
// 				id: "create-repository",
// 				instruction:
// 					"'Create repository' 버튼을 눌러 레포지토리를 생성하세요.",
// 					action: {
// 						type: "click_then_navigate"
// 					},
// 				targetHints: {
// 					selectors: [
// 						"button",
// 						"input[type='submit']"
// 					],
// 					texts: [
// 						"Create repository",
// 						"저장소 생성"
// 					],
// 					roles: ["button", "submit"]
// 				},
// 				fallback:
// 					"페이지 아래쪽의 Create repository 버튼을 클릭하세요."
// 			},

// 			{
// 				id: "open-settings",
// 				instruction:
// 					"레포지토리가 생성되면 상단 메뉴에서 'Settings' 탭을 찾으세요.",
// 					action: {
// 						type: "click_then_navigate"
// 					},
// 				targetHints: {
// 					selectors: [
// 						"a[href*='/settings']",
// 						"a"
// 					],
// 					texts: [
// 						"Settings"
// 					],
// 					roles: ["link"]
// 				},
// 				fallback:
// 					"레포지토리 페이지 상단의 Settings 메뉴를 클릭하세요."
// 			},

// 			{
// 				id: "scroll-danger-zone",
// 				instruction:
// 					"페이지 아래쪽의 'Danger Zone' 영역을 찾으세요.",
// 					action: {
// 						type: "click_then_navigate"
// 					},
// 				targetHints: {
// 					selectors: [
// 						"button",
// 						"section",
// 						"div"
// 					],
// 					texts: [
// 						"Danger Zone",
// 						"Delete this repository"
// 					],
// 					roles: ["button"]
// 				},
// 				fallback:
// 					"Settings 페이지 아래쪽으로 스크롤해 Danger Zone 영역을 찾으세요."
// 			},

// 			{
// 				id: "delete-repository",
// 				instruction:
// 					"'Delete this repository' 버튼을 클릭하세요.",
// 					action: {
// 						type: "click_then_navigate"
// 					},
// 				targetHints: {
// 					selectors: [
// 						"button",
// 						"a",
// 						"button[aria-labelledby*='Delete']",
// 					],
// 					texts: [
// 						"Delete this repository",
// 						"Delete repository"
// 					],
// 					roles: ["button"]
// 				},
// 				fallback:
// 					"Danger Zone에서 Delete this repository 버튼을 클릭하세요."
// 			},

// 			{
// 				id: "confirm-delete",
// 				instruction:
// 					"확인을 위해 레포지토리 이름을 입력한 뒤 삭제를 완료하세요.",
// 					action: {
// 						type: "click_then_navigate"
// 					},
// 				targetHints: {
// 					selectors: [
// 						"input",
// 						"button"
// 					],
// 					texts: [
// 						"Confirm",
// 						"Delete"
// 					],
// 					roles: ["textbox", "button"]
// 				},
// 				fallback:
// 					"삭제 확인 창에서 레포지토리 이름을 입력하고 삭제 버튼을 누르세요."
// 			}
// 		]
// 	};

// 	res.json(dummyGuide);
// });

// app.listen(port, () => {
// 	console.log(`SmartSpot dummy backend running on http://localhost:${port}`);
// });

// import express from "express";
// import cors from "cors";
// import dotenv from "dotenv";

// dotenv.config();

// const app = express();
// const port = process.env.PORT || 4000;

// app.use(cors());
// app.use(express.json());

// app.get("/health", (_, res) => {
// 	res.json({ ok: true });
// });
// app.post("/api/guide", async (req, res) => {
// 	const { userRequest, url, title } = req.body ?? {};

// 	const dummyGuide = {
// 		blocked: false,
// 		reason: null,
// 		guideTitle: "GitHub에서 새 레포지토리 생성하고 삭제하기",
// 		meta: {
// 			source: "dummy",
// 			requestedTask: userRequest || "GitHub 레포지토리 생성 및 삭제",
// 			currentUrl: url || "",
// 			currentTitle: title || ""
// 		},


// 		steps: [
// 			{
// 				id: "open-github-settings",
// 				instruction:
// 					"GitHub 오른쪽 상단의 프로필 아이콘을 클릭한 뒤 'Settings' 메뉴를 찾으세요.",
// 				action: {
// 					type: "click_then_wait_dom"
// 				},
// 				targetHints: {
// 					selectors: [
// 						"summary[aria-labelledby*='user']",
// 						"summary[aria-label*='navigation']",
// 						"button[aria-haspopup='menu']",
// 						"img.avatar",

// 					],
// 					texts: [
// 						"Open user navigation menu",
// 						"View profile and more",
// 						"profile"
// 					],
// 					roles: ["button", "summary"]

// 				},
// 				fallback:
// 					"프로필 메뉴에서 Settings를 클릭하세요."
// 			},

// 			{
// 				id: "open-ssh-menu",
// 				instruction:
// 					"왼쪽 메뉴에서 'SSH and GPG keys' 항목을 찾으세요.",
// 				action: {
// 					type: "click_then_navigate"
// 				},
// 				targetHints: {
// 					selectors: [
// 						"a[href*='settings/keys']",
// 						"a"
// 					],
// 					texts: [
// 						"SSH and GPG keys",
// 						"SSH keys"
// 					],
// 					roles: ["link"]
// 				},
// 				fallback:
// 					"Settings 화면에서 SSH and GPG keys 메뉴를 클릭하세요."
// 			},

// 			{
// 				id: "click-new-ssh-key",
// 				instruction:
// 					"'New SSH key' 버튼을 클릭하세요.",
// 				action: {
// 					type: "click_then_navigate"
// 				},
// 				targetHints: {
// 					selectors: [
// 						"a[href*='settings/keys/new']",
// 						"button",
// 						"a"
// 					],
// 					texts: [
// 						"New SSH key",
// 						"Add SSH key"
// 					],
// 					roles: ["button", "link"]
// 				},
// 				fallback:
// 					"New SSH key 버튼을 클릭하세요."
// 			},

// 			{
// 				id: "enter-title",
// 				instruction:
// 					"Title 입력칸에 키 이름을 입력하세요. 예: 'My Laptop'.",
// 				action: {
// 					type: "click_then_navigate"
// 				},
// 				targetHints: {
// 					selectors: [
// 						"input[name='title']",
// 						"input"
// 					],
// 					texts: [
// 						"Title"
// 					],
// 					roles: ["textbox"]
// 				},
// 				fallback:
// 					"Title 입력칸에 키 이름을 입력하세요."
// 			},

// 			{
// 				id: "enter-key",
// 				instruction:
// 					"Key 입력칸에 생성한 SSH 공개 키를 붙여넣으세요.",
// 				action: {
// 					type: "click_then_navigate"
// 				},
// 				targetHints: {
// 					selectors: [
// 						"textarea[name='key']",
// 						"textarea"
// 					],
// 					texts: [
// 						"Key",
// 						"SSH key"
// 					],
// 					roles: ["textbox"]
// 				},
// 				fallback:
// 					"SSH 공개 키를 입력칸에 붙여넣으세요."
// 			},

// 			{
// 				id: "submit-key",
// 				instruction:
// 					"'Add SSH key' 버튼을 눌러 등록을 완료하세요.",
// 				action: {
// 					type: "click_then_navigate"
// 				},
// 				targetHints: {
// 					selectors: [
// 						"button[type='submit']",
// 						"button"
// 					],
// 					texts: [
// 						"Add SSH key",
// 						"Add key"
// 					],
// 					roles: ["button"]
// 				},
// 				fallback:
// 					"Add SSH key 버튼을 눌러 등록하세요."
// 			}
// 		]
// 	};

// 	res.json(dummyGuide);
// });
// app.listen(port, () => {
// 	console.log(`SmartSpot dummy backend running on http://localhost:${port}`);
// });

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const client = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY
});

/**
 * 응답 스키마를 최대한 엄격하게 고정
 * - 네가 기존에 쓰던 dummyGuide 형식 유지
 * - Structured Outputs 용 JSON Schema
 */
const guideJsonSchema = {
	name: "nexspot_guide",
	schema: {
		type: "object",
		additionalProperties: false,
		properties: {
			blocked: { type: "boolean" },
			reason: {
				anyOf: [{ type: "string" }, { type: "null" }]
			},
			guideTitle: { type: "string" },
			meta: {
				type: "object",
				additionalProperties: false,
				properties: {
					source: { type: "string" },
					requestedTask: { type: "string" },
					currentUrl: { type: "string" },
					currentTitle: { type: "string" }
				},
				required: ["source", "requestedTask", "currentUrl", "currentTitle"]
			},
			steps: {
				type: "array",
				items: {
					type: "object",
					additionalProperties: false,
					properties: {
						id: { type: "string" },
						instruction: { type: "string" },
						action: {
							type: "object",
							additionalProperties: false,
							properties: {
								type: {
									type: "string",
									enum: [
										"click_then_wait_dom",
										"click_then_navigate",
										"type",
										"scroll"
									]
								}
							},
							required: ["type"]
						},
						targetHints: {
							type: "object",
							additionalProperties: false,
							properties: {
								selectors: {
									type: "array",
									items: { type: "string" }
								},
								texts: {
									type: "array",
									items: { type: "string" }
								},
								roles: {
									type: "array",
									items: { type: "string" }
								}
							},
							required: ["selectors", "texts", "roles"]
						},
						fallback: { type: "string" }
					},
					required: [
						"id",
						"instruction",
						"action",
						"targetHints",
						"fallback"
					]
				}
			}
		},
		required: ["blocked", "reason", "guideTitle", "meta", "steps"]
	},
	strict: true
};

function buildSystemPrompt() {
	return `
너는 "넥스팟(NexSpot)"이라는 웹 UI 가이드 서비스의 안내 생성기다.
사용자의 질문을 보고 GitHub UI 기준으로 단계별 가이드를 생성해야 한다.

매우 중요:
- 반드시 JSON만 출력한다.
- 마크다운 금지
- 코드블록 금지
- 설명 문장 금지
- JSON 앞뒤에 어떤 텍스트도 붙이지 마라

반드시 아래 구조를 정확히 따라라:

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

function buildUserPrompt({ userRequest, url, title }) {
	return `
사용자 요청: ${userRequest || ""}
현재 URL: ${url || ""}
현재 페이지 제목: ${title || ""}

이 요청을 GitHub UI 단계별 가이드로 변환해라.
`;
}

/**
 * OpenAI Responses API 호출
 * Structured Outputs 사용
 */
async function generateGuideWithOpenAI({ userRequest, url, title }) {
	const response = await client.responses.create({
		model: process.env.OPENAI_MODEL || "gpt-5-mini",
		input: [
			{
				role: "system",
				content: buildSystemPrompt()
			},
			{
				role: "user",
				content: buildUserPrompt({ userRequest, url, title })
			}
		],
		text: {
			format: {
				type: "json_schema",
				name: guideJsonSchema.name,
				schema: guideJsonSchema.schema,
				strict: true
			}
		}
	});

	// Structured Outputs면 output_text가 JSON 문자열로 옴
	const raw = response.output_text?.trim();

	if (!raw) {
		throw new Error("OpenAI returned empty output_text");
	}

	const parsed = JSON.parse(raw);

	// meta 값 보정
	parsed.meta = {
		source: "openai",
		requestedTask: userRequest || "",
		currentUrl: url || "",
		currentTitle: title || ""
	};

	return parsed;
}

app.get("/health", (_, res) => {
	res.json({ ok: true });
});

app.post("/api/guide", async (req, res) => {
	try {
		const { userRequest, url, title } = req.body ?? {};

		if (!userRequest || !String(userRequest).trim()) {
			return res.status(400).json({
				blocked: true,
				reason: "userRequest is required",
				guideTitle: "",
				meta: {
					source: "server",
					requestedTask: "",
					currentUrl: url || "",
					currentTitle: title || ""
				},
				steps: []
			});
		}

		const guide = await generateGuideWithOpenAI({
			userRequest: String(userRequest).trim(),
			url: url || "",
			title: title || ""
		});

		return res.json(guide);
	} catch (error) {
		console.error("Guide generation error:", error);

		return res.status(500).json({
			blocked: true,
			reason: error?.message || "guide generation failed",
			guideTitle: "",
			meta: {
				source: "server",
				requestedTask: req.body?.userRequest || "",
				currentUrl: req.body?.url || "",
				currentTitle: req.body?.title || ""
			},
			steps: []
		});
	}
});

app.listen(port, () => {
	console.log(`NexSpot backend running on http://localhost:${port}`);
});