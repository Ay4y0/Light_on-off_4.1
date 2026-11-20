// Ссылка на ВАШ личный репозиторий с данными
const API_URL = 'https://raw.githubusercontent.com/Ay4y0/Light_on-off/main/data/kyiv-region.json';
const GROUP_ID = 'GPV4.1'; // Формат ключа в новом JSON

let scheduleData = {};
let timerInterval = null;

// 1. Загрузка данных
async function fetchSchedule() {
    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        
        // Ищем данные для Киевской области и вашей группы
        const regionData = data['kyiv-region'] || data; // На случай, если структура чуть отличается
        const groupData = regionData[GROUP_ID];
        
        if (groupData) {
            scheduleData = groupData;
            renderGraph();
            startTimerLogic();
        } else {
            document.getElementById('timerStatusText').innerText = 'Дані для вашої черги не знайдені';
        }
    } catch (error) {
        console.error('Помилка завантаження:', error);
        document.getElementById('timerStatusText').innerText = 'Помилка завантаження даних';
    }
}

// 2. Отрисовка графика (24 часа)
function renderGraph() {
    const grid = document.getElementById('scheduleGrid');
    grid.innerHTML = '';

    for (let i = 1; i <= 24; i++) {
        const el = document.createElement('div');
        el.className = 'scale_hours_el';

        const info = document.createElement('div');
        info.className = 'hour_info';
        // Выводим часы от 00 до 23
        info.innerText = (i === 24 ? '00' : i.toString().padStart(2, '0'));
        
        const status = document.createElement('div');
        status.className = 'hour_status';

        const hourStatus = scheduleData[i.toString()];

        if (hourStatus === 'yes') {
            status.classList.add('hour_active'); // Желтый (свет есть)
        } else if (hourStatus === 'first') {
            // Света нет в первую половину часа
            status.style.background = 'linear-gradient(to right, #243b47 50%, #ffd52d 50%)';
        } else if (hourStatus === 'second') {
            // Света нет во вторую половину часа
            status.style.background = 'linear-gradient(to right, #ffd52d 50%, #243b47 50%)';
        } else {
            // 'no' - темный на весь час
            status.style.backgroundColor = '#243b47'; 
        }

        el.appendChild(info);
        el.appendChild(status);
        grid.appendChild(el);
    }
}

// 3. Логика таймера
function startTimerLogic() {
    const now = new Date();
    const currentHour = now.getHours(); // от 0 до 23
    const currentMinute = now.getMinutes();
    
    // Переводим текущий час в формат JSON (1-24)
    let jsonHour = currentHour + 1; 
    
    let isCurrentlyOff = false;
    let nextEventTime = null; // Время в часах (например, 12.5 - это 12:30)
    let nextEventType = '';

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
    // Проходим по часам начиная с текущего
    for (let i = currentHour; i < 24; i++) {
        const hourKey = (i + 1).toString();
        const status = scheduleData[hourKey];
        
        if (!status) continue;

        // Если свет есть, ищем когда он выключится
        if (!isCurrentlyOff && (status === 'no' || status === 'first')) {
            // Если это текущий час, и отключение должно быть во второй половине (first)
            if (i === currentHour && currentMinute < 30) {
                nextEventTime = currentHour + 0.5;
                break;
            } else if (i > currentHour) {
                nextEventTime = i;
                break;
            }
        }
        
        // Если света нет, ищем когда он включится
        if (isCurrentlyOff && (status === 'yes' || status === 'second')) {
             // Если это текущий час, и включение должно быть во второй половине (second)
             if (i === currentHour && status === 'second' && currentMinute < 30) {
                 nextEventTime = currentHour + 0.5;
                 break;
             } else if (status === 'yes' || (i > currentHour && status !== 'no' && status !== 'first')) {
                 nextEventTime = i;
                 break;
             }
        }
    }

    // Обновляем текст
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

    // Красиво выводим время (например, 12.5 -> 12:30)
    const eventH = Math.floor(nextEventTime);
    const eventM = Math.round((nextEventTime % 1) * 60);
    nextTextEl.innerText = `О ${eventH.toString().padStart(2, '0')}:${eventM.toString().padStart(2, '0')}`;

    // Запускаем таймер
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
// Обновляем данные каждые 10 минут
setInterval(fetchSchedule, 10 * 60 * 1000);