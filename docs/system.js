(function () {
  'use strict';
  var BM = window.BM, esc = BM.esc, icon = BM.icon;

  // ---------- model ----------
  var LAYERS = [
    { id: 0, title: 'Фундамент', hint: 'стратегия и ресурсы' },
    { id: 1, title: 'Действия', hint: 'что делаем' },
    { id: 2, title: 'Показатели', hint: 'что измеряем' },
    { id: 3, title: 'Результат', hint: 'что получаем' },
    { id: 4, title: 'Бренд и компания', hint: 'что накапливается' }
  ];

  // AARRR stages (brand and content are cross-cutting; foundation feeds every stage)
  var STAGES = [
    { id: 'all', label: 'Вся система' },
    { id: 'found', label: 'Фундамент' },
    { id: 'acq', label: 'Привлечение' },
    { id: 'act', label: 'Активация' },
    { id: 'ret', label: 'Удержание' },
    { id: 'ref', label: 'Рекомендации' },
    { id: 'rev', label: 'Монетизация' },
    { id: 'brand', label: 'Бренд и компания' }
  ];

  // polarity: 1 — чем выше, тем лучше; -1 — чем ниже, тем лучше
  var NODES = [
    { id: 'research', layer: 0, stage: 'found', label: 'Исследования ЦА', polarity: 1, desc: 'Интервью, разбор отзывов конкурентов, частотность запросов, анализ ниши. Голос покупателя питает позиционирование, карточку и сам продукт.', measure: 'Сколько интервью и разобранных отзывов в месяц; доля решений, подкреплённых данными, а не догадками.' },
    { id: 'niche', layer: 0, stage: 'found', label: 'Ниша и спрос', polarity: 1, desc: 'Качество рынка: насколько велика проблема покупателя и как часто он покупает. Ёмкая ниша с частой покупкой даёт маркетингу эффект накопления.', measure: 'Объём и динамика категории в MPStats, частотность запросов, сезонность, концентрация лидеров.' },
    { id: 'budget', layer: 0, stage: 'found', label: 'Бюджет', polarity: 1, desc: 'Деньги на партию, рекламу, контент и команду. Правило 70/20/10: основное — в работающее, 20% — в следующий канал, 10% — в эксперименты.', measure: 'Методика — раздел «Бюджет запуска»: себестоимость первой партии ÷ 0,3–0,4 = общий бюджет; плюс 10–20% на эксперименты.' },
    { id: 'team', layer: 0, stage: 'found', label: 'Команда и процессы', polarity: 1, desc: 'Кто делает работу: бренд-менеджер, дизайнер, SMM, подрядчики. Стратегия — внутри команды, исполнение можно отдавать на подряд.', measure: 'Скорость выпуска: карточки, креативы, посты в неделю; доля задач в срок.' },
    { id: 'analytics', layer: 0, stage: 'found', label: 'Аналитика и данные', polarity: 1, desc: 'Сквозные цифры по площадкам, еженедельный разбор воронки, юнит-экономика. Без измерений эксперименты и решения превращаются в догадки.', measure: 'Еженедельный дашборд по этапам воронки; доля ключевых метрик, которые реально считаются.' },
    { id: 'platform', layer: 0, stage: 'found', label: 'Бренд-платформа', polarity: 1, desc: 'Позиционирование, УТП, ценности, tone of voice и messaging house. Задаёт, что и как бренд говорит на каждом этапе воронки.', measure: 'Заполненность вкладки «Бренд-платформа» в проекте; узнаваемость ключевого сообщения.' },
    { id: 'packaging', layer: 0, stage: 'found', label: 'Упаковка и дизайн', polarity: 1, desc: 'Визуальная айдентика и упаковка. На маленьком превью в выдаче именно она решает, заметят ли товар.', measure: 'Тест превью среди 10 конкурентов в выдаче; CTR после смены главного фото.' },
    { id: 'product', layer: 0, stage: 'found', label: 'Продукт и качество', polarity: 1, desc: 'Рецептура, текстура, стабильность, соответствие обещаниям. Фундамент отзывов, повторных покупок и сарафанного радио.', measure: 'Тест образцов, доля выкупа, тональность отзывов о самом продукте.' },
    { id: 'price', layer: 0, stage: 'found', label: 'Цена', polarity: 1, desc: 'Цена относительно категории. Выше цена — больше маржа и средний чек, но ниже конверсия; баланс ищется по юнит-экономике.', measure: 'Сравнение с топ-выдачей по ключевым запросам; калькулятор во вкладке «Продукты».' },

    { id: 'ads', layer: 1, stage: 'acq', label: 'Реклама на МП', polarity: 1, desc: 'Поиск и карточки конкурентов — основной разгон в первые недели. Даёт продажи и подталкивает органику.', measure: 'Расходы, CPC, CTR и ДРР по каждому ключевому запросу.' },
    { id: 'external', layer: 1, stage: 'acq', label: 'Внешний трафик', polarity: 1, desc: 'VK Реклама, Яндекс Директ, таргет в соцсетях с переходом в карточку. Внешние продажи площадка учитывает в ранжировании.', measure: 'Переходы и заказы по UTM, стоимость заказа, доля внешнего трафика.' },
    { id: 'influencers', layer: 1, stage: 'acq', label: 'Блогеры и посевы', polarity: 1, desc: 'Микроинфлюэнсеры и посевы в Telegram: охват, брендовый спрос, первые отзывы и UGC.', measure: 'Переходы по промокодам и UTM, стоимость за переход и за заказ.' },
    { id: 'pr', layer: 1, stage: 'acq', label: 'PR и коллаборации', polarity: 1, desc: 'Публикации, обзоры, подборки, совместные проекты с другими брендами. Повышают доверие и брендовый спрос.', measure: 'Охват публикаций; рост поиска по названию бренда после выхода.' },
    { id: 'smm', layer: 1, stage: 'acq', label: 'SMM и контент', polarity: 1, desc: 'Соцсети бренда: узнаваемость, доверие и площадка для будущего сообщества. Один сильный материал работает в нескольких каналах сразу.', measure: 'Охват, ER, CTR в карточку, доля переходов с SMM.' },
    { id: 'promo', layer: 1, stage: 'acq', label: 'Акции и скидки', polarity: 1, desc: 'Участие в акциях площадки даёт видимость новой карточке, но режет маржу.', measure: 'Прирост заказов в дни акции против падения маржи на единицу.' },
    { id: 'card', layer: 1, stage: 'act', label: 'Карточка товара', polarity: 1, desc: 'Название, SEO, инфографика 5–9 слайдов, видео, характеристики, блок «с этим покупают». Главная точка активации на маркетплейсе.', measure: 'CTR из выдачи, конверсия карточки, позиции по ключам.' },
    { id: 'reviewsWork', layer: 1, stage: 'act', label: 'Работа с отзывами', polarity: 1, desc: 'Ответы на все отзывы, программы за баллы для первых отзывов, работа с негативом.', measure: 'Доля отзывов с ответом, скорость ответа, динамика рейтинга.' },
    { id: 'stock', layer: 1, stage: 'act', label: 'Логистика и остатки', polarity: 1, desc: 'Поставки, приёмка, наличие на складах. Отсутствие товара обнуляет позиции в поиске.', measure: 'Остатки в днях продаж, дни без наличия, соблюдение слотов.' },
    { id: 'experiments', layer: 1, stage: 'all', label: 'A/B-тесты', polarity: 1, desc: 'Тесты главного фото, инфографики, цены и ставок. Портфель маленьких проверенных ставок вместо одной «серебряной пули».', measure: 'Число тестов в месяц, доля победителей, прирост метрики от внедрённых вариантов.' },
    { id: 'crm', layer: 1, stage: 'ret', label: 'Пост-покупка и CRM', polarity: 1, desc: 'Вкладыши с QR, инструкции и уход, Telegram-канал для купивших, напоминание о повторной покупке, просьба об отзыве в нужный момент.', measure: 'Доля покупателей, перешедших по QR; повторные заказы от подписчиков канала.' },
    { id: 'community', layer: 1, stage: 'ret', label: 'Сообщество бренда', polarity: 1, desc: 'Канал или чат лояльных покупателей: UGC, тест новинок, обратная связь. Удерживает и превращает клиентов в амбассадоров.', measure: 'Размер и активность сообщества; повторные покупки у участников против остальных.' },
    { id: 'referral', layer: 1, stage: 'ref', label: 'Рекомендации и UGC', polarity: 1, desc: 'Механики «поделись», подарочные наборы, фото-отзывы за баллы, амбассадоры из покупателей.', measure: 'Количество UGC и фото-отзывов; заказы по реферальным промокодам.' },
    { id: 'bundles', layer: 1, stage: 'rev', label: 'Наборы и допродажи', polarity: 1, desc: 'Комплекты, «купи 2», сопутствующие товары, линейка для повторной покупки.', measure: 'Доля заказов с несколькими SKU; средний чек по наборам.' },

    { id: 'cac', layer: 2, stage: 'acq', label: 'CAC', polarity: -1, desc: 'Сколько стоит привлечь одного покупателя со всеми расходами: реклама, блогеры, контент, люди, сервисы — не только рекламный бюджет.', measure: 'Все расходы на привлечение ÷ новые покупатели; не должен превышать маржу с первой покупки и LTV ÷ 3.' },
    { id: 'drr', layer: 2, stage: 'acq', label: 'ДРР (ACOS)', polarity: -1, desc: 'Доля рекламных расходов в выручке. На старте выше нормы, должна снижаться по мере роста органики и брендового спроса.', measure: 'Расходы на рекламу ÷ выручка × 100% — по каждому SKU отдельно.' },
    { id: 'reach', layer: 2, stage: 'acq', label: 'Охват и узнаваемость', polarity: 1, desc: 'Сколько людей видели бренд и продукт до поиска на маркетплейсе.', measure: 'Охваты SMM, посевов и PR; доля аудитории, узнающей бренд в опросе.' },
    { id: 'brandSearch', layer: 2, stage: 'acq', label: 'Брендовый спрос', polarity: 1, desc: 'Сколько людей ищут бренд по названию. Самый дешёвый и лояльный трафик — мера силы бренда в цифрах.', measure: 'Запросы с названием бренда в Wordstat и в поиске площадки; доля заказов из брендового поиска.' },
    { id: 'ctr', layer: 2, stage: 'acq', label: 'CTR', polarity: 1, desc: 'Доля кликов от показов в выдаче и рекламе. Низкий CTR — сигнал слабого главного фото или цены.', measure: 'Аналитика кабинета и рекламного кабинета; сравнение с конкурентами.' },
    { id: 'ranking', layer: 2, stage: 'acq', label: 'Позиции в поиске', polarity: 1, desc: 'Органическая видимость по ключевым запросам. Алгоритм учитывает продажи, CTR, конверсию, рейтинг, остатки и внешний трафик.', measure: 'Еженедельно по ключевым запросам первые 2–3 месяца.' },
    { id: 'cr', layer: 2, stage: 'act', label: 'Конверсия (CR)', polarity: 1, desc: 'Доля переходов в карточку, закончившихся заказом. Главный показатель активации на маркетплейсе.', measure: 'Заказы ÷ переходы; сравнивайте с топ-3 конкурентами.' },
    { id: 'buyout', layer: 2, stage: 'act', label: 'Доля выкупа', polarity: 1, desc: 'Какая часть заказов выкуплена. Низкая — проблема с описанием, фото или качеством.', measure: 'Выкуплено ÷ заказано × 100%.' },
    { id: 'rating', layer: 2, stage: 'act', label: 'Рейтинг и отзывы', polarity: 1, desc: 'Доверие покупателей и фактор ранжирования.', measure: 'Средняя оценка и количество отзывов, доля негатива.' },
    { id: 'aov', layer: 2, stage: 'rev', label: 'Средний чек', polarity: 1, desc: 'Сколько в среднем приносит один заказ. Растёт с наборами, допродажами и ценой.', measure: 'Выручка ÷ число заказов (AOV).' },
    { id: 'nps', layer: 2, stage: 'ret', label: 'Удовлетворённость (NPS)', polarity: 1, desc: 'Готовность рекомендовать бренд. Предсказывает повторные покупки и сарафанное радио раньше, чем они видны в продажах.', measure: 'Опрос во вкладыше или канале: доля промоутеров минус доля критиков; тональность отзывов.' },
    { id: 'repeat', layer: 2, stage: 'ret', label: 'Повторные покупки', polarity: 1, desc: 'Доля покупателей, вернувшихся за повторной покупкой. Для товарного бизнеса — главный показатель удержания.', measure: 'Доля повторных заказов; отслеживайте по когортам после первых 2–3 месяцев.' },
    { id: 'wom', layer: 2, stage: 'ref', label: 'Сарафанное радио', polarity: 1, desc: 'Покупатели приводят новых покупателей: рекомендации, отметки, UGC. Бесплатный канал, который растёт вместе с качеством.', measure: 'Доля новых покупателей «по совету», заказы по реферальным кодам, упоминания бренда.' },

    { id: 'romi', layer: 3, stage: 'rev', label: 'ROMI', polarity: 1, desc: 'Окупаемость маркетинга: сколько прибыли возвращает каждый вложенный рубль.', measure: '(Валовая прибыль от маркетинга − расходы на маркетинг) ÷ расходы × 100%; по каналам и кампаниям.' },
    { id: 'unit', layer: 3, stage: 'rev', label: 'Маржа (юнит-экономика)', polarity: 1, desc: 'Прибыль с одной продажи после комиссии, логистики, рекламы, налога и возвратов.', measure: 'Цена − комиссия − логистика − себестоимость − реклама − налог − возвраты.' },
    { id: 'turnover', layer: 3, stage: 'rev', label: 'Оборачиваемость', polarity: 1, desc: 'Скорость продажи запаса: без дефицита и без затоваривания и штрафов за хранение.', measure: 'Средний остаток ÷ среднедневные продажи (в днях; чем быстрее, тем лучше).' },
    { id: 'revenue', layer: 3, stage: 'rev', label: 'Выручка', polarity: 1, desc: 'Деньги от выкупленных заказов: органика, реклама, повторные покупки.', measure: 'Отчёты площадки, вкладка «Аналитика» проекта.' },
    { id: 'share', layer: 3, stage: 'rev', label: 'Доля рынка', polarity: 1, desc: 'Ваша выручка относительно объёма категории.', measure: 'MPStats / Moneyplace: выручка бренда ÷ объём категории.' },
    { id: 'ltv', layer: 3, stage: 'rev', label: 'LTV', polarity: 1, desc: 'Сколько маржи приносит покупатель за всё время: средний чек × частота покупок × срок жизни клиента.', measure: 'Средний чек × число покупок за период × маржинальность; по когортам.' },
    { id: 'ltvcac', layer: 3, stage: 'rev', label: 'LTV / CAC', polarity: 1, desc: 'Северная звезда товарного бизнеса: сколько покупатель приносит относительно стоимости его привлечения. Здоровая модель — от 3 к 1.', measure: 'LTV ÷ CAC по когортам и каналам; плюс срок окупаемости привлечения в месяцах.' },

    { id: 'company', layer: 4, stage: 'brand', label: 'Прибыль и устойчивость', polarity: 1, desc: 'Итог для компании: прибыль, ROI, способность финансировать развитие бренда и команды.', measure: 'ROI по бренду; ежемесячно и по кварталам.' },
    { id: 'equity', layer: 4, stage: 'brand', label: 'Капитал бренда', polarity: 1, desc: 'Узнаваемость, доверие и отстройка от конкурентов. Позволяет держать цену, снижает стоимость привлечения и повышает возвращаемость.', measure: 'Брендовые запросы, доля повторных покупок, премия к цене категории.' }
  ];

  // [from, to, sign, weight 1–3, why]
  var EDGES = [
    ['research', 'platform', 1, 3, 'Голос покупателя — основа позиционирования и УТП'],
    ['research', 'card', 1, 2, 'Реальные слова и возражения покупателей — в тексты и инфографику'],
    ['research', 'product', 1, 2, 'Боли из отзывов конкурентов подсказывают, каким сделать продукт'],
    ['research', 'niche', 1, 1, 'Анализ рынка помогает выбрать нишу с сильным спросом'],
    ['niche', 'revenue', 1, 2, 'Ёмкая ниша задаёт потолок продаж'],
    ['niche', 'repeat', 1, 2, 'Частая потребность — частые повторные покупки'],
    ['niche', 'cac', -1, 1, 'Растущий спрос удешевляет привлечение'],
    ['budget', 'ads', 1, 3, 'Бюджет определяет объём рекламы и ставки'],
    ['budget', 'external', 1, 2, 'Бюджет на внешний трафик и таргет'],
    ['budget', 'influencers', 1, 2, 'Деньги на блогеров и посевы'],
    ['budget', 'smm', 1, 1, 'Производство контента'],
    ['budget', 'pr', 1, 1, 'PR и коллаборации'],
    ['budget', 'promo', 1, 1, 'Запас маржи на участие в акциях'],
    ['budget', 'stock', 1, 2, 'Объём партии и страховой запас'],
    ['budget', 'team', 1, 2, 'Можно нанять людей и подрядчиков'],
    ['team', 'experiments', 1, 2, 'Есть кому делать — тестов больше'],
    ['team', 'card', 1, 1, 'Скорость обновления карточек и креативов'],
    ['team', 'smm', 1, 2, 'Регулярный контент требует рук'],
    ['team', 'analytics', 1, 2, 'Кто-то должен собирать и разбирать цифры каждую неделю'],
    ['team', 'reviewsWork', 1, 1, 'Ответы на отзывы — ежедневная работа команды'],
    ['team', 'crm', 1, 1, 'Вкладыши, канал и рассылки требуют ведения'],
    ['platform', 'crm', 1, 1, 'Голос бренда во вкладышах и рассылках'],
    ['research', 'bundles', 1, 1, 'Анализ корзин подсказывает удачные наборы'],
    ['product', 'bundles', 1, 2, 'Линейка продуктов — материал для наборов и допродаж'],
    ['analytics', 'experiments', 1, 3, 'Без данных не понять, какой вариант выиграл'],
    ['analytics', 'drr', -1, 2, 'Отключение неокупаемых ставок по данным снижает ДРР'],
    ['analytics', 'romi', 1, 2, 'Деньги переносятся в каналы, которые окупаются'],
    ['platform', 'card', 1, 2, 'УТП и messaging house — основа текстов и инфографики'],
    ['platform', 'smm', 1, 2, 'Tone of voice и ключевые сообщения для контента'],
    ['platform', 'packaging', 1, 2, 'Брендбук задаёт визуальный стандарт упаковки'],
    ['platform', 'pr', 1, 1, 'Понятная история бренда интересна медиа'],
    ['platform', 'equity', 1, 2, 'Чёткое позиционирование отличает бренд от конкурентов'],
    ['packaging', 'ctr', 1, 3, 'Фотогеничная упаковка выделяется на превью в выдаче'],
    ['packaging', 'card', 1, 2, 'Упаковка — главный кадр инфографики'],
    ['packaging', 'referral', 1, 1, 'Красивую упаковку хочется показать и подарить'],
    ['packaging', 'equity', 1, 1, 'Узнаваемый визуал запоминается'],
    ['product', 'rating', 1, 3, 'Качество продукта — главный источник оценок'],
    ['product', 'buyout', 1, 3, 'Товар соответствует ожиданиям — его выкупают'],
    ['product', 'nps', 1, 3, 'Качество — главный источник удовлетворённости'],
    ['product', 'unit', -1, 1, 'Дорогая рецептура увеличивает себестоимость'],
    ['price', 'unit', 1, 3, 'Цена формирует маржу с каждой продажи'],
    ['price', 'aov', 1, 2, 'Выше цена — выше средний чек'],
    ['price', 'cr', -1, 2, 'Цена выше категории снижает конверсию'],
    ['price', 'ctr', -1, 1, 'Цена видна в выдаче и влияет на клик'],

    ['ads', 'ranking', 1, 2, 'Продажи с рекламы подталкивают органические позиции'],
    ['ads', 'reach', 1, 2, 'Показы рекламы расширяют охват'],
    ['ads', 'drr', 1, 3, 'Больше расходов на рекламу — выше ДРР'],
    ['ads', 'revenue', 1, 2, 'Рекламные заказы дают выручку'],
    ['ads', 'cac', 1, 1, 'Расходы на рекламу входят в стоимость привлечения'],
    ['external', 'ranking', 1, 2, 'Внешние продажи площадка учитывает в ранжировании'],
    ['external', 'reach', 1, 2, 'Аудитория соцсетей узнаёт бренд'],
    ['external', 'brandSearch', 1, 1, 'Видевшие рекламу ищут бренд по названию'],
    ['external', 'cac', 1, 1, 'Расходы на таргет входят в CAC'],
    ['influencers', 'reach', 1, 3, 'Аудитория блогера узнаёт о бренде'],
    ['influencers', 'brandSearch', 1, 2, 'После обзора бренд ищут по названию'],
    ['influencers', 'wom', 1, 1, 'Подписчики пересказывают рекомендацию'],
    ['influencers', 'rating', 1, 1, 'UGC и первые отзывы'],
    ['influencers', 'cac', 1, 1, 'Гонорары повышают стоимость привлечения'],
    ['pr', 'reach', 1, 2, 'Публикации расширяют охват'],
    ['pr', 'brandSearch', 1, 2, 'После публикаций растёт поиск по бренду'],
    ['pr', 'equity', 1, 2, 'Упоминания в медиа укрепляют доверие'],
    ['smm', 'reach', 1, 3, 'Регулярный контент растит узнаваемость'],
    ['smm', 'community', 1, 2, 'Подписчики становятся сообществом'],
    ['smm', 'cr', 1, 1, 'Доверие к бренду до перехода в карточку'],
    ['smm', 'equity', 1, 2, 'Соцсети подтверждают «реальность» бренда'],
    ['promo', 'ranking', 1, 2, 'Всплеск продаж в акции поднимает карточку'],
    ['promo', 'cr', 1, 2, 'Скидка повышает конверсию'],
    ['promo', 'unit', -1, 2, 'Скидка режет маржу'],
    ['card', 'ctr', 1, 3, 'Главное фото и инфографика решают, кликнут ли'],
    ['card', 'cr', 1, 3, 'Описание, состав, фото и видео убеждают купить'],
    ['card', 'ranking', 1, 2, 'SEO и характеристики — попадание в поиск и фильтры'],
    ['card', 'buyout', 1, 2, 'Честное описание снижает возвраты'],
    ['card', 'aov', 1, 1, 'Блок «с этим покупают» добавляет товары в заказ'],
    ['reviewsWork', 'rating', 1, 2, 'Ответы и программы за баллы улучшают рейтинг'],
    ['reviewsWork', 'cr', 1, 1, 'Ответы на негатив успокаивают сомневающихся'],
    ['reviewsWork', 'nps', 1, 1, 'Решённая проблема превращает критика в сторонника'],
    ['stock', 'ranking', 1, 3, 'Нет остатков — карточка выпадает из поиска'],
    ['stock', 'revenue', 1, 2, 'Нет товара — нет продаж'],
    ['stock', 'turnover', 1, 1, 'Точное планирование поставок ускоряет оборот'],
    ['experiments', 'ctr', 1, 2, 'Тесты главного фото повышают CTR'],
    ['experiments', 'cr', 1, 2, 'Тесты инфографики и цены повышают конверсию'],
    ['experiments', 'drr', -1, 1, 'Отсев неэффективных ставок'],
    ['experiments', 'research', 1, 1, 'Итоги тестов — новые знания о покупателе'],
    ['crm', 'repeat', 1, 3, 'Вкладыши и напоминания возвращают за повторной покупкой'],
    ['crm', 'community', 1, 2, 'QR во вкладыше ведёт в канал бренда'],
    ['crm', 'nps', 1, 1, 'Забота после покупки повышает удовлетворённость'],
    ['crm', 'rating', 1, 1, 'Просьба об отзыве в нужный момент'],
    ['community', 'repeat', 1, 2, 'Участники сообщества покупают чаще'],
    ['community', 'wom', 1, 2, 'Лояльные покупатели рекомендуют бренд'],
    ['community', 'research', 1, 1, 'Сообщество — постоянный источник инсайтов'],
    ['community', 'equity', 1, 2, 'Сообщество — живое доказательство силы бренда'],
    ['referral', 'wom', 1, 3, 'Механики «поделись» умножают рекомендации'],
    ['referral', 'rating', 1, 1, 'Фото-отзывы за баллы'],
    ['referral', 'cac', -1, 1, 'Покупатели по рекомендации обходятся дешевле'],
    ['bundles', 'aov', 1, 3, 'Наборы и допродажи повышают средний чек'],
    ['bundles', 'unit', 1, 1, 'Логистика заказа делится на несколько товаров'],
    ['bundles', 'repeat', 1, 1, 'Линейка даёт повод вернуться'],

    ['cac', 'unit', -1, 2, 'Стоимость привлечения съедает прибыль'],
    ['cac', 'ltvcac', -1, 3, 'Дорогое привлечение ухудшает главное соотношение'],
    ['cac', 'romi', -1, 2, 'Чем дороже покупатель, тем ниже окупаемость'],
    ['drr', 'unit', -1, 3, 'Каждый процент ДРР вычитается из маржи'],
    ['drr', 'cac', 1, 2, 'Дорогая реклама — дорогой покупатель'],
    ['reach', 'brandSearch', 1, 2, 'Узнавание превращается в поиск по бренду'],
    ['reach', 'ctr', 1, 1, 'Знакомый бренд кликают охотнее'],
    ['reach', 'cr', 1, 1, 'Узнавание повышает доверие'],
    ['reach', 'equity', 1, 3, 'Узнаваемость — часть капитала бренда'],
    ['brandSearch', 'cr', 1, 2, 'Ищущие бренд по названию покупают охотнее'],
    ['brandSearch', 'drr', -1, 2, 'Брендовый трафик почти бесплатный'],
    ['brandSearch', 'ranking', 1, 1, 'Брендовые заказы поднимают карточку'],
    ['brandSearch', 'equity', 1, 2, 'Брендовый спрос — мера силы бренда'],
    ['ctr', 'ranking', 1, 2, 'Кликабельность — фактор ранжирования'],
    ['ctr', 'drr', -1, 2, 'Высокий CTR снижает цену клика и ДРР'],
    ['ranking', 'revenue', 1, 3, 'Органический трафик приносит продажи без рекламы'],
    ['ranking', 'drr', -1, 2, 'Больше органики — меньше зависимость от рекламы'],
    ['cr', 'revenue', 1, 3, 'Больше заказов с того же трафика'],
    ['cr', 'drr', -1, 3, 'Реклама окупается лучше при высокой конверсии'],
    ['cr', 'ranking', 1, 2, 'Конверсия — сильный сигнал для алгоритма'],
    ['cr', 'cac', -1, 2, 'Каждый покупатель обходится дешевле'],
    ['buyout', 'revenue', 1, 2, 'Выручка считается по выкупам'],
    ['buyout', 'unit', 1, 2, 'Возвраты оплачиваются логистикой'],
    ['rating', 'cr', 1, 3, 'Рейтинг и отзывы — доверие прямо в карточке'],
    ['rating', 'ranking', 1, 2, 'Рейтинг учитывается в ранжировании'],
    ['rating', 'equity', 1, 2, 'Отзывы формируют репутацию бренда'],
    ['aov', 'revenue', 1, 2, 'Больше денег с того же числа заказов'],
    ['aov', 'ltv', 1, 2, 'Средний чек — множитель LTV'],
    ['aov', 'unit', 1, 1, 'Фиксированные расходы делятся на больший чек'],
    ['nps', 'repeat', 1, 2, 'Довольные покупают снова'],
    ['nps', 'wom', 1, 3, 'Промоутеры рекомендуют бренд'],
    ['nps', 'rating', 1, 2, 'Довольные ставят высокие оценки'],
    ['repeat', 'ltv', 1, 3, 'Повторные покупки — основа LTV'],
    ['repeat', 'revenue', 1, 2, 'Выручка без затрат на привлечение'],
    ['repeat', 'romi', 1, 1, 'Повторные продажи окупают вложения в привлечение'],
    ['wom', 'reach', 1, 2, 'Рекомендации бесплатно расширяют охват'],
    ['wom', 'brandSearch', 1, 2, 'По совету ищут бренд по названию'],
    ['wom', 'cac', -1, 2, 'Сарафан снижает среднюю стоимость привлечения'],

    ['revenue', 'share', 1, 3, 'Выручка растёт — растёт доля категории'],
    ['revenue', 'company', 1, 2, 'Оборот компании'],
    ['revenue', 'budget', 1, 2, 'Часть выручки реинвестируется в рост'],
    ['unit', 'company', 1, 3, 'Прибыль с каждой продажи'],
    ['unit', 'budget', 1, 2, 'Маржа — источник бюджета на продвижение'],
    ['unit', 'romi', 1, 2, 'Маржа определяет окупаемость маркетинга'],
    ['unit', 'ltv', 1, 1, 'LTV считается в марже, а не в выручке'],
    ['ltv', 'ltvcac', 1, 3, 'LTV — числитель главного соотношения'],
    ['ltv', 'company', 1, 1, 'Ценные покупатели — стабильная прибыль'],
    ['ltvcac', 'budget', 1, 2, 'Здоровое соотношение позволяет смело вкладывать в рост'],
    ['ltvcac', 'company', 1, 2, 'LTV/CAC от 3 к 1 — устойчивая модель'],
    ['romi', 'budget', 1, 2, 'Окупаемый маркетинг финансирует сам себя'],
    ['romi', 'company', 1, 2, 'Маркетинг приносит прибыль, а не только расходы'],
    ['turnover', 'unit', 1, 1, 'Быстрый оборот — меньше платы за хранение'],
    ['turnover', 'company', 1, 1, 'Деньги не заморожены в остатках'],
    ['share', 'equity', 1, 2, 'Лидер категории воспринимается сильнее'],
    ['share', 'company', 1, 2, 'Позиция на рынке — устойчивость бизнеса'],

    ['equity', 'brandSearch', 1, 2, 'Сильный бренд ищут по названию'],
    ['equity', 'cr', 1, 1, 'Сильный бренд покупают охотнее'],
    ['equity', 'repeat', 1, 2, 'Лояльность к бренду возвращает покупателей'],
    ['equity', 'price', 1, 1, 'Сильный бренд может держать цену выше категории'],
    ['equity', 'cac', -1, 1, 'Узнаваемый бренд дешевле продавать'],
    ['company', 'budget', 1, 2, 'Устойчивая компания финансирует развитие бренда'],
    ['company', 'team', 1, 1, 'Прибыль позволяет растить команду']
  ];

  var PRESETS = [
    { title: 'Северная звезда: LTV / CAC', text: 'Главное соотношение товарного бизнеса — что его двигает и куда оно ведёт', node: 'ltvcac', mode: 'links' },
    { title: 'Почему растёт ДРР', text: 'Что поднимает долю рекламных расходов и что её снижает', node: 'drr', mode: 'links' },
    { title: 'Если вырастет рейтинг', text: 'Как улучшение отзывов расходится до прибыли', node: 'rating', mode: 'sim', impulse: 1 },
    { title: 'Если закончатся остатки', text: 'Цена отсутствия товара для всей системы', node: 'stock', mode: 'sim', impulse: -1 },
    { title: 'Если поднять цену', text: 'Маржа и средний чек растут, а что с конверсией и выручкой?', node: 'price', mode: 'sim', impulse: 1 },
    { title: 'Если вложиться в CRM', text: 'Удержание обходится дешевле привлечения — проверим по цепочке', node: 'crm', mode: 'sim', impulse: 1 },
    { title: 'Сарафанная петля', text: 'Качество → удовлетворённость → рекомендации → охват → продажи', path: ['product', 'nps', 'wom', 'reach', 'cr', 'revenue'] },
    { title: 'От упаковки до бренда', text: 'Путь визуала через клики и выдачу к капиталу бренда', path: ['packaging', 'ctr', 'ranking', 'revenue', 'share', 'equity'] },
    { title: 'Петля роста', text: 'Маржа → бюджет → реклама → позиции → выручка → снова бюджет', path: ['unit', 'budget', 'ads', 'ranking', 'revenue', 'budget'] },
    { title: 'Петля знаний', text: 'Исследования → карточка → тесты → новые знания о покупателе', path: ['research', 'card', 'cr', 'revenue', 'budget', 'team', 'experiments', 'research'] }
  ];

  var byId = {};
  NODES.forEach(function (n) { byId[n.id] = n; });
  var edges = EDGES.map(function (e, i) { return { i: i, from: e[0], to: e[1], sign: e[2], w: e[3], why: e[4] }; });
  BM.SYSTEM = { layers: LAYERS, nodes: NODES, edges: edges, stages: STAGES };
  var stageLabel = {}; STAGES.forEach(function (x) { stageLabel[x.id] = x.label; }); stageLabel.all = 'Все этапы воронки';


  // ---------- project data ----------
  function secProgress(p, id) {
    var sec = BM.DATA.checklistSections.filter(function (s) { return s.id === id; })[0];
    if (!sec) return null;
    var items = BM.checkItems(sec);
    if (!items.length) return null;
    var done = items.filter(function (it) { return p.checklistDone[it.id]; }).length;
    return Math.round(done / items.length * 100);
  }
  function lvlPct(v) { return v >= 70 ? 'good' : v >= 30 ? 'mid' : 'bad'; }
  function avg(arr) { return arr.length ? arr.reduce(function (a, b) { return a + b; }, 0) / arr.length : null; }
  function health(id, p) {
    if (!p) return null;
    var v;
    switch (id) {
      case 'platform': v = BM.platformProgress(p).pct; return { text: 'Платформа заполнена на ' + v + '%', level: lvlPct(v) };
      case 'card': v = secProgress(p, 'podgotovka-k-vyhodu-na-marketpleys'); return v == null ? null : { text: 'Подготовка карточки и выхода на МП: ' + v + '% чек-листа', level: lvlPct(v) };
      case 'stock': v = secProgress(p, 'logistika-ot-proizvodstva-do-sklada-mark'); return v == null ? null : { text: 'Логистика в чек-листе: ' + v + '%', level: lvlPct(v) };
      case 'product': v = secProgress(p, 'produkt-i-upakovka'); return v == null ? null : { text: 'Продукт в чек-листе: ' + v + '%', level: lvlPct(v) };
      case 'packaging': v = secProgress(p, 'brendbuk-brand-guide'); return v == null ? null : { text: 'Брендбук и айдентика: ' + v + '% чек-листа', level: lvlPct(v) };
      case 'budget': v = BM.num(p.launchBudget); return v ? { text: 'Бюджет запуска: ' + BM.money(v), level: 'good' } : { text: 'Бюджет запуска не указан', level: 'bad' };
      case 'price':
        v = avg(p.skus.map(function (s) { return BM.num(s.sellPrice); }).filter(function (x) { return x; }));
        return v == null ? null : { text: 'Средняя цена по ' + p.skus.length + ' SKU: ' + BM.money(v), level: null };
      case 'unit':
        v = avg(p.skus.map(function (s) { return BM.computeSku(s).margin; }).filter(function (x) { return x != null; }));
        return v == null ? { text: 'Нет SKU в расчёте', level: 'bad' } : { text: 'Средняя маржа: ' + v.toFixed(1) + '%', level: v >= 20 ? 'good' : v >= 5 ? 'mid' : 'bad' };
      case 'drr':
        v = avg(p.skus.map(function (s) { return BM.num(s.adPct); }).filter(function (x) { return x != null; }));
        return v == null ? null : { text: 'Плановый ДРР в расчётах SKU: ' + v.toFixed(1) + '%', level: v <= 10 ? 'good' : v <= 20 ? 'mid' : 'bad' };
      case 'revenue':
      case 'share':
        var es = p.entries.slice().sort(function (a, b) { return a.order - b.order; });
        if (!es.length) return null;
        var last = es[es.length - 1];
        var prev = es.filter(function (e) { return e.marketplace === last.marketplace; }).slice(-2)[0];
        var key = id === 'revenue' ? 'ourRevenue' : 'marketShare';
        if (!last[key]) return null;
        var cur = BM.num(last[key]), pv = prev && prev !== last ? BM.num(prev[key]) : null;
        var lv = pv == null || cur == null ? null : cur > pv ? 'good' : cur < pv ? 'bad' : 'mid';
        return { text: (id === 'revenue' ? 'Выручка ' : 'Доля рынка ') + last[key] + (id === 'share' ? '%' : '') + ' · ' + (BM.MP[last.marketplace] ? BM.MP[last.marketplace].label : '') + ', ' + last.weekLabel, level: lv };
    }
    return null;
  }

  // ---------- simulation ----------
  function simulate(start, impulse) {
    var eff = {}, used = {}, frontier = [{ id: start, v: impulse, d: 0 }];
    eff[start] = impulse;
    while (frontier.length) {
      var next = [];
      frontier.forEach(function (f) {
        if (f.d >= 5) return;
        edges.forEach(function (e) {
          if (e.from !== f.id || e.to === start) return;
          var delta = f.v * e.sign * (e.w / 3) * 0.5;
          if (Math.abs(delta) < 0.02) return;
          eff[e.to] = (eff[e.to] || 0) + delta;
          if (used[e.i] == null || used[e.i] > f.d) used[e.i] = f.d;
          next.push({ id: e.to, v: delta, d: f.d + 1 });
        });
      });
      frontier = next;
    }
    var max = 0;
    for (var k in eff) if (k !== start) max = Math.max(max, Math.abs(eff[k]));
    var out = {};
    for (var k2 in eff) out[k2] = k2 === start ? impulse : (max ? eff[k2] / max : 0);
    return { eff: out, used: used };
  }


  // ---------- brain layout (world coordinates) ----------
  var ORDER = {
    0: ['budget', 'team', 'analytics', 'research', 'niche', 'platform', 'packaging', 'product', 'price'],
    1: ['ads', 'external', 'influencers', 'pr', 'smm', 'promo', 'card', 'experiments', 'reviewsWork', 'stock', 'crm', 'community', 'referral', 'bundles'],
    2: ['cac', 'drr', 'reach', 'brandSearch', 'ctr', 'ranking', 'cr', 'buyout', 'rating', 'aov', 'nps', 'repeat', 'wom'],
    3: ['romi', 'unit', 'turnover', 'revenue', 'share', 'ltv', 'ltvcac'],
    4: ['company', 'equity']
  };
  var RX = [960, 750, 535, 320], RYF = 0.78, CORE = { x: 0, y: 60 }, STEM = { x: 0, y: 340 }, TIP = { x: 0, y: 620 };
  var DOT = [7, 6.5, 6, 7.5, 11];
  (function layout() {
    [0, 1, 2, 3].forEach(function (L) {
      var ids = ORDER[L], n = ids.length;
      var spread = [0.62, 0.58, 0.54, 0.46][L], a0 = Math.PI * (1.5 - spread), a1 = Math.PI * (1.5 + spread);
      ids.forEach(function (id, i) {
        var t = a0 + (i + 0.5) / n * (a1 - a0);
        var nd = byId[id];
        nd.x = Math.cos(t) * RX[L]; nd.y = Math.sin(t) * RX[L] * RYF; nd.r = DOT[L];
      });
    });
    byId.company.x = -84; byId.company.y = 262; byId.company.r = DOT[4];
    byId.equity.x = 84; byId.equity.y = 262; byId.equity.r = DOT[4];
  })();

  var NPT = 42;
  function rnd(seed) {
    var s = seed % 2147483647; if (s <= 0) s += 2147483646;
    return function () { s = s * 16807 % 2147483647; return (s - 1) / 2147483646; };
  }
  function makeThread(p0, p1, p2, p3, opt) {
    var base = new Float32Array(NPT * 2), nrm = new Float32Array(NPT * 2);
    for (var i = 0; i < NPT; i++) {
      var t = i / (NPT - 1), u = 1 - t;
      var x = u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x;
      var y = u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y;
      var dx = 3 * u * u * (p1.x - p0.x) + 6 * u * t * (p2.x - p1.x) + 3 * t * t * (p3.x - p2.x);
      var dy = 3 * u * u * (p1.y - p0.y) + 6 * u * t * (p2.y - p1.y) + 3 * t * t * (p3.y - p2.y);
      var len = Math.sqrt(dx * dx + dy * dy) || 1;
      base[i * 2] = x; base[i * 2 + 1] = y; nrm[i * 2] = -dy / len; nrm[i * 2 + 1] = dx / len;
    }
    opt.base = base; opt.nrm = nrm; opt.pts = new Float32Array(NPT * 2);
    return opt;
  }
  var threads = [], fibers = [];
  edges.forEach(function (e) {
    var a = byId[e.from], b = byId[e.to], r = rnd(e.i * 97 + 13), pull = 0.36 + r() * 0.14;
    var p1 = { x: a.x + (CORE.x - a.x) * pull + (r() - 0.5) * 110, y: a.y + (CORE.y - a.y) * pull + (r() - 0.5) * 80 };
    var p2 = { x: b.x + (CORE.x - b.x) * pull + (r() - 0.5) * 110, y: b.y + (CORE.y - b.y) * pull + (r() - 0.5) * 80 };
    e.th = makeThread(a, p1, p2, b, { kind: 'edge', e: e, amp: 3.5 + r() * 4.5, cyc: 1.1 + r() * 1.4, ph: r() * 6.283, w: 0.7 + e.w * 0.28 });
    threads.push(e.th);
  });
  NODES.forEach(function (n, k) {
    var count = n.layer === 0 ? 2 : n.layer === 4 ? 3 : 1;
    n.fibers = [];
    for (var j = 0; j < count; j++) {
      var r = rnd(k * 131 + j * 17 + 7), p1;
      if (n.layer === 4) p1 = { x: n.x * (0.5 + r() * 0.3), y: n.y + 50 + r() * 30 };
      else p1 = { x: n.x + (CORE.x - n.x) * (0.42 + r() * 0.2) + (r() - 0.5) * 140, y: n.y + (CORE.y + 90 - n.y) * 0.55 + (r() - 0.5) * 70 };
      var p2 = { x: (r() - 0.5) * (n.layer === 4 ? 30 : 80), y: STEM.y + (r() - 0.5) * 50 };
      var p3 = { x: (r() - 0.5) * 5, y: TIP.y + r() * 6 };
      var th = makeThread(n, p1, p2, p3, { kind: 'fiber', node: n, amp: 4 + r() * 6, cyc: 0.9 + r() * 1.2, ph: r() * 6.283, w: 0.5 + r() * 0.4 });
      n.fibers.push(th); fibers.push(th); threads.push(th);
    }
  });
  var BOUNDS = (function () {
    var b = { minX: 1e9, maxX: -1e9, minY: 1e9, maxY: -1e9 };
    NODES.forEach(function (n) { b.minX = Math.min(b.minX, n.x); b.maxX = Math.max(b.maxX, n.x); b.minY = Math.min(b.minY, n.y); b.maxY = Math.max(b.maxY, n.y); });
    b.minX -= 240; b.maxX += 240; b.minY -= 50; b.maxY = TIP.y + 40;
    return b;
  })();

  // ---------- view ----------
  BM.views.system = function (nodeId) {
    var ui = BM.ui;
    if (!ui.sysMode) ui.sysMode = 'links';
    if (!ui.sysImpulse) ui.sysImpulse = 1;
    if (!ui.sysStage) ui.sysStage = 'all';
    if (ui.sysProject === undefined) ui.sysProject = BM.state.projects[0] ? BM.state.projects[0].id : '';
    if (ui.sysProject && !BM.project(ui.sysProject)) ui.sysProject = BM.state.projects[0] ? BM.state.projects[0].id : '';
    ui.sysNode = nodeId && byId[nodeId] ? nodeId : (ui.sysNode && byId[ui.sysNode] ? ui.sysNode : null);
    var p = ui.sysProject ? BM.project(ui.sysProject) : null;
    var projSel = BM.state.projects.length ? '<label class="sr-only" for="sys-project">Данные проекта</label><select class="select" id="sys-project"><option value="">Без данных проекта</option>' +
      BM.state.projects.map(function (x) { return '<option value="' + x.id + '"' + (x.id === ui.sysProject ? ' selected' : '') + '>' + esc(x.name) + '</option>'; }).join('') + '</select>' : '';
    var modes = '<div class="sys-seg" role="group" aria-label="Режим"><button type="button" data-sys-mode="links" aria-pressed="' + (ui.sysMode === 'links') + '">' + icon('network', 'sm') + 'Связи</button>' +
      '<button type="button" data-sys-mode="sim" aria-pressed="' + (ui.sysMode === 'sim') + '">' + icon('sparkle', 'sm') + 'Симуляция</button></div>';
    var stageSel = '<label class="sr-only" for="sys-stage-f">Этап воронки AARRR</label><select class="select" id="sys-stage-f">' + STAGES.map(function (x) { return '<option value="' + x.id + '"' + (ui.sysStage === x.id ? ' selected' : '') + '>' + esc(x.id === 'all' ? 'Все этапы AARRR' : x.label) + '</option>'; }).join('') + '</select>';
    var legend = LAYERS.map(function (l) { return '<span><i class="lg-dot l' + l.id + '"></i>' + esc(l.title) + '</span>'; }).join('') +
      '<span><i class="lg-line pos"></i>усиливает</span><span><i class="lg-line neg"></i>снижает</span><span><i class="lg-line in"></i>влияет на выбранный узел</span>' +
      (p ? '<span><i class="lg-hdot"></i>данные проекта «' + esc(p.name) + '»</span>' : '') +
      '<span class="lg-tip">Колесо или щипок — масштаб · перетаскивание — перемещение · двойной клик — приблизить. Подписи показателей и результатов появляются при приближении и наведении.</span>';
    return '<h1 class="sr-only">Система маркетинга</h1>' +
      '<div class="sys-stage" id="sys-stage" tabindex="0" aria-label="Карта системы маркетинга. Плюс и минус — масштаб, ноль — вписать, стрелки — перемещение. Узлы доступны списком в разделе «Все узлы».">' +
        '<canvas class="sys-canvas" aria-hidden="true"></canvas>' +
        '<div class="sys-hud">' +
          '<div class="sys-hud-title glassy"><span class="stat-icon">' + icon('network', 'sm') + '</span><div><b>Система маркетинга</b><small>от действий до бренда</small></div></div>' +
          '<div class="sys-hud-row">' + modes + stageSel + projSel +
            '<button type="button" class="chip glassy-chip" data-sys-dock="presets">' + icon('sparkle', 'sm') + 'Сценарии</button>' +
            '<button type="button" class="chip glassy-chip" data-sys-dock="list">' + icon('tasks', 'sm') + 'Все узлы</button></div>' +
        '</div>' +
        '<div class="sys-ctrl glassy" role="toolbar" aria-label="Масштаб карты">' +
          '<button type="button" class="icon-btn" data-sys-zoom="in" aria-label="Приблизить">' + icon('plus') + '</button>' +
          '<span class="sys-zoom-val num" id="sys-zoom-val" aria-live="polite">100%</span>' +
          '<button type="button" class="icon-btn" data-sys-zoom="out" aria-label="Отдалить">' + icon('minus') + '</button>' +
          '<button type="button" class="icon-btn" data-sys-zoom="fit" aria-label="Вписать карту в экран">' + icon('fit') + '</button>' +
          (document.fullscreenEnabled ? '<button type="button" class="icon-btn" data-sys-zoom="full" aria-label="Развернуть на весь экран">' + icon('expand') + '</button>' : '') +
          '<button type="button" class="icon-btn" data-sys-legend aria-label="Легенда" aria-expanded="false">' + icon('info') + '</button>' +
        '</div>' +
        '<div class="sys-legend glassy" id="sys-legend">' + legend + '</div>' +
        '<aside class="sys-dock" id="sys-panel" aria-label="Подробности"></aside>' +
        '<div class="sys-hint glassy" id="sys-hint" hidden></div>' +
      '</div>';
  };

  // ---------- engine ----------
  var ctl = null, raf = 0;
  BM.systemUnmount = function () {
    if (ctl) ctl.abort();
    ctl = null;
    cancelAnimationFrame(raf); raf = 0;
    document.documentElement.classList.remove('sys-lock');
    if (document.fullscreenElement && document.fullscreenElement.id === 'sys-stage') document.exitFullscreen().catch(function () {});
  };

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  BM.systemMount = function () {
    BM.systemUnmount();
    var stage = document.getElementById('sys-stage');
    if (!stage) return;
    ctl = new AbortController();
    var sig = { signal: ctl.signal };
    document.documentElement.classList.add('sys-lock');
    var cv = stage.querySelector('.sys-canvas'), ctx = cv.getContext('2d');
    var dock = stage.querySelector('#sys-panel');
    var ui = BM.ui;
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var dark = BM.isDark();
    var C = dark ? {
      ink: '214,226,206', baseA: 0.2, fiberA: 0.09, dimA: 0.045, node: '#E6EDE0', label: '#E3EBDD', halo: 'rgba(16,20,16,.86)',
      glow: '190,226,170', inC: '143,200,216', neg: '238,166,124', good: '141,213,143', bad: '244,140,120', shadow: '0,0,0', comp: 'lighter'
    } : {
      ink: '30,36,28', baseA: 0.27, fiberA: 0.12, dimA: 0.05, node: '#222B20', label: '#242D22', halo: 'rgba(238,239,235,.94)',
      glow: '96,146,78', inC: '58,128,150', neg: '196,118,72', good: '52,140,66', bad: '186,66,52', shadow: '30,36,28', comp: 'source-over'
    };
    var rootCs = getComputedStyle(document.documentElement);
    var LC = [0, 1, 2, 3, 4].map(function (i) { return hexRgb(rootCs.getPropertyValue('--c-l' + i).trim() || '#8FA780'); });
    function hexRgb(h) { h = h.replace('#', ''); if (h.length === 3) h = h.replace(/./g, '$&$&'); var n = parseInt(h, 16); return ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255); }

    var dpr = 1, W = 0, H = 0, fitK = 1, view = ui.sysView || null, anim = null, userMoved = !!ui.sysMoved;
    function markMoved(v) { userMoved = v; ui.sysMoved = v; }
    var hoverId = null, pathSel = null, lastSim = null, pulses = [], lastAmb = 0, nextCycle = 0;

    // ----- view transform -----
    function dockW() { return dock.classList.contains('open') && W >= 900 ? dock.offsetWidth + 28 : 0; }
    function fitView() {
      var mobile = W < 1024, sheet = W < 900 && dock.classList.contains('open') ? dock.offsetHeight + 96 : 0;
      var top = mobile ? 132 : 92, bottom = mobile ? Math.max(104, sheet) : 24, side = 16;
      var aw = Math.max(200, W - dockW() - side * 2), ah = Math.max(200, H - top - bottom);
      var bw = BOUNDS.maxX - BOUNDS.minX, bh = BOUNDS.maxY - BOUNDS.minY;
      var k = clamp(Math.min(aw / bw, ah / bh), 0.15, 2);
      fitK = k;
      return { k: k, x: side + (aw - bw * k) / 2 - BOUNDS.minX * k, y: top + (ah - bh * k) / 2 - BOUNDS.minY * k };
    }
    function setView(v, animate) {
      if (!animate || reduce || !view) { view = v; anim = null; ui.sysView = view; showZoom(); requestDraw(); return; }
      anim = { from: view, to: v, start: performance.now(), dur: 420 };
      requestDraw();
    }
    function zoomAt(f, sx, sy, animate) {
      markMoved(true);
      var k = clamp(view.k * f, fitK * 0.35, fitK * 6);
      f = k / view.k;
      setView({ k: k, x: sx - (sx - view.x) * f, y: sy - (sy - view.y) * f }, animate);
    }
    function centerOn(n) {
      var v0 = anim ? anim.to : view;
      var sx = v0.x + n.x * v0.k, sy = v0.y + n.y * v0.k, pad = 90;
      var right = W - dockW();
      if (sx > pad && sx < right - pad && sy > pad + 60 && sy < H - pad - (W < 900 && dock.classList.contains('open') ? H * 0.5 : 0)) return;
      var cx = (right) / 2, cy = W < 900 && dock.classList.contains('open') ? H * 0.28 : H / 2;
      setView({ k: v0.k, x: cx - n.x * v0.k, y: cy - n.y * v0.k }, true);
    }
    function showZoom() {
      var el = stage.querySelector('#sys-zoom-val');
      if (el && view) el.textContent = Math.round(view.k / fitK * 100) + '%';
    }

    function resize() {
      var r = stage.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      var f = fitView();
      if (!view || !userMoved) setView(f, false); else showZoom();
      requestDraw();
    }

    // ----- focus state -----
    function focusId() { return ui.sysNode || hoverId; }
    function stageOn() { return ui.sysStage && ui.sysStage !== 'all'; }
    function inStage(n) { return n.stage === ui.sysStage; }
    function edgeStyle(e) {
      var id = focusId();
      if (pathSel) {
        for (var i = 1; i < pathSel.length; i++) if (e.from === pathSel[i - 1] && e.to === pathSel[i]) return { rgb: e.sign > 0 ? C.glow : C.neg, a: 0.95, hl: true };
        return { dim: true };
      }
      if (!id) {
        if (!stageOn()) return null;
        var sa = inStage(byId[e.from]), sb = inStage(byId[e.to]);
        if (sa && sb) return { rgb: C.glow, a: 0.75, hl: true };
        return sa || sb ? null : { dim: true };
      }
      if (ui.sysMode === 'sim' && ui.sysNode && lastSim) {
        if (lastSim.used[e.i] != null) { var v = lastSim.eff[e.to] || 0; return { rgb: v * byId[e.to].polarity > 0 ? C.good : C.bad, a: 0.85, hl: true }; }
        return { dim: true };
      }
      if (e.from === id) return { rgb: e.sign > 0 ? C.glow : C.neg, a: 0.95, hl: true };
      if (e.to === id) return { rgb: e.sign > 0 ? C.inC : C.neg, a: 0.85, hl: true };
      return { dim: true };
    }
    function nodeState(n) {
      var id = focusId();
      if (pathSel) return pathSel.indexOf(n.id) > -1 ? { on: true } : { dim: true };
      if (!id) return stageOn() ? (inStage(n) ? { on: true } : { dim: true }) : {};
      if (n.id === id) return { sel: true, on: true };
      if (ui.sysMode === 'sim' && ui.sysNode && lastSim) {
        var v = lastSim.eff[n.id];
        if (v == null || Math.abs(v) < 0.04) return { dim: true };
        return { on: true, eff: v, good: v * n.polarity > 0 };
      }
      for (var i = 0; i < edges.length; i++) { var e = edges[i]; if ((e.from === id && e.to === n.id) || (e.to === id && e.from === n.id)) return { on: true }; }
      return { dim: true };
    }

    // ----- drawing -----
    function undulate(th, t) {
      var b = th.base, nm = th.nrm, p = th.pts;
      for (var i = 0; i < NPT; i++) {
        var s = i / (NPT - 1);
        var off = reduce ? 0 : th.amp * Math.sin(Math.PI * s) * Math.sin(6.283 * th.cyc * s - t * 1.15 + th.ph);
        p[i * 2] = b[i * 2] + nm[i * 2] * off;
        p[i * 2 + 1] = b[i * 2 + 1] + nm[i * 2 + 1] * off;
      }
    }
    function addPoly(th, from, to) {
      var p = th.pts;
      ctx.moveTo(p[from * 2], p[from * 2 + 1]);
      for (var i = from + 1; i <= to; i++) ctx.lineTo(p[i * 2], p[i * 2 + 1]);
    }
    function strokeSet(list, rgb, a, px) {
      if (!list.length) return;
      ctx.beginPath();
      list.forEach(function (th) { addPoly(th, 0, NPT - 1); });
      ctx.strokeStyle = 'rgba(' + rgb + ',' + a + ')';
      ctx.lineWidth = px / view.k;
      ctx.stroke();
    }

    function draw(now) {
      var t = now / 1000, k = view.k;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.setTransform(dpr * k, 0, 0, dpr * k, dpr * view.x, dpr * view.y);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';

      // shadow under the stem tip
      ctx.save();
      ctx.translate(TIP.x, TIP.y + 26); ctx.scale(1, 0.12);
      var sg = ctx.createRadialGradient(0, 0, 0, 0, 0, 160);
      sg.addColorStop(0, 'rgba(' + C.shadow + ',.22)'); sg.addColorStop(1, 'rgba(' + C.shadow + ',0)');
      ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(0, 0, 160, 0, 6.283); ctx.fill();
      ctx.restore();

      threads.forEach(function (th) { undulate(th, t); });
      var focus = !!(focusId() || pathSel || stageOn());
      var norm = [], normF = [], dim = [], hls = [];
      edges.forEach(function (e) {
        var s = edgeStyle(e);
        if (!s) norm.push(e.th); else if (s.dim) dim.push(e.th); else hls.push({ th: e.th, s: s });
      });
      var selN = ui.sysNode || hoverId;
      fibers.forEach(function (th) {
        if (!focus) { normF.push(th); return; }
        var ns = nodeState(th.node);
        if (selN && th.node.id === selN) hls.push({ th: th, s: { rgb: C.glow, a: 0.55, hl: true, fiber: true } });
        else if (ns.on && !ns.sel) normF.push(th);
        else dim.push(th);
      });
      strokeSet(dim, C.ink, C.dimA, 0.8);
      strokeSet(normF, C.ink, focus ? C.fiberA * 0.7 : C.fiberA, 0.75);
      strokeSet(norm, C.ink, C.baseA, 1);

      ctx.globalCompositeOperation = C.comp;
      hls.forEach(function (h) {
        ctx.beginPath(); addPoly(h.th, 0, NPT - 1);
        ctx.strokeStyle = 'rgba(' + h.s.rgb + ',' + (h.s.a * 0.16) + ')'; ctx.lineWidth = (h.s.fiber ? 3 : 5) / k; ctx.stroke();
        ctx.strokeStyle = 'rgba(' + h.s.rgb + ',' + h.s.a + ')'; ctx.lineWidth = (h.s.fiber ? 0.9 : 1.2 + h.th.w * 0.6) / k; ctx.stroke();
      });

      // pulses travelling along threads
      pulses = pulses.filter(function (pl) {
        var q = (now - pl.start) / pl.dur;
        if (q < 0) return true;
        if (q >= 1) return false;
        var s = q < 0.5 ? 2 * q * q : 1 - Math.pow(-2 * q + 2, 2) / 2;
        var head = s * (NPT - 1), hi = Math.min(NPT - 1, Math.ceil(head)), lo = Math.max(0, Math.floor(head - pl.tail));
        if (hi <= lo) return true;
        var p = pl.th.pts, fade = q < 0.12 ? q / 0.12 : q > 0.88 ? (1 - q) / 0.12 : 1;
        var g = ctx.createLinearGradient(p[lo * 2], p[lo * 2 + 1], p[hi * 2], p[hi * 2 + 1]);
        g.addColorStop(0, 'rgba(' + pl.rgb + ',0)'); g.addColorStop(1, 'rgba(' + pl.rgb + ',' + (pl.a * fade) + ')');
        ctx.beginPath(); addPoly(pl.th, lo, hi);
        ctx.strokeStyle = g;
        ctx.globalAlpha = 0.22; ctx.lineWidth = 7 / k; ctx.stroke();
        ctx.globalAlpha = 0.55; ctx.lineWidth = 3.2 / k; ctx.stroke();
        ctx.globalAlpha = 1; ctx.lineWidth = 1.5 / k; ctx.stroke();
        var hx = p[hi * 2], hy = p[hi * 2 + 1], rr = 9 / k;
        var hg = ctx.createRadialGradient(hx, hy, 0, hx, hy, rr);
        hg.addColorStop(0, 'rgba(' + pl.rgb + ',' + (0.9 * fade * pl.a) + ')'); hg.addColorStop(1, 'rgba(' + pl.rgb + ',0)');
        ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(hx, hy, rr, 0, 6.283); ctx.fill();
        return true;
      });
      ctx.globalCompositeOperation = 'source-over';

      // nodes + labels in screen space
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var p = ui.sysProject ? BM.project(ui.sysProject) : null;
      var narrow = W < 900, showAll = k / fitK >= (narrow ? 1.8 : 1.1);
      NODES.forEach(function (n) {
        var st = nodeState(n);
        var sx = view.x + n.x * k, sy = view.y + n.y * k;
        if (sx < -200 || sx > W + 200 || sy < -100 || sy > H + 100) return;
        var rs = n.r * clamp(Math.pow(k / fitK, 0.5), 0.75, 1.9) * (W < 600 ? 0.6 : 1);
        var breathe = reduce ? 0 : Math.sin(t * 2.2 + n.x * 0.01) * 0.5 + 0.5;
        var gc = st.eff != null ? (st.good ? C.good : C.bad) : LC[n.layer];
        var ga = st.dim ? 0.06 : st.sel ? 0.55 : st.eff != null ? 0.25 + Math.abs(st.eff) * 0.4 : (focus && st.on ? 0.4 : 0.22 + breathe * 0.08);
        var gr = rs * (st.sel ? 4.2 + breathe * 0.8 : 3.2);
        var grd = ctx.createRadialGradient(sx, sy, 0, sx, sy, gr);
        grd.addColorStop(0, 'rgba(' + gc + ',' + ga + ')'); grd.addColorStop(1, 'rgba(' + gc + ',0)');
        ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(sx, sy, gr, 0, 6.283); ctx.fill();
        ctx.globalAlpha = st.dim ? 0.3 : 1;
        ctx.fillStyle = C.node; ctx.beginPath(); ctx.arc(sx, sy, rs, 0, 6.283); ctx.fill();
        if (st.sel) { ctx.strokeStyle = 'rgba(' + C.glow + ',.95)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sx, sy, rs + 4.5 + breathe * 1.5, 0, 6.283); ctx.stroke(); }
        var h = p ? health(n.id, p) : null;
        if (h && h.level) {
          ctx.fillStyle = h.level === 'good' ? 'rgb(' + C.good + ')' : h.level === 'mid' ? '#C8961F' : 'rgb(' + C.bad + ')';
          ctx.strokeStyle = dark ? '#101410' : '#fff'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(sx + rs * 0.85, sy - rs * 0.85, 3.6, 0, 6.283); ctx.fill(); ctx.stroke();
        }
        if (!(showAll || (!narrow && (n.layer === 0 || n.layer === 1)) || n.layer === 4 || st.on || st.sel || n.id === hoverId) || (focus && st.dim && !showAll)) { ctx.globalAlpha = 1; return; }
        var dx = n.x - CORE.x, dy = n.y - (CORE.y - 40), dl = Math.sqrt(dx * dx + dy * dy) || 1, ux = dx / dl, uy = dy / dl;
        var lx, ly, al, bl;
        if (n.layer === 4) { lx = sx + (n.x < 0 ? -1 : 1) * (rs + 8); ly = sy; al = n.x < 0 ? 'right' : 'left'; bl = 'middle'; }
        else {
          lx = sx + ux * (rs + 7); ly = sy + uy * (rs + 7);
          al = ux < -0.3 ? 'right' : ux > 0.3 ? 'left' : 'center';
          bl = uy < -0.35 ? 'bottom' : uy > 0.35 ? 'top' : 'middle';
        }
        var label = (st.eff != null ? (st.eff > 0 ? '↑ ' : '↓ ') : '') + n.label;
        var fs = clamp(Math.sqrt(k / 0.75), 0.84, 1.12);
        ctx.font = (n.layer === 4 ? '700 ' + (14 * fs).toFixed(1) : (st.sel ? '700 ' : '500 ') + (12.5 * fs).toFixed(1)) + 'px Onest, system-ui, sans-serif';
        ctx.textAlign = al; ctx.textBaseline = bl;
        ctx.lineWidth = 4; ctx.strokeStyle = C.halo; ctx.strokeText(label, lx, ly);
        ctx.fillStyle = st.eff != null ? 'rgb(' + (st.good ? C.good : C.bad) + ')' : C.label;
        ctx.globalAlpha = st.dim ? 0.35 : 1;
        ctx.fillText(label, lx, ly);
        ctx.globalAlpha = 1;
      });
    }

    // ----- pulses -----
    function spawn(th, delay, rgb, a, dur, tail) {
      pulses.push({ th: th, start: performance.now() + (delay || 0), dur: dur || 1500, rgb: rgb || C.glow, a: a == null ? 1 : a, tail: tail || 11 });
    }
    function cycle(now) {
      if (pathSel) {
        pathSel.forEach(function (nid, i) {
          if (!i) return;
          edges.forEach(function (e) { if (e.from === pathSel[i - 1] && e.to === nid) spawn(e.th, (i - 1) * 650, e.sign > 0 ? C.glow : C.neg, 1, 1100, 13); });
        });
        nextCycle = now + 650 * pathSel.length + 1600;
      } else if (ui.sysNode && ui.sysMode === 'sim' && lastSim) {
        var maxD = 0;
        Object.keys(lastSim.used).forEach(function (i) {
          var e = edges[i], v = lastSim.eff[e.to] || 0, d = lastSim.used[i];
          maxD = Math.max(maxD, d);
          spawn(e.th, d * 560, v * byId[e.to].polarity > 0 ? C.good : C.bad, 0.95, 1150, 12);
        });
        nextCycle = now + (maxD + 1) * 560 + 1700;
      } else if (ui.sysNode) {
        edges.forEach(function (e) {
          if (e.from === ui.sysNode) spawn(e.th, Math.random() * 250, e.sign > 0 ? C.glow : C.neg, 1, 1500);
          if (e.to === ui.sysNode) spawn(e.th, 500 + Math.random() * 300, e.sign > 0 ? C.inC : C.neg, 0.9, 1500);
        });
        byId[ui.sysNode].fibers.forEach(function (th, j) { spawn(th, 900 + j * 200, C.glow, 0.7, 2000, 14); });
        nextCycle = now + 2600;
      }
    }
    function ambient(now) {
      if (focusId() || pathSel || pulses.length > 16 || now - lastAmb < 170) return;
      lastAmb = now;
      var pool;
      if (stageOn()) {
        pool = edges.filter(function (e) { return inStage(byId[e.from]) && inStage(byId[e.to]); }).map(function (e) { return e.th; });
        if (!pool.length) pool = edges.filter(function (e) { return inStage(byId[e.from]) || inStage(byId[e.to]); }).map(function (e) { return e.th; });
      } else pool = Math.random() < 0.55 ? fibers : threads;
      spawn(pool[Math.floor(Math.random() * pool.length)], 0, C.glow, dark ? 0.75 : 0.6, 1900 + Math.random() * 1000, 12);
    }

    // ----- loop -----
    function frame(now) {
      raf = 0;
      if (!ctl) return;
      if (anim) {
        var q = Math.min(1, (now - anim.start) / anim.dur), e = 1 - Math.pow(1 - q, 3);
        view = { k: anim.from.k + (anim.to.k - anim.from.k) * e, x: anim.from.x + (anim.to.x - anim.from.x) * e, y: anim.from.y + (anim.to.y - anim.from.y) * e };
        if (q >= 1) { view = anim.to; anim = null; }
        ui.sysView = view; showZoom();
      }
      if (!reduce) {
        if (now >= nextCycle && (ui.sysNode || pathSel)) cycle(now);
        ambient(now);
      }
      draw(now);
      if (!document.hidden && (!reduce || anim)) raf = requestAnimationFrame(frame);
    }
    function requestDraw() { if (!raf && ctl) raf = requestAnimationFrame(frame); }

    // ----- dock (details panel) -----
    function relItem(e, other) {
      var n = byId[other];
      return '<li><button type="button" class="sys-rel" data-sys-node="' + n.id + '"><span class="sys-rel-sign ' + (e.sign > 0 ? 'pos' : 'neg') + '" aria-hidden="true">' + (e.sign > 0 ? '+' : '−') + '</span>' +
        '<span><b>' + esc(n.label) + '</b><small>' + (e.sign > 0 ? 'усиливает' : 'снижает') + ' · ' + esc(e.why) + '</small></span></button></li>';
    }
    function closeBtn() { return '<button type="button" class="icon-btn sm" data-sys-close aria-label="Закрыть панель">' + icon('x', 'sm') + '</button>'; }
    function renderDock() {
      var p = ui.sysProject ? BM.project(ui.sysProject) : null, html = '';
      if (pathSel) {
        var pr = PRESETS.filter(function (x) { return x.path === pathSel; })[0];
        html = '<div class="sys-p-head"><span class="eyebrow">Цепочка</span>' + closeBtn() + '</div><h2>' + esc(pr.title) + '</h2><p class="muted small" style="margin-top:6px">' + esc(pr.text) + '</p>' +
          '<ol class="sys-path">' + pathSel.map(function (nid, i) {
            var e = i ? edges.filter(function (x) { return x.from === pathSel[i - 1] && x.to === nid; })[0] : null;
            return '<li><button type="button" class="sys-rel" data-sys-node="' + nid + '"><span><b>' + esc(byId[nid].label) + '</b><small>' + (e ? esc(e.why) : 'старт') + '</small></span></button></li>';
          }).join('') + '</ol>';
      } else if (ui.sysNode) {
        var n = byId[ui.sysNode], h = health(n.id, p);
        var head = '<div class="sys-p-head"><span class="eyebrow"><i class="lg-dot l' + n.layer + '"></i>' + esc(LAYERS[n.layer].title) + ' · ' + esc(stageLabel[n.stage]) + '</span>' + closeBtn() + '</div>' +
          '<h2>' + esc(n.label) + '</h2><p class="small" style="color:var(--primary-ink);font-weight:600;margin-top:4px">' + (n.polarity > 0 ? 'Чем выше — тем лучше' : 'Чем ниже — тем лучше') + '</p>' +
          '<p style="margin-top:10px">' + esc(n.desc) + '</p>' +
          '<div class="sys-measure"><small>Где смотреть и как считать</small>' + esc(n.measure) + '</div>' +
          (h ? '<div class="sys-health h-' + (h.level || 'none') + '"><small>' + esc(p.name) + '</small>' + esc(h.text) + '</div>' : '');
        if (ui.sysMode === 'sim') {
          var sim = lastSim || simulate(n.id, ui.sysImpulse);
          var list = Object.keys(sim.eff).filter(function (k) { return k !== n.id && Math.abs(sim.eff[k]) >= 0.04; })
            .sort(function (a, b) { return Math.abs(sim.eff[b]) - Math.abs(sim.eff[a]); }).slice(0, 10);
          html = head + '<div class="sys-seg" role="group" aria-label="Направление" style="margin-top:14px"><button type="button" data-sys-impulse="1" aria-pressed="' + (ui.sysImpulse > 0) + '">Если вырастет ↑</button><button type="button" data-sys-impulse="-1" aria-pressed="' + (ui.sysImpulse < 0) + '">Если снизится ↓</button></div>' +
            '<h3 style="margin-top:16px">Что изменится</h3><ul class="sys-effects">' + list.map(function (k) {
              var v = sim.eff[k], good = v * byId[k].polarity > 0;
              return '<li><button type="button" class="sys-rel" data-sys-node="' + k + '"><span class="sys-eff-arrow ' + (good ? 'good' : 'bad') + '" aria-hidden="true">' + (v > 0 ? '↑' : '↓') + '</span><span style="flex:1"><b>' + esc(byId[k].label) + '</b><small>' + (v > 0 ? 'растёт' : 'снижается') + ' · ' + (good ? 'хорошо' : 'плохо') + '</small>' +
                '<span class="sys-bar ' + (good ? 'good' : 'bad') + '"><i style="width:' + Math.round(Math.abs(v) * 100) + '%"></i></span></span></button></li>';
            }).join('') + '</ul><p class="small muted" style="margin-top:10px">Сила влияния ослабевает с каждым шагом цепочки. Это модель причинно-следственных связей, а не прогноз в цифрах.</p>';
        } else {
          var outs = edges.filter(function (e) { return e.from === n.id; }).sort(function (a, b) { return b.w - a.w; });
          var ins = edges.filter(function (e) { return e.to === n.id; }).sort(function (a, b) { return b.w - a.w; });
          html = head +
            '<h3 style="margin-top:16px">Влияет на · ' + outs.length + '</h3><ul class="sys-rels">' + outs.map(function (e) { return relItem(e, e.to); }).join('') + '</ul>' +
            '<h3 style="margin-top:14px">Зависит от · ' + ins.length + '</h3><ul class="sys-rels">' + (ins.length ? ins.map(function (e) { return relItem(e, e.from); }).join('') : '<li class="small muted" style="padding:8px">Стартовая точка системы — задаётся решениями команды.</li>') + '</ul>' +
            '<button type="button" class="btn soft block" style="margin-top:14px" data-sys-mode="sim">' + icon('sparkle', 'sm') + 'Смоделировать влияние</button>';
        }
      } else if (ui.sysDock === 'list') {
        html = '<div class="sys-p-head"><h2>Все узлы</h2>' + closeBtn() + '</div>' + LAYERS.map(function (l) {
          return '<h3 class="sys-list-h"><i class="lg-dot l' + l.id + '"></i>' + esc(l.title) + '</h3><ul class="sys-rels">' + ORDER[l.id].map(function (id) {
            return '<li><button type="button" class="sys-rel" data-sys-node="' + id + '"><span><b>' + esc(byId[id].label) + '</b><small>' + esc(byId[id].desc.split('.')[0]) + '</small></span></button></li>';
          }).join('') + '</ul>';
        }).join('');
      } else if (ui.sysDock === 'presets') {
        html = '<div class="sys-p-head"><h2>Сценарии</h2>' + closeBtn() + '</div><div class="sys-measure" style="margin:0 0 12px"><small>Как читать карту</small>Воронка AARRR: привлечение → активация → удержание → рекомендации → монетизация. Фундамент питает все этапы, бренд и контент проходят через всю воронку. Северная звезда товарного бизнеса на маркетплейсе — <b>LTV / CAC</b>, цель от 3 к 1.</div><p class="muted small" style="margin:0 0 12px">Выберите сценарий, этап воронки в фильтре сверху или нажмите на любую точку карты.</p><div class="stack" style="gap:8px">' +
          PRESETS.map(function (x, i) { return '<button type="button" class="sys-preset" data-sys-preset="' + i + '"><b>' + esc(x.title) + '</b><small>' + esc(x.text) + '</small></button>'; }).join('') + '</div>';
      }
      var open = !!html;
      var wasOpen = dock.classList.contains('open');
      dock.innerHTML = html;
      dock.classList.toggle('open', open);
      if (wasOpen !== open && view && !userMoved) setView(fitView(), true);
      stage.classList.toggle('dock-open', open);
      stage.querySelectorAll('[data-sys-dock]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.sysDock === ui.sysDock && !ui.sysNode && !pathSel); });
      stage.querySelectorAll('.sys-hud [data-sys-mode]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.sysMode === ui.sysMode); });
    }

    function refresh() {
      lastSim = ui.sysNode && ui.sysMode === 'sim' ? simulate(ui.sysNode, ui.sysImpulse) : null;
      renderDock();
      pulses = [];
      nextCycle = 0;
      requestDraw();
    }
    function select(id, center) {
      pathSel = null;
      ui.sysNode = id;
      if (!id && ui.sysDock === 'node') ui.sysDock = null;
      if (id) ui.sysDock = 'node';
      history.replaceState(null, '', '#/system' + (id ? '/' + id : ''));
      refresh();
      if (id && center) centerOn(byId[id]);
    }
    function nodeAt(x, y) {
      var best = null, bd = 1e9;
      NODES.forEach(function (n) {
        var sx = view.x + n.x * view.k, sy = view.y + n.y * view.k;
        var rs = n.r * clamp(Math.pow(view.k / fitK, 0.5), 0.75, 1.9) * (W < 600 ? 0.6 : 1) + (W < 600 ? 12 : 10);
        var d = Math.hypot(sx - x, sy - y);
        if (d < rs && d < bd) { bd = d; best = n; }
      });
      return best;
    }

    // ----- input -----
    var pointers = new Map(), drag = null, pinch = null;
    function local(e) { var r = stage.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    cv.addEventListener('pointerdown', function (e) {
      cv.setPointerCapture(e.pointerId);
      var pt = local(e);
      pointers.set(e.pointerId, pt);
      if (pointers.size === 1) drag = { x: pt.x, y: pt.y, vx: view.x, vy: view.y, moved: false };
      else if (pointers.size === 2) {
        var ps = Array.from(pointers.values());
        pinch = { d: Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y), k: view.k, vx: view.x, vy: view.y, cx: (ps[0].x + ps[1].x) / 2, cy: (ps[0].y + ps[1].y) / 2 };
        drag = null;
      }
    }, sig);
    cv.addEventListener('pointermove', function (e) {
      var pt = local(e);
      if (pointers.has(e.pointerId)) pointers.set(e.pointerId, pt);
      if (pinch && pointers.size === 2) {
        var ps = Array.from(pointers.values());
        var d = Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y), mx = (ps[0].x + ps[1].x) / 2, my = (ps[0].y + ps[1].y) / 2;
        var k = clamp(pinch.k * d / (pinch.d || 1), fitK * 0.35, fitK * 6);
        var wx = (pinch.cx - pinch.vx) / pinch.k, wy = (pinch.cy - pinch.vy) / pinch.k;
        markMoved(true);
        setView({ k: k, x: mx - wx * k, y: my - wy * k });
        return;
      }
      if (drag) {
        var dx = pt.x - drag.x, dy = pt.y - drag.y;
        if (!drag.moved && Math.hypot(dx, dy) > 5) { drag.moved = true; cv.classList.add('grabbing'); }
        if (drag.moved) { markMoved(true); setView({ k: view.k, x: drag.vx + dx, y: drag.vy + dy }); }
        return;
      }
      if (e.pointerType === 'mouse') {
        var n = nodeAt(pt.x, pt.y), id = n ? n.id : null;
        cv.classList.toggle('pointing', !!n);
        if (id !== hoverId) { hoverId = id; if (!ui.sysNode && !pathSel) { nextCycle = 0; requestDraw(); } }
      }
    }, sig);
    function up(e) {
      var pt = local(e);
      pointers.delete(e.pointerId);
      if (pinch && pointers.size < 2) { pinch = null; drag = null; return; }
      if (drag && !drag.moved && e.type === 'pointerup') {
        var n = nodeAt(pt.x, pt.y);
        if (n) select(n.id === ui.sysNode ? null : n.id);
        else if (ui.sysNode || pathSel) select(null);
      }
      drag = null; cv.classList.remove('grabbing');
    }
    cv.addEventListener('pointerup', up, sig);
    cv.addEventListener('pointercancel', up, sig);
    cv.addEventListener('pointerleave', function () { if (hoverId && !drag) { hoverId = null; cv.classList.remove('pointing'); requestDraw(); } }, sig);
    cv.addEventListener('dblclick', function (e) { var pt = local(e); zoomAt(1.7, pt.x, pt.y, true); }, sig);
    stage.addEventListener('wheel', function (e) {
      if (e.target.closest('.sys-dock, .sys-legend')) return;
      e.preventDefault();
      var pt = local(e), d = e.deltaY * (e.deltaMode === 1 ? 16 : 1);
      zoomAt(Math.exp(-d * 0.0018), pt.x, pt.y);
    }, { passive: false, signal: ctl.signal });
    stage.addEventListener('keydown', function (e) {
      if (e.target !== stage) return;
      var step = 80;
      if (e.key === '+' || e.key === '=') zoomAt(1.25, W / 2, H / 2, true);
      else if (e.key === '-' || e.key === '_') zoomAt(0.8, W / 2, H / 2, true);
      else if (e.key === '0') { markMoved(false); setView(fitView(), true); }
      else if (e.key === 'ArrowLeft') setView({ k: view.k, x: view.x + step, y: view.y }, true);
      else if (e.key === 'ArrowRight') setView({ k: view.k, x: view.x - step, y: view.y }, true);
      else if (e.key === 'ArrowUp') setView({ k: view.k, x: view.x, y: view.y + step }, true);
      else if (e.key === 'ArrowDown') setView({ k: view.k, x: view.x, y: view.y - step }, true);
      else return;
      e.preventDefault();
    }, sig);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && (ui.sysNode || pathSel || ui.sysDock) && !document.querySelector('dialog[open]') && !document.fullscreenElement) { ui.sysDock = null; select(null); }
    }, sig);

    stage.addEventListener('click', function (e) {
      var t;
      if ((t = e.target.closest('[data-sys-node]'))) { select(t.dataset.sysNode, true); return; }
      if ((t = e.target.closest('[data-sys-mode]'))) { ui.sysMode = t.dataset.sysMode; refresh(); return; }
      if ((t = e.target.closest('[data-sys-impulse]'))) { ui.sysImpulse = +t.dataset.sysImpulse; refresh(); return; }
      if (e.target.closest('[data-sys-close]')) { ui.sysDock = null; if (ui.sysNode || pathSel) select(null); else refresh(); return; }
      if ((t = e.target.closest('[data-sys-dock]'))) {
        var want = t.dataset.sysDock;
        pathSel = null; ui.sysNode = null; history.replaceState(null, '', '#/system');
        ui.sysDock = ui.sysDock === want ? null : want;
        refresh(); return;
      }
      if ((t = e.target.closest('[data-sys-preset]'))) {
        var pr = PRESETS[+t.dataset.sysPreset];
        if (pr.path) { ui.sysNode = null; pathSel = pr.path; history.replaceState(null, '', '#/system'); refresh(); return; }
        ui.sysMode = pr.mode; if (pr.impulse) ui.sysImpulse = pr.impulse;
        select(pr.node, true); return;
      }
      if ((t = e.target.closest('[data-sys-zoom]'))) {
        var z = t.dataset.sysZoom;
        if (z === 'in') zoomAt(1.35, (W - dockW()) / 2, H / 2, true);
        else if (z === 'out') zoomAt(1 / 1.35, (W - dockW()) / 2, H / 2, true);
        else if (z === 'fit') { markMoved(false); setView(fitView(), true); }
        else if (z === 'full') {
          if (document.fullscreenElement) document.exitFullscreen().catch(function () {});
          else stage.requestFullscreen().catch(function () { BM.toast('Браузер не разрешил полноэкранный режим'); });
        }
        return;
      }
      if ((t = e.target.closest('[data-sys-legend]'))) {
        var on = !stage.classList.contains('legend-open');
        stage.classList.toggle('legend-open', on); t.setAttribute('aria-expanded', on);
        try { localStorage.setItem('bmh-sys-legend', on ? '1' : '0'); } catch (err) {}
      }
    }, sig);
    stage.addEventListener('change', function (e) {
      if (e.target.id === 'sys-project') { ui.sysProject = e.target.value; BM.render(); }
      if (e.target.id === 'sys-stage-f') {
        ui.sysStage = e.target.value; pathSel = null; ui.sysNode = null;
        if (ui.sysDock === 'node') ui.sysDock = null;
        history.replaceState(null, '', '#/system');
        refresh();
      }
    }, sig);
    document.addEventListener('fullscreenchange', function () {
      var b = stage.querySelector('[data-sys-zoom="full"]');
      if (b) b.setAttribute('aria-label', document.fullscreenElement ? 'Выйти из полноэкранного режима' : 'Развернуть на весь экран');
      setTimeout(function () { setView(fitView(), true); }, 120);
    }, sig);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) requestDraw(); }, sig);

    var ro = new ResizeObserver(resize);
    ro.observe(stage);
    ctl.signal.addEventListener('abort', function () { ro.disconnect(); });

    // initial state
    var legendPref = null;
    try { legendPref = localStorage.getItem('bmh-sys-legend'); } catch (err) {}
    var wide = window.innerWidth >= 1024;
    var legendOn = legendPref ? legendPref === '1' : wide;
    stage.classList.toggle('legend-open', legendOn);
    var lb = stage.querySelector('[data-sys-legend]'); if (lb) lb.setAttribute('aria-expanded', legendOn);
    if (!ui.sysNode && ui.sysDock === undefined) ui.sysDock = null;
    if (ui.sysNode) ui.sysDock = 'node';
    renderDock();
    resize();
    refresh();
    var hint = stage.querySelector('#sys-hint'), seen = null;
    try { seen = localStorage.getItem('bmh-sys-hint'); } catch (err) {}
    if (!seen) {
      hint.textContent = matchMedia('(pointer: coarse)').matches ? 'Щипок — масштаб · проведите пальцем — перемещение · нажмите на точку' : 'Колесо — масштаб · перетаскивание — перемещение · нажмите на точку';
      hint.hidden = false;
      setTimeout(function () { hint.hidden = true; }, 5000);
      try { localStorage.setItem('bmh-sys-hint', '1'); } catch (err) {}
    }
  };
})();
