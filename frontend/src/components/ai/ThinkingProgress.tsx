'use client';

import React, { useEffect, useState } from 'react';
import styles from './ThinkingProgress.module.css';

/**
 * Thinking step type
 */
export interface ThinkingStep {
  id: string;
  type: 'analyzing' | 'planning' | 'reasoning' | 'executing' | 'validating' | 'completed';
  title: string;
  description?: string;
  status: 'active' | 'completed' | 'error';
  startTime: string;
  endTime?: string;
}

/**
 * Thinking progress event
 */
export interface ThinkingProgressEvent {
  sessionId: string;
  currentStep: ThinkingStep;
  allSteps: ThinkingStep[];
  progress: number;
}

interface ThinkingProgressProps {
  steps: ThinkingStep[];
  currentStep?: ThinkingStep;
  progress: number;
  isStreaming?: boolean;
  collapsed?: boolean;
  onToggle?: () => void;
}

const STEP_ICONS: Record<ThinkingStep['type'], string> = {
  analyzing: '🔍',
  planning: '📋',
  reasoning: '🧠',
  executing: '⚡',
  validating: '✅',
  completed: '🎉',
};

const STEP_COLORS: Record<ThinkingStep['type'], string> = {
  analyzing: '#3b82f6',
  planning: '#8b5cf6',
  reasoning: '#f59e0b',
  executing: '#10b981',
  validating: '#06b6d4',
  completed: '#22c55e',
};

/**
 * ThinkingProgress Component
 * 
 * Displays the LLM's thinking process with collapsible steps.
 */
export function ThinkingProgress({
  steps,
  currentStep,
  progress,
  isStreaming = false,
  collapsed = false,
  onToggle,
}: ThinkingProgressProps) {
  const [isCollapsed, setIsCollapsed] = useState(collapsed);

  useEffect(() => {
    setIsCollapsed(collapsed);
  }, [collapsed]);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
    onToggle?.();
  };

  const activeStep = currentStep || steps.find(s => s.status === 'active');

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header} onClick={toggleCollapse}>
        <div className={styles.headerLeft}>
          <span className={styles.thinkingIcon}>
            {isStreaming ? (
              <span className={styles.pulsingDot} />
            ) : (
              '💭'
            )}
          </span>
          <span className={styles.title}>
            {isStreaming ? 'Thinking...' : 'Thinking Process'}
          </span>
          {activeStep && (
            <span className={styles.activeStep}>
              {STEP_ICONS[activeStep.type]} {activeStep.title}
            </span>
          )}
        </div>
        <div className={styles.headerRight}>
          <span className={styles.progress}>{progress}%</span>
          <span className={styles.collapseIcon}>
            {isCollapsed ? '▼' : '▲'}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className={styles.progressBar}>
        <div 
          className={styles.progressFill}
          style={{ 
            width: `${progress}%`,
            background: activeStep 
              ? STEP_COLORS[activeStep.type]
              : '#3b82f6'
          }}
        />
      </div>

      {/* Steps List */}
      {!isCollapsed && (
        <div className={styles.stepsList}>
          {steps.map((step, index) => (
            <div 
              key={step.id}
              className={`${styles.step} ${styles[step.status]}`}
            >
              <div className={styles.stepIcon}>
                {step.status === 'active' ? (
                  <span className={styles.spinnerIcon} />
                ) : step.status === 'completed' ? (
                  '✓'
                ) : step.status === 'error' ? (
                  '✗'
                ) : (
                  STEP_ICONS[step.type]
                )}
              </div>
              <div className={styles.stepContent}>
                <div className={styles.stepTitle}>
                  <span>{step.title}</span>
                  {step.endTime && step.startTime && (
                    <span className={styles.stepDuration}>
                      {getDuration(step.startTime, step.endTime)}
                    </span>
                  )}
                </div>
                {step.description && (
                  <div className={styles.stepDescription}>
                    {step.description}
                  </div>
                )}
              </div>
              <div 
                className={styles.stepIndicator}
                style={{ 
                  backgroundColor: step.status === 'active'
                    ? STEP_COLORS[step.type]
                    : step.status === 'completed'
                    ? '#22c55e'
                    : '#ef4444'
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Calculate duration between two ISO timestamps
 */
function getDuration(startTime: string, endTime: string): string {
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  const ms = end - start;
  
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

export default ThinkingProgress;
