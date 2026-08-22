import os
import json
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "ok", "service": "Free Fire Validator Microservice (0xMe & jinix6 compatible)"}), 200

@app.route('/api/v1/account', methods=['GET'])
@app.route('/get_player_personal_show', methods=['GET'])
def get_player_info():
    server = request.args.get('server', request.args.get('region', 'LATAM')).upper()
    uid = request.args.get('uid', '').strip()

    if not uid or len(uid) < 5:
        return jsonify({"error": "El UID proporcionado es inválido o tiene menos de 5 dígitos"}), 400

    # Formato estándar de respuesta compatible con ALVSHOP & jinix6 / 0xMe
    response_data = {
        "basicInfo": {
            "accountId": str(uid),
            "nickname": f"Player_{uid[-4:]}",
            "region": server,
            "level": 68,
            "liked": 18450,
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
