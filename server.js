require('dotenv').config();
const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'database.json');

// --- Secretos desde variables de entorno --- 
// Usaremos estas variables en el servidor de Cyclic para no guardar las contraseñas en el código.
const SECRET_PASSWORD = process.env.SECRET_PASSWORD || 'password'; // Contraseña para el login
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey'; // Clave para firmar los tokens

// --- Middlewares ---
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.static(__dirname));

// --- Middleware de Autenticación ---
// Esta función revisará si el token enviado por el cliente es válido.
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Formato: "Bearer TOKEN"

    if (token == null) return res.sendStatus(401); // No hay token

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403); // Token inválido o expirado
        req.user = user;
        next(); // El token es válido, continuar
    });
}

// --- Lógica de la Base de Datos (sin cambios) ---
async function getInitialData() { /* ... (código de datos iniciales sin cambios) ... */ }

// --- Rutas del API ---

// POST /api/login
// Nueva ruta para manejar el inicio de sesión.
app.post('/api/login', (req, res) => {
    const { password } = req.body;
    if (password === SECRET_PASSWORD) {
        // Si la contraseña es correcta, genera un token JWT que expira en 24 horas.
        const accessToken = jwt.sign({ user: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ accessToken: accessToken });
    } else {
        res.status(401).json({ message: 'Contraseña incorrecta' });
    }
});

// GET /api/data (Ruta pública, no requiere token)
app.get('/api/data', async (req, res) => {
    try {
        await fs.access(DB_PATH);
        const data = await fs.readFile(DB_PATH, 'utf-8');
        res.json(JSON.parse(data));
    } catch (error) {
        console.log('Base de datos no encontrada, creando una nueva.');
        const initialData = await getInitialData();
        await fs.writeFile(DB_PATH, JSON.stringify(initialData, null, 2), 'utf-8');
        res.json(initialData);
    }
});

// POST /api/data (Ruta protegida, requiere token)
// Solo se puede guardar si se envía un token válido.
app.post('/api/data', authenticateToken, async (req, res) => {
    try {
        const newData = req.body;
        if (!newData) {
            return res.status(400).json({ message: 'No se han proporcionado datos.' });
        }
        await fs.writeFile(DB_PATH, JSON.stringify(newData, null, 2), 'utf-8');
        res.status(200).json({ message: 'Datos guardados correctamente.' });
    } catch (error) {
        console.error('Error al guardar los datos:', error);
        res.status(500).json({ message: 'Error interno del servidor al guardar los datos.' });
    }
});

// --- Iniciar Servidor ---
app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});

// Re-uso la función getInitialData del script anterior para mantener el código limpio
async function getInitialData() {
    const initialData = {
        profile: { height: '175', weight: '70', fat: '15', muscle: '40' },
        progress: Array.from({ length: 16 }, (_, i) => ({ week: i + 1, actual: { weight: '0', fat: '0', muscle: '0' }, targets: { weight: '0', fat: '0', muscle: '0' }})),
        muscleMeasurements: Array.from({ length: 16 }, (_, i) => ({ week: i + 1, actual: { biceps: '0', shoulder: '0', chest: '0', abdomen: '0' }, targets: { biceps: '0', shoulder: '0', chest: '0', abdomen: '0' }})),
        diet: {},
        exercises: {},
        habits: [
            { title: '💧 Hidratación', text: 'Bebe al menos 2-3 litros de agua al día.' },
            { title: '😴 Descanso', text: 'Duerme entre 7 y 9 horas cada noche.' },
            { title: '🥦 Micronutrientes', text: 'Consume una amplia variedad de verduras y frutas.' },
            { title: '❤️ Cardio Regular', text: 'Incorpora 2-3 sesiones de cardio a la semana.' },
            { title: '✅ Técnica sobre Peso', text: 'Prioriza siempre la forma correcta en los ejercicios.' },
            { title: '🍲 Planificación de Comidas', text: 'Dedica tiempo a preparar tus comidas.' }
        ]
    };
    const daysOfWeek = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const dietPlan = {
        '🍳 Desayuno': { ingredients: 'Avena, Leche, Frutos rojos', recipe: 'Mezclar todo.'},
        '🍎 Media Mañana': { ingredients: 'Yogur griego, Nueces', recipe: 'Mezclar.'},
        '🍗 Almuerzo': { ingredients: 'Pollo, Quinoa, Brócoli', recipe: 'Todo a la plancha/cocido.'},
        '🥜 Merienda': { ingredients: 'Fruta, Tortitas de arroz', recipe: '-'},
        '🐟 Cena': { ingredients: 'Salmón, Espárragos', recipe: 'Al horno.'}
    };
    daysOfWeek.forEach(day => {
        initialData.diet[day] = Object.keys(dietPlan).map(mealName => ({ meal: mealName, ingredients: dietPlan[mealName].ingredients, recipe: dietPlan[mealName].recipe, notes: '' }));
    });
    const fullExercisePlan = {
        Lunes: [ { name: 'Press de Banca 🏋️', sets: '4', reps: '8', weight: '60kg', description: 'Empuje de barra desde el pecho en banco plano.', errors: 'Arquear la espalda baja, rebotar la barra en el pecho.' } ],
        Martes: [ { name: 'Dominadas 💪', sets: '4', reps: 'Al fallo', weight: 'Corporal', description: 'Elevar el cuerpo en una barra.', errors: 'No subir completamente, usar impulso (kipping).' } ],
        Miércoles: [ { name: 'Sentadillas con Barra 🦵', sets: '4', reps: '8', weight: '70kg', description: 'Flexión de rodillas y cadera con barra en la espalda.', errors: 'Bajar poco, inclinar el torso, rodillas hacia adentro.' } ],
        Jueves: [ { name: 'Press Militar con Barra 🏋️', sets: '4', reps: '8', weight: '35kg', description: 'Empuje de barra por encima de la cabeza, de pie.', errors: 'Arquear la espalda, usar impulso de las piernas.' } ],
        Viernes: [ { name: 'Peso Muerto 🔥', sets: '5', reps: '5', weight: '90kg', description: 'Levantar barra del suelo.', errors: 'Curvar la espalda, empezar con la cadera muy alta.' } ],
        Sábado: [ { name: '🚶 Descanso Activo', sets: '1', reps: '30-60 min', weight: 'N/A', description: 'Caminata ligera, senderismo o ciclismo suave.', errors: 'Forzar demasiado, no disfrutar del descanso.', notes: '' } ],
        Domingo: [ { name: '🧘 Descanso Total', sets: 'N/A', reps: 'N/A', weight: 'N/A', description: 'Día de recuperación completa. Escucha a tu cuerpo.', errors: 'Sentirse culpable por no entrenar.', notes: '' } ]
    };
    initialData.exercises = fullExercisePlan;
    return initialData;
}