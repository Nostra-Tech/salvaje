import {
  collection, addDoc, getDocs, updateDoc, deleteDoc,
  doc, query, orderBy, serverTimestamp, where,
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from './firebase'
import { notifyAllAdmins, notifyAllUsers } from './admin-notifications.service'

export async function getVideos(category = null) {
  const base = collection(db, 'recommendation_videos')
  const q = category ? query(base, where('category', '==', category)) : query(base)
  const snaps = await getDocs(q)
  const docs = snaps.docs.map((d) => ({ id: d.id, ...d.data() }))
  // Sort client-side: docs with createdAt first (newest), then the rest
  return docs.sort((a, b) => {
    const ta = a.createdAt?.toMillis?.() ?? a.createdAt ?? 0
    const tb = b.createdAt?.toMillis?.() ?? b.createdAt ?? 0
    return tb - ta
  })
}

export async function uploadVideo(file, { title, description, category, authorId, authorName, authorRole }) {
  const ext = file.name.split('.').pop()
  const storageRef = ref(storage, `videos/${Date.now()}.${ext}`)
  await uploadBytes(storageRef, file)
  const url = await getDownloadURL(storageRef)
  const docRef = await addDoc(collection(db, 'recommendation_videos'), {
    title,
    description: description || '',
    category: category || 'general',
    videoURL: url,
    thumbnailURL: null,
    authorId,
    authorName,
    authorRole,
    likes: 0,
    views: 0,
    createdAt: serverTimestamp(),
  })
  const categoryLabel = {
    recomendacion: 'Tips', ejercicio_casa: 'En Casa',
    tecnica: 'Técnica', nutricion: 'Nutrición', general: 'General',
  }[category] || category || 'General'

  // Notify admins
  notifyAllAdmins({
    type: 'video_uploaded',
    title: 'Nuevo video publicado',
    body: `${authorName} subió "${title}" (${categoryLabel}). Ya está visible para los usuarios.`,
    relatedId: docRef.id,
    relatedCollection: 'recommendation_videos',
    actionType: 'view',
    actionUrl: '/admin/videos',
    senderRole: authorRole,
    senderName: authorName,
  }).catch(() => {})

  // Notify all users
  notifyAllUsers({
    type: 'video_new',
    title: '📹 Nuevo video disponible',
    body: `${authorName} publicó "${title}" — ${categoryLabel}. ¡Dale un vistazo!`,
    relatedId: docRef.id,
    relatedCollection: 'recommendation_videos',
    actionType: 'view',
    actionUrl: '/app/videos',
    senderRole: authorRole,
    senderName: authorName,
  }).catch(() => {})

  return docRef.id
}

export async function deleteVideo(videoId) {
  await deleteDoc(doc(db, 'recommendation_videos', videoId))
}

export async function incrementViews(videoId) {
  const { increment } = await import('firebase/firestore')
  await updateDoc(doc(db, 'recommendation_videos', videoId), { views: increment(1) })
}

const DEMO_VIDEOS = [
  {
    title: 'Calentamiento Dinámico',
    description: '5 minutos de activación antes de tu sesión. Movilidad articular completa para evitar lesiones.',
    category: 'tecnica',
    videoURL: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    authorName: 'Coach SALVAJE',
    authorRole: 'coach',
  },
  {
    title: 'Sentadilla Perfecta',
    description: 'Aprende la técnica correcta paso a paso. Rodillas, espalda y postura.',
    category: 'tecnica',
    videoURL: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    authorName: 'Coach SALVAJE',
    authorRole: 'coach',
  },
  {
    title: 'Rutina en Casa — Sin Equipo',
    description: '10 ejercicios funcionales de alta intensidad que puedes hacer en tu sala.',
    category: 'ejercicio_casa',
    videoURL: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4',
    authorName: 'Coach SALVAJE',
    authorRole: 'coach',
  },
  {
    title: 'Nutrición Post-Entreno',
    description: 'Qué comer en los 30 min después de tu clase para maximizar la recuperación.',
    category: 'nutricion',
    videoURL: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
    authorName: 'Admin SALVAJE',
    authorRole: 'admin',
  },
]

export async function seedDemoVideos() {
  await Promise.all(
    DEMO_VIDEOS.map((d) =>
      addDoc(collection(db, 'recommendation_videos'), {
        ...d,
        authorId: 'demo',
        thumbnailURL: null,
        likes: 0,
        views: 0,
        createdAt: serverTimestamp(),
      })
    )
  )
}
