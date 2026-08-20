const { Router } = require('express');
const { requireAuth, requireRole } = require('../../middleware/auth');
const { validateBody, validateQuery } = require('../../middleware/validate');
const { slotsQuerySchema, holdSchema, confirmSchema } = require('./appointments.schema');
const controller = require('./appointments.controller');

const router = Router();
router.use(requireAuth);

router.get('/slots', validateQuery(slotsQuerySchema), controller.getSlots);
router.post('/hold', requireRole('PATIENT'), validateBody(holdSchema), controller.hold);
router.post('/:id/confirm', requireRole('PATIENT'), validateBody(confirmSchema), controller.confirm);
router.post('/:id/cancel', requireRole('PATIENT', 'ADMIN'), controller.cancel);
router.get('/mine', requireRole('PATIENT'), controller.mine);
router.get('/doctor/mine', requireRole('DOCTOR'), controller.forDoctor);

module.exports = router;
