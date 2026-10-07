import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
import About from "./pages/About";
import HowItWorks from "./pages/HowItWorks";
import Boards from "./pages/Boards";
import Classes from "./pages/Classes";
import Subjects from "./pages/Subjects";
import Cuet from "./pages/Cuet";
import Safety from "./pages/Safety";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Contact from "./pages/Contact";
import ReportContent from "./pages/ReportContent";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Unauthorized from "./pages/Unauthorized";
import CurriculumExplorer from "./pages/CurriculumExplorer";
import Lesson from "./pages/Lesson";
import Quiz from "./pages/Quiz";
import DashboardRouter from "./pages/dashboard/DashboardRouter";
import NotFound from "./pages/NotFound";

// Phase 2 additions: /curriculum (public, live from Supabase) and
// /dashboard (protected, role-routed). Full Student/Parent/Teacher/Admin
// feature pages (lessons, quizzes, progress, AI Teacher, admin portal)
// are added in Phases 3-5 - /dashboard already enforces the right role
// sees the right shell via ProtectedRoute + DashboardRouter.
export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/boards" element={<Boards />} />
        <Route path="/classes" element={<Classes />} />
        <Route path="/subjects" element={<Subjects />} />
        <Route path="/curriculum" element={<CurriculumExplorer />} />
        <Route path="/cuet" element={<Cuet />} />
        <Route path="/safety" element={<Safety />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/report-content" element={<ReportContent />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardRouter />
            </ProtectedRoute>
          }
        />
        <Route
          path="/learn/:topicId"
          element={
            <ProtectedRoute>
              <Lesson />
            </ProtectedRoute>
          }
        />
        <Route
          path="/quiz/:quizId"
          element={
            <ProtectedRoute>
              <Quiz />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
}
