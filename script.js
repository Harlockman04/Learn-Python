const API_URL = 'http://localhost:5000/api';
let userId = 'user_' + Date.now();
let currentContext = '';
let currentExercise = '';

async function sendToAPI(endpoint, data) {
    try {
        const response = await fetch(`${API_URL}/${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ user_id: userId, ...data })
        });
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        addMessage('Error de conexión. ¿El servidor está corriendo?', 'bot');
        return null;
    }
}

function addMessage(text, type) {
    const chatContainer = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;
    messageDiv.textContent = text;
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function showLoading() {
    document.getElementById('loading').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

function parseResponse(responseText) {
    try {
        // Intentar parsear JSON
        const parsed = JSON.parse(responseText);
        
        if (parsed.type === 'level_select') {
            document.getElementById('levelSelector').style.display = 'block';
            addMessage(parsed.message, 'bot');
        } else if (parsed.type === 'exercise') {
            currentExercise = parsed.question;
            document.getElementById('exerciseArea').style.display = 'block';
            document.getElementById('exerciseContent').innerHTML = parsed.question;
            document.getElementById('codeInput').value = '';
            document.getElementById('submitBtn').style.display = 'block';
            document.getElementById('nextBtn').style.display = 'none';
            addMessage('¡Nuevo ejercicio! Revisa el panel de abajo 👇', 'bot');
        } else if (parsed.type === 'feedback') {
            addMessage(parsed.message, 'bot');
            if (parsed.correct) {
                // Actualizar progreso
                updateProgress(10);
                document.getElementById('submitBtn').style.display = 'none';
                document.getElementById('nextBtn').style.display = 'block';
            }
        } else {
            addMessage(responseText, 'bot');
        }
    } catch (e) {
        // Si no es JSON, mostrar como texto normal
        addMessage(responseText, 'bot');
        
        // Detectar si la respuesta contiene un ejercicio
        if (responseText.includes('ejercicio') || responseText.includes('Escribe')) {
            document.getElementById('exerciseArea').style.display = 'block';
            document.getElementById('exerciseContent').innerHTML = responseText;
            currentExercise = responseText;
        }
    }
}

let progress = 0;
function updateProgress(increment) {
    progress = Math.min(progress + increment, 100);
    document.getElementById('progressFill').style.width = `${progress}%`;
}

document.getElementById('submitBtn').addEventListener('click', async () => {
    const userCode = document.getElementById('codeInput').value;
    if (!userCode.trim()) {
        addMessage('Escribe tu código antes de verificar', 'bot');
        return;
    }
    
    addMessage(userCode, 'user');
    showLoading();
    
    const result = await sendToAPI('submit', {
        answer: userCode,
        context: currentContext
    });
    
    hideLoading();
    if (result && result.response) {
        parseResponse(result.response);
        currentContext = result.response;
    }
});

document.getElementById('nextBtn').addEventListener('click', async () => {
    showLoading();
    const result = await sendToAPI('submit', {
        answer: "Siguiente",
        context: currentContext
    });
    
    hideLoading();
    if (result && result.response) {
        parseResponse(result.response);
        currentContext = result.response;
    }
});

document.getElementById('hintBtn').addEventListener('click', async () => {
    showLoading();
    const result = await sendToAPI('hint', {
        exercise: currentExercise
    });
    
    hideLoading();
    if (result && result.hint) {
        addMessage(`💡 Pista: ${result.hint}`, 'bot');
    }
});

document.querySelectorAll('.level-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
        const level = btn.dataset.level;
        document.getElementById('levelSelector').style.display = 'none';
        addMessage(`Nivel ${level} seleccionado. ¡Empecemos!`, 'user');
        
        showLoading();
        const result = await sendToAPI('submit', {
            answer: `Mi nivel es ${level}`,
            context: "Usuario seleccionando nivel"
        });
        
        hideLoading();
        if (result && result.response) {
            parseResponse(result.response);
            currentContext = result.response;
        }
    });
});

// Iniciar aprendizaje
async function init() {
    showLoading();
    const result = await sendToAPI('start', {});
    hideLoading();
    
    if (result && result.response) {
        parseResponse(result.response);
        currentContext = result.response;
    }
}

init();