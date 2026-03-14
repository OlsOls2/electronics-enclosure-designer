import * as admin from 'firebase-admin'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import Stripe from 'stripe'
import {
  calculateMaterialVolumeCm3,
  calculateUnitPriceMinor,
  sanitizeCurrency,
  sanitizeQuantity,
} from './pricing'

admin.initializeApp()

type EnclosureType = 'plain' | 'lid' | 'flanged'
type HoleFace = 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom'

interface HoleInput {
  face: HoleFace
  radius: number
  x: number
  y: number
}

interface CheckoutConfig {
  name: string
  type: EnclosureType
  width: number
  height: number
  depth: number
  wallThickness: number
  holes: HoleInput[]
  premium: {
    advancedFastening: boolean
    waterproofSeal: boolean
  }
}

const VALID_TYPES: ReadonlySet<EnclosureType> = new Set(['plain', 'lid', 'flanged'])
const VALID_FACES: ReadonlySet<HoleFace> = new Set(['front', 'back', 'left', 'right', 'top', 'bottom'])

const DEFAULT_ORIGIN = process.env.CHECKOUT_DEFAULT_ORIGIN?.trim() || 'http://localhost:5177'
const allowedOrigins = new Set(
  (process.env.CHECKOUT_ALLOWED_ORIGINS || DEFAULT_ORIGIN)
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0),
)

let stripeClient: Stripe | null = null

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseFiniteNumber(value: unknown, field: string): number {
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numeric)) {
    throw new HttpsError('invalid-argument', `${field} must be a finite number.`)
  }
  return numeric
}

function parseBoundedNumber(value: unknown, field: string, min: number, max: number): number {
  const numeric = parseFiniteNumber(value, field)
  if (numeric < min || numeric > max) {
    throw new HttpsError('invalid-argument', `${field} must be between ${min} and ${max}.`)
  }
  return numeric
}

function parseHole(value: unknown, index: number): HoleInput {
  if (!isRecord(value)) {
    throw new HttpsError('invalid-argument', `Hole at index ${index} is invalid.`)
  }

  const face = value.face
  if (typeof face !== 'string' || !VALID_FACES.has(face as HoleFace)) {
    throw new HttpsError('invalid-argument', `Hole face at index ${index} is invalid.`)
  }

  return {
    face: face as HoleFace,
    radius: parseBoundedNumber(value.radius, `holes[${index}].radius`, 1, 120),
    x: parseFiniteNumber(value.x, `holes[${index}].x`),
    y: parseFiniteNumber(value.y, `holes[${index}].y`),
  }
}

function parseConfig(data: unknown): CheckoutConfig {
  if (!isRecord(data)) {
    throw new HttpsError('invalid-argument', 'Missing enclosure config.')
  }

  const type = data.type
  if (typeof type !== 'string' || !VALID_TYPES.has(type as EnclosureType)) {
    throw new HttpsError('invalid-argument', 'Invalid enclosure type.')
  }

  const rawHoles = Array.isArray(data.holes) ? data.holes : []
  const holes = rawHoles.slice(0, 250).map((hole, index) => parseHole(hole, index))

  const premium = isRecord(data.premium) ? data.premium : {}

  return {
    name: typeof data.name === 'string' ? data.name.trim().slice(0, 80) : 'Untitled',
    type: type as EnclosureType,
    width: parseBoundedNumber(data.width, 'width', 40, 240),
    height: parseBoundedNumber(data.height, 'height', 30, 180),
    depth: parseBoundedNumber(data.depth, 'depth', 40, 240),
    wallThickness: parseBoundedNumber(data.wallThickness, 'wallThickness', 1, 20),
    holes,
    premium: {
      advancedFastening: premium.advancedFastening === true,
      waterproofSeal: premium.waterproofSeal === true,
    },
  }
}

function resolveOrigin(requestOrigin: unknown): string {
  if (typeof requestOrigin !== 'string' || requestOrigin.trim().length === 0) {
    return DEFAULT_ORIGIN
  }

  let normalized: string
  try {
    normalized = new URL(requestOrigin).origin
  } catch {
    throw new HttpsError('permission-denied', 'Request origin is invalid.')
  }

  if (!allowedOrigins.has(normalized)) {
    throw new HttpsError('permission-denied', 'Request origin is not allowed.')
  }

  return normalized
}

function hasPaidClaim(authToken: unknown): boolean {
  if (!isRecord(authToken)) {
    return false
  }

  if (
    authToken.paid === true ||
    authToken.isPaid === true ||
    authToken.premium === true
  ) {
    return true
  }

  const plan = typeof authToken.plan === 'string' ? authToken.plan.toLowerCase() : ''
  const tier = typeof authToken.tier === 'string' ? authToken.tier.toLowerCase() : ''

  return ['paid', 'premium', 'pro', 'business', 'enterprise'].includes(plan)
    || ['paid', 'premium', 'pro', 'business', 'enterprise'].includes(tier)
}

function getStripeClient(): Stripe {
  if (stripeClient) {
    return stripeClient
  }

  const stripeSecret = process.env.STRIPE_SECRET_KEY
  if (!stripeSecret || stripeSecret.trim().length === 0) {
    throw new HttpsError('failed-precondition', 'Stripe is not configured on the server.')
  }

  stripeClient = new Stripe(stripeSecret, {
    apiVersion: '2024-04-10',
  })

  return stripeClient
}

export const createCheckoutSession = onCall({ region: 'us-central1' }, async (request) => {
  try {
    const payload = isRecord(request.data) ? request.data : {}
    const config = parseConfig(payload.config)
    const quantity = sanitizeQuantity(payload.quantity)
    const currency = sanitizeCurrency(payload.currency)

    if ((config.premium.advancedFastening || config.premium.waterproofSeal) && !hasPaidClaim(request.auth?.token)) {
      throw new HttpsError('permission-denied', 'Premium enclosure options require a paid account.')
    }

    const materialVolumeCm3 = calculateMaterialVolumeCm3(config)
    const unitAmountMinor = calculateUnitPriceMinor(materialVolumeCm3, currency)
    const origin = resolveOrigin(request.rawRequest.headers.origin)

    const stripe = getStripeClient()
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      shipping_address_collection: {
        allowed_countries: ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'NL', 'IE'],
      },
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: `Custom Enclosure: ${config.name || 'Untitled'}`,
              description: `${config.width}×${config.height}×${config.depth} mm, ${config.type} type, ${config.holes.length} holes.`,
            },
            unit_amount: unitAmountMinor,
          },
          quantity,
        },
      ],
      mode: 'payment',
      success_url: `${origin}/#order-success`,
      cancel_url: `${origin}/`,
      metadata: {
        enclosureName: config.name || 'Untitled',
        enclosureType: config.type,
        dimensions: `${config.width}x${config.height}x${config.depth}`,
        holes: String(config.holes.length),
        premium: config.premium.advancedFastening || config.premium.waterproofSeal ? 'true' : 'false',
      },
    })

    if (!session.url) {
      throw new HttpsError('internal', 'Checkout session did not return a URL.')
    }

    return { url: session.url }
  } catch (error) {
    console.error('Stripe session creation failed:', error)
    if (error instanceof HttpsError) {
      throw error
    }
    throw new HttpsError('internal', 'Unable to create checkout session.')
  }
})
