import { useState, useEffect, useRef } from 'react'
import { Upload, Trash2, Play, Video } from 'lucide-react'
import toast from 'react-hot-toast'
import { AdminShell } from '../../components/layout/AdminShell'
import { Card, CardBody } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useAuth } from '../../hooks/useAuth'
import { getVideos, uploadVideo, deleteVideo, seedDemoVideos } from '../../services/videos.service'

const CATEGORIES = [
  { value: 'recomendacion', label: 'Tips / Recomendación' },
  { value: 'ejercicio_casa', label: 'Ejercicios en Casa' },
  { value: 'tecnica', label: 'Técnica' },
  { value: 'nutricion', label: 'Nutrición' },
  { value: 'general', label: 'General' },
]

export function AdminVideos() {
  const { user, profile, role } = useAuth()
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', category: 'general' })
  const [selectedFile, setSelectedFile] = useState(null)
  const fileRef = useRef(null)

  const load = () => {
    setLoading(true)
    getVideos().then(setVideos).finally(() => setLoading(false))
  }

  useEffect(load, [])

  const handleUpload = async () => {
    if (!selectedFile) { toast.error('Selecciona un video'); return }
    if (!form.title.trim()) { toast.error('Escribe un título'); return }
    setUploading(true)
    try {
      await uploadVideo(selectedFile, {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        authorId: user.uid,
        authorName: profile?.displayName || 'Admin',
        authorRole: role,
      })
      toast.success('Video subido')
      setForm({ title: '', description: '', category: 'general' })
      setSelectedFile(null)
      if (fileRef.current) fileRef.current.value = ''
      load()
    } catch (e) {
      toast.error(e.message || 'No pudimos subir el video')
    }
    setUploading(false)
  }

  const [seeding, setSeeding] = useState(false)
  const handleSeedDemo = async () => {
    if (!confirm('Cargar 4 videos de ejemplo para ver cómo se ve la sección?')) return
    setSeeding(true)
    try {
      await seedDemoVideos()
      toast.success('Videos de ejemplo cargados')
      load()
    } catch { toast.error('Error cargando demos') }
    setSeeding(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este video?')) return
    try {
      await deleteVideo(id)
      toast.success('Video eliminado')
      load()
    } catch {
      toast.error('No pudimos eliminar el video')
    }
  }

  return (
    <AdminShell title="Videos de Recomendación">
      <div className="px-4 xl:px-6 pt-4 pb-8 space-y-6">
        <div>
          <h1 className="font-display text-4xl uppercase text-salvaje-dark">Videos</h1>
          <p className="font-body text-sm text-salvaje-gray">Sube videos cortos de recomendación y ejercicios en casa</p>
        </div>

        {/* Upload form */}
        <Card>
          <CardBody className="space-y-4">
            <p className="font-display text-base uppercase text-salvaje-dark">Subir nuevo video</p>

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-salvaje-gray font-body block mb-1">
                Archivo de video
              </label>
              <div
                className="border-2 border-dashed border-salvaje-cream rounded-xl p-6 text-center cursor-pointer hover:border-salvaje-orange transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                {selectedFile ? (
                  <div>
                    <Video size={24} className="text-salvaje-orange mx-auto mb-1" />
                    <p className="font-body text-sm text-salvaje-dark">{selectedFile.name}</p>
                    <p className="font-mono text-[10px] text-salvaje-gray">
                      {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                  </div>
                ) : (
                  <div>
                    <Upload size={24} className="text-salvaje-gray mx-auto mb-2" />
                    <p className="font-body text-sm text-salvaje-gray">Toca para seleccionar video</p>
                    <p className="font-mono text-[10px] text-salvaje-gray mt-0.5">MP4, MOV, WebM · máx 100MB</p>
                  </div>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
            </div>

            <Input
              label="Título"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Ej: 5 ejercicios para piernas en casa"
            />

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-salvaje-gray font-body">
                Descripción (opcional)
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Breve descripción del video..."
                rows={2}
                className="w-full px-3 py-2 rounded-xl border border-salvaje-cream bg-white font-body text-sm text-salvaje-dark resize-none focus:outline-none focus:border-salvaje-orange"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-salvaje-gray font-body">
                Categoría
              </label>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-salvaje-cream bg-white font-body text-sm text-salvaje-dark focus:outline-none focus:border-salvaje-orange"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            <Button className="w-full" loading={uploading} onClick={handleUpload}>
              <Upload size={16} /> Subir video
            </Button>
          </CardBody>
        </Card>

        {/* Video list */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="font-display text-xl uppercase text-salvaje-dark">Videos publicados</p>
            <button
              onClick={handleSeedDemo}
              disabled={seeding}
              className="text-xs font-body text-salvaje-gray hover:text-salvaje-orange underline underline-offset-2 transition-colors disabled:opacity-50"
            >
              {seeding ? 'Cargando...' : '+ Cargar ejemplos'}
            </button>
          </div>
          {loading ? (
            <div className="space-y-2">{[1,2,3].map((i) => <div key={i} className="h-20 bg-white rounded-xl animate-pulse" />)}</div>
          ) : videos.length === 0 ? (
            <Card>
              <CardBody className="text-center py-8">
                <Video size={28} className="text-salvaje-cream mx-auto mb-2" />
                <p className="font-body text-sm text-salvaje-gray">No hay videos publicados todavía</p>
              </CardBody>
            </Card>
          ) : (
            <div className="space-y-2">
              {videos.map((v) => (
                <Card key={v.id}>
                  <CardBody className="py-3 flex items-center gap-3">
                    <div className="w-12 h-12 bg-salvaje-brown/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Play size={18} className="text-salvaje-orange ml-0.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-body text-sm font-semibold text-salvaje-dark truncate">{v.title}</p>
                      <p className="font-mono text-[10px] text-salvaje-gray">
                        {v.authorName} · {CATEGORIES.find((c) => c.value === v.category)?.label || v.category}
                      </p>
                      {v.description && (
                        <p className="font-body text-xs text-salvaje-gray mt-0.5 line-clamp-1">{v.description}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(v.id)}
                      className="p-2 rounded-lg text-salvaje-danger hover:bg-salvaje-danger/10 transition-colors flex-shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  )
}
