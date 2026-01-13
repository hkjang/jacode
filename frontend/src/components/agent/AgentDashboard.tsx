'use client';

import React, { useState, useEffect } from 'react';
import { agentApi } from '@/lib/api';
import styles from './AgentDashboard.module.css';

interface TokenStats {
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalTokens: number;
  totalCost: number;
  requestCount: number;
  averageTokensPerRequest: number;
  byModel: Record<string, { tokenCount: number; requestCount: number; cost: number }>;
}

interface Session {
  id: string;
  projectRoot: string;
  goal: string;
  state: string;
  createdAt: string;
  filesChanged: string[];
  errors: string[];
}

interface GitStatus {
  isRepo: boolean;
  branch: string | null;
  files: { path: string; status: string; staged: boolean }[];
  branches: { name: string; current: boolean }[];
}

export default function AgentDashboard() {
  const [activeTab, setActiveTab] = useState<'orchestrate' | 'sessions' | 'git' | 'tokens'>('orchestrate');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Orchestration state
  const [goal, setGoal] = useState('');
  const [projectRoot, setProjectRoot] = useState('');
  const [autoApprove, setAutoApprove] = useState(false);
  const [dryRun, setDryRun] = useState(true);
  const [orchestrationResult, setOrchestrationResult] = useState<any>(null);
  
  // Sessions state
  const [sessions, setSessions] = useState<Session[]>([]);
  
  // Git state
  const [gitProjectRoot, setGitProjectRoot] = useState('');
  const [gitStatus, setGitStatus] = useState<GitStatus | null>(null);
  const [commitMessage, setCommitMessage] = useState('');
  
  // Token stats
  const [tokenStats, setTokenStats] = useState<TokenStats | null>(null);

  const handleOrchestrate = async () => {
    if (!goal || !projectRoot) {
      setError('Goal and project root are required');
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const result = await agentApi.orchestrate({ goal, projectRoot, autoApprove, dryRun });
      setOrchestrationResult(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadSessions = async () => {
    try {
      const data = await agentApi.getSessions();
      setSessions(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleApproveSession = async (sessionId: string) => {
    try {
      await agentApi.approveSession(sessionId);
      loadSessions();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRejectSession = async (sessionId: string) => {
    try {
      await agentApi.rejectSession(sessionId);
      loadSessions();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const loadGitStatus = async () => {
    if (!gitProjectRoot) return;
    try {
      const data = await agentApi.getGitStatus(gitProjectRoot);
      setGitStatus(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCommit = async () => {
    if (!gitProjectRoot || !commitMessage) return;
    try {
      await agentApi.gitCommit(gitProjectRoot, commitMessage, true);
      setCommitMessage('');
      loadGitStatus();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const loadTokenStats = async () => {
    try {
      const data = await agentApi.getTokenStats();
      setTokenStats(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    if (activeTab === 'sessions') loadSessions();
    if (activeTab === 'tokens') loadTokenStats();
  }, [activeTab]);

  return (
    <div className={styles.dashboard}>
      <nav className={styles.tabs}>
        <button 
          className={`${styles.tab} ${activeTab === 'orchestrate' ? styles.active : ''}`}
          onClick={() => setActiveTab('orchestrate')}
        >
          🤖 Orchestrate
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'sessions' ? styles.active : ''}`}
          onClick={() => setActiveTab('sessions')}
        >
          📋 Sessions
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'git' ? styles.active : ''}`}
          onClick={() => setActiveTab('git')}
        >
          🔀 Git
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'tokens' ? styles.active : ''}`}
          onClick={() => setActiveTab('tokens')}
        >
          📊 Tokens
        </button>
      </nav>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.content}>
        {activeTab === 'orchestrate' && (
          <div className={styles.panel}>
            <h2>🚀 Start Autonomous Coding</h2>
            
            <div className={styles.formGroup}>
              <label>Goal</label>
              <textarea 
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="Describe what you want to build or change..."
                rows={3}
              />
            </div>
            
            <div className={styles.formGroup}>
              <label>Project Root</label>
              <input 
                type="text"
                value={projectRoot}
                onChange={(e) => setProjectRoot(e.target.value)}
                placeholder="/path/to/project"
              />
            </div>
            
            <div className={styles.checkboxRow}>
              <label>
                <input 
                  type="checkbox"
                  checked={autoApprove}
                  onChange={(e) => setAutoApprove(e.target.checked)}
                />
                Auto-approve changes
              </label>
              <label>
                <input 
                  type="checkbox"
                  checked={dryRun}
                  onChange={(e) => setDryRun(e.target.checked)}
                />
                Dry run (preview only)
              </label>
            </div>
            
            <button 
              className={styles.primaryButton}
              onClick={handleOrchestrate}
              disabled={loading}
            >
              {loading ? 'Running...' : 'Start Orchestration'}
            </button>

            {orchestrationResult && (
              <div className={styles.result}>
                <h3>Result</h3>
                <div className={`${styles.badge} ${orchestrationResult.success ? styles.success : styles.failure}`}>
                  {orchestrationResult.success ? '✅ Success' : '❌ Failed'}
                </div>
                <p>Session: {orchestrationResult.sessionId}</p>
                <p>Files changed: {orchestrationResult.filesChanged?.length || 0}</p>
                <p>Tokens used: {orchestrationResult.tokensUsed?.toLocaleString()}</p>
                <p>Duration: {(orchestrationResult.duration / 1000).toFixed(1)}s</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'sessions' && (
          <div className={styles.panel}>
            <h2>📋 Active Sessions</h2>
            <button className={styles.secondaryButton} onClick={loadSessions}>Refresh</button>
            
            {sessions.length === 0 ? (
              <p className={styles.empty}>No active sessions</p>
            ) : (
              <div className={styles.sessionList}>
                {sessions.map((session) => (
                  <div key={session.id} className={styles.sessionCard}>
                    <div className={styles.sessionHeader}>
                      <span className={`${styles.state} ${styles[session.state]}`}>
                        {session.state}
                      </span>
                      <span className={styles.sessionId}>{session.id}</span>
                    </div>
                    <p className={styles.goal}>{session.goal}</p>
                    <div className={styles.sessionMeta}>
                      <span>Files: {session.filesChanged?.length || 0}</span>
                      <span>Errors: {session.errors?.length || 0}</span>
                    </div>
                    {session.state === 'awaiting_approval' && (
                      <div className={styles.actions}>
                        <button className={styles.approveBtn} onClick={() => handleApproveSession(session.id)}>
                          ✅ Approve
                        </button>
                        <button className={styles.rejectBtn} onClick={() => handleRejectSession(session.id)}>
                          ❌ Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'git' && (
          <div className={styles.panel}>
            <h2>🔀 Git Integration</h2>
            
            <div className={styles.formGroup}>
              <label>Project Root</label>
              <div className={styles.inputRow}>
                <input 
                  type="text"
                  value={gitProjectRoot}
                  onChange={(e) => setGitProjectRoot(e.target.value)}
                  placeholder="/path/to/project"
                />
                <button className={styles.secondaryButton} onClick={loadGitStatus}>Load</button>
              </div>
            </div>

            {gitStatus && (
              <>
                {!gitStatus.isRepo ? (
                  <p className={styles.warning}>Not a git repository</p>
                ) : (
                  <>
                    <div className={styles.gitInfo}>
                      <span className={styles.branch}>Branch: {gitStatus.branch}</span>
                    </div>

                    {gitStatus.files.length > 0 && (
                      <div className={styles.fileList}>
                        <h3>Changed Files ({gitStatus.files.length})</h3>
                        {gitStatus.files.map((file, i) => (
                          <div key={i} className={styles.fileItem}>
                            <span className={`${styles.fileStatus} ${styles[file.status]}`}>
                              {file.status[0].toUpperCase()}
                            </span>
                            <span className={styles.filePath}>{file.path}</span>
                            {file.staged && <span className={styles.staged}>staged</span>}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className={styles.commitSection}>
                      <h3>Commit</h3>
                      <input 
                        type="text"
                        value={commitMessage}
                        onChange={(e) => setCommitMessage(e.target.value)}
                        placeholder="Commit message"
                      />
                      <button 
                        className={styles.primaryButton}
                        onClick={handleCommit}
                        disabled={!commitMessage}
                      >
                        Stage All & Commit
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'tokens' && (
          <div className={styles.panel}>
            <h2>📊 Token Usage</h2>
            <button className={styles.secondaryButton} onClick={loadTokenStats}>Refresh</button>
            
            {tokenStats && (
              <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                  <div className={styles.statValue}>{tokenStats.totalTokens.toLocaleString()}</div>
                  <div className={styles.statLabel}>Total Tokens</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statValue}>${tokenStats.totalCost.toFixed(4)}</div>
                  <div className={styles.statLabel}>Total Cost</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statValue}>{tokenStats.requestCount}</div>
                  <div className={styles.statLabel}>Requests</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statValue}>{Math.round(tokenStats.averageTokensPerRequest)}</div>
                  <div className={styles.statLabel}>Avg Tokens/Request</div>
                </div>
              </div>
            )}

            {tokenStats?.byModel && Object.keys(tokenStats.byModel).length > 0 && (
              <div className={styles.modelBreakdown}>
                <h3>By Model</h3>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Model</th>
                      <th>Tokens</th>
                      <th>Requests</th>
                      <th>Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(tokenStats.byModel).map(([model, stats]) => (
                      <tr key={model}>
                        <td>{model}</td>
                        <td>{stats.tokenCount.toLocaleString()}</td>
                        <td>{stats.requestCount}</td>
                        <td>${stats.cost.toFixed(4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
