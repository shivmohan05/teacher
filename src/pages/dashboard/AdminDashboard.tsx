import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import type {
  ProfileRow,
  AppRole,
  ChapterRow,
  TopicRow,
  LessonRow,
  ContentReportRow,
} from "../../types/database";

type Tab = "overview" | "users" | "content" | "reports" | "ai" | "flags" | "audit";

interface FeatureFlagRow {
  key: string;
  enabled: boolean;
  description: string | null;
}

interface AuditLogRow {
  id: string;
  actor_id: string | null;
  action: string;
  target_table: string | null;
  target_id: string | null;
  created_at: string;
}

interface ContentItem {
  id: string;
  kind: "chapter" | "topic" | "lesson";
  title: string;
  status: string;
}

export default function AdminDashboard() {
  const { profile, user, signOut } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);

  const [counts, setCounts] = useState({ students: 0, teachers: 0, parents: 0, pendingLinks: 0, openReports: 0, aiToday: 0 });
  const [users, setUsers] = useState<ProfileRow[]>([]);
  const [teacherClassInputs, setTeacherClassInputs] = useState<Record<string, string>>({});
  const [content, setContent] = useState<ContentItem[]>([]);
  const [reports, setReports] = useState<ContentReportRow[]>([]);
  const [flags, setFlags] = useState<FeatureFlagRow[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogRow[]>([]);
  const [aiStats, setAiStats] = useState<{ totalToday: number; byAction: Record<string, number> }>({ totalToday: 0, byAction: {} });
  const [notice, setNotice] = useState<string | null>(null);

  async function logAudit(action: string, targetTable?: string, targetId?: string) {
    if (!supabase || !user) return;
    await supabase.from("audit_logs").insert({ actor_id: user.id, action, target_table: targetTable, target_id: targetId });
  }

  async function loadAll() {
    if (!supabase) return;
    setLoading(true);
    const today = new Date().toISOString().slice(0, 10);

    const [studentsC, teachersC, parentsC, pendingC, reportsC, usageRows, usersData, chapters, topics, lessons, reportRows, flagRows, auditRows, convoRows] =
      await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student"),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "teacher"),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "parent"),
        supabase.from("parent_student_links").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("content_reports").select("id", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("ai_usage").select("request_count").eq("usage_date", today),
        supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(50),
        supabase.from("chapters").select("*").neq("status", "published").limit(20),
        supabase.from("topics").select("*").neq("status", "published").limit(20),
        supabase.from("lessons").select("*").neq("status", "published").limit(20),
        supabase.from("content_reports").select("*").eq("status", "open").order("created_at", { ascending: false }).limit(20),
        supabase.from("feature_flags").select("*"),
        supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(20),
        supabase.from("ai_conversations").select("action").order("created_at", { ascending: false }).limit(200),
      ]);

    const aiTotalToday = (usageRows.data ?? []).reduce((sum, r) => sum + (r.request_count ?? 0), 0);
    setCounts({
      students: studentsC.count ?? 0,
      teachers: teachersC.count ?? 0,
      parents: parentsC.count ?? 0,
      pendingLinks: pendingC.count ?? 0,
      openReports: reportsC.count ?? 0,
      aiToday: aiTotalToday,
    });

    setUsers((usersData.data as ProfileRow[]) ?? []);

    const items: ContentItem[] = [
      ...((chapters.data as ChapterRow[]) ?? []).map((c) => ({ id: c.id, kind: "chapter" as const, title: c.title_en, status: c.status })),
      ...((topics.data as TopicRow[]) ?? []).map((t) => ({ id: t.id, kind: "topic" as const, title: t.title_en, status: t.status })),
      ...((lessons.data as LessonRow[]) ?? []).map((l) => ({ id: l.id, kind: "lesson" as const, title: l.topic_id, status: l.status })),
    ];
    setContent(items);

    setReports((reportRows.data as ContentReportRow[]) ?? []);
    setFlags((flagRows.data as FeatureFlagRow[]) ?? []);
    setAuditLog((auditRows.data as AuditLogRow[]) ?? []);

    const byAction: Record<string, number> = {};
    for (const row of convoRows.data ?? []) {
      byAction[row.action] = (byAction[row.action] ?? 0) + 1;
    }
    setAiStats({ totalToday: aiTotalToday, byAction });

    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, [user]);

  async function changeRole(targetId: string, newRole: AppRole) {
    if (!supabase) return;
    await supabase.from("profiles").update({ role: newRole }).eq("id", targetId);
    await logAudit(`role_changed_to_${newRole}`, "profiles", targetId);
    setNotice("Role updated.");
    loadAll();
  }

  async function saveTeacherClasses(targetId: string) {
    if (!supabase) return;
    const raw = teacherClassInputs[targetId] ?? "";
    const classes = raw.split(",").map((s) => s.trim()).filter(Boolean);
    await supabase.from("teacher_profiles").upsert({ profile_id: targetId, assigned_classes: classes });
    await logAudit("teacher_classes_updated", "teacher_profiles", targetId);
    setNotice("Assigned classes saved.");
  }

  async function changeContentStatus(item: ContentItem, newStatus: string) {
    if (!supabase) return;
    const table = item.kind === "chapter" ? "chapters" : item.kind === "topic" ? "topics" : "lessons";
    await supabase.from(table).update({ status: newStatus }).eq("id", item.id);
    await logAudit(`content_status_${newStatus}`, table, item.id);
    setNotice("Content status updated.");
    loadAll();
  }

  async function resolveReport(id: string) {
    if (!supabase) return;
    await supabase.from("content_reports").update({ status: "resolved" }).eq("id", id);
    await logAudit("content_report_resolved", "content_reports", id);
    setReports((prev) => prev.filter((r) => r.id !== id));
  }

  async function toggleFlag(key: string, enabled: boolean) {
    if (!supabase) return;
    await supabase.from("feature_flags").update({ enabled: !enabled }).eq("key", key);
    await logAudit(`feature_flag_${!enabled ? "enabled" : "disabled"}`, "feature_flags", key);
    setFlags((prev) => prev.map((f) => (f.key === key ? { ...f, enabled: !enabled } : f)));
  }

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "overview", label: "Overview" },
    { id: "users", label: "Users & Roles" },
    { id: "content", label: "Content Review" },
    { id: "reports", label: `Reports${counts.openReports ? ` (${counts.openReports})` : ""}` },
    { id: "ai", label: "AI Usage" },
    { id: "flags", label: "Feature Flags" },
    { id: "audit", label: "Audit Log" },
  ];

  return (
    <section className="mx-auto max-w-4xl px-4 py-14 md:px-6">
      <h1 className="font-display text-3xl font-bold">
        Welcome{profile ? `, ${profile.display_name}` : ""}
      </h1>
      <p className="mt-2 text-ink/60">
        Role: <span className="font-medium text-primary">{profile?.role === "reviewer" ? "content reviewer" : "administrator"}</span>
      </p>

      {notice && <p className="mt-3 rounded-card bg-tint px-4 py-2 text-sm text-primary">{notice}</p>}

      <div className="mt-6 flex flex-wrap gap-2 border-b border-black/5 pb-3">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${tab === t.id ? "bg-primary text-white" : "bg-tint text-primary"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="mt-6 text-ink/60">Loading…</p>
      ) : (
        <div className="mt-6">
          {tab === "overview" && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Stat label="Students" value={String(counts.students)} />
              <Stat label="Teachers" value={String(counts.teachers)} />
              <Stat label="Parents" value={String(counts.parents)} />
              <Stat label="Pending parent links" value={String(counts.pendingLinks)} />
              <Stat label="Open content reports" value={String(counts.openReports)} />
              <Stat label="AI requests today" value={String(counts.aiToday)} />
            </div>
          )}

          {tab === "users" && (
            <div className="space-y-3">
              {users.map((u) => (
                <div key={u.id} className="rounded-card border border-black/5 bg-white p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-ink">{u.display_name}</p>
                      <p className="text-xs text-ink/40">{u.id}</p>
                    </div>
                    <select
                      defaultValue={u.role}
                      onChange={(e) => changeRole(u.id, e.target.value as AppRole)}
                      className="rounded-lg border border-black/10 px-2 py-1 text-sm"
                    >
                      {(["student", "parent", "teacher", "reviewer", "admin"] as AppRole[]).map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                  {u.role === "teacher" && (
                    <div className="mt-2 flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. CBSE-10, CBSE-3"
                        value={teacherClassInputs[u.id] ?? ""}
                        onChange={(e) => setTeacherClassInputs((prev) => ({ ...prev, [u.id]: e.target.value }))}
                        className="flex-1 rounded-lg border border-black/10 px-2 py-1 text-sm"
                      />
                      <button type="button" onClick={() => saveTeacherClasses(u.id)} className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white">
                        Save classes
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {tab === "content" && (
            <div className="space-y-2">
              {content.length === 0 && <p className="text-ink/60">Nothing pending review.</p>}
              {content.map((item) => (
                <div key={`${item.kind}-${item.id}`} className="flex items-center justify-between rounded-card border border-black/5 bg-white px-4 py-2">
                  <span className="text-sm">
                    <span className="text-ink/40">{item.kind}:</span> {item.title}
                  </span>
                  <select
                    defaultValue={item.status}
                    onChange={(e) => changeContentStatus(item, e.target.value)}
                    className="rounded-lg border border-black/10 px-2 py-1 text-sm"
                  >
                    {["draft", "ai_generated", "under_review", "approved", "published", "archived", "rejected"].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              ))}
              <p className="mt-3 rounded-card bg-tint px-4 py-3 text-sm text-primary">
                Creating brand-new boards/subjects/chapters/topics/lessons from this UI is deferred - see README
                "Known limitations". New curriculum structure is still added via SQL migrations for now; this tab
                reviews and publishes what already exists.
              </p>
            </div>
          )}

          {tab === "reports" && (
            <div className="space-y-2">
              {reports.length === 0 && <p className="text-ink/60">No open reports.</p>}
              {reports.map((r) => (
                <div key={r.id} className="rounded-card border border-black/5 bg-white p-3">
                  <p className="text-sm font-medium">{r.where_text}</p>
                  <p className="mt-1 text-sm text-ink/60">{r.details}</p>
                  <button type="button" onClick={() => resolveReport(r.id)} className="mt-2 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white">
                    Mark resolved
                  </button>
                </div>
              ))}
            </div>
          )}

          {tab === "ai" && (
            <div>
              <div className="grid grid-cols-2 gap-3">
                <Stat label="AI requests today" value={String(aiStats.totalToday)} />
                <Stat label="Logged conversations (sample)" value={String(Object.values(aiStats.byAction).reduce((a, b) => a + b, 0))} />
              </div>
              <h3 className="mt-4 font-display text-base font-bold">By action (last 200 logged)</h3>
              <ul className="mt-2 space-y-1 text-sm">
                {Object.entries(aiStats.byAction).map(([action, count]) => (
                  <li key={action} className="flex justify-between">
                    <span>{action}</span>
                    <span className="font-semibold text-primary">{count}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {tab === "flags" && (
            <div className="space-y-2">
              {flags.map((f) => (
                <div key={f.key} className="flex items-center justify-between rounded-card border border-black/5 bg-white px-4 py-3">
                  <div>
                    <p className="font-medium">{f.key}</p>
                    <p className="text-xs text-ink/50">{f.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleFlag(f.key, f.enabled)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ${f.enabled ? "bg-teal text-white" : "bg-paper text-ink/50 ring-1 ring-black/10"}`}
                  >
                    {f.enabled ? "Enabled" : "Disabled"}
                  </button>
                </div>
              ))}
            </div>
          )}

          {tab === "audit" && (
            <ul className="space-y-1 text-sm">
              {auditLog.map((a) => (
                <li key={a.id} className="flex justify-between border-b border-black/5 py-1">
                  <span>{a.action} {a.target_table ? `(${a.target_table})` : ""}</span>
                  <span className="text-ink/40">{new Date(a.created_at).toLocaleString()}</span>
                </li>
              ))}
              {auditLog.length === 0 && <p className="text-ink/60">No audit entries yet.</p>}
            </ul>
          )}
        </div>
      )}

      <button type="button" onClick={() => signOut()} className="mt-8 rounded-full border border-primary/20 px-5 py-2.5 font-semibold text-primary">
        Log out
      </button>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card bg-tint px-3 py-4">
      <p className="text-lg font-bold text-primary">{value}</p>
      <p className="mt-1 text-xs text-primary/70">{label}</p>
    </div>
  );
}
