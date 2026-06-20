import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Camera,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  X,
  MapPin,
  Hash,
  Target,
  GripVertical,
  Image as ImageIcon,
  Pause,
  Save,
} from "lucide-react";
import { useTaskStore } from "@/store/taskStore";
import {
  getResultLabel,
  getResultColorClass,
  getResultDotColor,
  getPointStatusLabel,
} from "@/utils/measureUtils";
import { INSPECTION_STANDARDS } from "@/data/mockData";
import { cn } from "@/lib/utils";
import type { PointResult } from "@/types";

export default function MeasurePage() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const {
    getCurrentTask,
    getTaskById,
    loadTask,
    updatePoint,
    recordMeasurement,
    markPointForRecheck,
    recordRecheckMeasurement,
    updateTaskNavigation,
    completeTask,
  } = useTaskStore();

  const [inputValue, setInputValue] = useState("");
  const [showRecheckModal, setShowRecheckModal] = useState(false);
  const [pendingResult, setPendingResult] = useState<{
    result: PointResult;
    deviation: number;
    deviationPercent: number;
  } | null>(null);
  const [tempPhotos, setTempPhotos] = useState<string[]>([]);
  const [showPhotoPreview, setShowPhotoPreview] = useState<string | null>(null);
  const [showSavedTip, setShowSavedTip] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const taskFromStore = getCurrentTask();
  const task = taskFromStore ?? getTaskById(taskId ?? "");

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedInspectionFilter, setSelectedInspectionFilter] = useState<
    string | null
  >(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (task && !initialized) {
      if (task.id !== useTaskStore.getState().currentTaskId) {
        loadTask(task.id);
      }
      setCurrentIndex(task.currentPointIndex || 0);
      setSelectedInspectionFilter(task.currentInspectionFilter ?? null);
      setInitialized(true);
    }
  }, [task, initialized, loadTask]);

  useEffect(() => {
    if (task && initialized) {
      updateTaskNavigation(currentIndex, selectedInspectionFilter);
    }
  }, [task, currentIndex, selectedInspectionFilter, initialized, updateTaskNavigation]);

  useEffect(() => {
    if (!task || !initialized) return;
    if (currentPoint) {
      if (currentPoint.status === "recheck_pending") {
        setInputValue("");
      } else if (currentPoint.measuredValue !== undefined) {
        setInputValue(String(currentPoint.measuredValue));
      } else {
        setInputValue("");
      }
    }
    setTempPhotos([]);
  }, [currentIndex, selectedInspectionFilter, task?.id, initialized]);

  const filteredPoints = useMemo(() => {
    if (!task) return [];
    if (!selectedInspectionFilter) return task.points;
    return task.points.filter((p) => p.inspectionId === selectedInspectionFilter);
  }, [task, selectedInspectionFilter]);

  const currentPoint = filteredPoints[currentIndex];
  const actualIndex = currentPoint
    ? task!.points.findIndex((p) => p.id === currentPoint.id)
    : -1;

  const currentInspection = currentPoint
    ? INSPECTION_STANDARDS.find((s) => s.id === currentPoint.inspectionId)
    : null;

  useEffect(() => {
    if (taskId && !task) {
      navigate("/tasks");
    }
  }, [task, taskId, navigate]);

  const groupedInspections = useMemo(() => {
    if (!task) return [];
    const map = new Map<
      string,
      { id: string; name: string; total: number; done: number; recheckPending: number }
    >();
    for (const p of task.points) {
      if (!map.has(p.inspectionId)) {
        const insp = INSPECTION_STANDARDS.find((s) => s.id === p.inspectionId)!;
        map.set(p.inspectionId, {
          id: p.inspectionId,
          name: insp.name,
          total: 0,
          done: 0,
          recheckPending: 0,
        });
      }
      const entry = map.get(p.inspectionId)!;
      entry.total++;
      if (p.status === "measured" || p.status === "recheck_done") entry.done++;
      if (p.status === "recheck_pending") entry.recheckPending++;
    }
    return Array.from(map.values());
  }, [task]);

  const handleNumberInput = (num: string) => {
    if (num === "del") {
      setInputValue((v) => v.slice(0, -1));
    } else if (num === ".") {
      if (!inputValue.includes(".")) {
        setInputValue((v) => (v === "" ? "0." : v + "."));
      }
    } else if (num === "-") {
      if (inputValue === "") {
        setInputValue("-");
      } else if (inputValue.startsWith("-")) {
        setInputValue(inputValue.slice(1));
      } else {
        setInputValue("-" + inputValue);
      }
    } else {
      setInputValue((v) => (v === "0" ? num : v + num));
    }
  };

  const handleConfirm = () => {
    if (!currentPoint || inputValue === "" || inputValue === "-") return;
    const value = parseFloat(inputValue);
    if (isNaN(value)) return;

    let resultInfo;
    if (currentPoint.status === "recheck_pending") {
      resultInfo = recordRecheckMeasurement(
        currentPoint.id,
        value,
        tempPhotos
      );
    } else {
      resultInfo = recordMeasurement(currentPoint.id, value, tempPhotos);
    }

    setPendingResult(resultInfo);
    setShowSavedTip(true);
    setTimeout(() => setShowSavedTip(false), 1200);

    if (resultInfo.result === "out") {
      setShowRecheckModal(true);
    }
  };

  const handleConfirmedOut = () => {
    setShowRecheckModal(false);
    setPendingResult(null);
    goNext();
  };

  const handleRecheck = () => {
    if (!currentPoint) return;
    markPointForRecheck(currentPoint.id);
    setInputValue("");
    setTempPhotos([]);
    setShowRecheckModal(false);
    setPendingResult(null);
  };

  const handleManualRecheck = () => {
    if (!currentPoint) return;
    markPointForRecheck(currentPoint.id);
    setInputValue("");
    setTempPhotos([]);
    setPendingResult(null);
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        setTempPhotos((prev) => [...prev, dataUrl]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const removeTempPhoto = (idx: number) => {
    setTempPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
    }
  };

  const goNext = () => {
    if (currentIndex < filteredPoints.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      if (!task) return;
      if (task.measuredPoints + task.recheckPendingPoints === task.totalPoints) {
        if (task.recheckPendingPoints === 0) {
          completeTask();
          navigate(`/result/${task.id}`);
        } else {
          const firstRecheck = task.points.findIndex(
            (p) => p.status === "recheck_pending"
          );
          if (firstRecheck !== -1) {
            const point = task.points[firstRecheck];
            const inspGroup = groupedInspections.find(
              (g) => g.id === point.inspectionId
            );
            if (inspGroup) {
              setSelectedInspectionFilter(inspGroup.id);
              const idxInFiltered = task.points
                .filter((p) => p.inspectionId === inspGroup.id)
                .findIndex((p) => p.id === point.id);
              setCurrentIndex(idxInFiltered >= 0 ? idxInFiltered : 0);
            }
          }
        }
      } else {
        const firstPending = task.points.findIndex(
          (p) => p.status === "pending"
        );
        if (firstPending !== -1) {
          const point = task.points[firstPending];
          const inspGroup = groupedInspections.find(
            (g) => g.id === point.inspectionId
          );
          if (inspGroup) {
            setSelectedInspectionFilter(inspGroup.id);
            const idxInFiltered = task.points
              .filter((p) => p.inspectionId === inspGroup.id)
              .findIndex((p) => p.id === point.id);
            setCurrentIndex(idxInFiltered >= 0 ? idxInFiltered : 0);
          }
        }
      }
    }
  };

  if (!task || !currentPoint || !currentInspection) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  const doneCount = task.measuredPoints;
  const totalActive = task.totalPoints - task.recheckPendingPoints;
  const progress =
    totalActive > 0 ? (doneCount / totalActive) * 100 : 0;
  const displayResult = pendingResult?.result ?? currentPoint.result;
  const displayDeviation = pendingResult?.deviation ?? currentPoint.deviation;
  const displayDeviationPercent =
    pendingResult?.deviationPercent ?? currentPoint.deviationPercent;
  const isRecheckPending = currentPoint.status === "recheck_pending";

  const getPointColor = (p: (typeof filteredPoints)[number]) => {
    if (p.status === "recheck_pending") return "bg-accent-orange text-white";
    if (p.result === "out") return "bg-status-outBg text-status-out";
    if (p.result === "critical") return "bg-status-criticalBg text-status-critical";
    if (p.result === "qualified") return "bg-status-qualifiedBg text-status-qualified";
    return "bg-gray-100 text-gray-400";
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-80">
      {/* 顶部状态栏 */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between px-4 pt-10 pb-2">
          <Link
            to="/tasks"
            className="w-10 h-10 -ml-2 flex items-center justify-center rounded-full active:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div className="text-center flex-1 px-2">
            <div className="font-semibold text-gray-800">
              {task.buildingName} {task.floorName} {task.unitName}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">{task.unitType}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-400">已确认</div>
            <div className="text-sm font-bold text-primary-800">
              {task.measuredPoints}/{task.totalPoints}
            </div>
          </div>
        </div>
        <div className="px-4 pb-2">
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary-600 to-primary-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-1.5 text-[11px] text-gray-400">
            <span>
              {task.measuredPoints}已测 · {task.recheckPendingPoints > 0 && (
                <span className="text-accent-orange font-semibold">
                  {task.recheckPendingPoints}待复测 ·
                </span>
              )}
              {task.totalPoints - task.measuredPoints - task.recheckPendingPoints}待测
            </span>
            <span className="flex items-center gap-1">
              <Save className="w-3 h-3" />
              自动保存
            </span>
          </div>
        </div>

        {/* 检查项切换标签 */}
        <div className="px-3 pb-3 flex gap-2 overflow-x-auto">
          <button
            onClick={() => {
              setSelectedInspectionFilter(null);
              setCurrentIndex(0);
            }}
            className={cn(
              "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
              selectedInspectionFilter === null
                ? "bg-primary-800 text-white"
                : "bg-gray-100 text-gray-600 active:bg-gray-200"
            )}
          >
            全部
          </button>
          {groupedInspections.map((g) => (
            <button
              key={g.id}
              onClick={() => {
                setSelectedInspectionFilter(g.id);
                setCurrentIndex(0);
              }}
              className={cn(
                "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1",
                selectedInspectionFilter === g.id
                  ? "bg-primary-800 text-white"
                  : "bg-gray-100 text-gray-600 active:bg-gray-200"
              )}
            >
              {g.name}
              <span
                className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full",
                  selectedInspectionFilter === g.id
                    ? "bg-white/20"
                    : "bg-white"
                )}
              >
                {g.recheckPending > 0
                  ? `${g.recheckPending}待复/${g.total}`
                  : `${g.done}/${g.total}`}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 已保存提示 */}
      {showSavedTip && (
        <div className="fixed top-28 left-1/2 -translate-x-1/2 z-40 bg-gray-900/90 text-white px-4 py-2 rounded-full text-sm flex items-center gap-1.5 animate-slideUp shadow-lg">
          <Save className="w-4 h-4" />
          已保存到本机
        </div>
      )}

      <div className="px-4 pt-4 space-y-4">
        {/* 当前测点进度指示 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center justify-center w-9 h-9 rounded-xl font-bold text-sm",
                isRecheckPending
                  ? "bg-accent-orange text-white"
                  : "bg-primary-800 text-white"
              )}
            >
              {currentIndex + 1}
            </span>
            <div>
              <div className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                {currentInspection.name}
                {isRecheckPending && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent-orange/15 text-accent-orange text-[10px] font-semibold">
                    <Pause className="w-3 h-3" />
                    待复测
                  </span>
                )}
                {currentPoint.recheckCount > 0 && !isRecheckPending && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-semibold">
                    已复测{currentPoint.recheckCount}次
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-400">
                本组第 {currentIndex + 1} / {filteredPoints.length} 点 ·
                状态：{getPointStatusLabel(currentPoint.status)}
              </div>
            </div>
          </div>
          {displayResult && !isRecheckPending && (
            <span
              className={cn(
                "px-3 py-1 rounded-full text-xs font-semibold border",
                getResultColorClass(displayResult)
              )}
            >
              {getResultLabel(displayResult)}
            </span>
          )}
          {isRecheckPending && (
            <span className="px-3 py-1 rounded-full text-xs font-semibold border border-accent-orange/30 bg-orange-50 text-accent-orange">
              请重新测量
            </span>
          )}
        </div>

        {/* 测点信息卡 */}
        <div className="card p-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4 text-primary-700" />
              </div>
              <div>
                <div className="text-xs text-gray-400">房间</div>
                <div className="text-sm font-semibold text-gray-800 mt-0.5">
                  {currentPoint.roomName}
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                <Target className="w-4 h-4 text-accent-orange" />
              </div>
              <div>
                <div className="text-xs text-gray-400">测点位置</div>
                <div className="text-sm font-semibold text-gray-800 mt-0.5">
                  {currentPoint.location}
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                <Hash className="w-4 h-4 text-status-qualified" />
              </div>
              <div>
                <div className="text-xs text-gray-400">允许偏差</div>
                <div className="text-sm font-semibold text-gray-800 mt-0.5">
                  ±{currentPoint.allowableDeviation}mm
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                <GripVertical className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <div className="text-xs text-gray-400">测量方法</div>
                <div className="text-xs font-medium text-gray-700 mt-1 leading-snug">
                  {currentInspection.description}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 户型点位列图 */}
        <div className="card p-4">
          <div className="text-xs text-gray-500 mb-3 flex items-center justify-between">
            <span>同检查项测点分布（点击跳转）</span>
            <span className="flex items-center gap-2 text-[10px]">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-gray-300" />
                待测
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-accent-orange" />
                待复测
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-status-qualified" />
                合格
              </span>
            </span>
          </div>
          <div className="grid grid-cols-8 gap-1.5">
            {filteredPoints.map((p, idx) => (
              <button
                key={p.id}
                onClick={() => setCurrentIndex(idx)}
                className={cn(
                  "aspect-square rounded-lg text-[10px] font-bold flex items-center justify-center relative transition-all",
                  getPointColor(p),
                  idx === currentIndex &&
                    "scale-110 shadow-md z-10 ring-2 ring-primary-800/40"
                )}
              >
                {idx + 1}
                {idx === currentIndex && (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-accent-orange animate-pulseDot" />
                )}
                {p.status === "recheck_pending" && idx !== currentIndex && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-white border border-accent-orange" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 数值输入显示区 */}
        <div
          className={cn(
            "card p-5 border-l-4 transition-colors",
            isRecheckPending && "border-l-accent-orange",
            !isRecheckPending &&
              displayResult === "qualified" &&
              "border-l-status-qualified",
            !isRecheckPending &&
              displayResult === "critical" &&
              "border-l-status-critical",
            !isRecheckPending &&
              displayResult === "out" &&
              "border-l-status-out",
            !isRecheckPending && !displayResult && "border-l-transparent"
          )}
        >
          <div className="flex items-center justify-between mb-1">
            <div className="text-xs text-gray-500">
              {isRecheckPending ? "复测读数" : "测量读数"}
            </div>
            {currentPoint.standardValue > 0 && (
              <div className="text-xs text-gray-400">
                标准值 {currentPoint.standardValue}mm
              </div>
            )}
          </div>
          <div className="flex items-end justify-between">
            <div className="flex items-baseline gap-2">
              <span
                className={cn(
                  "text-5xl font-bold tracking-tight",
                  isRecheckPending && "text-accent-orange",
                  !isRecheckPending &&
                    displayResult === "qualified" &&
                    "text-status-qualified",
                  !isRecheckPending &&
                    displayResult === "critical" &&
                    "text-status-critical",
                  !isRecheckPending &&
                    displayResult === "out" &&
                    "text-status-out",
                  !isRecheckPending && !displayResult && "text-gray-800"
                )}
              >
                {inputValue || "--"}
              </span>
              <span className="text-xl font-medium text-gray-400 mb-1">mm</span>
            </div>
            {displayDeviation !== undefined && !isRecheckPending && (
              <div className="text-right">
                <div className="text-xs text-gray-400">偏差值</div>
                <div
                  className={cn(
                    "text-lg font-bold",
                    displayResult === "qualified" && "text-status-qualified",
                    displayResult === "critical" && "text-status-critical",
                    displayResult === "out" && "text-status-out"
                  )}
                >
                  {displayDeviation > 0 ? "+" : ""}
                  {displayDeviation.toFixed(1)}mm
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">
                  占允许值 {((displayDeviationPercent ?? 0) * 100).toFixed(0)}%
                </div>
              </div>
            )}
          </div>

          {isRecheckPending && (
            <div className="mt-4 p-3 rounded-xl bg-orange-50 border border-accent-orange/20 flex items-center gap-2 animate-slideUp">
              <RefreshCw className="w-5 h-5 text-accent-orange shrink-0 animate-spin" />
              <div className="text-sm font-medium text-orange-800">
                此点正处于待复测状态，请输入新的测量读数后点"确认读数"
              </div>
            </div>
          )}

          {displayResult && !isRecheckPending && (
            <div
              className={cn(
                "mt-4 p-3 rounded-xl flex items-center gap-2 animate-slideUp",
                displayResult === "qualified" && "bg-status-qualifiedBg",
                displayResult === "critical" && "bg-status-criticalBg",
                displayResult === "out" && "bg-status-outBg"
              )}
            >
              {displayResult === "qualified" && (
                <CheckCircle className="w-5 h-5 text-status-qualified shrink-0" />
              )}
              {displayResult === "critical" && (
                <AlertCircle className="w-5 h-5 text-status-critical shrink-0" />
              )}
              {displayResult === "out" && (
                <AlertTriangle className="w-5 h-5 text-status-out shrink-0" />
              )}
              <div className="text-sm font-medium flex-1">
                {displayResult === "qualified" && "测量合格，可进入下一点"}
                {displayResult === "critical" &&
                  "接近偏差上限，建议关注，可确认后继续"}
                {displayResult === "out" && "超出允许偏差，请确认是否复测"}
              </div>
            </div>
          )}
        </div>

        {/* 拍照留痕区 */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-gray-600" />
              <span className="font-medium text-gray-800 text-sm">拍照留痕</span>
              <span className="text-xs text-gray-400">(可选)</span>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-50 text-primary-800 text-xs font-medium active:bg-primary-100"
            >
              <Camera className="w-3.5 h-3.5" />
              拍照/上传
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              capture="environment"
              onChange={handlePhotoCapture}
              className="hidden"
            />
          </div>

          <div className="grid grid-cols-4 gap-2">
            {tempPhotos.map((photo, idx) => (
              <div
                key={`temp-${idx}`}
                className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 ring-2 ring-accent-orange/40"
              >
                <img
                  src={photo}
                  alt=""
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => setShowPhotoPreview(photo)}
                />
                <div className="absolute top-0 left-0 right-0 bg-accent-orange/90 text-white text-[10px] py-0.5 text-center">
                  待保存
                </div>
                <button
                  onClick={() => removeTempPhoto(idx)}
                  className="absolute top-5 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            {currentPoint.photos.map((photo, idx) => (
              <div
                key={`saved-${idx}`}
                className="relative aspect-square rounded-xl overflow-hidden bg-gray-100"
              >
                <img
                  src={photo}
                  alt=""
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => setShowPhotoPreview(photo)}
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1">
                  <div className="text-[10px] text-white text-center">已存</div>
                </div>
              </div>
            ))}
            {tempPhotos.length === 0 && currentPoint.photos.length === 0 && (
              <div className="col-span-4 py-6 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center text-gray-400">
                <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                <span className="text-xs">暂无照片，点击右上角按钮添加</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 底部固定区 - 数字键盘和操作按钮 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 pb-4 z-30">
        {/* 数字键盘 */}
        <div className="grid grid-cols-4 gap-1.5 p-3 pb-2 max-w-md mx-auto">
          {["7", "8", "9", "del", "4", "5", "6", "-", "1", "2", "3", "."].map(
            (key) => (
              <button
                key={key}
                onClick={() => handleNumberInput(key)}
                className={cn(
                  "h-11 rounded-xl text-lg font-semibold transition-all active:scale-95",
                  key === "del"
                    ? "bg-gray-100 text-gray-600 text-base"
                    : key === "-" || key === "."
                    ? "bg-gray-50 text-gray-600"
                    : "bg-gray-100 text-gray-800"
                )}
              >
                {key === "del" ? "⌫" : key}
              </button>
            )
          )}
          <button
            onClick={() => handleNumberInput("0")}
            className="h-11 rounded-xl text-lg font-semibold bg-gray-100 text-gray-800 active:scale-95 transition-all"
          >
            0
          </button>
          <button
            onClick={goPrev}
            disabled={currentIndex === 0}
            className="h-11 rounded-xl bg-gray-50 text-gray-500 flex items-center justify-center active:bg-gray-100 disabled:opacity-30"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={handleConfirm}
            disabled={inputValue === "" || inputValue === "-"}
            className={cn(
              "h-11 rounded-xl col-span-2 text-white font-semibold text-base active:opacity-90 disabled:opacity-40",
              isRecheckPending
                ? "bg-accent-orange active:bg-orange-600"
                : "bg-primary-800 active:bg-primary-900"
            )}
          >
            {isRecheckPending ? "确认复测读数" : "确认读数"}
          </button>
        </div>

        {/* 上一点/复测/下一点 */}
        <div className="flex gap-3 px-4 pt-1 max-w-md mx-auto">
          <button
            onClick={goPrev}
            disabled={currentIndex === 0}
            className="flex-1 btn-secondary h-12 flex items-center justify-center gap-1.5 disabled:opacity-40 text-sm"
          >
            <ChevronLeft className="w-4 h-4" />
            上一点
          </button>
          <button
            onClick={handleManualRecheck}
            className="btn-orange h-12 px-4 flex items-center justify-center gap-1.5 text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            复测
          </button>
          <button
            onClick={goNext}
            className="flex-1 btn-primary h-12 flex items-center justify-center gap-1.5 text-sm"
          >
            {currentIndex < filteredPoints.length - 1 ? "下一点" : "完成本组"}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 复测确认弹窗 */}
      {showRecheckModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
          <div className="w-full max-w-md bg-white rounded-t-3xl p-5 pb-7 animate-slideUp">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-status-outBg flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-status-out" />
              </div>
              <div className="flex-1">
                <div className="text-lg font-bold text-gray-900">
                  检测到超差
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  当前读数偏差{" "}
                  <span className="text-status-out font-bold">
                    {(displayDeviation ?? 0) > 0 ? "+" : ""}
                    {(displayDeviation ?? 0).toFixed(1)}mm
                  </span>
                  ，超出允许值 ±{currentPoint.allowableDeviation}mm
                </div>
                <div className="text-xs text-gray-400 mt-2">
                  点"重新测量"后此点会回到待复测状态，不计入已完成统计
                </div>
              </div>
            </div>

            <div className="p-3 bg-gray-50 rounded-xl mb-5">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="text-xs text-gray-400">测点</div>
                  <div className="text-sm font-semibold text-gray-800 mt-1">
                    {currentPoint.roomName}
                    <br />
                    {currentPoint.location}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">读数</div>
                  <div className="text-xl font-bold text-status-out mt-1">
                    {inputValue}
                    <span className="text-xs font-normal text-gray-400 ml-0.5">
                      mm
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">状态</div>
                  <div className="mt-1">
                    <span className="px-2.5 py-1 rounded-full bg-status-outBg text-status-out text-xs font-bold border border-status-out/30">
                      超差
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleRecheck}
                className="btn-secondary h-12 flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-4 h-4" />
                重新测量
              </button>
              <button
                onClick={handleConfirmedOut}
                className="btn-danger h-12 flex items-center justify-center gap-1.5"
              >
                <CheckCircle className="w-4 h-4" />
                确认超差
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 照片预览弹窗 */}
      {showPhotoPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setShowPhotoPreview(null)}
        >
          <button
            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center"
            onClick={() => setShowPhotoPreview(null)}
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={showPhotoPreview}
            alt=""
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}
    </div>
  );
}
