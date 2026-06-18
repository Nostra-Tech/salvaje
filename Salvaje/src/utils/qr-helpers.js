import { v4 as uuidv4 } from 'uuid'

export function generateTokenId() {
  return uuidv4()
}

export function buildQRValue(tokenId) {
  return tokenId
}

export function parseQRValue(raw) {
  return raw?.trim() || null
}

export function isTokenExpired(token) {
  if (!token?.expiresAt) return true
  const exp = token.expiresAt?.toDate ? token.expiresAt.toDate() : new Date(token.expiresAt)
  return exp < new Date()
}
