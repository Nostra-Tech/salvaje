/**
 * Validación de registro de la Polla Mundialista Salvaje.
 * Acepta correos personales reales (@gmail.com, @hotmail.com, @outlook.com,
 * @outlook.es, etc.) y dominios corporativos completos; rechaza correos
 * temporales/desechables, incompletos, mal escritos (errores de tipeo) o falsos.
 */

// Formato base de correo (local@dominio.tld). Estricto pero sin paranoia RFC.
const EMAIL_RE = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,24}$/i

// Dominios desechables / temporales más comunes (bloqueados).
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'yopmail.com', 'yopmail.fr', 'guerrillamail.com', 'guerrillamail.info',
  'sharklasers.com', 'grr.la', 'guerrillamailblock.com', '10minutemail.com', '10minutemail.net',
  'tempmail.com', 'temp-mail.org', 'tempmail.dev', 'tempmailo.com', 'throwawaymail.com',
  'getnada.com', 'nada.email', 'trashmail.com', 'trashmail.de', 'maildrop.cc', 'dispostable.com',
  'fakeinbox.com', 'mailnesia.com', 'mintemail.com', 'mohmal.com', 'emailondeck.com',
  'spamgourmet.com', 'mailcatch.com', 'tempinbox.com', 'anonbox.net', 'inboxkitten.com',
  'mailsac.com', 'easytrashmail.com', 'spam4.me', 'tmpmail.org', 'tmpmail.net', 'discard.email',
  'fakemail.net', 'mvrht.com', 'mytemp.email', 'burnermail.io', 'mailtothis.com', 'tempr.email',
  'moakt.com', 'luxusmail.org', 'cmail.club', '20minutemail.com', 'emltmp.com', 'gettempmail.com',
])

// Dominios claramente de prueba / placeholder.
const FAKE_DOMAINS = new Set([
  'example.com', 'example.org', 'example.net', 'test.com', 'test.test', 'domain.com',
  'correo.com', 'email.es', 'asdf.com', 'aaa.com', 'qwerty.com', 'noemail.com', 'sinemail.com',
])

// Errores de tipeo frecuentes de proveedores populares → corrección sugerida.
const TYPO_DOMAINS = {
  'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gamil.com': 'gmail.com', 'gmal.com': 'gmail.com',
  'gnail.com': 'gmail.com', 'gmaill.com': 'gmail.com', 'gmail.con': 'gmail.com', 'gmail.cm': 'gmail.com',
  'gmail.co.com': 'gmail.com', 'gmail.om': 'gmail.com', 'gmsil.com': 'gmail.com',
  'hotmai.com': 'hotmail.com', 'hotmial.com': 'hotmail.com', 'hotmal.com': 'hotmail.com',
  'hotmaill.com': 'hotmail.com', 'hotmail.con': 'hotmail.com', 'hotmail.cm': 'hotmail.com',
  'hotnail.com': 'hotmail.com', 'hotmil.com': 'hotmail.com', 'hotmail.om': 'hotmail.com',
  'outlok.com': 'outlook.com', 'outllok.com': 'outlook.com', 'outook.com': 'outlook.com',
  'outlook.con': 'outlook.com', 'outlook.cm': 'outlook.com', 'outlookk.com': 'outlook.com',
  'hotmail.es.com': 'hotmail.es', 'yaho.com': 'yahoo.com', 'yahooo.com': 'yahoo.com',
  'yahoo.con': 'yahoo.com', 'yahho.com': 'yahoo.com', 'iclould.com': 'icloud.com',
  'icloud.con': 'icloud.com', 'iclud.com': 'icloud.com',
}

// TLD mal escritos comunes.
const TLD_TYPOS = { con: 'com', cmo: 'com', vom: 'com', xom: 'com', om: 'com', cim: 'com', clm: 'com', comm: 'com' }

/**
 * Valida un correo. Devuelve { ok: true, value } o { ok: false, reason }.
 */
export function validateEmail(raw) {
  const email = String(raw || '').trim().toLowerCase()
  if (!email) return { ok: false, reason: 'Escribe tu correo electrónico.' }
  if (/\s/.test(email)) return { ok: false, reason: 'El correo no puede tener espacios.' }
  if ((email.match(/@/g) || []).length !== 1) return { ok: false, reason: 'El correo debe tener un solo “@”.' }

  const [local, domain] = email.split('@')
  if (!local || !domain) return { ok: false, reason: 'Correo incompleto.' }
  if (local.length < 2) return { ok: false, reason: 'La parte antes del “@” es muy corta.' }
  if (email.includes('..')) return { ok: false, reason: 'El correo tiene puntos seguidos.' }
  if (!domain.includes('.')) return { ok: false, reason: 'Al dominio le falta la extensión (ej. .com).' }

  if (!EMAIL_RE.test(email)) return { ok: false, reason: 'Correo inválido. Revisa que esté bien escrito.' }

  const tld = domain.split('.').pop()
  if (TLD_TYPOS[tld]) {
    const fixed = `${domain.slice(0, -tld.length)}${TLD_TYPOS[tld]}`
    return { ok: false, reason: `¿Quisiste decir …@${fixed}?` }
  }

  if (TYPO_DOMAINS[domain]) {
    return { ok: false, reason: `¿Quisiste decir …@${TYPO_DOMAINS[domain]}?` }
  }
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return { ok: false, reason: 'No se permiten correos temporales. Usa un correo real.' }
  }
  if (FAKE_DOMAINS.has(domain)) {
    return { ok: false, reason: 'Ingresa un correo real (ese dominio no es válido).' }
  }

  return { ok: true, value: email }
}

/**
 * Valida un celular: mínimo 10 dígitos (acepta +, espacios y guiones).
 * Devuelve { ok: true, value } (solo dígitos) o { ok: false, reason }.
 */
export function validatePhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '')
  if (!digits) return { ok: false, reason: 'Escribe tu número de celular.' }
  if (digits.length < 10) return { ok: false, reason: 'El celular debe tener mínimo 10 dígitos.' }
  if (digits.length > 15) return { ok: false, reason: 'El celular tiene demasiados dígitos.' }
  return { ok: true, value: digits }
}
