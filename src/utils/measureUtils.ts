import type {
  MeasurePoint,
  PointResult,
  MeasureTask,
  Unit,
  InspectionStandard,
  RectificationStatus,
} from "@/types";

export function calculateResult(
  measuredValue: number,
  standardValue: number,
  allowableDeviation: number,
  criticalRatio: number
): {
  deviation: number;
  deviationPercent: number;
  result: PointResult;
} {
  const deviation = measuredValue - standardValue;
  const deviationPercent = Math.abs(deviation) / allowableDeviation;

  let result: PointResult;
  if (deviationPercent > 1) {
    result = "out";
  } else if (deviationPercent >= criticalRatio) {
    result = "critical";
  } else {
    result = "qualified";
  }

  return { deviation, deviationPercent, result };
}

export function getStandardValue(inspectionId: string): number {
  switch (inspectionId) {
    case "room-depth":
      return 3600;
    case "room-height":
      return 2800;
    default:
      return 0;
  }
}

export function generatePoints(
  unit: Unit,
  selectedInspections: InspectionStandard[]
): MeasurePoint[] {
  const points: MeasurePoint[] = [];
  let sequence = 1;

  for (const inspection of selectedInspections) {
    for (const room of unit.rooms) {
      const pointsCount = inspection.pointsPerRoom;
      const locations = generatePointLocations(
        inspection.id,
        room,
        pointsCount
      );

      for (let i = 0; i < pointsCount && i < locations.length; i++) {
        points.push({
          id: `${inspection.id}-${room.id}-${i}`,
          inspectionId: inspection.id,
          inspectionName: inspection.name,
          roomId: room.id,
          roomName: room.name,
          location: locations[i],
          sequence: sequence++,
          standardValue: getStandardValue(inspection.id),
          allowableDeviation: inspection.allowableDeviation,
          status: "pending",
          photos: [],
          recheckCount: 0,
          rectificationStatus: "none",
          rectifiedPhotos: [],
        });
      }
    }
  }

  return points.sort((a, b) => a.sequence - b.sequence);
}

function generatePointLocations(
  inspectionId: string,
  room: { name: string; walls: { direction: string }[] },
  count: number
): string[] {
  const locations: string[] = [];
  const positionLabels = [
    "左",
    "中",
    "右",
    "上",
    "下",
    "左上",
    "右上",
    "左下",
    "右下",
    "中心",
  ];

  switch (inspectionId) {
    case "wall-vertical":
    case "wall-flat":
      for (const wall of room.walls) {
        for (
          let i = 0;
          i < Math.min(3, Math.ceil(count / room.walls.length));
          i++
        ) {
          if (locations.length >= count) break;
          const pos = i === 0 ? "左" : i === 1 ? "中" : "右";
          locations.push(`${wall.direction}-${pos}`);
        }
        if (locations.length >= count) break;
      }
      while (locations.length < count && room.walls.length > 0) {
        const wall = room.walls[locations.length % room.walls.length];
        locations.push(`${wall.direction}-补测${locations.length}`);
      }
      break;

    case "room-depth":
      locations.push("开间(东西向)");
      if (count >= 2) locations.push("进深(南北向)");
      break;

    case "corner-square":
      const corners = ["东北角", "东南角", "西南角", "西北角"];
      for (let i = 0; i < Math.min(count, corners.length); i++) {
        locations.push(corners[i]);
      }
      break;

    case "floor-flat":
      locations.push("门口处");
      if (count >= 2) locations.push("房间中央");
      if (count >= 3) locations.push("靠窗侧");
      break;

    case "room-height":
      const heightPts = ["东南角", "西南角", "西北角", "东北角", "中心点"];
      for (let i = 0; i < Math.min(count, heightPts.length); i++) {
        locations.push(heightPts[i]);
      }
      break;

    default:
      for (let i = 0; i < count; i++) {
        locations.push(positionLabels[i % positionLabels.length]);
      }
  }

  return locations;
}

export function updateTaskStats(task: MeasureTask): MeasureTask {
  const isCounted = (p: MeasurePoint) =>
    p.status === "measured" || p.status === "recheck_done";

  const measuredPoints = task.points.filter(isCounted).length;
  const recheckPendingPoints = task.points.filter(
    (p) => p.status === "recheck_pending"
  ).length;
  const qualifiedPoints = task.points.filter(
    (p) => isCounted(p) && p.result === "qualified"
  ).length;
  const criticalPoints = task.points.filter(
    (p) => isCounted(p) && p.result === "critical"
  ).length;
  const outPoints = task.points.filter(
    (p) => isCounted(p) && p.result === "out"
  ).length;
  const passRate =
    measuredPoints > 0
      ? Math.round((qualifiedPoints / measuredPoints) * 100)
      : 0;

  let status: MeasureTask["status"] = task.status;
  if (measuredPoints === 0 && recheckPendingPoints === 0) status = "pending";
  else if (measuredPoints + recheckPendingPoints === task.totalPoints && recheckPendingPoints === 0)
    status = "completed";
  else status = "in_progress";

  return {
    ...task,
    measuredPoints,
    qualifiedPoints,
    criticalPoints,
    outPoints,
    recheckPendingPoints,
    passRate,
    status,
    endTime: status === "completed" ? Date.now() : task.endTime,
  };
}

export function calculateRoomStats(points: MeasurePoint[]): {
  roomId: string;
  roomName: string;
  total: number;
  measured: number;
  qualified: number;
  critical: number;
  out: number;
  pending: number;
  recheckPending: number;
  passRate: number;
  isComplete: boolean;
  problemPoints: MeasurePoint[];
}[] {
  const byRoom = new Map<string, MeasurePoint[]>();
  for (const p of points) {
    if (!byRoom.has(p.roomName)) byRoom.set(p.roomName, []);
    byRoom.get(p.roomName)!.push(p);
  }

  const stats = Array.from(byRoom.entries()).map(([roomName, roomPoints]) => {
    const sample = roomPoints[0];
    const isCounted = (p: MeasurePoint) =>
      p.status === "measured" || p.status === "recheck_done";
    const measured = roomPoints.filter(isCounted).length;
    const recheckPending = roomPoints.filter(
      (p) => p.status === "recheck_pending"
    ).length;
    const qualified = roomPoints.filter(
      (p) => isCounted(p) && p.result === "qualified"
    ).length;
    const critical = roomPoints.filter(
      (p) => isCounted(p) && p.result === "critical"
    ).length;
    const out = roomPoints.filter(
      (p) => isCounted(p) && p.result === "out"
    ).length;
    const pending = roomPoints.filter((p) => p.status === "pending").length;
    const problemPoints = roomPoints.filter(
      (p) =>
        isCounted(p) &&
        (p.result === "out" || p.result === "critical")
    );
    const passRate =
      measured > 0 ? Math.round((qualified / measured) * 100) : 0;

    return {
      roomId: sample.roomId,
      roomName,
      total: roomPoints.length,
      measured,
      qualified,
      critical,
      out,
      pending,
      recheckPending,
      passRate,
      isComplete: measured + recheckPending === roomPoints.length && recheckPending === 0,
      problemPoints,
    };
  });

  return stats;
}

export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")} ${String(
    date.getHours()
  ).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function getResultLabel(result: PointResult | undefined): string {
  switch (result) {
    case "qualified":
      return "合格";
    case "critical":
      return "临界";
    case "out":
      return "超差";
    default:
      return "未测";
  }
}

export function getResultColorClass(
  result: PointResult | undefined
): string {
  switch (result) {
    case "qualified":
      return "bg-status-qualifiedBg text-status-qualified border-status-qualified/30";
    case "critical":
      return "bg-status-criticalBg text-status-critical border-status-critical/30";
    case "out":
      return "bg-status-outBg text-status-out border-status-out/30";
    default:
      return "bg-gray-100 text-gray-500 border-gray-200";
  }
}

export function getResultDotColor(
  result: PointResult | undefined
): string {
  switch (result) {
    case "qualified":
      return "bg-status-qualified";
    case "critical":
      return "bg-status-critical";
    case "out":
      return "bg-status-out";
    default:
      return "bg-gray-300";
  }
}

export function getRectificationLabel(
  status: RectificationStatus
): string {
  switch (status) {
    case "none":
      return "无问题";
    case "pending":
      return "待整改";
    case "fixed":
      return "已整改待复查";
    case "recheck_pass":
      return "复查合格";
    case "recheck_fail":
      return "仍超差";
    default:
      return "";
  }
}

export function getRectificationColorClass(
  status: RectificationStatus
): string {
  switch (status) {
    case "none":
      return "bg-gray-100 text-gray-500 border-gray-200";
    case "pending":
      return "bg-status-outBg text-status-out border-status-out/30";
    case "fixed":
      return "bg-status-criticalBg text-status-critical border-status-critical/30";
    case "recheck_pass":
      return "bg-status-qualifiedBg text-status-qualified border-status-qualified/30";
    case "recheck_fail":
      return "bg-red-100 text-red-700 border-red-300";
    default:
      return "bg-gray-100 text-gray-500 border-gray-200";
  }
}

export function getPointStatusLabel(status: MeasurePoint["status"]): string {
  switch (status) {
    case "pending":
      return "未测";
    case "measured":
      return "已测";
    case "recheck_pending":
      return "待复测";
    case "recheck_done":
      return "复测完成";
    default:
      return "";
  }
}
