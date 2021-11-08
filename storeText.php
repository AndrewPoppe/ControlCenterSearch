<?php
if (!SUPER_USER) {
    http_response_code(403);
}


if ($_SERVER["REQUEST_METHOD"] == "POST" && isset($_POST[$module::$moduleString])) {
    $module->storeText(urlencode($_POST[$module::$moduleString]));
    http_response_code(200);
}
