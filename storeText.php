<?php
session_start();

if (!SUPER_USER) {
    http_response_code(403);
}

if ($_SERVER["REQUEST_METHOD"] == "POST" && isset($_POST[$module::$moduleString])) {
    $_SESSION[$module::$moduleString] = urlencode($_POST[$module::$moduleString]);
    http_response_code(200);
} else {
    http_response_code(418);
}
