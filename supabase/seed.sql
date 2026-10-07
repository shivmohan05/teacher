-- Phase 2 seed data. Run this AFTER migrations 0001-0003.
-- This is demonstration data only - not the complete official curriculum
-- of any board. It exists to prove the schema and the curriculum
-- explorer work end to end, and gives Phase 3 real rows to attach lesson
-- content to.

insert into public.boards (code, name_en, name_hi) values
  ('CBSE', 'CBSE', 'सीबीएसई'),
  ('ICSE', 'ICSE', 'आईसीएसई'),
  ('ISC', 'ISC', 'आईएससी'),
  ('HSE', 'HSE', 'एचएसई'),
  ('STATE', 'State Board', 'राज्य बोर्ड');

insert into public.states (code, name_en, name_hi) values
  ('MH', 'Maharashtra', 'महाराष्ट्र'),
  ('UP', 'Uttar Pradesh', 'उत्तर प्रदेश'),
  ('KL', 'Kerala', 'केरल');

insert into public.classes (number, label_en, label_hi)
select n, 'Class ' || n, 'कक्षा ' || n from generate_series(1, 12) as n;

insert into public.subjects (code, name_en, name_hi, stage) values
  ('MATH_P', 'Mathematics', 'गणित', 'primary'),
  ('EVS', 'Environmental Studies', 'पर्यावरण अध्ययन', 'primary'),
  ('SCI_M', 'Science', 'विज्ञान', 'middle'),
  ('MATH_M', 'Mathematics', 'गणित', 'middle'),
  ('SCI_S', 'Science', 'विज्ञान', 'secondary'),
  ('SST_S', 'Social Science', 'सामाजिक विज्ञान', 'secondary'),
  ('ACC', 'Accountancy', 'लेखाशास्त्र', 'secondary'),
  ('ECO', 'Economics', 'अर्थशास्त्र', 'secondary');

-- Demo: Class 10 CBSE Science -> chapter "Light" -> topic "Reflection of
-- Light" (matches the lesson shown on the Phase 1 home page hero).
with b as (select id from public.boards where code = 'CBSE'),
     c as (select id from public.classes where number = 10),
     s as (select id from public.subjects where code = 'SCI_S')
insert into public.board_subjects (board_id, class_id, subject_id)
select b.id, c.id, s.id from b, c, s;

with bs as (
  select bs.id from public.board_subjects bs
  join public.boards b on b.id = bs.board_id and b.code = 'CBSE'
  join public.classes cl on cl.id = bs.class_id and cl.number = 10
  join public.subjects sub on sub.id = bs.subject_id and sub.code = 'SCI_S'
)
insert into public.chapters (board_subject_id, title_en, title_hi, order_index, status, academic_year, source_reference)
select id, 'Light', 'प्रकाश', 1, 'published', '2026-27', 'Demonstration content - verify against official textbook'
from bs;

insert into public.topics (chapter_id, title_en, title_hi, order_index, status, source_reference)
select c.id, 'Reflection of Light', 'प्रकाश का परावर्तन', 1, 'published', 'Demonstration content'
from public.chapters c where c.title_en = 'Light';

-- Demo: Class 3 CBSE Mathematics -> chapter -> topic.
with b as (select id from public.boards where code = 'CBSE'),
     c as (select id from public.classes where number = 3),
     s as (select id from public.subjects where code = 'MATH_P')
insert into public.board_subjects (board_id, class_id, subject_id)
select b.id, c.id, s.id from b, c, s;

with bs as (
  select bs.id from public.board_subjects bs
  join public.boards b on b.id = bs.board_id and b.code = 'CBSE'
  join public.classes cl on cl.id = bs.class_id and cl.number = 3
  join public.subjects sub on sub.id = bs.subject_id and sub.code = 'MATH_P'
)
insert into public.chapters (board_subject_id, title_en, title_hi, order_index, status, academic_year, source_reference)
select id, 'Addition and Subtraction', 'जोड़ और घटाव', 1, 'published', '2026-27', 'Demonstration content'
from bs;

insert into public.topics (chapter_id, title_en, title_hi, order_index, status, source_reference)
select c.id, 'Adding two-digit numbers', 'दो अंकों की संख्याओं को जोड़ना', 1, 'published', 'Demonstration content'
from public.chapters c where c.title_en = 'Addition and Subtraction';

insert into public.feature_flags (key, enabled, description) values
  ('cuet_module', true, 'Enables the CUET preparation area'),
  ('parent_dashboard', true, 'Enables parent dashboard access');
