import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import TaskListPage from "@/pages/TaskListPage";
import MeasurePage from "@/pages/MeasurePage";
import ResultPage from "@/pages/ResultPage";

export default function App() {
  return (
    <Router>
      <div className="max-w-md mx-auto min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={<Navigate to="/tasks" replace />} />
          <Route path="/tasks" element={<TaskListPage />} />
          <Route path="/measure/:taskId" element={<MeasurePage />} />
          <Route path="/result/:taskId" element={<ResultPage />} />
          <Route path="*" element={<Navigate to="/tasks" replace />} />
        </Routes>
      </div>
    </Router>
  );
}
