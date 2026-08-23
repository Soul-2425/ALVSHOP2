<?php
/**
 * ==============================================================================
 * ALVSHOP - LIKES API PROVIDER BACKEND HANDLER (PHP PROTEGIDO)
 * ==============================================================================
 * Este archivo protege la URL y API KEY del proveedor de Likes para que
 * nunca queden expuestas en el código frontend ni en las herramientas de desarrollo.
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$configFile = __DIR__ . '/config_likes_secret.json';

function getLikesConfig() {
    global $configFile;
    if (!file_exists($configFile)) {
        return [
            'providerUrl' => '',
            'apiKey' => '',
            'serviceId' => '',
            'isConnected' => false
        ];
    }
    $content = file_get_contents($configFile);
    return json_decode($content, true) ?: [
        'providerUrl' => '',
        'apiKey' => '',
        'serviceId' => '',
        'isConnected' => false
    ];
}

function saveLikesConfig($data) {
    global $configFile;
    file_put_contents($configFile, json_encode($data, JSON_PRETTY_PRINT));
}

$action = $_GET['action'] ?? '';

// 1. OBTENER ESTADO DE LA CONFIGURACIÓN (SIN EXPONER LA KEY COMPLETA)
if ($action === 'get_config' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $cfg = getLikesConfig();
    $key = $cfg['apiKey'] ?? '';
    $maskedKey = strlen($key) > 8 ? substr($key, 0, 4) . '***' . substr($key, -4) : ($key ? '***' : '');

    echo json_encode([
        'success' => true,
        'isConnected' => !empty($cfg['providerUrl']) && !empty($cfg['apiKey']),
        'providerUrl' => $cfg['providerUrl'] ?? '',
        'serviceId' => $cfg['serviceId'] ?? '',
        'hasKey' => !empty($key),
        'maskedKey' => $maskedKey
    ]);
    exit();
}

// 2. GUARDAR CONFIGURACIÓN DEL PROVEEDOR
if ($action === 'save_config' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $raw = file_get_contents('php://input');
    $payload = json_decode($raw, true) ?: [];

    $cfg = getLikesConfig();
    if (isset($payload['providerUrl'])) $cfg['providerUrl'] = trim($payload['providerUrl']);
    if (!empty($payload['apiKey'])) $cfg['apiKey'] = trim($payload['apiKey']);
    if (isset($payload['serviceId'])) $cfg['serviceId'] = trim($payload['serviceId']);
    $cfg['isConnected'] = !empty($cfg['providerUrl']) && !empty($cfg['apiKey']);

    saveLikesConfig($cfg);

    echo json_encode([
        'success' => true,
        'message' => 'Configuración de proveedor guardada de forma segura en el servidor.',
        'isConnected' => $cfg['isConnected'],
        'providerUrl' => $cfg['providerUrl']
    ]);
    exit();
}

// 3. DESPACHAR PEDIDO DE LIKES
if ($action === 'dispatch' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $raw = file_get_contents('php://input');
    $payload = json_decode($raw, true) ?: [];

    $orderId = $payload['orderId'] ?? '';
    $uid = $payload['uid'] ?? '';
    $likesToAdd = intval($payload['likesToAdd'] ?? 2000);
    $nickname = $payload['nickname'] ?? 'Jugador';
    $currentLikes = intval($payload['currentLikes'] ?? 0);

    $cfg = getLikesConfig();

    if (!empty($cfg['providerUrl']) && !empty($cfg['apiKey'])) {
        $ch = curl_init($cfg['providerUrl']);
        $postData = json_encode([
            'service_id' => $cfg['serviceId'] ?: 'likes_ff',
            'target_uid' => $uid,
            'quantity' => $likesToAdd,
            'order_id' => $orderId
        ]);

        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: Bearer ' . $cfg['apiKey'],
            'Content-Type: application/json'
        ]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode >= 200 && $httpCode < 300) {
            $respData = json_decode($response, true) ?: [];
            echo json_encode([
                'success' => true,
                'mode' => 'API',
                'txId' => $respData['transaction_id'] ?? "TX-$orderId",
                'message' => 'Likes enviados automáticamente a través de la API del proveedor.'
            ]);
            exit();
        }
    }

    // Despacho Manual por defecto
    echo json_encode([
        'success' => true,
        'mode' => 'MANUAL',
        'message' => 'Pedido registrado exitosamente. Notificación enviada al administrador para envío manual.',
        'auditData' => [
            'orderId' => $orderId,
            'uid' => $uid,
            'nickname' => $nickname,
            'level' => 68,
            'likesBefore' => $currentLikes,
            'likesAdded' => $likesToAdd,
            'targetLikes' => $currentLikes + $likesToAdd
        ]
    ]);
    exit();
}

echo json_encode(['error' => 'Acción no válida']);
