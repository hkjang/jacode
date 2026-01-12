# Jacode: AI-Powered Intelligent IDE 🚀

Jacode는 개발자의 생산성을 극대화하기 위해 설계된 차세대 AI 통합 개발 환경입니다. 로컬 LLM(Ollama, vLLM)을 활용하여 데이터 프라이버시를 보장하면서도 강력한 AI 코드 생성 및 분석 기능을 제공합니다.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-0.1.0-green.svg)

## ✨ 주요 기능

### 🤖 강력한 AI 코딩 어시스턴트

- **스마트 코드 생성**: 단순한 자동 완성을 넘어, 프로젝트 컨텍스트를 이해하는 다단계(설계-생성-검증) AI 파이프라인.
- **실시간 채팅 지원**: 코드에 대한 질문, 리팩토링 요청, 버그 수정을 위한 대화형 인터페이스.
- **다중 모델 지원 & 라우팅**: 작업 유형(코딩, 채팅, 설계)에 따라 최적의 AI 모델(CodeLlama, Mistral 등)을 자동으로 선택.

### 🛡️ 엔터프라이즈급 보안 및 안정성

- **로컬 LLM 기반**: 모든 코드는 로컬 네트워크 내에서 처리되어 외부 유출 걱정 없음.
- **보안 검사**: 생성된 코드에 대한 자동 취약점 스캔 및 PII(개인식별정보) 마스킹.
- **Circuit Breaker**: AI 서비스 장애 시 자동 차단 및 백업 시스템 전환으로 안정성 보장.

### 💻 최적화된 개발 경험

- **Monaco Editor 통합**: VS Code와 유사한 친숙한 에디터 환경 제공 (Diff View, 인라인 힌트).
- **프로젝트 관리**: 직관적인 프로젝트 대시보드 및 파일 관리.

## 🚀 빠른 시작 (Quick Start)

### 사전 요구사항

- Node.js 18+
- PostgreSQL 16+
- Redis 7+
- Ollama (또는 호환되는 vLLM 서버)

### 설치 및 실행

1. **저장소 클론 및 의존성 설치**

   ```bash
   git clone https://github.com/hkjang/jacode.git
   cd jacode
   npm install
   ```

2. **환경 변수 설정**
   `.env.example` 파일을 복사하여 `.env` 파일을 생성하고 설정을 입력합니다.

   ```bash
   cp .env.example .env
   # .env 파일에서 DB, Redis, AI Provider 설정 수정
   ```

3. **데이터베이스 설정**

   ```bash
   cd backend
   npm run prisma:migrate
   npm run db:seed  # 초기 데이터 시딩
   ```

4. **서비스 실행**
   ```bash
   # 프로젝트 루트에서
   npm run dev
   ```

   - 프론트엔드: http://localhost:3000
   - 백엔드: http://localhost:4000
   - API 문서: http://localhost:4000/api/docs

## 📚 문서 (Documentation)

상세한 사용법과 관리 가이드는 `docs` 폴더를 참조하세요.

- **[사용자 가이드 (User Guide)](docs/USER_GUIDE.md)**: 일반 사용자를 위한 기능 사용법
- **[관리자 가이드 (Admin Guide)](docs/ADMIN_GUIDE.md)**: 시스템 설정, 모델 관리, 보안 정책 설정 방법

## 🛠️ 기술 스택

- **Backend**: NestJS, Prisma, PostgreSQL, Redis, BullMQ
- **Frontend**: Next.js 14, React, Tailwind CSS, Monaco Editor
- **AI/ML**: Ollama, vLLM, LangChain (Custom Implementation)

## 🤝 기여하기

버그 제보 및 기능 제안은 Issue를 통해 환영합니다. PR 전 `CONTRIBUTING.md`를 확인해주세요.

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.
