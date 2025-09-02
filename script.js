
document.addEventListener('DOMContentLoaded', () => {

    let healthData;
    let progressChart, measurementsChart;
    let authToken = null;

    // --- ELEMENTOS DEL DOM ---
    const loginOverlay = document.getElementById('login-overlay');
    const passwordInput = document.getElementById('password-input');
    const loginButton = document.getElementById('login-button');
    const loginError = document.getElementById('login-error');
    const appContainer = document.getElementById('app');
    const logoutButton = document.getElementById('logout-button');

    const views = { profile: document.getElementById('profile-view'), diet: document.getElementById('diet-view'), exercise: document.getElementById('exercise-view'), habits: document.getElementById('habits-view'), progress: document.getElementById('progress-view'), measurements: document.getElementById('measurements-view') };
    const buttons = { profile: document.getElementById('btn-profile'), diet: document.getElementById('btn-diet'), exercise: document.getElementById('btn-exercise'), habits: document.getElementById('btn-habits'), progress: document.getElementById('btn-progress'), measurements: document.getElementById('btn-measurements') };
    const translations = { weight: 'Peso', fat: '% Grasa', muscle: 'M. Muscular', biceps: 'Bíceps', shoulder: 'Hombro', chest: 'Pecho', abdomen: 'Abdomen' };

    // --- LÓGICA DE AUTENTICACIÓN ---
    async function handleLogin() {
        const password = passwordInput.value;
        if (!password) {
            loginError.textContent = 'Por favor, introduce una contraseña.';
            return;
        }
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: password })
            });
            if (response.ok) {
                const data = await response.json();
                authToken = data.accessToken;
                sessionStorage.setItem('authToken', authToken);
                await showApp();
            } else {
                loginError.textContent = 'Contraseña incorrecta.';
            }
        } catch (error) {
            loginError.textContent = 'Error de conexión con el servidor.';
        }
    }

    function handleLogout() {
        authToken = null;
        sessionStorage.removeItem('authToken');
        appContainer.classList.add('hidden');
        loginOverlay.classList.remove('hidden');
        loginOverlay.classList.add('visible');
    }

    async function showApp() {
        loginOverlay.classList.add('hidden');
        loginOverlay.classList.remove('visible');
        appContainer.classList.remove('hidden');
        await main();
    }

    // --- LÓGICA DE DATOS ---
    async function fetchData() {
        try {
            const response = await fetch('/api/data');
            if (!response.ok) throw new Error(`Error del servidor: ${response.statusText}`);
            healthData = await response.json();
        } catch (error) {
            alert("Error: No se pudo conectar con el servidor para cargar datos.");
        }
    }

    // --- LÓGICA DE RENDERIZADO ---
    function renderProfile() {
        const p = healthData.profile;
        // Find the last valid value for each metric independently
        const lastWeight = [...healthData.progress].reverse().find(prog => prog.actual.weight != null)?.actual.weight;
        const lastFat = [...healthData.progress].reverse().find(prog => prog.actual.fat != null)?.actual.fat;
        const lastMuscle = [...healthData.progress].reverse().find(prog => prog.actual.muscle != null)?.actual.muscle;

        // Update profile data, falling back to existing values if no new ones are found
        if (lastWeight) p.weight = lastWeight;
        if (lastFat) p.fat = lastFat + '%';
        if (lastMuscle) p.muscle = lastMuscle;
        p.height = '180';

        views.profile.innerHTML = `<div class="profile-card"><h2>👤 Mis Datos Actuales</h2><div class="profile-item"><span>Altura (cm)</span><span class="value">${p.height}</span></div><div class="profile-item"><span>Peso (kg)</span><span class="value">${p.weight}</span></div><div class="profile-item"><span>% Grasa</span><span class="value">${p.fat}</span></div><div class="profile-item"><span>Masa Muscular (kg)</span><span class="value">${p.muscle}</span></div></div>`;
    }

    function renderHabits() {
        views.habits.innerHTML = `<div class="habits-grid">${healthData.habits.map(habit => `<div class="habit-card"><h3>${habit.title}</h3><p>${habit.text}</p></div>`).join('')}</div>`;
    }

    function renderDaySelector(viewName, dataKey) {
        const days = Object.keys(healthData[dataKey]);
        const dayEmojis = { Lunes: "💪", Martes: "🦵", Miércoles: "🏋️‍♂️", Jueves: "🔥", Viernes: "💪", Sábado: "🏃‍♂️", DOMINGO: "🧘‍♂️" };
        views[viewName].innerHTML = `<div class="day-selector">${days.map(day => {
            const dayKey = day.split(':')[0];
            const emoji = (dataKey === 'exercises' && dayEmojis[dayKey]) ? `${dayEmojis[dayKey]} ` : '';
            return `<button class="day-btn" data-day="${day}" data-view="${viewName}" data-datakey="${dataKey}">${emoji}${day}</button>`;
        }).join('')}</div><div class="day-content-container"></div>`;
        const firstDayBtn = views[viewName].querySelector('.day-btn');
        if (firstDayBtn) {
            firstDayBtn.classList.add('active');
            renderDayContent(days[0], viewName, dataKey);
        }
    }

    function renderDayContent(day, viewName, dataKey) {
        const container = views[viewName].querySelector('.day-content-container');
        const itemsHtml = healthData[dataKey][day].map((item, index) => {
            if (dataKey === 'diet') {
                const mealEmojis = { DESAYUNO: "🥞", ALMUERZO: "🥪", COMIDA: "🍝", MERIENDA: "🍎", CENA: "🍗" };
                const mealEmoji = mealEmojis[item.meal] || '🍴';
                return `<div class="item-card">
                            <h3>${mealEmoji} <span class="editable" data-group="${dataKey}" data-day="${day}" data-index="${index}" data-key="meal">${item.meal}</span></h3>
                            <div class="bordered-subsection">
                                <p>📝 <strong>Ingredientes:</strong> <span class="editable" data-group="${dataKey}" data-day="${day}" data-index="${index}" data-key="ingredients">${item.ingredients}</span></p>
                            </div>
                            <div class="bordered-subsection">
                                <p>👨‍🍳 <strong>Receta:</strong> <span class="editable" data-group="${dataKey}" data-day="${day}" data-index="${index}" data-key="recipe">${item.recipe}</span></p>
                            </div>
                            <div class="notes-section">
                                <strong>Sustituciones de platos:</strong> <span class="editable" data-group="${dataKey}" data-day="${day}" data-index="${index}" data-key="notes">${item.notes || 'Añadir nota...'}</span>
                            </div>
                        </div>`;
            } else { // exercises
                return `<div class="item-card">
                            <h3><span class="editable" data-group="${dataKey}" data-day="${day}" data-index="${index}" data-key="name">${item.name}</span></h3>
                            <p>
                                <strong>Series:</strong> <span class="editable" data-group="${dataKey}" data-day="${day}" data-index="${index}" data-key="series">${item.series}</span> |
                                <strong>Reps:</strong> <span class="editable" data-group="${dataKey}" data-day="${day}" data-index="${index}" data-key="reps">${item.reps}</span> |
                                <strong>Peso:</strong> <span class="editable" data-group="${dataKey}" data-day="${day}" data-index="${index}" data-key="weight">${item.weight}</span>
                            </p>
                            <div class="bordered-subsection">
                                <p>✍️ <strong>Descripción:</strong> <span class="editable" data-group="${dataKey}" data-day="${day}" data-index="${index}" data-key="description">${item.description}</span></p>
                            </div>
                            <div class="bordered-subsection">
                                <p>❌ <strong>Errores Comunes:</strong> <span class="editable" data-group="${dataKey}" data-day="${day}" data-index="${index}" data-key="errors">${item.errors}</span></p>
                            </div>
                        </div>`;
            }
        }).join('');
        container.innerHTML = `<div class="day-content">${itemsHtml}</div>`;
    }

    function renderGenericProgress(viewName, dataKey, title, chartInstance, datasetsConfig) {
        views[viewName].innerHTML = `<div class="progress-container"><h2>${title}</h2><canvas id="${dataKey}Chart"></canvas></div><div id="${dataKey}-table-container"></div>`;
        const ctx = document.getElementById(`${dataKey}Chart`).getContext('2d');
        const labels = healthData[dataKey].map(p => `Sem ${p.week}`);
        if (chartInstance) chartInstance.destroy();
        chartInstance = new Chart(ctx, { type: 'line', data: { labels: labels, datasets: datasetsConfig(healthData[dataKey]) }, options: { responsive: true, plugins: { legend: { labels: { color: '#f5f5f5' } } }, scales: { y: { ticks: { color: '#f5f5f5' } }, x: { ticks: { color: '#f5f5f5' } } } } });
        renderGenericTable(viewName, dataKey, title, Object.keys(healthData[dataKey][0].actual));
        return chartInstance;
    }

    function renderGenericTable(viewName, dataKey, title, metrics) {
        const container = document.getElementById(`${dataKey}-table-container`);
        let headers = metrics.map(m => `<th>${translations[m]} Real</th><th>${translations[m]} Obj.</th>`).join('');
        let tableHtml = `<table class="progress-table"><tr><th>Semana</th>${headers}</tr>`;
        healthData[dataKey].forEach((weekData, index) => {
            let row = `<td>${weekData.week}</td>`;
            metrics.forEach(metric => {
                row += `<td class="editable" data-group="${dataKey}" data-index="${index}" data-subgroup="actual" data-key="${metric}">${weekData.actual[metric] || ''}</td>`;
                row += `<td class="editable" data-group="${dataKey}" data-index="${index}" data-subgroup="targets" data-key="${metric}">${weekData.targets[metric] || ''}</td>`;
            });
            tableHtml += `<tr>${row}</tr>`;
        });
        tableHtml += '</table>';
        container.innerHTML = tableHtml;
    }

    function switchView(viewName) {
        Object.values(views).forEach(v => v.classList.remove('active'));
        Object.values(buttons).forEach(b => b.classList.remove('active'));
        views[viewName].classList.add('active');
        buttons[viewName].classList.add('active');
        switch (viewName) {
            case 'profile': renderProfile(); break;
            case 'diet': renderDaySelector('diet', 'diet'); break;
            case 'exercise': renderDaySelector('exercise', 'exercises'); break;
            case 'habits': renderHabits(); break;
            case 'progress': progressChart = renderGenericProgress('progress', 'progress', '📊 Progreso General (Peso, Grasa, Músculo)', progressChart, (data) => [ { label: `${translations.weight} Real`, data: data.map(p => p.actual.weight), borderColor: '#FFD700', backgroundColor: '#FFD700', tension: 0.1 }, { label: `${translations.weight} Objetivo`, data: data.map(p => p.targets.weight), borderColor: '#FFD700', borderDash: [5, 5], backgroundColor: 'transparent', pointRadius: 1 }, { label: `${translations.fat} Real`, data: data.map(p => p.actual.fat), borderColor: '#00bcd4', backgroundColor: '#00bcd4', tension: 0.1 }, { label: `${translations.fat} Objetivo`, data: data.map(p => p.targets.fat), borderColor: '#00bcd4', borderDash: [5, 5], backgroundColor: 'transparent', pointRadius: 1 }, { label: `${translations.muscle} Real`, data: data.map(p => p.actual.muscle), borderColor: '#4caf50', backgroundColor: '#4caf50', tension: 0.1 }, { label: `${translations.muscle} Objetivo`, data: data.map(p => p.targets.muscle), borderColor: '#4caf50', borderDash: [5, 5], backgroundColor: 'transparent', pointRadius: 1 }, ]); break;
            case 'measurements': measurementsChart = renderGenericProgress('measurements', 'muscleMeasurements', '📏 Medidas Musculares (cm)', measurementsChart, (data) => [ { label: `${translations.biceps} Real`, data: data.map(p => p.actual.biceps), borderColor: '#FFD700', backgroundColor: '#FFD700', tension: 0.1 }, { label: `${translations.biceps} Objetivo`, data: data.map(p => p.targets.biceps), borderColor: '#FFD700', borderDash: [5, 5], backgroundColor: 'transparent', pointRadius: 1 }, { label: `${translations.shoulder} Real`, data: data.map(p => p.actual.shoulder), borderColor: '#e91e63', backgroundColor: '#e91e63', tension: 0.1 }, { label: `${translations.shoulder} Objetivo`, data: data.map(p => p.targets.shoulder), borderColor: '#e91e63', borderDash: [5, 5], backgroundColor: 'transparent', pointRadius: 1 }, { label: `${translations.chest} Real`, data: data.map(p => p.actual.chest), borderColor: '#9c27b0', backgroundColor: '#9c27b0', tension: 0.1 }, { label: `${translations.chest} Objetivo`, data: data.map(p => p.targets.chest), borderColor: '#9c27b0', borderDash: [5, 5], backgroundColor: 'transparent', pointRadius: 1 }, { label: `${translations.abdomen} Real`, data: data.map(p => p.actual.abdomen), borderColor: '#3f51b5', backgroundColor: '#3f51b5', tension: 0.1 }, { label: `${translations.abdomen} Objetivo`, data: data.map(p => p.targets.abdomen), borderColor: '#3f51b5', borderDash: [5, 5], backgroundColor: 'transparent', pointRadius: 1 }, ]); break;
        }
    }

    async function main() {
        await fetchData();
        Object.keys(buttons).forEach(key => {
            buttons[key].addEventListener('click', () => switchView(key));
        });
        document.querySelector('main').addEventListener('click', (e) => {
            const target = e.target;
            if (target.classList.contains('day-btn')) {
                document.querySelectorAll(`.day-btn[data-view="${target.dataset.view}"]`).forEach(b => b.classList.remove('active'));
                target.classList.add('active');
                renderDayContent(target.dataset.day, target.dataset.view, target.dataset.datakey);
            }
        });
        switchView('profile');
    }

    // --- PUNTO DE ENTRADA ---
    loginButton.addEventListener('click', handleLogin);
    passwordInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleLogin(); });
    logoutButton.addEventListener('click', handleLogout);

    // Comprobar si ya existe un token en la sesión al cargar la página
    const existingToken = sessionStorage.getItem('authToken');
    if (existingToken) {
        authToken = existingToken;
        showApp();
    } 
});
