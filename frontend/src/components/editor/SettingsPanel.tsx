'use client';

import React, { useState } from 'react';
import { 
  Settings, 
  Monitor, 
  Palette, 
  Keyboard, 
  Sparkles,
  ChevronRight,
  Moon,
  Sun,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface SettingSection {
  id: string;
  label: string;
  icon: React.ElementType;
}

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  settings: {
    theme: 'light' | 'dark' | 'system';
    fontSize: number;
    tabSize: number;
    wordWrap: boolean;
    minimap: boolean;
    lineNumbers: boolean;
    autoSave: boolean;
    formatOnSave: boolean;
    aiEnabled: boolean;
  };
  onSettingChange: (key: string, value: any) => void;
  className?: string;
}

const sections: SettingSection[] = [
  { id: 'editor', label: 'Editor', icon: Monitor },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'keyboard', label: 'Keyboard Shortcuts', icon: Keyboard },
  { id: 'ai', label: 'AI Settings', icon: Sparkles },
];

export function SettingsPanel({
  isOpen,
  onClose,
  settings,
  onSettingChange,
  className,
}: SettingsPanelProps) {
  const [activeSection, setActiveSection] = useState('editor');

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      
      {/* Panel */}
      <div 
        className={cn(
          'relative w-full max-w-2xl h-[80vh] max-h-[600px] bg-background border rounded-lg shadow-2xl flex overflow-hidden',
          className
        )}
        onClick={e => e.stopPropagation()}
      >
        {/* Sidebar */}
        <div className="w-48 border-r bg-muted/30 py-2">
          <h2 className="px-4 py-2 text-sm font-medium">Settings</h2>
          <nav className="space-y-0.5">
            {sections.map(section => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  className={cn(
                    'w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors',
                    activeSection === section.id
                      ? 'bg-accent text-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                  )}
                  onClick={() => setActiveSection(section.id)}
                >
                  <Icon className="h-4 w-4" />
                  {section.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {activeSection === 'editor' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium">Editor</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Font Size</div>
                    <div className="text-xs text-muted-foreground">Editor font size in pixels</div>
                  </div>
                  <select
                    value={settings.fontSize}
                    onChange={(e) => onSettingChange('fontSize', Number(e.target.value))}
                    className="w-20 h-8 px-2 text-sm border rounded bg-background"
                  >
                    {[10, 12, 14, 16, 18, 20, 22, 24].map(size => (
                      <option key={size} value={size}>{size}px</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Tab Size</div>
                    <div className="text-xs text-muted-foreground">Number of spaces per tab</div>
                  </div>
                  <select
                    value={settings.tabSize}
                    onChange={(e) => onSettingChange('tabSize', Number(e.target.value))}
                    className="w-20 h-8 px-2 text-sm border rounded bg-background"
                  >
                    {[2, 4, 8].map(size => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </div>

                <ToggleSetting
                  label="Word Wrap"
                  description="Wrap lines that exceed viewport width"
                  value={settings.wordWrap}
                  onChange={(v) => onSettingChange('wordWrap', v)}
                />

                <ToggleSetting
                  label="Minimap"
                  description="Show code overview on right side"
                  value={settings.minimap}
                  onChange={(v) => onSettingChange('minimap', v)}
                />

                <ToggleSetting
                  label="Line Numbers"
                  description="Show line numbers in editor gutter"
                  value={settings.lineNumbers}
                  onChange={(v) => onSettingChange('lineNumbers', v)}
                />

                <ToggleSetting
                  label="Auto Save"
                  description="Automatically save files after changes"
                  value={settings.autoSave}
                  onChange={(v) => onSettingChange('autoSave', v)}
                />

                <ToggleSetting
                  label="Format on Save"
                  description="Run formatter when saving files"
                  value={settings.formatOnSave}
                  onChange={(v) => onSettingChange('formatOnSave', v)}
                />
              </div>
            </div>
          )}

          {activeSection === 'appearance' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium">Appearance</h3>
              
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium mb-3">Theme</div>
                  <div className="grid grid-cols-3 gap-2">
                    {['light', 'dark', 'system'].map(theme => (
                      <button
                        key={theme}
                        className={cn(
                          'flex items-center justify-center gap-2 px-4 py-3 border rounded-lg transition-colors',
                          settings.theme === theme
                            ? 'border-primary bg-accent'
                            : 'hover:bg-accent/50'
                        )}
                        onClick={() => onSettingChange('theme', theme)}
                      >
                        {theme === 'light' && <Sun className="h-4 w-4" />}
                        {theme === 'dark' && <Moon className="h-4 w-4" />}
                        {theme === 'system' && <Monitor className="h-4 w-4" />}
                        <span className="text-sm capitalize">{theme}</span>
                        {settings.theme === theme && <Check className="h-3 w-3 text-primary" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'ai' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium">AI Settings</h3>
              
              <div className="space-y-4">
                <ToggleSetting
                  label="AI Assistant"
                  description="Enable AI-powered code assistance"
                  value={settings.aiEnabled}
                  onChange={(v) => onSettingChange('aiEnabled', v)}
                />
              </div>
            </div>
          )}

          {activeSection === 'keyboard' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium">Keyboard Shortcuts</h3>
              
              <div className="space-y-2">
                {[
                  { key: 'Ctrl+P', action: 'Quick Open' },
                  { key: 'Ctrl+Shift+P', action: 'Command Palette' },
                  { key: 'Ctrl+S', action: 'Save' },
                  { key: 'Ctrl+Shift+F', action: 'Find in Files' },
                  { key: 'Ctrl+Shift+A', action: 'Toggle AI' },
                  { key: 'Ctrl+`', action: 'Toggle Terminal' },
                  { key: 'Ctrl+B', action: 'Toggle Sidebar' },
                  { key: 'Ctrl+G', action: 'Go to Line' },
                  { key: 'Ctrl+W', action: 'Close Tab' },
                ].map(shortcut => (
                  <div key={shortcut.key} className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm">{shortcut.action}</span>
                    <kbd className="px-2 py-1 text-xs bg-muted rounded font-mono">{shortcut.key}</kbd>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ToggleSetting({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      <button
        className={cn(
          'w-11 h-6 rounded-full transition-colors relative',
          value ? 'bg-primary' : 'bg-muted'
        )}
        onClick={() => onChange(!value)}
      >
        <span
          className={cn(
            'absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform',
            value && 'translate-x-5'
          )}
        />
      </button>
    </div>
  );
}

export default SettingsPanel;
