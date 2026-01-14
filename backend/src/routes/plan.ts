import express from 'express';
import { body } from 'express-validator';

const router = express.Router();

// GET /api/plans - Get all available subscription plans
router.get('/', async (req, res) => {
  // TODO: Implement get all plans
  res.json({ message: 'Get all plans - Coming soon' });
});

// GET /api/plans/current - Get current user's plan
router.get('/current', async (req, res) => {
  // TODO: Implement get current user plan
  res.json({ message: 'Get current user plan - Coming soon' });
});

// POST /api/plans/subscribe - Subscribe to a plan
router.post('/subscribe', [
  body('planId').isUUID().withMessage('Valid plan ID is required'),
  body('paymentMethodId').optional().trim().notEmpty().withMessage('Payment method ID required for paid plans')
], async (req, res) => {
  // TODO: Implement plan subscription
  res.json({ message: 'Subscribe to plan - Coming soon' });
});

// PUT /api/plans/change - Change subscription plan
router.put('/change', [
  body('planId').isUUID().withMessage('Valid plan ID is required')
], async (req, res) => {
  // TODO: Implement plan change
  res.json({ message: 'Change subscription plan - Coming soon' });
});

// DELETE /api/plans/cancel - Cancel subscription
router.delete('/cancel', async (req, res) => {
  // TODO: Implement subscription cancellation
  res.json({ message: 'Cancel subscription - Coming soon' });
});

// GET /api/plans/usage - Get current usage statistics
router.get('/usage', async (req, res) => {
  // TODO: Implement get usage statistics
  res.json({ message: 'Get usage statistics - Coming soon' });
});

// POST /api/plans/webhook - Stripe webhook handler
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  // TODO: Implement Stripe webhook handler
  res.json({ message: 'Stripe webhook handler - Coming soon' });
});

export default router;