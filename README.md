# claude-api-pjt (Smart Fridge App)

냉장고 내부 사진을 업로드하면 비전-언어 모델(VLM)이 식재료를 인식하고, 인식된 재료를 바탕으로 레시피를 추천해주는 웹 앱입니다.

## 주요 기능

1. **식재료 인식** — 냉장고 사진을 업로드하면 OpenRouter의 비전-언어 모델이 사진 속 식재료 목록을 추출합니다.
2. **레시피 추천** — 인식된 식재료를 최대한 활용하는 레시피 2~3개를 생성합니다. (부족한 재료는 `additional_ingredients`로 안내)

자세한 기능 명세는 [`docs/PRD_01.md`](docs/PRD_01.md)(이미지 인식), [`docs/PRD_02.md`](docs/PRD_02.md)(레시피 생성), [`docs/PRD_03.md`](docs/PRD_03.md)(사용자 프로필/저장, 향후 예정)를 참고하세요.

## 기술 스택

- **Backend**: Node.js, Express
- **Frontend**: Vanilla HTML/CSS/JavaScript
- **AI**: [OpenRouter](https://openrouter.ai) Chat Completions API (`nvidia/nemotron-nano-12b-v2-vl:free`)

## 프로젝트 구조

```
.
├── public/              # 프론트엔드 정적 파일
│   ├── index.html
│   ├── app.js
│   └── style.css
├── server/
│   ├── index.js         # Express 앱 진입점
│   ├── config.js        # 환경 변수 로드/검증
│   ├── routes/
│   │   ├── recognize.js # POST /api/recognize
│   │   └── recipes.js   # POST /api/recipes
│   └── services/
│       └── openrouter.js # OpenRouter API 호출 로직
└── docs/                # PRD 문서
```

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.example`을 복사하여 `.env` 파일을 만들고 OpenRouter API 키를 입력합니다.

```bash
cp .env.example .env
```

```
OPENROUTER_API_KEY=your_key_here
```

### 3. 서버 실행

```bash
npm run dev   # 개발 모드 (파일 변경 시 자동 재시작)
# 또는
npm start
```

기본적으로 `http://localhost:3000`에서 앱이 실행됩니다.

## API

### `POST /api/recognize`

```json
// 요청
{ "image": "data:image/jpeg;base64,..." }

// 응답
{
  "items": ["계란", "우유", "양파"],
  "raw_model_response": "...",
  "model": "nvidia/nemotron-nano-12b-v2-vl:free"
}
```

### `POST /api/recipes`

```json
// 요청
{ "items": ["계란", "우유", "양파"], "preferences": { "servings": 2, "exclude": ["매운맛"] } }

// 응답
{
  "recipes": [
    {
      "title": "계란 양파볶음",
      "used_ingredients": ["계란", "양파"],
      "additional_ingredients": ["소금", "식용유"],
      "steps": ["1. ...", "2. ..."],
      "estimated_time_minutes": 10
    }
  ],
  "raw_model_response": "...",
  "model": "nvidia/nemotron-nano-12b-v2-vl:free"
}
```

## 참고

- `.env`는 `.gitignore`에 포함되어 있으며 절대 커밋하지 않습니다.
- OpenRouter 무료 티어 모델은 사전 공지 없이 변경/중단될 수 있습니다. 문제가 발생하면 `GET https://openrouter.ai/api/v1/models`로 사용 가능한 모델을 재확인하세요.
