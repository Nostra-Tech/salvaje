import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Phone, Mail, Camera, Save, Trash2, ArrowLeft } from 'lucide-react'
import { Avatar } from '../components/Avatar'
import { AppInput } from '../components/AppInput'
import { FinalsBell } from '../components/FinalsBell'
import { toast } from '../components/Toast'
import { usePollaStore } from '../store/pollaStore'
import { updateProfile } from '../services/polla.service'

// Comprime una imagen a un cuadrado de máx 256px (JPEG) y devuelve un data URL.
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const MAX = 256
        const side = Math.min(img.width, img.height)
        const sx = (img.width - side) / 2
        const sy = (img.height - side) / 2
        const canvas = document.createElement('canvas')
        canvas.width = MAX
        canvas.height = MAX
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, sx, sy, side, side, 0, 0, MAX, MAX)
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      }
      img.onerror = reject
      img.src = reader.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function Profile() {
  const navigate = useNavigate()
  const user = usePollaStore((s) => s.user)
  const setUser = usePollaStore((s) => s.setUser)
  const fileRef = useRef(null)

  const [name, setName] = useState(user?.fullName || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [avatar, setAvatar] = useState(user?.avatar || '')
  const [saving, setSaving] = useState(false)

  const onPickFile = async (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (!f.type.startsWith('image/')) {
      toast.error('Selecciona un archivo de imagen.')
      return
    }
    if (f.size > 8 * 1024 * 1024) {
      toast.error('La imagen es muy grande (máx 8 MB).')
      return
    }
    try {
      const data = await compressImage(f)
      setAvatar(data)
    } catch (err) {
      console.error(err)
      toast.error('No se pudo procesar la imagen.')
    }
  }

  const handleSave = async () => {
    if (name.trim().length < 2) {
      toast.error('Escribe un nombre válido.')
      return
    }
    setSaving(true)
    try {
      await updateProfile(user.id, { fullName: name.trim(), phone: phone.trim(), avatar })
      setUser({ ...user, fullName: name.trim(), phone: phone.trim(), avatar })
      toast.success('Perfil actualizado.')
    } catch (err) {
      console.error(err)
      toast.error('No se pudo guardar el perfil.')
    } finally {
      setSaving(false)
    }
  }

  if (!user) return null

  return (
    <div className="mx-auto max-w-lg px-4 pb-28 pt-6">
      <div className="mb-4 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-sm text-salvaje-gray hover:text-salvaje-brown">
          <ArrowLeft size={16} /> Volver
        </button>

        {/* Campana de notificaciones */}
        <FinalsBell />
      </div>

      <div className="rounded-salvaje bg-salvaje-light p-6 shadow-salvaje">
        <h1 className="display text-3xl text-salvaje-brown">Mi perfil</h1>
        <p className="text-sm text-salvaje-gray">Edita tu nombre y tu foto de perfil.</p>

        {/* Foto */}
        <div className="mt-6 flex items-center gap-4">
          <div className="relative">
            <Avatar src={avatar} name={name} size={88} className="ring-4 ring-salvaje-orange/20" />
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-salvaje-orange text-white shadow-salvaje-md hover:bg-salvaje-fire"
              title="Cambiar foto"
            >
              <Camera size={16} />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickFile} />
          </div>
          <div className="text-sm text-salvaje-gray">
            <button onClick={() => fileRef.current?.click()} className="font-semibold text-salvaje-orange hover:text-salvaje-fire">
              Subir foto
            </button>
            {avatar && (
              <button
                onClick={() => setAvatar('')}
                className="ml-3 inline-flex items-center gap-1 font-semibold text-salvaje-danger hover:opacity-80"
              >
                <Trash2 size={14} /> Quitar
              </button>
            )}
            <div className="mt-1 text-xs text-salvaje-gray/70">JPG o PNG. Se recorta a un cuadrado.</div>
          </div>
        </div>

        {/* Datos */}
        <div className="mt-6 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-salvaje-gray">Nombre de usuario</label>
            <AppInput icon={<User size={18} />} value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-salvaje-gray">Celular</label>
            <AppInput icon={<Phone size={18} />} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Celular" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-salvaje-gray">Correo</label>
            <div className="relative">
              <Mail size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-salvaje-gray" />
              <input
                className="field cursor-not-allowed bg-salvaje-light-alt pl-11 text-salvaje-gray"
                value={user.email}
                disabled
                readOnly
              />
            </div>
            <div className="mt-1 text-xs text-salvaje-gray/70">El correo es tu identificador y no se puede cambiar.</div>
          </div>
        </div>

        <button onClick={handleSave} disabled={saving} className="btn-primary mt-6 w-full">
          <Save size={18} />
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  )
}
