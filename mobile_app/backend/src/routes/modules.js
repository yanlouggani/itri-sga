const express = require('express');
const { prisma } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/modules', requireAuth, async (req, res) => {
  const modules = await prisma.module.findMany({ orderBy: { name: 'asc' } });
  res.json(modules);
});

router.post('/modules', requireAuth, requireRole(['ADMIN']), async (req, res) => {
  const moduleItem = await prisma.module.create({ data: req.body });
  res.status(201).json(moduleItem);
});

router.patch('/modules/:id', requireAuth, requireRole(['ADMIN']), async (req, res) => {
  const moduleItem = await prisma.module.update({
    where: { id: req.params.id },
    data: req.body,
  });
  res.json(moduleItem);
});

router.delete('/modules/:id', requireAuth, requireRole(['ADMIN']), async (req, res) => {
  await prisma.module.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

module.exports = router;
