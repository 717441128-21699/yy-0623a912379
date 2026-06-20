import type { MeasurePoint, PointResult, MeasureTask, Unit, InspectionStandard } from "@/types";

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
      const locations = generatePointLocations(inspection.id, room, pointsCount);

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
  const positionLabels = ["左", "中", "右", "上", "下", "左上", "右上", "左下", "右下", "中心"];

  switch (inspectionId) {
    case "wall-vertical":
    case "wall-flat":
      for (const wall of room.walls) {
        for (let i = 0; i < Math.min(3, Math.ceil(count / room.walls.length)); i++) {
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
  const measuredPoints = task.points.filter((p) => p.status === "measured" || p.status === "recheck").length;
  const qualifiedPoints = task.points.filter((p) => p.result === "qualified").length;
  const criticalPoints = task.points.filter((p) => p.result === "critical").length;
  const outPoints = task.points.filter((p) => p.result === "out").length;
  const passRate = measuredPoints > 0 ? Math.round((qualifiedPoints / measuredPoints) * 100) : 0;

  let status: MeasureTask["status"] = task.status;
  if (measuredPoints === 0) status = "pending";
  else if (measuredPoints === task.totalPoints) status = "completed";
  else status = "in_progress";

  return {
    ...task,
    measuredPoints,
    qualifiedPoints,
    criticalPoints,
    outPoints,
    passRate,
    status,
    endTime: status === "completed" ? Date.now() : task.endTime,
  };
}

export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
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

export function getResultColorClass(result: PointResult | undefined): string {
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

export function getResultDotColor(result: PointResult | undefined): string {
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
