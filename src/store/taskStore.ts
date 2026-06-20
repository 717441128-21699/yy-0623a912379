import { create } from "zustand";
import type {
  MeasureTask,
  TaskSelection,
  MeasurePoint,
  PointResult,
  RectificationStatus,
  RectificationRecord,
} from "@/types";
import {
  BUILDINGS,
  UNITS,
  INSPECTION_STANDARDS,
  getFloorName,
} from "@/data/mockData";
import {
  generatePoints,
  updateTaskStats,
  calculateResult,
} from "@/utils/measureUtils";

const STORAGE_KEY = "quality-measure-tasks-v1";
const SELECTION_KEY = "quality-measure-selection-v1";

function loadTasksFromStorage(): MeasureTask[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as MeasureTask[];
  } catch {
    return [];
  }
}

function saveTasksToStorage(tasks: MeasureTask[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    // storage full etc. ignore silently
  }
}

function loadSelectionFromStorage(): TaskSelection | null {
  try {
    const raw = localStorage.getItem(SELECTION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as TaskSelection;
  } catch {
    return null;
  }
}

function saveSelectionToStorage(selection: TaskSelection) {
  try {
    localStorage.setItem(SELECTION_KEY, JSON.stringify(selection));
  } catch {
    // ignore
  }
}

interface TaskStore {
  tasks: MeasureTask[];
  currentTaskId: string | null;
  selection: TaskSelection;

  setSelection: (selection: Partial<TaskSelection>) => void;
  createTask: (inspectorName: string) => MeasureTask;
  loadTask: (taskId: string) => void;
  getCurrentTask: () => MeasureTask | undefined;
  getTaskById: (taskId: string) => MeasureTask | undefined;

  updatePoint: (pointId: string, updates: Partial<MeasurePoint>) => void;
  updatePointDraft: (pointId: string, draftValue?: string, draftPhotos?: string[]) => void;
  clearPointDraft: (pointId: string) => void;

  recordMeasurement: (
    pointId: string,
    measuredValue: number,
    photos?: string[]
  ) => { result: PointResult; deviation: number; deviationPercent: number };

  markPointForRecheck: (pointId: string) => void;
  recordRecheckMeasurement: (
    pointId: string,
    measuredValue: number,
    photos?: string[]
  ) => { result: PointResult; deviation: number; deviationPercent: number };

  updateTaskNavigation: (index: number, inspectionFilter: string | null) => void;

  setPointRectification: (
    pointId: string,
    status: RectificationStatus,
    remark?: string,
    rectifiedValue?: number,
    rectifiedPhotos?: string[],
    recheckerName?: string,
    recheckRemark?: string,
    recheckPhotos?: string[]
  ) => void;

  addRectificationRecord: (
    pointId: string,
    status: RectificationStatus,
    remark?: string,
    rectifiedValue?: number,
    rectifiedPhotos?: string[],
    recheckerName?: string
  ) => void;

  batchSetRectification: (
    pointIds: string[],
    status: RectificationStatus,
    remark?: string,
    recheckerName?: string
  ) => void;

  batchAssignTeam: (
    teamId: string,
    deadline: number,
    remark?: string
  ) => void;

  completeTask: () => void;
  assignTeam: (teamId: string, deadline: number, remark?: string) => void;

  resetSelection: () => void;
  clearAllTasks: () => void;
}

const defaultSelection: TaskSelection = {
  buildingId: BUILDINGS[0].id,
  floorNumber: 5,
  unitId: UNITS[0].id,
  inspectionIds: INSPECTION_STANDARDS.map((s) => s.id),
};

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: loadTasksFromStorage(),
  currentTaskId: null,
  selection: loadSelectionFromStorage() ?? defaultSelection,

  setSelection: (partial) => {
    set((state) => {
      const next = { ...state.selection, ...partial };
      saveSelectionToStorage(next);
      return { selection: next };
    });
  },

  createTask: (inspectorName) => {
    const { selection, tasks } = get();
    const building = BUILDINGS.find((b) => b.id === selection.buildingId)!;
    const unit = UNITS.find((u) => u.id === selection.unitId)!;
    const selectedInspections = INSPECTION_STANDARDS.filter((s) =>
      selection.inspectionIds.includes(s.id)
    );

    const points = generatePoints(unit, selectedInspections);

    const task: MeasureTask = {
      id: `task-${Date.now()}`,
      buildingId: building.id,
      buildingName: building.name,
      floorNumber: selection.floorNumber,
      floorName: getFloorName(selection.floorNumber),
      unitId: unit.id,
      unitName: unit.name,
      unitType: unit.type,
      inspectionIds: selection.inspectionIds,
      points,
      totalPoints: points.length,
      measuredPoints: 0,
      qualifiedPoints: 0,
      criticalPoints: 0,
      outPoints: 0,
      recheckPendingPoints: 0,
      passRate: 0,
      status: "pending",
      startTime: Date.now(),
      inspectorName,
      currentPointIndex: 0,
      currentInspectionFilter: null,
    };

    const nextTasks = [...tasks, task];
    saveTasksToStorage(nextTasks);

    set({
      tasks: nextTasks,
      currentTaskId: task.id,
    });

    return task;
  },

  loadTask: (taskId) => {
    const { tasks } = get();
    if (tasks.some((t) => t.id === taskId)) {
      set({ currentTaskId: taskId });
    }
  },

  getCurrentTask: () => {
    const { tasks, currentTaskId } = get();
    return tasks.find((t) => t.id === currentTaskId);
  },

  getTaskById: (taskId) => {
    return get().tasks.find((t) => t.id === taskId);
  },

  updatePoint: (pointId, updates) => {
    set((state) => {
      const task = state.tasks.find((t) => t.id === state.currentTaskId);
      if (!task) return state;

      const newPoints = task.points.map((p) =>
        p.id === pointId ? { ...p, ...updates } : p
      );
      const newTask = updateTaskStats({ ...task, points: newPoints });
      const nextTasks = state.tasks.map((t) =>
        t.id === task.id ? newTask : t
      );
      saveTasksToStorage(nextTasks);

      return { tasks: nextTasks };
    });
  },

  updatePointDraft: (pointId, draftValue, draftPhotos) => {
    set((state) => {
      const task = state.tasks.find((t) => t.id === state.currentTaskId);
      if (!task) return state;

      const newPoints = task.points.map((p) =>
        p.id === pointId
          ? {
              ...p,
              draftValue: draftValue !== undefined ? draftValue : p.draftValue,
              draftPhotos: draftPhotos !== undefined ? draftPhotos : p.draftPhotos,
            }
          : p
      );
      const nextTasks = state.tasks.map((t) =>
        t.id === task.id ? { ...task, points: newPoints } : t
      );
      saveTasksToStorage(nextTasks);
      return { tasks: nextTasks };
    });
  },

  clearPointDraft: (pointId) => {
    set((state) => {
      const task = state.tasks.find((t) => t.id === state.currentTaskId);
      if (!task) return state;

      const newPoints = task.points.map((p) =>
        p.id === pointId
          ? { ...p, draftValue: undefined, draftPhotos: [] }
          : p
      );
      const nextTasks = state.tasks.map((t) =>
        t.id === task.id ? { ...task, points: newPoints } : t
      );
      saveTasksToStorage(nextTasks);
      return { tasks: nextTasks };
    });
  },

  recordMeasurement: (pointId, measuredValue, photos = []) => {
    const { getCurrentTask, updatePoint } = get();
    const task = getCurrentTask()!;
    const point = task.points.find((p) => p.id === pointId)!;
    const inspection = INSPECTION_STANDARDS.find(
      (s) => s.id === point.inspectionId
    )!;

    const { deviation, deviationPercent, result } = calculateResult(
      measuredValue,
      point.standardValue,
      point.allowableDeviation,
      inspection.criticalRatio
    );

    const isProblem = result === "out" || result === "critical";
    updatePoint(pointId, {
      measuredValue,
      deviation,
      deviationPercent,
      result,
      status: "measured",
      photos: [...point.photos, ...photos],
      rectificationStatus: isProblem
        ? point.rectificationStatus === "none"
          ? "pending"
          : point.rectificationStatus
        : "none",
    });

    return { result, deviation, deviationPercent };
  },

  markPointForRecheck: (pointId) => {
    const { getCurrentTask } = get();
    const task = getCurrentTask()!;
    const point = task.points.find((p) => p.id === pointId)!;

    get().updatePoint(pointId, {
      status: "recheck_pending",
      measuredValue: undefined,
      deviation: undefined,
      deviationPercent: undefined,
      result: undefined,
      isRechecked: true,
      recheckCount: point.recheckCount + 1,
      rectificationStatus:
        point.rectificationStatus === "none" ? "none" : point.rectificationStatus,
    });
  },

  recordRecheckMeasurement: (pointId, measuredValue, photos = []) => {
    const { getCurrentTask, updatePoint } = get();
    const task = getCurrentTask()!;
    const point = task.points.find((p) => p.id === pointId)!;
    const inspection = INSPECTION_STANDARDS.find(
      (s) => s.id === point.inspectionId
    )!;

    const { deviation, deviationPercent, result } = calculateResult(
      measuredValue,
      point.standardValue,
      point.allowableDeviation,
      inspection.criticalRatio
    );

    const isProblem = result === "out" || result === "critical";
    updatePoint(pointId, {
      measuredValue,
      deviation,
      deviationPercent,
      result,
      status: "recheck_done",
      isRechecked: true,
      photos: [...point.photos, ...photos],
      rectificationStatus: isProblem
        ? point.rectificationStatus === "none"
          ? "pending"
          : point.rectificationStatus
        : "none",
    });

    return { result, deviation, deviationPercent };
  },

  updateTaskNavigation: (index, inspectionFilter) => {
    set((state) => {
      const task = state.tasks.find((t) => t.id === state.currentTaskId);
      if (!task) return state;
      const newTask = {
        ...task,
        currentPointIndex: index,
        currentInspectionFilter: inspectionFilter,
      };
      const nextTasks = state.tasks.map((t) =>
        t.id === task.id ? newTask : t
      );
      saveTasksToStorage(nextTasks);
      return { tasks: nextTasks };
    });
  },

  setPointRectification: (
    pointId,
    status,
    remark,
    rectifiedValue,
    rectifiedPhotos = [],
    recheckerName,
    recheckRemark,
    recheckPhotos = []
  ) => {
    const { getCurrentTask } = get();
    const task = getCurrentTask()!;
    const point = task.points.find((p) => p.id === pointId)!;

    const isRecheckComplete = status === "recheck_pass" || status === "recheck_fail";

    get().updatePoint(pointId, {
      rectificationStatus: status,
      rectificationRemark: remark ?? point.rectificationRemark,
      rectifiedValue: rectifiedValue ?? point.rectifiedValue,
      rectifiedPhotos: [...point.rectifiedPhotos, ...rectifiedPhotos],
      rectifiedAt:
        status !== "pending" && status !== "none" ? Date.now() : point.rectifiedAt,
      recheckerName: recheckerName ?? point.recheckerName,
      recheckRemark: isRecheckComplete
        ? recheckRemark ?? point.recheckRemark
        : point.recheckRemark,
      recheckPhotos: isRecheckComplete
        ? [...point.recheckPhotos, ...recheckPhotos]
        : point.recheckPhotos,
      recheckedAt: isRecheckComplete ? Date.now() : point.recheckedAt,
    });
  },

  addRectificationRecord: (
    pointId,
    status,
    remark,
    rectifiedValue,
    rectifiedPhotos = [],
    recheckerName
  ) => {
    const { getCurrentTask, updatePoint } = get();
    const task = getCurrentTask()!;
    const point = task.points.find((p) => p.id === pointId)!;

    const historyRecord: RectificationRecord = {
      id: `rect-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      status: point.rectificationStatus,
      rectifiedValue: point.rectifiedValue,
      rectifiedAt: point.rectifiedAt ?? Date.now(),
      rectificationRemark: point.rectificationRemark,
      rectifiedPhotos: [...point.rectifiedPhotos],
      recheckerName: point.recheckerName,
      recheckRemark: point.recheckRemark,
      recheckPhotos: [...point.recheckPhotos],
      recheckedAt: point.recheckedAt,
    };

    updatePoint(pointId, {
      rectificationStatus: status,
      rectificationRemark: remark,
      rectifiedValue,
      rectifiedPhotos,
      rectifiedAt: Date.now(),
      recheckerName,
      recheckRemark: undefined,
      recheckPhotos: [],
      recheckedAt: undefined,
      rectificationHistory: [...point.rectificationHistory, historyRecord],
    });
  },

  batchSetRectification: (pointIds, status, remark, recheckerName) => {
    set((state) => {
      const task = state.tasks.find((t) => t.id === state.currentTaskId);
      if (!task) return state;

      const newPoints = task.points.map((p) => {
        if (!pointIds.includes(p.id)) return p;
        return {
          ...p,
          rectificationStatus: status,
          rectificationRemark: remark ?? p.rectificationRemark,
          rectifiedAt:
            status !== "pending" && status !== "none"
              ? Date.now()
              : p.rectifiedAt,
          recheckerName: recheckerName ?? p.recheckerName,
        };
      });
      const newTask = updateTaskStats({ ...task, points: newPoints });
      const nextTasks = state.tasks.map((t) =>
        t.id === task.id ? newTask : t
      );
      saveTasksToStorage(nextTasks);
      return { tasks: nextTasks };
    });
  },

  batchAssignTeam: (teamId, deadline, remark) => {
    set((state) => {
      const task = state.tasks.find((t) => t.id === state.currentTaskId);
      if (!task) return state;

      const withAssignment = {
        ...task,
        teamId,
        deadline,
        remark,
      };
      const nextTasks = state.tasks.map((t) =>
        t.id === task.id ? withAssignment : t
      );
      saveTasksToStorage(nextTasks);
      return { tasks: nextTasks };
    });
  },

  completeTask: () => {
    set((state) => {
      const task = state.tasks.find((t) => t.id === state.currentTaskId);
      if (!task) return state;

      const newTask = updateTaskStats({
        ...task,
        status: "completed",
        endTime: Date.now(),
      });
      const nextTasks = state.tasks.map((t) =>
        t.id === task.id ? newTask : t
      );
      saveTasksToStorage(nextTasks);

      return { tasks: nextTasks };
    });
  },

  assignTeam: (teamId, deadline, remark) => {
    set((state) => {
      const task = state.tasks.find((t) => t.id === state.currentTaskId);
      if (!task) return state;

      const withAssignment = {
        ...task,
        teamId,
        deadline,
        remark,
      };
      const nextTasks = state.tasks.map((t) =>
        t.id === task.id ? withAssignment : t
      );
      saveTasksToStorage(nextTasks);
      return { tasks: nextTasks };
    });
  },

  resetSelection: () => {
    saveSelectionToStorage(defaultSelection);
    set({
      selection: defaultSelection,
      currentTaskId: null,
    });
  },

  clearAllTasks: () => {
    saveTasksToStorage([]);
    set({ tasks: [], currentTaskId: null });
  },
}));
