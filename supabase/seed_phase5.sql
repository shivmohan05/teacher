-- Phase 5 seed data. Run AFTER migration 0008.
-- Seeds the 14 demonstration CUET subject categories from the brief, and
-- ONE demo mock test (CUET General Test) with 5 original questions, to
-- prove the CUET page + the reused quiz engine work end to end. The
-- other 13 subjects show "coming soon" until a dedicated content pass
-- adds their question sets - same honesty principle as Phase 3's 10-of-50
-- demonstration questions.

insert into public.cuet_subjects (code, name_en, name_hi) values
  ('ENGLISH', 'English', 'अंग्रेज़ी'),
  ('HINDI', 'Hindi', 'हिंदी'),
  ('GENERAL_TEST', 'General Test', 'सामान्य परीक्षा'),
  ('MATHEMATICS', 'Mathematics', 'गणित'),
  ('ACCOUNTANCY', 'Accountancy', 'लेखाशास्त्र'),
  ('BUSINESS_STUDIES', 'Business Studies', 'व्यवसाय अध्ययन'),
  ('ECONOMICS', 'Economics', 'अर्थशास्त्र'),
  ('PHYSICS', 'Physics', 'भौतिकी'),
  ('CHEMISTRY', 'Chemistry', 'रसायन विज्ञान'),
  ('BIOLOGY', 'Biology', 'जीव विज्ञान'),
  ('HISTORY', 'History', 'इतिहास'),
  ('GEOGRAPHY', 'Geography', 'भूगोल'),
  ('POLITICAL_SCIENCE', 'Political Science', 'राजनीति विज्ञान'),
  ('COMPUTER_SCIENCE', 'Computer Science', 'कंप्यूटर विज्ञान');

do $$
declare
  v_quiz_cuet uuid;
  v_subject_general uuid;
  v_q uuid;
begin
  select id into v_subject_general from public.cuet_subjects where code = 'GENERAL_TEST';

  insert into public.quizzes (topic_id, title_en, title_hi, quiz_type)
  values (null, 'CUET General Test - Demo Mock', 'CUET सामान्य परीक्षा - डेमो मॉक', 'cuet')
  returning id into v_quiz_cuet;

  insert into public.cuet_tests (cuet_subject_id, quiz_id, is_mock)
  values (v_subject_general, v_quiz_cuet, true);

  insert into public.questions (topic_id, type, difficulty, prompt_en, prompt_hi, correct_answer, explanation_en, explanation_hi)
  values (null, 'mcq_single', 'easy',
    'Which number comes next in the series: 2, 4, 6, 8, ___?',
    'इस श्रृंखला में आगे कौन सी संख्या आएगी: 2, 4, 6, 8, ___?',
    '1'::jsonb,
    'The series increases by 2 each time, so after 8 comes 10.',
    'यह श्रृंखला हर बार 2 बढ़ती है, इसलिए 8 के बाद 10 आता है।'
  ) returning id into v_q;
  insert into public.quiz_questions (quiz_id, question_id, order_index) values (v_quiz_cuet, v_q, 1);
  insert into public.question_options (question_id, order_index, text_en, text_hi) values
    (v_q, 0, '9', '9'), (v_q, 1, '10', '10'), (v_q, 2, '11', '11'), (v_q, 3, '12', '12');

  insert into public.questions (topic_id, type, difficulty, prompt_en, prompt_hi, correct_answer, explanation_en, explanation_hi)
  values (null, 'mcq_single', 'medium',
    'If today is Wednesday, what day will it be after 10 days?',
    'यदि आज बुधवार है, तो 10 दिन बाद कौन सा दिन होगा?',
    '1'::jsonb,
    '7 days from Wednesday is Wednesday again; 3 more days makes it Saturday.',
    'बुधवार से 7 दिन बाद फिर बुधवार होता है; 3 और दिन जोड़ने पर शनिवार आता है।'
  ) returning id into v_q;
  insert into public.quiz_questions (quiz_id, question_id, order_index) values (v_quiz_cuet, v_q, 2);
  insert into public.question_options (question_id, order_index, text_en, text_hi) values
    (v_q, 0, 'Friday', 'शुक्रवार'), (v_q, 1, 'Saturday', 'शनिवार'), (v_q, 2, 'Sunday', 'रविवार'), (v_q, 3, 'Monday', 'सोमवार');

  insert into public.questions (topic_id, type, difficulty, prompt_en, prompt_hi, correct_answer, explanation_en, explanation_hi)
  values (null, 'true_false', 'easy',
    'The national capital of India is Mumbai.',
    'भारत की राष्ट्रीय राजधानी मुंबई है।',
    'false'::jsonb,
    'India''s national capital is New Delhi, not Mumbai.',
    'भारत की राष्ट्रीय राजधानी नई दिल्ली है, मुंबई नहीं।'
  ) returning id into v_q;
  insert into public.quiz_questions (quiz_id, question_id, order_index) values (v_quiz_cuet, v_q, 3);

  insert into public.questions (topic_id, type, difficulty, prompt_en, prompt_hi, correct_answer, explanation_en, explanation_hi)
  values (null, 'fill_blank', 'medium',
    'The study of the Earth''s physical features is called ______.',
    'पृथ्वी की भौतिक विशेषताओं के अध्ययन को ______ कहा जाता है।',
    '{"en": "geography", "hi": "भूगोल"}'::jsonb,
    'Geography is the study of places, landscapes, and the physical features of the Earth.',
    'भूगोल स्थानों, परिदृश्यों और पृथ्वी की भौतिक विशेषताओं का अध्ययन है।'
  ) returning id into v_q;
  insert into public.quiz_questions (quiz_id, question_id, order_index) values (v_quiz_cuet, v_q, 4);

  insert into public.questions (topic_id, type, difficulty, prompt_en, prompt_hi, correct_answer, explanation_en, explanation_hi)
  values (null, 'mcq_single', 'hard',
    'Choose the word that is most nearly OPPOSITE in meaning to ''Abundant''.',
    'उस शब्द को चुनें जिसका अर्थ ''Abundant'' के सबसे निकट विपरीत है।',
    '1'::jsonb,
    '''Abundant'' means plentiful; its opposite is ''Scarce'', meaning in short supply.',
    '''Abundant'' का अर्थ प्रचुर है; इसका विपरीत ''Scarce'' है, जिसका अर्थ है कमी में।'
  ) returning id into v_q;
  insert into public.quiz_questions (quiz_id, question_id, order_index) values (v_quiz_cuet, v_q, 5);
  insert into public.question_options (question_id, order_index, text_en, text_hi) values
    (v_q, 0, 'Plentiful', 'प्रचुर'), (v_q, 1, 'Scarce', 'दुर्लभ'), (v_q, 2, 'Numerous', 'असंख्य'), (v_q, 3, 'Ample', 'पर्याप्त');
end $$;
