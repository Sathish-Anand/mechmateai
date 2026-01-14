import express from 'express';
import { body } from 'express-validator';

const router = express.Router();

// GET /api/logbook - Get logbook entries for user
router.get('/', async (req, res) => {
  // TODO: Implement get logbook entries
  res.json({ message: 'Get logbook entries - Coming soon' });
});

// GET /api/logbook/vehicle/:vehicleId - Get logbook entries for specific vehicle
router.get('/vehicle/:vehicleId', async (req, res) => {
  // TODO: Implement get vehicle logbook entries
  res.json({ message: 'Get vehicle logbook entries - Coming soon' });
});

// POST /api/logbook - Add new logbook entry
router.post('/', [
  body('vehicleId').isUUID().withMessage('Valid vehicle ID is required'),
  body('date').isISO8601().withMessage('Please provide a valid date'),
  body('serviceType').isIn(['MAINTENANCE', 'REPAIR', 'INSPECTION', 'OTHER']).withMessage('Invalid service type'),
  body('workDone').trim().isLength({ min: 5 }).withMessage('Work done description must be at least 5 characters'),
  body('cost').optional().isDecimal({ decimal_digits: '0,2' }).withMessage('Cost must be a valid amount'),
  body('vendor').optional().trim().isLength({ max: 100 }).withMessage('Vendor name too long'),
  body('odometer').optional().isInt({ min: 0 }).withMessage('Odometer must be a positive number')
], async (req, res) => {
  // TODO: Implement add logbook entry
  res.json({ message: 'Add logbook entry - Coming soon' });
});

// PUT /api/logbook/:id - Update logbook entry
router.put('/:id', [
  body('date').optional().isISO8601().withMessage('Please provide a valid date'),
  body('serviceType').optional().isIn(['MAINTENANCE', 'REPAIR', 'INSPECTION', 'OTHER']).withMessage('Invalid service type'),
  body('workDone').optional().trim().isLength({ min: 5 }).withMessage('Work done description must be at least 5 characters'),
  body('cost').optional().isDecimal({ decimal_digits: '0,2' }).withMessage('Cost must be a valid amount'),
  body('vendor').optional().trim().isLength({ max: 100 }).withMessage('Vendor name too long'),
  body('odometer').optional().isInt({ min: 0 }).withMessage('Odometer must be a positive number')
], async (req, res) => {
  // TODO: Implement update logbook entry
  res.json({ message: 'Update logbook entry - Coming soon' });
});

// DELETE /api/logbook/:id - Delete logbook entry
router.delete('/:id', async (req, res) => {
  // TODO: Implement delete logbook entry
  res.json({ message: 'Delete logbook entry - Coming soon' });
});

// GET /api/logbook/:id - Get specific logbook entry
router.get('/:id', async (req, res) => {
  // TODO: Implement get logbook entry details
  res.json({ message: 'Get logbook entry details - Coming soon' });
});

// POST /api/logbook/:id/upload-receipt - Upload receipt image
router.post('/:id/upload-receipt', async (req, res) => {
  // TODO: Implement receipt image upload
  res.json({ message: 'Upload receipt - Coming soon' });
});

export default router;