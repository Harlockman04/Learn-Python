from flask import Flask, request, jsonify
from flask_cors import CORS
from groq import Groq
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

# Inicializar cliente de Groq
client = Groq(api_key=os.getenv('GROQ_API_KEY'))

# Contexto del sistema para enseñar Python
SYSTEM_PROMPT = """Eres un tutor interactivo de Python que enseña mediante tests y ejercicios prácticos.
Tu estilo es similar a Mimo: amigable, motivador y con explicaciones claras.
Para cada interacción:
1. Si es inicio: pregunta el nivel del usuario (básico/intermedio/avanzado)
2. Para ejercicios: genera un ejercicio corto de código con tests ocultos
3. Evalúa respuestas: da feedback específico, no solo "correcto/incorrecto"
4. Progresión: aumenta dificultad gradualmente
5. Mantén un tono positivo y motivador

Formato de respuesta:
- Para preguntar nivel: {"type": "level_select", "message": "..."}
- Para ejercicio: {"type": "exercise", "question": "...", "expected_hint": "..."}
- Para feedback: {"type": "feedback", "correct": true/false, "message": "...", "next_hint": "..."}
- Para explicación: {"type": "explanation", "content": "..."}
"""

# Almacenar progreso del usuario (en producción usa una BD)
user_progress = {}

@app.route('/api/start', methods=['POST'])
def start_learning():
    data = request.json
    user_id = data.get('user_id', 'default')
    
    response = client.chat.completions.create(
        model="mixtral-8x7b-32768",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": "Quiero aprender Python desde cero. Dame mi primer ejercicio o pregunta mi nivel."}
        ],
        temperature=0.7,
        max_tokens=500
    )
    
    return jsonify({
        'response': response.choices[0].message.content,
        'user_id': user_id
    })

@app.route('/api/submit', methods=['POST'])
def submit_answer():
    data = request.json
    user_id = data.get('user_id', 'default')
    user_answer = data.get('answer', '')
    context = data.get('context', '')
    
    response = client.chat.completions.create(
        model="mixtral-8x7b-32768",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Contexto anterior: {context}\nRespuesta del usuario: {user_answer}\nEvalúa y genera siguiente paso o ejercicio."}
        ],
        temperature=0.7,
        max_tokens=600
    )
    
    return jsonify({
        'response': response.choices[0].message.content
    })

@app.route('/api/hint', methods=['POST'])
def get_hint():
    data = request.json
    current_exercise = data.get('exercise', '')
    
    response = client.chat.completions.create(
        model="mixtral-8x7b-32768",
        messages=[
            {"role": "system", "content": "Eres un tutor paciente. Da una pista útil pero no la solución completa."},
            {"role": "user", "content": f"Ejercicio actual: {current_exercise}\nDame una pista para resolverlo."}
        ],
        temperature=0.5,
        max_tokens=200
    )
    
    return jsonify({'hint': response.choices[0].message.content})

if __name__ == '__main__':
    app.run(debug=True, port=5000)