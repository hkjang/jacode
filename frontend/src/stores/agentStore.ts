import { create } from 'zustand';
import type { AgentTask, AgentStatus, AgentType } from '@jacode/shared';

interface AgentState {
  // Tasks
  tasks: AgentTask[];
  selectedTaskId: string | null;

  // Filters
  statusFilter: AgentStatus[];
  typeFilter: AgentType[];

  // Connection status
  isConnected: boolean;

  // Actions
  setTasks: (tasks: AgentTask[]) => void;
  addTask: (task: AgentTask) => void;
  updateTask: (taskId: string, updates: Partial<AgentTask>) => void;
  removeTask: (taskId: string) => void;
  selectTask: (taskId: string | null) => void;

  setStatusFilter: (statuses: AgentStatus[]) => void;
  setTypeFilter: (types: AgentType[]) => void;

  setConnected: (connected: boolean) => void;

  // Computed
  getFilteredTasks: () => AgentTask[];
  getTasksByStatus: (status: AgentStatus) => AgentTask[];
  getActiveTasksCount: () => number;
}

export const useAgentStore = create<AgentState>((set, get) => ({
  tasks: [],
  selectedTaskId: null,
  statusFilter: [],
  typeFilter: [],
  isConnected: false,

  setTasks: (tasks) => {
    set({ tasks });
  },

  addTask: (task) => {
    set((state) => ({
      tasks: [task, ...state.tasks],
    }));
  },

  updateTask: (taskId, updates) => {
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, ...updates } : t,
      ),
    }));
  },

  removeTask: (taskId) => {
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== taskId),
      selectedTaskId: state.selectedTaskId === taskId ? null : state.selectedTaskId,
    }));
  },

  selectTask: (taskId) => {
    set({ selectedTaskId: taskId });
  },

  setStatusFilter: (statuses) => {
    set({ statusFilter: statuses });
  },

  setTypeFilter: (types) => {
    set({ typeFilter: types });
  },

  setConnected: (connected) => {
    set({ isConnected: connected });
  },

  getFilteredTasks: () => {
    const { tasks, statusFilter, typeFilter } = get();

    return tasks.filter((task) => {
      if (statusFilter.length > 0 && !statusFilter.includes(task.status)) {
        return false;
      }
      if (typeFilter.length > 0 && !typeFilter.includes(task.type)) {
        return false;
      }
      return true;
    });
  },

  getTasksByStatus: (status) => {
    const { tasks } = get();
    return tasks.filter((t) => t.status === status);
  },

  getActiveTasksCount: () => {
    const { tasks } = get();
    return tasks.filter((t) =>
      ['PENDING', 'PLANNING', 'EXECUTING'].includes(t.status),
    ).length;
  },
}));
