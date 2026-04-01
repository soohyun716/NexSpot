# 🚀 NexSpot  
### AI 기반 웹 UI 가이드 Chrome Extension

<br/>

## 프로젝트 소개

복잡한 웹 서비스에서 사용자가 원하는 작업을 입력하면 AI가 사용자의 자연어 요청을 이해하고, 이를 실제 행동 가능한 단계로 변환하여 웹 화면 위에서 spot의 형태로 직접 안내합니다. 

GitHub, Notion, Figma와 같이 진입 장벽이 높은 서비스에서도  
사용자는 AI의 Next spot 즉, "넥스팟"을 따라가며 작업을 쉽게 수행할 수 있습니다.

<br/>

## 프로젝트 목적

- AI를 활용하여 "검색 → 이해 → 실행"의 과정을 하나로 통합  
- 복잡한 웹 UI에서 발생하는 사용자 학습 비용 최소화  
- 사용자 행동을 직접 유도하는 AI 기반 인터페이스 구현  

<br/>

## 주요 기능

- 자연어 기반 사용자 요청 해석 (AI)  
- 요청을 단계별 행동으로 변환하는 가이드 생성  
- 웹 요소 자동 탐지 및 하이라이트  
- 단계별 가이드 진행 및 상태 관리  
- 사용자 행동(클릭/이동)에 따른 흐름 제어  

<br/>

## 입출력 흐름

```
[사용자 입력]
"깃허브에서 레포지토리 만드는 법 알려줘"

        ↓

[AI 가이드 생성]
- 사용자 요청 해석
- 단계별 행동 흐름 생성

        ↓

[백엔드 API (/api/guide)]
- 가이드 데이터 반환 (step, selector)

        ↓

[Chrome Extension]
- DOM 요소 탐색 및 매칭
- 해당 요소 하이라이트

        ↓

[사용자 인터랙션]
- 클릭 및 페이지 이동 감지
- 다음 단계 자동 진행
```

<br/>

## 적용 가능 서비스

현재 높은 정확도로 동작하는 웹 서비스

- GitHub  

개선이 필요한 서비스

- Notion (동적 DOM 구조로 인해 selector 안정성 개선 필요)  
- Figma (Canvas 기반 UI로 인해 요소 탐지 방식 개선 필요)  


<br/>

## 기술 스택

Frontend (Extension)  
- JavaScript / TypeScript  
- Chrome Extension (Manifest V3)  
- DOM API  

Backend  
- Node.js (Express)  
- OpenAI API  

AI  
- 사용자 요청 기반 가이드 생성  
- 자연어 → 행동 흐름 변환  

기타  
- Overlay UI 기반 인터랙션 레이어  
- chrome.storage / runtime messaging  

<br/>

## 기술적 도전 과제

- 자연어 요청을 실제 행동 가능한 단계로 변환하는 AI 설계  
- 동적 웹 환경에서 정확한 요소 탐지  
- 다양한 UI 구조에 대응하는 범용 가이드 생성  
- 사용자 행동 기반 상태 관리  
- 민감 정보 입력 필드 필터링  



## 성과

AI를 단순한 정보 제공 도구가 아닌,  
사용자의 행동을 직접 유도하는 인터페이스로 구현했습니다.  

사용자 테스트를 통해 복잡한 웹 서비스도  
튜토리얼처럼 쉽게 사용할 수 있다는 피드백을 확인했습니다.

---

## 설치 방법 (Chrome Extension)

1. 프로젝트 클론

```bash
git clone https://github.com/your-repo/nexspot.git
```

2. 크롬 확장 프로그램 페이지 이동  
chrome://extensions  

3. 개발자 모드 활성화  

4. “압축해제된 확장 프로그램을 로드” 클릭  

5. NexSpot 폴더 선택  

---

## 백엔드 실행 방법

```bash
cd backend
npm install
node server.js
```

실행 후 아래 주소 접속

```
http://localhost:4000/health
```

정상 실행 시 `{ ok: true }` 반환

---

## Demo

https://youtu.be/1AScf0QpCyU

---

## 향후 개선 방향

- AI 기반 element matching 정확도 향상  
- 사용자 행동 데이터 기반 개인화 가이드  
- Notion, Figma 대응을 위한 구조 개선  
- 다양한 플랫폼 확장  

---


## 핵심 요약

AI가 사용자의 행동을 직접 안내하는 웹 인터페이스 구현
