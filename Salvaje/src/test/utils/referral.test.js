/**
 * V6 Ajuste 14 / 31 — Test the 30% monthly cap on referral discount.
 * Pure function; no Firestore mocking required.
 */
import { describe, it, expect } from 'vitest'
import { calculateReferralDiscountPercent } from '../../services/referrals.service'

describe('calculateReferralDiscountPercent', () => {
  it('returns 0 with zero referrals', () => {
    expect(calculateReferralDiscountPercent(0)).toBe(0)
  })
  it('returns 10 for 1 paid referral', () => {
    expect(calculateReferralDiscountPercent(1)).toBe(10)
  })
  it('returns 20 for 2 paid referrals', () => {
    expect(calculateReferralDiscountPercent(2)).toBe(20)
  })
  it('caps at 30 for 3 paid referrals', () => {
    expect(calculateReferralDiscountPercent(3)).toBe(30)
  })
  it('still caps at 30 for many paid referrals', () => {
    expect(calculateReferralDiscountPercent(10)).toBe(30)
    expect(calculateReferralDiscountPercent(99)).toBe(30)
  })
  it('handles non-numeric input gracefully', () => {
    expect(calculateReferralDiscountPercent(null)).toBe(0)
    expect(calculateReferralDiscountPercent(undefined)).toBe(0)
    expect(calculateReferralDiscountPercent(-5)).toBe(0)
    expect(calculateReferralDiscountPercent('abc')).toBe(0)
  })
})
