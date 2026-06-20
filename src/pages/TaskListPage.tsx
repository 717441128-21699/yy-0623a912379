import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  Square,
  PlayCircle,
  User,
  Ruler,
  ClipboardList,
  Layers,
} from "lucide-react";
import { useTaskStore } from "@/store/taskStore";
import {
  BUILDINGS,
  UNITS,
  INSPECTION_STANDARDS,
  getBuildingFloors,
  getFloorName,
} from "@/data/mockData";
import { cn } from "@/lib/utils";

export default function TaskListPage() {
  const navigate = useNavigate();
  const { selection, setSelection, createTask } = useTaskStore();
  const [inspectorName, setInspectorName] = useState("李工");
  const [floorPickerOpen, setFloorPickerOpen] = useState(false);

  const currentBuilding = BUILDINGS.find((b) => b.id === selection.buildingId)!;
  const currentUnit = UNITS.find((u) => u.id === selection.unitId)!;
  const floors = getBuildingFloors(currentBuilding);

  const selectedInspections = INSPECTION_STANDARDS.filter((s) =>
    selection.inspectionIds.includes(s.id)
  );

  const toggleInspection = (id: string) => {
    const current = selection.inspectionIds;
    const next = current.includes(id)
      ? current.filter((x) => x !== id)
      : [...current, id];
    setSelection({ inspectionIds: next });
  };

  const toggleAllInspections = () => {
    if (selection.inspectionIds.length === INSPECTION_STANDARDS.length) {
      setSelection({ inspectionIds: [] });
    } else {
      setSelection({ inspectionIds: INSPECTION_STANDARDS.map((s) => s.id) });
    }
  };

  const totalPoints = selectedInspections.reduce(
    (sum, s) => sum + s.pointsPerRoom * currentUnit.rooms.length,
    0
  );

  const handleStart = () => {
    if (selection.inspectionIds.length === 0) {
      alert("请至少选择一项检查项");
      return;
    }
    const task = createTask(inspectorName);
    navigate(`/measure/${task.id}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* 顶部导航栏 */}
      <div className="bg-primary-800 text-white pt-10 pb-6 px-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-6 h-6" />
            <h1 className="text-lg font-semibold">实测实量</h1>
          </div>
          <div className="flex items-center gap-2 bg-white/15 rounded-full px-3 py-1.5">
            <User className="w-4 h-4" />
            <input
              className="bg-transparent outline-none text-sm w-16 placeholder-white/60"
              value={inspectorName}
              onChange={(e) => setInspectorName(e.target.value)}
              placeholder="测量人"
            />
          </div>
        </div>
        <p className="text-sm text-white/70 mt-2">总包项目部 · 质量巡检</p>
      </div>

      <div className="px-4 -mt-4 space-y-4">
        {/* 楼栋选择 */}
        <div className="card p-4 animate-slideUp">
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="w-5 h-5 text-primary-700" />
            <span className="font-medium text-gray-800">楼栋 & 楼层</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1.5">楼栋</label>
              <select
                className="w-full h-11 bg-gray-50 border border-gray-200 rounded-xl px-3 text-sm font-medium outline-none focus:border-primary-600"
                value={selection.buildingId}
                onChange={(e) =>
                  setSelection({ buildingId: e.target.value, floorNumber: 1 })
                }
              >
                {BUILDINGS.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-2">
              <label className="text-xs text-gray-500 block mb-1.5">楼层</label>
              <button
                onClick={() => setFloorPickerOpen(!floorPickerOpen)}
                className="w-full h-11 bg-gray-50 border border-gray-200 rounded-xl px-3 flex items-center justify-between text-sm font-medium"
              >
                <span>{currentBuilding.name} {getFloorName(selection.floorNumber)}</span>
                {floorPickerOpen ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          {floorPickerOpen && (
            <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-100 animate-slideUp">
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                {floors.map((f) => (
                  <button
                    key={f}
                    onClick={() => {
                      setSelection({ floorNumber: f });
                      setFloorPickerOpen(false);
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                      selection.floorNumber === f
                        ? "bg-primary-700 text-white shadow-sm"
                        : "bg-white border border-gray-200 text-gray-700 active:bg-gray-100"
                    )}
                  >
                    {getFloorName(f)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 户型选择 */}
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-5 h-5 text-primary-700" />
            <span className="font-medium text-gray-800">户型选择</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
            {UNITS.map((u) => (
              <button
                key={u.id}
                onClick={() => setSelection({ unitId: u.id })}
                className={cn(
                  "shrink-0 w-36 p-3 rounded-2xl border-2 transition-all text-left",
                  selection.unitId === u.id
                    ? "border-primary-700 bg-primary-50 shadow-sm"
                    : "border-gray-100 bg-white active:bg-gray-50"
                )}
              >
                <div
                  className={cn(
                    "text-base font-semibold",
                    selection.unitId === u.id ? "text-primary-800" : "text-gray-800"
                  )}
                >
                  {u.name}
                </div>
                <div className="text-xs text-gray-500 mt-1">{u.type}</div>
                <div className="text-xs text-gray-400 mt-0.5">
                  建面 {u.area}㎡ · {u.rooms.length}室
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 检查项配置 */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Ruler className="w-5 h-5 text-primary-700" />
              <span className="font-medium text-gray-800">检查项目</span>
            </div>
            <button
              onClick={toggleAllInspections}
              className="text-xs text-primary-700 font-medium active:opacity-70"
            >
              {selection.inspectionIds.length === INSPECTION_STANDARDS.length
                ? "取消全选"
                : "全选"}
            </button>
          </div>

          <div className="space-y-2">
            {INSPECTION_STANDARDS.map((s) => {
              const checked = selection.inspectionIds.includes(s.id);
              const roomPoints = s.pointsPerRoom * currentUnit.rooms.length;
              return (
                <button
                  key={s.id}
                  onClick={() => toggleInspection(s.id)}
                  className={cn(
                    "w-full p-3 rounded-xl border-2 text-left transition-all flex items-start gap-3",
                    checked
                      ? "border-primary-600 bg-primary-50"
                      : "border-gray-100 bg-white active:bg-gray-50"
                  )}
                >
                  <div className="pt-0.5">
                    {checked ? (
                      <CheckSquare className="w-5 h-5 text-primary-700" />
                    ) : (
                      <Square className="w-5 h-5 text-gray-300" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          "font-medium",
                          checked ? "text-primary-800" : "text-gray-800"
                        )}
                      >
                        {s.name}
                      </span>
                      <span className="text-xs text-gray-400 shrink-0">
                        {s.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span>允许偏差 ±{s.allowableDeviation}{s.unit}</span>
                      <span className="text-primary-700 font-medium">
                        {roomPoints}个测点
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 点位预览汇总 */}
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <ClipboardList className="w-5 h-5 text-primary-700" />
            <span className="font-medium text-gray-800">测点汇总</span>
          </div>

          <div className="rounded-xl overflow-hidden border border-gray-100">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-xs text-gray-500">
                  <th className="py-2 px-3 text-left font-normal">检查项</th>
                  <th className="py-2 px-2 text-center font-normal">房间数</th>
                  <th className="py-2 px-2 text-center font-normal">间数×点</th>
                  <th className="py-2 px-3 text-right font-normal">小计</th>
                </tr>
              </thead>
              <tbody>
                {selectedInspections.map((s, idx) => {
                  const count = s.pointsPerRoom * currentUnit.rooms.length;
                  return (
                    <tr
                      key={s.id}
                      className={idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}
                    >
                      <td className="py-2.5 px-3 text-gray-700">{s.name}</td>
                      <td className="py-2.5 px-2 text-center text-gray-500">
                        {currentUnit.rooms.length}
                      </td>
                      <td className="py-2.5 px-2 text-center text-gray-500">
                        ×{s.pointsPerRoom}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-primary-700">
                        {count}
                      </td>
                    </tr>
                  );
                })}
                {selectedInspections.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-6 text-center text-gray-400 text-sm"
                    >
                      请先勾选检查项
                    </td>
                  </tr>
                )}
              </tbody>
              {selectedInspections.length > 0 && (
                <tfoot className="bg-primary-800 text-white">
                  <tr>
                    <td className="py-2.5 px-3 font-medium">合计</td>
                    <td className="py-2.5 px-2 text-center">
                      {currentUnit.rooms.length}室
                    </td>
                    <td className="py-2.5 px-2"></td>
                    <td className="py-2.5 px-3 text-right font-bold text-lg">
                      {totalPoints}点
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>

      {/* 底部固定按钮 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-4 pb-6">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="text-sm text-gray-600">
              <span className="text-gray-400">测区：</span>
              <span className="font-medium text-gray-800">
                {currentBuilding.name} {getFloorName(selection.floorNumber)} {currentUnit.name}
              </span>
            </div>
            <div className="text-sm">
              <span className="text-gray-400">共</span>
              <span className="text-primary-800 font-bold text-base mx-1">
                {totalPoints}
              </span>
              <span className="text-gray-400">测点</span>
            </div>
          </div>
          <button
            onClick={handleStart}
            disabled={selection.inspectionIds.length === 0}
            className={cn(
              "w-full btn-primary flex items-center justify-center gap-2 h-14 text-base",
              selection.inspectionIds.length === 0 &&
                "opacity-50 cursor-not-allowed"
            )}
          >
            <PlayCircle className="w-5 h-5" />
            开始测量
          </button>
        </div>
      </div>
    </div>
  );
}
