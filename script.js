// Берем данные из ОРИГИНАЛЬНОГО репозитория автора (Baskerville42)
const API_URL = 'https://raw.githubusercontent.com/Baskerville42/outage-data-ua/main/data/kyiv-region.json?t=' + Date.now();

let scheduleDataToday = {};
let scheduleDataTomorrow = {};
let timerInterval = null;

// 1. Загрузка данных
async function fetchSchedule() {
    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        
        // Ищем данные для группы 4.1 отдельно для сегодня и завтра
        const groupData = findGroupData(data);

        if (groupData) {
            // Предполагаем, что внутри fact есть today и tomorrow (или similar)
            // Если структура другая - нужно адаптировать под реальный JSON
            scheduleDataToday = groupData.today || groupData['today'] || groupData;
            scheduleDataTomorrow = groupData.tomorrow || groupData['tomorrow'] || groupData;
            
            // Если tomorrow не найден явно, пробуем взять из fact целиком
            // и использовать ключи с суффиксом или другую логику
            if (!scheduleDataTomorrow || Object.keys(scheduleDataTomorrow).length === 0) {
                // Fallback: используем те же данные, что и сегодня (временная заглушка)
                scheduleDataTomorrow = scheduleDataToday;
            }

            renderGraph('today');
            renderGraph('tomorrow');
            startTimerLogic();
        } else {
            document.getElementById('timerStatusText').innerText = 'Дані не знайдені';
            renderGraph('today', true);
            renderGraph('tomorrow', true);
        }
    } catch (error) {
        console.error('Помилка завантаження:', error);
        document.getElementById('timerStatusText').innerText = 'Помилка мережі';
    }
}

// Функция для поиска группы 4.1 на любой глубине JSON
function findGroupData(obj) {
    if (!obj || typeof obj !== 'object') return null;
    if (obj['GPV4.1']) return obj['GPV4.1'];
    if (obj['4.1']) return obj['4.1'];
    
    for (let key in obj) {
        const result = findGroupData(obj[key]);
        if (result) return result;
    }
    return null;
}

// 2. Отрисовка графика (24 часа) — теперь принимает тип дня
function renderGraph(dayType = 'today', allDayOn = false) {
    const gridId = dayType === 'today' ? 'scheduleGrid' : 'scheduleGridTomorrow';
    const grid = document.getElementById(gridId);
    if (!grid) return;
    
    grid.innerHTML = '';

    const dataSource = dayType === 'today' ? scheduleDataToday : scheduleDataTomorrow;

    for (let i = 1; i <= 24; i++) {
        const el = document.createElement('div');
        el.className = 'scale_hours_el';

        const info = document.createElement('div');
        info.className = 'hour_info';
        const infoSpan = document.createElement('span');
        infoSpan.innerText = (i === 24 ? '00' : i.toString().padStart(2, '0'));
        info.appendChild(infoSpan);
        
        const status = document.createElement('div');
        status.className = 'hour_status';

        if (allDayOn) {
            status.classList.add('hour_active');
        } else {
            const hourStatus = dataSource[i.toString()];
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

// 3. Логика таймера и текста (остаётся без изменений, но использует scheduleDataToday)
function startTimerLogic() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    let jsonHour = currentHour + 1; 
    
    let isCurrentlyOff = false;
    let nextEventHour = null;
    let nextEventMinute = 0;

    // Проверяем, есть ли свет прямо сейчас
    const currentStatus = scheduleDataToday[jsonHour.toString()];
    if (currentStatus === 'no') {
        isCurrentlyOff = true;
    } else if (currentStatus === 'first' && currentMinute < 30) {
        isCurrentlyOff = true;
    } else if (currentStatus === 'second' && currentMinute >= 30) {
        isCurrentlyOff = true;
    }

    // Ищем ближайшее событие
    for (let i = currentHour; i < 24; i++) {
        const status = scheduleDataToday[(i + 1).toString()];
        if (!status) continue;

        if (!isCurrentlyOff) { 
            if (status === 'no' && i > currentHour) { nextEventHour = i; nextEventMinute = 0; break; }
            if (status === 'first' && i > currentHour) { nextEventHour = i; nextEventMinute = 0; break; }
            if (status === 'first' && i === currentHour && currentMinute < 30) { nextEventHour = i; nextEventMinute = 30; break; }
            if (status === 'second' && i > currentHour) { nextEventHour = i; nextEventMinute = 30; break; }
            if (status === 'second' && i === currentHour && currentMinute < 30) { nextEventHour = i; nextEventMinute = 30; break; }
        } else { 
            if (status === 'yes' && i > currentHour) { nextEventHour = i; nextEventMinute = 0; break; }
            if (status === 'second' && i > currentHour) { nextEventHour = i; nextEventMinute = 0; break; }
            if (status === 'second' && i === currentHour && currentMinute < 30) { nextEventHour = i; nextEventMinute = 30; break; }
            if (status === 'first' && i > currentHour) { nextEventHour = i; nextEventMinute = 30; break; }
            if (status === 'first' && i === currentHour && currentMinute < 30) { nextEventHour = i; nextEventMinute = 30; break; }
        }
    }

    const statusTextEl = document.getElementById('timerStatusText');
    const nextTextEl = document.getElementById('timerNextText');
    const timerBox = document.getElementById('timerBox');

    let timeString = "";
    if (nextEventHour !== null) {
        timeString = `${nextEventHour.toString().padStart(2, '0')}:${nextEventMinute.toString().padStart(2, '0')}`;
    }

    if (isCurrentlyOff) {
        nextTextEl.innerText = nextEventHour !== null ? `Світло з'явиться о ${timeString}` : 'Чекаємо на графік';
        statusTextEl.innerText = 'Включення через:';
        timerBox.style.border = "2px solid #ffd52d";
    } else {
        nextTextEl.innerText = nextEventHour !== null ? `Світло зникне о ${timeString}` : 'Більше відключень не буде';
        statusTextEl.innerText = 'Відключення через:';
        timerBox.style.border = "2px solid #4dd58e";
    }

    if (nextEventHour === null) {
        document.getElementById('timerHours').innerText = '--';
        document.getElementById('timerMinutes').innerText = '--';
        document.getElementById('timerSeconds').innerText = '--';
        return;
    }

    const targetDate = new Date();
    targetDate.setHours(nextEventHour, nextEventMinute, 0, 0);

    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => updateCountdown(targetDate), 1000);
    updateCountdown(targetDate);
}

// 4. Обратный отсчет
function updateCountdown(targetDate) {
    const now = new Date();
    const diff = targetDate - now;

    if (diff <= 0) {
        clearInterval(timerInterval);
        setTimeout(fetchSchedule, 5000); 
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
