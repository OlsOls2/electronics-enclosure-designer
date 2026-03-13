import * as admin from 'firebase-admin'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import Stripe from 'stripe'

admin.initializeApp()

// Read Stripe secret key from Firebase Functions config or env var
// e.g. firebase functions:config:set stripe.secret="sk_test_..."
// Using process.env.STRIPE_SECRET_KEY for modern v2 functions, or fallback to dummy for local tests.
const stripeSecret = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder'
const stripe = new Stripe(stripeSecret, {
  apiVersion: '2023-10-16', // Update to match your Stripe account's default API version if needed
})

export const createCheckoutSession = onCall({ region: 'us-central1' }, async (request) => {
  try {
    const { config, quantity } = request.data

    if (!config) {
      throw new HttpsError('invalid-argument', 'Missing enclosure config.')
    }

    const qty = parseInt(quantity as string, 10)
    if (isNaN(qty) || qty < 1 || qty > 100) {
      throw new HttpsError('invalid-argument', 'Quantity must be between 1 and 100.')
    }

    // Pricing logic placeholder: £1.20 per cm³ of material volume.
    // Box outer volume = (W * H * D)
    // Box inner volume = (W - 2*wall) * (H - 2*wall) * (D - 2*wall)
    // Material volume = outer - inner (in mm³)
    const outerVolumeMm3 = config.width * config.height * config.depth
    const innerW = Math.max(0, config.width - 2 * config.wallThickness)
    const innerH = Math.max(0, config.height - 2 * config.wallThickness)
    const innerD = Math.max(0, config.depth - 2 * config.wallThickness)
    const innerVolumeMm3 = innerW * innerH * innerD

    const materialVolumeMm3 = outerVolumeMm3 - innerVolumeMm3
    const materialVolumeCm3 = materialVolumeMm3 / 1000

    // Price in pence (GBX)
    const unitPricePence = Math.max(500, Math.round(materialVolumeCm3 * 120)) // £5.00 minimum

    const origin = request.rawRequest.headers.origin || 'http://localhost:5173'

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      shipping_address_collection: {
        allowed_countries: ['US', 'CA', 'GB', 'AU', 'EU'], // Adjust as needed
      },
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: `Custom Enclosure: ${config.name || 'Untitled'}`,
              description: `${config.width}×${config.height}×${config.depth} mm, ${config.type} type, ${config.holes.length} holes.`,
            },
            unit_amount: unitPricePence,
          },
          quantity: qty,
        },
      ],
      mode: 'payment',
      success_url: `${origin}/#order-success`,
      cancel_url: `${origin}/`,
      metadata: {
        enclosureConfig: JSON.stringify(config), // Save the exact config for fulfillment
      },
    })

    return { url: session.url }
  } catch (error) {
    console.error('Stripe session creation failed:', error)
    if (error instanceof HttpsError) throw error
    throw new HttpsError('internal', 'Unable to create checkout session.')
  }
})
