// Берем данные из ОРИГИНАЛЬНОГО репозитория автора (Baskerville42)
const API_URL = 'https://githubusercontent.com' + Date.now();

let scheduleData = {};
let timerInterval = null;

// 1. Загрузка данных
async function fetchSchedule() {
    // Сразу рисуем серый каркас для завтрашнего графика
    renderGraph('scheduleGridTomorrow', {});

    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        
        const days = findGroupDataList(data);
        const groupData = days.shift();
        const tomorrowData = days.shift();

        if (groupData) {
            scheduleData = groupData;
            renderGraph('scheduleGrid', scheduleData);
            startTimerLogic();
        } else {
            document.getElementById('timerStatusText').innerText = 'Данные не найдены';
            renderGraph('scheduleGrid', {}, true); 
        }

        if (tomorrowData) {
            renderGraph('scheduleGridTomorrow', tomorrowData);
        }
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        document.getElementById('timerStatusText').innerText = 'Ошибка сети';
    }
}

// Ваш исходный поиск, собирающий найденные дни в массив
function findGroupDataList(rootObj) {
    let list = [];
    function search(obj) {
        if (!obj || typeof obj !== 'object') return;
        if (obj['GPV4.1']) {
            list.push(obj['GPV4.1']);
            return;
        }
        if (obj['4.1']) {
            list.push(obj['4.1']);
            return;
        }
        for (let key in obj) {
            search(obj[key]);
        }
    }
    search(rootObj);
    return list;
}

// 2. Отрисовка графика (24 часа)
function renderGraph(gridId, dayData, allDayOn = false) {
    const grid = document.getElementById(gridId);
    if (!grid) return;
    grid.innerHTML = '';

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
            const hourStatus = dayData[i.toString()];
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

// 3. Логика таймера и текста
function startTimerLogic() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    let jsonHour = currentHour + 1; 
    
    let isCurrentlyOff = false;
    let nextEventHour = null;
    let nextEventMinute = 0;

    // Проверяем, есть ли свет прямо сейчас
    const currentStatus = scheduleData[jsonHour.toString()];
    if (currentStatus === 'no') {
        isCurrentlyOff = true;
    } else if (currentStatus === 'first' && currentMinute < 30) {
        isCurrentlyOff = true;
    } else if (currentStatus === 'second' && currentMinute >= 30) {
        isCurrentlyOff = true;
    }

    // Ищем ближайшее событие
    for (let i = currentHour; i < 24; i++) {
        const status = scheduleData[(i + 1).toString()];
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

    // Устанавливаем русские тексты
    if (isCurrentlyOff) {
        nextTextEl.innerText = nextEventHour !== null ? `Свет появится в ${timeString}` : 'Ожидаем график';
        statusTextEl.innerText = 'Включение через:';
        timerBox.style.border = "2px solid #ffd52d";
    } else {
        nextTextEl.innerText = nextEventHour !== null ? `Свет исчезнет в ${timeString}` : 'Больше отключений не будет';
        statusTextEl.innerText = 'Отключение через:';
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

// 4. Обратный отсчет (часы, минуты, секунды)
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
