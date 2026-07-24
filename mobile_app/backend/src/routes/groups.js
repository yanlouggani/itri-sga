const express = require('express');
const { prisma } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/groups', requireAuth, async (req, res) => {
  const groups = await prisma.group.findMany({ orderBy: { name: 'asc' } });
  res.json(groups);
});

router.post('/groups', requireAuth, requireRole(['ADMIN']), async (req, res) => {
  const group = await prisma.group.create({ data: req.body });
  res.status(201).json(group);
});

router.patch('/groups/:id', requireAuth, requireRole(['ADMIN']), async (req, res) => {
  const group = await prisma.group.update({
    where: { id: req.params.id },
    data: req.body,
  });
  res.json(group);
});

router.delete('/groups/:id', requireAuth, requireRole(['ADMIN']), async (req, res) => {
  await prisma.group.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

module.exports = router;
