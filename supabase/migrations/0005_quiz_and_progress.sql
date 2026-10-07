-- Phase 3 — Migration 5: quiz engine and progress tracking.
-- Question types supported this phase: mcq_single, true_false, fill_blank.
-- mcq_multi, numerical, short-answer, and match-the-following are left
-- for a later content-authoring pass (the `type` column accepts new
-- values without a migration - only the frontend renderer needs
-- extending). quiz_type supports 'topic' and 'chapter' for now; 'subject'
-- and the CUET-specific test types reuse this same engine in Phase 5/CUET
-- work rather than needing new tables.

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics(id) on delete cascade,
  type text not null check (type in ('mcq_single', 'true_false', 'fill_blank')),
  difficulty text not null default 'medium' check (difficulty in ('easy', 'medium', 'hard')),
  prompt_en text not null,
  prompt_hi text not null,
  -- mcq_single: option order_index (int) as jsonb, e.g. 1
  -- true_false: jsonb boolean, e.g. true
  -- fill_blank: jsonb object keyed by language, e.g. {"en":"incident","hi":"आपतित"}
  correct_answer jsonb not null,
  explanation_en text,
  explanation_hi text,
  status text not null default 'published' check (status in ('draft', 'under_review', 'approved', 'published', 'archived')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  order_index int not null default 0,
  text_en text not null,
  text_hi text not null
);

create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid references public.topics(id) on delete cascade,
  title_en text not null,
  title_hi text not null,
  quiz_type text not null default 'topic' check (quiz_type in ('topic', 'chapter')),
  is_timed boolean not null default false,
  time_limit_minutes int,
  created_at timestamptz not null default now()
);

create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  order_index int not null default 0,
  unique (quiz_id, question_id)
);

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  student_profile_id uuid not null references public.profiles(id) on delete cascade,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  score numeric,
  total_questions int not null default 0,
  correct_count int not null default 0,
  status text not null default 'in_progress' check (status in ('in_progress', 'submitted'))
);

create table public.quiz_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.quiz_attempts(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  selected_answer jsonb,
  is_correct boolean,
  marked_for_review boolean not null default false,
  answered_at timestamptz,
  unique (attempt_id, question_id)
);

create table public.progress (
  id uuid primary key default gen_random_uuid(),
  student_profile_id uuid not null references public.profiles(id) on delete cascade,
  topic_id uuid not null references public.topics(id) on delete cascade,
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'completed')),
  last_opened_at timestamptz,
  completed_at timestamptz,
  unique (student_profile_id, topic_id)
);

create table public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  student_profile_id uuid not null references public.profiles(id) on delete cascade,
  topic_id uuid not null references public.topics(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (student_profile_id, topic_id)
);

create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  student_profile_id uuid not null references public.profiles(id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  duration_minutes int not null
);

create table public.daily_goals (
  id uuid primary key default gen_random_uuid(),
  student_profile_id uuid not null references public.profiles(id) on delete cascade,
  goal_date date not null,
  target_minutes int not null default 20,
  completed_minutes int not null default 0,
  unique (student_profile_id, goal_date)
);

create index idx_questions_topic on public.questions(topic_id);
create index idx_quiz_questions_quiz on public.quiz_questions(quiz_id);
create index idx_quiz_attempts_student on public.quiz_attempts(student_profile_id);
create index idx_quiz_answers_attempt on public.quiz_answers(attempt_id);
create index idx_progress_student on public.progress(student_profile_id);
create index idx_bookmarks_student on public.bookmarks(student_profile_id);
create index idx_study_sessions_student on public.study_sessions(student_profile_id);
create index idx_daily_goals_student_date on public.daily_goals(student_profile_id, goal_date);

-- A column-limited view so the quiz-taking screen never fetches the
-- answer key while a student is still answering. See README "Known
-- limitations" for the honest caveat about where this protection ends.
create view public.questions_for_quiz
with (security_invoker = true) as
select id, topic_id, type, difficulty, prompt_en, prompt_hi, status
from public.questions
where status = 'published';

grant select on public.questions_for_quiz to authenticated;
