const express = require('express');
const { prisma } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { hashPassword } = require('../utils/password');
const { serializeUser } = require('../utils/serialize');

const router = express.Router();

router.get('/users', requireAuth, requireRole(['ADMIN']), async (req, res) => {
  const users = await prisma.user.findMany({
    include: { group: true },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
  });
  res.json(users.map(serializeUser));
});

router.get('/users/:id', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    include: { group: true },
  });
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(serializeUser(user));
});

router.post('/users', requireAuth, requireRole(['ADMIN']), async (req, res) => {
  const {
    email,
    password,
    firstName,
    lastName,
    role,
    identifier,
    groupId,
  } = req.body || {};

  if (!email || !password || !firstName || !lastName || !role) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName,
      lastName,
      role: role.toUpperCase(),
      identifier,
      groupId: groupId || null,
      isActive: true,
    },
    include: { group: true },
  });

  res.status(201).json(serializeUser(user));
});

router.patch('/users/:id', requireAuth, requireRole(['ADMIN']), async (req, res) => {
  const data = { ...req.body };
  if (data.role) data.role = data.role.toUpperCase();
  if ('groupId' in data && !data.groupId) data.groupId = null;

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data,
    include: { group: true },
  });

  res.json(serializeUser(user));
});

router.delete('/users/:id', requireAuth, requireRole(['ADMIN']), async (req, res) => {
  await prisma.user.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

router.post('/users/:id/reset-password', requireAuth, requireRole(['ADMIN']), async (req, res) => {
  const { newPassword } = req.body || {};
  if (!newPassword) {
    return res.status(400).json({ message: 'newPassword is required' });
  }
  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: req.params.id },
    data: { passwordHash },
  });
  res.status(204).send();
});

module.exports = router;
