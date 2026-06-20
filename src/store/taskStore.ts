import { create } from "zustand";
import type { MeasureTask, TaskSelection, MeasurePoint, PointResult } from "@/types";
import { BUILDINGS, UNITS, INSPECTION_STANDARDS, getFloorName } from "@/data/mockData";
import { generatePoints, updateTaskStats, calculateResult } from "@/utils/measureUtils";

interface TaskStore {
  tasks: MeasureTask[];
  currentTaskId: string | null;
  selection: TaskSelection;
  setSelection: (selection: Partial<TaskSelection>) => void;
  createTask: (inspectorName: string) => MeasureTask;
  getCurrentTask: () => MeasureTask | undefined;
  updatePoint: (pointId: string, updates: Partial<MeasurePoint>) => void;
  recordMeasurement: (
    pointId: string,
    measuredValue: number,
    photos?: string[]
  ) => { result: PointResult; deviation: number; deviationPercent: number };
  completeTask: () => void;
  assignTeam: (teamId: string, deadline: number, remark?: string) => void;
  resetSelection: () => void;
}

const defaultSelection: TaskSelection = {
  buildingId: BUILDINGS[0].id,
  floorNumber: 5,
  unitId: UNITS[0].id,
  inspectionIds: INSPECTION_STANDARDS.map((s) => s.id),
};

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  currentTaskId: null,
  selection: defaultSelection,

  setSelection: (partial) =>
    set((state) => ({
      selection: { ...state.selection, ...partial },
    })),

  createTask: (inspectorName) => {
    const { selection } = get();
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
      passRate: 0,
      status: "pending",
      startTime: Date.now(),
      inspectorName,
    };

    set((state) => ({
      tasks: [...state.tasks, task],
      currentTaskId: task.id,
    }));

    return task;
  },

  getCurrentTask: () => {
    const { tasks, currentTaskId } = get();
    return tasks.find((t) => t.id === currentTaskId);
  },

  updatePoint: (pointId, updates) =>
    set((state) => {
      const task = state.tasks.find((t) => t.id === state.currentTaskId);
      if (!task) return state;

      const newPoints = task.points.map((p) =>
        p.id === pointId ? { ...p, ...updates } : p
      );
      const newTask = updateTaskStats({ ...task, points: newPoints });

      return {
        tasks: state.tasks.map((t) => (t.id === task.id ? newTask : t)),
      };
    }),

  recordMeasurement: (pointId, measuredValue, photos = []) => {
    const { getCurrentTask, updatePoint } = get();
    const task = getCurrentTask()!;
    const point = task.points.find((p) => p.id === pointId)!;
    const inspection = INSPECTION_STANDARDS.find((s) => s.id === point.inspectionId)!;

    const { deviation, deviationPercent, result } = calculateResult(
      measuredValue,
      point.standardValue,
      point.allowableDeviation,
      inspection.criticalRatio
    );

    updatePoint(pointId, {
      measuredValue,
      deviation,
      deviationPercent,
      result,
      status: "measured",
      photos: [...point.photos, ...photos],
    });

    return { result, deviation, deviationPercent };
  },

  completeTask: () =>
    set((state) => {
      const task = state.tasks.find((t) => t.id === state.currentTaskId);
      if (!task) return state;

      const newTask = updateTaskStats({
        ...task,
        status: "completed",
        endTime: Date.now(),
      });

      return {
        tasks: state.tasks.map((t) => (t.id === task.id ? newTask : t)),
      };
    }),

  assignTeam: (teamId, deadline, remark) =>
    set((state) => {
      const task = state.tasks.find((t) => t.id === state.currentTaskId);
      if (!task) return state;

      return {
        tasks: state.tasks.map((t) =>
          t.id === task.id ? { ...t, teamId, deadline, remark } : t
        ),
      };
    }),

  resetSelection: () =>
    set({
      selection: defaultSelection,
      currentTaskId: null,
    }),
}));
