const SCRIPT_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyVjQLVuLAm03s2o5zg9ClbOe9iKIL9zTVpDI3kIb8ojMSe3QkmLj420r8FphX1X4j_/exec';
const SHEET_ID = '1xdEVKU5sreegA7Q0rOxY9ES5a3nsvxmCM7p7OCHaK0k';
const OVERDUE_THRESHOLD = 10; // ימים לאחר מועד ההשכרה

// אלמנטים
const loginScreen = document.getElementById('login-screen');
const mainScreen = document.getElementById('main-screen');
const loginBtn = document.getElementById('login-btn');
const phoneInput = document.getElementById('phone-input');
const errorMessage = document.getElementById('error-message');
const userNameEl = document.getElementById('user-name');
const containersInUseEl = document.getElementById('containers-in-use');
const overdueContainersEl = document.getElementById('overdue-containers');
const containersTableBody = document.querySelector('#containers-table tbody');
const themeToggleBtn = document.getElementById('theme-toggle');
const containerModal = document.getElementById('container-modal');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');
const closeModalBtn = document.querySelector('.close-modal-btn');
const notificationBadge = document.getElementById('notification-badge');

let customerData = null;

// --- תקשורת עם שרת Google Apps Script ---
const fetchData = async (action, params = {}) => {
    const urlParams = new URLSearchParams({ action, sheetId: SHEET_ID, ...params });
    const url = `${SCRIPT_WEB_APP_URL}?${urlParams.toString()}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        if (data.status === 'error') {
            throw new Error(data.message);
        }
        return data.data;
    } catch (error) {
        console.error("Failed to fetch data:", error);
        return null;
    }
};

// --- לוגיקה ---

const login = async () => {
    const phone = phoneInput.value.trim();
    if (!phone) {
        errorMessage.textContent = "אנא הזן מספר טלפון.";
        errorMessage.classList.remove('hidden');
        return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = 'מתחבר...';
    errorMessage.classList.add('hidden');

    try {
        const data = await fetchData('getContainersByPhone', { phone });
        if (data && data.length > 0) {
            customerData = data;
            renderMainApp();
            saveUserSession(phone);
        } else {
            errorMessage.textContent = "מספר טלפון לא נמצא או אין לו מכולות פעילות.";
            errorMessage.classList.remove('hidden');
        }
    } catch (error) {
        errorMessage.textContent = "שגיאה בחיבור לשרת.";
        errorMessage.classList.remove('hidden');
    } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = 'התחבר';
    }
};

const renderMainApp = () => {
    loginScreen.classList.add('hidden');
    mainScreen.classList.remove('hidden');

    const customerName = customerData[0]['שם לקוח'];
    userNameEl.textContent = customerName;
    renderDashboard();
};

const renderDashboard = () => {
    const activeContainers = customerData.filter(c => c['סטטוס'] !== 'סגור');
    const overdueContainers = activeContainers.filter(c => {
        const startDate = new Date(c['תאריך הזמנה']);
        const daysPassed = Math.floor((new Date() - startDate) / (1000 * 60 * 60 * 24));
        return daysPassed > OVERDUE_THRESHOLD;
    });

    containersInUseEl.textContent = activeContainers.length;
    overdueContainersEl.textContent = overdueContainers.length;
    notificationBadge.textContent = overdueContainers.length;

    renderContainersTable(activeContainers);
};

const renderContainersTable = (containers) => {
    containersTableBody.innerHTML = '';
    containers.forEach(container => {
        const startDate = new Date(container['תאריך הזמנה']);
        const daysPassed = Math.floor((new Date() - startDate) / (1000 * 60 * 60 * 24));
        const isOverdue = daysPassed > OVERDUE_THRESHOLD;
        const statusClass = isOverdue ? 'status-overdue-badge' : 'status-active-badge';
        const statusText = isOverdue ? 'חורג' : 'פעיל';

        const row = containersTableBody.insertRow();
        row.className = 'border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800';
        row.dataset.containerId = container['מספר מכולה ירדה'];
        
        row.innerHTML = `
            <td>${container['מספר מכולה ירדה']}</td>
            <td>${container['כתובת']}</td>
            <td>${daysPassed}</td>
            <td><span class="status-badge-table ${statusClass}">${statusText}</span></td>
        `;

        row.addEventListener('click', () => {
            showContainerDetails(container);
        });
    });
};

const showContainerDetails = (container) => {
    modalTitle.textContent = `מכולה ${container['מספר מכולה ירדה']}`;
    modalBody.innerHTML = `
        <p><strong>לקוח:</strong> ${container['שם לקוח']}</p>
        <p><strong>כתובת:</strong> ${container['כתובת']}</p>
        <p><strong>תאריך השכרה:</strong> ${new Date(container['תאריך הזמנה']).toLocaleDateString('he-IL')}</p>
        <p><strong>סטטוס:</strong> ${container['סטטוס']}</p>
        <p><strong>הערות:</strong> ${container['הערות'] || 'אין הערות'}</p>
    `;
    containerModal.classList.remove('hidden');
};

const toggleTheme = () => {
    const isLight = document.body.classList.toggle('light');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    const icon = themeToggleBtn.querySelector('i');
    icon.className = isLight ? 'fas fa-sun' : 'fas fa-moon';
};

const saveUserSession = (phone) => {
    localStorage.setItem('userPhone', phone);
};

const checkUserSession = async () => {
    const phone = localStorage.getItem('userPhone');
    if (phone) {
        phoneInput.value = phone;
        login();
    }
};

// --- אירועים ---
loginBtn.addEventListener('click', login);
phoneInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        login();
    }
});

themeToggleBtn.addEventListener('click', toggleTheme);

closeModalBtn.addEventListener('click', () => {
    containerModal.classList.add('hidden');
});

// --- אתחול האפליקציה ---
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.add('light');
        themeToggleBtn.querySelector('i').className = 'fas fa-sun';
    }
    checkUserSession();
});
