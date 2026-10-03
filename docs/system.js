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


  // ---------- shared constants ----------
  var ORDER = {
    0: ['budget', 'team', 'analytics', 'research', 'niche', 'platform', 'packaging', 'product', 'price'],
    1: ['ads', 'external', 'influencers', 'pr', 'smm', 'promo', 'card', 'experiments', 'reviewsWork', 'stock', 'crm', 'community', 'referral', 'bundles'],
    2: ['cac', 'drr', 'reach', 'brandSearch', 'ctr', 'ranking', 'cr', 'buyout', 'rating', 'aov', 'nps', 'repeat', 'wom'],
    3: ['romi', 'unit', 'turnover', 'revenue', 'share', 'ltv', 'ltvcac'],
    4: ['company', 'equity']
  };
  var ORDER_IDX = {};
  Object.keys(ORDER).forEach(function (L) { ORDER[L].forEach(function (id, i) { ORDER_IDX[id] = i; }); });
  var STAGE_C = { found: '#7FA7B5', acq: '#8FA780', act: '#D0AE5E', ret: '#C98F6B', ref: '#A596C8', rev: '#6E9E9A', brand: '#5B7550' };
  var CLUSTERS = ['found', 'acq', 'act', 'ret', 'ref', 'rev'];
  var CLUSTER_TITLE = { found: 'Фундамент', acq: 'Привлечение', act: 'Активация', ret: 'Удержание', ref: 'Рекомендации', rev: 'Монетизация', brand: 'Бренд и компания' };
  var TYPES = [
    { id: 'all', label: 'Все типы узлов' }, { id: '0', label: 'Фундамент и ресурсы' }, { id: '1', label: 'Действия' },
    { id: '2', label: 'Показатели' }, { id: '3', label: 'Результаты' }, { id: '4', label: 'Бренд и компания' }
  ];
  var SLICES = [
    { id: 'overview', label: 'Обзор', icon: 'network' },
    { id: 'cause', label: 'Причины и следствия', icon: 'arrowR' },
    { id: 'money', label: 'Деньги', icon: 'chart' }
  ];
  var LAYER_R = [8, 7, 6.5, 7.5, 12];
  function clusterOf(n) { return n.layer === 4 ? 'brand' : n.stage === 'all' ? 'found' : n.stage; }
  function hexRgb(h) { h = h.replace('#', ''); var v = parseInt(h, 16); return ((v >> 16) & 255) + ',' + ((v >> 8) & 255) + ',' + (v & 255); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function rnd(seed) {
    var s = seed % 2147483647; if (s <= 0) s += 2147483646;
    return function () { s = s * 16807 % 2147483647; return (s - 1) / 2147483646; };
  }

  // ---------- money driver trees ----------
  var MONEY = [
    { id: 'm_profit', label: 'Прибыль', node: 'company', formula: 'Выручка − Расходы', desc: 'То, ради чего работает вся система. Растёт двумя путями: больше выручки или меньше расходов на каждый рубль выручки.', children: ['m_rev', 'm_cost'] },
    { id: 'm_rev', label: 'Выручка', node: 'revenue', op: '+', formula: 'Новые + повторные покупки', desc: 'Деньги от выкупленных заказов новых и вернувшихся покупателей.', children: ['m_newrev', 'm_reprev'] },
    { id: 'm_newrev', label: 'Выручка с новых покупателей', op: '+', formula: 'Трафик × CR × выкуп × средний чек', desc: 'Четыре множителя: улучшение любого из них на 10% даёт +10% к этой выручке.', children: ['m_traffic', 'm_cr', 'm_buyout', 'm_aov'] },
    { id: 'm_traffic', label: 'Трафик в карточку', op: '×', formula: 'Показы × CTR', desc: 'Сколько людей перешло в карточку из выдачи, рекламы и внешних источников.', children: ['m_impr', 'm_ctr'] },
    { id: 'm_impr', label: 'Показы', op: '×', formula: 'Органика + реклама + внешний + бренд', desc: 'Сколько раз карточку увидели. Органика и брендовый спрос — бесплатные, реклама и внешний трафик — платные.', children: ['m_rank', 'm_ads', 'm_ext', 'm_brand'] },
    { id: 'm_rank', label: 'Органика', node: 'ranking', op: '+', formula: 'Позиции в поиске' },
    { id: 'm_ads', label: 'Реклама на МП', node: 'ads', op: '+', formula: 'Платные показы' },
    { id: 'm_ext', label: 'Внешний трафик', node: 'external', op: '+', formula: 'VK, Директ, соцсети' },
    { id: 'm_brand', label: 'Брендовый спрос', node: 'brandSearch', op: '+', formula: 'Поиск по названию' },
    { id: 'm_ctr', label: 'CTR', node: 'ctr', op: '×', formula: 'Клики ÷ показы' },
    { id: 'm_cr', label: 'Конверсия', node: 'cr', op: '×', formula: 'Заказы ÷ переходы' },
    { id: 'm_buyout', label: 'Доля выкупа', node: 'buyout', op: '×', formula: 'Выкуплено ÷ заказано' },
    { id: 'm_aov', label: 'Средний чек', node: 'aov', op: '×', formula: 'Выручка ÷ заказы' },
    { id: 'm_reprev', label: 'Выручка с повторных', op: '+', formula: 'Покупатели × доля повторных × чек', desc: 'Деньги без затрат на привлечение — самый дешёвый рост.', children: ['m_repeat', 'm_aov2'] },
    { id: 'm_repeat', label: 'Повторные покупки', node: 'repeat', op: '×', formula: 'Доля вернувшихся' },
    { id: 'm_aov2', label: 'Средний чек', node: 'aov', op: '×', formula: 'Наборы и допродажи' },
    { id: 'm_cost', label: 'Расходы', op: '−', formula: 'Себестоимость + МП + реклама + маркетинг + налог', desc: 'Всё, что вычитается из выручки. Реклама считается как ДРР × выручка.', children: ['m_cogs', 'm_mp', 'm_adcost', 'm_mkt', 'm_tax'] },
    { id: 'm_cogs', label: 'Себестоимость и упаковка', node: 'product', op: '+', formula: 'На единицу товара' },
    { id: 'm_mp', label: 'Комиссия и логистика МП', op: '+', formula: 'Комиссия % + доставка', desc: 'Тарифы площадки: комиссия категории, логистика до склада и до покупателя, хранение.' },
    { id: 'm_adcost', label: 'Реклама на МП', node: 'drr', op: '+', formula: 'ДРР × выручка' },
    { id: 'm_mkt', label: 'Блогеры, SMM, PR', op: '+', formula: 'Внешний маркетинг', desc: 'Расходы на продвижение вне площадки: входят в CAC вместе с рекламой.' },
    { id: 'm_tax', label: 'Налог', op: '+', formula: '% от выручки', desc: 'Налог по выбранной системе налогообложения.' },

    { id: 'k_root', label: 'LTV / CAC', node: 'ltvcac', formula: 'LTV ÷ CAC, цель ≥ 3', desc: 'Северная звезда: окупается ли покупатель с учётом всех будущих покупок.', children: ['k_ltv', 'k_cac'] },
    { id: 'k_ltv', label: 'LTV', node: 'ltv', op: '÷', formula: 'Чек × частота × маржинальность', desc: 'Маржа, которую покупатель приносит за всё время.', children: ['k_aov', 'k_freq', 'k_margin'] },
    { id: 'k_aov', label: 'Средний чек', node: 'aov', op: '×', formula: 'Наборы, допродажи, цена' },
    { id: 'k_freq', label: 'Частота покупок', node: 'repeat', op: '×', formula: 'CRM, сообщество, качество' },
    { id: 'k_margin', label: 'Маржинальность', node: 'unit', op: '×', formula: 'Прибыль с единицы ÷ цена' },
    { id: 'k_cac', label: 'CAC', node: 'cac', op: '÷', formula: 'Расходы на привлечение ÷ новые покупатели', desc: 'Сколько стоит один новый покупатель со всеми расходами.', children: ['k_spend', 'k_new'] },
    { id: 'k_spend', label: 'Расходы на привлечение', node: 'ads', op: '×', formula: 'Реклама + блогеры + внешний + PR' },
    { id: 'k_new', label: 'Новые покупатели', node: 'cr', op: '÷', formula: 'Трафик × конверсия' }
  ];
  var MONEY_BY = {};
  MONEY.forEach(function (m) { MONEY_BY[m.id] = m; });

  // ---------- geometry ----------
  var NPT = 36;
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
  function newGeo(slice) { return { slice: slice, items: [], byId: {}, threads: [], fibers: [], clusters: [], columns: [] }; }
  function addItem(g, it) { g.items.push(it); g.byId[it.id] = it; return it; }
  function finishBounds(g, mx, my) {
    var b = { minX: 1e9, maxX: -1e9, minY: 1e9, maxY: -1e9 };
    g.items.forEach(function (it) {
      var w = it.w || 0, h = it.h || 0;
      b.minX = Math.min(b.minX, it.x - (it.box ? 0 : 0)); b.maxX = Math.max(b.maxX, it.x + w);
      b.minY = Math.min(b.minY, it.y - h / 2); b.maxY = Math.max(b.maxY, it.y + h / 2);
    });
    g.clusters.forEach(function (c) { b.minX = Math.min(b.minX, c.x - c.r); b.maxX = Math.max(b.maxX, c.x + c.r); b.minY = Math.min(b.minY, c.y - c.r - 40); b.maxY = Math.max(b.maxY, c.y + c.r); });
    b.minX -= mx; b.maxX += mx; b.minY -= my; b.maxY += my;
    g.bounds = b;
  }

  function layoutOverview() {
    var g = newGeo('overview'), R = 740;
    CLUSTERS.forEach(function (st, ci) {
      var a = (-90 + ci * 60) * Math.PI / 180;
      var members = NODES.filter(function (n) { return clusterOf(n) === st; })
        .sort(function (x, y) { return (y.layer - x.layer) || (ORDER_IDX[x.id] - ORDER_IDX[y.id]); });
      var cx = Math.cos(a) * R, cy = Math.sin(a) * R * 0.8, step = 74;
      var cr = step * Math.sqrt(members.length) + 50;
      g.clusters.push({ stage: st, x: cx, y: cy, r: cr, rgb: hexRgb(STAGE_C[st]), title: CLUSTER_TITLE[st], seed: ci * 1.7, ang: a });
      members.forEach(function (n, i) {
        var rr = step * Math.sqrt(i + 0.45), th = i * 2.39996 + a + Math.PI;
        addItem(g, { id: n.id, n: n, x: cx + Math.cos(th) * rr, y: cy + Math.sin(th) * rr, r: LAYER_R[n.layer], cluster: st });
      });
    });
    addItem(g, { id: 'company', n: byId.company, x: -72, y: 0, r: LAYER_R[4], cluster: 'brand' });
    addItem(g, { id: 'equity', n: byId.equity, x: 72, y: 0, r: LAYER_R[4], cluster: 'brand' });
    g.clusters.push({ stage: 'brand', x: 0, y: 0, r: 150, rgb: hexRgb(STAGE_C.brand), title: CLUSTER_TITLE.brand, seed: 9, ang: Math.PI / 2 });
    edges.forEach(function (e) {
      var a = g.byId[e.from], b = g.byId[e.to], r = rnd(e.i * 97 + 13), p1, p2;
      if (a.cluster === b.cluster) {
        var dx = b.x - a.x, dy = b.y - a.y, L = Math.sqrt(dx * dx + dy * dy) || 1, nx = -dy / L, ny = dx / L, bend = (r() < 0.5 ? -1 : 1) * (16 + r() * 28);
        p1 = { x: a.x + dx * 0.33 + nx * bend, y: a.y + dy * 0.33 + ny * bend };
        p2 = { x: a.x + dx * 0.66 + nx * bend, y: a.y + dy * 0.66 + ny * bend };
      } else {
        var pull = 0.3 + r() * 0.18;
        p1 = { x: a.x * (1 - pull) + (r() - 0.5) * 90, y: a.y * (1 - pull) + (r() - 0.5) * 90 };
        p2 = { x: b.x * (1 - pull) + (r() - 0.5) * 90, y: b.y * (1 - pull) + (r() - 0.5) * 90 };
      }
      g.threads.push(makeThread(a, p1, p2, b, { kind: 'edge', e: e, from: e.from, to: e.to, amp: 2.5 + r() * 4, cyc: 1 + r() * 1.3, ph: r() * 6.283, w: 0.7 + e.w * 0.28 }));
    });
    g.clusters.forEach(function (c, ci) {
      if (c.stage === 'brand') return;
      for (var j = 0; j < 5; j++) {
        var r = rnd(ci * 53 + j * 11 + 5), dir = Math.atan2(-c.y, -c.x) + (r() - 0.5) * 1.3;
        var s0 = { x: c.x + Math.cos(dir) * c.r * 0.75, y: c.y + Math.sin(dir) * c.r * 0.75 };
        var s3 = { x: (r() - 0.5) * 110, y: (r() - 0.5) * 70 };
        var s1 = { x: s0.x + (s3.x - s0.x) * 0.35 + (r() - 0.5) * 130, y: s0.y + (s3.y - s0.y) * 0.35 + (r() - 0.5) * 130 };
        var s2 = { x: s0.x + (s3.x - s0.x) * 0.72 + (r() - 0.5) * 90, y: s0.y + (s3.y - s0.y) * 0.72 + (r() - 0.5) * 90 };
        var th = makeThread(s0, s1, s2, s3, { kind: 'fiber', stage: c.stage, amp: 5 + r() * 6, cyc: 0.9 + r(), ph: r() * 6.283, w: 0.55 + r() * 0.4 });
        g.fibers.push(th); g.threads.push(th);
      }
    });
    finishBounds(g, 90, 60);
    return g;
  }

  function layoutCause(fid) {
    var g = newGeo('cause'); g.focus = fid;
    var col = {}, cols = { '-2': [], '-1': [], '0': [fid], '1': [], '2': [], '3': [] };
    col[fid] = 0;
    function place(id, c) { if (col[id] != null) return; col[id] = c; cols[c].push(id); }
    edges.forEach(function (e) { if (e.from === fid) place(e.to, 1); });
    edges.forEach(function (e) { if (e.to === fid) place(e.from, -1); });
    cols['1'].slice().forEach(function (id) { if (byId[id].layer === 4) return; edges.forEach(function (e) { if (e.from === id && e.w >= 2) place(e.to, 2); }); });
    cols['-1'].slice().forEach(function (id) { edges.forEach(function (e) { if (e.to === id && e.w >= 2) place(e.from, -2); }); });
    var X = 300, DY = 70;
    function ys(list) { list.forEach(function (id, i) { var it = g.byId[id]; if (it) it.y = (i - (list.length - 1) / 2) * DY; }); }
    function bary(list, ref, dirFrom) {
      return list.map(function (id) {
        var ys2 = [];
        edges.forEach(function (e) {
          var other = dirFrom ? (e.to === id ? e.from : null) : (e.from === id ? e.to : null);
          if (other && ref.indexOf(other) > -1 && g.byId[other]) ys2.push(g.byId[other].y);
        });
        return { id: id, k: ys2.length ? ys2.reduce(function (a, b) { return a + b; }, 0) / ys2.length : 0 };
      }).sort(function (a, b) { return a.k - b.k; }).map(function (x) { return x.id; });
    }
    ['0', '1', '-1', '2', '-2', '3'].forEach(function (c) {
      var list = cols[c];
      list.forEach(function (id) { addItem(g, { id: id, n: byId[id], x: (+c) * X, y: 0, r: LAYER_R[byId[id].layer] * (c === '0' ? 1.5 : 1), col: +c }); });
      if (c === '0') return;
      var ref = cols[String(+c > 0 ? +c - 1 : +c + 1)];
      cols[c] = bary(list, ref, +c > 0);
      ys(cols[c]);
    });
    var titles = { '-2': 'Причины · 2-й шаг', '-1': 'Что влияет', '0': 'Узел', '1': 'На что влияет', '2': 'Следствия · 2-й шаг', '3': 'Следствия · 3-й шаг' };
    Object.keys(cols).forEach(function (c) { if (cols[c].length) g.columns.push({ x: (+c) * X, title: titles[c], n: cols[c].length, top: -((cols[c].length - 1) / 2) * DY }); });
    edges.forEach(function (e) {
      var a = g.byId[e.from], b = g.byId[e.to];
      if (!a || !b || a.col === b.col) return;
      var r = rnd(e.i * 41 + 3), main = b.col === a.col + 1, p1, p2;
      if (main) {
        var dx = b.x - a.x;
        p1 = { x: a.x + dx * 0.5, y: a.y + (r() - 0.5) * 10 }; p2 = { x: b.x - dx * 0.5, y: b.y + (r() - 0.5) * 10 };
      } else {
        var up = (a.y + b.y) / 2 <= 0 ? -1 : 1, lift = 70 + Math.abs(b.col - a.col) * 40;
        p1 = { x: a.x + (b.x - a.x) * 0.25, y: Math.min(a.y, b.y) * (up < 0 ? 1 : 0) + Math.max(a.y, b.y) * (up > 0 ? 1 : 0) + up * lift };
        p2 = { x: a.x + (b.x - a.x) * 0.75, y: p1.y };
      }
      g.threads.push(makeThread(a, p1, p2, b, { kind: 'edge', e: e, from: e.from, to: e.to, aux: !main, amp: main ? 2 + r() * 2.5 : 3, cyc: 1 + r(), ph: r() * 6.283, w: 0.8 + e.w * 0.32 }));
    });
    finishBounds(g, 120, 70);
    return g;
  }

  var measureCtx = null;
  function textW(txt, font) {
    if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d');
    measureCtx.font = font;
    return measureCtx.measureText(txt).width;
  }
  function layoutMoney() {
    var g = newGeo('money'), X = 290, DY = 55, y = 0;
    function walk(id, depth) {
      var m = MONEY_BY[id];
      var it = addItem(g, { id: id, m: m, n: m.node ? byId[m.node] : null, x: depth * X, y: 0, box: true, depth: depth, h: 46 });
      it.w = Math.max(textW(m.label, '600 14px Onest, sans-serif'), textW(m.formula || '', '400 11.5px Onest, sans-serif')) + (m.op ? 46 : 30);
      it.w = Math.min(it.w, 262);
      if (m.children && m.children.length) {
        var kids = m.children.map(function (c) { return walk(c, depth + 1); });
        it.y = (kids[0].y + kids[kids.length - 1].y) / 2;
      } else { it.y = y; y += DY; }
      return it;
    }
    walk('m_profit', 0);
    y += 70;
    var treeTop = y;
    walk('k_root', 0);
    g.columns.push({ x: 0, title: 'Прибыль бренда', top: -40, money: true });
    g.columns.push({ x: 0, title: 'Северная звезда: LTV / CAC', top: treeTop - 40, money: true, abs: true });
    MONEY.forEach(function (m) {
      (m.children || []).forEach(function (cid, k) {
        var p = g.byId[m.id], c = g.byId[cid], r = rnd(k * 31 + cid.length * 7);
        var a = { x: c.x, y: c.y }, b = { x: p.x + p.w, y: p.y }, dx = a.x - b.x;
        g.threads.push(makeThread(a, { x: a.x - dx * 0.5, y: a.y }, { x: b.x + dx * 0.5, y: b.y }, b, { kind: 'tree', from: cid, to: m.id, op: c.m.op, amp: 2 + r() * 2.5, cyc: 1 + r(), ph: r() * 6.283, w: 1.1 }));
      });
    });
    finishBounds(g, 60, 70);
    return g;
  }

  // ---------- money values from the project ----------
  function avgSku(p, fn) {
    var v = p.skus.map(fn).filter(function (x) { return x != null && !isNaN(x); });
    return v.length ? v.reduce(function (a, b) { return a + b; }, 0) / v.length : null;
  }
  function moneyVal(m, p) {
    if (!p) return null;
    var v;
    switch (m.id) {
      case 'm_aov': case 'm_aov2': case 'k_aov':
        v = avgSku(p, function (s) { return BM.num(s.sellPrice); });
        return v == null ? null : { text: '≈ ' + BM.money(v) + ' · средняя цена SKU', level: null };
      case 'm_cogs':
        v = avgSku(p, function (s) { return (BM.num(s.costPrice) || 0) + (BM.num(s.packaging) || 0); });
        return v == null ? null : { text: '≈ ' + BM.money(v) + ' на единицу', level: null };
      case 'm_mp':
        v = avgSku(p, function (s) { var c = BM.computeSku(s); return c.fee + (BM.num(s.logisticsIn) || 0) + (BM.num(s.logisticsOut) || 0); });
        return v == null ? null : { text: '≈ ' + BM.money(v) + ' на единицу', level: null };
      case 'm_adcost':
        v = avgSku(p, function (s) { return BM.num(s.adPct); });
        return v == null ? null : { text: 'ДРР ' + v.toFixed(1) + '%', level: v <= 10 ? 'good' : v <= 20 ? 'mid' : 'bad' };
      case 'm_tax':
        v = avgSku(p, function (s) { return BM.num(s.taxPct); });
        return v == null ? null : { text: v.toFixed(1) + '% от цены', level: null };
      case 'm_profit':
        v = avgSku(p, function (s) { return BM.computeSku(s).profit; });
        var mg = avgSku(p, function (s) { return BM.computeSku(s).margin; });
        return v == null ? null : { text: '≈ ' + BM.money(v) + ' с единицы', level: mg >= 20 ? 'good' : mg >= 5 ? 'mid' : 'bad' };
      case 'k_margin':
        return health('unit', p);
    }
    if (m.node && ['revenue', 'drr', 'unit', 'budget', 'platform'].indexOf(m.node) > -1) return health(m.node, p);
    return null;
  }

  // ---------- view ----------
  BM.views.system = function (a, b) {
    var ui = BM.ui;
    if (!ui.sysMode) ui.sysMode = 'links';
    if (!ui.sysImpulse) ui.sysImpulse = 1;
    if (!ui.sysStage) ui.sysStage = 'all';
    if (!ui.sysType) ui.sysType = 'all';
    if (!ui.sysFocus) ui.sysFocus = 'ltvcac';
    if (a === 'cause') { ui.sysSlice = 'cause'; if (b && byId[b]) ui.sysFocus = b; ui.sysNode = ui.sysFocus; }
    else if (a === 'money') { ui.sysSlice = 'money'; ui.sysNode = null; }
    else { ui.sysSlice = 'overview'; ui.sysNode = a && byId[a] ? a : null; }
    if (ui.sysProject === undefined) ui.sysProject = BM.state.projects[0] ? BM.state.projects[0].id : '';
    if (ui.sysProject && !BM.project(ui.sysProject)) ui.sysProject = BM.state.projects[0] ? BM.state.projects[0].id : '';
    var p = ui.sysProject ? BM.project(ui.sysProject) : null;
    var slice = ui.sysSlice;
    var sliceSeg = '<div class="sys-seg" role="group" aria-label="Срез">' + SLICES.map(function (s) {
      return '<button type="button" data-sys-slice="' + s.id + '" aria-pressed="' + (slice === s.id) + '">' + icon(s.icon, 'sm') + s.label + '</button>';
    }).join('') + '</div>';
    var modes = slice === 'cause' ? '<div class="sys-seg" role="group" aria-label="Режим"><button type="button" data-sys-mode="links" aria-pressed="' + (ui.sysMode === 'links') + '">Связи</button>' +
      '<button type="button" data-sys-mode="sim" aria-pressed="' + (ui.sysMode === 'sim') + '">' + icon('sparkle', 'sm') + 'Симуляция</button></div>' : '';
    var filters = slice !== 'money' ?
      '<label class="sr-only" for="sys-stage-f">Этап воронки</label><select class="select" id="sys-stage-f">' + STAGES.map(function (x) { return '<option value="' + x.id + '"' + (ui.sysStage === x.id ? ' selected' : '') + '>' + esc(x.id === 'all' ? 'Все этапы AARRR' : x.label) + '</option>'; }).join('') + '</select>' +
      '<label class="sr-only" for="sys-type-f">Тип узла</label><select class="select" id="sys-type-f">' + TYPES.map(function (x) { return '<option value="' + x.id + '"' + (ui.sysType === x.id ? ' selected' : '') + '>' + esc(x.label) + '</option>'; }).join('') + '</select>' : '';
    var projSel = BM.state.projects.length ? '<label class="sr-only" for="sys-project">Данные проекта</label><select class="select" id="sys-project"><option value="">Без данных проекта</option>' +
      BM.state.projects.map(function (x) { return '<option value="' + x.id + '"' + (x.id === ui.sysProject ? ' selected' : '') + '>' + esc(x.name) + '</option>'; }).join('') + '</select>' : '';
    var probs = '<button type="button" class="chip glassy-chip" data-sys-problems aria-pressed="' + !!(ui.sysProblems && p) + '"' + (p ? '' : ' disabled title="Выберите проект с данными"') + '>' + icon('flag', 'sm') + 'Проблемные зоны</button>';
    var legend = slice === 'overview' ?
      CLUSTERS.concat(['brand']).map(function (s) { return '<span><i class="lg-dot" style="background:' + STAGE_C[s] + '"></i>' + esc(CLUSTER_TITLE[s]) + '</span>'; }).join('') :
      slice === 'money' ? '<span><b class="lg-op">+</b>складывается</span><span><b class="lg-op">×</b>умножается</span><span><b class="lg-op">−</b>вычитается</span><span><b class="lg-op">÷</b>делится</span><span><i class="lg-line pos"></i>деньги стекаются к итогу</span>' :
        '<span><i class="lg-line pos"></i>усиливает</span><span><i class="lg-line neg"></i>снижает</span><span><i class="lg-line in"></i>причина</span><span class="lg-tip">Нажмите на любой узел, чтобы сделать его центром.</span>';
    legend += (p ? '<span><i class="lg-hdot"></i>данные проекта «' + esc(p.name) + '»</span>' : '') + (slice === 'overview' ? '<span class="lg-tip">Колесо или щипок — масштаб · перетаскивание — перемещение. Если подписи не помещаются, приблизьте карту — они появятся.</span>' : '');
    var sub = { overview: 'из чего состоит маркетинг', cause: 'почему и что будет дальше', money: 'какой рычаг двигает прибыль' }[slice];
    return '<h1 class="sr-only">Система маркетинга</h1>' +
      '<div class="sys-stage" id="sys-stage" data-slice="' + slice + '" tabindex="0" aria-label="Карта системы маркетинга. Плюс и минус — масштаб, ноль — вписать, стрелки — перемещение. Узлы доступны списком в разделе «Все узлы».">' +
        '<canvas class="sys-canvas" aria-hidden="true"></canvas>' +
        '<div class="sys-hud">' +
          '<div class="sys-hud-title glassy"><span class="stat-icon">' + icon('network', 'sm') + '</span><div><b>Система маркетинга</b><small>' + sub + '</small></div></div>' +
          '<div class="sys-hud-row">' + sliceSeg + modes + filters + projSel + (slice !== 'money' || p ? probs : '') +
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

  BM.systemMount = function () {
    BM.systemUnmount();
    var stage = document.getElementById('sys-stage');
    if (!stage) return;
    ctl = new AbortController();
    var sig = { signal: ctl.signal };
    document.documentElement.classList.add('sys-lock');
    var cv = stage.querySelector('.sys-canvas'), ctx = cv.getContext('2d'), dock = stage.querySelector('#sys-panel');
    var ui = BM.ui, slice = ui.sysSlice;
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var dark = BM.isDark();
    var C = dark ? {
      ink: '214,226,206', baseA: 0.2, fiberA: 0.1, dimA: 0.045, node: '#E6EDE0', label: '#E3EBDD', muted: '#A9B5A4', halo: 'rgba(16,20,16,.86)',
      glow: '190,226,170', inC: '143,200,216', neg: '238,166,124', good: '141,213,143', bad: '244,140,120', comp: 'lighter',
      box: 'rgba(28,34,27,.82)', boxLine: 'rgba(255,255,255,.1)'
    } : {
      ink: '30,36,28', baseA: 0.26, fiberA: 0.12, dimA: 0.05, node: '#222B20', label: '#242D22', muted: '#5C6658', halo: 'rgba(238,239,235,.94)',
      glow: '96,146,78', inC: '58,128,150', neg: '196,118,72', good: '52,140,66', bad: '186,66,52', comp: 'source-over',
      box: 'rgba(255,255,255,.78)', boxLine: 'rgba(255,255,255,.95)'
    };
    var p = ui.sysProject ? BM.project(ui.sysProject) : null;
    var geo = slice === 'cause' ? layoutCause(ui.sysFocus) : slice === 'money' ? layoutMoney() : layoutOverview();
    var dpr = 1, W = 0, H = 0, fitK = 1, view = null, anim = null, userMoved = false;
    var hoverId = null, pathSel = null, lastSim = null, pulses = [], lastAmb = 0, nextCycle = 0;
    var healthCache = {};
    function hOf(it) {
      if (healthCache[it.id] !== undefined) return healthCache[it.id];
      var h = it.m ? moneyVal(it.m, p) : (p && it.n ? health(it.n.id, p) : null);
      healthCache[it.id] = h;
      return h;
    }

    // ----- transform -----
    function dockW() { return dock.classList.contains('open') && W >= 900 ? dock.offsetWidth + 28 : 0; }
    function fitView() {
      var mobile = W < 1024, sheet = W < 900 && dock.classList.contains('open') ? dock.offsetHeight + 96 : 0;
      var hud = stage.querySelector('.sys-hud'), lg = stage.querySelector('.sys-legend');
      var top = hud ? hud.offsetTop + hud.offsetHeight + 14 : (mobile ? 132 : 92);
      var lgH = !mobile && stage.classList.contains('legend-open') && lg ? lg.offsetHeight + 24 : 0;
      var bottom = mobile ? Math.max(104, sheet) : Math.max(24, lgH), side = 16;
      var aw = Math.max(200, W - dockW() - side * 2), ah = Math.max(200, H - top - bottom);
      var b = geo.bounds, bw = b.maxX - b.minX, bh = b.maxY - b.minY;
      var k = clamp(Math.min(aw / bw, ah / bh), 0.12, 1.6);
      fitK = k;
      return { k: k, x: side + (aw - bw * k) / 2 - b.minX * k, y: top + (ah - bh * k) / 2 - b.minY * k };
    }
    function setView(v, animate) {
      if (!animate || reduce || !view) { view = v; anim = null; showZoom(); requestDraw(); return; }
      anim = { from: view, to: v, start: performance.now(), dur: 420 };
      requestDraw();
    }
    function zoomAt(f, sx, sy, animate) {
      userMoved = true;
      var base = anim ? anim.to : view;
      var k = clamp(base.k * f, fitK * 0.35, fitK * 7);
      f = k / base.k;
      setView({ k: k, x: sx - (sx - base.x) * f, y: sy - (sy - base.y) * f }, animate);
    }
    function centerOn(it) {
      var v0 = anim ? anim.to : view;
      var sx = v0.x + it.x * v0.k, sy = v0.y + it.y * v0.k, pad = 90, right = W - dockW();
      var sheetTop = W < 900 && dock.classList.contains('open') ? H - dock.offsetHeight - 96 : H;
      if (sx > pad && sx < right - pad && sy > pad + 60 && sy < sheetTop - pad) return;
      setView({ k: v0.k, x: right / 2 - it.x * v0.k, y: Math.min(H, sheetTop) / 2 + 30 - it.y * v0.k }, true);
    }
    function showZoom() { var el = stage.querySelector('#sys-zoom-val'); if (el && view) el.textContent = Math.round(view.k / fitK * 100) + '%'; }
    function resize() {
      var r = stage.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      var f = fitView();
      if (!view || !userMoved) setView(f, false); else showZoom();
      requestDraw();
    }

    // ----- filters & focus -----
    function stageOn() { return ui.sysStage && ui.sysStage !== 'all'; }
    function typeOn() { return ui.sysType && ui.sysType !== 'all'; }
    function probOn() { return !!(ui.sysProblems && p); }
    function filtersOn() { return slice !== 'money' ? (stageOn() || typeOn() || probOn()) : probOn(); }
    function isProblem(it) { var h = hOf(it); return !!(h && (h.level === 'bad' || h.level === 'mid')); }
    function passes(it) {
      if (slice === 'money') return !probOn() || isProblem(it);
      var n = it.n;
      if (stageOn() && n.stage !== ui.sysStage) return false;
      if (typeOn() && String(n.layer) !== ui.sysType) return false;
      if (probOn() && !isProblem(it)) return false;
      return true;
    }
    function focusId() { return ui.sysNode || hoverId; }

    function threadStyle(th) {
      if (th.kind === 'tree') {
        var sel = ui.sysNode || hoverId;
        var hot = sel && (th.from === sel || th.to === sel || isAncestor(sel, th.from));
        var col = th.op === '−' || th.op === '÷' ? C.neg : C.glow;
        if (sel) return hot ? { rgb: col, a: 0.95, hl: true } : { dim: true };
        if (filtersOn()) return passes(geo.byId[th.from]) ? { rgb: C.neg, a: 0.9, hl: true } : { dim: true };
        return { rgb: col, a: 0.5, hl: true, soft: true };
      }
      if (th.kind === 'fiber') return null;
      var e = th.e, id = focusId();
      if (pathSel) {
        for (var i = 1; i < pathSel.length; i++) if (e.from === pathSel[i - 1] && e.to === pathSel[i]) return { rgb: e.sign > 0 ? C.glow : C.neg, a: 0.95, hl: true };
        return { dim: true };
      }
      if (slice === 'cause') {
        if (ui.sysMode === 'sim' && lastSim) {
          if (lastSim.used[e.i] != null) { var v = lastSim.eff[e.to] || 0; return { rgb: v * byId[e.to].polarity > 0 ? C.good : C.bad, a: 0.9, hl: true }; }
          return { dim: true };
        }
        if (hoverId && hoverId !== ui.sysNode) return (e.from === hoverId || e.to === hoverId) ? { rgb: e.sign > 0 ? C.glow : C.neg, a: 0.95, hl: true } : { dim: true };
        if (filtersOn() && !(passes(geo.byId[e.from]) && passes(geo.byId[e.to]))) return { dim: true };
        if (th.aux) return { rgb: e.sign > 0 ? C.glow : C.neg, a: 0.35, hl: true, soft: true };
        var toward = geo.byId[e.to].col <= 0;
        return { rgb: e.sign < 0 ? C.neg : (toward ? C.inC : C.glow), a: 0.85, hl: true };
      }
      if (!id) {
        if (!filtersOn()) return null;
        var pa = passes(geo.byId[e.from]), pb = passes(geo.byId[e.to]);
        if (pa && pb) return { rgb: C.glow, a: 0.75, hl: true };
        return pa || pb ? null : { dim: true };
      }
      if (e.from === id) return { rgb: e.sign > 0 ? C.glow : C.neg, a: 0.95, hl: true };
      if (e.to === id) return { rgb: e.sign > 0 ? C.inC : C.neg, a: 0.85, hl: true };
      return { dim: true };
    }
    function isAncestor(a, b) { var m = MONEY_BY[a]; if (!m || !m.children) return false; return m.children.some(function (c) { return c === b || isAncestor(c, b); }); }
    function itemState(it) {
      if (slice === 'money') {
        var sel = ui.sysNode || hoverId;
        if (sel) return it.id === sel ? { sel: true, on: true } : (isAncestor(sel, it.id) || isAncestor(it.id, sel)) ? { on: true } : { dim: true };
        if (filtersOn()) return passes(it) ? { on: true } : { dim: true };
        return {};
      }
      var id = focusId();
      if (pathSel) return pathSel.indexOf(it.id) > -1 ? { on: true } : { dim: true };
      if (slice === 'cause') {
        var st = {};
        if (it.id === ui.sysNode) st.sel = true;
        if (ui.sysMode === 'sim' && lastSim && it.id !== ui.sysNode) {
          var v = lastSim.eff[it.id];
          if (v != null && Math.abs(v) >= 0.04) { st.eff = v; st.good = v * it.n.polarity > 0; st.on = true; } else st.dim = true;
          return st;
        }
        if (hoverId && hoverId !== ui.sysNode) {
          if (it.id === hoverId) return { on: true, hover: true };
          return edges.some(function (e) { return (e.from === hoverId && e.to === it.id) || (e.to === hoverId && e.from === it.id); }) ? { on: true } : { dim: true };
        }
        if (filtersOn() && !st.sel && !passes(it)) st.dim = true; else st.on = true;
        return st;
      }
      if (!id) return filtersOn() ? (passes(it) ? { on: true } : { dim: true }) : {};
      if (it.id === id) return { sel: true, on: true };
      for (var i = 0; i < edges.length; i++) { var e = edges[i]; if ((e.from === id && e.to === it.id) || (e.to === id && e.from === it.id)) return { on: true }; }
      return { dim: true };
    }

    // ----- drawing -----
    function undulate(th, t) {
      var b = th.base, nm = th.nrm, q = th.pts;
      for (var i = 0; i < NPT; i++) {
        var s = i / (NPT - 1);
        var off = reduce ? 0 : th.amp * Math.sin(Math.PI * s) * Math.sin(6.283 * th.cyc * s - t * 1.15 + th.ph);
        q[i * 2] = b[i * 2] + nm[i * 2] * off;
        q[i * 2 + 1] = b[i * 2 + 1] + nm[i * 2 + 1] * off;
      }
    }
    function addPoly(th, from, to) {
      var q = th.pts;
      ctx.moveTo(q[from * 2], q[from * 2 + 1]);
      for (var i = from + 1; i <= to; i++) ctx.lineTo(q[i * 2], q[i * 2 + 1]);
    }
    function strokeSet(list, rgb, a, px) {
      if (!list.length) return;
      ctx.beginPath();
      list.forEach(function (th) { addPoly(th, 0, NPT - 1); });
      ctx.strokeStyle = 'rgba(' + rgb + ',' + a + ')';
      ctx.lineWidth = px / view.k;
      ctx.stroke();
    }
    function blobPath(c, t) {
      var n = 56;
      ctx.beginPath();
      for (var i = 0; i <= n; i++) {
        var a = i / n * 6.283;
        var rr = c.r * (1 + 0.055 * Math.sin(3 * a + c.seed + (reduce ? 0 : t * 0.35)) + 0.035 * Math.sin(5 * a - c.seed * 2 - (reduce ? 0 : t * 0.22)));
        var x = c.x + Math.cos(a) * rr, y = c.y + Math.sin(a) * rr;
        if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
      ctx.closePath();
    }

    function draw(now) {
      var t = now / 1000, k = view.k;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.setTransform(dpr * k, 0, 0, dpr * k, dpr * view.x, dpr * view.y);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';

      // overview cells
      if (slice === 'overview') {
        geo.clusters.forEach(function (c) {
          var active = !filtersOn() && !focusId() && !pathSel ? 1 : (stageOn() && ui.sysStage === c.stage ? 1.4 : (focusId() || pathSel || filtersOn() ? 0.55 : 1));
          var gr = ctx.createRadialGradient(c.x, c.y, c.r * 0.1, c.x, c.y, c.r * 1.1);
          gr.addColorStop(0, 'rgba(' + c.rgb + ',' + (0.13 * active) + ')'); gr.addColorStop(1, 'rgba(' + c.rgb + ',' + (0.04 * active) + ')');
          blobPath(c, t); ctx.fillStyle = gr; ctx.fill();
          ctx.strokeStyle = 'rgba(' + c.rgb + ',' + (0.35 * active) + ')'; ctx.lineWidth = 1.2 / k; ctx.setLineDash([4 / k, 6 / k]); ctx.stroke(); ctx.setLineDash([]);
        });
      }

      geo.threads.forEach(function (th) { undulate(th, t); });
      var norm = [], dim = [], fib = [], hls = [];
      var focus = !!(focusId() || pathSel || filtersOn());
      geo.threads.forEach(function (th) {
        if (th.kind === 'fiber') {
          if (!focus) fib.push(th);
          else if (stageOn() && th.stage === ui.sysStage) hls.push({ th: th, s: { rgb: hexRgb(STAGE_C[th.stage]), a: 0.45, hl: true, fiber: true } });
          else dim.push(th);
          return;
        }
        var s = threadStyle(th);
        if (!s) norm.push(th); else if (s.dim) dim.push(th); else hls.push({ th: th, s: s });
      });
      strokeSet(dim, C.ink, C.dimA, 0.8);
      strokeSet(fib, C.ink, C.fiberA, 0.8);
      strokeSet(norm, C.ink, C.baseA, 1);
      ctx.globalCompositeOperation = C.comp;
      hls.forEach(function (h) {
        ctx.beginPath(); addPoly(h.th, 0, NPT - 1);
        if (!h.s.soft) { ctx.strokeStyle = 'rgba(' + h.s.rgb + ',' + (h.s.a * 0.16) + ')'; ctx.lineWidth = (h.s.fiber ? 3 : 5) / k; ctx.stroke(); }
        ctx.strokeStyle = 'rgba(' + h.s.rgb + ',' + h.s.a + ')'; ctx.lineWidth = (h.s.fiber ? 0.9 : 1.1 + h.th.w * 0.55) / k; ctx.stroke();
      });

      pulses = pulses.filter(function (pl) {
        var q = (now - pl.start) / pl.dur;
        if (q < 0) return true;
        if (q >= 1) return false;
        var s = q < 0.5 ? 2 * q * q : 1 - Math.pow(-2 * q + 2, 2) / 2;
        var head = s * (NPT - 1), hi = Math.min(NPT - 1, Math.ceil(head)), lo = Math.max(0, Math.floor(head - pl.tail));
        if (hi <= lo) return true;
        var pt = pl.th.pts, fade = q < 0.12 ? q / 0.12 : q > 0.88 ? (1 - q) / 0.12 : 1;
        var gg = ctx.createLinearGradient(pt[lo * 2], pt[lo * 2 + 1], pt[hi * 2], pt[hi * 2 + 1]);
        gg.addColorStop(0, 'rgba(' + pl.rgb + ',0)'); gg.addColorStop(1, 'rgba(' + pl.rgb + ',' + (pl.a * fade) + ')');
        ctx.beginPath(); addPoly(pl.th, lo, hi);
        ctx.strokeStyle = gg;
        ctx.globalAlpha = 0.22; ctx.lineWidth = 7 / k; ctx.stroke();
        ctx.globalAlpha = 0.55; ctx.lineWidth = 3.2 / k; ctx.stroke();
        ctx.globalAlpha = 1; ctx.lineWidth = 1.5 / k; ctx.stroke();
        var hx = pt[hi * 2], hy = pt[hi * 2 + 1], rr = 9 / k;
        var hg = ctx.createRadialGradient(hx, hy, 0, hx, hy, rr);
        hg.addColorStop(0, 'rgba(' + pl.rgb + ',' + (0.9 * fade * pl.a) + ')'); hg.addColorStop(1, 'rgba(' + pl.rgb + ',0)');
        ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(hx, hy, rr, 0, 6.283); ctx.fill();
        return true;
      });
      ctx.globalCompositeOperation = 'source-over';

      if (slice === 'money') drawBoxes(t); else drawDots(t);
      drawTitles();
    }

    function drawTitles() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.textBaseline = 'bottom';
      if (slice === 'overview') {
        geo.clusters.forEach(function (c) {
          var dx = Math.cos(c.ang), dy = Math.sin(c.ang);
          var wx = c.stage === 'brand' ? c.x : c.x + dx * (c.r + 26), wy = c.stage === 'brand' ? c.y - c.r - 6 : c.y + dy * (c.r + 26) * 0.9 - (dy > 0.3 ? -16 : 0);
          var sx = view.x + wx * view.k, sy = view.y + wy * view.k;
          ctx.font = '700 ' + (11.5 * clamp(Math.sqrt(view.k / 0.6), 0.85, 1.25)).toFixed(1) + 'px Onest, sans-serif';
          ctx.textAlign = 'center';
          var txt = c.title.toUpperCase().split('').join(' ');
          ctx.lineWidth = 4; ctx.strokeStyle = C.halo; ctx.strokeText(txt, sx, sy);
          ctx.fillStyle = 'rgb(' + c.rgb + ')';
          ctx.globalAlpha = stageOn() && ui.sysStage !== c.stage ? 0.4 : 1;
          ctx.fillText(txt, sx, sy); ctx.globalAlpha = 1;
        });
      } else {
        geo.columns.forEach(function (col) {
          var sx = view.x + col.x * view.k + (slice === 'money' ? 0 : 0), sy = view.y + col.top * view.k - (slice === 'money' ? 10 : 34);
          ctx.font = '700 11.5px Onest, sans-serif';
          ctx.textAlign = slice === 'money' ? 'left' : 'center';
          var txt = col.title.toUpperCase();
          ctx.lineWidth = 4; ctx.strokeStyle = C.halo; ctx.strokeText(txt, sx, sy);
          ctx.fillStyle = C.muted; ctx.fillText(txt, sx, sy);
        });
      }
    }

    function drawDots(t) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var k = view.k, narrow = W < 900;
      var jobs = [];
      var focus = !!(focusId() || pathSel || filtersOn());
      geo.items.forEach(function (it) {
        var st = itemState(it), n = it.n;
        var sx = view.x + it.x * k, sy = view.y + it.y * k;
        if (sx < -220 || sx > W + 220 || sy < -120 || sy > H + 120) return;
        var rs = it.r * clamp(Math.pow(k / fitK, 0.5), 0.75, 1.9) * (W < 600 ? 0.65 : 1);
        var breathe = reduce ? 0 : Math.sin(t * 2.2 + it.x * 0.01) * 0.5 + 0.5;
        var lc = hexRgb(STAGE_C[clusterOf(n)]);
        var gc = st.eff != null ? (st.good ? C.good : C.bad) : lc;
        var ga = st.dim ? 0.05 : st.sel ? 0.55 : st.eff != null ? 0.25 + Math.abs(st.eff) * 0.4 : (focus && st.on ? 0.42 : 0.24 + breathe * 0.08);
        var gr = rs * (st.sel ? 4.2 + breathe * 0.8 : 3.2);
        var grd = ctx.createRadialGradient(sx, sy, 0, sx, sy, gr);
        grd.addColorStop(0, 'rgba(' + gc + ',' + ga + ')'); grd.addColorStop(1, 'rgba(' + gc + ',0)');
        ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(sx, sy, gr, 0, 6.283); ctx.fill();
        ctx.globalAlpha = st.dim ? 0.28 : 1;
        if (n.layer === 0) { ctx.fillStyle = dark ? '#171C16' : '#F4F5F1'; ctx.beginPath(); ctx.arc(sx, sy, rs, 0, 6.283); ctx.fill(); ctx.strokeStyle = C.node; ctx.lineWidth = 2; ctx.stroke(); }
        else { ctx.fillStyle = C.node; ctx.beginPath(); ctx.arc(sx, sy, rs, 0, 6.283); ctx.fill(); }
        if (st.sel) { ctx.strokeStyle = 'rgba(' + C.glow + ',.95)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sx, sy, rs + 4.5 + breathe * 1.5, 0, 6.283); ctx.stroke(); }
        var h = hOf(it);
        if (h && h.level) {
          ctx.fillStyle = h.level === 'good' ? 'rgb(' + C.good + ')' : h.level === 'mid' ? '#C8961F' : 'rgb(' + C.bad + ')';
          ctx.strokeStyle = dark ? '#101410' : '#fff'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(sx + rs * 0.85, sy - rs * 0.85, 3.6, 0, 6.283); ctx.fill(); ctx.stroke();
        }
        ctx.globalAlpha = 1;
        if (focus && st.dim && slice !== 'cause') return;
        var lx, ly, al, bl;
        if (slice === 'cause') {
          lx = sx; ly = sy + rs + (it.col === 0 ? 10 : 6); al = 'center'; bl = 'top';
        } else if (n.layer === 4) { lx = sx + (it.x < 0 ? -1 : 1) * (rs + 8); ly = sy; al = it.x < 0 ? 'right' : 'left'; bl = 'middle'; }
        else {
          var c = geo.clusters.filter(function (cc) { return cc.stage === it.cluster; })[0];
          var dx = it.x - c.x, dy = it.y - c.y, dl = Math.sqrt(dx * dx + dy * dy);
          if (dl < 20) { dx = Math.cos(c.ang); dy = Math.sin(c.ang); dl = 1; }
          var ux = dx / dl, uy = dy / dl;
          lx = sx + ux * (rs + 6); ly = sy + uy * (rs + 6);
          al = ux < -0.35 ? 'right' : ux > 0.35 ? 'left' : 'center';
          bl = uy < -0.4 ? 'bottom' : uy > 0.4 ? 'top' : 'middle';
        }
        var fs = slice === 'cause' ? (it.col === 0 ? 1.25 : 1) : clamp(Math.sqrt(k / 0.75), 0.84, 1.12);
        var label = (st.eff != null ? (st.eff > 0 ? '↑ ' : '↓ ') : '') + n.label;
        var font = (n.layer === 4 || st.sel ? '700 ' : '500 ') + (12.5 * fs * (n.layer === 4 ? 1.1 : 1)).toFixed(1) + 'px Onest, system-ui, sans-serif';
        var force = st.sel || it.id === hoverId || st.eff != null || (focus && st.on) || n.layer === 4;
        var pri = force ? 0 : [3, 4, 6, 5, 1][n.layer];
        jobs.push({ label: label, font: font, x: lx, y: ly, al: al, bl: bl, pri: pri, force: force, dim: st.dim, color: st.eff != null ? 'rgb(' + (st.good ? C.good : C.bad) + ')' : C.label, size: 12.5 * fs });
      });
      jobs.sort(function (a, b) { return a.pri - b.pri; });
      var placed = [];
      jobs.forEach(function (j) {
        ctx.font = j.font;
        var w = ctx.measureText(j.label).width, h = j.size * 1.25;
        var x0 = j.al === 'right' ? j.x - w : j.al === 'center' ? j.x - w / 2 : j.x;
        var y0 = j.bl === 'bottom' ? j.y - h : j.bl === 'middle' ? j.y - h / 2 : j.y;
        var r = { x: x0 - 3, y: y0 - 1, w: w + 6, h: h + 2 };
        if (!j.force && placed.some(function (q) { return r.x < q.x + q.w && r.x + r.w > q.x && r.y < q.y + q.h && r.y + r.h > q.y; })) return;
        placed.push(r);
        ctx.textAlign = j.al; ctx.textBaseline = j.bl;
        ctx.lineWidth = 4; ctx.strokeStyle = C.halo; ctx.strokeText(j.label, j.x, j.y);
        ctx.fillStyle = j.color; ctx.globalAlpha = j.dim ? 0.35 : 1;
        ctx.fillText(j.label, j.x, j.y);
        ctx.globalAlpha = 1;
      });
    }

    function roundRect(x, y, w, h, r) {
      ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    }
    function drawBoxes(t) {
      ctx.setTransform(dpr * view.k, 0, 0, dpr * view.k, dpr * view.x, dpr * view.y);
      geo.items.forEach(function (it) {
        var st = itemState(it), m = it.m, h = hOf(it), x = it.x, y = it.y - it.h / 2, w = it.w, hh = it.h;
        ctx.globalAlpha = st.dim ? 0.3 : 1;
        if (st.sel) {
          var gg = ctx.createRadialGradient(x + w / 2, it.y, 10, x + w / 2, it.y, w * 0.8);
          gg.addColorStop(0, 'rgba(' + C.glow + ',.3)'); gg.addColorStop(1, 'rgba(' + C.glow + ',0)');
          ctx.fillStyle = gg; ctx.fillRect(x - w * 0.3, it.y - w * 0.8, w * 1.6, w * 1.6);
        }
        roundRect(x, y, w, hh, 14);
        ctx.fillStyle = C.box; ctx.fill();
        ctx.lineWidth = st.sel ? 2 : 1; ctx.strokeStyle = st.sel ? 'rgba(' + C.glow + ',.95)' : C.boxLine; ctx.stroke();
        if (h && h.level) {
          ctx.fillStyle = h.level === 'good' ? 'rgb(' + C.good + ')' : h.level === 'mid' ? '#C8961F' : 'rgb(' + C.bad + ')';
          roundRect(x + 4, y + 8, 3.5, hh - 16, 2); ctx.fill();
        }
        var tx = x + 14;
        if (m.op) {
          var oc = m.op === '−' || m.op === '÷' ? C.neg : C.glow;
          ctx.fillStyle = 'rgba(' + oc + ',.16)'; ctx.beginPath(); ctx.arc(x + 22, it.y, 11, 0, 6.283); ctx.fill();
          ctx.fillStyle = 'rgb(' + oc + ')'; ctx.font = '700 14px Onest, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(m.op, x + 22, it.y + 0.5);
          tx = x + 40;
        }
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = C.label; ctx.font = (it.depth === 0 ? '700 15px ' : '600 14px ') + 'Onest, sans-serif';
        ctx.fillText(m.label, tx, it.y - 3);
        ctx.fillStyle = h && h.text && !m.children ? (h.level === 'bad' ? 'rgb(' + C.bad + ')' : C.muted) : C.muted;
        ctx.font = '400 11.5px Onest, sans-serif';
        var sub = h && h.text ? h.text : (m.formula || '');
        while (ctx.measureText(sub).width > w - (tx - x) - 10 && sub.length > 4) sub = sub.slice(0, -2);
        if (sub !== (h && h.text ? h.text : (m.formula || ''))) sub = sub.trim() + '…';
        ctx.fillText(sub, tx, it.y + 13);
        ctx.globalAlpha = 1;
      });
    }

    // ----- pulses -----
    function spawn(th, delay, rgb, a, dur, tail) {
      pulses.push({ th: th, start: performance.now() + (delay || 0), dur: dur || 1500, rgb: rgb || C.glow, a: a == null ? 1 : a, tail: tail || 11 });
    }
    function threadsWhere(fn) { return geo.threads.filter(fn); }
    function cycle(now) {
      if (pathSel) {
        pathSel.forEach(function (nid, i) {
          if (!i) return;
          threadsWhere(function (th) { return th.kind === 'edge' && th.from === pathSel[i - 1] && th.to === nid; })
            .forEach(function (th) { spawn(th, (i - 1) * 650, th.e.sign > 0 ? C.glow : C.neg, 1, 1100, 13); });
        });
        nextCycle = now + 650 * pathSel.length + 1600;
        return;
      }
      if (slice === 'money') {
        var sel = ui.sysNode;
        threadsWhere(function (th) { return !sel || th.to === sel || th.from === sel || isAncestor(sel, th.from); }).forEach(function (th) {
          var d = MONEY_BY[th.from] ? geo.byId[th.from].depth : 1;
          spawn(th, (6 - d) * 380 + Math.random() * 200, th.op === '−' || th.op === '÷' ? C.neg : C.glow, sel ? 1 : 0.7, 1300, 12);
        });
        nextCycle = now + 3400;
        return;
      }
      if (slice === 'cause') {
        if (ui.sysMode === 'sim' && lastSim) {
          var maxD = 0;
          Object.keys(lastSim.used).forEach(function (i) {
            var e = edges[i], d = lastSim.used[i];
            threadsWhere(function (th) { return th.e === e; }).forEach(function (th) {
              maxD = Math.max(maxD, d);
              var v = lastSim.eff[e.to] || 0;
              spawn(th, d * 560, v * byId[e.to].polarity > 0 ? C.good : C.bad, 0.95, 1150, 12);
            });
          });
          nextCycle = now + (maxD + 1) * 560 + 1700;
        } else {
          threadsWhere(function (th) { return !th.aux; }).forEach(function (th) {
            var c = geo.byId[th.from].col;
            spawn(th, (c + 2) * 520 + Math.random() * 200, th.e.sign > 0 ? (geo.byId[th.to].col <= 0 ? C.inC : C.glow) : C.neg, 1, 1300, 12);
          });
          nextCycle = now + 3600;
        }
        return;
      }
      if (ui.sysNode) {
        threadsWhere(function (th) { return th.kind === 'edge' && (th.from === ui.sysNode || th.to === ui.sysNode); }).forEach(function (th) {
          var out = th.from === ui.sysNode;
          spawn(th, out ? Math.random() * 250 : 500 + Math.random() * 300, th.e.sign > 0 ? (out ? C.glow : C.inC) : C.neg, 1, 1500);
        });
        nextCycle = now + 2600;
      }
    }
    function ambient(now) {
      if (slice !== 'overview' || ui.sysNode || hoverId || pathSel || pulses.length > 16 || now - lastAmb < 170) return;
      lastAmb = now;
      var pool;
      if (filtersOn()) pool = geo.threads.filter(function (th) { return th.kind === 'edge' && passes(geo.byId[th.from]) && passes(geo.byId[th.to]); });
      else pool = Math.random() < 0.4 ? geo.fibers : geo.threads;
      if (!pool.length) return;
      var th = pool[Math.floor(Math.random() * pool.length)];
      spawn(th, 0, th.kind === 'fiber' ? hexRgb(STAGE_C[th.stage]) : C.glow, dark ? 0.75 : 0.6, 1900 + Math.random() * 1000, 12);
    }

    // ----- loop -----
    function frame(now) {
      raf = 0;
      if (!ctl) return;
      if (anim) {
        var q = Math.min(1, (now - anim.start) / anim.dur), e = 1 - Math.pow(1 - q, 3);
        view = { k: anim.from.k + (anim.to.k - anim.from.k) * e, x: anim.from.x + (anim.to.x - anim.from.x) * e, y: anim.from.y + (anim.to.y - anim.from.y) * e };
        if (q >= 1) { view = anim.to; anim = null; }
        showZoom();
      }
      if (!reduce) {
        var cyc = pathSel || ui.sysNode || slice !== 'overview';
        if (cyc && now >= nextCycle) cycle(now);
        ambient(now);
      }
      draw(now);
      if (!document.hidden && (!reduce || anim)) raf = requestAnimationFrame(frame);
    }
    function requestDraw() { if (!raf && ctl) raf = requestAnimationFrame(frame); }

    // ----- dock -----
    function relItem(e, other) {
      var n = byId[other];
      return '<li><button type="button" class="sys-rel" data-sys-node="' + n.id + '"><span class="sys-rel-sign ' + (e.sign > 0 ? 'pos' : 'neg') + '" aria-hidden="true">' + (e.sign > 0 ? '+' : '−') + '</span>' +
        '<span><b>' + esc(n.label) + '</b><small>' + (e.sign > 0 ? 'усиливает' : 'снижает') + ' · ' + esc(e.why) + '</small></span></button></li>';
    }
    function closeBtn() { return '<button type="button" class="icon-btn sm" data-sys-close aria-label="Закрыть панель">' + icon('x', 'sm') + '</button>'; }
    function nodeHead(n) {
      var h = p ? health(n.id, p) : null;
      return '<div class="sys-p-head"><span class="eyebrow"><i class="lg-dot" style="background:' + STAGE_C[clusterOf(n)] + '"></i>' + esc(LAYERS[n.layer].title) + ' · ' + esc(stageLabel[n.stage]) + '</span>' + closeBtn() + '</div>' +
        '<h2>' + esc(n.label) + '</h2><p class="small" style="color:var(--primary-ink);font-weight:600;margin-top:4px">' + (n.polarity > 0 ? 'Чем выше — тем лучше' : 'Чем ниже — тем лучше') + '</p>' +
        '<p style="margin-top:10px">' + esc(n.desc) + '</p>' +
        '<div class="sys-measure"><small>Где смотреть и как считать</small>' + esc(n.measure) + '</div>' +
        (h ? '<div class="sys-health h-' + (h.level || 'none') + '"><small>' + esc(p.name) + '</small>' + esc(h.text) + '</div>' : '');
    }
    function linksHtml(n) {
      var outs = edges.filter(function (e) { return e.from === n.id; }).sort(function (a, b) { return b.w - a.w; });
      var ins = edges.filter(function (e) { return e.to === n.id; }).sort(function (a, b) { return b.w - a.w; });
      return '<h3 style="margin-top:16px">Влияет на · ' + outs.length + '</h3><ul class="sys-rels">' + outs.map(function (e) { return relItem(e, e.to); }).join('') + '</ul>' +
        '<h3 style="margin-top:14px">Зависит от · ' + ins.length + '</h3><ul class="sys-rels">' + (ins.length ? ins.map(function (e) { return relItem(e, e.from); }).join('') : '<li class="small muted" style="padding:8px">Стартовая точка системы — задаётся решениями команды.</li>') + '</ul>';
    }
    function renderDock() {
      var html = '';
      if (pathSel) {
        var pr = PRESETS.filter(function (x) { return x.path === pathSel; })[0];
        html = '<div class="sys-p-head"><span class="eyebrow">Цепочка</span>' + closeBtn() + '</div><h2>' + esc(pr.title) + '</h2><p class="muted small" style="margin-top:6px">' + esc(pr.text) + '</p>' +
          '<ol class="sys-path">' + pathSel.map(function (nid, i) {
            var e = i ? edges.filter(function (x) { return x.from === pathSel[i - 1] && x.to === nid; })[0] : null;
            return '<li><button type="button" class="sys-rel" data-sys-node="' + nid + '"><span><b>' + esc(byId[nid].label) + '</b><small>' + (e ? esc(e.why) : 'старт') + '</small></span></button></li>';
          }).join('') + '</ol>';
      } else if (ui.sysDock === 'list') {
        html = '<div class="sys-p-head"><h2>Все узлы</h2>' + closeBtn() + '</div>' + CLUSTERS.concat(['brand']).map(function (st) {
          var ns = NODES.filter(function (n) { return clusterOf(n) === st; });
          return '<h3 class="sys-list-h"><i class="lg-dot" style="background:' + STAGE_C[st] + '"></i>' + esc(CLUSTER_TITLE[st]) + '</h3><ul class="sys-rels">' + ns.map(function (n) {
            return '<li><button type="button" class="sys-rel" data-sys-node="' + n.id + '"><span><b>' + esc(n.label) + '</b><small>' + esc(LAYERS[n.layer].title) + ' · ' + esc(n.desc.split('.')[0]) + '</small></span></button></li>';
          }).join('') + '</ul>';
        }).join('');
      } else if (ui.sysDock === 'presets') {
        html = '<div class="sys-p-head"><h2>Сценарии</h2>' + closeBtn() + '</div><div class="sys-measure" style="margin:0 0 12px"><small>Три среза одной системы</small><b>Обзор</b> — из чего состоит маркетинг. <b>Причины и следствия</b> — почему изменился показатель и что будет дальше. <b>Деньги</b> — какой рычаг сильнее двигает прибыль. Северная звезда товарного бизнеса — <b>LTV / CAC</b>, цель от 3 к 1.</div><div class="stack" style="gap:8px">' +
          PRESETS.map(function (x, i) { return '<button type="button" class="sys-preset" data-sys-preset="' + i + '"><b>' + esc(x.title) + '</b><small>' + (x.path ? 'Обзор · ' : 'Причины и следствия · ') + esc(x.text) + '</small></button>'; }).join('') + '</div>';
      } else if (slice === 'money' && ui.sysNode) {
        var m = MONEY_BY[ui.sysNode], mv = moneyVal(m, p);
        html = '<div class="sys-p-head"><span class="eyebrow">Деньги' + (m.op ? ' · ' + esc(m.op) : '') + '</span>' + closeBtn() + '</div><h2>' + esc(m.label) + '</h2>' +
          (m.formula ? '<div class="sys-measure"><small>Формула</small>' + esc(m.formula) + '</div>' : '') +
          (mv ? '<div class="sys-health h-' + (mv.level || 'none') + '"><small>' + esc(p.name) + '</small>' + esc(mv.text) + '</div>' : '') +
          (m.desc ? '<p style="margin-top:12px">' + esc(m.desc) + '</p>' : (m.node ? '<p style="margin-top:12px">' + esc(byId[m.node].desc) + '</p>' : '')) +
          (m.children ? '<h3 style="margin-top:16px">Из чего складывается</h3><ul class="sys-rels">' + m.children.map(function (c) { var cm = MONEY_BY[c]; return '<li><button type="button" class="sys-rel" data-sys-money="' + c + '"><span class="sys-rel-sign ' + (cm.op === '−' || cm.op === '÷' ? 'neg' : 'pos') + '">' + esc(cm.op || '') + '</span><span><b>' + esc(cm.label) + '</b><small>' + esc(cm.formula || '') + '</small></span></button></li>'; }).join('') + '</ul>' : '') +
          (m.node ? '<button type="button" class="btn soft block" style="margin-top:14px" data-sys-cause="' + m.node + '">' + icon('arrowR', 'sm') + 'Что влияет на «' + esc(byId[m.node].label) + '»</button>' : '');
      } else if (ui.sysNode && byId[ui.sysNode]) {
        var n = byId[ui.sysNode];
        if (slice === 'cause' && ui.sysMode === 'sim') {
          var sim = lastSim || simulate(n.id, ui.sysImpulse);
          var list = Object.keys(sim.eff).filter(function (k2) { return k2 !== n.id && Math.abs(sim.eff[k2]) >= 0.04; })
            .sort(function (a, b) { return Math.abs(sim.eff[b]) - Math.abs(sim.eff[a]); }).slice(0, 10);
          html = nodeHead(n) + '<div class="sys-seg" role="group" aria-label="Направление" style="margin-top:14px"><button type="button" data-sys-impulse="1" aria-pressed="' + (ui.sysImpulse > 0) + '">Если вырастет ↑</button><button type="button" data-sys-impulse="-1" aria-pressed="' + (ui.sysImpulse < 0) + '">Если снизится ↓</button></div>' +
            '<h3 style="margin-top:16px">Что изменится</h3><ul class="sys-effects">' + list.map(function (k2) {
              var v = sim.eff[k2], good = v * byId[k2].polarity > 0;
              return '<li><button type="button" class="sys-rel" data-sys-node="' + k2 + '"><span class="sys-eff-arrow ' + (good ? 'good' : 'bad') + '" aria-hidden="true">' + (v > 0 ? '↑' : '↓') + '</span><span style="flex:1"><b>' + esc(byId[k2].label) + '</b><small>' + (v > 0 ? 'растёт' : 'снижается') + ' · ' + (good ? 'хорошо' : 'плохо') + '</small>' +
                '<span class="sys-bar ' + (good ? 'good' : 'bad') + '"><i style="width:' + Math.round(Math.abs(v) * 100) + '%"></i></span></span></button></li>';
            }).join('') + '</ul><p class="small muted" style="margin-top:10px">Сила влияния ослабевает с каждым шагом цепочки. Это модель причинно-следственных связей, а не прогноз в цифрах.</p>';
        } else {
          html = nodeHead(n) + (slice === 'overview' ? '<button type="button" class="btn primary block" style="margin-top:14px" data-sys-cause="' + n.id + '">' + icon('arrowR', 'sm') + 'Причины и следствия</button>' : '<button type="button" class="btn soft block" style="margin-top:14px" data-sys-mode="sim">' + icon('sparkle', 'sm') + 'Смоделировать влияние</button>') + linksHtml(n);
        }
      }
      var wasOpen = dock.classList.contains('open'), open = !!html;
      dock.innerHTML = html;
      dock.classList.toggle('open', open);
      stage.classList.toggle('dock-open', open);
      if (wasOpen !== open && view && !userMoved) setView(fitView(), true);
      stage.querySelectorAll('[data-sys-dock]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.sysDock === ui.sysDock && !pathSel && !(ui.sysNode && slice !== 'cause')); });
      stage.querySelectorAll('.sys-hud [data-sys-mode]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.sysMode === ui.sysMode); });
      var pb = stage.querySelector('[data-sys-problems]'); if (pb) pb.setAttribute('aria-pressed', probOn());
    }

    function refresh() {
      lastSim = slice === 'cause' && ui.sysNode && ui.sysMode === 'sim' ? simulate(ui.sysNode, ui.sysImpulse) : null;
      renderDock();
      pulses = []; nextCycle = 0;
      requestDraw();
    }
    function goSlice(s, focus) {
      ui.sysDock = null; pathSel = null;
      var hash = s === 'cause' ? '#/system/cause/' + (focus || ui.sysFocus) : s === 'money' ? '#/system/money' : '#/system' + (focus ? '/' + focus : '');
      history.replaceState(null, '', hash);
      BM.render();
    }
    function select(id, center) {
      pathSel = null;
      if (slice === 'cause') {
        if (!id) { ui.sysDock = null; refresh(); return; }
        ui.sysFocus = id; goSlice('cause', id); return;
      }
      ui.sysNode = id;
      if (id) ui.sysDock = null;
      if (slice === 'overview') history.replaceState(null, '', '#/system' + (id ? '/' + id : ''));
      refresh();
      if (id && center && geo.byId[id]) centerOn(geo.byId[id]);
    }
    function hit(x, y) {
      var best = null, bd = 1e9;
      geo.items.forEach(function (it) {
        if (it.box) {
          var bx = view.x + it.x * view.k, by = view.y + (it.y - it.h / 2) * view.k;
          if (x >= bx && x <= bx + it.w * view.k && y >= by && y <= by + it.h * view.k) { best = it; bd = 0; }
          return;
        }
        var sx = view.x + it.x * view.k, sy = view.y + it.y * view.k;
        var rs = it.r * clamp(Math.pow(view.k / fitK, 0.5), 0.75, 1.9) * (W < 600 ? 0.65 : 1) + (W < 600 ? 12 : 10);
        var d = Math.hypot(sx - x, sy - y);
        if (d < rs && d < bd) { bd = d; best = it; }
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
        var k = clamp(pinch.k * d / (pinch.d || 1), fitK * 0.35, fitK * 7);
        var wx = (pinch.cx - pinch.vx) / pinch.k, wy = (pinch.cy - pinch.vy) / pinch.k;
        userMoved = true;
        setView({ k: k, x: mx - wx * k, y: my - wy * k });
        return;
      }
      if (drag) {
        var dx = pt.x - drag.x, dy = pt.y - drag.y;
        if (!drag.moved && Math.hypot(dx, dy) > 5) { drag.moved = true; cv.classList.add('grabbing'); }
        if (drag.moved) { userMoved = true; setView({ k: view.k, x: drag.vx + dx, y: drag.vy + dy }); }
        return;
      }
      if (e.pointerType === 'mouse') {
        var it = hit(pt.x, pt.y), id = it ? it.id : null;
        cv.classList.toggle('pointing', !!it);
        if (id !== hoverId) { hoverId = id; nextCycle = 0; requestDraw(); }
      }
    }, sig);
    function up(e) {
      var pt = local(e);
      pointers.delete(e.pointerId);
      if (pinch && pointers.size < 2) { pinch = null; drag = null; return; }
      if (drag && !drag.moved && e.type === 'pointerup') {
        var it = hit(pt.x, pt.y);
        if (it) {
          if (slice === 'cause') { if (it.id !== ui.sysNode) select(it.id); }
          else select(it.id === ui.sysNode ? null : it.id);
        } else if ((ui.sysNode && slice !== 'cause') || pathSel) select(null);
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
      else if (e.key === '0') { userMoved = false; setView(fitView(), true); }
      else if (e.key === 'ArrowLeft') { userMoved = true; setView({ k: view.k, x: view.x + step, y: view.y }, true); }
      else if (e.key === 'ArrowRight') { userMoved = true; setView({ k: view.k, x: view.x - step, y: view.y }, true); }
      else if (e.key === 'ArrowUp') { userMoved = true; setView({ k: view.k, x: view.x, y: view.y + step }, true); }
      else if (e.key === 'ArrowDown') { userMoved = true; setView({ k: view.k, x: view.x, y: view.y - step }, true); }
      else return;
      e.preventDefault();
    }, sig);
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' || document.querySelector('dialog[open]') || document.fullscreenElement) return;
      if (pathSel || ui.sysDock || (ui.sysNode && slice !== 'cause')) { ui.sysDock = null; select(null); }
    }, sig);

    stage.addEventListener('click', function (e) {
      var t;
      if ((t = e.target.closest('[data-sys-slice]'))) { if (t.dataset.sysSlice !== slice) goSlice(t.dataset.sysSlice, t.dataset.sysSlice === 'cause' ? ui.sysFocus : null); return; }
      if ((t = e.target.closest('[data-sys-cause]'))) { ui.sysFocus = t.dataset.sysCause; goSlice('cause', ui.sysFocus); return; }
      if ((t = e.target.closest('[data-sys-money]'))) { ui.sysNode = t.dataset.sysMoney; refresh(); centerOn(geo.byId[ui.sysNode]); return; }
      if ((t = e.target.closest('[data-sys-node]'))) {
        var id = t.dataset.sysNode;
        if (slice === 'money') { ui.sysFocus = id; goSlice('cause', id); return; }
        ui.sysDock = null; select(id, true); return;
      }
      if ((t = e.target.closest('[data-sys-mode]'))) {
        ui.sysMode = t.dataset.sysMode;
        if (slice !== 'cause') { ui.sysFocus = ui.sysNode || ui.sysFocus; goSlice('cause', ui.sysFocus); return; }
        refresh(); return;
      }
      if ((t = e.target.closest('[data-sys-impulse]'))) { ui.sysImpulse = +t.dataset.sysImpulse; refresh(); return; }
      if (e.target.closest('[data-sys-close]')) {
        if (ui.sysDock) { ui.sysDock = null; refresh(); return; }
        if (slice === 'cause') { refresh(); dock.classList.remove('open'); stage.classList.remove('dock-open'); if (!userMoved) setView(fitView(), true); return; }
        select(null); return;
      }
      if (e.target.closest('[data-sys-problems]')) { ui.sysProblems = !ui.sysProblems; refresh(); return; }
      if ((t = e.target.closest('[data-sys-dock]'))) {
        var want = t.dataset.sysDock;
        pathSel = null;
        if (slice !== 'cause') { ui.sysNode = null; if (slice === 'overview') history.replaceState(null, '', '#/system'); }
        ui.sysDock = ui.sysDock === want ? null : want;
        refresh(); return;
      }
      if ((t = e.target.closest('[data-sys-preset]'))) {
        var pr = PRESETS[+t.dataset.sysPreset];
        ui.sysDock = null;
        if (pr.path) {
          if (slice !== 'overview') { ui.sysPendingPath = +t.dataset.sysPreset; goSlice('overview'); return; }
          ui.sysNode = null; pathSel = pr.path; history.replaceState(null, '', '#/system'); refresh(); return;
        }
        ui.sysMode = pr.mode === 'sim' ? 'sim' : 'links'; if (pr.impulse) ui.sysImpulse = pr.impulse;
        ui.sysFocus = pr.node; goSlice('cause', pr.node); return;
      }
      if ((t = e.target.closest('[data-sys-zoom]'))) {
        var z = t.dataset.sysZoom;
        if (z === 'in') zoomAt(1.35, (W - dockW()) / 2, H / 2, true);
        else if (z === 'out') zoomAt(1 / 1.35, (W - dockW()) / 2, H / 2, true);
        else if (z === 'fit') { userMoved = false; setView(fitView(), true); }
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
      if (e.target.id === 'sys-project') { ui.sysProject = e.target.value; BM.render(); return; }
      if (e.target.id === 'sys-stage-f') ui.sysStage = e.target.value;
      else if (e.target.id === 'sys-type-f') ui.sysType = e.target.value;
      else return;
      pathSel = null;
      if (slice === 'overview') { ui.sysNode = null; history.replaceState(null, '', '#/system'); }
      refresh();
    }, sig);
    document.addEventListener('fullscreenchange', function () {
      var b = stage.querySelector('[data-sys-zoom="full"]');
      if (b) b.setAttribute('aria-label', document.fullscreenElement ? 'Выйти из полноэкранного режима' : 'Развернуть на весь экран');
      setTimeout(function () { userMoved = false; setView(fitView(), true); }, 120);
    }, sig);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) requestDraw(); }, sig);

    var ro = new ResizeObserver(resize);
    ro.observe(stage);
    ctl.signal.addEventListener('abort', function () { ro.disconnect(); });

    // initial
    var legendPref = null;
    try { legendPref = localStorage.getItem('bmh-sys-legend'); } catch (err) {}
    var legendOn = legendPref ? legendPref === '1' : window.innerWidth >= 1024;
    stage.classList.toggle('legend-open', legendOn);
    var lb = stage.querySelector('[data-sys-legend]'); if (lb) lb.setAttribute('aria-expanded', legendOn);
    if (ui.sysPendingPath != null && slice === 'overview') { pathSel = PRESETS[ui.sysPendingPath].path; ui.sysPendingPath = null; }
    renderDock();
    resize();
    refresh();
    var hint = stage.querySelector('#sys-hint'), seen = null;
    try { seen = localStorage.getItem('bmh-sys-hint2'); } catch (err) {}
    if (!seen) {
      hint.textContent = 'Переключайте срезы сверху: Обзор, Причины и следствия, Деньги. ' + (matchMedia('(pointer: coarse)').matches ? 'Щипок — масштаб.' : 'Колесо — масштаб.');
      hint.hidden = false;
      var hudEl = stage.querySelector('.sys-hud');
      if (hudEl && window.innerWidth >= 1024) hint.style.top = (hudEl.offsetTop + hudEl.offsetHeight + 12) + 'px';
      setTimeout(function () { hint.hidden = true; }, 6000);
      try { localStorage.setItem('bmh-sys-hint2', '1'); } catch (err) {}
    }
  };
})();
