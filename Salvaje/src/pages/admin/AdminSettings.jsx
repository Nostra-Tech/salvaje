import { useState } from 'react'
import {
  Settings, Building2, CreditCard, Bell, Calendar, Users,
  Award, Megaphone, Shield, Database, ChevronRight, ArrowLeft,
} from 'lucide-react'
import { AdminShell } from '../../components/layout/AdminShell'
import { Card, CardBody } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { BoxInfoSection } from '../../components/admin/settings/BoxInfoSection'
import { PaymentMethodsSection } from '../../components/admin/settings/PaymentMethodsSection'
import { CatalogsSection } from '../../components/admin/settings/CatalogsSection'

const SETTINGS_CARDS = [
  { key: 'box',       icon: Building2,  title: 'Datos del Box',           desc: 'Nombre, dirección, contacto' },
  { key: 'payments',  icon: CreditCard, title: 'Métodos de Pago',         desc: 'QR Nequi, Daviplata, datos bancarios' },
  { key: 'catalogs',  icon: Database,   title: 'Catálogos editables',     desc: 'Categorías, especializaciones, niveles' },
  { key: 'notifs',    icon: Bell,       title: 'Notificaciones',          desc: 'Plantillas y horarios', soon: true },
  { key: 'schedule',  icon: Calendar,   title: 'Horarios del box',        desc: 'Días y horas de operación', soon: true },
  { key: 'roles',     icon: Users,      title: 'Roles y permisos',        desc: 'Crear admin, gestionar accesos', soon: true },
  { key: 'rewards',   icon: Award,      title: 'Logros y gamificación',   desc: 'Catálogo de logros, activar/desactivar', soon: true },
  { key: 'marketing', icon: Megaphone,  title: 'Plantillas de marketing', desc: 'Mensajes pre-armados para campañas', soon: true },
  { key: 'security',  icon: Shield,     title: 'Seguridad',               desc: 'Logs de acceso a datos sensibles', soon: true },
]

export function AdminSettings() {
  const [section, setSection] = useState(null)

  const ActiveSection = section ? SECTIONS[section.key] : null

  return (
    <AdminShell title="Configuración">
      <div className="px-4 xl:px-6 pt-4 pb-8 space-y-4">
        {!section ? (
          <>
            <div className="flex items-center gap-3">
              <Settings size={28} className="text-salvaje-orange" />
              <h1 className="font-display text-4xl uppercase text-salvaje-dark">Configuración</h1>
            </div>
            <p className="font-body text-sm text-salvaje-gray">
              Toca una sección para configurar.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {SETTINGS_CARDS.map((c) => {
                const Icon = c.icon
                return (
                  <button
                    key={c.key}
                    onClick={() => !c.soon && setSection(c)}
                    disabled={c.soon}
                    className={`text-left p-5 rounded-2xl bg-white shadow-salvaje hover:shadow-salvaje-md transition-all ${
                      c.soon ? 'opacity-60 cursor-not-allowed' : 'hover:-translate-y-0.5 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-12 h-12 rounded-xl bg-salvaje-orange/10 flex items-center justify-center">
                        <Icon size={22} className="text-salvaje-orange" strokeWidth={1.75} />
                      </div>
                      {c.soon ? (
                        <Badge variant="default">Próx.</Badge>
                      ) : (
                        <ChevronRight size={18} className="text-salvaje-gray" />
                      )}
                    </div>
                    <p className="font-display text-lg uppercase text-salvaje-dark leading-tight">{c.title}</p>
                    <p className="font-body text-xs text-salvaje-gray mt-1">{c.desc}</p>
                  </button>
                )
              })}
            </div>
          </>
        ) : (
          <>
            <button
              onClick={() => setSection(null)}
              className="inline-flex items-center gap-1 text-sm font-body text-salvaje-gray hover:text-salvaje-dark"
            >
              <ArrowLeft size={14} /> Volver a configuración
            </button>
            <div className="flex items-center gap-3">
              <section.icon size={28} className="text-salvaje-orange" />
              <h1 className="font-display text-3xl uppercase text-salvaje-dark">{section.title}</h1>
            </div>
            {ActiveSection && <ActiveSection />}
          </>
        )}
      </div>
    </AdminShell>
  )
}

const SECTIONS = {
  box: BoxInfoSection,
  payments: PaymentMethodsSection,
  catalogs: CatalogsSection,
}
