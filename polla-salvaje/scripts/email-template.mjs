/** Plantilla del correo de la Polla (HTML email-safe). Reutilizada por el
 *  generador y el envío. */
export const CTA_URL = 'https://salvaje-app.web.app/pollamundialistasalvaje/'
export const LOGO = 'https://salvaje-app.web.app/pollamundialistasalvaje/salvaje-logo-white.png'
export const BANNER = 'https://salvaje-app.web.app/pollamundialistasalvaje/email-banner.png'
export const HOY_FECHA_TXT = '12 de junio de 2026'

export function renderEmail(v) {
  const faltanLine = v.faltan > 0
    ? `<div style="margin-top:6px;font-size:14px;color:#D4521A;font-weight:700;">Te faltan ${v.faltan} marcadores por pronosticar.</div>`
    : `<div style="margin-top:6px;font-size:14px;color:#2D7A4F;font-weight:700;">¡Tienes los 72 marcadores completos!</div>`
  const hoyBg = v.hoyPend ? '#FDEEE6' : '#EAF5EE'
  const hoyBorder = v.hoyPend ? '#F3C9B3' : '#BFE3CD'
  const hoyColor = v.hoyPend ? '#D4521A' : '#2D7A4F'

  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Polla Mundialista Salvaje</title></head>
<body style="margin:0;padding:0;background:#EDE6D8;font-family:'DM Sans',Arial,Helvetica,sans-serif;color:#2C1810;">
<!-- preheader (oculto): texto de vista previa en la bandeja -->
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#EDE6D8;font-size:1px;line-height:1px;">
Vas en la posición ${v.posicion} de ${v.total}. Te faltan ${v.faltan} marcadores por pronosticar.
</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EDE6D8;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#FAF6F0;border-radius:18px;overflow:hidden;box-shadow:0 10px 30px rgba(44,24,16,.15);">

  <!-- Banner (solo imagen) -->
  <tr><td style="padding:0;font-size:0;line-height:0;">
    <img src="${BANNER}" width="600" alt="SALVAJE · Polla Mundialista Salvaje" style="display:block;width:100%;max-width:600px;height:auto;border:0;"/>
  </td></tr>

  <!-- Saludo -->
  <tr><td style="padding:28px 28px 6px;">
    <div style="font-family:'Bebas Neue',Arial Black,sans-serif;font-size:30px;letter-spacing:1px;color:#2C1810;">Hola, ${v.nombre}</div>
    <p style="font-size:15px;line-height:1.6;color:#6B5C52;margin:8px 0 0;">Así vas en la <strong style="color:#2C1810;">Polla Mundialista Salvaje</strong>:</p>
  </td></tr>

  <!-- Posición -->
  <tr><td style="padding:18px 28px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1A0F0A;border-radius:14px;">
      <tr>
        <td style="padding:20px 22px;">
          <div style="color:#C9A227;font-size:11px;letter-spacing:3px;text-transform:uppercase;">Tu posición</div>
          <div style="font-family:'Bebas Neue',Arial Black,sans-serif;color:#FAF6F0;font-size:46px;line-height:1;">#${v.posicion} <span style="font-size:18px;color:#8a7a6c;">de ${v.total}</span></div>
        </td>
        <td align="right" style="padding:20px 22px;">
          <div style="color:#C9A227;font-size:11px;letter-spacing:3px;text-transform:uppercase;">Puntos</div>
          <div style="font-family:'Bebas Neue',Arial Black,sans-serif;color:#E8732A;font-size:46px;line-height:1;">${v.puntos}</div>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- Faltantes -->
  <tr><td style="padding:16px 28px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #F0E6D2;border-radius:14px;">
      <tr><td style="padding:18px 22px;">
        <div style="font-size:13px;color:#6B5C52;">Marcadores pronosticados</div>
        <div style="font-family:'Bebas Neue',Arial Black,sans-serif;font-size:26px;color:#2C1810;">${v.puestos} <span style="font-size:15px;color:#9b8b7c;">/ 72</span></div>
        ${faltanLine}
      </td></tr>
    </table>
  </td></tr>

  <!-- Partidos de hoy -->
  <tr><td style="padding:16px 28px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${hoyBg};border:1px solid ${hoyBorder};border-radius:14px;">
      <tr><td style="padding:18px 22px;">
        <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${hoyColor};font-weight:700;">Partidos de hoy · ${HOY_FECHA_TXT}</div>
        <div style="margin-top:6px;font-size:15px;line-height:1.6;color:#2C1810;">${v.hoyMsg}</div>
      </td></tr>
    </table>
  </td></tr>

  <!-- CTA -->
  <tr><td align="center" style="padding:26px 28px 8px;">
    <a href="${v.cta_url}" style="display:inline-block;background:#D4521A;color:#fff;text-decoration:none;font-family:'Bebas Neue',Arial Black,sans-serif;font-size:18px;letter-spacing:2px;text-transform:uppercase;padding:15px 34px;border-radius:999px;">Pronosticar ahora</a>
  </td></tr>
  <tr><td align="center" style="padding:0 28px 24px;">
    <p style="font-size:12px;color:#9b8b7c;margin:8px 0 0;">Recuerda: cada marcador se puede editar hasta 5 minutos antes del inicio del partido.</p>
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#1A0F0A;padding:18px 24px;text-align:center;">
    <div style="font-family:'Bebas Neue',Arial Black,sans-serif;color:#FAF6F0;font-size:18px;letter-spacing:3px;">SALVAJE · VIDA DEPORTIVA</div>
    <div style="color:#6B5C52;font-size:11px;margin-top:4px;">Sin excusas. Sin límites.</div>
    <div style="color:#5a4c42;font-size:10px;margin-top:10px;line-height:1.5;">Recibes este correo porque te inscribiste en la Polla Mundialista Salvaje.</div>
  </td></tr>

</table>
</td></tr></table>
</body></html>`
}
