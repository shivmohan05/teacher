-- Phase 2 — Migration 1: identity, roles, and the tables role management depends on.
-- Run this in the Supabase SQL Editor (web dashboard) before 0002 and 0003.

create extension if not exists pgcrypto;

create type public.app_role as enum ('student', 'parent', 'teacher', 'reviewer', 'admin');

-- One row per authenticated user. Role lives here, not in auth.users,
-- so application code and RLS policies always check the same place.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'student',
  display_name text not null default 'Student',
  preferred_language text not null default 'en' check (preferred_language in ('en', 'hi')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.student_profiles (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  class_number int not null check (class_number between 1 and 12),
  board text not null,
  state text,
  learning_goal text,
  daily_study_target_minutes int not null default 20,
  parent_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.parent_profiles (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.teacher_profiles (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  assigned_classes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- A parent only sees a student after a link exists AND is approved -
-- this is what makes "a parent has access only to linked child accounts" real.
create table public.parent_student_links (
  id uuid primary key default gen_random_uuid(),
  parent_profile_id uuid not null references public.profiles(id) on delete cascade,
  student_profile_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'revoked')),
  created_at timestamptz not null default now(),
  unique (parent_profile_id, student_profile_id)
);

-- Prototype only. The actual consent requirements, wording, and retention
-- rules must be reviewed by a qualified legal/privacy professional before
-- any public launch - this table just proves the data model.
create table public.consent_records (
  id uuid primary key default gen_random_uuid(),
  student_profile_id uuid not null references public.profiles(id) on delete cascade,
  parent_email text not null,
  consent_version text not null default 'prototype-v1',
  consented_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_table text,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.feature_flags (
  key text primary key,
  enabled boolean not null default false,
  description text
);

create index idx_student_profiles_board on public.student_profiles(board);
create index idx_parent_links_parent on public.parent_student_links(parent_profile_id);
create index idx_parent_links_student on public.parent_student_links(student_profile_id);
create index idx_audit_logs_actor on public.audit_logs(actor_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated before update on public.profiles
for each row execute function public.set_updated_at();

create trigger trg_student_profiles_updated before update on public.student_profiles
for each row execute function public.set_updated_at();

-- Auto-create a minimal profile the moment someone signs up in Supabase
-- Auth, reading role/display_name/preferred_language from the signUp
-- call's metadata. This runs with definer privileges, so it works even
-- before the user has a browser session (e.g. while email is unconfirmed).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, role, display_name, preferred_language)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'role', 'student')::public.app_role,
    coalesce(new.raw_user_meta_data ->> 'display_name', 'Student'),
    coalesce(new.raw_user_meta_data ->> 'preferred_language', 'en')
  );
  return new;
end;
$$;

create trigger trg_handle_new_user
after insert on auth.users
for each row execute function public.handle_new_user();

-- Security-definer helper so RLS policies on OTHER tables can check "is
-- this caller an admin/teacher/etc" without recursively re-evaluating
-- RLS on profiles itself.
create or replace function public.current_role()
returns public.app_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;
