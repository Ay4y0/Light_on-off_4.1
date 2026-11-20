// Ссылка на ВАШ личный репозиторий с данными
const API_URL = 'https://raw.githubusercontent.com/Ay4y0/Light_on-off/main/data/kyiv-region.json';

let scheduleData = {};
let timerInterval = null;

// 1. Загрузка данных
async function fetchSchedule() {
    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        
        // Умный поиск данных вашей группы, где бы они ни лежали в файле
        const groupData = findGroupData(data);
        
        if (groupData) {
            scheduleData = groupData;
            renderGraph();
            startTimerLogic();
        } else {
            document.getElementById('timerStatusText').innerText = 'Дані для вашої черги не знайдені';
            renderGraph(true); // Рисуем пустой график, чтобы не было пустоты
        }
    } catch (error) {
        console.error('Помилка завантаження:', error);
        document.getElementById('timerStatusText').innerText = 'Помилка завантаження даних';
    }
}

// Функция для поиска группы 4.1 или GPV4.1 на любой глубине JSON
function findGroupData(obj) {
    if (!obj || typeof obj !== 'object') return null;
    
    // Если нашли ключ с названием группы
    if (obj['GPV4.1']) return obj['GPV4.1'];
    if (obj['4.1']) return obj['4.1'];
    
    // Рекурсивно ищем глубже
    for (let key in obj) {
        const result = findGroupData(obj[key]);
        if (result) return result;
    }
    return null;
}

// 2. Отрисовка графика (24 часа)
function renderGraph(allDayOn = false) {
    const grid = document.getElementById('scheduleGrid');
    grid.innerHTML = '';

    for (let i = 1; i <= 24; i++) {
        const el = document.createElement('div');
        el.className = 'scale_hours_el';

        const info = document.createElement('div');
        info.className = 'hour_info';
        info.innerText = (i === 24 ? '00' : i.toString().padStart(2, '0'));
        
        const status = document.createElement('div');
        status.className = 'hour_status';

        if (allDayOn) {
            status.classList.add('hour_active');
        } else {
            const hourStatus = scheduleData[i.toString()];
            if (hourStatus === 'yes') {
                status.classList.add('hour_active');
            } else if (hourStatus === 'first') {
                status.style.background = 'linear-gradient(to right, #243b47 50%, #ffd52d 50%)';
            } else if (hourStatus === 'second') {
                status.style.background = 'linear-gradient(to right, #ffd52d 50%, #243b47 50%)';
            } else {
                status.style.backgroundColor = '#243b47'; 
            }
        }

        el.appendChild(info);
        el.appendChild(status);
        grid.appendChild(el);
    }
}

// 3. Логика таймера
function startTimerLogic() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    let jsonHour = currentHour + 1; 
    
    let isCurrentlyOff = false;
    let nextEventTime = null;

    // Определяем, есть ли свет прямо сейчас
    const currentStatus = scheduleData[jsonHour.toString()];
    if (currentStatus === 'no') {
        isCurrentlyOff = true;
    } else if (currentStatus === 'first' && currentMinute < 30) {
        isCurrentlyOff = true;
    } else if (currentStatus === 'second' && currentMinute >= 30) {
        isCurrentlyOff = true;
    }

    // Ищем ближайшее изменение статуса
    for (let i = currentHour; i < 24; i++) {
        const hourKey = (i + 1).toString();
        const status = scheduleData[hourKey];
        if (!status) continue;

        if (!isCurrentlyOff && (status === 'no' || status === 'first')) {
            if (i === currentHour && currentMinute < 30) {
                nextEventTime = currentHour + 0.5; break;
            } else if (i > currentHour) {
                nextEventTime = i; break;
            }
        }
        if (isCurrentlyOff && (status === 'yes' || status === 'second')) {
             if (i === currentHour && status === 'second' && currentMinute < 30) {
                 nextEventTime = currentHour + 0.5; break;
             } else if (status === 'yes' || (i > currentHour && status !== 'no' && status !== 'first')) {
                 nextEventTime = i; break;
             }
        }
    }

    const statusTextEl = document.getElementById('timerStatusText');
    const nextTextEl = document.getElementById('timerNextText');
    const timerBox = document.getElementById('timerBox');

    if (isCurrentlyOff) {
        statusTextEl.innerText = 'Світло з\'явиться через:';
        timerBox.style.border = "2px solid #ff756d";
    } else {
        statusTextEl.innerText = 'Світло зникне через:';
        timerBox.style.border = "2px solid #4dd58e";
    }

    if (nextEventTime === null) {
        nextTextEl.innerText = isCurrentlyOff ? 'Чекаємо на графік' : 'Більше відключень сьогодні не буде';
        document.getElementById('timerHours').innerText = '--';
        document.getElementById('timerMinutes').innerText = '--';
        document.getElementById('timerSeconds').innerText = '--';
        return;
    }

    const eventH = Math.floor(nextEventTime);
    const eventM = Math.round((nextEventTime % 1) * 60);
    nextTextEl.innerText = `О ${eventH.toString().padStart(2, '0')}:${eventM.toString().padStart(2, '0')}`;

    const targetDate = new Date();
    targetDate.setHours(eventH, eventM, 0, 0);

    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => updateCountdown(targetDate, isCurrentlyOff), 1000);
    updateCountdown(targetDate, isCurrentlyOff);
}

function updateCountdown(targetDate, isCurrentlyOff) {
    const now = new Date();
    const diff = targetDate - now;

    if (diff <= 0) {
        clearInterval(timerInterval);
        setTimeout(fetchSchedule, 5000); // Перезапрашиваем данные через 5 секунд
        return;
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    document.getElementById('timerHours').innerText = hours.toString().padStart(2, '0');
    document.getElementById('timerMinutes').innerText = minutes.toString().padStart(2, '0');
    document.getElementById('timerSeconds').innerText = seconds.toString().padStart(2, '0');
}

// Запуск
fetchSchedule();
setInterval(fetchSchedule, 10 * 60 * 1000);
