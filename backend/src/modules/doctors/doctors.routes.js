const { Router } = require('express');
const { requireAuth, requireRole } = require('../../middleware/auth');
const { validateBody } = require('../../middleware/validate');
const { createDoctorSchema, updateDoctorSchema, leaveSchema } = require('./doctors.schema');
const controller = require('./doctors.controller');

// Mounted at /api/admin/doctors — full management, admin only.
const adminRouter = Router();
adminRouter.use(requireAuth, requireRole('ADMIN'));
adminRouter.post('/', validateBody(createDoctorSchema), controller.create);
adminRouter.get('/', controller.list);
adminRouter.get('/:id', controller.getOne);
adminRouter.patch('/:id', validateBody(updateDoctorSchema), controller.update);
adminRouter.get('/:id/leave', controller.listLeaves);
adminRouter.post('/:id/leave', validateBody(leaveSchema), controller.addLeave);
adminRouter.delete('/:id/leave/:leaveId', controller.removeLeave);

// Mounted at /api/doctors — read-only search for any authenticated user.
const publicRouter = Router();
publicRouter.use(requireAuth);
publicRouter.get('/', controller.list);
publicRouter.get('/:id', controller.getOne);

module.exports = { adminRouter, publicRouter };
