document.addEventListener('DOMContentLoaded', () => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMouseDevice = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    // ================= 0. Hero section fills the rest of the first viewport =================
    // The header + descriptor bar above it don't have a fixed height (content wraps
    // differently per breakpoint, the webfont can swap in after first paint), so instead
    // of hardcoding that height in CSS we measure it and publish it as a custom property
    // that .hero-section's `calc(100dvh - var(--hero-top-offset))` reads. Re-measured on
    // resize/orientation change and once the webfont settles.
    function syncHeroTopOffset() {
        const hero = document.querySelector('.hero-section');
        if (!hero) return;
        const topOffset = hero.getBoundingClientRect().top + window.scrollY;
        document.documentElement.style.setProperty('--hero-top-offset', `${topOffset}px`);
    }
    syncHeroTopOffset();

    let heroOffsetResizeTimer = null;
    function scheduleHeroOffsetSync() {
        clearTimeout(heroOffsetResizeTimer);
        heroOffsetResizeTimer = setTimeout(syncHeroTopOffset, 120);
    }
    window.addEventListener('resize', scheduleHeroOffsetSync);
    window.addEventListener('orientationchange', scheduleHeroOffsetSync);
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(syncHeroTopOffset).catch(() => {});
    }

    // ================= Custom pixel cursor (mouse-only devices) =================
    if (isMouseDevice) {
        document.documentElement.classList.add('has-custom-cursor');
        const cursorEl = document.querySelector('.custom-cursor');
        if (cursorEl) {
            // Stay hidden until the first real coordinate arrives, otherwise the
            // cursor briefly renders pinned at (0, 0) before the mouse ever moves.
            window.addEventListener('mousemove', (e) => {
                cursorEl.style.left = `${e.clientX}px`;
                cursorEl.style.top = `${e.clientY}px`;
                cursorEl.classList.add('is-ready');
            }, { once: false });
            document.addEventListener('mouseover', (e) => {
                if (e.target.closest('a, button, .card')) cursorEl.classList.add('is-active');
            });
            document.addEventListener('mouseout', (e) => {
                if (e.target.closest('a, button, .card')) cursorEl.classList.remove('is-active');
            });
        }
    }

    // ================= Scroll reveal for sections =================
    const revealEls = document.querySelectorAll('.reveal');
    // Sections are visible by default in CSS. Only flip on the hide/reveal
    // behaviour once we know JS + IntersectionObserver actually work, so a
    // script failure never leaves content permanently invisible.
    if (!prefersReducedMotion && 'IntersectionObserver' in window && revealEls.length) {
        document.documentElement.classList.add('js-reveal-ready');
        const revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
        revealEls.forEach((el) => revealObserver.observe(el));
    }

    // ================= Card tilt + magnetic buttons (mouse-only, respects reduced motion) =================
    if (isMouseDevice && !prefersReducedMotion) {
        document.querySelectorAll('.card').forEach((card) => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const px = (e.clientX - rect.left) / rect.width - 0.5;
                const py = (e.clientY - rect.top) / rect.height - 0.5;
                card.style.transform = `perspective(600px) rotateX(${(-py * 6).toFixed(2)}deg) rotateY(${(px * 6).toFixed(2)}deg)`;
            });
            card.addEventListener('mouseleave', () => { card.style.transform = ''; });
        });

        document.querySelectorAll('.retro-btn.primary').forEach((btn) => {
            btn.addEventListener('mousemove', (e) => {
                const rect = btn.getBoundingClientRect();
                const dx = (e.clientX - rect.left - rect.width / 2) * 0.25;
                const dy = (e.clientY - rect.top - rect.height / 2) * 0.25;
                btn.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`;
            });
            btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });
        });
    }

    // ================= Footer year =================
    const footerYear = document.getElementById('footerYear');
    if (footerYear) footerYear.textContent = String(new Date().getFullYear());

    // ================= Analytics (no-op until real IDs are set below) =================
    // TODO: paste your real GA4 measurement ID and/or Yandex Metrika counter ID.
    const GA4_MEASUREMENT_ID = ''; // e.g. 'G-XXXXXXXXXX'
    const YM_COUNTER_ID = '';      // e.g. 12345678

    function loadGA4(id) {
        const script = document.createElement('script');
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
        document.head.appendChild(script);
        window.dataLayer = window.dataLayer || [];
        window.gtag = function gtag() { window.dataLayer.push(arguments); };
        window.gtag('js', new Date());
        window.gtag('config', id);
    }

    function loadYandexMetrika(id) {
        window.ym = window.ym || function ym() { (window.ym.a = window.ym.a || []).push(arguments); };
        window.ym.l = Number(new Date());
        const script = document.createElement('script');
        script.async = true;
        script.src = 'https://mc.yandex.ru/metrika/tag.js';
        document.head.appendChild(script);
        window.ym(id, 'init', { clickmap: true, trackLinks: true, accurateTrackBounce: true });
    }

    if (GA4_MEASUREMENT_ID) loadGA4(GA4_MEASUREMENT_ID);
    if (YM_COUNTER_ID) loadYandexMetrika(YM_COUNTER_ID);

    function trackEvent(name, params) {
        if (window.gtag) window.gtag('event', name, params || {});
        if (window.ym && YM_COUNTER_ID) window.ym(YM_COUNTER_ID, 'reachGoal', name);
    }

    // ================= 1. Fortune cookie logic =================
    const cookieDisplay = document.getElementById('cookieDisplay');
    const cookieStatus = document.getElementById('cookieStatus');
    const fortuneCard = document.getElementById('fortuneCard');
    const fortuneText = document.getElementById('fortuneText');
    const newFortuneBtn = document.getElementById('newFortuneBtn');

    const fortunes = [
        "«Сегодня тебя ждет неожиданный комплимент и самый вкусный раф в Алматы.»",
        "«Твоя продуктивность сегодня взлетит до небес, особенно если зайти в Save Point.»",
        "«Звезды говорят: пора отвлечься от дел и выпить чашку свежего фильтра.»",
        "«Удача на твоей стороне! Все баги в проектах исправятся сами собой.»",
        "«Тебя ждет уютный вечер, душевный разговор и ароматная выпечка.»",
        "«Нажми [Enter] на клавиатуре судьбы — день принесет только хорошие новости.»"
    ];

    function showRandomFortune() {
        const randomIndex = Math.floor(Math.random() * fortunes.length);
        fortuneText.textContent = fortunes[randomIndex];
        fortuneCard.classList.remove('hidden');
        cookieStatus.textContent = "Предсказание успешно расшифровано!";
    }

    if (cookieDisplay) {
        cookieDisplay.addEventListener('click', showRandomFortune);
        cookieDisplay.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                showRandomFortune();
            }
        });
    }
    if (newFortuneBtn) newFortuneBtn.addEventListener('click', showRandomFortune);

    // ================= 1b. Generic accordion (shared by FAQ and the menu categories) =================
    function initAccordion(container) {
        if (!container) return;
        container.querySelectorAll('.accordion-trigger').forEach((btn) => {
            btn.addEventListener('click', () => {
                const item = btn.closest('.accordion-item');
                if (!item) return;
                const isOpen = item.classList.contains('is-open');
                item.classList.toggle('is-open', !isOpen);
                btn.setAttribute('aria-expanded', String(!isOpen));
            });
        });
    }
    initAccordion(document.getElementById('faqAccordion'));

    // ================= 1c. Occupancy indicator (front-end simulation for demo purposes) =================
    // Note: this is a portfolio demo — there is no real seat-sensor backend, so the
    // count below is a plausible simulation derived from time of day, not live data.
    const occupancyText = document.getElementById('occupancyText');
    const occupancyIndicator = document.getElementById('occupancyIndicator');
    const occupancyDot = occupancyIndicator ? occupancyIndicator.querySelector('.occupancy-dot') : null;
    let occupancyFree = null;

    // Russian plural forms for "стол" depending on the trailing digit(s).
    function pluralize(n, one, few, many) {
        const mod10 = n % 10;
        const mod100 = n % 100;
        if (mod10 === 1 && mod100 !== 11) return one;
        if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return few;
        return many;
    }

    function renderOccupancy() {
        if (!occupancyText || occupancyFree === null) return;
        const verb = occupancyFree === 1 ? 'свободен' : 'свободно';
        occupancyText.textContent = `Сейчас ${verb} ${occupancyFree} ${pluralize(occupancyFree, 'стол', 'стола', 'столов')} с розетками в зоне коворкинга`;
        if (occupancyDot) occupancyDot.classList.toggle('is-low', occupancyFree <= 2);
    }

    function isPeakHour() {
        const hour = new Date().getHours();
        return hour >= 12 && hour < 16;
    }

    function tickOccupancy() {
        const isPeak = isPeakHour();
        const min = isPeak ? 1 : 3;
        const max = isPeak ? 4 : 8;
        if (occupancyFree === null) {
            occupancyFree = Math.floor(Math.random() * (max - min + 1)) + min;
        } else {
            const drift = Math.floor(Math.random() * 3) - 1; // -1, 0, +1
            occupancyFree = Math.min(max, Math.max(min, occupancyFree + drift));
        }
        renderOccupancy();
    }

    if (occupancyText) {
        tickOccupancy();
        setInterval(tickOccupancy, 45000);
    }

    // ================= 1d. Interactive hall map (table picker inside the booking modal) =================
    // Front-end simulation only, same spirit as the occupancy indicator above: there is
    // no real seat-sensor/POS integration behind this demo, statuses are randomized on
    // a timer rather than read from a live system.
    const TABLES = [
        { id: 'T1', zone: 'Зона для встреч', seats: 4 },
        { id: 'T2', zone: 'Зона для встреч', seats: 4 },
        { id: 'T3', zone: 'Зона для встреч', seats: 4 },
        { id: 'T4', zone: 'У окна', seats: 3 },
        { id: 'T5', zone: 'У окна', seats: 3 },
        { id: 'T6', zone: 'Тихий угол', seats: 1 },
        { id: 'T7', zone: 'Тихий угол', seats: 1 },
        { id: 'T8', zone: 'Тихий угол', seats: 1 }
    ];
    const OUTLETS_PER_TABLE = 4;

    const hallMap = document.getElementById('hallMap');
    const hallMapSelection = document.getElementById('hallMapSelection');
    const hallMapGroupNote = document.getElementById('hallMapGroupNote');
    const tableStatuses = {};
    let selectedTableId = null;

    function randomizeTableStatuses() {
        const isPeak = isPeakHour();
        TABLES.forEach((t) => {
            if (t.id === selectedTableId) return; // never yank the table out from under the guest's own pick
            const roll = Math.random();
            if (isPeak) {
                tableStatuses[t.id] = roll < 0.45 ? 'occupied' : roll < 0.65 ? 'soon' : 'free';
            } else {
                tableStatuses[t.id] = roll < 0.2 ? 'occupied' : roll < 0.35 ? 'soon' : 'free';
            }
        });
    }

    function renderHallSelection() {
        if (!hallMapSelection) return;
        if (!selectedTableId) {
            hallMapSelection.textContent = 'Выберите стол на карте выше.';
            return;
        }
        const table = TABLES.find((t) => t.id === selectedTableId);
        hallMapSelection.textContent = `Выбран стол ${table.id} · ${table.zone} · ${table.seats} ${pluralize(table.seats, 'место', 'места', 'мест')} · ${OUTLETS_PER_TABLE} розетки`;
    }

    function renderHallMap() {
        if (!hallMap) return;
        hallMap.querySelectorAll('.hall-table').forEach((btn) => {
            const id = btn.getAttribute('data-table');
            const table = TABLES.find((t) => t.id === id);
            const status = tableStatuses[id] || 'free';
            const isSelected = id === selectedTableId;
            btn.setAttribute('data-status', status);
            btn.setAttribute('aria-pressed', String(isSelected));
            btn.disabled = status === 'occupied' && !isSelected;
            const statusLabel = status === 'occupied' ? 'занят' : status === 'soon' ? 'скоро освободится' : 'свободен';
            btn.setAttribute('aria-label', `Стол ${id}, ${table.zone}, ${table.seats} ${pluralize(table.seats, 'место', 'места', 'мест')}, ${OUTLETS_PER_TABLE} розетки, ${statusLabel}`);
        });
        renderHallSelection();
        updateBookingSubmitAvailability();
    }

    // The click listener can be wired up now, but the first renderHallMap() call has to
    // wait until submitBookingBtn/bookingConsent exist (declared further down, in "2b.
    // Booking modal") since it calls updateBookingSubmitAvailability(). See the
    // hallMap-init block right after those declarations.
    if (hallMap) {
        hallMap.addEventListener('click', (e) => {
            const btn = e.target.closest('.hall-table');
            if (!btn || btn.disabled) return;
            const id = btn.getAttribute('data-table');
            selectedTableId = selectedTableId === id ? null : id;
            renderHallMap();
        });
    }

    // Table selection is required for a normal booking, but not for a 5+ guest group —
    // those go through the "events" flow and get a zone assigned by staff, not the map.
    function tableRequired() {
        const guests = bookingGuestsValue();
        return guests <= 4;
    }
    function bookingGuestsValue() {
        const raw = bookingGuests ? parseInt(bookingGuests.value, 10) : 1;
        return Number.isFinite(raw) && raw > 0 ? raw : 1;
    }
    function refreshHallMapForGuests() {
        const needsTable = tableRequired();
        if (hallMap) hallMap.classList.toggle('is-optional', !needsTable);
        if (hallMapGroupNote) hallMapGroupNote.classList.toggle('hidden', needsTable);
        updateBookingSubmitAvailability();
    }

    // ================= 2. Cart & menu modal logic =================
    const menuModal = document.getElementById('menuModal');
    const bookingModal = document.getElementById('bookingModal');
    const successModal = document.getElementById('successModal');
    const openMenuBtn = document.getElementById('openMenuBtn');
    const heroMenuBtn = document.getElementById('heroMenuBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const closeBookingModalBtn = document.getElementById('closeBookingModalBtn');
    const closeSuccessBtn = document.getElementById('closeSuccessBtn');
    const successInstructionText = document.getElementById('successInstructionText');

    const menuCategoriesEl = document.getElementById('menuCategories');
    const cartItemsContainer = document.getElementById('cartItemsContainer');
    const cartTotal = document.getElementById('cartTotal');
    const checkoutBtn = document.getElementById('checkoutBtn');
    const orderFormBlock = document.getElementById('orderFormBlock');
    const orderActionsBlock = document.getElementById('orderActionsBlock');
    const submitOrderBtn = document.getElementById('submitOrderBtn');
    const clientName = document.getElementById('clientName');
    const clientPhone = document.getElementById('clientPhone');
    const clientComment = document.getElementById('clientComment');
    const websiteHoneypot = document.getElementById('website');
    const consentCheckbox = document.getElementById('consentCheckbox');
    const orderFormError = document.getElementById('orderFormError');
    const successMessageText = document.getElementById('successMessageText');

    // Single source of truth for the full menu: every category and item lives here, and
    // both the modal accordion and the cart read straight from this array. Keeping the
    // 4 homepage "bestseller" cards as hand-authored HTML is fine — they're marketing
    // copy with their own imagery, not a second copy of the price list — but their
    // name/price must match an entry here so nothing drifts between the two.
    const MENU_CATEGORIES = [
        {
            id: 'coffee-classic', title: 'Кофе · Классика', icon: 'coffee',
            items: [
                { name: 'Эспрессо', price: 700 },
                { name: 'Доппио', price: 950 },
                { name: 'Американо', price: 850 },
                { name: 'Капучино', price: 1250 },
                { name: 'Флэт уайт', price: 1350 },
                { name: 'Латте', price: 1350 },
                { name: 'Кортадо', price: 1100 },
                { name: 'Раф', price: 1550 }
            ]
        },
        {
            id: 'coffee-filter', title: 'Фильтр и альтернатива', icon: 'coffee',
            items: [
                { name: 'V60 (зерно недели)', price: 1100 },
                { name: 'Аэропресс', price: 1100 },
                { name: 'Кемекс на двоих', price: 1900 }
            ]
        },
        {
            id: 'coffee-signature', title: 'Фирменные напитки', icon: 'sparkle',
            items: [
                { name: 'Раф «Апорт»', price: 1650, desc: 'эспрессо, яблочное пюре, корица' },
                { name: 'Латте «Облепиха-мёд»', price: 1700, desc: 'облепиховый джем, горный мёд' },
                { name: 'Флэт уайт «Тянь-Шань»', price: 1550, desc: 'сироп из грецкого ореха' }
            ]
        },
        {
            id: 'coffee-cold', title: 'Холодные напитки', icon: 'coffee',
            items: [
                { name: 'Колд брю', price: 1200 },
                { name: 'Колд брю на тонике', price: 1400 },
                { name: 'Эспрессо-тоник', price: 1300 },
                { name: 'Айс-латте', price: 1450 },
                { name: 'Айс-матча', price: 1600 }
            ]
        },
        {
            id: 'not-coffee', title: 'Не кофе', icon: 'tea',
            items: [
                { name: 'Матча-латте', price: 1600 },
                { name: 'Какао на бельгийском шоколаде', price: 1300 },
                { name: 'Чай «Зима в горах»', price: 1100, desc: 'чёрный чай, чабрец, мёд' },
                { name: 'Лимонад лайм-мята', price: 1000 },
                { name: 'Лимонад облепиха-розмарин', price: 1000 }
            ]
        },
        {
            id: 'bakery', title: 'Свежая выпечка', icon: 'croissant',
            items: [
                { name: 'Круассан классический', price: 800 },
                { name: 'Круассан миндальный с франжипаном', price: 1250 },
                { name: 'Круассан-сэндвич с ветчиной и сыром', price: 1300 },
                { name: 'Синнабон с крем-чизом', price: 1150 },
                { name: 'Датская булочка с яблоком и карамелью', price: 1200 },
                { name: 'Банановый хлеб с грецким орехом', price: 900 },
                { name: 'Печенье шоколадное с морской солью', price: 500 },
                { name: 'Эклер с ванильным кремом', price: 900 }
            ]
        },
        {
            id: 'desserts', title: 'Десерты', icon: 'cake',
            items: [
                { name: 'Чизкейк «Нью-Йорк»', price: 1400 },
                { name: 'Чизкейк с яблоком и солёной карамелью', price: 1600 },
                { name: 'Тарт с лимонным курдом и меренгой', price: 1500 },
                { name: 'Морковный торт с крем-чизом', price: 1400 },
                { name: 'Наполеон', price: 1500 }
            ]
        },
        {
            id: 'snacks', title: 'Лёгкий перекус', icon: 'salad',
            items: [
                { name: 'Тост с авокадо, яйцом пашот и чили-маслом', price: 2200 },
                { name: 'Гранола-боул с йогуртом и ягодами', price: 1800 },
                { name: 'Сырные палочки из слоёного теста', price: 1000 }
            ]
        }
    ];

    let cart = [];
    let lastFocusedEl = null;

    function trapFocus(e) {
        const openOverlay = document.querySelector('.modal-overlay.is-open');
        if (!openOverlay) return;

        if (e.key === 'Escape') {
            if (openOverlay === menuModal) closeMenu();
            else if (openOverlay === bookingModal) closeBooking();
            else if (openOverlay === successModal) closeSuccess();
            return;
        }
        if (e.key !== 'Tab') return;

        const focusables = openOverlay.querySelectorAll(
            'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    }

    function openOverlay(overlayEl, focusTarget) {
        lastFocusedEl = document.activeElement;
        overlayEl.classList.remove('hidden');
        void overlayEl.offsetWidth; // force reflow so the opacity transition runs
        overlayEl.classList.add('is-open');
        document.addEventListener('keydown', trapFocus);
        (focusTarget || overlayEl.querySelector('button, input, a[href]'))?.focus();
    }

    function closeOverlay(overlayEl) {
        overlayEl.classList.remove('is-open');
        const onTransitionEnd = (e) => {
            if (e.target !== overlayEl || e.propertyName !== 'opacity') return;
            overlayEl.classList.add('hidden');
            overlayEl.removeEventListener('transitionend', onTransitionEnd);
        };
        overlayEl.addEventListener('transitionend', onTransitionEnd);
        setTimeout(() => overlayEl.classList.add('hidden'), 300); // fallback if transitions are off
        if (!document.querySelector('.modal-overlay.is-open')) {
            document.removeEventListener('keydown', trapFocus);
        }
        if (lastFocusedEl) lastFocusedEl.focus();
    }

    function openMenu() {
        if (!menuModal) return;
        updateCartUI();
        openOverlay(menuModal, closeModalBtn);
        trackEvent('open_menu');
    }

    function closeMenu() {
        if (!menuModal) return;
        closeOverlay(menuModal);
        if (orderFormBlock) orderFormBlock.classList.add('hidden');
        if (orderActionsBlock) orderActionsBlock.classList.remove('hidden');
        hideFormError();
    }

    function closeSuccess() {
        if (successModal) closeOverlay(successModal);
    }

    // ================= 2a. Menu rendering (data-driven, collapsible categories) =================
    function renderMenuCategories() {
        if (!menuCategoriesEl) return;
        menuCategoriesEl.innerHTML = MENU_CATEGORIES.map((cat, index) => `
            <div class="accordion-item${index === 0 ? ' is-open' : ''}">
                <button class="accordion-trigger" id="menuCat-${cat.id}" aria-expanded="${index === 0}" aria-controls="menuPanel-${cat.id}">
                    <span class="accordion-trigger-label">
                        <svg class="icon" aria-hidden="true"><use href="#icon-${cat.icon}"></use></svg>
                        ${cat.title}
                        <span class="accordion-trigger-count">(${cat.items.length})</span>
                    </span>
                    <span class="accordion-icon" aria-hidden="true">+</span>
                </button>
                <div class="accordion-panel-wrap" id="menuPanel-${cat.id}" role="region" aria-labelledby="menuCat-${cat.id}">
                    <div class="accordion-panel-inner">
                        ${cat.items.map((item) => `
                            <div class="menu-row">
                                <div class="menu-row-info">
                                    <span class="menu-row-name">${item.name}</span>
                                    ${item.desc ? `<span class="menu-row-desc">${item.desc}</span>` : ''}
                                </div>
                                <div class="menu-row-action">
                                    <span class="menu-row-price">${item.price} ₸</span>
                                    <button type="button" class="menu-add-btn" data-name="${item.name}" data-price="${item.price}" aria-label="Добавить «${item.name}» в заказ">
                                        <svg class="icon" aria-hidden="true"><use href="#icon-plus"></use></svg>
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `).join('');

        initAccordion(menuCategoriesEl);
        menuCategoriesEl.querySelectorAll('.menu-add-btn').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                const name = e.currentTarget.getAttribute('data-name');
                const price = parseInt(e.currentTarget.getAttribute('data-price'), 10);
                addToCart(name, price);
            });
        });
    }
    renderMenuCategories();

    // ================= 2b. Booking modal =================
    const bookingDate = document.getElementById('bookingDate');
    const bookingTime = document.getElementById('bookingTime');
    const bookingGuests = document.getElementById('bookingGuests');
    const bookingDrink = document.getElementById('bookingDrink');
    const bookingNote = document.getElementById('bookingNote');
    const bookingName = document.getElementById('bookingName');
    const bookingPhone = document.getElementById('bookingPhone');
    const bookingWebsiteHoneypot = document.getElementById('bookingWebsite');
    const bookingConsent = document.getElementById('bookingConsent');
    const bookingFormError = document.getElementById('bookingFormError');
    const submitBookingBtn = document.getElementById('submitBookingBtn');

    // Now that submitBookingBtn/bookingConsent exist, it's safe to run the first render
    // (it calls updateBookingSubmitAvailability(), defined further below but hoisted).
    if (hallMap) {
        randomizeTableStatuses();
        renderHallMap();
        setInterval(() => { randomizeTableStatuses(); renderHallMap(); }, 25000);
    }

    if (bookingDate) {
        // Never allow picking a date before today.
        bookingDate.min = new Date().toISOString().slice(0, 10);
    }
    if (bookingGuests) bookingGuests.addEventListener('input', refreshHallMapForGuests);
    refreshHallMapForGuests();

    function openBooking(prefill) {
        if (!bookingModal) return;
        if (prefill && bookingNote && !bookingNote.value) bookingNote.value = prefill.note || '';
        if (prefill && bookingGuests && prefill.guests) bookingGuests.value = String(prefill.guests);
        refreshHallMapForGuests();
        openOverlay(bookingModal, bookingDate || bookingModal.querySelector('button, input, a[href]'));
        trackEvent('open_booking');
    }

    function closeBooking() {
        if (!bookingModal) return;
        closeOverlay(bookingModal);
        hideBookingFormError();
    }

    function showBookingFormError(message) {
        if (!bookingFormError) return;
        bookingFormError.textContent = message;
        bookingFormError.classList.remove('hidden');
    }
    function hideBookingFormError() {
        if (!bookingFormError) return;
        bookingFormError.classList.add('hidden');
        bookingFormError.textContent = '';
    }

    function updateBookingSubmitAvailability() {
        if (!submitBookingBtn || !bookingConsent) return;
        const needsTable = tableRequired();
        submitBookingBtn.disabled = !bookingConsent.checked || (needsTable && !selectedTableId);
    }
    if (bookingConsent) bookingConsent.addEventListener('change', updateBookingSubmitAvailability);

    if (submitBookingBtn) {
        submitBookingBtn.addEventListener('click', () => {
            hideBookingFormError();

            const date = bookingDate ? bookingDate.value : '';
            const time = bookingTime ? bookingTime.value : '';
            const guests = bookingGuestsValue();
            const drink = bookingDrink ? bookingDrink.value : '';
            const note = bookingNote ? bookingNote.value.trim() : '';
            const name = bookingName ? bookingName.value.trim() : '';
            const phone = bookingPhone ? bookingPhone.value.trim() : '';
            const website = bookingWebsiteHoneypot ? bookingWebsiteHoneypot.value.trim() : '';
            const selectedTable = selectedTableId ? TABLES.find((t) => t.id === selectedTableId) : null;

            if (website) return; // honeypot tripped: silently do nothing, this is a bot

            if (!bookingConsent || !bookingConsent.checked) {
                showBookingFormError('Отметьте согласие на обработку персональных данных.');
                return;
            }
            if (tableRequired() && !selectedTable) {
                showBookingFormError('Выберите стол на карте зала — или увеличьте число гостей до 5+, если бронируете группу.');
                return;
            }
            if (!date || !time) {
                showBookingFormError('Пожалуйста, укажите дату и время брони.');
                return;
            }
            if (!guests || guests < 1 || guests > 12) {
                showBookingFormError('Количество гостей — от 1 до 12. Для большей группы напишите в комментарии.');
                return;
            }
            if (!name) {
                showBookingFormError('Пожалуйста, введите ваше имя.');
                return;
            }
            if (!phone || phone.replace(/\D/g, '').length < 6) {
                showBookingFormError('Пожалуйста, введите корректный номер телефона.');
                return;
            }

            const bookingData = {
                type: 'booking', date, time, guests, drink, note, name, phone, website,
                table: selectedTable ? selectedTable.id : '',
                tableZone: selectedTable ? selectedTable.zone : '',
                tableSeats: selectedTable ? selectedTable.seats : ''
            };

            submitBookingBtn.textContent = 'ОТПРАВКА...';
            submitBookingBtn.disabled = true;

            fetch('/order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bookingData)
            })
                .then((response) => response.json())
                .then((result) => {
                    submitBookingBtn.textContent = 'ЗАБРОНИРОВАТЬ СТОЛ';
                    updateBookingSubmitAvailability();

                    if (result.success) {
                        trackEvent('booking_submitted', { value: guests, currency: 'guests' });
                        closeBooking();
                        if (successMessageText) {
                            successMessageText.textContent = `Спасибо, ${name}! Бронь передана в Telegram-бот кофейни.`;
                        }
                        if (successInstructionText) {
                            const tableSuffix = selectedTable ? ` Твой стол — ${selectedTable.id} (${selectedTable.zone}).` : '';
                            successInstructionText.innerHTML = `Стол будет ждать тебя ${escapeHtml(date)} в ${escapeHtml(time)}, в течение 15 минут от назначенного времени.${escapeHtml(tableSuffix)} Промокод <b>SAVEPOINT20</b> на −20% активен — назови его бариста при оплате.`;
                        }
                        bookingDate.value = '';
                        bookingTime.value = '';
                        bookingGuests.value = '1';
                        if (bookingDrink) bookingDrink.value = '';
                        if (bookingNote) bookingNote.value = '';
                        if (bookingName) bookingName.value = '';
                        if (bookingPhone) bookingPhone.value = '';
                        if (bookingConsent) bookingConsent.checked = false;
                        selectedTableId = null;
                        renderHallMap();
                        refreshHallMapForGuests();
                        if (successModal) openOverlay(successModal, closeSuccessBtn);
                    } else {
                        showBookingFormError('Ошибка при отправке брони: ' + (result.error || 'попробуйте еще раз.'));
                    }
                })
                .catch((error) => {
                    submitBookingBtn.textContent = 'ЗАБРОНИРОВАТЬ СТОЛ';
                    updateBookingSubmitAvailability();
                    console.error('Booking submit error:', error);
                    showBookingFormError('Сетевая ошибка. Проверьте соединение и попробуйте ещё раз.');
                });
        });
    }

    // Small helper so dynamically-inserted values in the success modal can never
    // break markup, mirroring the escaping discipline used server-side.
    function escapeHtml(value) {
        const div = document.createElement('div');
        div.textContent = value;
        return div.innerHTML;
    }

    if (openMenuBtn) openMenuBtn.addEventListener('click', openMenu);
    if (heroMenuBtn) heroMenuBtn.addEventListener('click', openMenu);
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeMenu);
    if (closeBookingModalBtn) closeBookingModalBtn.addEventListener('click', closeBooking);
    if (closeSuccessBtn) closeSuccessBtn.addEventListener('click', closeSuccess);

    // All the CTA buttons across the page that open the booking modal.
    document.getElementById('heroBookBtn')?.addEventListener('click', () => openBooking());
    document.getElementById('solutionBookBtn')?.addEventListener('click', () => openBooking());
    document.getElementById('offerBookBtn')?.addEventListener('click', () => openBooking());
    document.getElementById('urgencyBookBtn')?.addEventListener('click', () => openBooking());
    document.getElementById('reviewsBookBtn')?.addEventListener('click', () => openBooking());
    document.getElementById('finalBookBtn')?.addEventListener('click', () => openBooking());
    document.getElementById('eventsBookBtn')?.addEventListener('click', () => openBooking({ note: 'Ивент/встреча (8–12 человек)', guests: 8 }));

    document.querySelectorAll('.add-to-cart').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            const name = e.currentTarget.getAttribute('data-name');
            const price = parseInt(e.currentTarget.getAttribute('data-price'), 10);
            addToCart(name, price);
            openMenu();
        });
    });

    function addToCart(name, price) {
        const existing = cart.find((item) => item.name === name);
        if (existing) {
            existing.qty++;
        } else {
            cart.push({ name, price, qty: 1 });
        }
        trackEvent('add_to_cart', { item_name: name, price });
        updateCartUI();
    }

    function removeFromCart(index) {
        cart.splice(index, 1);
        updateCartUI();
    }

    // Event delegation instead of a global window function + inline onclick.
    if (cartItemsContainer) {
        cartItemsContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('.cart-remove-btn');
            if (!btn) return;
            removeFromCart(parseInt(btn.getAttribute('data-index'), 10));
        });
    }

    function updateCartUI() {
        if (!cartItemsContainer || !cartTotal || !checkoutBtn) return;

        if (cart.length === 0) {
            cartItemsContainer.innerHTML = 'Заказ пуст. Выберите позиции из меню.';
            cartItemsContainer.className = 'cart-items-empty';
            checkoutBtn.classList.add('hidden');
            cartTotal.textContent = 'Итого: 0 ₸';
            return;
        }

        cartItemsContainer.className = '';
        cartItemsContainer.innerHTML = '';
        let total = 0;

        cart.forEach((item, index) => {
            const itemTotal = item.price * item.qty;
            total += itemTotal;

            const div = document.createElement('div');
            div.className = 'cart-item-row';
            div.innerHTML = `
                <span>${item.name} x${item.qty}</span>
                <span>${itemTotal} ₸ <button type="button" class="cart-remove-btn" data-index="${index}" aria-label="Удалить ${item.name} из заказа"><svg class="icon" aria-hidden="true"><use href="#icon-x-circle"></use></svg></button></span>
            `;
            cartItemsContainer.appendChild(div);
        });

        cartTotal.textContent = `Итого: ${total} ₸`;
        checkoutBtn.classList.remove('hidden');
    }

    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => {
            if (orderActionsBlock) orderActionsBlock.classList.add('hidden');
            if (orderFormBlock) orderFormBlock.classList.remove('hidden');
            trackEvent('checkout_start');
            if (clientName) clientName.focus();
        });
    }

    // ================= Consent gate + inline validation (replaces alert()) =================
    function showFormError(message) {
        if (!orderFormError) return;
        orderFormError.textContent = message;
        orderFormError.classList.remove('hidden');
    }
    function hideFormError() {
        if (!orderFormError) return;
        orderFormError.classList.add('hidden');
        orderFormError.textContent = '';
    }

    function updateSubmitAvailability() {
        if (!submitOrderBtn || !consentCheckbox) return;
        submitOrderBtn.disabled = !consentCheckbox.checked;
    }
    if (consentCheckbox) consentCheckbox.addEventListener('change', updateSubmitAvailability);

    // ================= 3. Order submission (Cloudflare Pages Function) =================
    if (submitOrderBtn) {
        submitOrderBtn.addEventListener('click', () => {
            hideFormError();

            const name = clientName ? clientName.value.trim() : '';
            const phone = clientPhone ? clientPhone.value.trim() : '';
            const comment = clientComment ? clientComment.value.trim() : '';
            const website = websiteHoneypot ? websiteHoneypot.value.trim() : '';

            if (website) return; // honeypot tripped: silently do nothing, this is a bot

            if (!consentCheckbox || !consentCheckbox.checked) {
                showFormError('Отметьте согласие на обработку персональных данных.');
                return;
            }
            if (!name) {
                showFormError('Пожалуйста, введите ваше имя.');
                return;
            }
            if (!phone || phone.replace(/\D/g, '').length < 6) {
                showFormError('Пожалуйста, введите корректный номер телефона.');
                return;
            }

            const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
            const orderData = { name, phone, comment, cart, total, website };

            submitOrderBtn.textContent = 'ОТПРАВКА...';
            submitOrderBtn.disabled = true;

            fetch('/order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData)
            })
                .then((response) => response.json())
                .then((result) => {
                    submitOrderBtn.textContent = 'ПОДТВЕРДИТЬ ЗАКАЗ';
                    updateSubmitAvailability();

                    if (result.success) {
                        trackEvent('order_submitted', { value: total, currency: 'KZT' });
                        closeMenu();
                        if (successMessageText) {
                            successMessageText.textContent = `Спасибо, ${name}! Заказ успешно отправлен в Telegram-бот кофейни.`;
                        }
                        if (successInstructionText) {
                            successInstructionText.innerHTML = 'На указанный номер будет выставлен счёт. После успешной оплаты вам придет <b>номер заказа</b>, и бариста сразу приступит к приготовлению!';
                        }
                        if (clientName) clientName.value = '';
                        if (clientPhone) clientPhone.value = '';
                        if (clientComment) clientComment.value = '';
                        if (consentCheckbox) consentCheckbox.checked = false;
                        cart = [];
                        if (successModal) openOverlay(successModal, closeSuccessBtn);
                    } else {
                        showFormError('Ошибка при отправке заказа: ' + (result.error || 'попробуйте еще раз.'));
                    }
                })
                .catch((error) => {
                    submitOrderBtn.textContent = 'ПОДТВЕРДИТЬ ЗАКАЗ';
                    updateSubmitAvailability();
                    console.error('Order submit error:', error);
                    showFormError('Сетевая ошибка. Проверьте соединение и попробуйте ещё раз.');
                });
        });
    }
});
