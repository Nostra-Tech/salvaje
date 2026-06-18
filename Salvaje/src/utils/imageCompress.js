/**
 * Resize/compress an image File before upload.
 *
 * Phone receipts are usually 5-10 MB; Storage upload of those over slow mobile
 * is the main reason payment validation feels sluggish. This shrinks them to
 * ~1280px wide JPEG at quality 0.85 — under 500 KB in most cases — while still
 * being legible for an admin reviewing the receipt.
 *
 * Falls back to the original file if anything goes wrong (canvas/bitmap not
 * supported, OOM on huge images, etc.) so the upload still succeeds.
 */
export async function compressImage(file, { maxWidth = 1280, quality = 0.85 } = {}) {
  if (!file || !file.type?.startsWith('image/')) return file
  if (file.size < 300 * 1024) return file // already small, skip work

  try {
    const bitmap = await createImageBitmap(file)
    const ratio = Math.min(1, maxWidth / bitmap.width)
    const w = Math.max(1, Math.round(bitmap.width * ratio))
    const h = Math.max(1, Math.round(bitmap.height * ratio))

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, w, h)

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', quality)
    )
    if (!blob) return file

    // If compression somehow ended up bigger than the original (rare, e.g. tiny PNGs), keep original.
    if (blob.size >= file.size) return file

    // Wrap as a File for parity with original.
    const cleanName = (file.name || 'receipt').replace(/\.[^.]+$/, '') + '.jpg'
    return new File([blob], cleanName, { type: 'image/jpeg', lastModified: Date.now() })
  } catch (e) {
    console.warn('compressImage failed, using original:', e)
    return file
  }
}
