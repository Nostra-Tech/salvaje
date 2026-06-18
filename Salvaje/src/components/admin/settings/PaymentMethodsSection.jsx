import { useState, useEffect, useRef } from 'react'
import { Save, Upload, X, Smartphone, Building2, Image, CreditCard } from 'lucide-react'
import toast from 'react-hot-toast'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '../../../services/firebase'
import { Card, CardBody } from '../../ui/Card'
import { Input } from '../../ui/Input'
import { Button } from '../../ui/Button'
import { useAuth } from '../../../hooks/useAuth'
import { getPaymentConfig, savePaymentConfig } from '../../../services/payment-config.service'

export function PaymentMethodsSection() {
  const { user } = useAuth()
  const [form, setForm] = useState({
    nequiQrImageURL: '', daviplataQrImageURL: '',
    nequiKey: '', daviplataKey: '',
    bankName: '', accountNumber: '', accountType: 'ahorros', accountHolder: '', nit: '',
  })
  const [saving, setSaving] = useState(false)
  const nequiRef = useRef(null)
  const daviRef = useRef(null)
  const [upN, setUpN] = useState(false)
  const [upD, setUpD] = useState(false)

  useEffect(() => {
    getPaymentConfig().then((pm) => {
      if (pm) setForm({
        nequiQrImageURL: pm.nequiQrImageURL || '',
        daviplataQrImageURL: pm.daviplataQrImageURL || '',
        nequiKey: pm.nequiKey || '',
        daviplataKey: pm.daviplataKey || '',
        bankName: pm.bankTransferInfo?.bankName || '',
        accountNumber: pm.bankTransferInfo?.accountNumber || '',
        accountType: pm.bankTransferInfo?.accountType || 'ahorros',
        accountHolder: pm.bankTransferInfo?.accountHolder || '',
        nit: pm.bankTransferInfo?.nit || '',
      })
    })
  }, [])

  const upload = async (file, type) => {
    if (!file) return
    const setUp = type === 'nequi' ? setUpN : setUpD
    setUp(true)
    try {
      const path = `payment_qr/${type}_${Date.now()}_${file.name}`
      const r = storageRef(storage, path)
      await uploadBytes(r, file)
      const url = await getDownloadURL(r)
      setForm((f) => ({ ...f, [type === 'nequi' ? 'nequiQrImageURL' : 'daviplataQrImageURL']: url }))
      toast.success(`QR ${type} subido`)
    } catch (e) { toast.error('Storage requiere plan Blaze: ' + e.message) }
    finally { setUp(false) }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await savePaymentConfig({
        nequiQrImageURL: form.nequiQrImageURL,
        daviplataQrImageURL: form.daviplataQrImageURL,
        nequiKey: form.nequiKey?.trim() || '',
        daviplataKey: form.daviplataKey?.trim() || '',
        bankTransferInfo: {
          bankName: form.bankName,
          accountNumber: form.accountNumber,
          accountType: form.accountType,
          accountHolder: form.accountHolder,
          nit: form.nit,
        },
        wompiPublicKey: null,
        wompiWidgetEnabled: false,
        mercadopagoPublicKey: null,
      }, user.uid)
      toast.success('Métodos de pago guardados')
    } catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      {/* QRs */}
      <Card>
        <CardBody className="py-5">
          <div className="flex items-center gap-2 mb-2">
            <Image size={18} className="text-salvaje-orange" />
            <p className="font-display text-base uppercase text-salvaje-dark">Códigos QR (Nequi y Daviplata)</p>
          </div>
          <p className="font-body text-xs text-salvaje-gray mb-4">
            Sube los QR estáticos. Los usuarios los verán en el checkout.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <QRUploader type="nequi" title="Nequi" url={form.nequiQrImageURL} uploading={upN}
              onUpload={(f) => upload(f, 'nequi')}
              onRemove={() => setForm((f) => ({ ...f, nequiQrImageURL: '' }))}
              inputRef={nequiRef} />
            <QRUploader type="daviplata" title="Daviplata" url={form.daviplataQrImageURL} uploading={upD}
              onUpload={(f) => upload(f, 'daviplata')}
              onRemove={() => setForm((f) => ({ ...f, daviplataQrImageURL: '' }))}
              inputRef={daviRef} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            <Input
              label="Llave Nequi (teléfono)"
              value={form.nequiKey}
              onChange={(e) => setForm((f) => ({ ...f, nequiKey: e.target.value }))}
              placeholder="3001234567"
            />
            <Input
              label="Llave Daviplata (teléfono)"
              value={form.daviplataKey}
              onChange={(e) => setForm((f) => ({ ...f, daviplataKey: e.target.value }))}
              placeholder="3001234567"
            />
          </div>
          <p className="font-body text-[11px] text-salvaje-gray mt-2">
            La llave es el número con el que el usuario te puede transferir desde su app, además de escanear el QR.
          </p>
        </CardBody>
      </Card>

      {/* Bank */}
      <Card>
        <CardBody className="py-5">
          <div className="flex items-center gap-2 mb-3">
            <Building2 size={18} className="text-salvaje-orange" />
            <p className="font-display text-base uppercase text-salvaje-dark">Datos para transferencia</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Banco" value={form.bankName} onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))} placeholder="Bancolombia" />
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-salvaje-gray font-body">Tipo</label>
              <select value={form.accountType} onChange={(e) => setForm((f) => ({ ...f, accountType: e.target.value }))} className="px-3 py-2.5 rounded-xl border border-salvaje-cream font-body text-sm">
                <option value="ahorros">Ahorros</option>
                <option value="corriente">Corriente</option>
              </select>
            </div>
            <Input label="Número de cuenta" value={form.accountNumber} onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value }))} />
            <Input label="Titular" value={form.accountHolder} onChange={(e) => setForm((f) => ({ ...f, accountHolder: e.target.value }))} />
            <Input label="NIT (opcional)" value={form.nit} onChange={(e) => setForm((f) => ({ ...f, nit: e.target.value }))} />
          </div>
        </CardBody>
      </Card>

      <Card className="opacity-60">
        <CardBody className="py-4 flex items-center gap-3">
          <CreditCard size={20} className="text-salvaje-gray" />
          <div>
            <p className="font-display text-base uppercase text-salvaje-dark">Pasarela (Wompi / Mercado Pago)</p>
            <p className="font-body text-xs text-salvaje-gray">Pago con tarjeta · próximamente</p>
          </div>
        </CardBody>
      </Card>

      <Button className="w-full" size="lg" loading={saving} onClick={handleSave}>
        <Save size={16} /> Guardar métodos de pago
      </Button>
    </div>
  )
}

function QRUploader({ type, title, url, uploading, onUpload, onRemove, inputRef }) {
  return (
    <div className="border-2 border-dashed border-salvaje-cream rounded-2xl p-3 text-center">
      <div className="flex items-center justify-center gap-2 mb-2">
        <Smartphone size={14} className="text-salvaje-orange" />
        <p className="font-display text-base uppercase text-salvaje-dark">{title}</p>
      </div>
      {url ? (
        <div className="relative">
          <img src={url} alt={`QR ${title}`} className="mx-auto w-32 h-32 object-contain rounded-xl bg-white p-2 border border-salvaje-cream" />
          <button onClick={onRemove} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-salvaje-danger text-white flex items-center justify-center"><X size={12} /></button>
        </div>
      ) : (
        <div className="py-4">
          <Image size={32} className="text-salvaje-cream mx-auto mb-2" />
          <p className="font-body text-xs text-salvaje-gray">Sin QR</p>
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} className="hidden" />
      <Button size="sm" variant="ghost" loading={uploading} onClick={() => inputRef.current?.click()} className="mt-2">
        <Upload size={12} /> {url ? 'Cambiar' : 'Subir QR'}
      </Button>
    </div>
  )
}
