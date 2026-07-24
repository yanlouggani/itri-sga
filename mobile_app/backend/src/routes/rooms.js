const express = require('express');
const { prisma } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/rooms', requireAuth, async (req, res) => {
  const rooms = await prisma.room.findMany({ orderBy: { name: 'asc' } });
  res.json(rooms);
});

router.post('/rooms', requireAuth, requireRole(['ADMIN']), async (req, res) => {
  const room = await prisma.room.create({ data: req.body });
  res.status(201).json(room);
});

router.patch('/rooms/:id', requireAuth, requireRole(['ADMIN']), async (req, res) => {
  const room = await prisma.room.update({
    where: { id: req.params.id },
    data: req.body,
  });
  res.json(room);
});

router.delete('/rooms/:id', requireAuth, requireRole(['ADMIN']), async (req, res) => {
  await prisma.room.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

module.exports = router;
