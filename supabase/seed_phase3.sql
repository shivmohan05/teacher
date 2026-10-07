-- Phase 3 seed data. Run AFTER migrations 0004-0006 and AFTER seed.sql.
-- Original demonstration content only - not copied from any textbook.
-- Adds a full bilingual lesson + a 5-question demo quiz for each of the
-- two topics seeded in Phase 2 (Class 10 CBSE Science "Reflection of
-- Light" and Class 3 CBSE Mathematics "Adding two-digit numbers"). This
-- is 10 of the "50 original school-level questions" the MVP target asks
-- for - the remaining content is a dedicated authoring pass, not part of
-- this architecture build.

do $$
declare
  v_topic_light uuid;
  v_topic_add uuid;
  v_lesson_light uuid;
  v_lesson_add uuid;
  v_quiz_light uuid;
  v_quiz_add uuid;
  v_q uuid;
begin
  select id into v_topic_light from public.topics where title_en = 'Reflection of Light';
  select id into v_topic_add from public.topics where title_en = 'Adding two-digit numbers';

  -- ===================== Lesson: Reflection of Light =====================
  insert into public.lessons (topic_id, status, academic_year, source_reference, has_formula)
  values (v_topic_light, 'published', '2026-27', 'Demonstration content - verify against official textbook', true)
  returning id into v_lesson_light;

  insert into public.lesson_translations
    (lesson_id, language, title, learning_objectives, key_definitions, explanation_simple, explanation_detailed,
     real_life_example, formula_box, worked_example, important_points, common_mistakes, quick_revision)
  values (
    v_lesson_light, 'en', 'Reflection of Light',
    'Understand what reflection is, state the laws of reflection, and identify real-life examples of reflecting surfaces.',
    'Reflection: the bouncing back of light when it strikes a smooth, shiny surface. Incident ray: the ray of light that strikes the surface. Reflected ray: the ray that bounces back.',
    'When light hits a shiny surface like a mirror, it bounces back instead of passing through. This bouncing back is called reflection.',
    'Reflection follows two laws: (1) the angle of incidence equals the angle of reflection, and (2) the incident ray, reflected ray, and normal all lie in the same plane. These laws apply to every reflecting surface, from bathroom mirrors to the shiny surface of still water.',
    'Seeing yourself in a bathroom mirror, or a vehicle''s rear-view mirror showing traffic behind it, are both everyday examples of reflection.',
    'Angle of incidence (i) = Angle of reflection (r)',
    'A ray of light strikes a plane mirror at 30 degrees to the normal. Because the angle of incidence equals the angle of reflection, the reflected ray also leaves at 30 degrees to the normal.',
    array[
      'The angle of incidence always equals the angle of reflection.',
      'A smooth surface gives a clear, regular reflection; a rough surface scatters light in many directions.',
      'Reflection does not change the speed or colour of light, only its direction.'
    ],
    array[
      'Measuring the angle from the mirror''s surface instead of from the normal (the perpendicular line).',
      'Assuming only mirrors reflect light - any shiny surface, including still water, does too.'
    ],
    array[
      'Reflection = light bouncing off a surface.',
      'Angle of incidence = Angle of reflection.',
      'Smooth surface -> regular reflection; rough surface -> scattered reflection.'
    ]
  );

  insert into public.lesson_translations
    (lesson_id, language, title, learning_objectives, key_definitions, explanation_simple, explanation_detailed,
     real_life_example, formula_box, worked_example, important_points, common_mistakes, quick_revision)
  values (
    v_lesson_light, 'hi', 'प्रकाश का परावर्तन',
    'परावर्तन को समझें, परावर्तन के नियम बताएं, और परावर्तक सतहों के रोज़मर्रा के उदाहरण पहचानें।',
    'परावर्तन: जब प्रकाश किसी चमकदार, चिकनी सतह से टकराकर वापस लौटता है। आपतित किरण: सतह पर पड़ने वाली किरण। परावर्तित किरण: वापस लौटने वाली किरण।',
    'जब प्रकाश किसी चमकदार सतह जैसे शीशे पर पड़ता है, तो वह आगे जाने के बजाय वापस लौट आता है। इस वापस लौटने को परावर्तन कहते हैं।',
    'परावर्तन दो नियमों का पालन करता है: (1) आपतन कोण परावर्तन कोण के बराबर होता है, और (2) आपतित किरण, परावर्तित किरण और अभिलंब तीनों एक ही तल में होते हैं। ये नियम हर परावर्तक सतह पर लागू होते हैं, बाथरूम के शीशे से लेकर शांत पानी की सतह तक।',
    'बाथरूम के शीशे में अपना प्रतिबिंब देखना, या गाड़ी के रियर-व्यू मिरर में पीछे का ट्रैफिक देखना, परावर्तन के रोज़मर्रा के उदाहरण हैं।',
    'आपतन कोण (i) = परावर्तन कोण (r)',
    'प्रकाश की एक किरण समतल शीशे पर अभिलंब से 30 डिग्री के कोण पर टकराती है। क्योंकि आपतन कोण परावर्तन कोण के बराबर होता है, परावर्तित किरण भी अभिलंब से 30 डिग्री के कोण पर निकलती है।',
    array[
      'आपतन कोण हमेशा परावर्तन कोण के बराबर होता है।',
      'चिकनी सतह स्पष्ट, नियमित परावर्तन देती है; खुरदरी सतह प्रकाश को कई दिशाओं में बिखेर देती है।',
      'परावर्तन प्रकाश की गति या रंग नहीं बदलता, केवल दिशा बदलता है।'
    ],
    array[
      'कोण को अभिलंब (लंबवत रेखा) से मापने के बजाय शीशे की सतह से मापना।',
      'यह मानना कि केवल शीशे ही प्रकाश को परावर्तित करते हैं - कोई भी चमकदार सतह, जैसे शांत पानी, भी ऐसा करती है।'
    ],
    array[
      'परावर्तन = प्रकाश का सतह से टकराकर वापस लौटना।',
      'आपतन कोण = परावर्तन कोण।',
      'चिकनी सतह -> नियमित परावर्तन; खुरदरी सतह -> बिखरा परावर्तन।'
    ]
  );

  -- ================= Lesson: Adding Two-Digit Numbers =================
  insert into public.lessons (topic_id, status, academic_year, source_reference, has_formula)
  values (v_topic_add, 'published', '2026-27', 'Demonstration content', false)
  returning id into v_lesson_add;

  insert into public.lesson_translations
    (lesson_id, language, title, learning_objectives, key_definitions, explanation_simple, explanation_detailed,
     real_life_example, worked_example, important_points, common_mistakes, quick_revision)
  values (
    v_lesson_add, 'en', 'Adding Two-Digit Numbers',
    'Add two two-digit numbers with and without carrying over.',
    'Carrying over: when the sum of a column is 10 or more, we write the ones digit and carry the tens digit to the next column.',
    'To add two-digit numbers, add the ones digits first, then the tens digits. If the ones add up to 10 or more, carry 1 over to the tens.',
    'Line up the numbers by place value: tens under tens, ones under ones. Add the ones column first. If the total is 10 or more, write down the ones digit and carry the 1 to the tens column. Then add the tens column, including any carried digit.',
    'If you have 27 marbles and your friend gives you 15 more, adding 27 + 15 tells you how many marbles you have in total.',
    '27 + 15: Ones: 7 + 5 = 12, write 2, carry 1. Tens: 2 + 1 + 1 (carried) = 4. Answer: 42.',
    array[
      'Always add the ones column first.',
      'Carry over only when the ones sum is 10 or more.',
      'Line up numbers by place value before adding.'
    ],
    array[
      'Forgetting to carry the 1 to the tens column.',
      'Adding tens and ones digits without lining them up correctly.'
    ],
    array[
      'Add ones first, then tens.',
      'Carry 1 when ones total 10 or more.',
      'Always line up by place value.'
    ]
  );

  insert into public.lesson_translations
    (lesson_id, language, title, learning_objectives, key_definitions, explanation_simple, explanation_detailed,
     real_life_example, worked_example, important_points, common_mistakes, quick_revision)
  values (
    v_lesson_add, 'hi', 'दो अंकों की संख्याओं को जोड़ना',
    'बिना और सहित हाथ से जोड़ (carrying) के दो अंकों की संख्याओं को जोड़ना सीखें।',
    'हाथ से जोड़ (Carrying over): जब किसी कॉलम का योग 10 या अधिक होता है, तो हम इकाई अंक लिखते हैं और दहाई अंक को अगले कॉलम में ले जाते हैं।',
    'दो अंकों की संख्याओं को जोड़ने के लिए, पहले इकाई अंकों को जोड़ें, फिर दहाई अंकों को। यदि इकाई का योग 10 या अधिक है, तो 1 दहाई में ले जाएं।',
    'संख्याओं को स्थानीय मान के अनुसार पंक्तिबद्ध करें: दहाई के नीचे दहाई, इकाई के नीचे इकाई। पहले इकाई कॉलम जोड़ें। यदि योग 10 या अधिक है, तो इकाई अंक लिखें और 1 दहाई कॉलम में ले जाएं। फिर दहाई कॉलम जोड़ें, जिसमें ले जाया गया अंक भी शामिल है।',
    'यदि आपके पास 27 कंचे हैं और आपका दोस्त आपको 15 और देता है, तो 27 + 15 जोड़ने से पता चलता है कि आपके पास कुल कितने कंचे हैं।',
    '27 + 15: इकाई: 7 + 5 = 12, 2 लिखें, 1 ले जाएं। दहाई: 2 + 1 + 1 (ले जाया गया) = 4। उत्तर: 42।',
    array[
      'हमेशा पहले इकाई कॉलम जोड़ें।',
      'केवल तब ले जाएं जब इकाई का योग 10 या अधिक हो।',
      'जोड़ने से पहले स्थानीय मान के अनुसार पंक्तिबद्ध करें।'
    ],
    array[
      'दहाई कॉलम में 1 ले जाना भूल जाना।',
      'दहाई और इकाई अंकों को सही ढंग से पंक्तिबद्ध किए बिना जोड़ना।'
    ],
    array[
      'पहले इकाई जोड़ें, फिर दहाई।',
      'जब इकाई का योग 10 या अधिक हो तो 1 ले जाएं।',
      'हमेशा स्थानीय मान के अनुसार पंक्तिबद्ध करें।'
    ]
  );

  -- ===================== Quiz: Reflection of Light =====================
  insert into public.quizzes (topic_id, title_en, title_hi, quiz_type)
  values (v_topic_light, 'Reflection of Light - Quiz', 'प्रकाश का परावर्तन - प्रश्नोत्तरी', 'topic')
  returning id into v_quiz_light;

  insert into public.questions (topic_id, type, difficulty, prompt_en, prompt_hi, correct_answer, explanation_en, explanation_hi)
  values (v_topic_light, 'mcq_single', 'easy',
    'What is the bouncing back of light from a shiny surface called?',
    'किसी चमकदार सतह से प्रकाश के वापस लौटने को क्या कहते हैं?',
    '1'::jsonb,
    'Reflection is when light bounces back off a surface instead of passing through it.',
    'परावर्तन तब होता है जब प्रकाश किसी सतह से टकराकर वापस लौट आता है, उसमें से गुजरने के बजाय।'
  ) returning id into v_q;
  insert into public.quiz_questions (quiz_id, question_id, order_index) values (v_quiz_light, v_q, 1);
  insert into public.question_options (question_id, order_index, text_en, text_hi) values
    (v_q, 0, 'Refraction', 'अपवर्तन'),
    (v_q, 1, 'Reflection', 'परावर्तन'),
    (v_q, 2, 'Diffraction', 'विवर्तन'),
    (v_q, 3, 'Absorption', 'अवशोषण');

  insert into public.questions (topic_id, type, difficulty, prompt_en, prompt_hi, correct_answer, explanation_en, explanation_hi)
  values (v_topic_light, 'mcq_single', 'medium',
    'If the angle of incidence is 40 degrees, what is the angle of reflection?',
    'यदि आपतन कोण 40 डिग्री है, तो परावर्तन कोण क्या होगा?',
    '1'::jsonb,
    'By the law of reflection, the angle of incidence always equals the angle of reflection.',
    'परावर्तन के नियम के अनुसार, आपतन कोण हमेशा परावर्तन कोण के बराबर होता है।'
  ) returning id into v_q;
  insert into public.quiz_questions (quiz_id, question_id, order_index) values (v_quiz_light, v_q, 2);
  insert into public.question_options (question_id, order_index, text_en, text_hi) values
    (v_q, 0, '20 degrees', '20 डिग्री'),
    (v_q, 1, '40 degrees', '40 डिग्री'),
    (v_q, 2, '50 degrees', '50 डिग्री'),
    (v_q, 3, '80 degrees', '80 डिग्री');

  insert into public.questions (topic_id, type, difficulty, prompt_en, prompt_hi, correct_answer, explanation_en, explanation_hi)
  values (v_topic_light, 'true_false', 'easy',
    'A rough surface produces a clear, regular reflection.',
    'एक खुरदरी सतह स्पष्ट, नियमित परावर्तन उत्पन्न करती है।',
    'false'::jsonb,
    'A rough surface scatters light in many directions, so it does not produce a clear, regular reflection - only smooth surfaces do.',
    'खुरदरी सतह प्रकाश को कई दिशाओं में बिखेर देती है, इसलिए यह स्पष्ट, नियमित परावर्तन उत्पन्न नहीं करती - केवल चिकनी सतहें ऐसा करती हैं।'
  ) returning id into v_q;
  insert into public.quiz_questions (quiz_id, question_id, order_index) values (v_quiz_light, v_q, 3);

  insert into public.questions (topic_id, type, difficulty, prompt_en, prompt_hi, correct_answer, explanation_en, explanation_hi)
  values (v_topic_light, 'fill_blank', 'medium',
    'The ray of light that strikes a reflecting surface is called the ______ ray.',
    'परावर्तक सतह पर टकराने वाली प्रकाश की किरण को ______ किरण कहते हैं।',
    '{"en": "incident", "hi": "आपतित"}'::jsonb,
    'The ray that strikes the surface is the incident ray; the ray that bounces back is the reflected ray.',
    'सतह पर टकराने वाली किरण आपतित किरण होती है; वापस लौटने वाली किरण परावर्तित किरण होती है।'
  ) returning id into v_q;
  insert into public.quiz_questions (quiz_id, question_id, order_index) values (v_quiz_light, v_q, 4);

  insert into public.questions (topic_id, type, difficulty, prompt_en, prompt_hi, correct_answer, explanation_en, explanation_hi)
  values (v_topic_light, 'mcq_single', 'hard',
    'Which of these best explains why we see a sharp image in a plane mirror but not in a piece of paper?',
    'इनमें से कौन सबसे अच्छी तरह बताता है कि हमें समतल शीशे में स्पष्ट प्रतिबिंब क्यों दिखता है लेकिन कागज़ में नहीं?',
    '1'::jsonb,
    'A mirror''s smooth surface produces regular reflection, keeping light rays parallel and forming a clear image; paper''s rough surface scatters light in all directions.',
    'शीशे की चिकनी सतह नियमित परावर्तन उत्पन्न करती है, जिससे प्रकाश किरणें समांतर रहती हैं और स्पष्ट प्रतिबिंब बनता है; कागज़ की खुरदरी सतह प्रकाश को सभी दिशाओं में बिखेर देती है।'
  ) returning id into v_q;
  insert into public.quiz_questions (quiz_id, question_id, order_index) values (v_quiz_light, v_q, 5);
  insert into public.question_options (question_id, order_index, text_en, text_hi) values
    (v_q, 0, 'Paper absorbs light, mirrors reflect light perfectly', 'कागज़ प्रकाश को अवशोषित करता है, शीशा प्रकाश को पूर्ण रूप से परावर्तित करता है'),
    (v_q, 1, 'Mirror is smooth so reflection is regular; paper is rough so reflection is scattered', 'शीशा चिकना है इसलिए परावर्तन नियमित है; कागज़ खुरदरा है इसलिए परावर्तन बिखरा हुआ है'),
    (v_q, 2, 'Paper is white and mirrors are silver', 'कागज़ सफेद है और शीशा चांदी के रंग का है'),
    (v_q, 3, 'Mirrors are bigger than paper', 'शीशा कागज़ से बड़ा होता है');

  -- ================= Quiz: Adding Two-Digit Numbers =================
  insert into public.quizzes (topic_id, title_en, title_hi, quiz_type)
  values (v_topic_add, 'Adding Two-Digit Numbers - Quiz', 'दो अंकों की संख्याओं को जोड़ना - प्रश्नोत्तरी', 'topic')
  returning id into v_quiz_add;

  insert into public.questions (topic_id, type, difficulty, prompt_en, prompt_hi, correct_answer, explanation_en, explanation_hi)
  values (v_topic_add, 'mcq_single', 'easy',
    'What is 23 + 14?',
    '23 + 14 कितना होता है?',
    '1'::jsonb,
    'Add ones: 3 + 4 = 7. Add tens: 2 + 1 = 3. Answer: 37.',
    'इकाई जोड़ें: 3 + 4 = 7. दहाई जोड़ें: 2 + 1 = 3. उत्तर: 37।'
  ) returning id into v_q;
  insert into public.quiz_questions (quiz_id, question_id, order_index) values (v_quiz_add, v_q, 1);
  insert into public.question_options (question_id, order_index, text_en, text_hi) values
    (v_q, 0, '27', '27'),
    (v_q, 1, '37', '37'),
    (v_q, 2, '47', '47'),
    (v_q, 3, '33', '33');

  insert into public.questions (topic_id, type, difficulty, prompt_en, prompt_hi, correct_answer, explanation_en, explanation_hi)
  values (v_topic_add, 'mcq_single', 'medium',
    'What is 48 + 36?',
    '48 + 36 कितना होता है?',
    '1'::jsonb,
    'Ones: 8 + 6 = 14, write 4 carry 1. Tens: 4 + 3 + 1 = 8. Answer: 84.',
    'इकाई: 8 + 6 = 14, 4 लिखें, 1 ले जाएं। दहाई: 4 + 3 + 1 = 8। उत्तर: 84।'
  ) returning id into v_q;
  insert into public.quiz_questions (quiz_id, question_id, order_index) values (v_quiz_add, v_q, 2);
  insert into public.question_options (question_id, order_index, text_en, text_hi) values
    (v_q, 0, '74', '74'),
    (v_q, 1, '84', '84'),
    (v_q, 2, '94', '94'),
    (v_q, 3, '64', '64');

  insert into public.questions (topic_id, type, difficulty, prompt_en, prompt_hi, correct_answer, explanation_en, explanation_hi)
  values (v_topic_add, 'true_false', 'easy',
    'When adding 19 + 15, you need to carry over to the tens column.',
    '19 + 15 जोड़ते समय, आपको दहाई कॉलम में ले जाने की आवश्यकता है।',
    'true'::jsonb,
    '9 + 5 = 14, which is 10 or more, so you carry the 1 to the tens column.',
    '9 + 5 = 14, जो 10 या अधिक है, इसलिए आप 1 दहाई कॉलम में ले जाते हैं।'
  ) returning id into v_q;
  insert into public.quiz_questions (quiz_id, question_id, order_index) values (v_quiz_add, v_q, 3);

  insert into public.questions (topic_id, type, difficulty, prompt_en, prompt_hi, correct_answer, explanation_en, explanation_hi)
  values (v_topic_add, 'fill_blank', 'medium',
    'In 56 + 27, the ones column adds up to 13, so you write 3 and carry ______ to the tens column.',
    '56 + 27 में, इकाई कॉलम का योग 13 होता है, इसलिए आप 3 लिखते हैं और दहाई कॉलम में ______ ले जाते हैं।',
    '{"en": "1", "hi": "1"}'::jsonb,
    'Any time the ones column totals 10 or more, you carry exactly 1 to the next column, no matter how large the total is.',
    'जब भी इकाई कॉलम का योग 10 या अधिक होता है, आप अगले कॉलम में ठीक 1 ले जाते हैं, चाहे योग कितना भी बड़ा हो।'
  ) returning id into v_q;
  insert into public.quiz_questions (quiz_id, question_id, order_index) values (v_quiz_add, v_q, 4);

  insert into public.questions (topic_id, type, difficulty, prompt_en, prompt_hi, correct_answer, explanation_en, explanation_hi)
  values (v_topic_add, 'mcq_single', 'hard',
    'Which pair of two-digit numbers requires carrying over when added?',
    'निम्नलिखित में से किस जोड़े को जोड़ने पर हाथ से जोड़ (carry) की आवश्यकता होती है?',
    '1'::jsonb,
    '34 + 28: ones 4 + 8 = 12, which is 10 or more, so you carry 1 to the tens column. None of the other pairs need carrying.',
    '34 + 28: इकाई 4 + 8 = 12, जो 10 या अधिक है, इसलिए दहाई कॉलम में 1 ले जाना पड़ता है। अन्य किसी भी जोड़े में ले जाने की आवश्यकता नहीं है।'
  ) returning id into v_q;
  insert into public.quiz_questions (quiz_id, question_id, order_index) values (v_quiz_add, v_q, 5);
  insert into public.question_options (question_id, order_index, text_en, text_hi) values
    (v_q, 0, '21 + 10', '21 + 10'),
    (v_q, 1, '34 + 28', '34 + 28'),
    (v_q, 2, '12 + 23', '12 + 23'),
    (v_q, 3, '40 + 30', '40 + 30');

end $$;
