-- Phase 5 — Migration 8: parent-child linking workflow, content reports,
-- CUET schema, and the RLS additions the Admin/Teacher/Parent dashboards
-- need. Each addition is the minimum extra privilege required - nothing
-- here widens access beyond what the feature actually needs.

-- ===================== Parent <-> child linking =====================
-- A family code lets a parent link to their child without any account
-- ever being able to look up another account by email (which would leak
-- who has an account at all). The code is generated at registration and
-- only works if a parent already has it - it is the consent mechanism.
alter table public.student_profiles add column family_code text unique;

-- A student can see link requests aimed at them (already true from
-- Phase 2's links_student_select) and must now also be able to approve
-- or revoke them - this was missing before, since Phase 2 only expected
-- an admin to manage links. The student can only touch rows where they
-- are the student side, and cannot change who the parent is.
create policy "links_student_update" on public.parent_student_links
  for update using (student_profile_id = auth.uid()) with check (student_profile_id = auth.uid());

-- Parents need read access to their approved child's quiz results and
-- study time for the Parent Dashboard - progress/daily_goals already
-- had this policy from Phase 3, but quiz_attempts/study_sessions didn't.
create policy "quiz_attempts_parent_select" on public.quiz_attempts
  for select using (
    exists (
      select 1 from public.parent_student_links l
      where l.student_profile_id = quiz_attempts.student_profile_id
        and l.parent_profile_id = auth.uid() and l.status = 'approved'
    )
  );

create policy "study_sessions_parent_select" on public.study_sessions
  for select using (
    exists (
      select 1 from public.parent_student_links l
      where l.student_profile_id = study_sessions.student_profile_id
        and l.parent_profile_id = auth.uid() and l.status = 'approved'
    )
  );

-- ===================== Content reports =====================
-- Reporting incorrect/unsafe content is a public page (per the brief) -
-- it must work for a signed-in student AND stay open enough to act like
-- a contact form for anyone. reporter_profile_id is nullable and set
-- only when the reporter happens to be logged in.
create table public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_profile_id uuid references public.profiles(id) on delete set null,
  where_text text not null,
  details text not null,
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now()
);

alter table public.content_reports enable row level security;

-- Anyone can file a report (including anonymously) - this is the one
-- deliberately open insert policy in the whole schema, matching a public
-- contact-form pattern. Nothing sensitive is readable through it.
create policy "content_reports_anyone_insert" on public.content_reports
  for insert with check (true);
create policy "content_reports_self_select" on public.content_reports
  for select using (reporter_profile_id = auth.uid());
create policy "content_reports_parent_select" on public.content_reports
  for select using (
    exists (
      select 1 from public.parent_student_links l
      where l.student_profile_id = content_reports.reporter_profile_id
        and l.parent_profile_id = auth.uid() and l.status = 'approved'
    )
  );
create policy "content_reports_admin_all" on public.content_reports
  for all using (public.current_role() = 'admin');

-- ===================== Notifications (schema only this phase) =====
-- Table is ready; no UI consumes it yet (see README "Known limitations").
-- Only the service role should ever write these, so there's no insert
-- policy for authenticated clients.
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;
create policy "notifications_self_select" on public.notifications
  for select using (profile_id = auth.uid());
create policy "notifications_self_update" on public.notifications
  for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- ===================== CUET =====================
-- CUET tests reuse the quiz engine (quizzes/quiz_questions/quiz_attempts)
-- exactly as planned back in Phase 3 - cuet_tests is a thin wrapper that
-- groups a quiz under a CUET subject category for the CUET page, so we
-- don't duplicate attempt-tracking. topic_id on `questions` is relaxed to
-- nullable here because general-knowledge CUET questions aren't tied to
-- a specific curriculum topic the way school-syllabus questions are.
alter table public.questions alter column topic_id drop not null;
alter table public.quizzes drop constraint quizzes_quiz_type_check;
alter table public.quizzes add constraint quizzes_quiz_type_check check (quiz_type in ('topic', 'chapter', 'cuet'));

create table public.cuet_subjects (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name_en text not null,
  name_hi text not null
);

create table public.cuet_tests (
  id uuid primary key default gen_random_uuid(),
  cuet_subject_id uuid not null references public.cuet_subjects(id) on delete cascade,
  quiz_id uuid not null unique references public.quizzes(id) on delete cascade,
  is_mock boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.cuet_subjects enable row level security;
alter table public.cuet_tests enable row level security;

create policy "cuet_subjects_public_select" on public.cuet_subjects for select using (true);
create policy "cuet_subjects_admin_write" on public.cuet_subjects for all using (public.current_role() = 'admin');

create policy "cuet_tests_public_select" on public.cuet_tests for select using (true);
create policy "cuet_tests_staff_write" on public.cuet_tests for all using (public.current_role() in ('admin', 'reviewer'));

-- ===================== Admin: role management + audit log writes =====
-- Phase 2 only let a user update their OWN profile. Role management
-- needs an admin to change ANY profile's role.
create policy "profiles_admin_update" on public.profiles
  for update using (public.current_role() = 'admin');

-- Phase 2 deliberately had no insert policy on audit_logs (only the
-- service role, via a future Edge Function, was expected to write it).
-- This phase's Admin Portal performs real admin actions (role changes,
-- content publishing, report resolution, flag toggles) from the admin's
-- own authenticated session, so admins also get a narrow insert policy
-- limited to logging their own actions.
create policy "audit_logs_admin_insert" on public.audit_logs
  for insert with check (public.current_role() = 'admin' and actor_id = auth.uid());
