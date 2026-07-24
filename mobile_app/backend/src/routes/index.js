const express = require('express');
const healthRoutes = require('./health');
const authRoutes = require('./auth');
const usersRoutes = require('./users');
const groupsRoutes = require('./groups');
const modulesRoutes = require('./modules');
const roomsRoutes = require('./rooms');
const sessionsRoutes = require('./sessions');
const attendanceRoutes = require('./attendance');
const analyticsRoutes = require('./analytics');
const dashboardsRoutes = require('./dashboards');

const router = express.Router();

router.use(healthRoutes);
router.use(authRoutes);
router.use(usersRoutes);
router.use(groupsRoutes);
router.use(modulesRoutes);
router.use(roomsRoutes);
router.use(sessionsRoutes);
router.use(attendanceRoutes);
router.use(analyticsRoutes);
router.use(dashboardsRoutes);

module.exports = router;
