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
  Filter,
  Check,
  X,
  RotateCcw,
  Pause,
  Eye,
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
  getRectificationLabel,
  getRectificationColorClass,
  calculateRoomStats,
} from "@/utils/measureUtils";
import { INSPECTION_STANDARDS, TEAMS } from "@/data/mockData";
import { cn } from "@/lib/utils";
import type { RectificationStatus } from "@/types";

type FilterStatus = "all" | "pending" | "fixed" | "recheck_pass" | "recheck_fail";

export default function ResultPage() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const {
    getCurrentTask,
    getTaskById,
    loadTask,
    assignTeam,
    setPointRectification,
  } = useTaskStore();
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [deadline, setDeadline] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().slice(0, 10);
  });
  const [remark, setRemark] = useState("");
  const [showExportModal, setShowExportModal] = useState(false);
  const [rectificationModal, setRectificationModal] = useState<{
    pointId: string;
    status: RectificationStatus;
    remark: string;
    rectifiedValue: string;
    recheckerName: string;
  } | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [showRoomView, setShowRoomView] = useState(true);

  const taskFromStore = getCurrentTask();
  const task = taskFromStore ?? getTaskById(taskId ?? "");

  if (task && task.id !== useTaskStore.getState().currentTaskId) {
    loadTask(task.id);
  }

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
      const counted = p.status === "measured" || p.status === "recheck_done";
      if (counted) entry.total++;
      if (counted && p.result === "qualified") entry.pass++;
    }
    return Array.from(map.values())
      .map((e) => ({
        ...e,
        rate: e.total > 0 ? Math.round((e.pass / e.total) * 100) : 0,
      }))
      .sort((a, b) => a.rate - b.rate);
  }, [task]);

  const roomStats = useMemo(() => {
    if (!task) return [];
    return calculateRoomStats(task.points);
  }, [task]);

  const problemByRoom = useMemo(() => {
    if (!task) return new Map();
    const map = new Map<string, typeof task.points>();
    const isCounted = (p: (typeof task.points)[number]) =>
      p.status === "measured" || p.status === "recheck_done";
    const problems = task.points.filter(
      (p) => isCounted(p) && (p.result === "out" || p.result === "critical")
    );

    for (const p of problems) {
      if (!map.has(p.roomName)) map.set(p.roomName, []);
      map.get(p.roomName)!.push(p);
    }
    return map;
  }, [task]);

  const filteredProblemPoints = useMemo(() => {
    if (!task) return [];
    const isCounted = (p: (typeof task.points)[number]) =>
      p.status === "measured" || p.status === "recheck_done";
    let all = task.points.filter(
      (p) => isCounted(p) && (p.result === "out" || p.result === "critical")
    );
    if (filterStatus !== "all") {
      all = all.filter((p) => p.rectificationStatus === filterStatus);
    }
    return all;
  }, [task, filterStatus]);

  const toggleRoom = (roomName: string) => {
    setExpandedRooms((prev) => {
      const next = new Set(prev);
      if (next.has(roomName)) next.delete(roomName);
      else next.add(roomName);
      return next;
    });
  };

  const openRectification = (
    pointId: string,
    currentStatus: RectificationStatus,
    currentRemark?: string,
    currentRectified?: number
  ) => {
    setRectificationModal({
      pointId,
      status: currentStatus === "none" ? "pending" : currentStatus,
      remark: currentRemark ?? "",
      rectifiedValue: currentRectified !== undefined ? String(currentRectified) : "",
      recheckerName: task?.inspectorName ?? "",
    });
  };

  const saveRectification = () => {
    if (!rectificationModal) return;
    const val =
      rectificationModal.rectifiedValue !== ""
        ? parseFloat(rectificationModal.rectifiedValue)
        : undefined;
    setPointRectification(
      rectificationModal.pointId,
      rectificationModal.status,
      rectificationModal.remark || undefined,
      val,
      [],
      rectificationModal.recheckerName || undefined
    );
    setRectificationModal(null);
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
    navigate("/tasks");
  };

  const handleContinueMeasure = () => {
    if (task) navigate(`/measure/${task.id}`);
  };

  const handleShare = () => {
    if (!task) return;
    const team = TEAMS.find((t) => t.id === task.teamId);
    const problems = filteredProblemPoints;
    const pendingCount = problems.filter(
      (p) => p.rectificationStatus === "pending"
    ).length;
    const fixedCount = problems.filter(
      (p) => p.rectificationStatus === "fixed"
    ).length;
    const passCount = problems.filter(
      (p) => p.rectificationStatus === "recheck_pass"
    ).length;
    const failCount = problems.filter(
      (p) => p.rectificationStatus === "recheck_fail"
    ).length;

    const text = `【实测实量整改通知单】
测区：${task.buildingName} ${task.floorName} ${task.unitName}
测量人：${task.inspectorName}
时间：${formatDate(task.startTime)}
合格率：${task.passRate}%
总测点数：${task.totalPoints}
  合格：${task.qualifiedPoints}点
  临界：${task.criticalPoints}点
  超差：${task.outPoints}点
${team ? `责任班组：${team.name}（${team.leader} ${team.phone}）` : ""}
${task.deadline ? `整改期限：${new Date(task.deadline).toLocaleDateString()}` : ""}
整改状态：待整改${pendingCount} · 已整改待复查${fixedCount} · 复查合格${passCount} · 仍超差${failCount}
问题数量：${problems.length}项
请按清单完成整改并回复！`;

    if (navigator.share) {
      navigator.share({ title: "实测实量整改单", text }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(text);
      alert("内容已复制到剪贴板");
    }
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
  const allProblems = filteredProblemPoints;
  const filterOptions: { key: FilterStatus; label: string; color: string }[] = [
    { key: "all", label: "全部", color: "bg-gray-700" },
    { key: "pending", label: "待整改", color: "bg-status-out" },
    { key: "fixed", label: "已整改待复查", color: "bg-status-critical" },
    { key: "recheck_pass", label: "复查合格", color: "bg-status-qualified" },
    { key: "recheck_fail", label: "仍超差", color: "bg-red-700" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-36">
      <div className="bg-gradient-to-br from-primary-800 to-primary-900 text-white pt-10 pb-20 px-5">
        <div className="flex items-center justify-between mb-4">
          <Link
            to="/tasks"
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
            onClick={handleContinueMeasure}
            className="h-10 px-3 flex items-center gap-1 rounded-full bg-white/10 text-xs active:bg-white/20"
          >
            <Eye className="w-4 h-4" />
            继续测量
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
                    task.passRate >= 70 &&
                      task.passRate < 90 &&
                      "text-status-critical",
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
              {task.recheckPendingPoints > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-accent-orange shrink-0" />
                    <span className="text-sm text-gray-600">待复测</span>
                  </div>
                  <span className="font-bold text-accent-orange">
                    {task.recheckPendingPoints}点
                  </span>
                </div>
              )}
              <div className="pt-2 mt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                <span>
                  已测 {task.measuredPoints}/{task.totalPoints}
                </span>
                <span>{task.inspectorName}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 按房间查看完成情况 */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary-700" />
              <span className="font-medium text-gray-800">按房间完成情况</span>
            </div>
            <button
              onClick={() => setShowRoomView(!showRoomView)}
              className="text-xs text-primary-700 font-medium"
            >
              {showRoomView ? "收起" : "展开"}
            </button>
          </div>

          {showRoomView && (
            <div className="space-y-2.5">
              {roomStats.map((r) => {
                const isExpanded = expandedRooms.has(`room-${r.roomName}`);
                return (
                  <div
                    key={r.roomId}
                    className={cn(
                      "rounded-xl border overflow-hidden transition-all",
                      r.isComplete
                        ? "border-status-qualified/30 bg-status-qualified/5"
                        : r.measured > 0
                        ? "border-primary-200 bg-primary-50/40"
                        : "border-gray-100 bg-gray-50"
                    )}
                  >
                    <button
                      onClick={() => toggleRoom(`room-${r.roomName}`)}
                      className="w-full flex items-center gap-3 p-3 active:bg-gray-50"
                    >
                      <div
                        className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                          r.isComplete
                            ? "bg-status-qualified/15 text-status-qualified"
                            : "bg-primary-100 text-primary-800"
                        )}
                      >
                        {r.isComplete ? (
                          <Check className="w-5 h-5" />
                        ) : (
                          <span className="text-sm font-bold">
                            {r.measured}/{r.total}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-800">
                            {r.roomName}
                          </span>
                          {r.isComplete && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-status-qualified/15 text-status-qualified text-[10px] font-semibold">
                              已完成
                            </span>
                          )}
                          {!r.isComplete && r.measured > 0 && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-primary-100 text-primary-800 text-[10px] font-semibold">
                              进行中
                            </span>
                          )}
                          {r.recheckPending > 0 && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-accent-orange/15 text-accent-orange text-[10px] font-semibold">
                              <Pause className="w-2.5 h-2.5" />
                              待复{r.recheckPending}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-500">
                          <span>合格率</span>
                          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden max-w-[120px]">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                r.measured > 0 && r.passRate >= 90
                                  ? "bg-status-qualified"
                                  : r.measured > 0 && r.passRate >= 70
                                  ? "bg-status-critical"
                                  : r.measured > 0
                                  ? "bg-status-out"
                                  : "bg-gray-300"
                              )}
                              style={{
                                width: `${r.measured > 0 ? r.passRate : 0}%`,
                              }}
                            />
                          </div>
                          <span
                            className={cn(
                              "font-semibold w-10 text-right",
                              r.measured > 0 && r.passRate >= 90
                                ? "text-status-qualified"
                                : r.measured > 0 && r.passRate >= 70
                                ? "text-status-critical"
                                : r.measured > 0
                                ? "text-status-out"
                                : "text-gray-400"
                            )}
                          >
                            {r.measured > 0 ? `${r.passRate}%` : "-"}
                          </span>
                        </div>
                      </div>
                      <div className="text-right text-xs text-gray-500 shrink-0">
                        {r.problemPoints.length > 0 ? (
                          <span className="text-status-out font-semibold">
                            {r.problemPoints.length}项问题
                          </span>
                        ) : r.measured > 0 ? (
                          <span className="text-status-qualified font-semibold">
                            无问题
                          </span>
                        ) : (
                          <span className="text-gray-400">待测</span>
                        )}
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                    </button>

                    {isExpanded &&
                      (r.problemPoints.length > 0 || r.measured > 0 ? (
                        <div className="px-3 pb-3 pt-1 border-t border-gray-100 bg-white/50">
                          <div className="flex flex-wrap gap-1.5 mb-2 text-[11px]">
                            <span className="px-2 py-0.5 rounded bg-green-50 text-green-700">
                              合格{r.qualified}
                            </span>
                            {r.critical > 0 && (
                              <span className="px-2 py-0.5 rounded bg-status-criticalBg text-status-critical">
                                临界{r.critical}
                              </span>
                            )}
                            {r.out > 0 && (
                              <span className="px-2 py-0.5 rounded bg-status-outBg text-status-out">
                                超差{r.out}
                              </span>
                            )}
                            {r.pending > 0 && (
                              <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                                待测{r.pending}
                              </span>
                            )}
                          </div>
                          {r.problemPoints.length > 0 && (
                            <div className="space-y-1.5">
                              {r.problemPoints.map((pp) => (
                                <div
                                  key={pp.id}
                                  className="flex items-center gap-2 text-xs bg-white p-2 rounded-lg border border-gray-100"
                                >
                                  <span
                                    className={cn(
                                      "w-2 h-2 rounded-full shrink-0",
                                      getResultDotColor(pp.result)
                                    )}
                                  />
                                  <span className="flex-1 text-gray-700">
                                    {pp.inspectionName} · {pp.location}
                                  </span>
                                  <span className="text-gray-500">
                                    {pp.measuredValue}mm
                                  </span>
                                  <span
                                    className={cn(
                                      "px-1.5 py-0.5 rounded text-[10px] font-semibold border",
                                      getRectificationColorClass(
                                        pp.rectificationStatus
                                      )
                                    )}
                                  >
                                    {getRectificationLabel(pp.rectificationStatus)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="px-3 pb-3 pt-1 text-xs text-gray-400">
                          本房间暂无测量数据
                        </div>
                      ))}
                  </div>
                );
              })}
            </div>
          )}
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
                  <YAxis type="category" dataKey="name" hide width={0} />
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
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ListTodo className="w-5 h-5 text-status-out" />
              <span className="font-medium text-gray-800">问题清单</span>
              <span className="px-2 py-0.5 rounded-full bg-status-outBg text-status-out text-xs font-bold">
                {allProblems.length}项
              </span>
            </div>
          </div>

          {/* 整改状态筛选 */}
          <div className="flex items-center gap-1.5 mb-3 pb-3 border-b border-gray-100 overflow-x-auto -mx-1 px-1">
            <Filter className="w-4 h-4 text-gray-400 shrink-0" />
            {filterOptions.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setFilterStatus(opt.key)}
                className={cn(
                  "shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all",
                  filterStatus === opt.key
                    ? `${opt.color} text-white`
                    : "bg-gray-100 text-gray-600"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {allProblems.length === 0 ? (
            <div className="py-10 flex flex-col items-center justify-center text-gray-400">
              <CheckCircle className="w-12 h-12 mb-3 text-status-qualified/30" />
              <div className="text-sm font-medium">
                {filterStatus === "all"
                  ? "太棒了！本测区无质量问题"
                  : `当前筛选下暂无${
                      filterOptions.find((f) => f.key === filterStatus)?.label
                    }项`}
              </div>
              <div className="text-xs mt-1">
                {filterStatus !== "all" && "可切换筛选条件查看其他问题"}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {Array.from(problemByRoom.entries())
                .map(([roomName, points]) => {
                  const filteredPoints = points.filter(
                    (p) =>
                      filterStatus === "all" ||
                      p.rectificationStatus === filterStatus
                  );
                  if (filteredPoints.length === 0) return null;
                  const isExpanded = expandedRooms.has(`problem-${roomName}`);
                  return { roomName, points: filteredPoints, isExpanded };
                })
                .filter(Boolean)
                .map((item) => {
                  if (!item) return null;
                  const { roomName, points, isExpanded } = item;
                  return (
                    <div
                      key={roomName}
                      className="border border-gray-100 rounded-xl overflow-hidden"
                    >
                      <button
                        onClick={() => toggleRoom(`problem-${roomName}`)}
                        className="w-full flex items-center gap-3 p-3 bg-gray-50 active:bg-gray-100"
                      >
                        <div className="w-9 h-9 rounded-lg bg-primary-100 text-primary-800 flex items-center justify-center shrink-0">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div className="flex-1 text-left">
                          <div className="font-semibold text-gray-800 text-sm">
                            {roomName}
                          </div>
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {points.some(
                              (p) => p.rectificationStatus === "pending"
                            ) && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-status-outBg text-status-out text-[10px] font-semibold">
                                待整改
                                {
                                  points.filter(
                                    (p) => p.rectificationStatus === "pending"
                                  ).length
                                }
                              </span>
                            )}
                            {points.some(
                              (p) => p.rectificationStatus === "fixed"
                            ) && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-status-criticalBg text-status-critical text-[10px] font-semibold">
                                已整改
                                {
                                  points.filter(
                                    (p) => p.rectificationStatus === "fixed"
                                  ).length
                                }
                              </span>
                            )}
                            {points.some(
                              (p) => p.rectificationStatus === "recheck_pass"
                            ) && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-status-qualifiedBg text-status-qualified text-[10px] font-semibold">
                                合格
                                {
                                  points.filter(
                                    (p) =>
                                      p.rectificationStatus === "recheck_pass"
                                  ).length
                                }
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
                              className="p-3 pl-6"
                            >
                              <div className="flex items-start gap-3">
                                <div className="mt-0.5">
                                  <span
                                    className={cn(
                                      "w-2 h-2 rounded-full inline-block",
                                      getResultDotColor(p.result)
                                    )}
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
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
                                    <span
                                      className={cn(
                                        "text-[10px] px-1.5 py-0.5 rounded border font-medium",
                                        getRectificationColorClass(
                                          p.rectificationStatus
                                        )
                                      )}
                                    >
                                      {getRectificationLabel(
                                        p.rectificationStatus
                                      )}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3 text-xs text-gray-500">
                                    <span className="flex items-center gap-1">
                                      <MapPin className="w-3 h-3" />
                                      {p.location}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Ruler className="w-3 h-3" />
                                      初测{p.measuredValue}mm
                                    </span>
                                    <span
                                      className={cn(
                                        "font-medium",
                                        p.result === "critical" &&
                                          "text-status-critical",
                                        p.result === "out" && "text-status-out"
                                      )}
                                    >
                                      {(p.deviation ?? 0) > 0 ? "+" : ""}
                                      {(p.deviation ?? 0).toFixed(1)}mm
                                    </span>
                                  </div>
                                  {p.rectificationRemark && (
                                    <div className="mt-1.5 text-[11px] text-gray-500 bg-gray-50 px-2 py-1 rounded">
                                      备注：{p.rectificationRemark}
                                    </div>
                                  )}
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
                                    </div>
                                  )}
                                </div>
                                <div className="flex flex-col items-end gap-1 shrink-0">
                                  <button
                                    onClick={() =>
                                      openRectification(
                                        p.id,
                                        p.rectificationStatus,
                                        p.rectificationRemark,
                                        p.rectifiedValue
                                      )
                                    }
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-primary-50 text-primary-800 text-[11px] font-semibold active:bg-primary-100"
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                    整改
                                  </button>
                                  <div className="text-[10px] text-gray-400">
                                    第{p.sequence}点
                                  </div>
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

              <div className="mt-4 flex flex-wrap gap-1.5">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-status-outBg text-status-out text-[11px] font-semibold">
                  待整改
                  {
                    allProblems.filter(
                      (p) => p.rectificationStatus === "pending"
                    ).length
                  }
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-status-criticalBg text-status-critical text-[11px] font-semibold">
                  已整改待复查
                  {
                    allProblems.filter(
                      (p) => p.rectificationStatus === "fixed"
                    ).length
                  }
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-status-qualifiedBg text-status-qualified text-[11px] font-semibold">
                  复查合格
                  {
                    allProblems.filter(
                      (p) => p.rectificationStatus === "recheck_pass"
                    ).length
                  }
                </span>
                {allProblems.filter((p) => p.rectificationStatus === "recheck_fail").length > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-700 text-[11px] font-semibold">
                    仍超差
                    {
                      allProblems.filter(
                        (p) => p.rectificationStatus === "recheck_fail"
                      ).length
                    }
                  </span>
                )}
              </div>
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
              <span className="font-medium text-gray-800">
                {task.inspectorName}
              </span>
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

      {/* 整改状态更新弹窗 */}
      {rectificationModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
          onClick={() => setRectificationModal(null)}
        >
          <div
            className="w-full max-w-md bg-white rounded-t-3xl p-5 pb-7 animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="text-lg font-bold text-gray-900">问题整改登记</div>
              <button
                onClick={() => setRectificationModal(null)}
                className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1.5">
                  整改状态
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { k: "pending", label: "待整改", icon: Pause, borderClass: "border-status-out", bgClass: "bg-status-outBg", textClass: "text-status-out" },
                    { k: "fixed", label: "已整改待复查", icon: Check, borderClass: "border-status-critical", bgClass: "bg-status-criticalBg", textClass: "text-status-critical" },
                    { k: "recheck_pass", label: "复查合格", icon: CheckCircle, borderClass: "border-status-qualified", bgClass: "bg-status-qualifiedBg", textClass: "text-status-qualified" },
                    { k: "recheck_fail", label: "仍超差", icon: X, borderClass: "border-status-out", bgClass: "bg-status-outBg", textClass: "text-status-out" },
                  ] as const).map((opt) => (
                    <button
                      key={opt.k}
                      onClick={() =>
                        setRectificationModal({
                          ...rectificationModal,
                          status: opt.k,
                        })
                      }
                      className={cn(
                        "p-2.5 rounded-xl border-2 text-left flex items-center gap-2 transition-all",
                        rectificationModal.status === opt.k
                          ? `${opt.borderClass} ${opt.bgClass}`
                          : "border-gray-100 bg-white"
                      )}
                    >
                      <opt.icon
                        className={cn(
                          "w-4 h-4 shrink-0",
                          rectificationModal.status === opt.k
                            ? opt.textClass
                            : "text-gray-400"
                        )}
                      />
                      <span
                        className={cn(
                          "text-xs font-semibold",
                          rectificationModal.status === opt.k
                            ? opt.textClass
                            : "text-gray-600"
                        )}
                      >
                        {opt.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1.5">
                  整改后读数（mm，可选）
                </label>
                <input
                  type="number"
                  value={rectificationModal.rectifiedValue}
                  onChange={(e) =>
                    setRectificationModal({
                      ...rectificationModal,
                      rectifiedValue: e.target.value,
                    })
                  }
                  className="w-full h-10 bg-gray-50 border border-gray-200 rounded-xl px-3 text-sm outline-none focus:border-primary-600"
                  placeholder="输入整改后测量值"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1.5">
                  复查人
                </label>
                <input
                  type="text"
                  value={rectificationModal.recheckerName}
                  onChange={(e) =>
                    setRectificationModal({
                      ...rectificationModal,
                      recheckerName: e.target.value,
                    })
                  }
                  className="w-full h-10 bg-gray-50 border border-gray-200 rounded-xl px-3 text-sm outline-none focus:border-primary-600"
                  placeholder="复查人姓名"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1.5">
                  整改说明
                </label>
                <textarea
                  value={rectificationModal.remark}
                  onChange={(e) =>
                    setRectificationModal({
                      ...rectificationModal,
                      remark: e.target.value,
                    })
                  }
                  rows={2}
                  placeholder="例如：打磨后重新测量，偏差已控制在范围内"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary-600 resize-none placeholder-gray-400"
                />
              </div>

              <div className="pt-2 grid grid-cols-2 gap-3">
                <button
                  onClick={() => setRectificationModal(null)}
                  className="btn-secondary h-12"
                >
                  取消
                </button>
                <button
                  onClick={saveRectification}
                  className="btn-primary h-12 flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                共 {allProblems.length} 项整改内容已分配至{" "}
                {assignedTeam?.name ?? selectedTeam?.name}
              </div>

              <div className="w-full p-4 bg-gray-50 rounded-2xl mb-5 text-left">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-500">整改编号</span>
                  <span className="font-mono font-bold text-primary-800">
                    ZG{task.id.slice(-8).toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm mb-2">
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
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">待整改</span>
                  <span className="font-semibold text-status-out">
                    {
                      allProblems.filter(
                        (p) => p.rectificationStatus === "pending"
                      ).length
                    }
                    项
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
