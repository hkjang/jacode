// Editor Components - Barrel Export
// All VS Code-like editor components in one place

// Layout & Core
export { EditorLayout } from './EditorLayout';
export { ActivityBar } from './ActivityBar';
export { StatusBar } from './StatusBar';
export { EditorTabs } from './EditorTabs';
export { Breadcrumbs } from './Breadcrumbs';
export { WelcomePage } from './WelcomePage';
export { SplitEditor } from './SplitEditor';

// File Management
export { FileExplorer } from './FileExplorer';
export type { FileTreeNode } from './FileExplorer';

// Navigation & Search
export { CommandPalette, useDefaultCommands } from './CommandPalette';
export { QuickOpen } from './QuickOpen';
export { GoToLineDialog } from './GoToLineDialog';
export { FindInFiles } from './FindInFiles';

// Code Visualization
export { Minimap } from './Minimap';
export { OutlineView } from './OutlineView';

// Panels
export { ProblemsPanel } from './ProblemsPanel';
export { IntegratedTerminal } from './IntegratedTerminal';
export { GitPanel } from './GitPanel';
export { SettingsPanel } from './SettingsPanel';

// Monaco Editors
export { MonacoEditor } from './MonacoEditor';
export { MonacoDiffEditor } from './MonacoDiffEditor';

// Utilities
export { 
  useKeyboardShortcuts, 
  createEditorShortcuts,
  KeyboardShortcutsProvider 
} from './KeyboardShortcuts';
export { 
  NotificationProvider, 
  useNotifications 
} from './NotificationProvider';

// Advanced Features
export { AIInlineActions } from './AIInlineActions';
export { PeekDefinitionPopup } from './PeekDefinition';
export { HoverCard } from './HoverCard';
export { SearchReplaceBar } from './SearchReplaceBar';
export { CodeLensWidget, generateReferenceLenses, generateTestLenses } from './CodeLensWidget';
export { BookmarksPanel } from './BookmarksPanel';

// State Management
export { useEditorStore, useActiveFile, useOpenFiles, useEditorSettings, useRecentFiles } from './useEditorStore';

// Additional Features
export { RecentFilesPanel } from './RecentFilesPanel';
export { DraggableTabs } from './DraggableTabs';
export { AutoSaveIndicator, useAutoSave } from './AutoSaveIndicator';
export { useUndoRedo, useFileHistory } from './useUndoRedo';
export { FileHistoryPanel } from './FileHistoryPanel';
