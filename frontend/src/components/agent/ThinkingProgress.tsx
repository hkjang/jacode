'use client';

import React from 'react';
import styles from './ThinkingProgress.module.css';

interface ThinkingStep {
  id: string;
  type: 'planning' | 'executing' | 'validating' | 'reasoning' | 'complete';
  description: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  startTime?: number;
  endTime?: number;
  result?: any;
  error?: string;
}

interface ThinkingProgressProps {
  sessionId: string;
  steps: ThinkingStep[];
  isActive: boolean;
  thinkingContent?: string;
}

const typeIcons: Record<string, string> = {
  planning: '📋',
  executing: '⚡',
  validating: '✅',
  reasoning: '🧠',
  complete: '🎯',
};

const typeColors: Record<string, string> = {
  planning: '#58a6ff',
  executing: '#3fb950',
  validating: '#d29922',
  reasoning: '#a371f7',
  complete: '#238636',
};

export default function ThinkingProgress({ 
  sessionId, 
  steps, 
  isActive, 
  thinkingContent 
}: ThinkingProgressProps) {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.title}>
          <span className={styles.icon}>🤖</span>
          Agent Thinking
          {isActive && <span className={styles.activeDot} />}
        </div>
        <span className={styles.sessionId}>{sessionId}</span>
      </div>

      <div className={styles.timeline}>
        {steps.map((step, index) => (
          <div 
            key={step.id} 
            className={`${styles.step} ${styles[step.status]}`}
            style={{ '--step-color': typeColors[step.type] } as React.CSSProperties}
          >
            <div className={styles.stepIcon}>
              {step.status === 'active' ? (
                <div className={styles.spinner} />
              ) : step.status === 'error' ? (
                '❌'
              ) : step.status === 'completed' ? (
                '✓'
              ) : (
                typeIcons[step.type]
              )}
            </div>
            
            <div className={styles.stepContent}>
              <div className={styles.stepHeader}>
                <span className={styles.stepType}>{step.type}</span>
                {step.startTime && step.endTime && (
                  <span className={styles.duration}>
                    {((step.endTime - step.startTime) / 1000).toFixed(1)}s
                  </span>
                )}
              </div>
              <div className={styles.stepDescription}>{step.description}</div>
              {step.error && (
                <div className={styles.stepError}>{step.error}</div>
              )}
            </div>

            {index < steps.length - 1 && <div className={styles.connector} />}
          </div>
        ))}
      </div>

      {thinkingContent && (
        <div className={styles.thinkingSection}>
          <div className={styles.thinkingHeader}>
            <span className={styles.thinkingIcon}>💭</span>
            Current Thought
          </div>
          <div className={styles.thinkingContent}>
            {thinkingContent}
            {isActive && <span className={styles.cursor}>|</span>}
          </div>
        </div>
      )}
    </div>
  );
}
