# P0 그라운딩 레이어 — 연결 가이드

"일이 실제로 어떻게 수행되는가"를 구조화 지식으로 주입해 아키텍트의 **분해·비용·페르소나 추정 현실성**을 높이는 시드 세트입니다.

## 무엇이 들어있나

```
lib/knowledge/
├─ ncs/                      # NCS 국가직무능력표준 시드 (직무 20개)
│  ├─ index.json             #   카탈로그 (jobCategoryQuery → 직무 매칭 키워드)
│  └─ <slug>.json            #   직무별: 분류코드 + 능력단위 → 수행준거 + 레인근거
├─ labor-cost/
│  └─ labor-cost-table.json  # 직군·경력별 연봉 레인지(만원/년) + AI 운영비 + Field 단가
├─ process-maps/
│  ├─ subscription-commerce.json   # 구독커머스 업무흐름(누가·무엇을·순서·핸드오프)
│  └─ urban-redesign.json          # 도시재설계 업무흐름(철거·하수도·설치 등 Field 중심)
├─ miso-rag/                 # ⚙️ 자동생성: MISO 지식(RAG) 업로드용 마크다운 (Track B)
│  ├─ corpus.md              #   전체 1파일(원샷 업로드용)
│  ├─ ncs-<slug>.md          #   직무별 마크다운
│  ├─ labor-cost.md          #   노동비용 표(마크다운)
│  └─ process-<slug>.md      #   프로세스 맵 마크다운
├─ index.ts                  # 로더 + 그라운딩 다이제스트 생성 (라우트에서 import)
├─ scripts/build-rag-corpus.ts  # miso-rag/*.md 생성기 (index.json 동적 순회)
├─ scripts/fetch-ncs.ts      # (선택) data.go.kr 권위 데이터로 시드 갱신
└─ README.md                 # 이 문서
```

직무 20개: 수의·상담·법률사무·프로젝트관리·식품품질·회계세무·인사노무·소프트웨어개발·UX디자인·영업(EDGE) / 택배배송·하수도·철거·설비설치·전기공사·시설경비·조리(FIELD) / 디지털마케팅·데이터분석·CS운영(AI). NCS 3레인(AI/Edge/Field)을 모두 커버하고 NCS 대분류 01·02·05·06·07·08·09·10·11·13·14·15·19·20·21·23 을 포함. 두 프로세스 맵에 등장하는 직무를 모두 포함.

## 연결 방식 — 2-트랙

### Track A. 코드 in-query 주입 (이미 적용됨, MISO 설정 불필요)

`lib/knowledge/index.ts` 가 다이제스트를 만들어 MISO `query` 앞에 붙입니다. **MISO 앱의 지식(RAG)을 켜지 않아도 그라운딩이 동작**하므로 데모에서 가장 확실한 경로입니다.

- `app/api/architect/route.ts` → `buildArchitectGrounding(brief)`
  - 레인 판정 기준 + 직무 카탈로그(세분류→권장레인) + 직군 노동비용 + 브리프에 맞는 프로세스 맵을 query 에 주입.
- `app/api/personas/route.ts` → `buildRoleGrounding(role)`
  - 역할의 `jobCategoryQuery`/제목을 NCS 직무에 매칭 → 실제 수행준거 + 보수 레인지를 페르소나 합성 근거로 주입.

매칭은 `index.json` 의 `keywords` + 직무 `aliases` 토큰 부분일치 스코어링(`matchNcsJob`)으로 동작합니다. 새 직무를 추가하면 `ncs/<slug>.json` 작성 → `index.json` 에 엔트리 추가 → `index.ts` 의 `RAW` 맵에 import 추가, 3곳만 갱신하면 됩니다.

### Track B. MISO 지식(RAG) 업로드 (권장, 검색 기반 확장)

시드를 MISO 앱의 **지식**에 첨부해 아키텍트가 RAG 로 참조하게 합니다. 시드가 커져 query 주입이 부담될 때의 정공법입니다.

1. **업로드 파일 준비**: MISO/Dify 계열 지식은 마크다운/텍스트 청킹이 잘 됩니다. flatten 스크립트로 시드를 마크다운으로 변환하세요:

   ```bash
   npx tsx lib/knowledge/scripts/build-rag-corpus.ts
   ```

   → `lib/knowledge/miso-rag/` 에 `corpus.md`(전체 1파일) + `ncs-<slug>.md`·`labor-cost.md`·`process-<slug>.md` 생성. 원샷이면 `corpus.md` 하나만, 문서 단위 관리면 개별 `.md` 를 올리세요. (시드/직무를 추가·갱신하면 스크립트만 다시 실행하면 됩니다)
2. **MISO 콘솔 → 해당 챗 에이전트 앱 → 지식(Knowledge) → 문서 추가**로 업로드, 인덱싱/임베딩 완료 확인.
3. **앱 시스템 프롬프트**에 아래 지침을 추가해 지식을 강제 참조:

   > 너는 첨부된 NCS 직무표준·노동비용표·프로세스맵 지식을 **반드시 검색**해 분해한다.
   > 각 역할의 레인은 직무의 `laneHint`/체화근거를 따르고, `estimatedAnnualSalary` 는
   > 노동비용표의 직군·경력 레인지 안에서 정한다. 지식에 없는 직무만 추정하되 NCS
   > 대분류 체계를 따른다. 추정값은 "PoC 가정"임을 rationale 에 명시한다.

4. Track A 의 in-query 다이제스트는 그대로 두어도 무방(중복 강화). 토큰이 부담되면 RAG 안정화 후 `buildArchitectGrounding` 호출만 줄이면 됩니다.

## 출처·프로비넌스 (정직성)

- **NCS 능력단위/수행준거**: 한국산업인력공단 NCS 프레임워크(실제 분류체계·대분류 24개)를 기준으로 한 **PoC 큐레이션**입니다. 각 파일 `provenance.source = "ncs-framework-curated"`.
  - 권위 텍스트로 교체하려면 `scripts/fetch-ncs.ts` 로 data.go.kr API(15128213/15063879) 응답을 받아 `competencyUnits` 를 덮어씁니다. 교체된 파일은 `provenance.source = "data.go.kr-authoritative"`.
- **노동비용표**: 고용노동부 사업체노동력조사·고용형태별근로실태조사(임금구조)·워크넷 공고 분포를 기준으로 한 **PoC 가정값**(`poc_assumption: true`). 재무자문 아님. `lib/cost.ts` 의 `EDGE_BURDEN(1.2)` 은 비용 단계에서 별도 적용.
- **프로세스 맵**: 해당 도메인의 일반적 운영 흐름 기준 PoC 맵(`poc_assumption: true`).

## NCS 권위 데이터 갱신 (선택)

```bash
# 1) data.go.kr 활용신청 후 서비스키를 .env.local 에:  DATA_GO_KR_SERVICE_KEY=...
# 2) dry-run (비교만)
npx tsx lib/knowledge/scripts/fetch-ncs.ts --slug veterinary
# 3) 실제 교체
npx tsx lib/knowledge/scripts/fetch-ncs.ts --slug veterinary --apply
```

> API 응답 키 이름은 버전마다 다를 수 있어 스크립트는 방어적으로 파싱하고, 수신 0건이면 시드를 보존합니다. 키/시크릿은 `.env.local`(gitignore)에만 두고 커밋 금지.

## 데모에서 그라운딩을 "증명"하는 법

1. `MOCK_MODE=false` + `MISO_ARCHITECT_KEY` 설정.
2. 동일 브리프를 **그라운딩 on/off**로 비교: `architect/route.ts` 의 `const query = ...grounding...` 한 줄을 `baseQuery` 로 바꿔 off 버전 생성 → 레인 배치·연봉이 직군 레인지에 수렴하는지, Field 직무가 올바른 NCS 대분류로 분류되는지 대조.
3. 페르소나 팝오버에서 `reason` 이 NCS 수행준거를 근거로 서술되는지 확인.
