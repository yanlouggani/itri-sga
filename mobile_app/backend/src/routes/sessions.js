const express = require('express');
const { prisma } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { serializeSession } = require('../utils/serialize');

const router = express.Router();

function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map((v) => parseInt(v, 10));
  return h * 60 + m;
}

function overlaps(startA, endA, startB, endB) {
  return timeToMinutes(startA) < timeToMinutes(endB) &&
    timeToMinutes(startB) < timeToMinutes(endA);
}

router.get('/sessions', requireAuth, async (req, res) => {
  const { date, professorId, groupId } = req.query;
  const where = {};
  if (date) {
    const day = new Date(`${date}T00:00:00.000Z`);
    const next = new Date(day.getTime() + 24 * 60 * 60 * 1000);
    where.sessionDate = { gte: day, lt: next };
  }
  if (professorId) where.professorId = professorId;
  if (groupId) where.groupId = groupId;

  const sessions = await prisma.session.findMany({
    where,
    include: { module: true, professor: true, group: true, room: true },
    orderBy: [{ sessionDate: 'asc' }, { startTime: 'asc' }],
  });
  res.json(sessions.map(serializeSession));
});

router.get('/sessions/:id', requireAuth, async (req, res) => {
  const session = await prisma.session.findUnique({
    where: { id: req.params.id },
    include: { module: true, professor: true, group: true, room: true },
  });
  if (!session) return res.status(404).json({ message: 'Session not found' });
  res.json(serializeSession(session));
});

router.post('/sessions', requireAuth, requireRole(['ADMIN']), async (req, res) => {
  const {
    moduleId,
    professorId,
    groupId,
    roomId,
    sessionDate,
    startTime,
    endTime,
    status,
  } = req.body || {};

  if (!moduleId || !professorId || !groupId || !roomId || !sessionDate || !startTime || !endTime) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const date = new Date(`${sessionDate}T00:00:00.000Z`);
  const next = new Date(date.getTime() + 24 * 60 * 60 * 1000);
  const existing = await prisma.session.findMany({
    where: { sessionDate: { gte: date, lt: next } },
  });

  const roomConflict = existing.find((s) =>
    s.roomId === roomId && overlaps(s.startTime, s.endTime, startTime, endTime)
  );
  if (roomConflict) {
    return res.status(409).json({ message: 'Room conflict' });
  }
  const profConflict = existing.find((s) =>
    s.professorId === professorId && overlaps(s.startTime, s.endTime, startTime, endTime)
  );
  if (profConflict) {
    return res.status(409).json({ message: 'Professor conflict' });
  }
  const groupConflict = existing.find((s) =>
    s.groupId === groupId && overlaps(s.startTime, s.endTime, startTime, endTime)
  );
  if (groupConflict) {
    return res.status(409).json({ message: 'Group conflict' });
  }

  const session = await prisma.session.create({
    data: {
      moduleId,
      professorId,
      groupId,
      roomId,
      sessionDate: date,
      startTime,
      endTime,
      status: status ? status.toUpperCase() : 'SCHEDULED',
    },
    include: { module: true, professor: true, group: true, room: true },
  });

  res.status(201).json(serializeSession(session));
});

router.patch('/sessions/:id', requireAuth, requireRole(['ADMIN', 'PROFESSOR']), async (req, res) => {
  const data = { ...req.body };
  if (data.status) data.status = data.status.toUpperCase();
  if (data.sessionDate) data.sessionDate = new Date(`${data.sessionDate}T00:00:00.000Z`);

  const session = await prisma.session.update({
    where: { id: req.params.id },
    data,
    include: { module: true, professor: true, group: true, room: true },
  });

  res.json(serializeSession(session));
});

router.delete('/sessions/:id', requireAuth, requireRole(['ADMIN']), async (req, res) => {
  await prisma.session.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

module.exports = router;
