const { Router } = require('express');
const { requireAuth, requireRole } = require('../../middleware/auth');
const { validateBody } = require('../../middleware/validate');
const { createVisitSchema } = require('./visits.schema');
const controller = require('./visits.controller');

const router = Router();
router.use(requireAuth);

router.post('/:appointmentId', requireRole('DOCTOR'), validateBody(createVisitSchema), controller.create);
router.get('/:appointmentId', controller.getOne);

module.exports = router;
