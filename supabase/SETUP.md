# N-KELL дерекқорын қосу (Supabase)

Барлығы тегін жоспарда жұмыс істейді. Шамамен 10 минут.

## 1. Жоба ашу
1. https://supabase.com → **Start your project** → GitHub арқылы кір.
2. **New project**: аты `n-kell`, күшті Database password ойлап тап (сақтап қой), Region: **Frankfurt (eu-central-1)** немесе Қазақстанға жақын кез келген аймақ.

## 2. Кестелерді жасау
1. Сол жақ мәзір → **SQL Editor** → **New query**.
2. Осы репозиторийдегі `supabase/schema.sql` файлының бүкіл мазмұнын көшіріп қой → **Run**.
3. «Success. No rows returned» шығуы керек.

## 3. Кіру баптаулары
**Authentication → Sign In / Providers → Email**:
- **Enable Email provider**: қосулы.
- **Confirm email**: қосулы болса, тіркелгенде поштаға растау хаты келеді (ұсынылады). Өшірсең, бірден кіреді.

**Authentication → URL Configuration**:
- **Site URL**: `https://zhanerwoi.github.io/n-kell/`
- **Redirect URLs**: `https://zhanerwoi.github.io/n-kell/**`

## 4. Кілттерді сайтқа қосу
**Project Settings → API** бетінен екі мәнді көшір:
- **Project URL** (мысалы `https://abcd1234.supabase.co`)
- **anon public** кілті

Оларды `assets/config.js` файлына қой:
```js
NK.CLOUD_CONFIG = {
  url: 'https://abcd1234.supabase.co',
  anonKey: 'eyJhbGciOi...'
};
```
Содан кейін `python3 build.py` іске қосып, GitHub-қа жүкте.

> `anon` кілті жария болуға арналған — қауіпсіздікті `schema.sql` ішіндегі row-level security ережелері қамтамасыз етеді.
> **`service_role` кілтін ешқашан сайтқа қойма.**

## Деректер қалай қорғалған
- Әр оқушы тек өз жолдарын оқи және жаза алады.
- Мұғалім оқушылардың деректерін тікелей көрмейді: тек `group_overview()` функциясы арқылы рұқсат берген оқушылардың тапсыру күйін және кемінде 3 оқушы келіскенде ғана орташа RIASEC көрсеткіштерін алады.
- Рөлді (оқушы/мұғалім) тіркелгеннен кейін өзгерту мүмкін емес.
- Оқушы аккаунтын жойса, барлық деректері каскадпен жойылады.
- Кеңесшімен сөйлесу тарихы серверге жіберілмейді.

`config.js` бос болса, сайт бұрынғыдай жергілікті режимде жұмыс істейді (деректер браузерде).
