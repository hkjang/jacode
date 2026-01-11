'use client';

import { useState, useCallback, useRef } from 'react';

interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

interface UseUndoRedoOptions {
  maxHistory?: number;
}

export function useUndoRedo<T>(initialState: T, options: UseUndoRedoOptions = {}) {
  const { maxHistory = 100 } = options;
  
  const [state, setState] = useState<HistoryState<T>>({
    past: [],
    present: initialState,
    future: [],
  });

  const canUndo = state.past.length > 0;
  const canRedo = state.future.length > 0;

  const set = useCallback((newPresent: T | ((prev: T) => T)) => {
    setState((prevState) => {
      const resolvedPresent = typeof newPresent === 'function' 
        ? (newPresent as (prev: T) => T)(prevState.present)
        : newPresent;

      // Don't add to history if nothing changed
      if (resolvedPresent === prevState.present) {
        return prevState;
      }

      const newPast = [...prevState.past, prevState.present].slice(-maxHistory);

      return {
        past: newPast,
        present: resolvedPresent,
        future: [],
      };
    });
  }, [maxHistory]);

  const undo = useCallback(() => {
    setState((prevState) => {
      if (prevState.past.length === 0) return prevState;

      const newPast = prevState.past.slice(0, -1);
      const newPresent = prevState.past[prevState.past.length - 1];
      const newFuture = [prevState.present, ...prevState.future];

      return {
        past: newPast,
        present: newPresent,
        future: newFuture,
      };
    });
  }, []);

  const redo = useCallback(() => {
    setState((prevState) => {
      if (prevState.future.length === 0) return prevState;

      const newFuture = prevState.future.slice(1);
      const newPresent = prevState.future[0];
      const newPast = [...prevState.past, prevState.present];

      return {
        past: newPast,
        present: newPresent,
        future: newFuture,
      };
    });
  }, []);

  const reset = useCallback((newPresent: T) => {
    setState({
      past: [],
      present: newPresent,
      future: [],
    });
  }, []);

  const clear = useCallback(() => {
    setState((prevState) => ({
      past: [],
      present: prevState.present,
      future: [],
    }));
  }, []);

  return {
    state: state.present,
    set,
    undo,
    redo,
    reset,
    clear,
    canUndo,
    canRedo,
    historyLength: state.past.length + state.future.length,
  };
}

// File content history tracker
interface FileVersion {
  content: string;
  timestamp: Date;
  label?: string;
}

interface FileHistoryOptions {
  maxVersions?: number;
  autoSaveInterval?: number; // ms
}

export function useFileHistory(
  filePath: string,
  initialContent: string,
  options: FileHistoryOptions = {}
) {
  const { maxVersions = 50, autoSaveInterval = 30000 } = options;
  
  const [versions, setVersions] = useState<Map<string, FileVersion[]>>(new Map());
  const lastAutoSave = useRef<Date | null>(null);

  const addVersion = useCallback((content: string, label?: string) => {
    setVersions(prev => {
      const fileVersions = prev.get(filePath) || [];
      const newVersion: FileVersion = {
        content,
        timestamp: new Date(),
        label,
      };
      const updated = [...fileVersions, newVersion].slice(-maxVersions);
      return new Map(prev).set(filePath, updated);
    });
  }, [filePath, maxVersions]);

  const getVersions = useCallback(() => {
    return versions.get(filePath) || [];
  }, [versions, filePath]);

  const restoreVersion = useCallback((index: number): string | null => {
    const fileVersions = versions.get(filePath);
    if (!fileVersions || index < 0 || index >= fileVersions.length) {
      return null;
    }
    return fileVersions[index].content;
  }, [versions, filePath]);

  const shouldAutoSave = useCallback((content: string): boolean => {
    const now = new Date();
    if (!lastAutoSave.current || 
        now.getTime() - lastAutoSave.current.getTime() >= autoSaveInterval) {
      lastAutoSave.current = now;
      return true;
    }
    return false;
  }, [autoSaveInterval]);

  return {
    addVersion,
    getVersions,
    restoreVersion,
    shouldAutoSave,
    versionCount: (versions.get(filePath) || []).length,
  };
}

export default useUndoRedo;
