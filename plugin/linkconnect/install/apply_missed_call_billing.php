<?php
require_once dirname(__DIR__) . '/_common.php';
header('Content-Type: application/json; charset=utf-8');
$expected = 'callbackfill-8a1c3e5f7b9204d6';
$given = isset($_REQUEST['token']) ? (string) $_REQUEST['token'] : '';
if ($given === '' || !hash_equals($expected, $given)) {
    http_response_code(403);
    echo json_encode(array('ok'=>false,'error'=>'FORBIDDEN'), JSON_UNESCAPED_UNICODE);
    exit;
}
if ((string)($_REQUEST['action'] ?? '') !== 'run') {
    echo json_encode(array('ok'=>true,'message'=>'action=run'), JSON_UNESCAPED_UNICODE);
    exit;
}
if (function_exists('lc_settings_save')) {
    lc_settings_save(array('callCreateOnMissed' => '1'));
}
$backfill = function_exists('lc_call_logs_backfill_conversions')
    ? lc_call_logs_backfill_conversions(array('limit'=>5000,'force'=>true))
    : array('ok'=>false);
echo json_encode(array(
    'ok' => !empty($backfill['ok']),
    'callCreateOnMissed' => lc_settings_get_bool('callCreateOnMissed', true),
    'created' => (int)($backfill['created'] ?? 0),
    'scanned' => (int)($backfill['scanned'] ?? 0),
    'skipped' => (int)($backfill['skipped'] ?? 0),
    'message' => (string)($backfill['message'] ?? ''),
    'v' => 2,
), JSON_UNESCAPED_UNICODE);
