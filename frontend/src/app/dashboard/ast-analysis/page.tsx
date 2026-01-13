'use client';

import { ASTAnalysisViewer } from '@/components/ast';

export default function UserASTAnalysisPage() {
  return <ASTAnalysisViewer isAdmin={false} />;
}
