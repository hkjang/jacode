// I18N (Internationalization) Service
// Supports: Korean (ko), English (en), Japanese (ja)

export type SupportedLocale = 'ko' | 'en' | 'ja';

export const translations: Record<SupportedLocale, Record<string, string>> = {
  ko: {
    // Common
    'common.save': '저장',
    'common.cancel': '취소',
    'common.delete': '삭제',
    'common.edit': '편집',
    'common.create': '생성',
    'common.search': '검색',
    'common.loading': '로딩 중...',
    'common.error': '오류',
    'common.success': '성공',
    'common.confirm': '확인',
    'common.back': '뒤로',
    'common.next': '다음',
    'common.previous': '이전',
    'common.refresh': '새로고침',
    'common.export': '내보내기',
    'common.import': '가져오기',

    // Auth
    'auth.login': '로그인',
    'auth.logout': '로그아웃',
    'auth.register': '회원가입',
    'auth.email': '이메일',
    'auth.password': '비밀번호',
    'auth.forgotPassword': '비밀번호 찾기',
    'auth.loginWithGoogle': 'Google로 로그인',
    'auth.loginWithGithub': 'GitHub로 로그인',
    'auth.loginWithMicrosoft': 'Microsoft로 로그인',

    // Admin
    'admin.dashboard': '관리자 대시보드',
    'admin.overview': '개요',
    'admin.users': '사용자 관리',
    'admin.settings': '시스템 설정',
    'admin.servers': '모델 서버',
    'admin.tasks': '작업',
    'admin.models': 'AI 모델',
    'admin.prompts': '프롬프트 템플릿',
    'admin.features': '기능 토글',
    'admin.logs': '시스템 로그',
    'admin.audit': '감사 및 이력',
    'admin.backup': '백업/복구',
    'admin.queue': '큐 관리',
    'admin.costAlerts': '비용 알림',

    // Dashboard
    'dashboard.yourProjects': '내 프로젝트',
    'dashboard.newProject': '새 프로젝트',
    'dashboard.createProject': '프로젝트 생성',
    'dashboard.noProjects': '아직 프로젝트가 없습니다',
    'dashboard.noProjectsDesc': '첫 번째 프로젝트를 생성하여 AI 지원 코딩을 시작하세요',
    'dashboard.projectName': '프로젝트 이름',
    'dashboard.projectDescription': '설명 (선택사항)',

    // Messages
    'message.saveSuccess': '저장되었습니다.',
    'message.deleteConfirm': '정말 삭제하시겠습니까?',
    'message.deleteSuccess': '삭제되었습니다.',
    'message.error.generic': '오류가 발생했습니다.',
    'message.error.network': '네트워크 오류가 발생했습니다.',
    'message.error.unauthorized': '권한이 없습니다.',
    'message.error.notFound': '찾을 수 없습니다.',
  },

  en: {
    // Common
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.create': 'Create',
    'common.search': 'Search',
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.confirm': 'Confirm',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.previous': 'Previous',
    'common.refresh': 'Refresh',
    'common.export': 'Export',
    'common.import': 'Import',

    // Auth
    'auth.login': 'Login',
    'auth.logout': 'Logout',
    'auth.register': 'Register',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.forgotPassword': 'Forgot Password',
    'auth.loginWithGoogle': 'Login with Google',
    'auth.loginWithGithub': 'Login with GitHub',
    'auth.loginWithMicrosoft': 'Login with Microsoft',

    // Admin
    'admin.dashboard': 'Admin Dashboard',
    'admin.overview': 'Overview',
    'admin.users': 'User Management',
    'admin.settings': 'System Settings',
    'admin.servers': 'Model Servers',
    'admin.tasks': 'Tasks',
    'admin.models': 'AI Models',
    'admin.prompts': 'Prompt Templates',
    'admin.features': 'Feature Toggles',
    'admin.logs': 'System Logs',
    'admin.audit': 'Audit & History',
    'admin.backup': 'Backup/Restore',
    'admin.queue': 'Queue Management',
    'admin.costAlerts': 'Cost Alerts',

    // Dashboard
    'dashboard.yourProjects': 'Your Projects',
    'dashboard.newProject': 'New Project',
    'dashboard.createProject': 'Create Project',
    'dashboard.noProjects': 'No projects yet',
    'dashboard.noProjectsDesc': 'Create your first project to get started with AI-powered coding',
    'dashboard.projectName': 'Project Name',
    'dashboard.projectDescription': 'Description (optional)',

    // Messages
    'message.saveSuccess': 'Saved successfully.',
    'message.deleteConfirm': 'Are you sure you want to delete?',
    'message.deleteSuccess': 'Deleted successfully.',
    'message.error.generic': 'An error occurred.',
    'message.error.network': 'Network error occurred.',
    'message.error.unauthorized': 'Unauthorized.',
    'message.error.notFound': 'Not found.',
  },

  ja: {
    // Common
    'common.save': '保存',
    'common.cancel': 'キャンセル',
    'common.delete': '削除',
    'common.edit': '編集',
    'common.create': '作成',
    'common.search': '検索',
    'common.loading': '読み込み中...',
    'common.error': 'エラー',
    'common.success': '成功',
    'common.confirm': '確認',
    'common.back': '戻る',
    'common.next': '次へ',
    'common.previous': '前へ',
    'common.refresh': '更新',
    'common.export': 'エクスポート',
    'common.import': 'インポート',

    // Auth
    'auth.login': 'ログイン',
    'auth.logout': 'ログアウト',
    'auth.register': '登録',
    'auth.email': 'メール',
    'auth.password': 'パスワード',
    'auth.forgotPassword': 'パスワードをお忘れですか',
    'auth.loginWithGoogle': 'Googleでログイン',
    'auth.loginWithGithub': 'GitHubでログイン',
    'auth.loginWithMicrosoft': 'Microsoftでログイン',

    // Admin
    'admin.dashboard': '管理ダッシュボード',
    'admin.overview': '概要',
    'admin.users': 'ユーザー管理',
    'admin.settings': 'システム設定',
    'admin.servers': 'モデルサーバー',
    'admin.tasks': 'タスク',
    'admin.models': 'AIモデル',
    'admin.prompts': 'プロンプトテンプレート',
    'admin.features': '機能トグル',
    'admin.logs': 'システムログ',
    'admin.audit': '監査と履歴',
    'admin.backup': 'バックアップ/復元',
    'admin.queue': 'キュー管理',
    'admin.costAlerts': 'コストアラート',

    // Dashboard
    'dashboard.yourProjects': 'あなたのプロジェクト',
    'dashboard.newProject': '新規プロジェクト',
    'dashboard.createProject': 'プロジェクトを作成',
    'dashboard.noProjects': 'プロジェクトがまだありません',
    'dashboard.noProjectsDesc': '最初のプロジェクトを作成して、AI支援コーディングを始めましょう',
    'dashboard.projectName': 'プロジェクト名',
    'dashboard.projectDescription': '説明（任意）',

    // Messages
    'message.saveSuccess': '保存しました。',
    'message.deleteConfirm': '本当に削除しますか？',
    'message.deleteSuccess': '削除しました。',
    'message.error.generic': 'エラーが発生しました。',
    'message.error.network': 'ネットワークエラーが発生しました。',
    'message.error.unauthorized': '権限がありません。',
    'message.error.notFound': '見つかりません。',
  },
};

// Get translation
export function t(key: string, locale: SupportedLocale = 'ko'): string {
  return translations[locale]?.[key] || translations['en']?.[key] || key;
}

// Get all translations for a locale
export function getTranslations(locale: SupportedLocale = 'ko'): Record<string, string> {
  return { ...translations['en'], ...translations[locale] };
}

// Check if locale is supported
export function isValidLocale(locale: string): locale is SupportedLocale {
  return ['ko', 'en', 'ja'].includes(locale);
}

// Get browser locale
export function getBrowserLocale(): SupportedLocale {
  if (typeof window === 'undefined') return 'ko';

  const browserLocale = navigator.language.split('-')[0];
  return isValidLocale(browserLocale) ? browserLocale : 'ko';
}
