-- Phase 3 — Migration 4: lessons and their bilingual content.
-- One lesson per topic for now (unique constraint below). Bilingual body
-- content lives in lesson_translations, one row per language, matching
-- the titleEnglish/titleHindi/contentEnglish/contentHindi pattern from the
-- brief - kept as a separate table (rather than parallel _en/_hi columns
-- like chapters/topics use) because lesson bodies are long and this
-- shape scales cleanly to a third language later without a schema change.

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null unique references public.topics(id) on delete cascade,
  status text not null default 'draft'
    check (status in ('draft', 'ai_generated', 'under_review', 'approved', 'published', 'archived', 'rejected')),
  reviewer_status text,
  last_reviewed_date date,
  source_reference text,
  academic_year text not null default '2026-27',
  has_formula boolean not null default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lesson_translations (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  language text not null check (language in ('en', 'hi')),
  title text not null,
  learning_objectives text,
  key_definitions text,
  explanation_simple text not null,
  explanation_detailed text,
  real_life_example text,
  formula_box text,
  worked_example text,
  important_points text[] not null default '{}',
  common_mistakes text[] not null default '{}',
  quick_revision text[] not null default '{}',
  unique (lesson_id, language)
);

create index idx_lesson_translations_lesson on public.lesson_translations(lesson_id);

create trigger trg_lessons_updated before update on public.lessons
for each row execute function public.set_updated_at();
