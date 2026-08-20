const { Router } = require('express');
const { requireAuth } = require('../../middleware/auth');
const controller = require('./calendar.controller');

const router = Router();

// The callback is a plain browser redirect from Google — no Bearer header —
// so it's the only route in this module that isn't behind requireAuth.
router.get('/oauth/callback', controller.callback);

router.use(requireAuth);
router.get('/oauth/url', controller.getAuthUrl);
router.get('/status', controller.status);
router.delete('/disconnect', controller.disconnect);

module.exports = router;
