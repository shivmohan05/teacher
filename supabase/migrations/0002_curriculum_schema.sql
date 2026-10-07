-- Phase 2 — Migration 2: curriculum data model.
-- Lessons (full content, bilingual body text, quizzes) are intentionally
-- NOT created yet - that's Phase 3. This migration only builds the
-- navigable structure: Board -> State (if applicable) -> Class -> Subject
-- -> Chapter -> Topic, exactly as the brief specifies, so an administrator
-- can later add boards/states/classes/subjects/chapters/topics without any
-- source-code change.

create table public.boards (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name_en text not null,
  name_hi text not null
);

create table public.states (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name_en text not null,
  name_hi text not null
);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  number int unique not null check (number between 1 and 12),
  label_en text not null,
  label_hi text not null
);

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name_en text not null,
  name_hi text not null,
  stage text not null check (stage in ('primary', 'middle', 'secondary'))
);

-- Which subjects exist for a given board (+ state, when the board is
-- HSE or State Board) and class. state_id is null for boards that don't
-- vary by state (CBSE, ICSE, ISC).
create table public.board_subjects (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  state_id uuid references public.states(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  unique (board_id, state_id, class_id, subject_id)
);

create table public.chapters (
  id uuid primary key default gen_random_uuid(),
  board_subject_id uuid not null references public.board_subjects(id) on delete cascade,
  title_en text not null,
  title_hi text not null,
  order_index int not null default 0,
  status text not null default 'draft'
    check (status in ('draft', 'ai_generated', 'under_review', 'approved', 'published', 'archived', 'rejected')),
  reviewer_status text,
  last_reviewed_date date,
  source_reference text,
  academic_year text not null default '2026-27',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.topics (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  title_en text not null,
  title_hi text not null,
  order_index int not null default 0,
  status text not null default 'draft'
    check (status in ('draft', 'ai_generated', 'under_review', 'approved', 'published', 'archived', 'rejected')),
  reviewer_status text,
  last_reviewed_date date,
  source_reference text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_board_subjects_lookup on public.board_subjects(board_id, class_id);
create index idx_chapters_board_subject on public.chapters(board_subject_id);
create index idx_topics_chapter on public.topics(chapter_id);

create trigger trg_chapters_updated before update on public.chapters
for each row execute function public.set_updated_at();

create trigger trg_topics_updated before update on public.topics
for each row execute function public.set_updated_at();
