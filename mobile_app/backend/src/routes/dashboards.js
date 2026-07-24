const express = require('express');
const { prisma } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { serializeSession } = require('../utils/serialize');

const router = express.Router();

router.get('/admin/dashboard', requireAuth, async (req, res) => {
  const [totalUsers, totalModules, totalRooms, totalGroups] = await Promise.all([
    prisma.user.count(),
    prisma.module.count(),
    prisma.room.count(),
    prisma.group.count(),
  ]);

  const today = new Date();
  const start = new Date(today.toISOString().slice(0, 10));
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  const sessions = await prisma.session.findMany({
    where: { sessionDate: { gte: start, lt: end } },
    include: { module: true, professor: true, group: true, room: true },
  });

  const activeSessions = sessions.filter((s) => s.status === 'ACTIVE').length;
  const totalPresent = sessions.reduce((sum, s) => sum + s.presentCount, 0);
  const totalMarked = sessions.reduce((sum, s) => sum + s.presentCount + s.absentCount + s.lateCount, 0);
  const averageAttendanceRate = totalMarked > 0 ? (totalPresent / totalMarked) * 100 : 0;

  res.json({
    totalUsers,
    totalModules,
    totalRooms,
    totalGroups,
    totalSessionsToday: sessions.length,
    activeSessionsToday: activeSessions,
    averageAttendanceRate,
    recentSessions: sessions.slice(0, 10).map(serializeSession),
  });
});

router.get('/professors/:id/dashboard', requireAuth, async (req, res) => {
  const today = new Date();
  const start = new Date(today.toISOString().slice(0, 10));
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  const sessions = await prisma.session.findMany({
    where: {
      professorId: req.params.id,
      sessionDate: { gte: start, lt: end },
    },
    include: { module: true, professor: true, group: true, room: true },
    orderBy: { startTime: 'asc' },
  });

  res.json({
    todaySessions: sessions.map(serializeSession),
  });
});

router.get('/students/:id/dashboard', requireAuth, async (req, res) => {
  const student = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!student) return res.status(404).json({ message: 'Student not found' });

  const today = new Date();
  const start = new Date(today.toISOString().slice(0, 10));
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  const sessions = await prisma.session.findMany({
    where: {
      groupId: student.groupId || undefined,
      sessionDate: { gte: start, lt: end },
    },
    include: { module: true, professor: true, group: true, room: true },
    orderBy: { startTime: 'asc' },
  });

  const todaySessions = [];
  for (const session of sessions) {
    const attendance = await prisma.attendance.findUnique({
      where: { sessionId_studentId: { sessionId: session.id, studentId: student.id } },
    });
    todaySessions.push({
      id: session.id,
      moduleName: session.module.name,
      startTime: session.startTime,
      endTime: session.endTime,
      roomName: session.room.name,
      status: attendance ? attendance.status.toLowerCase() : 'unmarked',
    });
  }

  const attendanceAll = await prisma.attendance.findMany({
    where: { studentId: student.id },
    include: { session: { include: { module: true } } },
  });
  const moduleAbsences = {};
  for (const rec of attendanceAll) {
    if (rec.status === 'ABSENT' || rec.status === 'LATE') {
      const modName = rec.session.module.name;
      moduleAbsences[modName] = (moduleAbsences[modName] || 0) + 1;
    }
  }

  const absenceSummary = Object.entries(moduleAbsences).map(([moduleName, absences]) => ({
    moduleName,
    totalSessions: 0,
    absences,
    maxAllowed: 6,
  }));

  res.json({ todaySessions, absenceSummary });
});

router.get('/students/:id/absences', requireAuth, async (req, res) => {
  const attendance = await prisma.attendance.findMany({
    where: {
      studentId: req.params.id,
      status: { not: 'UNMARKED' },
    },
    include: { session: { include: { module: true } } },
    orderBy: { markedAt: 'desc' },
  });

  const absences = attendance.map((rec) => ({
    id: rec.studentId,
    sessionId: rec.sessionId,
    moduleName: rec.session.module.name,
    sessionDate: rec.session.sessionDate.toISOString().slice(0, 10),
    startTime: rec.session.startTime,
    endTime: rec.session.endTime,
    status: rec.status.toLowerCase(),
    markedBy: rec.markedBy.toLowerCase(),
    scanMethod: rec.scanMethod.toLowerCase(),
  }));

  res.json(absences);
});

module.exports = router;
