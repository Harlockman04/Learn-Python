const API_URL = 'https://tu-app-en-render.onrender.com'; // Cambia por tu URL de Render
let userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
let currentExercise = '';
let currentLevel = 'basico';

async function callAPI(endpoint, data = {}) {
    try {
        const response = await fetch(`${API_URL}/api/${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ user_id: userId, ...data })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        addMessage('❌ Error de conexión. ¿El servidor está funcionando?', 'bot');
        return null;
    }
}

function addMessage(text, type) {
    const chatContainer = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message fade-in`;
    messageDiv.innerHTML = text.replace(/\n/g, '<br>');
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function showLoading() {
    document.getElementById('loading').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

function updateProgress(percent) {
    document.getElementById('progressFill').style.width = `${percent}%`;
    document.getElementById('progressPercent').textContent = percent;
}

async function loadProgress() {
    try {
        const response = await fetch(`${API_URL}/api/progress?user_id=${userId}`);
        const data = await response.json();
        updateProgress(data.progress);
        document.getElementById('levelBadge').textContent = data.level === 'basico' ? '🌱 Básico' : 
                                                           data.level === 'intermedio' ? '⚡ Intermedio' : '🚀 Avanzado';
        document.getElementById('currentTopic').textContent = data.current_topic;
        currentLevel = data.level;
    } catch (error) {
        console.error('Error loading progress:', error);
    }
}

async function sendMessage(message, showInChat = true) {
    if (!message.trim()) return;
    
    if (showInChat) {
        addMessage(message, 'user');
    }
    
    showLoading();
    const result = await callAPI('chat', { 
        message: message,
        level: currentLevel 
    });
    hideLoading();
    
    if (result && result.response) {
        addMessage(result.response, 'bot');
        if (result.progress !== undefined) {
            updateProgress(result.progress);
        }
        
        // Detectar si hay un ejercicio
        if (result.response.includes('ejercicio') || 
            result.response.includes('Escribe') || 
            result.response.includes('Código:')) {
            document.getElementById('exerciseArea').style.display = 'block';
            document.getElementById('exerciseContent').innerHTML = result.response;
            currentExercise = result.response;
            document.getElementById('submitBtn').style.display = 'block';
            document.getElementById('nextBtn').style.display = 'none';
        }
    }
}

async function submitCode() {
    const code = document.getElementById('codeInput').value;
    if (!code.trim()) {
        addMessage('✏️ Escribe tu código antes de verificar', 'bot');
        return;
    }
    
    await sendMessage(code, true);
    document.getElementById('codeInput').value = '';
}

async function getHint() {
    if (!currentExercise) {
        addMessage('Primero necesitas un ejercicio. Pide "dame un ejercicio"', 'bot');
        return;
    }
    
    showLoading();
    try {
        const response = await fetch(`${API_URL}/api/hint`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, exercise: currentExercise })
        });
        const data = await response.json();
        addMessage(`💡 ${data.hint}`, 'bot');
    } catch (error) {
        addMessage('Error obteniendo pista', 'bot');
    }
    hideLoading();
}

async function nextExercise() {
    await sendMessage("Dame el siguiente ejercicio", false);
}

function resetProgress() {
    if (confirm('¿Borrar todo tu progreso? Esto no se puede deshacer.')) {
        localStorage.clear();
        userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        updateProgress(0);
        document.getElementById('chatMessages').innerHTML = '';
        addMessage('🔄 Progreso reiniciado. ¡Empezamos de nuevo!', 'bot');
        setTimeout(() => {
            sendMessage("Hola, quiero aprender Python desde cero", false);
        }, 500);
    }
}

// Event listeners
document.getElementById('submitBtn').addEventListener('click', submitCode);
document.getElementById('nextBtn').addEventListener('click', nextExercise);
document.getElementById('hintBtn').addEventListener('click', getHint);
document.getElementById('resetBtn').addEventListener('click', resetProgress);
document.getElementById('sendBtn').addEventListener('click', () => {
    const input = document.getElementById('userInput');
    sendMessage(input.value, true);
    input.value = '';
});

document.getElementById('userInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const input = document.getElementById('userInput');
        sendMessage(input.value, true);
        input.value = '';
    }
});

document.querySelectorAll('.level-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
        currentLevel = btn.dataset.level;
        document.getElementById('levelSelector').style.display = 'none';
        await sendMessage(`Mi nivel es ${currentLevel}. Empecemos con los ejercicios`, true);
    });
});

// Inicializar
loadProgress();