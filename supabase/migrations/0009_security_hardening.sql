-- Phase 6 — Migration 9: security hardening.
-- Closes two gaps flagged repeatedly in earlier phases' "Known
-- limitations" sections rather than letting them quietly become
-- permanent. Migrations are append-only (we never edit 0001-0008) -
-- this one layers corrected policies on top.

-- ===================== 1. Quiz scoring, for real this time =====================
-- Previously, authenticated clients could select the full `questions`
-- table (answer key included) to self-score at submit time. That policy
-- is removed. From now on there is NO way for a browser to read
-- `correct_answer` at all - scoring happens entirely inside the new
-- score-quiz Edge Function (service role). questions_for_quiz (the
-- no-answer-key view used while taking the quiz) is unaffected.
drop policy "questions_authenticated_select" on public.questions;

-- This alone wasn't enough: a student could still directly UPDATE their
-- own quiz_attempts row (e.g. setting status='submitted', score=100)
-- without ever calling score-quiz, because the old "quiz_attempts_self"
-- policy allowed ALL operations on their own rows. Splitting it to
-- select+insert only, with NO update/delete for the student, means the
-- only way an attempt can move to "submitted" with a score is through
-- the Edge Function's service-role write.
drop policy "quiz_attempts_self" on public.quiz_attempts;
create policy "quiz_attempts_self_select" on public.quiz_attempts
  for select using (student_profile_id = auth.uid());
create policy "quiz_attempts_self_insert" on public.quiz_attempts
  for insert with check (student_profile_id = auth.uid());

-- ===================== 2. Teacher read access, scoped at the DB level =====================
-- Phase 2/5 granted any teacher a blanket SELECT on all student_profiles
-- and quiz_attempts, relying on the Teacher Dashboard to filter to
-- assigned classes in the UI only. This function makes that scoping a
-- real database-level rule, matching the "BOARD-CLASSNUMBER" tokens the
-- Admin Portal already writes into teacher_profiles.assigned_classes.
create or replace function public.teacher_has_class(p_board text, p_class_number int)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare
  v_token text := p_board || '-' || p_class_number::text;
  v_found boolean;
begin
  select exists (
    select 1
    from public.teacher_profiles tp,
         jsonb_array_elements_text(tp.assigned_classes) as token
    where tp.profile_id = auth.uid() and token = v_token
  ) into v_found;
  return coalesce(v_found, false);
end;
$$;

drop policy "student_profiles_teacher_select" on public.student_profiles;
create policy "student_profiles_teacher_select" on public.student_profiles
  for select using (public.current_role() = 'teacher' and public.teacher_has_class(board, class_number));

drop policy "quiz_attempts_teacher_select" on public.quiz_attempts;
create policy "quiz_attempts_teacher_select" on public.quiz_attempts
  for select using (
    public.current_role() = 'teacher' and exists (
      select 1 from public.student_profiles sp
      where sp.profile_id = quiz_attempts.student_profile_id
        and public.teacher_has_class(sp.board, sp.class_number)
    )
  );

-- Note for State Board: assigned_classes tokens must match exactly how
-- `board` is stored, e.g. "State Board-10" (with the space), not
-- "STATE-10". The Admin Portal's Users & Roles tab already documents
-- this with its placeholder example.
