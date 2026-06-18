import { useState, useEffect } from 'react'
import { Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { Card, CardBody } from '../../ui/Card'
import { Input } from '../../ui/Input'
import { Button } from '../../ui/Button'
import { getAppConfig, updateAppConfig } from '../../../services/membership.service'

export function BoxInfoSection() {
  const [form, setForm] = useState({ boxName: '', boxPhone: '', boxAddress: '', boxEmail: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getAppConfig().then((c) => {
      if (c) setForm({
        boxName: c.boxName || '',
        boxPhone: c.boxPhone || '',
        boxAddress: c.boxAddress || '',
        boxEmail: c.boxEmail || '',
      })
    })
  }, [])

  const set = (f) => (e) => setForm((x) => ({ ...x, [f]: e.target.value }))

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateAppConfig({
        boxName: form.boxName,
        boxPhone: form.boxPhone,
        boxAddress: form.boxAddress,
        boxEmail: form.boxEmail,
      })
      toast.success('Datos del box guardados')
    } catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  return (
    <Card>
      <CardBody className="py-5 space-y-3">
        <Input label="Nombre del box" value={form.boxName} onChange={set('boxName')} />
        <Input label="Email de contacto" type="email" value={form.boxEmail} onChange={set('boxEmail')} />
        <Input label="Teléfono" value={form.boxPhone} onChange={set('boxPhone')} />
        <Input label="Dirección" value={form.boxAddress} onChange={set('boxAddress')} />
        <Button className="w-full" loading={saving} onClick={handleSave}>
          <Save size={16} /> Guardar
        </Button>
      </CardBody>
    </Card>
  )
}
