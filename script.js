document.addEventListener('DOMContentLoaded', () => {
    // --- 1. ЛОГИКА ПЕЧЕНЬЯ С ПРЕДСКАЗАНИЯМИ ---
    const cookieDisplay = document.getElementById('cookieDisplay');
    const cookieStatus = document.getElementById('cookieStatus');
    const fortuneCard = document.getElementById('fortuneCard');
    const fortuneText = document.getElementById('fortuneText');
    const newFortuneBtn = document.getElementById('newFortuneBtn');

    const fortunes = [
        "«Сегодня тебя ждет неожиданный комплимент и самый вкусный раф в Алматы.»",
        "«Твоя продуктивность сегодня взлетит до небес, особенно если зайти в Save Point.»",
        "«Звезды говорят: пора отвлечься от дел и выпить чашку свежего фильтра.»",
        "«Удача на твоей стороне! Все баги в проектах исправлятся сами собой.»",
        "«Тебя ждет уютный вечер, душевный разговор и ароматная выпечка.»",
        "«Нажми [Enter] на клавиатуре судьбы — день принесет только хорошие новости.»"
    ];

    function showRandomFortune() {
        const randomIndex = Math.floor(Math.random() * fortunes.length);
        fortuneText.textContent = fortunes[randomIndex];
        fortuneCard.classList.remove('hidden');
        cookieStatus.textContent = "Предсказание успешно расшифровано! 🍪";
    }

    if (cookieDisplay) {
        cookieDisplay.addEventListener('click', showRandomFortune);
    }
    if (newFortuneBtn) {
        newFortuneBtn.addEventListener('click', showRandomFortune);
    }

    // --- 2. ЛОГИКА КОРЗИНЫ И МОДАЛЬНОГО МЕНЮ ---
    const menuModal = document.getElementById('menuModal');
    const openMenuBtn = document.getElementById('openMenuBtn');
    const heroMenuBtn = document.getElementById('heroMenuBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');
    
    const modalItemsList = document.getElementById('modalItemsList');
    const cartItemsContainer = document.getElementById('cartItemsContainer');
    const cartTotal = document.getElementById('cartTotal');
    const checkoutBtn = document.getElementById('checkoutBtn');
    const orderFormBlock = document.getElementById('orderFormBlock');
    const orderActionsBlock = document.getElementById('orderActionsBlock');
    const submitOrderBtn = document.getElementById('submitOrderBtn');
    const clientName = document.getElementById('clientName');
    const clientPhone = document.getElementById('clientPhone');
    const successModal = document.getElementById('successModal');
    const closeSuccessBtn = document.getElementById('closeSuccessBtn');
    const successMessageText = document.getElementById('successMessageText');

    const fullMenu = [
        { name: 'Фильтр-кофе', price: 1200, icon: '☕' },
        { name: 'Лавандовый Раф', price: 1800, icon: '🥛' },
        { name: 'Круассан', price: 1400, icon: '🥐' },
        { name: 'Эспрессо Классик', price: 900, icon: '☕' },
        { name: 'Капучино Double', price: 1500, icon: '☕' },
        { name: 'Чизкейк Нью-Йорк', price: 1600, icon: '🍰' }
    ];

    let cart = [];

    function openMenu() {
        if (menuModal) {
            menuModal.classList.remove('hidden');
            renderModalMenu();
            updateCartUI();
        }
    }

    function closeModal() {
        if (menuModal) {
            menuModal.classList.add('hidden');
            if (orderFormBlock) orderFormBlock.classList.add('hidden');
            if (orderActionsBlock) orderActionsBlock.classList.remove('hidden');
        }
    }

    if (openMenuBtn) openMenuBtn.addEventListener('click', openMenu);
    if (heroMenuBtn) heroMenuBtn.addEventListener('click', openMenu);
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);

    document.querySelectorAll('.add-to-cart').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const name = e.target.getAttribute('data-name');
            const price = parseInt(e.target.getAttribute('data-price'));
            addToCart(name, price);
            openMenu();
        });
    });

    function renderModalMenu() {
        if (!modalItemsList) return;
        modalItemsList.innerHTML = '<h3>// ПОЛНЫЙ КАТАЛОГ</h3>';
        fullMenu.forEach(item => {
            const row = document.createElement('div');
            row.className = 'menu-item-row';
            row.innerHTML = `
                <span>${item.icon} ${item.name} — <b>${item.price} ₸</b></span>
                <button class="retro-btn small-btn add-modal-item" data-name="${item.name}" data-price="${item.price}">[+]</button>
            `;
            modalItemsList.appendChild(row);
        });

        document.querySelectorAll('.add-modal-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const name = e.target.getAttribute('data-name');
                const price = parseInt(e.target.getAttribute('data-price'));
                addToCart(name, price);
            });
        });
    }

    function addToCart(name, price) {
        const existing = cart.find(item => item.name === name);
        if (existing) {
            existing.qty++;
        } else {
            cart.push({ name, price, qty: 1 });
        }
        updateCartUI();
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
            let itemTotal = item.price * item.qty;
            total += itemTotal;

            const div = document.createElement('div');
            div.className = 'cart-item-row';
            div.innerHTML = `
                <span>${item.name} x${item.qty}</span>
                <span>${itemTotal} ₸ <button onclick="window.removeItem(${index})" style="background:none;border:none;color:#ff5f56;cursor:pointer;margin-left:5px;">[x]</button></span>
            `;
            cartItemsContainer.appendChild(div);
        });

        cartTotal.textContent = `Итого: ${total} ₸`;
        checkoutBtn.classList.remove('hidden');
    }

    window.removeItem = function(index) {
        cart.splice(index, 1);
        updateCartUI();
    };

    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => {
            if (orderActionsBlock) orderActionsBlock.classList.add('hidden');
            if (orderFormBlock) orderFormBlock.classList.remove('hidden');
        });
    }

    // --- 3. ОТПРАВКА ЗАКАЗА НА CLOUDFLARE PAGES FUNCTION ---
    if (submitOrderBtn) {
        submitOrderBtn.addEventListener('click', () => {
            const name = clientName ? clientName.value.trim() : '';
            const phone = clientPhone ? clientPhone.value.trim() : '';

            if (!name) {
                alert('Пожалуйста, введите ваше имя!');
                return;
            }
            if (!phone || phone.length < 6) {
                alert('Пожалуйста, введите корректный номер телефона!');
                return;
            }

            let total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

            const orderData = {
                name: name,
                phone: phone,
                cart: cart,
                total: total
            };

            submitOrderBtn.textContent = 'ОТПРАВКА...';
            submitOrderBtn.disabled = true;

            // Запрос на встроенную функцию Cloudflare Pages (/order)
            fetch('/order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(orderData)
            })
            .then(response => response.json())
            .then(result => {
                submitOrderBtn.textContent = 'ПОДТВЕРДИТЬ ЗАКАЗ';
                submitOrderBtn.disabled = false;

                if (result.success) {
                    closeModal();
                    if (successMessageText) {
                        successMessageText.textContent = `Спасибо, ${name}! Заказ успешно отправлен в Telegram-бот кофейни.`;
                    }
                    if (clientName) clientName.value = '';
                    if (clientPhone) clientPhone.value = '';
                    cart = [];
                    if (successModal) successModal.classList.remove('hidden');
                } else {
                    alert('Ошибка при отправке заказа: ' + (result.error || 'попробуйте еще раз.'));
                }
            })
            .catch(error => {
                submitOrderBtn.textContent = 'ПОДТВЕРДИТЬ ЗАКАЗ';
                submitOrderBtn.disabled = false;
                console.error('Error:', error);
                alert('Сетевая ошибка. Проверьте соединение.');
            });
        });
    }

    if (closeSuccessBtn) {
        closeSuccessBtn.addEventListener('click', () => {
            if (successModal) successModal.classList.add('hidden');
        });
    }
});