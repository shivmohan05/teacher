-- Phase 2 — Migration 3: Row-Level Security. Every table from migrations
-- 0001 and 0002 is covered. No table is left world-writable.

alter table public.profiles enable row level security;
alter table public.student_profiles enable row level security;
alter table public.parent_profiles enable row level security;
alter table public.teacher_profiles enable row level security;
alter table public.parent_student_links enable row level security;
alter table public.consent_records enable row level security;
alter table public.audit_logs enable row level security;
alter table public.feature_flags enable row level security;
alter table public.boards enable row level security;
alter table public.states enable row level security;
alter table public.classes enable row level security;
alter table public.subjects enable row level security;
alter table public.board_subjects enable row level security;
alter table public.chapters enable row level security;
alter table public.topics enable row level security;

grant execute on function public.current_role() to authenticated, anon;

-- profiles: a user always sees/updates their own row; admins see all.
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_select_admin" on public.profiles
  for select using (public.current_role() = 'admin');
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- student_profiles: the student themselves, their approved-linked
-- parent(s), any teacher, or an admin.
create policy "student_profiles_self_select" on public.student_profiles
  for select using (profile_id = auth.uid());
create policy "student_profiles_self_insert" on public.student_profiles
  for insert with check (profile_id = auth.uid());
create policy "student_profiles_self_update" on public.student_profiles
  for update using (profile_id = auth.uid());
create policy "student_profiles_parent_select" on public.student_profiles
  for select using (
    exists (
      select 1 from public.parent_student_links l
      where l.student_profile_id = student_profiles.profile_id
        and l.parent_profile_id = auth.uid()
        and l.status = 'approved'
    )
  );
create policy "student_profiles_teacher_select" on public.student_profiles
  for select using (public.current_role() = 'teacher');
create policy "student_profiles_admin_all" on public.student_profiles
  for all using (public.current_role() = 'admin');

-- parent_profiles / teacher_profiles: self access, admin oversight.
create policy "parent_profiles_self" on public.parent_profiles
  for all using (profile_id = auth.uid());
create policy "teacher_profiles_self_select" on public.teacher_profiles
  for select using (profile_id = auth.uid());
create policy "teacher_profiles_admin_all" on public.teacher_profiles
  for all using (public.current_role() = 'admin');

-- parent_student_links: each side only sees their own links; a parent
-- can create a (pending) link to request access; admin manages all.
create policy "links_parent_select" on public.parent_student_links
  for select using (parent_profile_id = auth.uid());
create policy "links_student_select" on public.parent_student_links
  for select using (student_profile_id = auth.uid());
create policy "links_parent_insert" on public.parent_student_links
  for insert with check (parent_profile_id = auth.uid());
create policy "links_admin_all" on public.parent_student_links
  for all using (public.current_role() = 'admin');

-- consent_records: a student can record their own consent at signup;
-- only admins can read the resulting records.
create policy "consent_insert_self" on public.consent_records
  for insert with check (student_profile_id = auth.uid());
create policy "consent_admin_select" on public.consent_records
  for select using (public.current_role() = 'admin');

-- audit_logs: admin read-only. Writes are intentionally not exposed to
-- any client-side role yet - Phase 4/5 server-side functions write these
-- using the service role key, which never reaches the browser.
create policy "audit_admin_select" on public.audit_logs
  for select using (public.current_role() = 'admin');

-- feature_flags: anyone can read flags marked enabled; only admins
-- manage them.
create policy "flags_public_select" on public.feature_flags
  for select using (enabled = true or public.current_role() = 'admin');
create policy "flags_admin_all" on public.feature_flags
  for all using (public.current_role() = 'admin');

-- Curriculum structure tables (boards/states/classes/subjects/board_subjects)
-- are reference data - safe to read publicly so the marketing pages and
-- the curriculum explorer work without logging in. Only admins/reviewers
-- can change them (enforced here now; an admin UI arrives in Phase 5).
create policy "boards_public_select" on public.boards for select using (true);
create policy "states_public_select" on public.states for select using (true);
create policy "classes_public_select" on public.classes for select using (true);
create policy "subjects_public_select" on public.subjects for select using (true);
create policy "board_subjects_public_select" on public.board_subjects for select using (true);

create policy "boards_admin_write" on public.boards for insert with check (public.current_role() = 'admin');
create policy "boards_admin_update" on public.boards for update using (public.current_role() = 'admin');
create policy "subjects_admin_write" on public.subjects for insert with check (public.current_role() = 'admin');
create policy "subjects_admin_update" on public.subjects for update using (public.current_role() = 'admin');
create policy "board_subjects_admin_write" on public.board_subjects for insert with check (public.current_role() = 'admin');

-- Chapters/topics: published content is public; draft/under-review content
-- is visible only to admins, reviewers, and teachers (who may be writing
-- or checking it). Only admins/reviewers can create or edit.
create policy "chapters_public_select" on public.chapters
  for select using (status = 'published' or public.current_role() in ('admin', 'reviewer', 'teacher'));
create policy "chapters_reviewer_insert" on public.chapters
  for insert with check (public.current_role() in ('admin', 'reviewer'));
create policy "chapters_reviewer_update" on public.chapters
  for update using (public.current_role() in ('admin', 'reviewer'));

create policy "topics_public_select" on public.topics
  for select using (status = 'published' or public.current_role() in ('admin', 'reviewer', 'teacher'));
create policy "topics_reviewer_insert" on public.topics
  for insert with check (public.current_role() in ('admin', 'reviewer'));
create policy "topics_reviewer_update" on public.topics
  for update using (public.current_role() in ('admin', 'reviewer'));
