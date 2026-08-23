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
        nickname = f"Player_{uid[-4:]}"

    # Formato estándar de respuesta compatible con ALVSHOP & jinix6 / 0xMe
    response_data = {
        "basicInfo": {
            "accountId": str(uid),
            "nickname": nickname,
            "region": server,
            "level": 68,
            "liked": 24500,
            "badgeCnt": 120,
            "rank": 220
        },
        "profileInfo": {
            "avatarId": 102000007
        },
        "guildInfo": {
            "guildName": "ALV CLAN"
        }
    }

    return jsonify(response_data), 200

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"🚀 Free Fire Validator Microservice corriendo en http://localhost:{port}")
    app.run(host='0.0.0.0', port=port, debug=False)
