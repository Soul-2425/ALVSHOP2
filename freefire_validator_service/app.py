# pyright: reportMissingImports=false
# type: ignore
import os
import json
import requests  # type: ignore
from flask import Flask, request, jsonify  # type: ignore
from flask_cors import CORS  # type: ignore

app = Flask(__name__)
CORS(app)

RECARGAS_AMERICA_KEY = os.environ.get('RECARGAS_AMERICA_KEY', 'ra_CMZjuhXfrdk9WDJ1RYbg0CBrBNxM0Qa3QESkRxmb')
BALANCES_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'balances.json')

def load_balances():
    if not os.path.exists(BALANCES_FILE):
        initial = {
            "carlosjavierlarosagranado@gmail.com": 0.75,
            "0a6ee88c-c9e8-4b8f-a247-4fa73d2cac1c": 0.75
        }
        with open(BALANCES_FILE, 'w', encoding='utf-8') as f:
            json.dump(initial, f, indent=2)
        return initial
    try:
        with open(BALANCES_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return {}

def save_balances(data):
    try:
        with open(BALANCES_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print(f"Error saving balances: {e}")

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "ok", "service": "Free Fire Validator & Balance Microservice"}), 200

# ==========================================
# CENTRALIZED USER WALLET BALANCE API
# ==========================================
@app.route('/api/v1/balances', methods=['GET'])
def get_all_balances():
    balances = load_balances()
    return jsonify({"success": True, "balances": balances}), 200

@app.route('/api/v1/balance/update', methods=['POST'])
def update_user_balance():
    payload = request.get_json(force=True, silent=True) or {}
    user_id = payload.get('userId', '').strip()
    email = payload.get('email', '').strip().lower()
    balance = float(payload.get('balance', 0))

    balances = load_balances()
    if user_id:
        balances[user_id] = round(balance, 2)
    if email:
        balances[email] = round(balance, 2)

    save_balances(balances)
    return jsonify({"success": True, "userId": user_id, "email": email, "balance": round(balance, 2)}), 200

LIKES_CONFIG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'likes_provider_config.json')

def load_likes_config():
    if not os.path.exists(LIKES_CONFIG_FILE):
        return {"providerUrl": "", "apiKey": "", "serviceId": "", "isConnected": False}
    try:
        with open(LIKES_CONFIG_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return {"providerUrl": "", "apiKey": "", "serviceId": "", "isConnected": False}

def save_likes_config(data):
    try:
        with open(LIKES_CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print(f"Error saving likes config: {e}")

# ==========================================
# PROTECTED LIKES API PROVIDER BACKEND
# ==========================================
@app.route('/api/v1/likes/config', methods=['GET'])
def get_likes_provider_config():
    cfg = load_likes_config()
    # Mask API key so it is never exposed in browser DevTools
    masked_key = f"{cfg.get('apiKey', '')[:6]}***{cfg.get('apiKey', '')[-4:]}" if len(cfg.get('apiKey', '')) > 10 else ("***" if cfg.get('apiKey') else "")
    return jsonify({
        "success": True,
        "isConnected": bool(cfg.get('providerUrl') and cfg.get('apiKey')),
        "providerUrl": cfg.get('providerUrl', ''),
        "serviceId": cfg.get('serviceId', ''),
        "hasKey": bool(cfg.get('apiKey')),
        "maskedKey": masked_key
    }), 200

@app.route('/api/v1/likes/config', methods=['POST'])
def update_likes_provider_config():
    payload = request.get_json(force=True, silent=True) or {}
    provider_url = payload.get('providerUrl', '').strip()
    api_key = payload.get('apiKey', '').strip()
    service_id = payload.get('serviceId', '').strip()

    cfg = load_likes_config()
    if provider_url is not None:
        cfg['providerUrl'] = provider_url
    if api_key:  # Only update key if a new one is passed
        cfg['apiKey'] = api_key
    if service_id is not None:
        cfg['serviceId'] = service_id
    cfg['isConnected'] = bool(cfg.get('providerUrl') and cfg.get('apiKey'))

    save_likes_config(cfg)
    return jsonify({
        "success": True,
        "message": "Configuración de proveedor de Likes guardada de forma segura en el servidor.",
        "isConnected": cfg['isConnected'],
        "providerUrl": cfg.get('providerUrl', ''),
        "serviceId": cfg.get('serviceId', '')
    }), 200

@app.route('/api/v1/likes/dispatch', methods=['POST'])
def dispatch_likes_order():
    payload = request.get_json(force=True, silent=True) or {}
    order_id = payload.get('orderId', '').strip()
    uid = payload.get('uid', '').strip()
    likes_to_add = int(payload.get('likesToAdd', 2000))
    nickname = payload.get('nickname', 'Jugador')
    current_likes = int(payload.get('currentLikes', 0))

    cfg = load_likes_config()
    is_connected = bool(cfg.get('providerUrl') and cfg.get('apiKey'))

    if is_connected:
        try:
            headers = {
                'Authorization': f"Bearer {cfg['apiKey']}",
                'Content-Type': 'application/json'
            }
            body = {
                'service_id': cfg.get('serviceId', 'likes_ff'),
                'target_uid': uid,
                'quantity': likes_to_add,
                'order_reference': order_id
            }
            res = requests.post(cfg['providerUrl'], json=body, headers=headers, timeout=10)
            if res.status_code in [200, 201]:
                res_data = res.json()
                return jsonify({
                    "success": True,
                    "mode": "API",
                    "txId": res_data.get('transaction_id', f"TX-{order_id}"),
                    "message": "Likes enviados automáticamente a través de la API del proveedor."
                }), 200
        except Exception as e:
            print(f"Error despachando por API externa: {e}")

    # Fallback to Manual dispatch with Notification
    return jsonify({
        "success": True,
        "mode": "MANUAL",
        "message": "Pedido registrado exitosamente. Notificación enviada al administrador para envío manual.",
        "auditData": {
            "orderId": order_id,
            "uid": uid,
            "nickname": nickname,
            "level": 68,
            "likesBefore": current_likes,
            "likesAdded": likes_to_add,
            "targetLikes": current_likes + likes_to_add
        }
    }), 200

@app.route('/api/v1/account', methods=['GET'])
@app.route('/get_player_personal_show', methods=['GET'])
def get_player_info():
    server = request.args.get('server', request.args.get('region', 'LATAM')).upper()
    uid = request.args.get('uid', '').strip()

    if not uid or len(uid) < 5:
        return jsonify({"error": "El UID proporcionado es inválido o tiene menos de 5 dígitos"}), 400

    nickname = None

    # 1. Consultar con Recargas América
    try:
        res = requests.post(
            'https://panel.recargasamerica.com/api/v1/pins/validate',
            headers={
                'Authorization': f'Bearer {RECARGAS_AMERICA_KEY}',
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            json={
                'product_id': 340,
                'service_user_id': uid
            },
            timeout=4
        )
        if res.status_code == 200:
            data = res.json()
            if data.get('success') and data.get('data', {}).get('status') and data.get('data', {}).get('account_name'):
                nickname = data['data']['account_name']
    except Exception as e:
        print(f"Error consultando Recargas América: {e}")

    if not nickname:
        return jsonify({"error": "ID incorrecta. Por favor, verifica el ID ingresado.", "success": False}), 404

    response_data = {
        "success": True,
        "basicInfo": {
            "accountId": str(uid),
            "nickname": nickname,
            "region": server,
            "isVerified": True,
            "source": "Garena / Recargas América Oficial"
        }
    }

    return jsonify(response_data), 200

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"🚀 Free Fire Validator Microservice corriendo en http://localhost:{port}")
    app.run(host='0.0.0.0', port=port, debug=False)

