import { useAuth } from "../../context/AuthContext";
import StudentDashboard from "./StudentDashboard";
import ParentDashboard from "./ParentDashboard";
import TeacherDashboard from "./TeacherDashboard";
import AdminDashboard from "./AdminDashboard";

// Sends a freshly logged-in user to the dashboard that matches their role.
// This is the core of "role management" for Phase 2 - the admin portal,
// teacher tools, and parent progress views are still stubs; what's real
// here is that the correct one loads and no other role can reach it
// (enforced both here and, more importantly, by RLS in the database).
export default function DashboardRouter() {
  const { profile, loading } = useAuth();

  if (loading) {
    return <div className="px-4 py-20 text-center text-ink/60">Loading…</div>;
  }

  switch (profile?.role) {
    case "parent":
      return <ParentDashboard />;
    case "teacher":
      return <TeacherDashboard />;
    case "reviewer":
    case "admin":
      return <AdminDashboard />;
    default:
      return <StudentDashboard />;
  }
}
