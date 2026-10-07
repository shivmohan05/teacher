-- Phase 3 — Migration 6: Row-Level Security for lessons, quizzes, and
-- progress tracking.

alter table public.lessons enable row level security;
alter table public.lesson_translations enable row level security;
alter table public.questions enable row level security;
alter table public.question_options enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.quiz_answers enable row level security;
alter table public.progress enable row level security;
alter table public.bookmarks enable row level security;
alter table public.study_sessions enable row level security;
alter table public.daily_goals enable row level security;

-- lessons / lesson_translations: published is public; draft/under-review
-- visible to staff roles only (same pattern as chapters/topics).
create policy "lessons_public_select" on public.lessons
  for select using (status = 'published' or public.current_role() in ('admin', 'reviewer', 'teacher'));
create policy "lessons_staff_insert" on public.lessons
  for insert with check (public.current_role() in ('admin', 'reviewer'));
create policy "lessons_staff_update" on public.lessons
  for update using (public.current_role() in ('admin', 'reviewer'));

create policy "lesson_translations_public_select" on public.lesson_translations
  for select using (
    exists (
      select 1 from public.lessons l
      where l.id = lesson_translations.lesson_id
        and (l.status = 'published' or public.current_role() in ('admin', 'reviewer', 'teacher'))
    )
  );
create policy "lesson_translations_staff_insert" on public.lesson_translations
  for insert with check (public.current_role() in ('admin', 'reviewer'));
create policy "lesson_translations_staff_update" on public.lesson_translations
  for update using (public.current_role() in ('admin', 'reviewer'));

-- questions / question_options: readable by any signed-in user so
-- client-side scoring works without a backend function yet (see README
-- "Known limitations" - this is the one real security compromise in
-- this phase, with a clear fix path in Phase 4).
create policy "questions_authenticated_select" on public.questions
  for select using (auth.role() = 'authenticated' and status = 'published');
create policy "questions_staff_all" on public.questions
  for all using (public.current_role() in ('admin', 'reviewer'));

create policy "question_options_authenticated_select" on public.question_options
  for select using (auth.role() = 'authenticated');
create policy "question_options_staff_all" on public.question_options
  for all using (public.current_role() in ('admin', 'reviewer'));

create policy "quizzes_authenticated_select" on public.quizzes
  for select using (auth.role() = 'authenticated');
create policy "quizzes_staff_all" on public.quizzes
  for all using (public.current_role() in ('admin', 'reviewer'));

create policy "quiz_questions_authenticated_select" on public.quiz_questions
  for select using (auth.role() = 'authenticated');
create policy "quiz_questions_staff_all" on public.quiz_questions
  for all using (public.current_role() in ('admin', 'reviewer'));

-- quiz_attempts / quiz_answers: a student only ever sees or writes their
-- own attempts; teachers get read access, admins get everything.
create policy "quiz_attempts_self" on public.quiz_attempts
  for all using (student_profile_id = auth.uid()) with check (student_profile_id = auth.uid());
create policy "quiz_attempts_teacher_select" on public.quiz_attempts
  for select using (public.current_role() = 'teacher');
create policy "quiz_attempts_admin_all" on public.quiz_attempts
  for all using (public.current_role() = 'admin');

create policy "quiz_answers_self" on public.quiz_answers
  for all using (
    exists (select 1 from public.quiz_attempts a where a.id = quiz_answers.attempt_id and a.student_profile_id = auth.uid())
  ) with check (
    exists (select 1 from public.quiz_attempts a where a.id = quiz_answers.attempt_id and a.student_profile_id = auth.uid())
  );
create policy "quiz_answers_admin_all" on public.quiz_answers
  for all using (public.current_role() = 'admin');

-- progress / bookmarks: self, plus an approved-linked parent's read
-- access (the same link used in Phase 2), plus admin.
create policy "progress_self" on public.progress
  for all using (student_profile_id = auth.uid()) with check (student_profile_id = auth.uid());
create policy "progress_parent_select" on public.progress
  for select using (
    exists (
      select 1 from public.parent_student_links l
      where l.student_profile_id = progress.student_profile_id
        and l.parent_profile_id = auth.uid() and l.status = 'approved'
    )
  );
create policy "progress_admin_all" on public.progress
  for all using (public.current_role() = 'admin');

create policy "bookmarks_self" on public.bookmarks
  for all using (student_profile_id = auth.uid()) with check (student_profile_id = auth.uid());
create policy "bookmarks_admin_all" on public.bookmarks
  for all using (public.current_role() = 'admin');

-- study_sessions / daily_goals: self + approved parent read + admin.
create policy "study_sessions_self" on public.study_sessions
  for all using (student_profile_id = auth.uid()) with check (student_profile_id = auth.uid());
create policy "study_sessions_admin_all" on public.study_sessions
  for all using (public.current_role() = 'admin');

create policy "daily_goals_self" on public.daily_goals
  for all using (student_profile_id = auth.uid()) with check (student_profile_id = auth.uid());
create policy "daily_goals_parent_select" on public.daily_goals
  for select using (
    exists (
      select 1 from public.parent_student_links l
      where l.student_profile_id = daily_goals.student_profile_id
        and l.parent_profile_id = auth.uid() and l.status = 'approved'
    )
  );
create policy "daily_goals_admin_all" on public.daily_goals
  for all using (public.current_role() = 'admin');
