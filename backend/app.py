from flask import Flask, request, jsonify
from flask_cors import CORS
from groq import Groq
import os
import json
from datetime import datetime

app = Flask(__name__)
CORS(app)

# Inicializar cliente de Groq
GROQ_API_KEY = os.getenv('GROQ_API_KEY')
if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY no configurada en variables de entorno")

client = Groq(api_key=GROQ_API_KEY)

# Diccionario para almacenar progreso (en producción usa Redis o PostgreSQL)
user_sessions = {}

SYSTEM_PROMPT = """Eres un tutor interactivo de Python estilo Mimo. Características:

1. Enseñas mediante ejercicios prácticos y tests
2. Eres amigable, motivador y usas emojis frecuentemente
3. Evalúas código Python y das feedback específico y constructivo
4. Aumentas la dificultad progresivamente según el nivel del usuario
5. Cuando el usuario responde correctamente, felicitas y das el siguiente ejercicio
6. Si el usuario se equivoca, explicas el error sin dar la solución directa
7. Ofreces pistas cuando el usuario las pide
8. Mantienes un registro del nivel del usuario (básico/intermedio/avanzado)

Formato de respuesta:
- Debe ser conversacional y amigable
- Incluye ejemplos de código cuando sea necesario
- Máximo 250 palabras por respuesta
- Usa emojis para hacerlo más divertido

Temas a cubrir por orden:
1. Variables y tipos de datos
2. Strings y métodos
3. Listas, tuplas, diccionarios
4. Condicionales (if/else)
5. Bucles (for/while)
6. Funciones
7. Clases y POO
8. Manejo de errores
9. Archivos
10. Módulos y librerías"""

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'timestamp': datetime.now().isoformat()})

@app.route('/api/start', methods=['POST'])
def start_learning():
    data = request.json
    user_id = data.get('user_id', 'default')
    
    # Inicializar sesión del usuario
    if user_id not in user_sessions:
        user_sessions[user_id] = {
            'level': 'basico',
            'progress': 0,
            'history': [],
            'current_topic': 'variables'
        }
    
    response = client.chat.completions.create(
        model="mixtral-8x7b-32768",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": "Hola, quiero aprender Python desde cero. ¿Por dónde empezamos?"}
        ],
        temperature=0.7,
        max_tokens=500
    )
    
    bot_response = response.choices[0].message.content
    
    # Guardar en historial
    user_sessions[user_id]['history'].append({
        'role': 'assistant',
        'content': bot_response,
        'timestamp': datetime.now().isoformat()
    })
    
    return jsonify({
        'response': bot_response,
        'user_id': user_id,
        'progress': user_sessions[user_id]['progress']
    })

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.json
    user_id = data.get('user_id', 'default')
    user_message = data.get('message', '')
    level = data.get('level', 'basico')
    
    # Actualizar nivel si se proporciona
    if level != 'basico' and user_id in user_sessions:
        user_sessions[user_id]['level'] = level
    
    # Construir historial de contexto
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    
    # Añadir contexto del nivel y progreso
    if user_id in user_sessions:
        context = f"Nivel del usuario: {user_sessions[user_id]['level']}. Progreso: {user_sessions[user_id]['progress']}%. Tema actual: {user_sessions[user_id]['current_topic']}"
        messages.append({"role": "system", "content": context})
        
        # Añadir últimas interacciones (máx 10)
        for hist in user_sessions[user_id]['history'][-10:]:
            messages.append({"role": hist['role'], "content": hist['content']})
    
    messages.append({"role": "user", "content": user_message})
    
    response = client.chat.completions.create(
        model="mixtral-8x7b-32768",
        messages=messages,
        temperature=0.7,
        max_tokens=600
    )
    
    bot_response = response.choices[0].message.content
    
    # Actualizar historial
    if user_id in user_sessions:
        user_sessions[user_id]['history'].append({
            'role': 'user',
            'content': user_message,
            'timestamp': datetime.now().isoformat()
        })
        user_sessions[user_id]['history'].append({
            'role': 'assistant',
            'content': bot_response,
            'timestamp': datetime.now().isoformat()
        })
        
        # Actualizar progreso si el mensaje indica éxito
        if any(word in user_message.lower() for word in ['correcto', 'bien', 'funciona']):
            user_sessions[user_id]['progress'] = min(user_sessions[user_id]['progress'] + 5, 100)
    
    return jsonify({
        'response': bot_response,
        'progress': user_sessions[user_id]['progress'] if user_id in user_sessions else 0
    })

@app.route('/api/hint', methods=['POST'])
def get_hint():
    data = request.json
    user_id = data.get('user_id', 'default')
    exercise = data.get('exercise', '')
    
    response = client.chat.completions.create(
        model="mixtral-8x7b-32768",
        messages=[
            {"role": "system", "content": "Eres un tutor paciente. Da una pista útil pero no des la solución completa. Sé alentador."},
            {"role": "user", "content": f"Ejercicio actual: {exercise}\n\nDame una pista para resolver este ejercicio de Python."}
        ],
        temperature=0.5,
        max_tokens=200
    )
    
    return jsonify({'hint': response.choices[0].message.content})

@app.route('/api/progress', methods=['GET'])
def get_progress():
    user_id = request.args.get('user_id', 'default')
    if user_id in user_sessions:
        return jsonify({
            'progress': user_sessions[user_id]['progress'],
            'level': user_sessions[user_id]['level'],
            'current_topic': user_sessions[user_id]['current_topic']
        })
    return jsonify({'progress': 0, 'level': 'basico', 'current_topic': 'inicio'})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)