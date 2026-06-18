import { useState, useEffect, useRef } from 'react'
import { Upload, Trash2, Play, Video } from 'lucide-react'
import toast from 'react-hot-toast'
import { AppShell } from '../../components/layout/AppShell'
import { Card, CardBody } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useAuth } from '../../hooks/useAuth'
import { getVideos, uploadVideo, deleteVideo } from '../../services/videos.service'

const CATEGORIES = [
  { value: 'recomendacion', label: 'Tips / Recomendación' },
  { value: 'ejercicio_casa', label: 'Ejercicios en Casa' },
  { value: 'tecnica', label: 'Técnica' },
  { value: 'nutricion', label: 'Nutrición' },
  { value: 'general', label: 'General' },
]

export function CoachVideos() {
  const { user, profile } = useAuth()
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
        authorName: profile?.displayName || 'Coach',
        authorRole: 'coach',
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

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este video?')) return
    try {
      await deleteVideo(id)
      toast.success('Video eliminado')
      load()
    } catch {
      toast.error('No pudimos eliminar')
    }
  }

  // Only show videos from this coach
  const myVideos = videos.filter((v) => v.authorId === user?.uid)

  return (
    <AppShell title="Videos">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-8">
        <div className="mb-6 flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-display text-3xl lg:text-4xl uppercase text-salvaje-dark leading-none">Mis Videos</h1>
            <p className="font-body text-sm text-salvaje-gray mt-1">Sube videos cortos de recomendación para los salvajes</p>
          </div>
          {myVideos.length > 0 && (
            <span className="font-mono text-xs text-salvaje-gray uppercase tracking-widest">
              {myVideos.length} video{myVideos.length === 1 ? '' : 's'} publicado{myVideos.length === 1 ? '' : 's'}
            </span>
          )}
        </div>

        {/* On desktop the upload form sticks to the left (1/3) and videos spread on the right (2/3, multi-column).
            On mobile/tablet they stack as before. */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
          {/* Upload form — sticky on desktop so it stays visible while scrolling videos */}
          <Card className="lg:sticky lg:top-4">
            <CardBody className="space-y-3">
              <p className="font-display text-base uppercase text-salvaje-dark">Subir video</p>
              <div
                className="border-2 border-dashed border-salvaje-cream rounded-xl p-5 text-center cursor-pointer hover:border-salvaje-orange transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                {selectedFile ? (
                  <div>
                    <Video size={20} className="text-salvaje-orange mx-auto mb-1" />
                    <p className="font-body text-xs text-salvaje-dark">{selectedFile.name}</p>
                  </div>
                ) : (
                  <div>
                    <Upload size={20} className="text-salvaje-gray mx-auto mb-1" />
                    <p className="font-body text-sm text-salvaje-gray">Toca para seleccionar</p>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
              <Input label="Título" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Ej: Técnica de sentadilla" />
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold uppercase tracking-wide text-salvaje-gray font-body">Descripción (opcional)</label>
                <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} placeholder="¿De qué trata el video?" className="w-full px-3 py-2 rounded-xl border border-salvaje-cream bg-white font-body text-sm resize-none focus:outline-none focus:border-salvaje-orange" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold uppercase tracking-wide text-salvaje-gray font-body">Categoría</label>
                <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl border border-salvaje-cream bg-white font-body text-sm focus:outline-none focus:border-salvaje-orange">
                  {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <Button className="w-full" loading={uploading} onClick={handleUpload}>
                <Upload size={14} /> Subir
              </Button>
            </CardBody>
          </Card>

          {/* My videos list — takes the remaining 2/3 on desktop with an internal 1→2 col grid */}
          <div className="lg:col-span-2 space-y-3">
            <p className="font-display text-xl uppercase text-salvaje-dark">Mis videos publicados</p>
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[1,2,3,4].map((i) => <div key={i} className="h-24 bg-white rounded-xl animate-pulse" />)}
              </div>
            ) : myVideos.length === 0 ? (
              <Card>
                <CardBody className="text-center py-10">
                  <Video size={32} className="text-salvaje-cream mx-auto mb-2" />
                  <p className="font-body text-sm text-salvaje-gray">Aún no tienes videos publicados</p>
                  <p className="font-body text-xs text-salvaje-gray mt-1">Sube el primero usando el formulario de la izquierda.</p>
                </CardBody>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {myVideos.map((v) => (
                  <Card key={v.id} hover>
                    <CardBody className="py-3 flex items-center gap-3">
                      <div className="w-12 h-12 bg-salvaje-orange/10 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Play size={16} className="text-salvaje-orange ml-0.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-body text-sm font-semibold text-salvaje-dark truncate">{v.title}</p>
                        <p className="font-mono text-[10px] text-salvaje-gray truncate">{CATEGORIES.find((c) => c.value === v.category)?.label || v.category}</p>
                      </div>
                      <button onClick={() => handleDelete(v.id)} className="p-2 rounded-lg text-salvaje-danger hover:bg-salvaje-danger/10 transition-colors flex-shrink-0">
                        <Trash2 size={14} />
                      </button>
                    </CardBody>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
