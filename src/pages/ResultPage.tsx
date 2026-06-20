import { useState, useMemo } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  PieChart,
  BarChart3,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  ListTodo,
  Users,
  CalendarDays,
  FileDown,
  Share2,
  Home,
  ChevronRight,
  ChevronDown,
  MapPin,
  Ruler,
  Camera,
  ClipboardCheck,
  Printer,
  Clock,
  User,
} from "lucide-react";
import {
  PieChart as RePieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { useTaskStore } from "@/store/taskStore";
import {
  getResultLabel,
  getResultColorClass,
  formatDate,
  getResultDotColor,
} from "@/utils/measureUtils";
import { INSPECTION_STANDARDS, TEAMS } from "@/data/mockData";
import { cn } from "@/lib/utils";

export default function ResultPage() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const { getCurrentTask, assignTeam, resetSelection } = useTaskStore();
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [deadline, setDeadline] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().slice(0, 10);
  });
  const [remark, setRemark] = useState("");
  const [showExportModal, setShowExportModal] = useState(false);

  const task = getCurrentTask();

  const pieData = useMemo(() => {
    if (!task) return [];
    return [
      { name: "合格", value: task.qualifiedPoints, color: "#16A34A" },
      { name: "临界", value: task.criticalPoints, color: "#CA8A04" },
      { name: "超差", value: task.outPoints, color: "#DC2626" },
    ].filter((d) => d.value > 0);
  }, [task]);

  const categoryData = useMemo(() => {
    if (!task) return [];
    const map = new Map<string, { name: string; total: number; pass: number }>();
    for (const p of task.points) {
      if (!map.has(p.inspectionId)) {
        const insp = INSPECTION_STANDARDS.find((s) => s.id === p.inspectionId)!;
        map.set(p.inspectionId, { name: insp.name, total: 0, pass: 0 });
      }
      const entry = map.get(p.inspectionId)!;
      entry.total++;
      if (p.result === "qualified") entry.pass++;
    }
    return Array.from(map.values())
      .map((e) => ({
        ...e,
        rate: e.total > 0 ? Math.round((e.pass / e.total) * 100) : 0,
      }))
      .sort((a, b) => a.rate - b.rate);
  }, [task]);

  const problemByRoom = useMemo(() => {
    if (!task) return new Map();
    const map = new Map<string, typeof task.points>();
    const problems = task.points.filter(
      (p) => p.result === "out" || p.result === "critical"
    );
    for (const p of problems) {
      if (!map.has(p.roomName)) map.set(p.roomName, []);
      map.get(p.roomName)!.push(p);
    }
    return map;
  }, [task]);

  const toggleRoom = (roomName: string) => {
    setExpandedRooms((prev) => {
      const next = new Set(prev);
      if (next.has(roomName)) next.delete(roomName);
      else next.add(roomName);
      return next;
    });
  };

  const handleAssign = () => {
    if (!selectedTeamId) {
      alert("请选择责任班组");
      return;
    }
    if (!task) return;
    const deadlineTs = new Date(deadline).getTime();
    assignTeam(selectedTeamId, deadlineTs, remark);
    setShowExportModal(true);
  };

  const handleBackHome = () => {
    resetSelection();
    navigate("/tasks");
  };

  const handleShare = () => {
    if (!task) return;
    const team = TEAMS.find((t) => t.id === task.teamId);
    const problems = task.points.filter((p) => p.result !== "qualified");
    const text = `【实测实量整改通知单】
测区：${task.buildingName} ${task.floorName} ${task.unitName}
测量人：${task.inspectorName}
时间：${formatDate(task.startTime)}
合格率：${task.passRate}%
总测点数：${task.totalPoints}
  合格：${task.qualifiedPoints}点
  临界：${task.criticalPoints}点
  超差：${task.outPoints}点
${team ? `责任班组：${team.name}（${team.leader}）` : ""}
${task.deadline ? `整改期限：${new Date(task.deadline).toLocaleDateString()}` : ""}
问题数量：${problems.length}项
请按清单完成整改并回复！`;

    if (navigator.share) {
      navigator.share({ title: "实测实量整改单", text }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(text);
      alert("内容已复制到剪贴板");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!task) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  const selectedTeam = TEAMS.find((t) => t.id === selectedTeamId);
  const assignedTeam = task.teamId ? TEAMS.find((t) => t.id === task.teamId) : null;

  return (
    <div className="min-h-screen bg-gray-50 pb-36">
      {/* 顶部 */}
      <div className="bg-gradient-to-br from-primary-800 to-primary-900 text-white pt-10 pb-20 px-5">
        <div className="flex items-center justify-between mb-4">
          <Link
            to={`/measure/${task.id}`}
            className="w-10 h-10 -ml-2 flex items-center justify-center rounded-full bg-white/10 active:bg-white/20"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="text-center flex-1 px-2">
            <div className="text-lg font-semibold">测量结果汇总</div>
            <div className="text-xs text-white/60 mt-0.5">
              {formatDate(task.startTime)}
            </div>
          </div>
          <button
            onClick={handlePrint}
            className="w-10 h-10 -mr-2 flex items-center justify-center rounded-full bg-white/10 active:bg-white/20"
          >
            <Printer className="w-5 h-5" />
          </button>
        </div>

        <div className="text-center text-white/70 text-sm mb-1">
          {task.buildingName} · {task.floorName} · {task.unitName} ({task.unitType})
        </div>
      </div>

      <div className="px-4 -mt-16 space-y-4">
        {/* 合格率概览卡 */}
        <div className="card p-5 animate-slideUp shadow-lg">
          <div className="flex items-center gap-4">
            <div className="relative w-28 h-28 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={pieData}
                    innerRadius={38}
                    outerRadius={52}
                    paddingAngle={2}
                    dataKey="value"
                    startAngle={90}
                    endAngle={-270}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                </RePieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div
                  className={cn(
                    "text-3xl font-bold",
                    task.passRate >= 90 && "text-status-qualified",
                    task.passRate >= 70 && task.passRate < 90 && "text-status-critical",
                    task.passRate < 70 && "text-status-out"
                  )}
                >
                  {task.passRate}%
                </div>
                <div className="text-[10px] text-gray-400">合格率</div>
              </div>
            </div>

            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-status-qualified shrink-0" />
                  <span className="text-sm text-gray-600">合格</span>
                </div>
                <span className="font-bold text-status-qualified">
                  {task.qualifiedPoints}点
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-status-critical shrink-0" />
                  <span className="text-sm text-gray-600">临界</span>
                </div>
                <span className="font-bold text-status-critical">
                  {task.criticalPoints}点
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-status-out shrink-0" />
                  <span className="text-sm text-gray-600">超差</span>
                </div>
                <span className="font-bold text-status-out">
                  {task.outPoints}点
                </span>
              </div>
              <div className="pt-2 mt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                <span>实测 {task.measuredPoints}/{task.totalPoints}</span>
                <span>{task.inspectorName}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 分项统计 */}
        {categoryData.length > 0 && (
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-primary-700" />
              <span className="font-medium text-gray-800">分项合格率</span>
            </div>
            <div className="h-14 w-full mb-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} layout="vertical">
                  <XAxis type="number" domain={[0, 100]} hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    hide
                    width={0}
                  />
                  <Tooltip
                    formatter={(val: number) => [`${val}%`, "合格率"]}
                    contentStyle={{ borderRadius: 8, fontSize: 12 }}
                  />
                  <Bar
                    dataKey="rate"
                    radius={[0, 4, 4, 0]}
                    barSize={14}
                  >
                    {categoryData.map((d, idx) => (
                      <Cell
                        key={idx}
                        fill={
                          d.rate >= 90
                            ? "#16A34A"
                            : d.rate >= 70
                            ? "#CA8A04"
                            : "#DC2626"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2.5">
              {categoryData.map((c, idx) => (
                <div key={c.name} className="flex items-center gap-3">
                  <div className="text-xs text-gray-600 w-20 shrink-0">
                    {c.name}
                  </div>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        c.rate >= 90 && "bg-status-qualified",
                        c.rate >= 70 && c.rate < 90 && "bg-status-critical",
                        c.rate < 70 && "bg-status-out"
                      )}
                      style={{ width: `${c.rate}%` }}
                    />
                  </div>
                  <span
                    className={cn(
                      "text-xs font-bold w-10 text-right",
                      c.rate >= 90 && "text-status-qualified",
                      c.rate >= 70 && c.rate < 90 && "text-status-critical",
                      c.rate < 70 && "text-status-out"
                    )}
                  >
                    {c.rate}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 问题清单 */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ListTodo className="w-5 h-5 text-status-out" />
              <span className="font-medium text-gray-800">问题清单</span>
              <span className="px-2 py-0.5 rounded-full bg-status-outBg text-status-out text-xs font-bold">
                {problemByRoom.size > 0
                  ? Array.from(problemByRoom.values()).reduce(
                      (s, arr) => s + arr.length,
                      0
                    )
                  : 0}
                项
              </span>
            </div>
            {problemByRoom.size > 0 && (
              <button
                onClick={() => {
                  const allRooms = Array.from(problemByRoom.keys());
                  setExpandedRooms(new Set(allRooms));
                }}
                className="text-xs text-primary-700 font-medium"
              >
                全部展开
              </button>
            )}
          </div>

          {problemByRoom.size === 0 ? (
            <div className="py-10 flex flex-col items-center justify-center text-gray-400">
              <CheckCircle className="w-12 h-12 mb-3 text-status-qualified/30" />
              <div className="text-sm font-medium">太棒了！本测区无质量问题</div>
              <div className="text-xs mt-1">所有测点均合格</div>
            </div>
          ) : (
            <div className="space-y-2">
              {Array.from(problemByRoom.entries()).map(([roomName, points]) => {
                const isExpanded = expandedRooms.has(roomName);
                const outCount = points.filter((p) => p.result === "out").length;
                const criticalCount = points.filter(
                  (p) => p.result === "critical"
                ).length;

                return (
                  <div
                    key={roomName}
                    className="border border-gray-100 rounded-xl overflow-hidden"
                  >
                    <button
                      onClick={() => toggleRoom(roomName)}
                      className="w-full flex items-center gap-3 p-3 bg-gray-50 active:bg-gray-100"
                    >
                      <div className="w-9 h-9 rounded-lg bg-primary-100 text-primary-800 flex items-center justify-center shrink-0">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-semibold text-gray-800 text-sm">
                          {roomName}
                        </div>
                        <div className="flex gap-2 mt-0.5">
                          {outCount > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-status-outBg text-status-out font-medium">
                              超差{outCount}
                            </span>
                          )}
                          {criticalCount > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-status-criticalBg text-status-critical font-medium">
                              临界{criticalCount}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 mr-1">
                        {points.length}项
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="divide-y divide-gray-50">
                        {points.map((p, idx) => (
                          <div
                            key={p.id}
                            className="p-3 pl-6 flex items-start gap-3"
                          >
                            <div className="mt-0.5">
                              <span
                                className={cn(
                                  "w-2 h-2 rounded-full inline-block",
                                  getResultDotColor(p.result)
                                )}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium text-gray-800">
                                  {p.inspectionName}
                                </span>
                                <span
                                  className={cn(
                                    "text-[10px] px-1.5 py-0.5 rounded border font-medium",
                                    getResultColorClass(p.result)
                                  )}
                                >
                                  {getResultLabel(p.result)}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {p.location}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Ruler className="w-3 h-3" />
                                  {p.measuredValue}mm
                                </span>
                                <span
                                  className={cn(
                                    "font-medium",
                                    p.result === "qualified" &&
                                      "text-status-qualified",
                                    p.result === "critical" &&
                                      "text-status-critical",
                                    p.result === "out" && "text-status-out"
                                  )}
                                >
                                  {(p.deviation ?? 0) > 0 ? "+" : ""}
                                  {(p.deviation ?? 0).toFixed(1)}mm
                                </span>
                              </div>
                              {p.photos.length > 0 && (
                                <div className="flex gap-1.5 mt-2">
                                  {p.photos.slice(0, 3).map((photo, i) => (
                                    <div
                                      key={i}
                                      className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100"
                                    >
                                      <img
                                        src={photo}
                                        alt=""
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                  ))}
                                  {p.photos.length > 3 && (
                                    <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-xs text-gray-500">
                                      +{p.photos.length - 3}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-[10px] text-gray-400">
                                第{p.sequence}点
                              </div>
                              <div
                                className={cn(
                                  "text-sm font-bold mt-0.5",
                                  p.result === "critical" && "text-status-critical",
                                  p.result === "out" && "text-status-out"
                                )}
                              >
                                ±{p.allowableDeviation}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 整改分配 */}
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-accent-orange" />
            <span className="font-medium text-gray-800">整改责任分配</span>
          </div>

          {assignedTeam ? (
            <div className="p-4 rounded-xl bg-green-50 border border-green-200">
              <div className="flex items-center gap-2 mb-3">
                <ClipboardCheck className="w-5 h-5 text-status-qualified" />
                <span className="font-semibold text-status-qualified">
                  已分配整改
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-gray-500 mb-0.5">责任班组</div>
                  <div className="font-semibold text-gray-800">
                    {assignedTeam.name}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-0.5">班组长</div>
                  <div className="font-semibold text-gray-800">
                    {assignedTeam.leader}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-0.5">整改期限</div>
                  <div className="font-semibold text-status-out">
                    {task.deadline
                      ? new Date(task.deadline).toLocaleDateString()
                      : "-"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-0.5">联系电话</div>
                  <div className="font-semibold text-gray-800">
                    {assignedTeam.phone}
                  </div>
                </div>
              </div>
              {task.remark && (
                <div className="mt-3 pt-3 border-t border-green-200">
                  <div className="text-xs text-gray-500 mb-0.5">备注</div>
                  <div className="text-sm text-gray-700">{task.remark}</div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1.5">
                  选择责任班组
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {TEAMS.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTeamId(t.id)}
                      className={cn(
                        "p-3 rounded-xl border-2 text-left transition-all",
                        selectedTeamId === t.id
                          ? "border-accent-orange bg-orange-50"
                          : "border-gray-100 bg-white active:bg-gray-50"
                      )}
                    >
                      <div
                        className={cn(
                          "text-sm font-semibold",
                          selectedTeamId === t.id
                            ? "text-accent-orange"
                            : "text-gray-800"
                        )}
                      >
                        {t.name}
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5">
                        {t.leader} · {t.specialty}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1.5 flex items-center gap-1">
                    <CalendarDays className="w-3 h-3" />
                    整改期限
                  </label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full h-10 bg-gray-50 border border-gray-200 rounded-xl px-3 text-sm outline-none focus:border-accent-orange"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1.5 flex items-center gap-1">
                    <User className="w-3 h-3" />
                    当前选择
                  </label>
                  <div className="h-10 bg-gray-50 border border-gray-200 rounded-xl px-3 text-sm flex items-center text-gray-600">
                    {selectedTeam ? selectedTeam.leader : "请先选择班组"}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1.5">
                  整改要求（可选）
                </label>
                <textarea
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  rows={2}
                  placeholder="例如：2米靠尺检查，超差部位打磨或修补"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent-orange resize-none placeholder-gray-400"
                />
              </div>

              <button
                onClick={handleAssign}
                disabled={!selectedTeamId}
                className={cn(
                  "w-full btn-orange h-12 flex items-center justify-center gap-2 text-base",
                  !selectedTeamId && "opacity-50 cursor-not-allowed"
                )}
              >
                <ClipboardCheck className="w-5 h-5" />
                确认分配并生成整改单
              </button>
            </div>
          )}
        </div>

        {/* 测量信息摘要 */}
        <div className="card p-4">
          <div className="text-xs text-gray-500 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            测量记录
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">测量人</span>
              <span className="font-medium text-gray-800">{task.inspectorName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">测区</span>
              <span className="font-medium text-gray-800">
                {task.buildingName} {task.floorName}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">户型</span>
              <span className="font-medium text-gray-800">
                {task.unitName} {task.unitType}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">检查项</span>
              <span className="font-medium text-gray-800">
                {task.inspectionIds.length}项
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">开始时间</span>
              <span className="font-medium text-gray-800">
                {formatDate(task.startTime)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">结束时间</span>
              <span className="font-medium text-gray-800">
                {task.endTime ? formatDate(task.endTime) : "-"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 底部固定操作栏 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 pb-5 z-20">
        <div className="max-w-md mx-auto flex gap-3">
          <button
            onClick={handleBackHome}
            className="btn-secondary h-12 px-4 flex items-center gap-1.5 text-sm"
          >
            <Home className="w-4 h-4" />
            首页
          </button>
          {assignedTeam && (
            <button
              onClick={handleShare}
              className="btn-secondary h-12 px-4 flex items-center gap-1.5 text-sm"
            >
              <Share2 className="w-4 h-4" />
              分享
            </button>
          )}
          <button
            onClick={() => assignedTeam && setShowExportModal(true)}
            disabled={!assignedTeam}
            className={cn(
              "flex-1 btn-primary h-12 flex items-center justify-center gap-2 text-sm",
              !assignedTeam && "opacity-50 cursor-not-allowed"
            )}
          >
            <FileDown className="w-4 h-4" />
            {assignedTeam ? "导出整改通知单" : "请先分配班组"}
          </button>
        </div>
      </div>

      {/* 导出成功弹窗 */}
      {showExportModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6"
          onClick={() => setShowExportModal(false)}
        >
          <div
            className="bg-white rounded-3xl p-6 max-w-sm w-full animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center mb-4">
                <CheckCircle className="w-9 h-9 text-status-qualified" />
              </div>
              <div className="text-xl font-bold text-gray-900 mb-1">
                整改单已生成
              </div>
              <div className="text-sm text-gray-500 mb-6">
                共 {problemByRoom.size > 0
                  ? Array.from(problemByRoom.values()).reduce(
                      (s, arr) => s + arr.length,
                      0
                    )
                  : 0} 项整改内容已分配至
                {assignedTeam?.name ?? selectedTeam?.name}
              </div>

              <div className="w-full p-4 bg-gray-50 rounded-2xl mb-5 text-left">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-500">整改编号</span>
                  <span className="font-mono font-bold text-primary-800">
                    ZG{task.id.slice(-8).toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">测区合格率</span>
                  <span
                    className={cn(
                      "font-bold",
                      task.passRate >= 90 && "text-status-qualified",
                      task.passRate >= 70 &&
                        task.passRate < 90 &&
                        "text-status-critical",
                      task.passRate < 70 && "text-status-out"
                    )}
                  >
                    {task.passRate}%
                  </span>
                </div>
              </div>

              <div className="w-full space-y-2.5">
                <button
                  onClick={() => {
                    handleShare();
                    setShowExportModal(false);
                  }}
                  className="w-full btn-primary h-12 flex items-center justify-center gap-2"
                >
                  <Share2 className="w-4 h-4" />
                  分享给班组
                </button>
                <button
                  onClick={handleBackHome}
                  className="w-full btn-secondary h-12 flex items-center justify-center gap-2"
                >
                  <Home className="w-4 h-4" />
                  返回任务列表
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
