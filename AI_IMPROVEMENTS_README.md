# JaCode AI 서비스 개선

## 개요

JaCode의 AI 코드 생성 서비스를 프로덕션 수준으로 개선한 종합 솔루션입니다.

## 주요 기능

### ✨ 핵심 개선사항

- **다단계 AI 생성**: 설계 → 생성 → 검증 3단계 파이프라인
- **지능형 모델 라우팅**: 프롬프트 유형별 최적 모델 자동 선택
- **실시간 품질 피드백**: Monaco 에디터 통합, Diff 뷰어, 인라인 힌트
- **운영 안정성**: Circuit Breaker, 자동 재시도, 헬스체크
- **보안 강화**: 프롬프트 인젝션 방어, 코드 안전성 검증, PII 마스킹

### 📊 구현 완료 현황

- ✅ **Phase 1**: 기반 구조 (5개 DB 모델, Provider 추상화)
- ✅ **Phase 2**: AI 코드 생성 (컨텍스트 수집, 신뢰도 점수)
- ✅ **Phase 3**: 모델 라우팅 (비용/성능 최적화)
- ✅ **Phase 4**: Monaco 통합 (Diff, 힌트, 품질관리)
- ✅ **Phase 6**: 운영 안정성 (헬스체크, Job 재시도)
- ✅ **Phase 7**: 보안 (인젝션 방어, 코드 필터링)

**총 30+ 서비스/컴포넌트 | ~3,000 lines of code**

## 빠른 시작

### 사전 요구사항

- Node.js 18+
- PostgreSQL 16+
- Redis 7+
- Ollama (또는 VLLM)

### 설치

```bash
# 1. 의존성 설치
npm install

# 2. 환경 변수 설정
cp .env.example .env.local

# 3. 데이터베이스 마이그레이션
cd backend
npm run prisma:migrate

# 4. 서비스 시작
npm run dev
```

### 환경 변수

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/jacode

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# AI Provider
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=codellama:13b

# Security
MAX_PROMPT_LENGTH=10000
ENABLE_PROMPT_SANITIZATION=true
ENABLE_CODE_SAFETY_CHECK=true
```

## 사용 예시

### AI 코드 생성 (Backend)

```typescript
import { AIService } from "./ai/ai.service";

// 다단계 프롬프트 체인 사용
const result = await aiService.generateCode(
  "Create a user authentication function",
  context,
  "typescript",
  {
    projectId: "project-id",
    filePath: "src/auth.ts",
    stylePresetId: "typescript-standard",
    useChain: true,
  }
);

console.log(result.code); // 생성된 코드
console.log(result.confidenceScore); // 0.92
console.log(result.design); // 구현 계획
console.log(result.validation); // 검증 결과
```

### Diff 뷰어 (Frontend)

```typescript
import AIDiffViewer from '@/components/editor/AIDiffViewer';

<AIDiffViewer
  original={originalCode}
  modified={aiGeneratedCode}
  language="typescript"
  confidenceScore={0.92}
  explanation="Refactored to use async/await..."
  onApprove={() => applyChanges()}
  onReject={() => discardChanges()}
/>
```

### 보안 체크

```typescript
import { PromptSanitizerService } from "./common/services/security.service";

// 프롬프트 인젝션 방어
const sanitized = promptSanitizer.sanitize(userInput);

// 코드 안전성 검증
const safetyResult = codeSafetyFilter.checkGeneratedCode(code);
```

## 아키텍처

```
Backend Services:
├── AI Module
│   ├── PromptChainService          # 3단계 생성 파이프라인
│   ├── ContextCollectorService     # 컨텍스트 수집
│   ├── ModelRouterService          # 지능형 라우팅
│   ├── CircuitBreakerService       # 장애 격리
│   └── CodeStyleService            # 스타일 관리
├── Security
│   ├── PromptSanitizerService      # 인젝션 방어
│   ├── CodeSafetyFilterService     # 코드 필터링
│   └── PIIMaskerService            # PII 마스킹
└── Queue
    └── JobRetryService             # 재시도 메커니즘

Frontend Components:
├── AIDiffViewer                    # Diff 비교 UI
├── InlineHintManager               # 인라인 힌트
├── CodeQualityManager              # 품질 관리
└── AISnapshotManager               # Undo/Redo
```

## API 엔드포인트

### AI 코드 생성

```
POST /api/ai/generate
{
  "prompt": "Create a function...",
  "language": "typescript",
  "projectId": "xxx",
  "filePath": "src/app.ts"
}
```

### 헬스체크

```
GET /api/health
GET /api/admin/health/comprehensive
```

## 모니터링

### 메트릭

- **성능**: Prompt 실행 시간, 모델 선택 시간
- **품질**: Confidence scores, Validation 이슈
- **보안**: Injection 시도, Safety 위반, PII 감지

### 로깅

모든 민감 정보는 자동으로 마스킹됩니다:

- Email → `[EMAIL_REDACTED]`
- API Keys → `api_key=[REDACTED]`
- JWT → `[JWT_REDACTED]`

## 프로덕션 배포

### Docker Compose

```yaml
services:
  backend:
    build: ./backend
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_HOST=redis
      - AI_PROVIDER=ollama
    depends_on:
      - postgres
      - redis
```

### 초기 설정

```typescript
// 1. 기본 코드 스타일 생성
await codeStyleService.createDefaultPresets();

// 2. 라우팅 정책 생성
await prisma.modelRoutingPolicy.create({
  data: {
    name: "Default Routing",
    isActive: true,
    priority: 100,
    rules: {
      costWeight: 0.3,
      performanceWeight: 0.4,
      availabilityWeight: 0.3,
    },
  },
});
```

## 테스트

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Coverage
npm run test:cov
```

## 기여

이슈나 PR은 GitHub에서 환영합니다.

## 라이선스

이 프로젝트는 MIT 라이선스를 따릅니다.
