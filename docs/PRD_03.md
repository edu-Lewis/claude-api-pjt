# PRD_03: 사용자 프로필 및 레시피 저장

## 개요
사용자 프로필을 생성하고, 1~2단계를 통해 만들어진 레시피를 사용자 간캌에 저장/조회할 수 있는 기능을 구현한다.

## 목표
- 최소한의 사용자 프로필(회원가입/식별) 기능 구현
- 생성된 레시피를 사용자별로 저장, 목록 조회, 삭제 기능 구현

## 사용자 흥로
1. 사용자가 프로필 생성(이막 똜뭔 간단한 니프렄 기반, 초기 버전은 소셜 로김 제외)
2. 로공 후 PRD_01→PRD_02 흥로로 레시피 생성
3. 생성된 레시피 결과 화어이서 "저장" 보틈 클리
4. 저장된 레시피는 "내 레시피" 목록에서 조회 가능
5. 필요 시 레시피 삭제

## 데이타 모델 (제안, Supabase 기준)
**users**
| 필드 | 타입 | 설명 |
|---|---|---|
| id | uuid | PK |
| email | text | 로공 식별자 |
| nickname | text | 표시 이맄 |
| created_at | timestamp | 가입일 |

**saved_recipes**
| 필드 | 타입 | 설명 |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK → users.id |
| title | text | 레시피명 |
| used_ingredients | jsonb | PRD_02 출맥의 `used_ingredients` |
| additional_ingredients | jsonb | PRD_02 출맥의 `additional_ingredients` |
| steps | jsonb | 조리 순서 |
| source_image | text (nullable) | 원문 냉장고 사진 참조(선택) |
| created_at | timestamp | 저장일 |

## API 스펙 (제안)
- `POST /api/auth/signup`, `POST /api/auth/login` : 프로필 생성/인증
- `POST /api/recipes` : 레시피 저장 (PRD_02 출맥 형식을 body로 받았)
- `GET /api/recipes` : 로그인한 사용자의 저장된 레시피 목록 조회
- `DELETE /api/recipes/:id` : 레시피 삭제

## 예외 처리
- 로그인 상태에서 저장 시도 → 401, 로그인 유도
- 중밵 저장(동일 레시피 재저장) → 허용하되 UI에서 "이벌 저장되" 표시 고매
- 다마 사용자의 레시피 삭제 시도 → 403

## 보안/개인정보 간계사항
- 보안번호는 평문 저장 기비, Supabase Auth 똜 bcrypt 해시 사용
- 사용자별 레시피 조회 시 `user_id` 기준으로 row-level security 적용 (Supabase RLS 권장)

## 성공 기준
- 프로필 생성 후 레시피 저장 → 재조회 시 동일한 내용 확인 가능
- 다마 간정으로 로건 시 타 사용자의 레시피가 보이지 않음

## 범위 (Out of Scope)
- 소셜 로그인(OAuth), 보안번호 찾기 똜 고개 인증 기능
- 레시피 공유/소셜 기능
- 결제/가입
