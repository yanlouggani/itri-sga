const express = require('express');
const { prisma } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { createRecurringSessionsRepository } = require('../services/recurring-sessions/repository');
const { RecurringSessionService, SessionBusinessError } = require('../services/recurring-sessions/service');

const router = express.Router();
const service = new RecurringSessionService(createRecurringSessionsRepository(prisma));

function handleServiceError(res, error) {
  if (error instanceof SessionBusinessError) {
    const status = error.code === 'CONFLICT_TEACHER' || error.code === 'CONFLICT_ROOM' || error.code === 'CONFLICT_GROUP'
      ? 409
      : error.code === 'SERIES_NOT_FOUND' || error.code === 'SESSION_NOT_FOUND' || error.code === 'OCCURRENCE_NOT_FOUND'
        ? 404
        : 400;
    return res.status(status).json({ code: error.code, message: error.message, details: error.details });
  }

  console.error('[API] recurring-sessions error', error);
  return res.status(500).json({ message: 'Internal server error' });
}

router.get('/recurring-sessions/week/:weekStart', requireAuth, async (req, res) => {
  try {
    const recurringOccurrences = await service.projectWeek(req.params.weekStart);
    res.json({ recurringOccurrences });
  } catch (error) {
    return handleServiceError(res, error);
  }
});

router.post('/recurring-sessions/masters', requireAuth, requireRole(['ADMIN']), async (req, res) => {
  try {
    const result = await service.createSeries(req.body ?? {});
    res.status(201).json(result);
  } catch (error) {
    return handleServiceError(res, error);
  }
});

router.post('/recurring-sessions/masters/:masterId/occurrences/:occurrenceDate/delete', requireAuth, requireRole(['ADMIN']), async (req, res) => {
  try {
    const result = await service.deleteOccurrence({
      masterId: req.params.masterId,
      occurrenceDate: req.params.occurrenceDate,
      note: req.body?.note ?? null,
    });
    res.status(201).json(result);
  } catch (error) {
    return handleServiceError(res, error);
  }
});

router.post('/recurring-sessions/masters/:masterId/occurrences/:occurrenceDate/edit', requireAuth, requireRole(['ADMIN']), async (req, res) => {
  try {
    const result = await service.editOccurrence({
      masterId: req.params.masterId,
      occurrenceDate: req.params.occurrenceDate,
      changes: req.body ?? {},
    });
    res.status(201).json(result);
  } catch (error) {
    return handleServiceError(res, error);
  }
});

router.post('/recurring-sessions/masters/:masterId/edit-from/:fromDate', requireAuth, requireRole(['ADMIN']), async (req, res) => {
  try {
    const result = await service.editSeriesFromDate({
      masterId: req.params.masterId,
      fromDate: req.params.fromDate,
      changes: req.body ?? {},
    });
    res.status(201).json(result);
  } catch (error) {
    return handleServiceError(res, error);
  }
});

router.post('/recurring-sessions/masters/:masterId/delete-from/:fromDate', requireAuth, requireRole(['ADMIN']), async (req, res) => {
  try {
    const result = await service.deleteSeriesFromDate({
      masterId: req.params.masterId,
      fromDate: req.params.fromDate,
    });
    res.json(result);
  } catch (error) {
    return handleServiceError(res, error);
  }
});

router.post('/recurring-sessions/masters/:masterId/archive', requireAuth, requireRole(['ADMIN']), async (req, res) => {
  try {
    const result = await service.archiveSeries({
      masterId: req.params.masterId,
    });
    res.json(result);
  } catch (error) {
    return handleServiceError(res, error);
  }
});

module.exports = router;