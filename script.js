const API_URL = 'https://raw.githubusercontent.com/Baskerville42/outage-data-ua/main/data/kyiv-region.json?t=' + Date.now();

let scheduleData = {};
let timerInterval = null;

async function fetchSchedule() {
    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        
        const groupData = findGroupData(data);

        if (groupData) {
            scheduleData = groupData;
            renderGraph();
            startTimerLogic();
        } else {
            document.getElementById('timerStatusText').innerText = 'Дані для вашої черги не знайдені';
            renderGraph(true); 
        }
    } catch (error) {
        console.error('Помилка завантаження:', error);
        document.getElementById('timerStatusText').innerText = 'Помилка завантаження даних';
    }
}

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

function renderGraph(allDayOn = false) {
    const grid = document.getElementById('scheduleGrid');
    grid.innerHTML = '';

    for (let i = 1; i <= 24; i++) {
        const el = document.createElement('div');
        el.className = 'scale_hours_el';

        const info = document.createElement('div');
        info.className = 'hour_info';
        // Оборачиваем в span для CSS-поворота
        const infoSpan = document.createElement('span');
        infoSpan.innerText = (i === 24 ? '00' : i.toString().padStart(2, '0'));
        info.appendChild(infoSpan);
        
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
                status.style.backgroundColor = '#243b47'; // no
            }
        }

        el.appendChild(info);
        el.appendChild(status);
        grid.appendChild(el);
    }
}

function startTimerLogic() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    let jsonHour = currentHour + 1; 
    
    let isCurrentlyOff = false;
    let nextEventHour = null;
    let nextEventMinute = 0;

    const currentStatus = scheduleData[jsonHour.toString()];
    if (currentStatus === 'no') {
        isCurrentlyOff = true;
    } else if (currentStatus === 'first' && currentMinute < 30) {
        isCurrentlyOff = true;
    } else if (currentStatus === 'second' && currentMinute >= 30) {
        isCurrentlyOff = true;
    }

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

    if (isCurrentlyOff) {
        statusTextEl.innerText = 'Світло з\'явиться через:';
        timerBox.style.border = "2px solid #ff756d";
    } else {
        statusTextEl.innerText = 'Світло зникне через:';
        timerBox.style.border = "2px solid #4dd58e";
    }

    if (nextEventHour === null) {
        nextTextEl.innerText = isCurrentlyOff ? 'Чекаємо на графік' : 'Більше відключень сьогодні не буде';
        document.getElementById('timerHours').innerText = '--';
        document.getElementById('timerMinutes').innerText = '--';
        document.getElementById('timerSeconds').innerText = '--';
        return;
    }

    nextTextEl.innerText = `о ${nextEventHour.toString().padStart(2, '0')}:${nextEventMinute.toString().padStart(2, '0')}`;

    const targetDate = new Date();
    targetDate.setHours(nextEventHour, nextEventMinute, 0, 0);

    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => updateCountdown(targetDate), 1000);
    updateCountdown(targetDate);
}

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

fetchSchedule();
setInterval(fetchSchedule, 10 * 60 * 1000);
