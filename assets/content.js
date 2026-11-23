/* N-KELL — localized content: express-test translations, subjects, universities, UNT navigator data. */
window.NK = window.NK || {};
(function () {
  const T = (kz, ru, en) => ({ kz, ru, en });

  /* ---------- Express test (original 30 questions) — RU / EN ---------- */
  NK.Q_TX = {
    q1: { ru: { t: 'Чем тебе нравится заниматься в свободное время?', h: 'Выбери до 3 вариантов', o: ['Собирать, чинить что-то или заниматься спортом', 'Смотреть научные видео, ставить опыты, решать головоломки', 'Рисовать, музыка, снимать видео или писать тексты', 'Помогать друзьям, волонтёрство, учить младших', 'Организовывать мероприятия, торговать, запускать проекты', 'Наводить порядок, составлять планы, вести таблицы'] },
      en: { t: 'What do you like doing in your free time?', h: 'Pick up to 3 options', o: ['Building or fixing things, or doing sport', 'Watching science videos, experimenting, solving puzzles', 'Drawing, music, filming videos or writing', 'Helping friends, volunteering, teaching younger kids', 'Organising events, selling, starting projects', 'Organising things, making plans, keeping spreadsheets'] } },
    q2: { ru: { t: 'Мне хочется понимать, как работают техника и механизмы.' }, en: { t: 'I want to understand how machines and mechanisms work.' } },
    q3: { ru: { t: 'Мне интересно изучать явления природы, космоса или человеческого организма.' }, en: { t: 'I find it interesting to study nature, space or the human body.' } },
    q4: { ru: { t: 'Какое задание ты выберешь на неделе школьных проектов?', o: ['Собрать модель машины на солнечной батарее', 'Измерить качество воздуха в городе и проанализировать данные', 'Снять короткий фильм о школе', 'Провести интересный урок для младших классов', 'Организовать школьную ярмарку и заработать', 'Создать электронный каталог библиотеки'] },
      en: { t: 'Which task do you choose during school project week?', o: ['Build a solar-powered model car', 'Measure city air quality and analyse the data', 'Film a short movie about the school', 'Teach a fun lesson to younger classes', 'Run a school fair and make a profit', 'Build an electronic library catalogue'] } },
    q5: { ru: { t: 'Когда я занимаюсь творчеством — рисунком, музыкой, дизайном, текстом — я не замечаю, как идёт время.' }, en: { t: 'When I do creative work — drawing, music, design, writing — I lose track of time.' } },
    q6: { ru: { s: 'В школе открылись новые кружки, но времени хватает только на один.', t: 'Какой выберешь?', o: ['Робототехника', 'Подготовка к олимпиаде по биологии и химии', 'Студия дизайна и медиа', 'Клуб волонтёров', 'Школа юных предпринимателей', 'Финансовая грамотность и Excel'] },
      en: { s: 'New clubs have opened at school, but you only have time for one.', t: 'Which do you choose?', o: ['Robotics', 'Biology and chemistry olympiad prep', 'Design and media studio', 'Volunteer club', 'Young entrepreneurs school', 'Financial literacy and Excel'] } },
    q7: { ru: { t: 'Математика и логические задачи даются мне легко.' }, en: { t: 'Maths and logic problems come easily to me.' } },
    q8: { ru: { s: 'Логическая задача. У этого вопроса есть правильный ответ.', t: 'Последовательность: 2, 6, 12, 20, 30, … Какое число следующее?', o: ['40', '42', '44', 'Не знаю, но хочу узнать решение'] },
      en: { s: 'Logic task. This question has a correct answer.', t: 'Sequence: 2, 6, 12, 20, 30, … What comes next?', o: ['40', '42', '44', 'I don\'t know, but I want to find out'] } },
    q9: { ru: { t: 'Я могу ясно выражать мысли устно и письменно.' }, en: { t: 'I can express my thoughts clearly in speech and writing.' } },
    q10: { ru: { t: 'В чём ты чувствуешь себя увереннее всего?', h: 'Выбери до 3 вариантов', o: ['Сравнивать данные и делать выводы', 'Считать, работать с формулами', 'Придумывать новые идеи и образы', 'Общаться и убеждать людей', 'Делать руками, чинить, собирать', 'Компьютер, программы, гаджеты'] },
      en: { t: 'What are you most confident at?', h: 'Pick up to 3 options', o: ['Comparing data and drawing conclusions', 'Calculating, working with formulas', 'Inventing new ideas and images', 'Talking to and persuading people', 'Making, fixing and assembling things', 'Computers, software, gadgets'] } },
    q11: { ru: { t: 'Когда я делаю что-то руками (модель, ремонт, шитьё, еда), получается хорошо.' }, en: { t: 'When I make something with my hands (a model, a repair, sewing, cooking), it turns out well.' } },
    q12: { ru: { s: 'Классу нужен постер к мероприятию. Времени — один вечер.', t: 'Что ты сделаешь?', o: ['Сделаю дизайн сам в Canva или Figma', 'Продумаю цвета и композицию и нарисую от руки', 'Напишу текст и определю, кому что сказать', 'Распределю задачи и прослежу за сроками', 'Проанализирую, какие прошлые постеры сработали'] },
      en: { s: 'Your class needs an event poster. You have one evening.', t: 'What do you do?', o: ['Design it myself in Canva or Figma', 'Plan colours and layout and draw it by hand', 'Write the text and decide on the message', 'Split the tasks and track deadlines', 'Analyse which past posters worked best'] } },
    q13: { ru: { t: 'Какую роль ты обычно берёшь в групповом проекте?', o: ['Лидер — задаю направление, принимаю решения', 'Генератор идей — предлагаю новые решения', 'Исследователь — собираю и проверяю информацию', 'Исполнитель — делаю конкретную работу руками', 'Медиатор — объединяю команду', 'Организатор — навожу порядок в плане и документах'] },
      en: { t: 'Which role do you usually take in a group project?', o: ['Leader — I set direction and decide', 'Idea generator — I propose new solutions', 'Researcher — I gather and check information', 'Doer — I do the hands-on work', 'Mediator — I bring the team together', 'Organiser — I keep the plan and documents in order'] } },
    q14: { ru: { t: 'Мне нравится работать одному, когда никто не отвлекает.' }, en: { t: 'I like working alone without distractions.' } },
    q15: { ru: { t: 'Работа в команде придаёт мне сил.' }, en: { t: 'Working in a team energises me.' } },
    q16: { ru: { s: 'Учитель дал сложное задание без чёткой инструкции.', t: 'Твой первый шаг?', o: ['Глубоко изучаю тему и ищу источники', 'Сразу пробую и учусь на ошибках', 'Собираю одноклассников и обсуждаем вместе', 'Составляю план и распределяю роли', 'Спокойно решаю сам'] },
      en: { s: 'A teacher gave a complex task with no clear instructions.', t: 'What is your first step?', o: ['Research the topic in depth and find sources', 'Try right away and learn from mistakes', 'Gather classmates and discuss together', 'Make a plan and assign roles', 'Work it out quietly on my own'] } },
    q17: { ru: { t: 'Мне нравится принимать решения и брать ответственность.' }, en: { t: 'I like making decisions and taking responsibility.' } },
    q18: { ru: { t: 'Ты купил новый гаджет. Что сделаешь сначала?', o: ['Прочитаю инструкцию от начала до конца', 'Сразу начну нажимать кнопки и разберусь сам', 'Посмотрю обзоры и изучу возможности', 'Покажу друзьям, и вместе протестируем', 'Подумаю, как его можно улучшить'] },
      en: { t: 'You bought a new gadget. What do you do first?', o: ['Read the manual from start to finish', 'Start pressing buttons and figure it out', 'Watch reviews and explore its features', 'Show friends and test it together', 'Think about how it could be improved'] } },
    q19: { ru: { t: 'Что для тебя важнее всего в будущей работе?', h: 'Выбери до 3 вариантов', o: ['Стабильный и хороший доход', 'Творческая свобода', 'Помогать людям', 'Независимость, своё дело', 'Влиять на общество', 'Профессиональный рост', 'Признание, авторитет'] },
      en: { t: 'What matters most to you in future work?', h: 'Pick up to 3 options', o: ['A stable, good income', 'Creative freedom', 'Helping people', 'Independence, my own business', 'Influencing society', 'Professional growth', 'Recognition and respect'] } },
    q20: { ru: { t: 'Высокий доход и финансовая стабильность очень важны для меня.' }, en: { t: 'High income and financial stability are very important to me.' } },
    q21: { ru: { s: 'Ты окончил учёбу, и тебе пришли предложения о работе.', t: 'Какое выберешь?', o: ['Крупная компания: высокая зарплата, стабильный график', 'Небольшой стартап: творчество, средняя зарплата', 'Общественная организация: прямая помощь людям', 'Международная компания: обучение и рост', 'Свой проект: есть риск, но полная свобода'] },
      en: { s: 'You have graduated and received job offers.', t: 'Which do you choose?', o: ['A large company: high pay, stable hours', 'A small startup: creative, average pay', 'A non-profit: helping people directly', 'An international company: learning and growth', 'My own project: risky but fully free'] } },
    q22: { ru: { t: 'Я хочу делать работу, которая приносит реальную пользу обществу и стране.' }, en: { t: 'I want work that brings real benefit to society and the country.' } },
    q23: { ru: { t: 'Каким ты видишь себя через 10 лет?', o: ['Известный, авторитетный специалист', 'Основатель своей компании', 'Эксперт мирового уровня, который постоянно развивается', 'Специалист, улучшивший жизнь людей', 'Инициатор больших социальных изменений', 'Творческий человек, создающий свои работы'] },
      en: { t: 'How do you see yourself in 10 years?', o: ['A well-known, respected professional', 'Founder of my own company', 'A world-class expert who keeps growing', 'A professional who improved people\'s lives', 'A driver of big social change', 'A creative person making my own work'] } },
    q24: { ru: { t: 'Я хочу постоянно учиться новому и развиваться.' }, en: { t: 'I want to keep learning new things and growing.' } },
    q25: { ru: { t: 'Где ты хотел бы проводить рабочий день?', o: ['В современном офисе', 'На природе, на выездах, на объекте', 'В лаборатории', 'В творческой студии', 'Среди людей: школа, больница, центр', 'Удалённо из дома или откуда угодно'] },
      en: { t: 'Where would you like to spend your working day?', o: ['In a modern office', 'Outdoors, in the field, on site', 'In a laboratory', 'In a creative studio', 'Among people: school, hospital, centre', 'Remotely from home or anywhere'] } },
    q26: { ru: { t: 'Мне нравится, когда каждый день случается что-то новое и неожиданное.' }, en: { t: 'I like it when something new and unexpected happens every day.' } },
    q27: { ru: { t: 'Я хочу каждый день общаться со многими людьми.' }, en: { t: 'I want to interact with many people every day.' } },
    q28: { ru: { t: 'Какой график работы тебе удобен?', o: ['Чёткий график с 9:00 до 18:00', 'Гибкий график, удалённая работа', 'Сменная работа, но каждый день разный', 'Проектная работа, частые командировки'] },
      en: { t: 'Which work schedule suits you?', o: ['A fixed 9:00–18:00 schedule', 'Flexible hours, remote work', 'Shift work, but every day is different', 'Project work with frequent travel'] } },
    q29: { ru: { t: 'С какими инструментами ты хотел бы работать?', h: 'Выбери до 3 вариантов', o: ['Компьютер и программы', 'Техника, инструменты, машины', 'Лабораторное оборудование', 'Камера, графический планшет, инструменты', 'Общение с людьми, консультирование', 'Документы, таблицы, цифры'] },
      en: { t: 'Which tools would you like to work with?', h: 'Pick up to 3 options', o: ['Computers and software', 'Machinery, tools, vehicles', 'Laboratory equipment', 'Camera, drawing tablet, instruments', 'Talking with and advising people', 'Documents, spreadsheets, numbers'] } },
    q30: { ru: { s: 'Начинается летняя практика. Нужно выбрать одно место.', t: 'Куда пойдёшь?', o: ['IT-компания — удалённый проект', 'Стройка или производство', 'Больница или поликлиника', 'Дизайн-студия', 'Банк или бизнес-центр', 'Научная лаборатория'] },
      en: { s: 'Summer internships are starting. Choose one place.', t: 'Where do you go?', o: ['An IT company — remote project', 'A construction or production site', 'A hospital or clinic', 'A design studio', 'A bank or business centre', 'A research lab'] } }
  };

  /* ---------- School subjects ---------- */
  NK.SUBJ_TX = {
    'Математика': T('Математика', 'Математика', 'Mathematics'), 'Информатика': T('Информатика', 'Информатика', 'Computer science'), 'Ағылшын тілі': T('Ағылшын тілі', 'Английский язык', 'English'),
    'Физика': T('Физика', 'Физика', 'Physics'), 'География': T('География', 'География', 'Geography'), 'Химия': T('Химия', 'Химия', 'Chemistry'), 'Биология': T('Биология', 'Биология', 'Biology'),
    'Қазақ/орыс тілі': T('Қазақ/орыс тілі', 'Казахский/русский язык', 'Kazakh/Russian language'), 'Қазақ тілі': T('Қазақ тілі', 'Казахский язык', 'Kazakh language'),
    'Психология негіздері': T('Психология негіздері', 'Основы психологии', 'Basics of psychology'), 'Таңдаған пән': T('Таңдаған пән', 'Выбранный предмет', 'Your chosen subject'),
    'Тарих': T('Тарих', 'История', 'History'), 'Әдебиет': T('Әдебиет', 'Литература', 'Literature'), 'Дене шынықтыру': T('Дене шынықтыру', 'Физкультура', 'Physical education'),
    'Дүниежүзі тарихы': T('Дүниежүзі тарихы', 'Всемирная история', 'World history'), 'Құқық негіздері': T('Құқық негіздері', 'Основы права', 'Fundamentals of law'),
    'Қазақстан тарихы': T('Қазақстан тарихы', 'История Казахстана', 'History of Kazakhstan'), 'Сызу': T('Сызу', 'Черчение', 'Technical drawing'), 'Көркем еңбек': T('Көркем еңбек', 'Художественный труд', 'Art and design')
  };

  /* ---------- Universities: cities, programme lists, profile ---------- */
  NK.CITY_TX = { 'Астана': T('Астана', 'Астана', 'Astana'), 'Алматы': T('Алматы', 'Алматы', 'Almaty'), 'Қарағанды': T('Қарағанды', 'Караганда', 'Karaganda'), 'Шымкент': T('Шымкент', 'Шымкент', 'Shymkent'), 'Қаскелең (Алматы облысы)': T('Қаскелең (Алматы облысы)', 'Каскелен (Алматинская обл.)', 'Kaskelen (Almaty region)') };
  // University profile — N-KELL's own descriptive grouping by main focus, not an official legal status or ranking.
  NK.UNI_PROFILE = { nu: 'multi', kaznu: 'multi', enu: 'multi', satbayev: 'tech', kbtu: 'tech', aitu: 'it', iitu: 'it', sdu: 'multi', kaznmu: 'med', amu: 'med', qmu: 'med', kimep: 'econ', narxoz: 'econ', almau: 'econ', kaznpu: 'ped', buketov: 'multi', kazatu: 'agro', kaznaru: 'agro', auezov: 'multi', kaznai: 'arts', alt: 'transport', aga: 'transport' };
  NK.UNI_PROFILE_N = { multi: T('Көпсалалы', 'Многопрофильный', 'Multidisciplinary'), tech: T('Техникалық', 'Технический', 'Technical'), it: T('IT', 'IT', 'IT'), med: T('Медициналық', 'Медицинский', 'Medical'), econ: T('Экономика және бизнес', 'Экономика и бизнес', 'Economics & business'), ped: T('Педагогикалық', 'Педагогический', 'Teacher education'), agro: T('Аграрлық', 'Аграрный', 'Agricultural'), arts: T('Өнер', 'Искусство', 'Arts'), transport: T('Көлік және авиация', 'Транспорт и авиация', 'Transport & aviation') };
  NK.UNI_TX = {
    nu: { ru: 'Компьютерные науки|Робототехника|Химическая инженерия и материалы|Экономика|Медицина (MD)|Биология|Государственная политика', en: 'Computer science|Robotics|Chemical and materials engineering|Economics|Medicine (MD)|Biology|Public policy' },
    kaznu: { ru: 'Информационные системы|Физика|Химия|Биотехнология|Экология|Юриспруденция|Журналистика|Международные отношения|Экономика|Психология', en: 'Information systems|Physics|Chemistry|Biotechnology|Ecology|Law|Journalism|International relations|Economics|Psychology' },
    enu: { ru: 'Информационная безопасность|Космическая техника|Международные отношения|Журналистика|Юриспруденция|Архитектура|Логистика|Экономика', en: 'Information security|Space engineering|International relations|Journalism|Law|Architecture|Logistics|Economics' },
    satbayev: { ru: 'Нефтегазовое дело|Геология|Робототехника и мехатроника|Машиностроение|Электроэнергетика|Архитектура|Информационные системы', en: 'Petroleum engineering|Geology|Robotics and mechatronics|Mechanical engineering|Electrical power engineering|Architecture|Information systems' },
    kbtu: { ru: 'Информационные системы|Программная инженерия|Нефтегазовое дело|Химическая инженерия|Финансы|Бизнес', en: 'Information systems|Software engineering|Petroleum engineering|Chemical engineering|Finance|Business' },
    aitu: { ru: 'Программная инженерия|Кибербезопасность|Big Data|Медиатехнологии|IT-менеджмент', en: 'Software engineering|Cybersecurity|Big Data|Media technologies|IT management' },
    iitu: { ru: 'Компьютерная инженерия|Информационные системы|Кибербезопасность|Цифровые медиа|Радиотехника', en: 'Computer engineering|Information systems|Cybersecurity|Digital media|Radio engineering' },
    sdu: { ru: 'Компьютерные науки|Педагогика (математика, английский язык)|Экономика|Юриспруденция', en: 'Computer science|Teacher education (maths, English)|Economics|Law' },
    kaznmu: { ru: 'Общая медицина|Стоматология|Педиатрия|Фармация|Сестринское дело|Общественное здравоохранение', en: 'General medicine|Dentistry|Paediatrics|Pharmacy|Nursing|Public health' },
    amu: { ru: 'Общая медицина|Стоматология|Фармация|Сестринское дело', en: 'General medicine|Dentistry|Pharmacy|Nursing' },
    qmu: { ru: 'Общая медицина|Фармация|Сестринское дело|Общественное здравоохранение', en: 'General medicine|Pharmacy|Nursing|Public health' },
    kimep: { ru: 'Финансы|Маркетинг|Менеджмент|Международные отношения|Право|Журналистика', en: 'Finance|Marketing|Management|International relations|Law|Journalism' },
    narxoz: { ru: 'Экономика|Финансы|Учёт и аудит|Маркетинг|Право|Цифровая инженерия', en: 'Economics|Finance|Accounting and audit|Marketing|Law|Digital engineering' },
    almau: { ru: 'Менеджмент|Предпринимательство|Логистика|Маркетинг|Медиакоммуникации', en: 'Management|Entrepreneurship|Logistics|Marketing|Media communications' },
    kaznpu: { ru: 'Подготовка учителей математики|Подготовка учителей биологии|Педагогика и психология|Начальное обучение|Изобразительное искусство', en: 'Maths teacher education|Biology teacher education|Pedagogy and psychology|Primary education|Fine arts' },
    buketov: { ru: 'Педагогические направления|Химия|Физика|Юриспруденция|Информационные системы', en: 'Teacher education programmes|Chemistry|Physics|Law|Information systems' },
    kazatu: { ru: 'Агрономия|Ветеринарная медицина|Экология|Аграрная техника|Информационные системы', en: 'Agronomy|Veterinary medicine|Ecology|Agricultural machinery|Information systems' },
    kaznaru: { ru: 'Агрономия|Ветеринария|Водные ресурсы|Экология|Аграрная экономика', en: 'Agronomy|Veterinary science|Water resources|Ecology|Agricultural economics' },
    auezov: { ru: 'Химическая технология|Строительство|Педагогические направления|Информационные системы|Машиностроение', en: 'Chemical technology|Construction|Teacher education programmes|Information systems|Mechanical engineering' },
    kaznai: { ru: 'Дизайн|Анимация|Кино и телевидение|Актёрское искусство|Изобразительное искусство', en: 'Design|Animation|Film and television|Acting|Fine arts' },
    alt: { ru: 'Логистика|Транспортная техника|Железнодорожный транспорт|Автоматика', en: 'Logistics|Transport engineering|Railway transport|Automation' },
    aga: { ru: 'Подготовка пилотов|Воздушный транспорт|Авиационная техника|Управление воздушным движением', en: 'Pilot training|Air transport|Aviation engineering|Air traffic control' }
  };

  /* ---------- UNT Subject Navigator ----------
     IMPORTANT: N-KELL could not verify these combinations against official sources while building this version
     (no access to official sites from the build environment). Every entry is therefore marked "not verified".
     Before real use, check each entry against the current official list published by the National Testing
     Center and the Ministry, then set verified to the check date (YYYY-MM-DD) and add the exact source URL. */
  NK.UNT_META = { entered: '2026-11', sources: [
    { n: T('Ұлттық тестілеу орталығы (ҰТО)', 'Национальный центр тестирования (НЦТ)', 'National Testing Center (NTC)'), url: 'https://testcenter.kz' },
    { n: T('ҚР Ғылым және жоғары білім министрлігі', 'Министерство науки и высшего образования РК', 'Ministry of Science and Higher Education of Kazakhstan'), url: 'https://www.gov.kz/memleket/entities/sci' }
  ] };
  // combo: subject pair as commonly published for this group of programmes; null = no data entered.
  NK.UNT_PROGRAMS = [
    { id: 'it', n: T('Ақпараттық технологиялар (ақпараттық жүйелер, бағдарламалық инженерия, киберқауіпсіздік)', 'Информационные технологии (информационные системы, программная инженерия, кибербезопасность)', 'Information technology (information systems, software engineering, cybersecurity)'), cats: ['it'], profs: ['dev', 'data', 'ai', 'cyber'], combo: ['Математика', 'Информатика'], verified: null },
    { id: 'eng', n: T('Инженерия және техника (машина жасау, энергетика, робототехника)', 'Инженерия и техника (машиностроение, энергетика, робототехника)', 'Engineering (mechanical, power, robotics)'), cats: ['eng'], profs: ['mecheng', 'eleceng', 'roboeng', 'petro'], combo: ['Математика', 'Физика'], verified: null },
    { id: 'med', n: T('Денсаулық сақтау (жалпы медицина, стоматология, фармация)', 'Здравоохранение (общая медицина, стоматология, фармация)', 'Healthcare (general medicine, dentistry, pharmacy)'), cats: ['med'], profs: ['doctor', 'nurse', 'pharm'], combo: ['Биология', 'Химия'], verified: null },
    { id: 'econ', n: T('Экономика, қаржы, менеджмент', 'Экономика, финансы, менеджмент', 'Economics, finance, management'), cats: ['biz'], profs: ['econ', 'fin', 'entre', 'market', 'actuary', 'opsres'], combo: ['Математика', 'География'], verified: null },
    { id: 'law', n: T('Құқықтану', 'Юриспруденция', 'Law'), cats: ['law'], profs: ['lawyer', 'civil'], combo: ['Дүниежүзі тарихы', 'Құқық негіздері'], verified: null },
    { id: 'natsci', n: T('Жаратылыстану ғылымдары (химия, биология, биотехнология)', 'Естественные науки (химия, биология, биотехнология)', 'Natural sciences (chemistry, biology, biotechnology)'), cats: ['sci'], profs: ['bio', 'chem'], combo: ['Биология', 'Химия'], verified: null },
    { id: 'phys', n: T('Физика және математика ғылымдары', 'Физико-математические науки', 'Physics and mathematics'), cats: ['sci'], profs: ['phys', 'quant'], combo: ['Математика', 'Физика'], verified: null },
    { id: 'transport', n: T('Көлік, логистика және авиация', 'Транспорт, логистика и авиация', 'Transport, logistics and aviation'), cats: ['log'], profs: ['logist', 'pilot', 'supply'], combo: null, verified: null },
    { id: 'arch', n: T('Сәулет және құрылыс', 'Архитектура и строительство', 'Architecture and construction'), cats: ['arch'], profs: ['archi', 'civeng', 'urban'], combo: null, creative: true, verified: null },
    { id: 'design', n: T('Дизайн, анимация, өнер', 'Дизайн, анимация, искусство', 'Design, animation, arts'), cats: ['art'], profs: ['graphic', 'ux', 'anim', 'prodes'], combo: null, creative: true, verified: null },
    { id: 'journ', n: T('Журналистика және медиа', 'Журналистика и медиа', 'Journalism and media'), cats: ['media'], profs: ['journ', 'smm', 'pr'], combo: null, creative: true, verified: null },
    { id: 'ped', n: T('Педагогика (пән мұғалімдері)', 'Педагогика (учителя-предметники)', 'Teacher education (subject teachers)'), cats: ['edu'], profs: ['teacher', 'edtech', 'coach'], combo: null, note: T('Пән бойынша әртүрлі: мысалы, математика мұғалімі мен биология мұғаліміне әртүрлі пәндер қажет.', 'Зависит от предмета: учителю математики и учителю биологии нужны разные предметы.', 'Depends on the subject: maths and biology teachers need different subjects.'), verified: null },
    { id: 'agro', n: T('Ауыл шаруашылығы, ветеринария, экология', 'Сельское хозяйство, ветеринария, экология', 'Agriculture, veterinary science, ecology'), cats: ['agro'], profs: ['agron', 'vet', 'ecol'], combo: null, verified: null },
    { id: 'intl', n: T('Халықаралық қатынастар', 'Международные отношения', 'International relations'), cats: ['law'], profs: ['diplomat'], combo: null, verified: null },
    { id: 'psych', n: T('Психология', 'Психология', 'Psychology'), cats: ['med', 'edu'], profs: ['psych'], combo: null, verified: null }
  ];
})();
