import type { Building, Unit, InspectionStandard, Team } from "@/types";

export const BUILDINGS: Building[] = [
  { id: "b1", name: "1#楼", totalFloors: 33, basementFloors: 2 },
  { id: "b2", name: "2#楼", totalFloors: 33, basementFloors: 2 },
  { id: "b3", name: "3#楼", totalFloors: 28, basementFloors: 2 },
];

const createDefaultRooms = () => [
  {
    id: "r1",
    name: "客厅",
    walls: [
      { id: "w1", direction: "东墙" },
      { id: "w2", direction: "南墙" },
      { id: "w3", direction: "西墙" },
      { id: "w4", direction: "北墙" },
    ],
  },
  {
    id: "r2",
    name: "主卧",
    walls: [
      { id: "w5", direction: "东墙" },
      { id: "w6", direction: "南墙" },
      { id: "w7", direction: "西墙" },
      { id: "w8", direction: "北墙" },
    ],
  },
  {
    id: "r3",
    name: "次卧",
    walls: [
      { id: "w9", direction: "东墙" },
      { id: "w10", direction: "南墙" },
      { id: "w11", direction: "西墙" },
      { id: "w12", direction: "北墙" },
    ],
  },
  {
    id: "r4",
    name: "厨房",
    walls: [
      { id: "w13", direction: "东墙" },
      { id: "w14", direction: "南墙" },
      { id: "w15", direction: "西墙" },
      { id: "w16", direction: "北墙" },
    ],
  },
  {
    id: "r5",
    name: "卫生间",
    walls: [
      { id: "w17", direction: "东墙" },
      { id: "w18", direction: "南墙" },
      { id: "w19", direction: "西墙" },
      { id: "w20", direction: "北墙" },
    ],
  },
];

export const UNITS: Unit[] = [
  {
    id: "u1",
    name: "A户型",
    type: "三房两厅",
    area: 120,
    rooms: createDefaultRooms(),
  },
  {
    id: "u2",
    name: "B户型",
    type: "两房两厅",
    area: 89,
    rooms: createDefaultRooms().slice(0, 4),
  },
  {
    id: "u3",
    name: "C户型",
    type: "四房两厅",
    area: 143,
    rooms: [
      ...createDefaultRooms(),
      {
        id: "r6",
        name: "书房",
        walls: [
          { id: "w21", direction: "东墙" },
          { id: "w22", direction: "南墙" },
          { id: "w23", direction: "西墙" },
          { id: "w24", direction: "北墙" },
        ],
      },
    ],
  },
];

export const INSPECTION_STANDARDS: InspectionStandard[] = [
  {
    id: "wall-vertical",
    name: "墙面垂直度",
    category: "装饰装修",
    allowableDeviation: 4,
    criticalRatio: 0.8,
    unit: "mm",
    pointsPerRoom: 3,
    description: "2m靠尺垂直方向测量，每面墙测3点",
  },
  {
    id: "wall-flat",
    name: "墙面平整度",
    category: "装饰装修",
    allowableDeviation: 4,
    criticalRatio: 0.8,
    unit: "mm",
    pointsPerRoom: 3,
    description: "2m靠尺水平方向测量，每面墙测3点",
  },
  {
    id: "room-depth",
    name: "开间进深",
    category: "主体结构",
    allowableDeviation: 10,
    criticalRatio: 0.8,
    unit: "mm",
    pointsPerRoom: 2,
    description: "激光测距仪测量房间净空开间和进深",
  },
  {
    id: "corner-square",
    name: "阴阳角方正",
    category: "装饰装修",
    allowableDeviation: 4,
    criticalRatio: 0.8,
    unit: "mm",
    pointsPerRoom: 4,
    description: "直角尺测量各阴阳角",
  },
  {
    id: "floor-flat",
    name: "地面平整度",
    category: "装饰装修",
    allowableDeviation: 5,
    criticalRatio: 0.8,
    unit: "mm",
    pointsPerRoom: 2,
    description: "2m靠尺测量地面平整度",
  },
  {
    id: "room-height",
    name: "净高",
    category: "主体结构",
    allowableDeviation: 15,
    criticalRatio: 0.8,
    unit: "mm",
    pointsPerRoom: 5,
    description: "激光测距仪测量房间四角及中心共5点",
  },
];

export const TEAMS: Team[] = [
  {
    id: "t1",
    name: "抹灰一班",
    leader: "张建国",
    phone: "138****1234",
    specialty: "抹灰/墙面工程",
  },
  {
    id: "t2",
    name: "抹灰二班",
    leader: "李国强",
    phone: "139****5678",
    specialty: "抹灰/墙面工程",
  },
  {
    id: "t3",
    name: "土建一班",
    leader: "王建军",
    phone: "137****9012",
    specialty: "主体结构/混凝土",
  },
  {
    id: "t4",
    name: "地坪班组",
    leader: "刘建设",
    phone: "136****3456",
    specialty: "地面工程",
  },
];

export function getFloorName(floorNumber: number): string {
  if (floorNumber < 0) {
    return `B${Math.abs(floorNumber)}层`;
  }
  return `${floorNumber}层`;
}

export function getBuildingFloors(building: Building): number[] {
  const floors: number[] = [];
  for (let i = -building.basementFloors; i <= building.totalFloors; i++) {
    if (i !== 0) floors.push(i);
  }
  return floors;
}
