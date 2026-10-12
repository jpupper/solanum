<?php
/**
 * SOLANUM - Procesamiento de Formulario de Contacto
 * Envío de emails a Administracion@solanum.com.ar
 */

// Configurar encabezados de respuesta
header('Content-Type: application/json; charset=UTF-8');

// Forzar zona horaria Argentina
date_default_timezone_set('America/Argentina/Buenos_Aires');

// Solo permitir solicitudes POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Método no permitido.'
    ]);
    exit;
}

// 1. Verificación Antispam / Honeypot
// Si el campo invisible 'sitio_web' viene con algún valor, es un bot
if (!empty($_POST['sitio_web'])) {
    // Responder con éxito ficticio para no alertar al bot
    echo json_encode([
        'success' => true,
        'message' => 'Tu consulta ha sido enviada con éxito.'
    ]);
    exit;
}

// 2. Sanitización y captura de campos
$nombre = isset($_POST['nombre']) ? trim(strip_tags($_POST['nombre'])) : '';
$mail = isset($_POST['mail']) ? trim(strip_tags($_POST['mail'])) : '';
$telefono = isset($_POST['telefono']) ? trim(strip_tags($_POST['telefono'])) : '';
$provincia = isset($_POST['provincia']) ? trim(strip_tags($_POST['provincia'])) : '';
$cultivo = isset($_POST['cultivo']) ? trim(strip_tags($_POST['cultivo'])) : '';
$hectareas = isset($_POST['hectareas']) ? trim(strip_tags($_POST['hectareas'])) : '';
$consulta = isset($_POST['consulta']) ? trim(strip_tags($_POST['consulta'])) : '';

// 3. Validación de campos obligatorios
if (empty($nombre)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Por favor ingresá tu nombre y apellido.'
    ]);
    exit;
}

if (empty($mail) || !filter_var($mail, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Por favor ingresá un correo electrónico válido.'
    ]);
    exit;
}

if (empty($consulta)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Por favor escribí tu consulta.'
    ]);
    exit;
}

// 4. Prevenir inyecciones en cabeceras de correo
$nombre_seguro = str_replace(array("\r", "\n", "%0a", "%0d"), ' ', $nombre);
$mail_seguro = str_replace(array("\r", "\n", "%0a", "%0d"), '', $mail);

// 5. Configurar destino y remitente
ini_set('sendmail_from', 'Administracion@solanum.com.ar');
$to = 'Administracion@solanum.com.ar';

// Asunto del correo en UTF-8 Base64 para evitar caracteres raros
$subject_text = "Nueva consulta web: " . $nombre_seguro . " - Solanum";
$subject = '=?UTF-8?B?' . base64_encode($subject_text) . '?=';

// 6. Construir cuerpo del mensaje en HTML
$fecha_envio = date('d/m/Y H:i');
$tel_mostrar = !empty($telefono) ? htmlspecialchars($telefono) : '<em>No indicado</em>';
$prov_mostrar = !empty($provincia) ? htmlspecialchars($provincia) : '<em>No indicada</em>';
$cult_mostrar = !empty($cultivo) ? htmlspecialchars($cultivo) : '<em>No indicado</em>';
$ha_mostrar = !empty($hectareas) ? htmlspecialchars($hectareas) : '<em>No indicado</em>';
$consulta_html = nl2br(htmlspecialchars($consulta));

$mensaje_html = <<<HTML
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Nueva Consulta de Contacto</title>
</head>
<body style="font-family: Arial, Helvetica, sans-serif; background-color: #f4f5f7; margin: 0; padding: 25px 15px; color: #333333;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 620px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 18px rgba(0,0,0,0.08); border: 1px solid #e5e7eb;" border="0" cellspacing="0" cellpadding="0">
          
          <!-- Header Institucional -->
          <tr>
            <td style="background-color: #960019; padding: 28px 32px; text-align: left;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold; letter-spacing: -0.5px; font-family: Arial, sans-serif;">SOLANUM</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 6px 0 0; font-size: 14px; font-family: Arial, sans-serif;">Nueva consulta recibida desde el sitio web (solanum.com.ar)</p>
            </td>
          </tr>

          <!-- Cuerpo Principal -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="font-size: 18px; color: #1e1e1e; margin: 0 0 20px; border-bottom: 2px solid #f0f2f5; padding-bottom: 10px;">Detalles del remitente</h2>

              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 15px; line-height: 1.6;">
                <tr>
                  <td width="38%" style="padding: 9px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-weight: bold;">Nombre:</td>
                  <td width="62%" style="padding: 9px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-weight: bold;">{$nombre_seguro}</td>
                </tr>
                <tr>
                  <td style="padding: 9px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-weight: bold;">Mail:</td>
                  <td style="padding: 9px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a;"><a href="mailto:{$mail_seguro}" style="color: #960019; text-decoration: none; font-weight: bold;">{$mail_seguro}</a></td>
                </tr>
                <tr>
                  <td style="padding: 9px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-weight: bold;">Teléfono:</td>
                  <td style="padding: 9px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a;">{$tel_mostrar}</td>
                </tr>
                <tr>
                  <td style="padding: 9px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-weight: bold;">Provincia:</td>
                  <td style="padding: 9px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a;">{$prov_mostrar}</td>
                </tr>
                <tr>
                  <td style="padding: 9px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-weight: bold;">Cultivo:</td>
                  <td style="padding: 9px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a;">{$cult_mostrar}</td>
                </tr>
                <tr>
                  <td style="padding: 9px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-weight: bold;">Cantidad de hectáreas:</td>
                  <td style="padding: 9px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a;">{$ha_mostrar}</td>
                </tr>
              </table>

              <!-- Mensaje / Consulta -->
              <div style="margin-top: 26px; padding: 20px; background-color: #fafbfc; border-radius: 8px; border: 1px solid #eef0f3; border-left: 4px solid #960019;">
                <span style="display: block; font-size: 13px; font-weight: bold; color: #960019; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px;">Consulta:</span>
                <p style="margin: 0; color: #1e293b; font-size: 15px; line-height: 1.65; white-space: pre-wrap;">{$consulta_html}</p>
              </div>

              <!-- Footer de la tarjeta -->
              <p style="margin: 28px 0 0; padding-top: 16px; border-top: 1px solid #f1f5f9; font-size: 13px; color: #94a3b8; text-align: right;">
                Mensaje enviado el {$fecha_envio} hs desde el formulario web
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
HTML;

// 7. Encabezados para el servidor de correo
$headers = "From: Solanum Web <Administracion@solanum.com.ar>\r\n";
$headers .= "Reply-To: " . $nombre_seguro . " <" . $mail_seguro . ">\r\n";
$headers .= "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: text/html; charset=UTF-8\r\n";
$headers .= "X-Mailer: PHP/" . phpversion() . "\r\n";

// 8. Enviar correo electrónico
$enviado = @mail($to, $subject, $mensaje_html, $headers);

if ($enviado) {
    echo json_encode([
        'success' => true,
        'message' => '¡Muchas gracias! Tu consulta ha sido enviada con éxito. Nos pondremos en contacto a la brevedad.'
    ]);
} else {
    // En caso de falla en el transporte SMTP del servidor
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'No pudimos enviar tu mensaje en este momento. Por favor contactanos directamente por WhatsApp o teléfono.'
    ]);
}
