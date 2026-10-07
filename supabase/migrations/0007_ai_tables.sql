-- Phase 4 — Migration 7: AI Teacher auditing and usage/cost control.
-- Both tables are written ONLY by the teacher-chat Edge Function using the
-- service role key (which bypasses RLS by design) - the same pattern
-- already used for audit_logs in Phase 2. No authenticated-client insert
-- policy exists on purpose: a student's own browser should never be able
-- to fabricate usage counts or audit entries.
--
-- ai_conversations deliberately does NOT store the student's raw question
-- text or the AI's full response - only metadata (which topic, which
-- action, which language, demo or real) - per the brief's "auditing
-- without exposing unnecessary child information."

create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  student_profile_id uuid not null references public.profiles(id) on delete cascade,
  topic_id uuid references public.topics(id) on delete set null,
  action text not null,
  language text not null check (language in ('en', 'hi')),
  is_demo boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  student_profile_id uuid not null references public.profiles(id) on delete cascade,
  usage_date date not null,
  request_count int not null default 0,
  unique (student_profile_id, usage_date)
);

create index idx_ai_conversations_student on public.ai_conversations(student_profile_id);
create index idx_ai_usage_student_date on public.ai_usage(student_profile_id, usage_date);

alter table public.ai_conversations enable row level security;
alter table public.ai_usage enable row level security;

-- A student can see their own history/usage (so the UI can show "X of 30
-- requests used today"); admins can see everyone's for the Phase 5 AI
-- usage dashboard and cost controls.
create policy "ai_conversations_self_select" on public.ai_conversations
  for select using (student_profile_id = auth.uid());
create policy "ai_conversations_admin_select" on public.ai_conversations
  for select using (public.current_role() = 'admin');

create policy "ai_usage_self_select" on public.ai_usage
  for select using (student_profile_id = auth.uid());
create policy "ai_usage_admin_select" on public.ai_usage
  for select using (public.current_role() = 'admin');
