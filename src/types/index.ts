export interface Building {
  id: string;
  name: string;
  totalFloors: number;
  basementFloors: number;
}

export interface Room {
  id: string;
  name: string;
  walls: Wall[];
}

export interface Wall {
  id: string;
  direction: string;
}

export interface Unit {
  id: string;
  name: string;
  type: string;
  area: number;
  rooms: Room[];
}

export interface InspectionStandard {
  id: string;
  name: string;
  category: string;
  allowableDeviation: number;
  criticalRatio: number;
  unit: string;
  pointsPerRoom: number;
  description: string;
}

export type PointResult = "qualified" | "critical" | "out";
export type PointStatus = "pending" | "measured" | "recheck_pending" | "recheck_done";

export type RectificationStatus =
  | "none"
  | "pending"
  | "fixed"
  | "recheck_pass"
  | "recheck_fail";

export interface RectificationRecord {
  id: string;
  status: RectificationStatus;
  rectifiedValue?: number;
  rectifiedAt: number;
  rectificationRemark?: string;
  rectifiedPhotos: string[];
  recheckerName?: string;
  recheckRemark?: string;
  recheckPhotos: string[];
  recheckedAt?: number;
}

export interface MeasurePoint {
  id: string;
  inspectionId: string;
  inspectionName: string;
  roomId: string;
  roomName: string;
  location: string;
  sequence: number;
  standardValue: number;
  allowableDeviation: number;
  status: PointStatus;
  measuredValue?: number;
  deviation?: number;
  deviationPercent?: number;
  result?: PointResult;
  photos: string[];
  remark?: string;
  isRechecked?: boolean;
  recheckCount: number;
  rectificationStatus: RectificationStatus;
  rectificationRemark?: string;
  rectifiedValue?: number;
  rectifiedAt?: number;
  rectifiedPhotos: string[];
  recheckerName?: string;
  recheckRemark?: string;
  recheckPhotos: string[];
  recheckedAt?: number;
  rectificationHistory: RectificationRecord[];
  draftValue?: string;
  draftPhotos: string[];
}

export type TaskStatus = "pending" | "in_progress" | "completed";

export interface MeasureTask {
  id: string;
  buildingId: string;
  buildingName: string;
  floorNumber: number;
  floorName: string;
  unitId: string;
  unitName: string;
  unitType: string;
  inspectionIds: string[];
  points: MeasurePoint[];
  totalPoints: number;
  measuredPoints: number;
  qualifiedPoints: number;
  criticalPoints: number;
  outPoints: number;
  recheckPendingPoints: number;
  passRate: number;
  status: TaskStatus;
  startTime: number;
  endTime?: number;
  inspectorName: string;
  teamId?: string;
  deadline?: number;
  remark?: string;
  currentPointIndex: number;
  currentInspectionFilter: string | null;
}

export interface Team {
  id: string;
  name: string;
  leader: string;
  phone: string;
  specialty: string;
}

export interface TaskSelection {
  buildingId: string;
  floorNumber: number;
  unitId: string;
  inspectionIds: string[];
}
