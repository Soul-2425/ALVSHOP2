# 🎮 Microservicio Validador de Free Fire (0xMe & jinix6)

Este microservicio en Python permite consultar datos de jugadores de Free Fire (Nickname, Nivel, Likes, Rango, Medallas, Gremio) interactuando con los servidores de Garena o mediante endpoints REST.

## 🚀 ¿Cómo funciona en ALVSHOP?
1. **Por defecto**, ALVSHOP valida los UIDs en vivo conectándose directamente a la API oficial de **Recargas América** (`/pins/validate`), sin requerir ningún servidor extra.
2. Si deseas enriquecer la ficha del jugador con estadísticas avanzadas de **0xMe/FreeFire-Api**, puedes iniciar este servicio en local o desplegarlo en la nube (Render, Railway, VPS).

---

## 🛠️ Instalación y Ejecución Local

### 1. Requisitos
* Python 3.9 o superior
* Instalar dependencias:
```bash
pip install flask flask-cors requests
```

### 2. Iniciar el Servidor
```bash
python app.py
```
El servidor se ejecutará en: `http://localhost:5000`

### 3. Conectar a ALVSHOP
1. Ve a **Panel Admin -> Integraciones -> Validador Free Fire**:
   `http://localhost:5173/admin/integrations`
2. En **Servidor Validador Personalizado**, ingresa:
   `http://localhost:5000`
3. Haz clic en **💾 Guardar Endpoint**.
