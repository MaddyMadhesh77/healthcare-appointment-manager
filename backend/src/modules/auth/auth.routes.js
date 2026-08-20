const { Router } = require('express');
const { validateBody } = require('../../middleware/validate');
const { registerSchema, loginSchema } = require('./auth.schema');
const controller = require('./auth.controller');

const router = Router();

router.post('/register', validateBody(registerSchema), controller.register);
router.post('/login', validateBody(loginSchema), controller.login);

module.exports = router;
