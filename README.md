# 🐍 Aprende Python Interactivo

Plataforma educativa interactiva para aprender Python con tutor de IA (Groq).

## 🚀 Despliegue en Render

### Backend (API)
1. Crea una cuenta en [Render](https://render.com)
2. Conecta tu repositorio de GitHub
3. Crea un nuevo **Web Service**
4. Configura:
   - **Build Command:** `pip install -r backend/requirements.txt`
   - **Start Command:** `gunicorn app:app --chdir backend`
   - **Environment Variables:** `GROQ_API_KEY` (obténla en console.groq.com)

### Frontend
1. Cambia `API_URL` en `frontend/script.js` por tu URL de Render
2. Despliega en **Static Site** en Render (apunta a la carpeta `frontend`)

## 📚 Características
- ✅ Ejercicios interactivos generados por IA
- ✅ Feedback instantáneo y personalizado
- ✅ Sistema de progreso y niveles
- ✅ Pistas inteligentes
- ✅ Interfaz conversacional tipo chat

## 🛠️ Tecnologías
- Backend: Flask + Groq API
- Frontend: HTML5, CSS3, JavaScript puro
- Despliegue: Render

## 📝 Licencia
MIT