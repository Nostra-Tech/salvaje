/**
 * V6 Ajuste 31 — validateUserCanAttend (pure function).
 * Covers the V5 ticketera 60-day rule and the priority order:
 *   blocked > active membership > tiquetera (vigente) > free trial.
 */
import { describe, it, expect } from 'vitest'
import { validateUserCanAttend } from '../../services/attendance.service'

const future = (days) => new Date(Date.now() + days * 86400000)
const past = (days) => new Date(Date.now() - days * 86400000)
const ts = (d) => ({ toDate: () => d })

describe('validateUserCanAttend', () => {
  it('blocks blocked users immediately', () => {
    const r = validateUserCanAttend({ isBlocked: true, membershipIsActive: true })
    expect(r.canAttend).toBe(false)
    expect(r.reason).toMatch(/bloqueado/i)
  })

  it('allows users with active membership', () => {
    const r = validateUserCanAttend({
      membershipIsActive: true,
      membershipEndDate: ts(future(10)),
    })
    expect(r.canAttend).toBe(true)
    expect(r.consumeFromMembership).toBe(true)
  })

  it('allows users with tiquetera vigente', () => {
    const r = validateUserCanAttend({
      ticketeraBalance: 5,
      ticketeraExpDate: ts(future(20)),
    })
    expect(r.canAttend).toBe(true)
    expect(r.consumeFromTicketera).toBe(true)
  })

  it('blocks users with expired tiquetera even with tickets left', () => {
    const r = validateUserCanAttend({
      ticketeraBalance: 8,
      ticketeraExpDate: ts(past(5)),
    })
    expect(r.canAttend).toBe(false)
    expect(r.reason).toMatch(/vencio|venció|venció|60 d/i)
  })

  it('grants the free trial to first-timers', () => {
    const r = validateUserCanAttend({ hasUsedFreeTrial: false })
    expect(r.canAttend).toBe(true)
    expect(r.consumeFreeTrial).toBe(true)
  })

  it('blocks users without anything left', () => {
    const r = validateUserCanAttend({ hasUsedFreeTrial: true })
    expect(r.canAttend).toBe(false)
  })
})
