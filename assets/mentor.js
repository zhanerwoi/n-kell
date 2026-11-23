/* N-KELL — Career guide: a rule-based assistant.
   No AI model is used. Replies are produced by transparent, rule-based templates that use the
   student's N-KELL profile only when the student has given consent.

   Integration point for a real model: replace NK.Mentor.provider with an object that implements
     async reply({ text, lang, context, history }) -> { text, chips }
   and call your own backend endpoint from it. Never put an API key in this front-end code:
   the backend should hold the key, apply safety rules and log nothing personal without consent.
   See ARCHITECTURE.md → "AI Mentor". */
window.NK = window.NK || {};
(function () {
  const T = (kz, ru, en) => ({ kz, ru, en });
  const L = (o, lang) => o[lang] || o.kz;
  const norm = s => (s || '').toLowerCase().replace(/ё/g, 'е');

  const KW = {
    safety: ['депресс', 'суицид', 'өзіме қол', 'жить не хочу', 'не хочу жить', 'self-harm', 'kill myself', 'suicid', 'панич', 'тревог', 'anxiety', 'уайым', 'қорқамын', 'страшно', 'depress'],
    code: ['код', 'code', 'holland', 'riasec', 'нәтиже', 'результат', 'result', 'профиль', 'profile'],
    compare: ['салыстыр', 'сравн', 'compare', ' vs', 'или ', 'немесе', ' or '],
    unt: ['ұбт', 'ент', 'unt', 'пән', 'предмет', 'subject'],
    next: ['келесі', 'дальше', 'next', 'не істеу', 'что делать', 'what should i do', 'бастау', 'начать', 'start'],
    bigfive: ['мінез', 'тұлға', 'характер', 'личност', 'personality', 'big five', 'бестік', 'пятерк'],
    values: ['құндылық', 'ценност', 'value'],
    uni: ['университет', 'вуз', 'university', 'оқу орны'],
    unsure: ['білмеймін', 'не знаю', "don't know", 'dont know', 'не могу выбрать', 'таңдай алмаймын', 'cannot choose', "can't choose", 'unsure']
  };
  const has = (s, list) => list.some(k => s.includes(k));

  function findProfs(s) {
    const found = [];
    NK.PROFS.forEach(p => { [p.n.kz, p.n.ru, p.n.en].some(n => { const key = norm(n).split(/[ /(]/)[0]; if (key.length >= 4 && s.includes(key)) { found.push(p); return true; } return false; }); });
    return found;
  }
  const pn = (p, lang) => p.n[lang] || p.n.kz;

  const R = {
    intro: T('Мен — N-KELL кеңесшісімін. Жауаптарым алдын ала жазылған ережелерге және сенің профиліңе негізделген. Мен жасанды интеллект емеспін.', 'Я — помощник N-KELL. Мои ответы основаны на заранее написанных правилах и твоём профиле. Я не искусственный интеллект.', 'I am the N-KELL career guide. My replies are based on pre-written rules and your profile. I am not an AI.'),
    noconsent: T('Профиліңді контекст ретінде пайдалануға рұқсат берілмеген, сондықтан жалпы түрде жауап беремін. Рұқсатты жоғарыдағы ауыстырғышпен беруге болады.', 'Ты не разрешил использовать свой профиль как контекст, поэтому отвечаю в общем виде. Разрешение можно включить переключателем выше.', 'You have not allowed me to use your profile, so I will answer in general terms. You can turn this on with the switch above.'),
    safety: T('Осы туралы айтқаныңа рахмет. Мен — мамандық таңдауға арналған көмекшімін және психологиялық көмек көрсете алмаймын. Өзіңді жайсыз сезінсең, сенімді ересекпен, мектеп психологымен сөйлес. Балалар мен жастарға арналған сенім телефоны — 150, шұғыл жағдайда — 112.', 'Спасибо, что поделился. Я — помощник по выбору профессии и не могу оказывать психологическую помощь. Если тебе тяжело, поговори со взрослым, которому доверяешь, или со школьным психологом. Телефон доверия для детей и молодёжи — 150, в экстренной ситуации — 112.', 'Thank you for sharing this. I am a career guidance assistant and cannot provide psychological help. If you are struggling, please talk to a trusted adult or your school psychologist. The helpline for children and young people in Kazakhstan is 150; in an emergency call 112.'),
    unsure: T('Таңдай алмау — 9–11 сыныпта өте қалыпты жағдай. Шешімді бірден қабылдау міндетті емес. Кішкентай қадамнан баста: бір тест, бір мамандық беті, бір симулятор.', 'Не знать, что выбрать, — совершенно нормально в 9–11 классе. Решать прямо сейчас не обязательно. Начни с маленького шага: один тест, одна страница профессии, один симулятор.', 'Not knowing what to choose is completely normal in grades 9–11. You do not have to decide now. Start small: one test, one career page, one simulation.'),
    fallback: T('Мен мыналарға көмектесе аламын: нәтижеңді түсіндіру, мамандықтарды салыстыру, ҰБТ пәндері, келесі қадам. Төмендегі сұрақтардың бірін таңда немесе мамандық атын жаз.', 'Я могу помочь: объяснить результаты, сравнить профессии, подсказать предметы ЕНТ и следующий шаг. Выбери вопрос ниже или напиши название профессии.', 'I can help explain your results, compare careers, discuss UNT subjects or suggest your next step. Pick a question below or type a career name.'),
    reflect: [T('Қандай сабақта уақыттың қалай өткенін байқамайсың?', 'На каком уроке ты не замечаешь, как летит время?', 'In which lesson do you lose track of time?'), T('5 жылдан кейінгі әдеттегі жұмыс күніңді елестет: қайдасың, кіммен бірге?', 'Представь обычный рабочий день через 5 лет: где ты и с кем?', 'Picture a normal working day five years from now: where are you, and who are you with?'), T('Бұл таңдау кімнің арманы — сенікі ме, әлде біреудің күтуі ме?', 'Чья это мечта — твоя или чьи-то ожидания?', 'Whose dream is this choice — yours, or someone else\'s expectation?')]
  };
  const chipsFor = lang => [T('Менің нәтижемді түсіндір', 'Объясни мои результаты', 'Explain my results'), T('Келесі қадамым қандай?', 'Какой мой следующий шаг?', 'What is my next step?'), T('Дәрігер мен биотехнологты салыстыр', 'Сравни врача и биотехнолога', 'Compare doctor and biotechnologist'), T('Бағдарламашыға қандай ҰБТ пәндері керек?', 'Какие предметы ЕНТ нужны программисту?', 'Which UNT subjects does a developer need?'), T('Не таңдарымды білмеймін', 'Не знаю, что выбрать', 'I don\'t know what to choose')].map(o => L(o, lang));

  function reply({ text, lang, context }) {
    const s = ' ' + norm(text) + ' ';
    const out = [];
    const t = (k, v) => NK.t(k, v);
    const ctx = context; // null when no consent
    const profs = findProfs(s);
    const ask = () => L(R.reflect[(text.length + (profs[0] ? profs[0].id.length : 0)) % R.reflect.length], lang);

    if (has(s, KW.safety)) return { text: L(R.safety, lang), chips: chipsFor(lang), safety: true };
    if (has(s, KW.unsure)) { out.push(L(R.unsure, lang)); if (ctx && ctx.next) out.push(t('mt_next', { step: ctx.next })); out.push(ask()); return { text: out.join('\n\n'), chips: chipsFor(lang) }; }

    if (profs.length >= 2 && has(s, KW.compare)) {
      const [a, b] = profs;
      out.push(t('mt_cmp_intro', { a: pn(a, lang), b: pn(b, lang) }));
      out.push(t('mt_cmp_codes', { a: pn(a, lang), ca: a.code, b: pn(b, lang), cb: b.code }));
      if (ctx && ctx.rec) { const ma = ctx.rec.byId[a.id], mb = ctx.rec.byId[b.id]; if (ma && mb) out.push(t('mt_cmp_match', { a: pn(a, lang), b: pn(b, lang), x: ma.total, y: mb.total })); }
      out.push(t('mt_cmp_tool'));
      out.push(ask());
      return { text: out.join('\n\n'), chips: chipsFor(lang), link: 'compare' };
    }
    if (profs.length && has(s, KW.unt)) {
      const p = profs[0]; const prog = NK.UNT_PROGRAMS.find(g => g.profs.includes(p.id));
      out.push(prog && prog.combo ? t('mt_unt_combo', { p: pn(p, lang), combo: prog.combo.map(x => NK.subjName(x)).join(' + ') }) : t('mt_unt_none', { p: pn(p, lang) }));
      out.push(t('mt_unt_verify'));
      return { text: out.join('\n\n'), chips: chipsFor(lang), link: 'unt' };
    }
    if (profs.length) {
      const p = profs[0];
      out.push(t('mt_prof', { p: pn(p, lang), desc: NK.pc(p, 'd') }));
      if (ctx && ctx.rec && ctx.rec.byId[p.id]) {
        const m = ctx.rec.byId[p.id];
        out.push(t('mt_prof_match', { x: m.total }));
        const good = m.ev.interests.map(([l]) => t('k_' + l)).concat(m.ev.strengths.slice(0, 2).map(([d]) => NK.dimName('strengths', d)));
        if (good.length) out.push(t('mt_prof_good', { list: good.join(', ') }));
        if (m.ev.develop.length) out.push(t('mt_prof_dev', { list: m.ev.develop.slice(0, 2).map(([d]) => NK.dimName('strengths', d)).join(', ') }));
      } else if (!ctx) out.push(L(R.noconsent, lang));
      out.push(ask());
      return { text: out.join('\n\n'), chips: chipsFor(lang), link: 'career-' + p.id };
    }
    if (has(s, KW.code)) {
      if (!ctx) return { text: L(R.noconsent, lang) + '\n\n' + t('mt_riasec_general'), chips: chipsFor(lang) };
      if (!ctx.P.riasec) return { text: t('mt_no_tests'), chips: chipsFor(lang), link: 'test-riasec' };
      const code = NK.Engine.sortDims(ctx.P.riasec.s).slice(0, 3);
      out.push(t('mt_code', { code: code.join(''), types: code.map(l => t('k_' + l)).join(', ') }));
      out.push(t('rd_' + code[0]));
      if (ctx.rec.best.length) out.push(t('mt_code_careers', { list: ctx.rec.best.slice(0, 3).map(m => pn(NK.PROF[m.id], lang) + ' (' + m.total + '%)').join(', ') }));
      out.push(t('mt_not_diag'));
      out.push(ask());
      return { text: out.join('\n\n'), chips: chipsFor(lang), link: 'me' };
    }
    if (has(s, KW.bigfive)) { out.push(t('mt_bigfive')); if (ctx && ctx.P.bigfive) out.push(t('mt_bigfive_you', { list: NK.Engine.sortDims(ctx.P.bigfive.s).slice(0, 2).map(d => NK.dimName('bigfive', d)).join(', ') })); return { text: out.join('\n\n'), chips: chipsFor(lang), link: 'test-bigfive' }; }
    if (has(s, KW.values)) { out.push(t('mt_values')); if (ctx && ctx.P.values) out.push(t('mt_values_you', { list: NK.Engine.sortDims(ctx.P.values.s).slice(0, 3).map(d => NK.dimName('values', d)).join(', ') })); out.push(ask()); return { text: out.join('\n\n'), chips: chipsFor(lang), link: 'test-values' }; }
    if (has(s, KW.unt)) return { text: t('mt_unt_general') + '\n\n' + t('mt_unt_verify'), chips: chipsFor(lang), link: 'unt' };
    if (has(s, KW.uni)) return { text: t('mt_uni'), chips: chipsFor(lang), link: 'unis' };
    if (has(s, KW.next)) { out.push(ctx ? t('mt_next', { step: ctx.next }) : L(R.noconsent, lang)); out.push(ask()); return { text: out.join('\n\n'), chips: chipsFor(lang), link: ctx ? ctx.nextHref : 'dashboard' }; }
    if (/^\s*(сәлем|салем|привет|здравств|hello|hi|hey)\b/.test(norm(text))) return { text: L(R.intro, lang) + '\n\n' + L(R.fallback, lang), chips: chipsFor(lang) };
    return { text: L(R.fallback, lang), chips: chipsFor(lang) };
  }

  NK.Mentor = { provider: { name: 'rules', reply: async (req) => reply(req) }, chipsFor, intro: lang => L(R.intro, lang) };
})();
