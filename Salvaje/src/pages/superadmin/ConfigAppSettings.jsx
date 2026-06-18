import { useEffect, useState } from 'react'
import { Settings, Save, Gift, Ticket, Star, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'
import { AdminShell } from '../../components/layout/AdminShell'
import { Card, CardBody } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { useAuth } from '../../hooks/useAuth'
import { getAppSettings, saveAppSettings, APP_SETTINGS_DEFAULT } from '../../services/app-settings.service'
import { logAdminActivity } from '../../services/activity-log.service'

export function ConfigAppSettings() {
  const { user } = useAuth()
  const [s, setS] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getAppSettings().then(setS).catch((e) => {
      console.error(e)
      toast.error('No pudimos cargar la configuración')
    })
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveAppSettings(s, user.uid)
      await logAdminActivity({
        actorId: user.uid,
        actorName: user.displayName || user.email,
        actorRole: 'superadmin',
        action: 'update_app_settings',
        entity: 'config',
        entityId: 'appSettings',
        after: s,
      }).catch(() => {})
      toast.success('Configuración guardada')
    } catch (e) { toast.error(e.message || 'Error al guardar') }
    finally { setSaving(false) }
  }

  if (!s) {
    return (
      <AdminShell title="Configuración global">
        <div className="max-w-3xl mx-auto px-4 pt-4 pb-8 space-y-3">
          {[1,2,3,4].map((i) => <div key={i} className="h-32 bg-white rounded-xl animate-pulse" />)}
        </div>
      </AdminShell>
    )
  }

  return (
    <AdminShell title="Configuración global">
      <div className="max-w-3xl mx-auto px-4 pt-4 pb-8 space-y-4">
        <div className="flex items-center gap-3">
          <Settings size={28} className="text-salvaje-orange" />
          <div>
            <h1 className="font-display text-4xl uppercase text-salvaje-dark">Configuración global</h1>
            <p className="font-body text-xs text-salvaje-gray">Parámetros que controlan toda la app. Solo SuperAdmin.</p>
          </div>
        </div>

        {/* Referidos */}
        <Card>
          <CardBody className="py-4 space-y-3">
            <div className="flex items-center gap-2">
              <Gift size={16} className="text-salvaje-orange" />
              <h2 className="font-display text-base uppercase text-salvaje-dark">Referidos</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="% por referido" type="number" value={s.referral.percentPerReferral}
                onChange={(e) => setS({ ...s, referral: { ...s.referral, percentPerReferral: parseInt(e.target.value) || 0 } })} />
              <Input label="Tope máximo (%)" type="number" value={s.referral.maxDiscountPercent}
                onChange={(e) => setS({ ...s, referral: { ...s.referral, maxDiscountPercent: parseInt(e.target.value) || 0 } })} />
              <Input label="Precio fijo monthly con código (COP)" type="number" value={s.referral.fixedPriceMonthlyCOP}
                onChange={(e) => setS({ ...s, referral: { ...s.referral, fixedPriceMonthlyCOP: parseInt(e.target.value) || 0 } })} />
              <Input label="Vigencia recompensa (días)" type="number" value={s.referral.discountValidityDays}
                onChange={(e) => setS({ ...s, referral: { ...s.referral, discountValidityDays: parseInt(e.target.value) || 0 } })} />
            </div>
          </CardBody>
        </Card>

        {/* Ticketera */}
        <Card>
          <CardBody className="py-4 space-y-3">
            <div className="flex items-center gap-2">
              <Ticket size={16} className="text-salvaje-orange" />
              <h2 className="font-display text-base uppercase text-salvaje-dark">Ticketera</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Tickets por compra" type="number" value={s.tiquetera.ticketsIncluded}
                onChange={(e) => setS({ ...s, tiquetera: { ...s.tiquetera, ticketsIncluded: parseInt(e.target.value) || 0 } })} />
              <Input label="Vigencia (días)" type="number" value={s.tiquetera.expiryDays}
                onChange={(e) => setS({ ...s, tiquetera: { ...s.tiquetera, expiryDays: parseInt(e.target.value) || 0 } })} />
            </div>
          </CardBody>
        </Card>

        {/* Cortesía */}
        <Card>
          <CardBody className="py-4 space-y-3">
            <div className="flex items-center gap-2">
              <Star size={16} className="text-salvaje-orange" />
              <h2 className="font-display text-base uppercase text-salvaje-dark">Cortesía</h2>
            </div>
            <Input label="Vigencia clase de cortesía (días)" type="number" value={s.courtesy.validDays}
              onChange={(e) => setS({ ...s, courtesy: { ...s.courtesy, validDays: parseInt(e.target.value) || 0 } })} />
          </CardBody>
        </Card>

        {/* Sub21 + payroll */}
        <Card>
          <CardBody className="py-4 space-y-3">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-salvaje-orange" />
              <h2 className="font-display text-base uppercase text-salvaje-dark">Otros parámetros</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Edad máxima Sub-21" type="number" value={s.sub21.maxAge}
                onChange={(e) => setS({ ...s, sub21: { ...s.sub21, maxAge: parseInt(e.target.value) || 21 } })} />
              <Input label="Días para registro retroactivo" type="number" value={s.payroll.retroactiveDays}
                onChange={(e) => setS({ ...s, payroll: { ...s.payroll, retroactiveDays: parseInt(e.target.value) || 7 } })} />
            </div>
          </CardBody>
        </Card>

        <Button className="w-full" size="lg" loading={saving} onClick={handleSave}>
          <Save size={16} /> Guardar configuración
        </Button>

        <p className="text-center font-body text-[11px] text-salvaje-gray">
          Estos valores se leen en runtime. Algunos requieren refresh de los usuarios para tomar efecto.
        </p>
      </div>
    </AdminShell>
  )
}
