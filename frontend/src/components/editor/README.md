# Editor Components Usage Guide

## Quick Start

```tsx
import { EditorLayout, NotificationProvider } from "@/components/editor";

export default function EditorPage({
  params,
}: {
  params: { projectId: string };
}) {
  return (
    <NotificationProvider>
      <EditorLayout
        projectId={params.projectId}
        files={fileTree}
        onFileOpen={async (path) => await fetchFileContent(path)}
        onFileSave={async (path, content) => await saveFile(path, content)}
        renderEditor={(file, onChange) => (
          <MonacoEditor
            value={file.content}
            language={file.language}
            onChange={onChange}
          />
        )}
      />
    </NotificationProvider>
  );
}
```

## Components Overview

### Layout Components

| Component      | Description         | Import                                               |
| -------------- | ------------------- | ---------------------------------------------------- |
| `EditorLayout` | Main unified layout | `import { EditorLayout } from '@/components/editor'` |
| `ActivityBar`  | Left icon sidebar   | Auto-included in EditorLayout                        |
| `StatusBar`    | Bottom status bar   | Auto-included in EditorLayout                        |
| `EditorTabs`   | Open file tabs      | Auto-included in EditorLayout                        |

### Navigation

| Component        | Shortcut       | Description             |
| ---------------- | -------------- | ----------------------- |
| `CommandPalette` | `Ctrl+Shift+P` | Search and run commands |
| `QuickOpen`      | `Ctrl+P`       | Quick file search       |
| `GoToLineDialog` | `Ctrl+G`       | Jump to line:column     |
| `FindInFiles`    | `Ctrl+Shift+F` | Global search           |

### Panels

| Component            | Description                   |
| -------------------- | ----------------------------- |
| `FileExplorer`       | File tree with search/filter  |
| `GitPanel`           | Git changes with stage/commit |
| `OutlineView`        | Code symbols tree             |
| `ProblemsPanel`      | Errors and warnings           |
| `IntegratedTerminal` | Multi-tab terminal            |

### Utilities

| Component              | Description                |
| ---------------------- | -------------------------- |
| `NotificationProvider` | Toast notification context |
| `useEditorStore`       | Zustand state management   |
| `useKeyboardShortcuts` | Global keyboard shortcuts  |

## State Management

```tsx
import {
  useEditorStore,
  useActiveFile,
} from "@/components/editor/useEditorStore";

function MyComponent() {
  const activeFile = useActiveFile();
  const { openFile, closeFile, updateSettings } = useEditorStore();

  // Open a new file
  openFile({
    id: "file1",
    path: "src/index.ts",
    name: "index.ts",
    content: "// Hello",
    language: "typescript",
  });
}
```

## Keyboard Shortcuts

| Shortcut       | Action          |
| -------------- | --------------- |
| `Ctrl+P`       | Quick Open      |
| `Ctrl+Shift+P` | Command Palette |
| `Ctrl+S`       | Save            |
| `Ctrl+Shift+F` | Find in Files   |
| `Ctrl+Shift+A` | Toggle AI       |
| `Ctrl+\``      | Toggle Terminal |
| `Ctrl+B`       | Toggle Sidebar  |
| `Ctrl+G`       | Go to Line      |
| `Ctrl+W`       | Close Tab       |
| `Ctrl+Tab`     | Next Tab        |

## Theming

Settings are stored in localStorage and persist across sessions:

```tsx
const { settings, updateSettings } = useEditorStore();

// Update theme
updateSettings({ theme: "dark" });

// Update font size
updateSettings({ fontSize: 16 });
```
