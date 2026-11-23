/* N-KELL — Career simulator: 10 interactive, deterministic mini-experiences (KZ/RU/EN).
   Multi-stage simulations share one stage runner that gives feedback after each decision
   and a final performance report. Results are educational indicators, not qualifications. */
(function () {
  'use strict';
  const NK = window.NK;
  const T = (kz, ru, en) => ({ kz, ru, en });
  const tx = o => NK.L(o);
  const esc = s => NK.esc(s);
  const ic = (n, c) => NK.icon(n, c);
  const t = k => NK.t(k);
  const clamp = v => Math.max(0, Math.min(100, Math.round(v)));
  const UI = {
    stage: T('Кезең', 'Этап', 'Stage'), check: T('Тексеру', 'Проверить', 'Check'), next: T('Келесі кезең', 'Следующий этап', 'Next stage'), finish: T('Қорытынды есеп', 'Итоговый отчёт', 'Final report'),
    report: T('Қорытынды есеп', 'Итоговый отчёт', 'Final performance report'), again: T('Қайта бастау', 'Начать заново', 'Start again'),
    edu: T('Бұл — оқу көрсеткіші, кәсіби біліктілік емес.', 'Это учебный показатель, а не профессиональная квалификация.', 'This is an educational indicator, not a professional qualification.'),
    crit: { reasoning: T('Пайымдау', 'Рассуждение', 'Reasoning'), accuracy: T('Дәлдік', 'Точность', 'Accuracy'), decision: T('Шешім қабылдау', 'Принятие решений', 'Decision-making'), creativity: T('Шығармашылық', 'Креативность', 'Creativity'), completion: T('Тапсырманы орындау', 'Выполнение задачи', 'Task completion') },
    pick: T('Таңдаңыз', 'Выберите', 'Choose'), selected: T('таңдалды', 'выбрано', 'selected')
  };

  function resultBox(score, lines) {
    return `<div class="sim-res ${score >= 70 ? 'good' : score >= 40 ? 'mid' : 'low'}">${NK.ring(score, 76)}<div><h4>${esc(t('sim_result'))}</h4>${lines.map(l => `<p class="${l[0] ? 'ok' : 'no'}">${ic(l[0] ? 'check-circle-2' : 'alert-triangle')} ${esc(typeof l[1] === 'string' ? l[1] : tx(l[1]))}</p>`).join('')}<p class="tiny muted">${esc(tx(UI.edu))}</p></div></div>`;
  }
  const optBtn = (i, text, on, attr, disabled, multi) => `<button class="opt ${on ? 'on' : ''}" ${attr}="${i}" ${disabled ? 'disabled' : ''} role="${multi ? 'checkbox' : 'radio'}" aria-checked="${on}"><span class="opt-k">${multi ? ic(on ? 'check' : 'plus') : String.fromCharCode(65 + i)}</span><span>${esc(tx(text))}</span></button>`;

  /* ---------- Stage runner ----------
     stage = { title, mount(box, submit, locked, state) } ; submit({score, crit:{..}, fb:[[ok, text]]}) */
  function runStages(el, done, stages) {
    let i = 0, res = [], state = {};
    function draw() {
      const cur = res[i];
      el.innerHTML = `<div class="stages" aria-label="progress">${stages.map((s, k) => `<span class="${k < i ? 'past' : k === i ? 'cur' : ''}"><b>${k + 1}</b>${esc(tx(s.title))}</span>`).join('')}</div>
        <div class="card stage"><h4>${esc(tx(UI.stage))} ${i + 1}/${stages.length}: ${esc(tx(stages[i].title))}</h4><div class="st-body"></div>
        ${cur ? `<div class="st-fb">${cur.fb.map(f => `<p class="${f[0] ? 'ok' : 'no'}">${ic(f[0] ? 'check-circle-2' : 'alert-triangle')} ${esc(tx(f[1]))}</p>`).join('')}</div><button class="btn btn-violet btn-sm" data-stnext>${esc(tx(i === stages.length - 1 ? UI.finish : UI.next))} ${ic('arrow-right')}</button>` : ''}</div>`;
      stages[i].mount(el.querySelector('.st-body'), r => { res[i] = r; draw(); }, !!cur, state);
      const nb = el.querySelector('[data-stnext]');
      if (nb) nb.addEventListener('click', () => { if (i < stages.length - 1) { i++; draw(); } else report(); });
    }
    function report() {
      const total = clamp(res.reduce((s, r) => s + r.score, 0) / res.length);
      const crit = {};
      res.forEach(r => Object.keys(r.crit || {}).forEach(k => { (crit[k] = crit[k] || []).push(r.crit[k]); }));
      Object.keys(crit).forEach(k => { crit[k] = clamp(crit[k].reduce((s, v) => s + v, 0) / crit[k].length); });
      crit.completion = 100;
      el.innerHTML = `<div class="card"><h4>${ic('trophy')} ${esc(tx(UI.report))}</h4>
        <div class="sim-rep">${NK.ring(total, 96)}<div class="sim-rep-c">${Object.keys(crit).map(k => `<div class="bar-row"><div class="bar-lbl"><span>${esc(tx(UI.crit[k]))}</span><b>${crit[k]}%</b></div><div class="bar"><i style="--w:${Math.max(2, crit[k])}%"></i></div></div>`).join('')}</div></div>
        <ol class="st-list">${stages.map((s, k) => `<li><span>${esc(tx(s.title))}</span><b>${res[k].score}%</b></li>`).join('')}</ol>
        <p class="tiny muted">${ic('info')} ${esc(tx(UI.edu))}</p>
        <button class="btn btn-ghost btn-sm" data-again>${ic('rotate-ccw')} ${esc(tx(UI.again))}</button></div>`;
      el.querySelector('[data-again]').addEventListener('click', () => { i = 0; res = []; state = {}; draw(); });
      done(total, crit);
    }
    draw();
  }
  /* single-choice stage factory */
  function choiceStage(title, question, opts, scoreFn, critKeys, fbFn) {
    return { title, mount(box, submit, locked, st) {
      const key = 'c_' + tx(title);
      const draw = () => {
        box.innerHTML = `<p class="st-q">${esc(tx(question))}</p><div class="qs">${opts.map((o, k) => optBtn(k, o, st[key] === k, 'data-o', locked)).join('')}</div>${locked ? '' : `<button class="btn btn-lime btn-sm" data-ck ${st[key] == null ? 'disabled' : ''}>${ic('check')} ${esc(tx(UI.check))}</button>`}`;
        box.querySelectorAll('[data-o]').forEach(b => b.addEventListener('click', () => { st[key] = +b.dataset.o; draw(); }));
        const ck = box.querySelector('[data-ck]');
        if (ck) ck.addEventListener('click', () => { const sc = scoreFn(st[key]); const crit = {}; critKeys.forEach(c => { crit[c] = sc; }); submit({ score: sc, crit, fb: fbFn(st[key], sc) }); });
      };
      draw();
    } };
  }
  /* multi-select stage factory: right = set of correct indices */
  function multiStage(title, question, opts, right, critKeys, fbOk) {
    return { title, mount(box, submit, locked, st) {
      const key = 'm_' + tx(title); st[key] = st[key] || [];
      const draw = () => {
        box.innerHTML = `<p class="st-q">${esc(tx(question))}</p><div class="qs">${opts.map((o, k) => optBtn(k, o, st[key].includes(k), 'data-o', locked, true)).join('')}</div>${locked ? '' : `<button class="btn btn-lime btn-sm" data-ck ${st[key].length ? '' : 'disabled'}>${ic('check')} ${esc(tx(UI.check))}</button>`}`;
        box.querySelectorAll('[data-o]').forEach(b => b.addEventListener('click', () => { const k = +b.dataset.o; st[key] = st[key].includes(k) ? st[key].filter(x => x !== k) : st[key].concat(k); draw(); }));
        const ck = box.querySelector('[data-ck]');
        if (ck) ck.addEventListener('click', () => {
          const hit = st[key].filter(k => right.includes(k)).length, wrong = st[key].length - hit;
          const sc = clamp(hit / right.length * 100 - wrong * 20);
          const crit = {}; critKeys.forEach(c => { crit[c] = sc; });
          const fb = [[hit === right.length, T(`Дұрыс табылғаны: ${hit}/${right.length}`, `Найдено верно: ${hit}/${right.length}`, `Correct items found: ${hit}/${right.length}`)], [wrong === 0, wrong ? T(`Артық таңдау: ${wrong}`, `Лишних выборов: ${wrong}`, `Extra wrong picks: ${wrong}`) : T('Артық таңдау жоқ', 'Лишних выборов нет', 'No wrong picks')]].concat(fbOk ? [[true, fbOk]] : []);
          submit({ score: sc, crit, fb });
        });
      };
      draw();
    } };
  }

  NK.SIMS = {};

  /* ===== 1. Software developer (4 stages) ===== */
  NK.SIMS.prog = {
    icon: 'code-2', mins: 8, profs: ['dev', 'data', 'ai'],
    title: T('Бағдарламашы', 'Программист', 'Software developer'),
    teaser: T('Мәселені түсін, шешім таңда, қатені тап және роботты бағдарлама.', 'Пойми задачу, выбери решение, найди ошибку и запрограммируй робота.', 'Understand a problem, choose a solution, find a bug and program a robot.'),
    intro: T('Мектеп қосымшасына «үздік оқушылар» тізімі қажет. Сен — әзірлеушісің: талапты түсініп, алгоритм таңдап, кодтағы қатені тауып, соңында роботты лабиринттен шығарасың.', 'Школьному приложению нужен список отличников. Ты — разработчик: поймёшь требования, выберешь алгоритм, найдёшь ошибку в коде и выведешь робота из лабиринта.', 'A school app needs an honour-roll list. As the developer you will understand the requirement, choose an algorithm, find a bug in the code and finally guide a robot out of a maze.'),
    task: T('4 кезең: талапты түсіну → шешім таңдау → қатені табу → роботты бағдарламалау.', '4 этапа: понять требование → выбрать решение → найти ошибку → запрограммировать робота.', '4 stages: understand the requirement → choose a solution → find the bug → program the robot.'),
    skills: [T('Алгоритмдік ойлау', 'Алгоритмическое мышление', 'Algorithmic thinking'), T('Талапты талдау', 'Анализ требований', 'Requirement analysis'), T('Қатені табу (debugging)', 'Поиск ошибок (debugging)', 'Debugging'), T('Оңтайландыру', 'Оптимизация', 'Optimisation')],
    render(el, done) {
      runStages(el, done, [
        choiceStage(T('Талапты түсіну', 'Понять требование', 'Understand the requirement'), T('Тапсырма: «Орташа бағасы 4.5 және одан жоғары оқушылардың атын шығару». Кіріс (input) және шығыс (output) қандай?', 'Задача: «Вывести имена учеников со средним баллом 4.5 и выше». Что на входе и что на выходе?', 'Task: "Show the names of students whose average grade is 4.5 or higher." What are the input and output?'),
          [T('Кіріс: оқушылар мен олардың бағалары · Шығыс: орташа ≥ 4.5 оқушылардың аты', 'Вход: ученики и их оценки · Выход: имена учеников со средним ≥ 4.5', 'Input: students and their grades · Output: names of students with average ≥ 4.5'), T('Кіріс: оқушылардың аты · Шығыс: бағалары', 'Вход: имена учеников · Выход: их оценки', 'Input: student names · Output: their grades'), T('Кіріс: орташа баға · Шығыс: барлық оқушылар', 'Вход: средний балл · Выход: все ученики', 'Input: an average grade · Output: all students')],
          a => (a === 0 ? 100 : 20), ['reasoning'], a => [[a === 0, a === 0 ? T('Дұрыс: талапты кіріс → өңдеу → шығыс түрінде сипаттау — әзірлеудің бірінші қадамы.', 'Верно: описать требование как вход → обработка → выход — первый шаг разработки.', 'Correct: describing input → processing → output is the first step of development.') : T('Талапта бізге оқушылар мен бағалар беріледі, ал шығуы — тек шартқа сай есімдер.', 'По условию даны ученики и оценки, а на выходе — только имена, подходящие под условие.', 'The requirement gives students with grades; the output is only the names that meet the condition.')]]),
        choiceStage(T('Шешім таңдау', 'Выбрать решение', 'Choose a solution'), T('Қай алгоритм талапты дұрыс орындайды?', 'Какой алгоритм правильно выполняет требование?', 'Which algorithm correctly meets the requirement?'),
          [T('Әр оқушы үшін бағаларының орташасын есептеп, ≥ 4.5 болса тізімге қосу', 'Для каждого ученика посчитать среднее, если ≥ 4.5 — добавить в список', 'For each student compute the average; if ≥ 4.5 add them to the list'), T('Оқушыларды аты бойынша сұрыптап, алғашқы 10-ын алу', 'Отсортировать по имени и взять первых 10', 'Sort students by name and take the first 10'), T('Соңғы бағасы 5 болған оқушыларды алу', 'Взять учеников, у которых последняя оценка 5', 'Take students whose last grade is 5')],
          a => (a === 0 ? 100 : 15), ['reasoning', 'decision'], a => [[a === 0, a === 0 ? T('Дұрыс. Басқа нұсқалар шартты тексермейді — нәтиже кездейсоқ болар еді.', 'Верно. Другие варианты не проверяют условие — результат был бы случайным.', 'Correct. The other options never check the condition, so results would be arbitrary.') : T('Бұл тәсіл орташа бағаны тексермейді, сондықтан тізімде қате оқушылар болады.', 'Этот способ не проверяет средний балл — в списке окажутся не те ученики.', 'This approach never checks the average, so the list would contain the wrong students.')]]),
        { title: T('Қатені табу', 'Найти ошибку', 'Find the bug'), mount(box, submit, locked, st) {
          const code = ['honours = []', 'for s in students:', '    avg = sum(s.grades) / 5', '    if avg > 4.5:', '        honours.append(s.name)', 'print(honours)'];
          const bugs = [2, 3]; st.lines = st.lines || [];
          const draw = () => {
            box.innerHTML = `<p class="st-q">${esc(tx(T('Код тестте қате нәтиже берді. Қате бар жолдарды бас (бірнешеу болуы мүмкін).', 'Код дал неверный результат в тесте. Нажми на строки с ошибками (их может быть несколько).', 'The code failed a test. Click every line that contains a bug (there may be more than one).')))}</p>
              <ol class="code-l">${code.map((c, k) => `<li><button class="cl ${st.lines.includes(k) ? 'on' : ''}" data-l="${k}" ${locked ? 'disabled' : ''}><code>${esc(c)}</code></button></li>`).join('')}</ol>
              ${locked ? '' : `<button class="btn btn-lime btn-sm" data-ck ${st.lines.length ? '' : 'disabled'}>${ic('check')} ${esc(tx(UI.check))}</button>`}`;
            box.querySelectorAll('[data-l]').forEach(b => b.addEventListener('click', () => { const k = +b.dataset.l; st.lines = st.lines.includes(k) ? st.lines.filter(x => x !== k) : st.lines.concat(k); draw(); }));
            const ck = box.querySelector('[data-ck]');
            if (ck) ck.addEventListener('click', () => {
              const hit = st.lines.filter(k => bugs.includes(k)).length, wrong = st.lines.length - hit;
              const sc = clamp(hit * 50 - wrong * 20);
              submit({ score: sc, crit: { accuracy: sc }, fb: [[st.lines.includes(2), T('3-жол: бағалар саны әрқашан 5 емес — len(s.grades)-ке бөлу керек.', 'Строка 3: оценок не всегда 5 — делить нужно на len(s.grades).', 'Line 3: there are not always 5 grades — divide by len(s.grades).')], [st.lines.includes(3), T('4-жол: «4.5 және одан жоғары» дегені >= белгісі.', 'Строка 4: «4.5 и выше» означает >=.', 'Line 4: "4.5 or higher" needs >=.')], [wrong === 0, wrong ? T('Кейбір жолдар дұрыс еді — оларды өзгерту жаңа қате әкелер еді.', 'Некоторые строки были верными — их изменение добавило бы новые ошибки.', 'Some selected lines were correct — changing them would introduce new bugs.') : T('Артық жол таңдалмады.', 'Лишних строк не выбрано.', 'No correct lines were flagged.')]] });
            });
          };
          draw();
        } },
        { title: T('Роботты бағдарламалау', 'Запрограммировать робота', 'Program the robot'), mount(box, submit, locked, st) {
          const MAP = ['S..#..', '##.#.#', '.....#', '.###..', '...##.', '##...G'];
          const OPT = 6; const D = { U: [-1, 0, 'arrow-up'], D: [1, 0, 'arrow-down'], L: [0, -1, 'arrow-left'], R: [0, 1, 'arrow-right'] };
          st.prog = st.prog || []; let robot = [0, 0], running = false, msg = '';
          const draw = () => {
            let cells = '';
            MAP.forEach((row, r) => row.split('').forEach((ch, c) => { cells += `<div class="cell ${ch === '#' ? 'wall' : ''} ${ch === 'G' ? 'goal' : ''}">${ch === 'G' ? ic('flag') : ''}${robot[0] === r && robot[1] === c ? `<span class="robot">${ic('bot')}</span>` : ''}</div>`; }));
            const dis = running || locked ? 'disabled' : '';
            box.innerHTML = `<p class="st-q">${esc(tx(T('Роботты жасыл жалауға жеткіз. «×2/×3» соңғы команданы қайталайды. Блоктар неғұрлым аз болса, соғұрлым жақсы.', 'Доведи робота до зелёного флага. «×2/×3» повторяют последнюю команду. Чем меньше блоков, тем лучше.', 'Guide the robot to the green flag. "×2/×3" repeats the last command. Fewer blocks is better.')))}</p>
              <div class="sim-2col"><div class="maze" style="grid-template-columns:repeat(6,1fr)">${cells}</div><div>
              <div class="prog" aria-live="polite">${st.prog.length ? st.prog.map((b, k) => `<span class="blk">${ic(D[b.c][2])}${b.n > 1 ? '×' + b.n : ''}<small>${k + 1}</small></span>`).join('') : '<span class="muted tiny">—</span>'}</div>
              <div class="pad">${['U', 'D', 'L', 'R'].map(c => `<button class="btn btn-glass btn-sm" data-c="${c}" ${dis} aria-label="${c}">${ic(D[c][2])}</button>`).join('')}<button class="btn btn-glass btn-sm" data-x="2" ${dis}>×2</button><button class="btn btn-glass btn-sm" data-x="3" ${dis}>×3</button></div>
              <div class="cta-row"><button class="btn btn-lime btn-sm" data-run ${dis} ${st.prog.length ? '' : 'disabled'}>${ic('play')} Run</button><button class="btn btn-ghost btn-sm" data-undo ${dis}>${ic('arrow-left')} Undo</button><button class="btn btn-ghost btn-sm" data-clear ${dis}>${ic('rotate-ccw')} Clear</button></div>
              <p class="tiny muted">${st.prog.length} / 12 · ${st.prog.reduce((s, b) => s + b.n, 0)} steps</p>${msg ? `<p class="sim-msg">${esc(msg)}</p>` : ''}</div></div>`;
            box.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
              if (running || locked) return;
              if (b.dataset.c && st.prog.length < 12) st.prog.push({ c: b.dataset.c, n: 1 });
              else if (b.dataset.x && st.prog.length) st.prog[st.prog.length - 1].n = +b.dataset.x;
              else if ('undo' in b.dataset) st.prog.pop();
              else if ('clear' in b.dataset) { st.prog = []; robot = [0, 0]; msg = ''; }
              else if ('run' in b.dataset) return run();
              draw();
            }));
          };
          const run = () => {
            running = true; robot = [0, 0]; msg = ''; draw();
            const steps = []; st.prog.forEach(b => { for (let k = 0; k < b.n; k++) steps.push(b.c); });
            let k = 0;
            const tick = () => {
              if (k >= steps.length) return fin(false, tx(T('Бағдарлама аяқталды, бірақ робот жалауға жетпеді.', 'Программа закончилась, но робот не дошёл до флага.', 'The program ended before the robot reached the flag.')));
              const nr = robot[0] + D[steps[k]][0], nc = robot[1] + D[steps[k]][1];
              if (nr < 0 || nc < 0 || nr > 5 || nc > 5 || MAP[nr][nc] === '#') return fin(false, tx(T(`${k + 1}-қадамда робот қабырғаға соқтығысты. Түзетіп, қайта іске қос.`, `На шаге ${k + 1} робот врезался в стену. Исправь и запусти снова.`, `The robot hit a wall at step ${k + 1}. Fix it and run again.`)));
              robot = [nr, nc]; k++; draw();
              if (MAP[nr][nc] === 'G') return fin(true);
              setTimeout(tick, 220);
            };
            setTimeout(tick, 220);
          };
          const fin = (ok, why) => {
            running = false;
            if (!ok) { msg = why; draw(); return; }
            const n = st.prog.length; const sc = n <= OPT ? 100 : Math.max(60, 100 - 8 * (n - OPT));
            submit({ score: sc, crit: { accuracy: sc, decision: sc }, fb: [[true, T('Робот мақсатқа жетті!', 'Робот дошёл до цели!', 'The robot reached the goal!')], [n <= OPT, T(`Блоктар: ${n} (ең қысқа шешім — ${OPT})`, `Блоков: ${n} (кратчайшее решение — ${OPT})`, `Blocks: ${n} (shortest solution — ${OPT})`)]] });
          };
          draw();
        } }
      ]);
    }
  };

  /* ===== 2. Data analyst (4 stages) ===== */
  const CAFE = [['Mon', 12, 18, 52], ['Tue', 15, 24, 44], ['Wed', 21, 39, 30], ['Thu', 25, 47, 22], ['Fri', 28, 55, 15], ['Sat', 18, 30, 36], ['Sun', 10, 14, 58]];
  const DAYS = { Mon: T('Дс', 'Пн', 'Mon'), Tue: T('Сс', 'Вт', 'Tue'), Wed: T('Ср', 'Ср', 'Wed'), Thu: T('Бс', 'Чт', 'Thu'), Fri: T('Жм', 'Пт', 'Fri'), Sat: T('Сб', 'Сб', 'Sat'), Sun: T('Жс', 'Вс', 'Sun') };
  NK.SIMS.data = {
    icon: 'bar-chart-3', mins: 7, profs: ['data', 'opsres', 'econ'],
    title: T('Деректер талдаушысы', 'Аналитик данных', 'Data analyst'),
    teaser: T('Мектеп кафесінің деректерінен заңдылық тауып, ұсыныс жаса.', 'Найди закономерности в данных школьного кафе и дай рекомендацию.', 'Find patterns in school café data and make a recommendation.'),
    intro: T('Мектеп кафесі бір апта бойы ауа температурасын және салқын сусын мен ыстық шайдың сатылымын жазып отырды. Сенің міндетің — деректерді талдап, ертеңге ұсыныс беру.', 'Школьное кафе неделю записывало температуру воздуха и продажи холодных напитков и горячего чая. Твоя задача — проанализировать данные и дать рекомендацию на завтра.', 'For a week the school café recorded the air temperature and sales of cold drinks and hot tea. Your job: analyse the data and recommend what to stock tomorrow.'),
    task: T('4 кезең: заңдылық → есептеу → түсіндіру → ұсыныс.', '4 этапа: закономерность → расчёт → интерпретация → рекомендация.', '4 stages: pattern → calculation → interpretation → recommendation.'),
    skills: [T('Деректерді оқу', 'Чтение данных', 'Reading data'), T('Есептеу', 'Вычисления', 'Calculation'), T('Корреляция мен себепті ажырату', 'Различать корреляцию и причину', 'Correlation vs causation'), T('Деректерге негізделген шешім', 'Решения на основе данных', 'Data-driven decisions')],
    render(el, done) {
      const table = () => `<div class="tbl-wrap"><table class="dtbl"><thead><tr><th>${esc(tx(T('Күн', 'День', 'Day')))}</th><th>°C</th><th>${esc(tx(T('Салқын сусын', 'Холодные напитки', 'Cold drinks')))}</th><th>${esc(tx(T('Ыстық шай', 'Горячий чай', 'Hot tea')))}</th></tr></thead><tbody>${CAFE.map(r => `<tr><td>${esc(tx(DAYS[r[0]]))}</td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td></tr>`).join('')}</tbody></table></div>`;
      const withTable = st => ({ title: st.title, mount(box, submit, locked, s) { const inner = document.createElement('div'); box.innerHTML = table(); box.appendChild(inner); st.mount(inner, submit, locked, s); } });
      runStages(el, done, [
        withTable(choiceStage(T('Заңдылықты табу', 'Найти закономерность', 'Find the pattern'), T('Кестеден қандай байланыс көрінеді?', 'Какую связь показывает таблица?', 'What relationship does the table show?'),
          [T('Температура көтерілсе, салқын сусын көбейеді, ал шай азаяды', 'При росте температуры холодных напитков больше, а чая меньше', 'As temperature rises, cold drinks go up and tea goes down'), T('Ешқандай байланыс жоқ', 'Связи нет', 'There is no relationship'), T('Температура көтерілсе, шай көбейеді', 'При росте температуры чая больше', 'As temperature rises, tea goes up'), T('Сатылым тек апта күніне байланысты', 'Продажи зависят только от дня недели', 'Sales depend only on the day of the week')],
          a => (a === 0 ? 100 : 15), ['reasoning'], a => [[a === 0, a === 0 ? T('Дұрыс: 10°C-та 14 салқын сусын, 28°C-та 55.', 'Верно: при 10°C — 14 холодных напитков, при 28°C — 55.', 'Correct: 14 cold drinks at 10°C, 55 at 28°C.') : T('Температура мен сусындар бағандарын қатар қара: олар бірге өзгереді.', 'Сравни столбцы температуры и напитков: они меняются вместе.', 'Compare the temperature and drinks columns side by side: they move together.')]])),
        withTable({ title: T('Есептеу', 'Расчёт', 'Calculate'), mount(box, submit, locked, st) {
          box.insertAdjacentHTML('beforeend', `<label class="st-q" for="dv-avg">${esc(tx(T('Күніне орта есеппен қанша салқын сусын сатылды? (бүтін санға дейін)', 'Сколько холодных напитков в среднем продавалось в день? (до целого)', 'On average, how many cold drinks were sold per day? (whole number)')))}</label><input id="dv-avg" type="number" inputmode="numeric" value="${st.avg != null ? st.avg : ''}" ${locked ? 'disabled' : ''}>${locked ? '' : `<button class="btn btn-lime btn-sm" data-ck>${ic('check')} ${esc(tx(UI.check))}</button>`}`);
          const ck = box.querySelector('[data-ck]');
          if (ck) ck.addEventListener('click', () => {
            const v = parseFloat(box.querySelector('#dv-avg').value); st.avg = isNaN(v) ? '' : v;
            const ok = Math.abs(v - 32.4) <= 1; const sc = ok ? 100 : Math.abs(v - 32.4) <= 5 ? 50 : 0;
            submit({ score: sc, crit: { accuracy: sc }, fb: [[ok, T('Қосынды 227 ÷ 7 күн ≈ 32.4 → 32.', 'Сумма 227 ÷ 7 дней ≈ 32,4 → 32.', 'Sum 227 ÷ 7 days ≈ 32.4 → 32.')]] });
          });
        } }),
        choiceStage(T('Түсіндіру', 'Интерпретация', 'Interpret'), T('Қай тұжырым ең дәл?', 'Какой вывод самый точный?', 'Which conclusion is most accurate?'),
          [T('Деректер температура — жалғыз себеп екенін дәлелдейді', 'Данные доказывают, что температура — единственная причина', 'The data proves temperature is the only cause'), T('Күшті байланыс (корреляция) бар, бірақ 7 күн аз және басқа факторлар болуы мүмкін', 'Есть сильная связь (корреляция), но 7 дней мало и могут влиять другие факторы', 'There is a strong relationship (correlation), but 7 days is a small sample and other factors may matter'), T('Ешқандай қорытынды жасауға болмайды', 'Никаких выводов сделать нельзя', 'No conclusion can be drawn at all'), T('Салқын сусын ауа райын ыстық етеді', 'Холодные напитки делают погоду жаркой', 'Cold drinks make the weather hot')],
          a => (a === 1 ? 100 : a === 2 ? 40 : 10), ['reasoning'], a => [[a === 1, T('Корреляция себепті дәлелдемейді. Талдаушы қорытындының сенімділігін де айтады.', 'Корреляция не доказывает причину. Аналитик называет и степень уверенности вывода.', 'Correlation does not prove causation. A good analyst also states how confident the conclusion is.')]]),
        choiceStage(T('Ұсыныс', 'Рекомендация', 'Recommend'), T('Ертең 27°C болады. Кафе қалай дайындалсын?', 'Завтра будет 27°C. Как подготовиться кафе?', 'Tomorrow will be 27°C. How should the café stock up?'),
          [T('Салқын сусынды көбірек (~50), шайды азырақ (~18) дайындау', 'Больше холодных напитков (~50), меньше чая (~18)', 'More cold drinks (~50), less tea (~18)'), T('Жексенбідегідей дайындау', 'Как в воскресенье', 'Same as Sunday'), T('Тек шай дайындау', 'Только чай', 'Only tea'), T('Барлығын екі есе көп дайындау', 'Всего в два раза больше', 'Double everything')],
          a => (a === 0 ? 100 : a === 3 ? 30 : 10), ['decision'], a => [[a === 0, a === 0 ? T('Жақсы: 25–28°C күндердегі деректерге сүйендің, ысырап та, тапшылық та аз болады.', 'Хорошо: ты опирался на дни с 25–28°C, будет меньше и нехватки, и излишков.', 'Good: you used the 25–28°C days, so both shortages and waste are minimised.') : a === 3 ? T('Екі есе көп дайындау сатылмаған өнімге ақша жұмсау деген сөз.', 'Двойной запас — это деньги на непроданный товар.', 'Doubling stock means paying for products that will not sell.') : T('Бұл шешім деректерге қайшы: жылы күні шай аз сатылады.', 'Это решение противоречит данным: в тёплые дни чай продаётся хуже.', 'This contradicts the data: tea sells poorly on warm days.')]])
      ]);
    }
  };

  /* ===== 3. Marketing specialist (4 stages) ===== */
  NK.SIMS.marketing = {
    icon: 'megaphone', mins: 7, profs: ['market', 'smm', 'entre'],
    title: T('Маркетолог', 'Маркетолог', 'Marketing specialist'),
    teaser: T('Мектеп стартапының экобөтелкесіне науқан жоспарла.', 'Спланируй кампанию для эко-бутылки школьного стартапа.', 'Plan a campaign for a school startup\'s eco bottle.'),
    intro: T('Мектеп стартапы 3500 ₸ тұратын көп рет қолданылатын су бөтелкесін шығарды. Саған 50 000 ₸ бюджет берілді: аудиторияны таңда, арнаны анықта, бюджетті бөл және нәтижені бағала.', 'Школьный стартап выпустил многоразовую бутылку за 3500 ₸. У тебя бюджет 50 000 ₸: выбери аудиторию, каналы, распредели бюджет и оцени результаты.', 'A school startup made a reusable water bottle priced at 3,500 ₸. You have a 50,000 ₸ budget: pick the audience and channels, split the budget and evaluate the results.'),
    task: T('4 кезең: аудитория → стратегия → бюджет → нәтижені бағалау.', '4 этапа: аудитория → стратегия → бюджет → оценка результатов.', '4 stages: audience → strategy → budget → evaluate results.'),
    skills: [T('Аудиторияны түсіну', 'Понимание аудитории', 'Understanding the audience'), T('Стратегиялық таңдау', 'Стратегический выбор', 'Strategic choice'), T('Бюджеттеу', 'Бюджетирование', 'Budgeting'), T('Нәтижені өлшеу', 'Измерение результата', 'Measuring results')],
    render(el, done) {
      const CH = [['vid', T('Қысқа видеолар (TikTok/Reels)', 'Короткие видео (TikTok/Reels)', 'Short videos (TikTok/Reels)'), 40, 15000], ['club', T('Спорт үйірмелерімен серіктестік', 'Партнёрство со спортивными секциями', 'Sports club partnership'), 30, 10000], ['post', T('Мектептегі постерлер', 'Постеры в школе', 'Posters at school'), 12, 5000], ['ads', T('Ақылы онлайн жарнама', 'Платная онлайн-реклама', 'Paid online ads'), 35, 30000]];
      const sales = x => Math.round(CH.reduce((s, c, k) => s + c[2] * (1 - Math.exp(-x[k] / c[3])), 0));
      let best = 0; for (let a = 0; a <= 50000; a += 5000) for (let b = 0; a + b <= 50000; b += 5000) for (let c = 0; a + b + c <= 50000; c += 5000) best = Math.max(best, sales([a, b, c, 50000 - a - b - c]));
      runStages(el, done, [
        choiceStage(T('Мақсатты аудитория', 'Целевая аудитория', 'Target audience'), T('Кімге бірінші кезекте сату керек?', 'Кому продавать в первую очередь?', 'Who should you sell to first?'),
          [T('Спортпен айналысатын, экологияға мән беретін 14–18 жастағы жасөспірімдер', 'Подростки 14–18 лет, которые занимаются спортом и заботятся об экологии', 'Teens aged 14–18 who do sport and care about ecology'), T('Барлығына бірдей', 'Всем подряд', 'Everyone equally'), T('Зейнеткерлер', 'Пенсионеры', 'Retirees'), T('6 жасқа дейінгі балалар', 'Дети до 6 лет', 'Children under 6')],
          a => (a === 0 ? 100 : a === 1 ? 30 : 10), ['reasoning'], a => [[a === 0, a === 0 ? T('Нақты аудитория хабарламаны дәл құруға мүмкіндік береді.', 'Чёткая аудитория позволяет точно построить сообщение.', 'A clear audience lets you craft a precise message.') : T('Тым кең немесе сәйкес емес аудитория бюджетті шашыратады.', 'Слишком широкая или неподходящая аудитория распыляет бюджет.', 'A broad or mismatched audience spreads the budget too thin.')]]),
        multiStage(T('Стратегия', 'Стратегия', 'Strategy'), T('Жасөспірімдерге жету үшін ең тиімді 2 арнаны таңда.', 'Выбери 2 самых эффективных канала, чтобы достучаться до подростков.', 'Pick the 2 most effective channels to reach teens.'),
          [T('Қысқа видеолар', 'Короткие видео', 'Short videos'), T('Спорт үйірмелерімен серіктестік', 'Партнёрство со спортивными секциями', 'Sports club partnership'), T('Теледидар жарнамасы', 'Реклама на ТВ', 'TV advertising'), T('Газеттегі хабарландыру', 'Объявление в газете', 'Newspaper ad'), T('Қала билборды', 'Городской билборд', 'City billboard')],
          [0, 1], ['decision'], T('Теледидар мен билборд қымбат және аудиторияға дәл жетпейді.', 'ТВ и билборд дорогие и не точно попадают в аудиторию.', 'TV and billboards are expensive and poorly targeted for this audience.')),
        { title: T('Бюджетті бөлу', 'Распределить бюджет', 'Split the budget'), mount(box, submit, locked, st) {
          st.x = st.x || [15000, 15000, 10000, 10000];
          const draw = () => {
            const left = 50000 - st.x.reduce((s, v) => s + v, 0);
            box.innerHTML = `<p class="st-q">${esc(tx(T('50 000 ₸-ны арналарға бөл. Әр арна бастапқыда тиімді, бірақ кейін әсері азаяды.', 'Распредели 50 000 ₸. Каждый канал вначале эффективен, но потом отдача снижается.', 'Split 50,000 ₸. Each channel works well at first, then returns diminish.')))}</p>
              ${CH.map((c, k) => `<label for="mk-${k}">${esc(tx(c[1]))}: <b>${st.x[k].toLocaleString('ru-RU')} ₸</b></label><input type="range" id="mk-${k}" data-k="${k}" min="0" max="50000" step="5000" value="${st.x[k]}" ${locked ? 'disabled' : ''}>`).join('')}
              <p class="${left < 0 ? 'err' : 'muted'}">${esc(tx(T('Қалдық', 'Остаток', 'Remaining')))}: <b>${left.toLocaleString('ru-RU')} ₸</b></p>
              <p class="profit ok">${esc(tx(T('Болжалды сатылым', 'Прогноз продаж', 'Forecast sales')))}: <b>${sales(st.x)}</b></p>
              <details class="formula-d"><summary>${ic('info')} ${esc(tx(T('Модель', 'Модель', 'Model')))}</summary><code>sales = Σ a·(1 − e^(−spend ÷ b)) · videos a=40 b=15000 · clubs a=30 b=10000 · posters a=12 b=5000 · ads a=35 b=30000</code></details>
              ${locked ? '' : `<button class="btn btn-lime btn-sm" data-ck ${left < 0 ? 'disabled' : ''}>${ic('check')} ${esc(tx(UI.check))}</button>`}`;
            box.querySelectorAll('input[type=range]').forEach(r => r.addEventListener('input', () => { st.x[+r.dataset.k] = +r.value; const id = r.id; draw(); const n = box.querySelector('#' + id); if (n) n.focus(); }));
            const ck = box.querySelector('[data-ck]');
            if (ck) ck.addEventListener('click', () => { const s = sales(st.x); const sc = clamp(s / best * 100); submit({ score: sc, crit: { accuracy: sc, decision: sc }, fb: [[sc >= 90, T(`Болжам: ${s} сатылым (ең жақсы бөлу — ${best}).`, `Прогноз: ${s} продаж (лучшее распределение — ${best}).`, `Forecast: ${s} sales (best split — ${best}).`)], [true, T('Бір арнаға бәрін салу тиімсіз: әсер кемиді.', 'Вкладывать всё в один канал неэффективно: отдача падает.', 'Putting everything in one channel is inefficient: returns diminish.')]] }); });
          };
          draw();
        } },
        { title: T('Нәтижені бағалау', 'Оценка результатов', 'Evaluate results'), mount(box, submit, locked, st) {
          const rows = [[T('Видеолар', 'Видео', 'Videos'), 15000, 30], [T('Үйірмелер', 'Секции', 'Clubs'), 10000, 25], [T('Постерлер', 'Постеры', 'Posters'), 5000, 4], [T('Ақылы жарнама', 'Платная реклама', 'Paid ads'), 20000, 16]];
          box.innerHTML = `<div class="tbl-wrap"><table class="dtbl"><thead><tr><th>${esc(tx(T('Арна', 'Канал', 'Channel')))}</th><th>₸</th><th>${esc(tx(T('Сатылым', 'Продажи', 'Sales')))}</th></tr></thead><tbody>${rows.map(r => `<tr><td>${esc(tx(r[0]))}</td><td>${r[1].toLocaleString('ru-RU')}</td><td>${r[2]}</td></tr>`).join('')}</tbody></table></div><div class="st-inner"></div>`;
          choiceStage(T('Нәтижені бағалау', 'Оценка результатов', 'Evaluate results'), T('Науқан аяқталды. Келесі айда бюджетті қалай өзгертесің?', 'Кампания завершилась. Как изменишь бюджет в следующем месяце?', 'The campaign is over. How do you change next month\'s budget?'),
            [T('Видео мен үйірмелерге көбірек, постер мен ақылы жарнамаға азырақ', 'Больше на видео и секции, меньше на постеры и платную рекламу', 'More to videos and clubs, less to posters and paid ads'), T('Постерлерге көбірек', 'Больше на постеры', 'More to posters'), T('Барлығын тоқтату', 'Остановить всё', 'Stop everything'), T('Барлығын ақылы жарнамаға', 'Всё в платную рекламу', 'Everything into paid ads')],
            a => (a === 0 ? 100 : 15), ['reasoning', 'decision'], a => [[a === 0, T('Бір сатылымның құны: үйірмелер 400 ₸, видео 500 ₸, постер мен жарнама 1250 ₸.', 'Стоимость одной продажи: секции 400 ₸, видео 500 ₸, постеры и реклама 1250 ₸.', 'Cost per sale: clubs 400 ₸, videos 500 ₸, posters and ads 1,250 ₸.')]]).mount(box.querySelector('.st-inner'), submit, locked, st);
        } }
      ]);
    }
  };

  /* ===== 4. Financial analyst (4 stages) ===== */
  NK.SIMS.finance = {
    icon: 'landmark', mins: 7, profs: ['fin', 'actuary', 'econ'],
    title: T('Қаржы талдаушысы', 'Финансовый аналитик', 'Financial analyst'),
    teaser: T('Клуб бюджетін талдап, ноутбук сатып алу немесе жалдау туралы шешім қабылда.', 'Проанализируй бюджет клуба и реши: купить ноутбук или взять в аренду.', 'Analyse a club budget and decide whether to buy or lease a laptop.'),
    intro: T('Мектептің дебат клубы қаржыгерге жүгінді: бюджетте артық шығын бар, ал клубқа екі жылға ноутбук керек.', 'Школьный дебатный клуб обратился к финансисту: в бюджете перерасход, а клубу нужен ноутбук на два года.', 'The school debate club asks a finance analyst for help: the budget is overspent, and the club needs a laptop for two years.'),
    task: T('4 кезең: бюджетті талдау → баламаларды салыстыру → тәуекелдерді анықтау → шешім.', '4 этапа: анализ бюджета → сравнение вариантов → риски → решение.', '4 stages: analyse the budget → compare options → identify risks → decide.'),
    skills: [T('Бюджетті талдау', 'Анализ бюджета', 'Budget analysis'), T('Есептеу', 'Расчёты', 'Calculation'), T('Тәуекелді бағалау', 'Оценка рисков', 'Risk assessment'), T('Негізделген шешім', 'Обоснованное решение', 'Justified decisions')],
    render(el, done) {
      const B = [[T('Тағам', 'Еда', 'Snacks'), 10000, 18000], [T('Басып шығару', 'Печать', 'Printing'), 8000, 7000], [T('Көлік', 'Транспорт', 'Transport'), 20000, 21000], [T('Жүлделер', 'Призы', 'Prizes'), 12000, 12000]];
      runStages(el, done, [
        { title: T('Бюджетті талдау', 'Анализ бюджета', 'Analyse the budget'), mount(box, submit, locked, st) {
          box.innerHTML = `<div class="tbl-wrap"><table class="dtbl"><thead><tr><th></th><th>${esc(tx(T('Жоспар', 'План', 'Plan')))}</th><th>${esc(tx(T('Нақты', 'Факт', 'Actual')))}</th></tr></thead><tbody>${B.map(r => `<tr><td>${esc(tx(r[0]))}</td><td>${r[1].toLocaleString('ru-RU')}</td><td>${r[2].toLocaleString('ru-RU')}</td></tr>`).join('')}</tbody></table></div><div class="st-inner"></div>`;
          choiceStage(T('Бюджетті талдау', 'Анализ бюджета', 'Analyse the budget'), T('Қай бап жоспардан ең көп асып кетті?', 'Какая статья сильнее всего превысила план?', 'Which category overspent the most?'), B.map(r => r[0]), a => (a === 0 ? 100 : a === 2 ? 30 : 10), ['accuracy'], a => [[a === 0, T('Тағам: +8 000 ₸ (+80%). Көлік тек +1 000 ₸ (+5%).', 'Еда: +8 000 ₸ (+80%). Транспорт лишь +1 000 ₸ (+5%).', 'Snacks: +8,000 ₸ (+80%). Transport is only +1,000 ₸ (+5%).')]]).mount(box.querySelector('.st-inner'), submit, locked, st);
        } },
        { title: T('Баламаларды салыстыру', 'Сравнить варианты', 'Compare options'), mount(box, submit, locked, st) {
          box.innerHTML = `<div class="kv"><span>${esc(tx(T('А: қазір сатып алу', 'А: купить сейчас', 'A: buy now')))}</span><b>240 000 ₸</b><span>${esc(tx(T('2 жылдан кейін сату бағасы', 'Продажа через 2 года', 'Resale after 2 years')))}</span><b>60 000 ₸</b><span>${esc(tx(T('Б: жалдау, айына', 'Б: аренда в месяц', 'B: lease per month')))}</span><b>9 000 ₸ × 24</b></div>
            <label class="st-q" for="fn-c">${esc(tx(T('24 айда қай нұсқа арзан?', 'Какой вариант дешевле за 24 месяца?', 'Which option is cheaper over 24 months?')))}</label>
            <div class="seg">${['A', 'B'].map(v => `<button data-v="${v}" class="${st.ch === v ? 'on' : ''}" ${locked ? 'disabled' : ''}>${v}</button>`).join('')}</div>
            <label class="st-q" for="fn-d">${esc(tx(T('Айырмашылық қанша теңге?', 'На сколько тенге?', 'By how many tenge?')))}</label><input id="fn-d" type="number" inputmode="numeric" value="${st.diff != null ? st.diff : ''}" ${locked ? 'disabled' : ''}>
            ${locked ? '' : `<button class="btn btn-lime btn-sm" data-ck>${ic('check')} ${esc(tx(UI.check))}</button>`}`;
          box.querySelectorAll('[data-v]').forEach(b => b.addEventListener('click', () => { st.ch = b.dataset.v; st.diff = box.querySelector('#fn-d').value; submit && box.querySelectorAll('[data-v]').forEach(x => x.classList.toggle('on', x === b)); }));
          const ck = box.querySelector('[data-ck]');
          if (ck) ck.addEventListener('click', () => {
            const d = parseFloat(box.querySelector('#fn-d').value); st.diff = isNaN(d) ? '' : d;
            const okC = st.ch === 'A', okD = Math.abs(d - 36000) <= 500;
            const sc = (okC ? 50 : 0) + (okD ? 50 : 0);
            submit({ score: sc, crit: { accuracy: sc, reasoning: okC ? 100 : 0 }, fb: [[okC, T('А арзан: 240 000 − 60 000 = 180 000 ₸; Б: 9 000 × 24 = 216 000 ₸.', 'А дешевле: 240 000 − 60 000 = 180 000 ₸; Б: 9 000 × 24 = 216 000 ₸.', 'A is cheaper: 240,000 − 60,000 = 180,000 ₸; B: 9,000 × 24 = 216,000 ₸.')], [okD, T('Айырмашылық: 36 000 ₸.', 'Разница: 36 000 ₸.', 'Difference: 36,000 ₸.')]] });
          });
        } },
        multiStage(T('Тәуекелдер', 'Риски', 'Risks'), T('А нұсқасының (сатып алу) тәуекелдерін белгіле.', 'Отметь риски варианта А (покупка).', 'Mark the risks of option A (buying).'),
          [T('Ноутбук бұзылып, жөндеу қажет болуы мүмкін', 'Ноутбук может сломаться и потребовать ремонта', 'The laptop may break and need repairs'), T('Сату бағасы күтілгеннен төмен болуы мүмкін', 'Цена перепродажи может оказаться ниже', 'Resale price may be lower than expected'), T('Қазір көп ақша бір затқа байланып қалады', 'Сейчас много денег «замораживается» в одной вещи', 'A lot of cash is tied up now'), T('Жалдау компаниясы банкрот болуы мүмкін', 'Арендная компания может обанкротиться', 'The leasing company may go bankrupt'), T('Ауа райы өзгеруі мүмкін', 'Может измениться погода', 'The weather may change')],
          [0, 1, 2], ['reasoning'], T('4-нұсқа Б-ға қатысты, ал 5-нұсқа шешімге әсер етпейді.', 'Вариант 4 относится к Б, а 5 не влияет на решение.', 'Option 4 relates to B, and option 5 is irrelevant.')),
        choiceStage(T('Шешім', 'Решение', 'Decision'), T('Клубқа соңғы ұсынысың?', 'Твоя итоговая рекомендация клубу?', 'Your final recommendation to the club?'),
          [T('Сатып алу, бірақ үнемделген ақшадан 20 000 ₸ жөндеу қорын қалдыру', 'Купить, но оставить 20 000 ₸ сэкономленных денег на ремонт', 'Buy, but keep 20,000 ₸ of the savings as a repair reserve'), T('Жалдау, өйткені ай сайынғы төлем аз көрінеді', 'Аренда, потому что ежемесячный платёж кажется меньше', 'Lease, because the monthly payment looks smaller'), T('Тексермей ең арзан қолданылған ноутбукты алу', 'Купить самый дешёвый б/у ноутбук без проверки', 'Buy the cheapest used laptop without checking it'), T('Шешімді кейінге қалдыру', 'Отложить решение', 'Postpone the decision')],
          a => [100, 40, 20, 50][a], ['decision'], a => [[a === 0, [T('Есепке және тәуекелге негізделген шешім: үнем + қорғаныс.', 'Решение опирается на расчёт и риски: экономия + подстраховка.', 'A decision based on numbers and risk: savings plus a safety net.'), T('Ай сайынғы аз төлем жалпы құнның жоғары екенін жасырады (+36 000 ₸).', 'Небольшой ежемесячный платёж скрывает более высокую итоговую стоимость (+36 000 ₸).', 'A small monthly payment hides a higher total cost (+36,000 ₸).'), T('Тексерілмеген арзан зат жасырын шығынға әкелуі мүмкін.', 'Непроверенная дешёвая вещь может привести к скрытым расходам.', 'An unchecked cheap item can lead to hidden costs.'), T('Кейінге қалдыру клубты ноутбуксыз қалдырады; бұл да шығын.', 'Отсрочка оставляет клуб без ноутбука — это тоже потери.', 'Postponing leaves the club without a laptop, which also has a cost.')][a]]])
      ]);
    }
  };

  /* ===== 5. Architect (3 stages) ===== */
  NK.SIMS.architect = {
    icon: 'drafting-compass', mins: 6, profs: ['archi', 'urban', 'civeng'],
    title: T('Сәулетші', 'Архитектор', 'Architect'),
    teaser: T('Шектеулермен шағын кітапхана жоспарын жаса.', 'Спланируй небольшую библиотеку с ограничениями.', 'Plan a small library within constraints.'),
    intro: T('Ауылдық мектепке шағын кітапхана салынады. Сәулетші ретінде күн жағын, бөлмелердің орналасуын және қолжетімділікті ескеруің керек.', 'Для сельской школы строят небольшую библиотеку. Как архитектор, учти стороны света, расположение помещений и доступность.', 'A small library is being built for a village school. As the architect you must consider orientation, room layout and accessibility.'),
    task: T('3 кезең: бағдарлау → жоспар → қолжетімділік.', '3 этапа: ориентация → планировка → доступность.', '3 stages: orientation → layout → accessibility.'),
    skills: [T('Кеңістіктік ойлау', 'Пространственное мышление', 'Spatial thinking'), T('Шектеулермен жұмыс', 'Работа с ограничениями', 'Working with constraints'), T('Адамға бағытталған дизайн', 'Дизайн для людей', 'Human-centred design')],
    render(el, done) {
      const ROOMS = [['read', T('Оқу залы', 'Читальный зал', 'Reading hall')], ['lab', T('Компьютер сыныбы', 'Компьютерный класс', 'Computer room')], ['music', T('Музыка бөлмесі', 'Музыкальная комната', 'Music room')], ['entry', T('Кіреберіс', 'Вход', 'Entrance')], ['wc', T('Дәретхана', 'Туалет', 'Toilet')], ['store', T('Қойма', 'Склад', 'Storage')]];
      runStages(el, done, [
        choiceStage(T('Бағдарлау', 'Ориентация', 'Orientation'), T('Оқу залының негізгі терезелері қай жаққа қарағаны дұрыс? (Қазақстан, солтүстік жарты шар)', 'Куда лучше направить основные окна читального зала? (Казахстан, северное полушарие)', 'Which way should the reading hall\'s main windows face? (Kazakhstan, northern hemisphere)'),
          [T('Оңтүстік', 'Юг', 'South'), T('Солтүстік', 'Север', 'North'), T('Шығыс', 'Восток', 'East'), T('Батыс', 'Запад', 'West')],
          a => [100, 60, 60, 30][a], ['reasoning'], a => [[a === 0, [T('Оңтүстік: қыста күн жылуы мен жарығы көп, ал жазда шатырмен көлеңкелеуге болады.', 'Юг: зимой больше солнца и тепла, а летом окна легко затенить козырьком.', 'South: more winter sun and warmth, and easy to shade with an overhang in summer.'), T('Солтүстік жарығы біркелкі (студияларға жақсы), бірақ қыста суық.', 'Северный свет ровный (хорош для студий), но зимой холоднее.', 'North light is even (good for studios) but colder in winter.'), T('Шығыс таңертең ғана жарық береді.', 'Восток даёт свет только утром.', 'East only gets morning light.'), T('Батыс жазда кешке қатты қызады — оқуға ыңғайсыз.', 'Запад летом сильно перегревается вечером — неудобно читать.', 'West overheats on summer evenings — uncomfortable for reading.')][a]]]),
        { title: T('Жоспар', 'Планировка', 'Layout'), mount(box, submit, locked, st) {
          st.grid = st.grid || [null, null, null, null, null, null]; st.sel = st.sel || null;
          const pos = k => [Math.floor(k / 3), k % 3];
          const adj = (a, b) => { const [r1, c1] = pos(a), [r2, c2] = pos(b); return Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1; };
          const where = id => st.grid.indexOf(id);
          const rules = () => {
            const R = where('read'), L = where('lab'), M = where('music'), E = where('entry'), W = where('wc');
            return [
              [R >= 0 && R < 3, T('Оқу залы оңтүстікте (жоғарғы қатар)', 'Читальный зал на юге (верхний ряд)', 'Reading hall on the south side (top row)')],
              [E >= 3, T('Кіреберіс көше жағында (төменгі қатар)', 'Вход со стороны улицы (нижний ряд)', 'Entrance on the street side (bottom row)')],
              [R >= 0 && M >= 0 && !adj(R, M), T('Музыка бөлмесі оқу залымен көршілес емес (шу)', 'Музыкальная комната не рядом с читальным залом (шум)', 'Music room not next to the reading hall (noise)')],
              [W >= 0 && E >= 0 && adj(W, E), T('Дәретхана кіреберіске жақын', 'Туалет рядом со входом', 'Toilet next to the entrance')],
              [L >= 0 && R >= 0 && adj(L, R), T('Компьютер сыныбы оқу залымен көршілес', 'Компьютерный класс рядом с читальным залом', 'Computer room next to the reading hall')]
            ];
          };
          const draw = () => {
            box.innerHTML = `<p class="st-q">${esc(tx(T('Бөлмені таңдап, тордағы ұяшыққа орналастыр. Жоғарғы қатар — оңтүстік, төменгі қатар — көше.', 'Выбери помещение и поставь его в клетку. Верхний ряд — юг, нижний — улица.', 'Pick a room and place it in a cell. Top row = south, bottom row = street.')))}</p>
              <div class="rooms">${ROOMS.map(([id, n]) => `<button class="cchip ${st.sel === id ? 'on' : ''} ${where(id) >= 0 ? 'placed' : ''}" data-r="${id}" ${locked ? 'disabled' : ''}>${esc(tx(n))}</button>`).join('')}</div>
              <div class="plan"><span class="plan-n">${esc(tx(T('Оңтүстік ☀', 'Юг ☀', 'South ☀')))}</span><div class="plan-g">${st.grid.map((id, k) => `<button class="pcell ${id ? 'full' : ''}" data-cell="${k}" ${locked ? 'disabled' : ''}>${id ? esc(tx(ROOMS.find(r => r[0] === id)[1])) : '+'}</button>`).join('')}</div><span class="plan-n">${esc(tx(T('Көше', 'Улица', 'Street')))}</span></div>
              <ul class="hcheck">${rules().map(r => `<li class="${r[0] ? 'ok' : ''}">${ic(r[0] ? 'check-circle-2' : 'circle-dot')} ${esc(tx(r[1]))}</li>`).join('')}</ul>
              ${locked ? '' : `<button class="btn btn-lime btn-sm" data-ck ${st.grid.filter(Boolean).length < 6 ? 'disabled' : ''}>${ic('check')} ${esc(tx(UI.check))}</button>`}`;
            box.querySelectorAll('[data-r]').forEach(b => b.addEventListener('click', () => { st.sel = b.dataset.r; draw(); }));
            box.querySelectorAll('[data-cell]').forEach(b => b.addEventListener('click', () => {
              const k = +b.dataset.cell;
              if (st.sel) { const old = where(st.sel); if (old >= 0) st.grid[old] = null; st.grid[k] = st.sel; st.sel = null; } else st.grid[k] = null;
              draw();
            }));
            const ck = box.querySelector('[data-ck]');
            if (ck) ck.addEventListener('click', () => { const r = rules(); const ok = r.filter(x => x[0]).length; const sc = clamp(ok / r.length * 100); submit({ score: sc, crit: { creativity: sc, accuracy: sc }, fb: r.map(x => [x[0], x[1]]) }); });
          };
          draw();
        } },
        multiStage(T('Қолжетімділік', 'Доступность', 'Accessibility'), T('Мүгедектер арбасын пайдаланатын оқушыларға не қажет?', 'Что нужно ученикам, использующим инвалидную коляску?', 'What do students who use wheelchairs need?'),
          [T('Кіреберістегі пандус', 'Пандус у входа', 'A ramp at the entrance'), T('Ені кемінде 90 см есіктер', 'Двери шириной не менее 90 см', 'Doors at least 90 cm wide'), T('Кіреберіске жақын қолжетімді дәретхана', 'Доступный туалет у входа', 'An accessible toilet near the entrance'), T('Кіреберістегі сәндік баспалдақтар', 'Декоративные ступени у входа', 'Decorative steps at the entrance'), T('Ені 70 см дәліз', 'Коридор шириной 70 см', 'A 70 cm-wide corridor')],
          [0, 1, 2], ['reasoning'], T('Қолжетімді орта — сәулетшінің кәсіби жауапкершілігі.', 'Доступная среда — профессиональная ответственность архитектора.', 'Accessible design is part of an architect\'s professional responsibility.'))
      ]);
    }
  };

  /* ===== 6. Journalist / researcher (4 stages) ===== */
  NK.SIMS.journal = {
    icon: 'newspaper', mins: 7, profs: ['journ', 'smm', 'pr'],
    title: T('Журналист / зерттеуші', 'Журналист / исследователь', 'Journalist / researcher'),
    teaser: T('Дереккөздерді салыстыр, дәлелсіз тұжырымды тап және адал материал жаз.', 'Сравни источники, найди необоснованное утверждение и напиши честный материал.', 'Compare sources, spot an unsupported claim and write an honest story.'),
    intro: T('Қалада жаңа саябақ ашылды. Редакцияға әртүрлі ақпарат келді. Журналистің басты құралы — тексерілген факт.', 'В городе открылся новый парк. В редакцию пришла разная информация. Главный инструмент журналиста — проверенный факт.', 'A new park has opened in the city. The newsroom has received mixed information. A journalist\'s main tool is the verified fact.'),
    task: T('4 кезең: дереккөздер → дәлелсіз тұжырым → тақырып → қорытынды.', '4 этапа: источники → необоснованное утверждение → заголовок → вывод.', '4 stages: sources → unsupported claim → headline → conclusion.'),
    skills: [T('Фактчекинг', 'Фактчекинг', 'Fact-checking'), T('Дәлелді бағалау', 'Оценка доказательств', 'Evaluating evidence'), T('Қысқа әрі нақты жазу', 'Кратко и точно писать', 'Clear, concise writing'), T('Медиа этика', 'Медиаэтика', 'Media ethics')],
    render(el, done) {
      const F = [
        [T('Саябақтың ауданы — 12 гектар.', 'Площадь парка — 12 гектаров.', 'The park covers 12 hectares.'), T('Әкімдіктің ресми хабарламасы', 'Официальное сообщение акимата', 'Official city press release'), true],
        [T('Саябақта 500 ағаш отырғызылды.', 'В парке посадили 500 деревьев.', '500 trees were planted.'), T('Әкімдік + сенің фототілшің', 'Акимат + твой фотокорреспондент', 'City release + your photographer'), true],
        [T('Ашылу сенбі күні 11:00-де өтті.', 'Открытие прошло в субботу в 11:00.', 'The opening took place on Saturday at 11:00.'), T('Тілшің оқиға орнында болды', 'Твой корреспондент был на месте', 'Your reporter was there'), true],
        [T('Құрылысқа 2 млрд теңге жұмсалған.', 'На стройку потратили 2 млрд тенге.', 'Construction cost 2 billion tenge.'), T('Анонимді Telegram-пост', 'Анонимный Telegram-пост', 'Anonymous Telegram post'), false],
        [T('Саябақ келесі аптада жабылады.', 'Парк закроют на следующей неделе.', 'The park will close next week.'), T('Дереккөзсіз пікір', 'Комментарий без источника', 'Comment with no source'), false]
      ];
      const BAIT = ['шок', 'сенсация', 'сенбейсің', 'шок!', 'сенсац', 'не поверите', 'shock', 'you won\'t believe', '!!!'];
      runStages(el, done, [
        { title: T('Дереккөздер', 'Источники', 'Sources'), mount(box, submit, locked, st) {
          st.m = st.m || {};
          const draw = () => {
            box.innerHTML = `<p class="st-q">${esc(tx(T('Әр ақпаратты бағала.', 'Оцени каждую информацию.', 'Assess each item.')))}</p><div class="facts">${F.map((f, k) => `<div class="fact"><div><b>${esc(tx(f[0]))}</b><small>${ic('info')} ${esc(tx(f[1]))}</small></div><div class="seg">${[['y', T('Жариялауға болады', 'Можно публиковать', 'Publishable')], ['n', T('Тексеру керек', 'Нужно проверить', 'Needs checking')]].map(([v, l]) => `<button data-i="${k}" data-v="${v}" class="${st.m[k] === v ? 'on' : ''}" ${locked ? 'disabled' : ''}>${esc(tx(l))}</button>`).join('')}</div></div>`).join('')}</div>
              ${locked ? '' : `<button class="btn btn-lime btn-sm" data-ck ${Object.keys(st.m).length < F.length ? 'disabled' : ''}>${ic('check')} ${esc(tx(UI.check))}</button>`}`;
            box.querySelectorAll('[data-i]').forEach(b => b.addEventListener('click', () => { st.m[b.dataset.i] = b.dataset.v; draw(); }));
            const ck = box.querySelector('[data-ck]');
            if (ck) ck.addEventListener('click', () => { const right = F.filter((f, k) => (st.m[k] === 'y') === f[2]).length; const sc = clamp(right / F.length * 100); submit({ score: sc, crit: { accuracy: sc }, fb: [[right === F.length, T(`Дұрыс: ${right}/${F.length}. Анонимді пост пен дереккөзсіз пікірді тексеру керек.`, `Верно: ${right}/${F.length}. Анонимный пост и комментарий без источника нужно проверять.`, `Correct: ${right}/${F.length}. The anonymous post and the unsourced comment need checking.`)]] }); });
          };
          draw();
        } },
        choiceStage(T('Дәлелсіз тұжырым', 'Необоснованное утверждение', 'Unsupported claim'), T('Блогердің постындағы қай сөйлем дәлелсіз?', 'Какое предложение в посте блогера не подкреплено доказательствами?', 'Which sentence in a blogger\'s post is unsupported?'),
          [T('«Саябақта 500 ағаш отырғызылды».', '«В парке посадили 500 деревьев».', '"500 trees were planted in the park."'), T('«Бұл ағаштар қаладағы ауаны 50%-ға тазартады».', '«Эти деревья очистят воздух в городе на 50%».', '"These trees will clean the city\'s air by 50%."'), T('«Ашылуға жүздеген адам келді».', '«На открытие пришли сотни людей».', '"Hundreds of people came to the opening."')],
          a => (a === 1 ? 100 : 10), ['reasoning', 'accuracy'], a => [[a === 1, T('«50%» — дереккөзі мен өлшеу әдісі жоқ нақты сан. Мұндай тұжырымды сарапшыдан тексеру керек.', '«50%» — точная цифра без источника и метода измерения. Такое утверждение нужно проверить у эксперта.', '"50%" is a precise number with no source or measurement method. Such a claim must be checked with an expert.')]]),
        { title: T('Тақырып', 'Заголовок', 'Headline'), mount(box, submit, locked, st) {
          st.h = st.h || '';
          const checks = () => { const h = st.h.trim().toLowerCase(); return [
            [h.length >= 30 && h.length <= 80, T(`Ұзындығы: ${st.h.trim().length} (30–80)`, `Длина: ${st.h.trim().length} (30–80)`, `Length: ${st.h.trim().length} (30–80)`)],
            [/саябақ|парк|park/.test(h), T('Негізгі факт бар (саябақ)', 'Есть главный факт (парк)', 'Contains the key fact (park)')],
            [!BAIT.some(b => h.includes(b)), T('Кликбейт жоқ', 'Нет кликбейта', 'No clickbait')],
            [!/млрд|billion|жабыл|закро|close/.test(h), T('Тексерілмеген ақпарат жоқ', 'Нет непроверенной информации', 'No unverified claims')]
          ]; };
          const draw = () => {
            box.innerHTML = `<label class="st-q" for="jr-h">${esc(tx(T('Жаңалыққа тақырып жаз.', 'Напиши заголовок новости.', 'Write the news headline.')))}</label><input id="jr-h" maxlength="120" value="${esc(st.h)}" ${locked ? 'disabled' : ''} placeholder="${esc(tx(T('Мысалы: Қалада 12 гектарлық жаңа саябақ ашылды', 'Например: В городе открылся новый парк площадью 12 га', 'E.g. A new 12-hectare park opens in the city')))}">
              <ul class="hcheck">${checks().map(c => `<li class="${c[0] ? 'ok' : ''}">${ic(c[0] ? 'check-circle-2' : 'circle-dot')} ${esc(tx(c[1]))}</li>`).join('')}</ul>
              ${locked ? '' : `<button class="btn btn-lime btn-sm" data-ck ${st.h.trim() ? '' : 'disabled'}>${ic('check')} ${esc(tx(UI.check))}</button>`}`;
            const inp = box.querySelector('#jr-h');
            inp.addEventListener('input', () => { st.h = inp.value; box.querySelector('.hcheck').innerHTML = checks().map(c => `<li class="${c[0] ? 'ok' : ''}">${ic(c[0] ? 'check-circle-2' : 'circle-dot')} ${esc(tx(c[1]))}</li>`).join(''); const b = box.querySelector('[data-ck]'); if (b) b.disabled = !st.h.trim(); });
            const ck = box.querySelector('[data-ck]');
            if (ck) ck.addEventListener('click', () => { const c = checks(); const sc = clamp(c.filter(x => x[0]).length / c.length * 100); submit({ score: sc, crit: { creativity: sc }, fb: c }); });
          };
          draw();
        } },
        choiceStage(T('Қорытынды', 'Вывод', 'Conclusion'), T('Материалдың қай қорытындысы ең адал?', 'Какой вывод материала самый честный?', 'Which conclusion is the most honest?'),
          [T('Қалада 12 гектарлық саябақ ашылып, 500 ағаш отырғызылды. Құрылыс құны расталмаған — редакция әкімдіктен түсініктеме сұрады.', 'В городе открылся парк на 12 га, посажено 500 деревьев. Стоимость стройки не подтверждена — редакция запросила комментарий акимата.', 'A 12-hectare park opened with 500 new trees. The construction cost is unconfirmed — we have asked the city for comment.'), T('ШОК! 2 млрд теңгеге салынған саябақ келесі аптада жабылады!', 'ШОК! Парк за 2 млрд закроют на следующей неделе!', 'SHOCK! 2-billion-tenge park to close next week!'), T('Саябақ 2 млрд теңге тұрады және ауаны 50%-ға тазартады.', 'Парк стоил 2 млрд тенге и очистит воздух на 50%.', 'The park cost 2 billion tenge and will clean the air by 50%.'), T('Менің ойымша, саябақ әдемі емес.', 'По-моему, парк некрасивый.', 'In my opinion, the park is ugly.')],
          a => [100, 0, 20, 30][a], ['reasoning'], a => [[a === 0, [T('Фактілер мен расталмаған ақпаратты ажыраттың.', 'Ты разделил факты и неподтверждённое.', 'You separated facts from unconfirmed information.'), T('Кликбейт және тексерілмеген ақпарат — аудиторияның сенімін жоғалтады.', 'Кликбейт и непроверенное — потеря доверия аудитории.', 'Clickbait and unverified claims lose the audience\'s trust.'), T('Тексерілмеген тұжырымдар факт ретінде берілді.', 'Непроверенное подано как факт.', 'Unverified claims are presented as facts.'), T('Жаңалықта жеке пікір орынсыз.', 'Личное мнение неуместно в новости.', 'Personal opinion does not belong in a news report.')][a]]])
      ]);
    }
  };

  /* ===== 7. Designer (poster) ===== */
  NK.SIMS.design = {
    icon: 'palette', mins: 5, profs: ['graphic', 'ux', 'prodes'],
    title: T('Дизайнер', 'Дизайнер', 'Designer'),
    teaser: T('Мектеп фестиваліне постер құрастыр.', 'Собери постер для школьного фестиваля.', 'Compose a poster for a school festival.'),
    intro: T('Дизайнер әдемі суреттен бөлек, ақпаратты оқуға жеңіл етеді: контраст, иерархия, түс үйлесімі, теңестіру.', 'Дизайнер не только делает красиво, но и делает информацию читаемой: контраст, иерархия, цвет, выравнивание.', 'A designer makes information readable as well as beautiful: contrast, hierarchy, colour and alignment.'),
    task: T('Фонды, мәтін түсін, акцентті, орналасуды және тақырып өлшемін таңда. Содан кейін «Тексеру» бас — постер дизайн ережелері бойынша бағаланады.', 'Выбери фон, цвет текста, акцент, композицию и размер заголовка. Затем нажми «Проверить» — постер оценят по правилам дизайна.', 'Choose the background, text colour, accent, layout and headline size, then press Check — the poster is scored against design rules.'),
    skills: [T('Композиция', 'Композиция', 'Composition'), T('Түс және контраст', 'Цвет и контраст', 'Colour and contrast'), T('Типографиялық иерархия', 'Типографическая иерархия', 'Typographic hierarchy')],
    render(el, done) {
      const BG = ['#111426', '#F4F3F9', '#8B70F5', '#C4F36B', '#E8E3D3', '#1F6F5C'], FG = ['#FFFFFF', '#222333', '#C4F36B', '#8B70F5'], AC = ['none', '#FF7A59', '#C4F36B', '#8B70F5', '#7DD3FC'];
      const st = { bg: BG[1], fg: FG[2], ac: AC[0], lay: 'split', size: 20, shape: 'circle', title: tx(T('Мектептегі ең үлкен робототехника фестивалі — барлығы келіңдер', 'Самый большой фестиваль робототехники в школе — приходите все', 'The biggest school robotics festival ever — everyone come along')) };
      let res = '';
      const lum = hex => { const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4))); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
      const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
      const sw = (arr, key) => arr.map(c => `<button class="sw ${st[key] === c ? 'on' : ''}" data-k="${key}" data-v="${c}" style="background:${c === 'none' ? 'transparent' : c}" aria-label="${c}" aria-pressed="${st[key] === c}">${c === 'none' ? ic('x') : ''}</button>`).join('');
      const L2 = { title: T('Тақырып', 'Заголовок', 'Headline'), bg: T('Фон', 'Фон', 'Background'), fg: T('Мәтін түсі', 'Цвет текста', 'Text colour'), ac: T('Акцент түсі', 'Цвет акцента', 'Accent colour'), shape: T('Акцент пішіні', 'Форма акцента', 'Accent shape'), lay: T('Орналасу', 'Композиция', 'Layout'), size: T('Тақырып өлшемі', 'Размер заголовка', 'Headline size') };
      const SH = { circle: T('Шеңбер', 'Круг', 'Circle'), stripe: T('Жолақ', 'Полоса', 'Stripe'), none: T('Жоқ', 'Нет', 'None') }, LY = { left: T('Сол жақ', 'Слева', 'Left'), center: T('Орталық', 'По центру', 'Centre'), split: T('Бөлінген', 'Раздельно', 'Split') };
      function draw() {
        const shape = st.ac === 'none' || st.shape === 'none' ? '' : st.shape === 'circle' ? `<i class="pz-circle" style="background:${st.ac}"></i>` : `<i class="pz-stripe" style="background:${st.ac}"></i>`;
        el.innerHTML = `<div class="sim-2col"><div class="poster lay-${st.lay}" style="background:${st.bg};color:${st.fg}">${shape}<div class="pz-txt"><small style="color:${st.ac === 'none' ? st.fg : st.ac}">15.12 · 14:00</small><h2 style="font-size:${st.size}px">${esc(st.title)}</h2><p>${esc(tx(T('Мектеп акт залы · Кіру тегін', 'Актовый зал школы · Вход свободный', 'School hall · Free entry')))}</p></div></div>
          <div class="card pz-ctrl"><label for="pz-title">${esc(tx(L2.title))}</label><input id="pz-title" maxlength="60" value="${esc(st.title)}">
          <label>${esc(tx(L2.bg))}</label><div class="sws">${sw(BG, 'bg')}</div><label>${esc(tx(L2.fg))}</label><div class="sws">${sw(FG, 'fg')}</div><label>${esc(tx(L2.ac))}</label><div class="sws">${sw(AC, 'ac')}</div>
          <label>${esc(tx(L2.shape))}</label><div class="seg">${Object.keys(SH).map(s => `<button data-k="shape" data-v="${s}" class="${st.shape === s ? 'on' : ''}">${esc(tx(SH[s]))}</button>`).join('')}</div>
          <label>${esc(tx(L2.lay))}</label><div class="seg">${Object.keys(LY).map(s => `<button data-k="lay" data-v="${s}" class="${st.lay === s ? 'on' : ''}">${esc(tx(LY[s]))}</button>`).join('')}</div>
          <label for="pz-size">${esc(tx(L2.size))}: ${st.size}px</label><input id="pz-size" type="range" min="14" max="56" value="${st.size}">
          <button class="btn btn-lime btn-sm" data-check>${ic('check')} ${esc(tx(UI.check))}</button></div></div>${res}`;
      }
      el.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.k) { st[b.dataset.k] = b.dataset.v; res = ''; draw(); } if ('check' in b.dataset) check(); });
      el.addEventListener('input', e => {
        if (e.target.id === 'pz-size') { st.size = +e.target.value; el.querySelector('.poster h2').style.fontSize = st.size + 'px'; el.querySelector('label[for="pz-size"]').textContent = tx(L2.size) + ': ' + st.size + 'px'; }
        if (e.target.id === 'pz-title') { st.title = e.target.value; el.querySelector('.poster h2').textContent = st.title; }
      });
      function check() {
        const cr = contrast(st.bg, st.fg), ratio = st.size / 14, len = st.title.trim().length;
        const acOk = st.ac !== 'none' && st.shape !== 'none' && st.ac.toLowerCase() !== st.bg.toLowerCase() && st.ac.toLowerCase() !== st.fg.toLowerCase();
        const s = (cr >= 4.5 ? 30 : cr >= 3 ? 15 : 0) + (ratio >= 2 ? 25 : ratio >= 1.5 ? 10 : 0) + (len > 0 && len <= 40 ? 15 : 0) + (acOk ? 15 : 0) + (st.lay === 'split' ? 8 : 15);
        res = resultBox(s, [
          [cr >= 4.5, T(`Контраст: ${cr.toFixed(1)}:1 (≥ 4.5:1 болуы керек)`, `Контраст: ${cr.toFixed(1)}:1 (нужно ≥ 4.5:1)`, `Contrast: ${cr.toFixed(1)}:1 (aim for ≥ 4.5:1)`)],
          [ratio >= 2, T(`Иерархия: тақырып мәтіннен ${ratio.toFixed(1)} есе үлкен (≥ 2)`, `Иерархия: заголовок больше текста в ${ratio.toFixed(1)} раза (≥ 2)`, `Hierarchy: headline is ${ratio.toFixed(1)}× the body text (≥ 2)`)],
          [len > 0 && len <= 40, T(`Тақырып: ${len} таңба (≤ 40)`, `Заголовок: ${len} символов (≤ 40)`, `Headline: ${len} characters (≤ 40)`)],
          [acOk, T('Акцент назар аудартады', 'Акцент привлекает внимание', 'The accent draws attention')],
          [st.lay !== 'split', T('Біртұтас теңестіру', 'Единое выравнивание', 'Consistent alignment')]
        ]);
        done(s, { creativity: s, accuracy: Math.round(Math.min(100, cr / 4.5 * 100)) }); draw();
      }
      draw();
    }
  };

  /* ===== 8. Economist (café budget) ===== */
  NK.SIMS.econ = {
    icon: 'line-chart', mins: 6, profs: ['econ', 'fin', 'entre'],
    title: T('Экономист', 'Экономист', 'Economist'),
    teaser: T('Мектеп кафесінің бюджетін бөліп, пайданы есепте.', 'Распредели бюджет школьного кафе и посчитай прибыль.', 'Split a school café budget and calculate profit.'),
    intro: T('Экономист шектеулі ресурсты қалай бөлу керегін талдайды. Көп жарнама немесе көп өнім әрқашан тиімді бола бермейді.', 'Экономист анализирует, как распределить ограниченные ресурсы. Больше рекламы или товара — не всегда выгоднее.', 'An economist works out how to allocate limited resources. More advertising or more stock is not always better.'),
    task: T('Бір күнге 100 000 ₸ бюджет. Азық-түлікке, жарнамаға және жабдыққа бөліп, пайданы көбейт. Формулалар ашық.', 'Бюджет 100 000 ₸ на день. Распредели на продукты, рекламу и оборудование и максимизируй прибыль. Формулы открыты.', 'A 100,000 ₸ budget for one day. Split it between ingredients, advertising and equipment to maximise profit. The formulas are shown.'),
    skills: [T('Бюджеттеу', 'Бюджетирование', 'Budgeting'), T('Шекті талдау', 'Предельный анализ', 'Marginal analysis'), T('Деректермен шешім', 'Решения на данных', 'Data-based decisions')],
    render(el, done) {
      const BUDGET = 100000, PRICE = 900, COST = 300; const st = { ing: 40000, ad: 20000, eq: 10000 }; let res = '';
      const model = s => { const capacity = Math.floor(s.ing / COST), demand = Math.round(80 + 180 * (1 - Math.exp(-s.ad / 25000))), speed = s.eq >= 25000 ? 260 : s.eq >= 10000 ? 180 : 100, sold = Math.min(capacity, demand, speed), revenue = sold * PRICE, costs = s.ing + s.ad + s.eq; return { capacity, demand, speed, sold, revenue, costs, profit: revenue - costs, waste: (capacity - sold) * COST }; };
      let best = -Infinity; for (let ing = 0; ing <= BUDGET; ing += 1000) for (let ad = 0; ad + ing <= BUDGET; ad += 1000) for (const eq of [0, 10000, 25000]) if (ing + ad + eq <= BUDGET) best = Math.max(best, model({ ing, ad, eq }).profit);
      const fmt = n => n.toLocaleString('ru-RU') + ' ₸';
      const LB = { ing: T('Азық-түлік', 'Продукты', 'Ingredients'), ad: T('Жарнама', 'Реклама', 'Advertising'), eq: T('Жабдық жалдау', 'Аренда оборудования', 'Equipment rental') };
      function draw() {
        const m = model(st), left = BUDGET - st.ing - st.ad - st.eq, maxv = Math.max(m.revenue, m.costs, 1);
        el.innerHTML = `<div class="sim-2col"><div class="card">${[['ing', 'package'], ['ad', 'megaphone'], ['eq', 'cog']].map(([k, i]) => `<label for="ec-${k}">${ic(i)} ${esc(tx(LB[k]))}: <b>${fmt(st[k])}</b></label><input type="range" id="ec-${k}" data-k="${k}" min="0" max="${BUDGET}" step="1000" value="${st[k]}">`).join('')}
          <p class="${left < 0 ? 'err' : 'muted'}">${esc(tx(T('Қалған бюджет', 'Остаток бюджета', 'Remaining budget')))}: <b>${fmt(left)}</b></p>
          <details class="formula-d"><summary>${ic('info')} ${esc(tx(T('Модель формулалары', 'Формулы модели', 'Model formulas')))}</summary><code>price = ${PRICE} ₸, cost/portion = ${COST} ₸</code><code>portions = ingredients ÷ ${COST}</code><code>demand = 80 + 180 × (1 − e^(−ads ÷ 25 000))</code><code>speed: equipment &lt;10 000 → 100; ≥10 000 → 180; ≥25 000 → 260</code><code>sold = min(portions, demand, speed)</code></details>
          <button class="btn btn-lime btn-sm" data-check ${left < 0 ? 'disabled' : ''}>${ic('check')} ${esc(tx(UI.check))}</button></div>
          <div class="card"><h4>${ic('bar-chart-3')} ${esc(tx(T('Күн қорытындысы', 'Итоги дня', 'Day summary')))}</h4>
          <div class="kv"><span>${esc(tx(T('Дайын порция', 'Порций готово', 'Portions ready')))}</span><b>${m.capacity}</b><span>${esc(tx(T('Сұраныс', 'Спрос', 'Demand')))}</span><b>${m.demand}</b><span>${esc(tx(T('Қызмет жылдамдығы', 'Скорость обслуживания', 'Service capacity')))}</span><b>${m.speed}</b><span>${esc(tx(T('Сатылды', 'Продано', 'Sold')))}</span><b>${m.sold}</b><span>${esc(tx(T('Ысырап', 'Потери', 'Waste')))}</span><b>${fmt(m.waste)}</b></div>
          <div class="eco-bars"><div><span>${esc(tx(T('Түсім', 'Выручка', 'Revenue')))}</span><i style="--w:${m.revenue / maxv * 100}%" class="pos"></i><b>${fmt(m.revenue)}</b></div><div><span>${esc(tx(T('Шығын', 'Расходы', 'Costs')))}</span><i style="--w:${m.costs / maxv * 100}%" class="neg"></i><b>${fmt(m.costs)}</b></div></div>
          <p class="profit ${m.profit >= 0 ? 'ok' : 'no'}">${esc(tx(T('Пайда', 'Прибыль', 'Profit')))}: <b>${fmt(m.profit)}</b></p></div></div>${res}`;
      }
      el.addEventListener('input', e => { const k = e.target.dataset.k; if (!k) return; st[k] = +e.target.value; res = ''; const id = e.target.id; draw(); const n = el.querySelector('#' + id); if (n) n.focus(); });
      el.addEventListener('click', e => {
        if (!e.target.closest('[data-check]')) return;
        const m = model(st), score = clamp(m.profit / best * 100);
        res = resultBox(score, [[m.profit > 0, T(`Пайда: ${fmt(m.profit)} (ең жақсысы: ${fmt(best)})`, `Прибыль: ${fmt(m.profit)} (лучшее: ${fmt(best)})`, `Profit: ${fmt(m.profit)} (best possible: ${fmt(best)})`)], [m.waste <= 3000, T(`Ысырап: ${fmt(m.waste)}`, `Потери: ${fmt(m.waste)}`, `Waste: ${fmt(m.waste)}`)], [m.sold >= Math.min(m.demand, m.speed), T('«Тар жерді» (bottleneck) тап', 'Найди «узкое место» (bottleneck)', 'Find the bottleneck')], [true, T('Жарнаманың әр келесі 1000 ₸-сы азырақ клиент әкеледі — кемімелі қайтарым.', 'Каждые следующие 1000 ₸ рекламы приводят меньше клиентов — убывающая отдача.', 'Each extra 1,000 ₸ of advertising brings fewer customers — diminishing returns.')]]);
        done(score, { decision: score, accuracy: score }); draw();
      });
      draw();
    }
  };

  /* ===== 9. Doctor (educational, non-diagnostic) ===== */
  NK.SIMS.doctor = {
    icon: 'stethoscope', mins: 5, profs: ['doctor', 'nurse', 'psych'],
    title: T('Дәрігер', 'Врач', 'Doctor'),
    teaser: T('Пациентпен сұхбат жүргізіп, орынды кеңес бер.', 'Проведи беседу с пациентом и дай уместный совет.', 'Interview a patient and give appropriate advice.'),
    intro: T('Дәрігердің жұмысы дұрыс сұрақ қоюдан басталады. Бұл — оқу кейсі: диагноз қойылмайды; нақты денсаулық мәселесінде әрқашан дәрігерге жүгіну керек.', 'Работа врача начинается с правильных вопросов. Это учебный кейс: диагноз не ставится; с реальной проблемой со здоровьем всегда нужно обращаться к врачу.', 'A doctor\'s work starts with the right questions. This is a learning case: no diagnosis is made; real health concerns always need a doctor.'),
    task: T('Айгерім, 15 жас: «Соңғы екі аптада сабақта жиі шаршаймын, түстен кейін басым ауырады». 4 сұрақ таңда, содан кейін орынды ұсыныстарды белгіле.', 'Айгерим, 15 лет: «Последние две недели часто устаю на уроках, после обеда болит голова». Выбери 4 вопроса, затем отметь уместные рекомендации.', 'Aigerim, 15: "For two weeks I\'ve often felt tired in class, and I get headaches in the afternoon." Choose 4 questions, then the appropriate recommendations.'),
    skills: [T('Клиникалық ойлау', 'Клиническое мышление', 'Clinical reasoning'), T('Белсенді тыңдау', 'Активное слушание', 'Active listening'), T('Этика және жауапкершілік', 'Этика и ответственность', 'Ethics and responsibility')],
    render(el, done) {
      const QS = [[T('Түнде қанша сағат ұйықтайсың?', 'Сколько часов ты спишь ночью?', 'How many hours do you sleep?'), T('5–6 сағат, түнгі 1-ге дейін телефонда отырамын.', '5–6 часов, сижу в телефоне до часу ночи.', '5–6 hours; I\'m on my phone until 1 am.'), true], [T('Таңертең тамақтанып, су ішесің бе?', 'Ты завтракаешь и пьёшь воду?', 'Do you eat breakfast and drink water?'), T('Таңғы асты жиі өткізіп жіберемін, су аз ішемін.', 'Часто пропускаю завтрак, пью мало воды.', 'I often skip breakfast and drink little water.'), true], [T('Экран алдында қанша уақыт өткізесің?', 'Сколько времени ты проводишь за экраном?', 'How much screen time do you have?'), T('Сабақтан кейін 5–6 сағат.', 'После уроков 5–6 часов.', '5–6 hours after school.'), true], [T('Белгілер қашан басталды, басқа белгі бар ма?', 'Когда начались симптомы, есть ли другие?', 'When did it start, and are there other symptoms?'), T('Екі апта бұрын, емтихан кезінде. Қызу жоқ.', 'Две недели назад, во время экзаменов. Температуры нет.', 'Two weeks ago, during exams. No fever.'), true], [T('Сүйікті түсің қандай?', 'Твой любимый цвет?', 'What is your favourite colour?'), T('Көк. (Денсаулыққа қатысы жоқ.)', 'Синий. (К здоровью не относится.)', 'Blue. (Not relevant to health.)'), false], [T('Телефоныңның маркасы қандай?', 'Какой у тебя телефон?', 'What brand is your phone?'), T('Шаршауға қатысы жоқ.', 'К усталости не относится.', 'Not relevant to tiredness.'), false]];
      const RS = [[T('Ұйқы режимі: 8–10 сағат, ұйқы алдында 1 сағат экрансыз', 'Режим сна: 8–10 часов, за час до сна без экрана', 'Sleep routine: 8–10 hours, no screens an hour before bed'), 1], [T('Таңғы ас және жеткілікті су', 'Завтрак и достаточно воды', 'Breakfast and enough water'), 1], [T('Экран уақытын азайтып, үзіліс жасау', 'Меньше экранного времени, перерывы', 'Less screen time and regular breaks'), 1], [T('Белгілер жалғасса — мейірбикеге немесе дәрігерге қаралу', 'Если симптомы сохраняются — к медсестре или врачу', 'If it continues — see the school nurse or a doctor'), 2], [T('Өз бетімен ауырсынуды басатын дәрі ішу', 'Самостоятельно пить обезболивающие', 'Take painkillers on your own'), 0], [T('Энергетикалық сусын ішу', 'Пить энергетики', 'Drink energy drinks'), 0], [T('Ештеңе істемеу', 'Ничего не делать', 'Do nothing'), 0]];
      let asked = [], recs = [], stage = 1, res = '';
      const L3 = { s1: T('1-кезең: сұрақ қой', 'Этап 1: задай вопросы', 'Stage 1: ask questions'), s2: T('2-кезең: ұсыныстарды таңда', 'Этап 2: выбери рекомендации', 'Stage 2: choose recommendations'), note: T('Оқу сценарийі. Нақты денсаулық мәселесінде маманға жүгін.', 'Учебный сценарий. С реальной проблемой обращайся к специалисту.', 'Learning scenario. For real health concerns, see a professional.') };
      function draw() {
        el.innerHTML = `<div class="card case"><div class="patient"><span class="avatar">A</span><div><b>${esc(tx(T('Айгерім, 15 жас', 'Айгерим, 15 лет', 'Aigerim, 15')))}</b></div></div>
          <h4>${esc(tx(L3.s1))} (${asked.length}/4)</h4><div class="qs">${QS.map((x, i) => `<button class="opt ${asked.includes(i) ? 'on' : ''}" data-q="${i}" ${stage > 1 || (asked.length >= 4 && !asked.includes(i)) ? 'disabled' : ''}><span class="opt-k">${ic('messages-square')}</span><span>${esc(tx(x[0]))}${asked.includes(i) ? `<em class="ans">${esc(tx(x[1]))}</em>` : ''}</span></button>`).join('')}</div>
          ${stage === 1 ? `<button class="btn btn-violet btn-sm" data-next ${asked.length < 4 ? 'disabled' : ''}>${esc(t('next'))} ${ic('arrow-right')}</button>` : ''}
          ${stage >= 2 ? `<h4>${esc(tx(L3.s2))}</h4><div class="qs">${RS.map((x, i) => `<button class="opt ${recs.includes(i) ? 'on' : ''}" data-r="${i}" ${stage > 2 ? 'disabled' : ''}><span class="opt-k">${ic(recs.includes(i) ? 'check' : 'plus')}</span><span>${esc(tx(x[0]))}</span></button>`).join('')}</div>${stage === 2 ? `<button class="btn btn-lime btn-sm" data-check ${recs.length ? '' : 'disabled'}>${ic('check')} ${esc(tx(UI.check))}</button>` : ''}` : ''}
          <p class="tiny muted">${ic('info')} ${esc(tx(L3.note))}</p></div>${res}`;
      }
      el.addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b || b.disabled) return;
        if (b.dataset.q != null && stage === 1) { const i = +b.dataset.q; if (!asked.includes(i) && asked.length < 4) asked.push(i); }
        else if ('next' in b.dataset) stage = 2;
        else if (b.dataset.r != null && stage === 2) { const i = +b.dataset.r; recs = recs.includes(i) ? recs.filter(x => x !== i) : recs.concat(i); }
        else if ('check' in b.dataset) {
          const gq = asked.filter(i => QS[i][2]).length, bq = asked.length - gq, gr = recs.filter(i => RS[i][1] > 0).length, br = recs.length - gr, refer = recs.some(i => RS[i][1] === 2);
          const score = clamp(gq * 10 - bq * 5 + gr * 12.5 - br * 15 + (refer ? 10 : 0));
          res = resultBox(score, [[gq === 4, T(`Маңызды сұрақтар: ${gq}/4`, `Важные вопросы: ${gq}/4`, `Relevant questions: ${gq}/4`)], [gr >= 3, T(`Орынды ұсыныстар: ${gr}/4`, `Уместные рекомендации: ${gr}/4`, `Appropriate recommendations: ${gr}/4`)], [br === 0, br ? T('Кейбір ұсыныстар зиянды: өз бетімен дәрі мен энергетиктер қауіпті.', 'Некоторые советы вредны: самолечение и энергетики опасны.', 'Some advice is harmful: self-medicating and energy drinks are risky.') : T('Зиянды ұсыныс жоқ', 'Вредных советов нет', 'No harmful advice')], [refer, T('Маманға жіберу — медициналық этиканың негізі', 'Направить к специалисту — основа медицинской этики', 'Referring to a professional is a core part of medical ethics')]]);
          stage = 3; done(score, { reasoning: clamp(gq * 25 - bq * 10), decision: clamp(gr * 25 - br * 25) });
        }
        draw();
      });
      draw();
    }
  };

  /* ===== 10. Engineer (bridge) ===== */
  NK.SIMS.engineer = {
    icon: 'hard-hat', mins: 5, profs: ['civeng', 'mecheng', 'roboeng'],
    title: T('Инженер', 'Инженер', 'Engineer'),
    teaser: T('Шектеулі бюджетпен берік көпір жобала.', 'Спроектируй прочный мост в рамках бюджета.', 'Design a strong bridge on a limited budget.'),
    intro: T('Инженер беріктік, қауіпсіздік және құн арасындағы теңгерімді табады. «Ең берік» емес, «талапқа сай әрі тиімді» шешім жақсы.', 'Инженер ищет баланс прочности, безопасности и стоимости. Лучшее решение — не «самое прочное», а «соответствующее требованиям и экономичное».', 'An engineer balances strength, safety and cost. The best solution is not the strongest, but the one that meets requirements efficiently.'),
    task: T('12 м көпір 10 т жүкті қауіпсіздік қорымен (×1.5 = 15 т) көтеруі керек. Бюджет — 40. Материал, конструкция, тіреу және қалыңдықты таңдап, сынақтан өткіз.', 'Мост 12 м должен выдержать 10 т с запасом прочности (×1,5 = 15 т). Бюджет — 40. Выбери материал, конструкцию, опоры и толщину и проведи испытание.', 'A 12 m bridge must carry 10 t with a safety factor (×1.5 = 15 t). Budget: 40 units. Pick material, structure, supports and thickness, then test it.'),
    skills: [T('Инженерлік есеп', 'Инженерный расчёт', 'Engineering calculation'), T('Шектеулермен жұмыс', 'Работа с ограничениями', 'Working within constraints'), T('Қауіпсіздік қоры', 'Запас прочности', 'Safety margins')],
    render(el, done) {
      const MAT = { wood: [T('Ағаш', 'Дерево', 'Wood'), 4, 2], steel: [T('Болат', 'Сталь', 'Steel'), 9, 6], conc: [T('Темірбетон', 'Железобетон', 'Reinforced concrete'), 7, 4] };
      const STR = { beam: [T('Арқалық', 'Балка', 'Beam'), 1.0, 1.0], truss: [T('Ферма', 'Ферма', 'Truss'), 1.8, 1.4], arch: [T('Арка', 'Арка', 'Arch'), 1.6, 1.6] };
      const SUP = [1.0, 1.4, 1.7], BUDGET = 40, NEED = 15; const st = { mat: 'wood', str: 'beam', sup: 0, th: 2 }; let res = '', anim = '';
      const calc = s => ({ cap: +(MAT[s.mat][1] * s.th * STR[s.str][1] * SUP[s.sup] * 0.5).toFixed(1), cost: +(MAT[s.mat][2] * s.th * STR[s.str][2] + s.sup * 8).toFixed(1) });
      let bestCost = Infinity; Object.keys(MAT).forEach(mat => Object.keys(STR).forEach(str => [0, 1, 2].forEach(sup => [1, 2, 3, 4, 5].forEach(th => { const r = calc({ mat, str, sup, th }); if (r.cap >= NEED && r.cost <= BUDGET) bestCost = Math.min(bestCost, r.cost); }))));
      function bridgeSvg(fail) {
        const sag = fail ? 26 : 0; let s = '';
        if (st.str === 'truss') for (let i = 0; i < 8; i++) { const x = 20 + i * 35; s += `<path d="M${x} 70 L${x + 17} 45 L${x + 35} 70" class="br-m"/>`; } else if (st.str === 'arch') s += `<path d="M20 70 Q160 ${10 + sag} 300 70" class="br-m"/>` + [60, 100, 140, 180, 220, 260].map(x => `<line x1="${x}" y1="70" x2="${x}" y2="${70 - 50 * (1 - Math.pow((x - 160) / 140, 2))}" class="br-m"/>`).join('');
        const sups = st.sup === 1 ? [160] : st.sup === 2 ? [113, 207] : [];
        return `<svg viewBox="0 0 320 130" class="bridge ${fail ? 'fail' : ''}"><rect x="0" y="95" width="320" height="35" class="water"/><rect x="0" y="70" width="22" height="60" class="bank"/><rect x="298" y="70" width="22" height="60" class="bank"/>${sups.map(x => `<rect x="${x - 4}" y="72" width="8" height="40" class="br-sup"/>`).join('')}${s}<path d="M20 70 Q 160 ${70 + sag} 300 70" class="br-deck mat-${st.mat}"/>${anim ? `<g class="truck ${anim}"><rect x="0" y="50" width="34" height="16" rx="3"/><rect x="26" y="44" width="12" height="14" rx="2"/><circle cx="8" cy="68" r="4"/><circle cx="30" cy="68" r="4"/></g>` : ''}</svg>`;
      }
      const LB = { mat: T('Материал', 'Материал', 'Material'), str: T('Конструкция', 'Конструкция', 'Structure'), sup: T('Аралық тіреулер', 'Промежуточные опоры', 'Middle supports'), th: T('Қалыңдық', 'Толщина', 'Thickness'), test: T('Сынақ', 'Испытание', 'Load test'), calc: T('Есептеу', 'Расчёт', 'Calculation'), cap: T('Көтеру қабілеті', 'Грузоподъёмность', 'Load capacity'), cost: T('Құны', 'Стоимость', 'Cost') };
      function draw() {
        const c = calc(st); const seg = (k, opts) => `<div class="seg">${opts.map(([v, l]) => `<button data-k="${k}" data-v="${v}" class="${String(st[k]) === String(v) ? 'on' : ''}">${esc(typeof l === 'string' ? l : tx(l))}</button>`).join('')}</div>`;
        el.innerHTML = `<div class="card">${bridgeSvg(anim === 'crash')}</div><div class="sim-2col"><div class="card"><label>${esc(tx(LB.mat))}</label>${seg('mat', Object.keys(MAT).map(k => [k, MAT[k][0]]))}<label>${esc(tx(LB.str))}</label>${seg('str', Object.keys(STR).map(k => [k, STR[k][0]]))}<label>${esc(tx(LB.sup))}</label>${seg('sup', [[0, '0'], [1, '1'], [2, '2']])}<label for="br-th">${esc(tx(LB.th))}: ${st.th}</label><input type="range" id="br-th" min="1" max="5" value="${st.th}"><button class="btn btn-lime btn-sm" data-test>${ic('truck')} ${esc(tx(LB.test))}</button></div>
          <div class="card"><h4>${ic('gauge')} ${esc(tx(LB.calc))}</h4><div class="kv"><span>${esc(tx(LB.cap))}</span><b class="${c.cap >= NEED ? 'okc' : 'noc'}">${c.cap} t / ${NEED} t</b><span>${esc(tx(LB.cost))}</span><b class="${c.cost <= BUDGET ? 'okc' : 'noc'}">${c.cost} / ${BUDGET}</b></div>
          <details class="formula-d"><summary>${ic('info')} Formula</summary><code>capacity = strength × thickness × structure × supports × 0.5</code><code>strength: wood 4, steel 9, concrete 7 · structure: beam 1.0, truss 1.8, arch 1.6 · supports: 0 → 1.0, 1 → 1.4, 2 → 1.7</code><code>cost = material (2/6/4) × thickness × (1.0/1.4/1.6) + supports × 8</code></details></div></div>${res}`;
      }
      el.addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b) return;
        if (b.dataset.k) { st[b.dataset.k] = b.dataset.k === 'sup' ? +b.dataset.v : b.dataset.v; res = ''; anim = ''; draw(); }
        if ('test' in b.dataset) {
          const c = calc(st), ok = c.cap >= NEED, inB = c.cost <= BUDGET; anim = ok ? 'drive' : 'crash'; res = ''; draw();
          setTimeout(() => {
            const score = ok && inB ? Math.round(100 * bestCost / c.cost) : ok ? 40 : 30;
            res = resultBox(score, [[ok, ok ? T(`Көпір ${c.cap} т көтереді — сынақтан өтті`, `Мост выдерживает ${c.cap} т — испытание пройдено`, `The bridge carries ${c.cap} t — test passed`) : T(`Көпір тек ${c.cap} т көтереді — 15 т қажет`, `Мост выдерживает только ${c.cap} т — нужно 15 т`, `The bridge only carries ${c.cap} t — 15 t needed`)], [inB, T(`Құны ${c.cost} (бюджет ${BUDGET})`, `Стоимость ${c.cost} (бюджет ${BUDGET})`, `Cost ${c.cost} (budget ${BUDGET})`)], [ok && inB && c.cost <= bestCost + 0.01, T(`Ең үнемді дұрыс шешім: ${bestCost}. Ферма материалды тиімді пайдаланады.`, `Самое экономичное верное решение: ${bestCost}. Ферма эффективно использует материал.`, `Cheapest valid design: ${bestCost}. A truss uses material efficiently.`)]]);
            done(score, { accuracy: ok ? 100 : 30, decision: score }); draw();
          }, 1600);
        }
      });
      el.addEventListener('input', e => { if (e.target.id === 'br-th') { st.th = +e.target.value; res = ''; anim = ''; draw(); const n = el.querySelector('#br-th'); if (n) n.focus(); } });
      draw();
    }
  };
})();
