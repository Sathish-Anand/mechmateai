import express from 'express';
import { body } from 'express-validator';

const router = express.Router();

// GET /api/vehicles - Get all vehicles for authenticated user
router.get('/', async (req, res) => {
  // TODO: Implement get user vehicles
  res.json({ message: 'Get user vehicles - Coming soon' });
});

// POST /api/vehicles - Add a new vehicle
router.post('/', [
  body('make').trim().notEmpty().withMessage('Make is required'),
  body('model').trim().notEmpty().withMessage('Model is required'),
  body('year').isInt({ min: 1900, max: 2030 }).withMessage('Please provide a valid year'),
  body('registration').trim().notEmpty().withMessage('Registration is required'),
  body('odometer').isInt({ min: 0 }).withMessage('Odometer must be a positive number')
], async (req, res) => {
  // TODO: Implement add vehicle
  res.json({ message: 'Add vehicle - Coming soon' });
});

// PUT /api/vehicles/:id - Update vehicle
router.put('/:id', [
  body('make').optional().trim().notEmpty().withMessage('Make cannot be empty'),
  body('model').optional().trim().notEmpty().withMessage('Model cannot be empty'),
  body('year').optional().isInt({ min: 1900, max: 2030 }).withMessage('Please provide a valid year'),
  body('registration').optional().trim().notEmpty().withMessage('Registration cannot be empty'),
  body('odometer').optional().isInt({ min: 0 }).withMessage('Odometer must be a positive number')
], async (req, res) => {
  // TODO: Implement update vehicle
  res.json({ message: 'Update vehicle - Coming soon' });
});

// DELETE /api/vehicles/:id - Delete vehicle
router.delete('/:id', async (req, res) => {
  // TODO: Implement delete vehicle
  res.json({ message: 'Delete vehicle - Coming soon' });
});

// PUT /api/vehicles/:id/set-default - Set vehicle as default
router.put('/:id/set-default', async (req, res) => {
  // TODO: Implement set default vehicle
  res.json({ message: 'Set default vehicle - Coming soon' });
});

// GET /api/vehicles/:id - Get single vehicle details
router.get('/:id', async (req, res) => {
  // TODO: Implement get vehicle details
  res.json({ message: 'Get vehicle details - Coming soon' });
});

export default router;