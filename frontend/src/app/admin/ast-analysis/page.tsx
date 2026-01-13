'use client';

import { ASTAnalysisViewer } from '@/components/ast';

export default function AdminASTAnalysisPage() {
  return (
    <div className="p-6">
      <ASTAnalysisViewer isAdmin={true} />
    </div>
  );
}
