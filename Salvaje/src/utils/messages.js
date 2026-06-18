/**
 * SALVAJE — Voz de marca centralizada.
 * Toda la app usa estos textos para mantener tono consistente:
 * directo, fuerte, motivador, sin diminutivos.
 */

export const MSG = {
  // Errores genéricos
  err_generic:        'Algo falló. Reintenta o llama a la tribu.',
  err_network:        'Sin conexión. Revisa tu internet.',
  err_session_expired:'Tu sesión cerró. Vuelve a entrar.',
  err_not_found:      'No encontramos lo que buscabas.',
  err_permission:     'No tienes acceso a esta zona.',
  err_validation:     'Revisa los datos. Algo no cuadra.',
  err_required:       (field) => `${field} no puede quedar en blanco`,

  // Auth
  err_invalid_creds:  'No pudimos identificarte. Revisa tus datos.',
  err_email_exists:   'Ese email ya pertenece a la tribu. Inicia sesión.',
  err_weak_pwd:       'La contraseña es muy débil. Mínimo 8 caracteres.',
  err_email_not_found:'Este email no está registrado en la tribu.',
  err_too_many:       'Demasiados intentos. Espera un momento.',

  // Éxitos
  ok_saved:           'Listo. Cambios guardados.',
  ok_created:         'Creado. Vamos por más.',
  ok_deleted:         'Eliminado.',
  ok_sent:            'Enviado.',
  ok_welcome:         'Bienvenido a la tribu.',

  // Reservas / clases
  ok_reservation:     'Reserva confirmada. Te esperamos.',
  ok_cancel_reserve:  'Reserva cancelada. Tu cupo se libera.',
  ok_check_in:        'Registrado. Buena clase.',
  err_class_full:     'Clase llena. Apúntate a otra.',
  err_no_membership:  'Sin membresía activa. Renueva para asistir.',
  err_already_in:     'Ya estás registrado en esta clase.',

  // Pagos / membresía
  ok_payment_sent:    'Comprobante enviado. El admin lo revisa pronto.',
  ok_payment_received:'Pago recibido. La tribu te tiene activo.',
  err_payment_rejected:'Tu pago fue rechazado. Revisa con el admin.',

  // Confirmaciones destructivas
  confirm_delete_user:    '¿Eliminar a este salvaje? No hay vuelta atrás.',
  confirm_cancel_reserve: '¿Soltar esta clase? Tu cupo se libera.',
  confirm_cancel_class:   '¿Cancelar la clase? Los inscritos serán notificados.',
  confirm_finalize_class: '¿Finalizar la clase? Cierra el registro y suma a tu nómina.',
  confirm_logout:         '¿Cerrar sesión?',

  // Empty states
  empty_classes:      'Aquí no hay nada todavía. Es tu turno.',
  empty_reservations: 'Sin clases agendadas. ¿Reservas la próxima?',
  empty_notifications:'Todo al día. Sigue así.',
  empty_search:       'Sin coincidencias. Prueba con otro término.',
  empty_users:        'Aún no hay tribu. Crea el primer salvaje.',
  empty_history:      'Sin actividad aún. Empieza a moverte.',
  empty_payments:     'Sin pagos pendientes. Todo limpio.',

  // Loaders
  load_classes:       'Calentando...',
  load_stats:         'Sumando reps...',
  load_users:         'Listando la tribu...',
  load_payroll:       'Calculando nómina...',
  load_dashboard:     'Preparando tu panel...',

  // Validaciones específicas
  err_phone_invalid:  'Número inválido. Mínimo 7 dígitos.',
  err_email_invalid:  'Ingresa un email válido.',
  err_amount_invalid: 'Monto inválido.',
}

/**
 * Tonos para confirmaciones (variant del componente).
 */
export const TONES = {
  destructive: 'destructive',
  primary: 'primary',
  warning: 'warning',
  info: 'info',
}
