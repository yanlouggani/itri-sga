const express = require('express');
const { prisma } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/analytics/attendance-by-group', requireAuth, async (req, res) => {
  const attendance = await prisma.attendance.findMany({
    include: { session: { include: { group: true } } },
  });
  const data = {};
  for (const rec of attendance) {
    if (rec.status === 'ABSENT' || rec.status === 'LATE') {
      const name = rec.session.group ? rec.session.group.name : 'Inconnu';
      data[name] = (data[name] || 0) + 1;
    }
  }
  res.json(data);
});

router.get('/analytics/attendance-by-module', requireAuth, async (req, res) => {
  const attendance = await prisma.attendance.findMany({
    include: { session: { include: { module: true } } },
  });
  const data = {};
  for (const rec of attendance) {
    if (rec.status === 'ABSENT' || rec.status === 'LATE') {
      const name = rec.session.module ? rec.session.module.name : 'Inconnu';
      data[name] = (data[name] || 0) + 1;
    }
  }
  res.json(data);
});

router.get('/analytics/busiest-rooms', requireAuth, async (req, res) => {
  const sessions = await prisma.session.findMany({ include: { room: true } });
  const data = {};
  for (const session of sessions) {
    const name = session.room ? session.room.name : 'Inconnu';
    data[name] = (data[name] || 0) + 1;
  }
  res.json(data);
});

router.get('/analytics/attendance-trend', requireAuth, async (req, res) => {
  const attendance = await prisma.attendance.findMany({
    include: { session: true },
  });
  const data = {};
  for (const rec of attendance) {
    if (rec.status !== 'ABSENT' && rec.status !== 'LATE') continue;
    const date = rec.session.sessionDate;
    const weekStart = new Date(date);
    const day = weekStart.getDay() || 7;
    weekStart.setDate(weekStart.getDate() - (day - 1));
    const key = `${weekStart.getFullYear()}-W${String(Math.ceil((weekStart.getDate()) / 7)).padStart(2, '0')}`;
    data[key] = (data[key] || 0) + 1;
  }
  res.json(data);
});

module.exports = router;
