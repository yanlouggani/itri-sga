const express = require('express');
const { prisma } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/sessions/:id/attendance', requireAuth, async (req, res) => {
  const attendance = await prisma.attendance.findMany({
    where: { sessionId: req.params.id },
    include: { student: true },
    orderBy: { student: { lastName: 'asc' } },
  });

  res.json(attendance.map((a) => ({
    studentId: a.studentId,
    studentName: `${a.student.firstName} ${a.student.lastName}`,
    status: a.status.toLowerCase(),
    markedBy: a.markedBy.toLowerCase(),
    scanMethod: a.scanMethod.toLowerCase(),
    gpsVerified: a.gpsVerified,
    gpsLatitude: a.gpsLatitude,
    gpsLongitude: a.gpsLongitude,
    lateMinutes: a.lateMinutes,
    markedAt: a.markedAt.toISOString(),
  })));
});

router.post('/sessions/:id/attendance/mark', requireAuth, requireRole(['PROFESSOR', 'ADMIN']), async (req, res) => {
  const { studentId, status, lateMinutes, scanMethod, gpsVerified } = req.body || {};
  if (!studentId || !status) {
    return res.status(400).json({ message: 'studentId and status are required' });
  }

  const record = await prisma.attendance.upsert({
    where: { sessionId_studentId: { sessionId: req.params.id, studentId } },
    update: {
      status: status.toUpperCase(),
      markedBy: req.user.role,
      scanMethod: scanMethod ? scanMethod.toUpperCase() : 'MANUAL',
      gpsVerified: !!gpsVerified,
      lateMinutes: lateMinutes || null,
      markedAt: new Date(),
    },
    create: {
      sessionId: req.params.id,
      studentId,
      status: status.toUpperCase(),
      markedBy: req.user.role,
      scanMethod: scanMethod ? scanMethod.toUpperCase() : 'MANUAL',
      gpsVerified: !!gpsVerified,
      lateMinutes: lateMinutes || null,
      markedAt: new Date(),
    },
  });

  res.json({ status: record.status.toLowerCase() });
});

router.post('/sessions/:id/attendance/bulk', requireAuth, requireRole(['PROFESSOR', 'ADMIN']), async (req, res) => {
  const { attendances } = req.body || {};
  if (!Array.isArray(attendances)) {
    return res.status(400).json({ message: 'attendances array is required' });
  }

  const ops = attendances.map((item) => prisma.attendance.upsert({
    where: { sessionId_studentId: { sessionId: req.params.id, studentId: item.studentId } },
    update: {
      status: item.status.toUpperCase(),
      markedBy: req.user.role,
      scanMethod: 'MANUAL',
      markedAt: new Date(),
    },
    create: {
      sessionId: req.params.id,
      studentId: item.studentId,
      status: item.status.toUpperCase(),
      markedBy: req.user.role,
      scanMethod: 'MANUAL',
      markedAt: new Date(),
    },
  }));

  await prisma.$transaction(ops);
  res.status(204).send();
});

router.post('/sessions/:id/attendance/scan', requireAuth, requireRole(['STUDENT']), async (req, res) => {
  const { qrToken, gpsVerified, gpsLat, gpsLng } = req.body || {};
  if (!qrToken) return res.status(400).json({ message: 'qrToken is required' });

  const session = await prisma.session.findUnique({ where: { id: req.params.id } });
  if (!session || session.status !== 'ACTIVE') {
    return res.status(400).json({ message: 'Session not active' });
  }
  if (session.currentQrToken !== qrToken) {
    return res.status(400).json({ message: 'Invalid QR token' });
  }
  if (session.qrTokenExpiresAt && session.qrTokenExpiresAt < new Date()) {
    return res.status(400).json({ message: 'QR token expired' });
  }

  await prisma.attendance.upsert({
    where: { sessionId_studentId: { sessionId: req.params.id, studentId: req.user.id } },
    update: {
      status: 'PRESENT',
      markedBy: 'STUDENT',
      scanMethod: 'QR',
      gpsVerified: !!gpsVerified,
      gpsLatitude: gpsLat || null,
      gpsLongitude: gpsLng || null,
      markedAt: new Date(),
    },
    create: {
      sessionId: req.params.id,
      studentId: req.user.id,
      status: 'PRESENT',
      markedBy: 'STUDENT',
      scanMethod: 'QR',
      gpsVerified: !!gpsVerified,
      gpsLatitude: gpsLat || null,
      gpsLongitude: gpsLng || null,
      markedAt: new Date(),
    },
  });

  res.status(204).send();
});

module.exports = router;
