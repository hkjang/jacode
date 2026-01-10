'use client';

import { useEffect, useState } from 'react';
import Editor, { useMonaco } from '@monaco-editor/react';
import { SAMPLE_CODE } from '../constants/sample-code';

interface CodePreviewProps {
  language: string;
  rules: {
    indentStyle: string; // 'spaces' | 'tabs'
    indentSize: number;
    quotes: string; // 'single' | 'double'
    semicolons: boolean;
  };
}

export function CodePreview({ language, rules }: CodePreviewProps) {
  const monaco = useMonaco();
  const [code, setCode] = useState('');

  // Apply formatting rules to sample code
  useEffect(() => {
    let formatted = SAMPLE_CODE[language] || SAMPLE_CODE['typescript'];

    // 1. Quotes
    if (rules.quotes === 'double') {
      formatted = formatted.replace(/'/g, '"');
    } else {
      formatted = formatted.replace(/"/g, "'");
    }

    // 2. Semicolons (Primitive logic for demo purposes)
    if (!rules.semicolons) {
      formatted = formatted.replace(/;/g, '');
    } else {
      // Ensure semicolons exist (simplified)
      // formatting libraries like prettier are better for this but complex to run in browser without worker
      // For visual preview, we might just toggle visibility or simple regex replacement where safe
    }

    // 3. Indentation
    if (rules.indentStyle === 'tabs') {
      formatted = formatted.replace(/  /g, '\t');
    } else {
      const spaces = ' '.repeat(rules.indentSize);
      // Assuming base sample uses 2 spaces
      if (rules.indentSize !== 2) {
         // This is a naive replacement for demo. 
         // Real implementation would use a formatter. 
         // For now, let's rely on Monaco's internal formatting if possible or just simple replace
         formatted = formatted.replace(/  /g, spaces);
      }
    }

    setCode(formatted);
  }, [language, rules]);

  return (
    <div className="h-full w-full min-h-[400px] border rounded-md overflow-hidden bg-[#1e1e1e]">
      <Editor
        height="100%"
        language={language}
        theme="vs-dark"
        value={code}
        options={{
          readOnly: true,
          minimap: { enabled: false },
          fontSize: 14,
          tabSize: rules.indentSize,
          insertSpaces: rules.indentStyle === 'spaces',
          automaticLayout: true,
        }}
      />
    </div>
  );
}
