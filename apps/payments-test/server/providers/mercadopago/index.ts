import { Hono } from 'hono';
import { createPayment } from './payment.ts';
import { createPreference } from './preference.ts';
import { paymentStatus } from './status.ts';
import { receiveWebhook } from './webhook.ts';

export { configured } from './client.ts';
export { verifyMercadoPago } from './webhook.ts';

/** One file per flow: add a Mercado Pago product here, not in a shared blob. */
export const mercadopagoRoutes = new Hono()
  .post('/preference', createPreference) // Checkout Pro
  .post('/payment', createPayment) // Payment Brick
  .get('/status', paymentStatus)
  .post('/webhook', receiveWebhook);
