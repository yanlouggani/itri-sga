const test = require('node:test');
const assert = require('node:assert/strict');
const {
  SESSION_ERROR_CODES,
  SessionBusinessError,
  generateWeeklyOccurrences,
  assertNoConflict,
  RecurringSessionService,
  toDateOnlyString,
} = require('../src/services/recurring-sessions/service');

function utcDate(dateOnly) {
  return new Date(`${dateOnly}T00:00:00.000Z`);
}

function createMaster(overrides = {}) {
  return {
    id: 'master-1',
    seriesKey: 'series-1',
    parentMasterId: null,
    moduleId: 'module-1',
    professorId: 'prof-1',
    groupId: 'group-1',
    roomId: 'room-1',
    weekday: 1,
    startTime: '08:00',
    endTime: '10:00',
    effectiveStartDate: utcDate('2026-10-05'),
    effectiveEndDate: null,
    status: 'ACTIVE',
    archivedAt: null,
    ...overrides,
  };
}

test('generateWeeklyOccurrences removes deleted occurrences and applies modifications', () => {
  const masters = [createMaster()];
  const exceptions = [
    {
      id: 'ex-1',
      masterId: 'master-1',
      occurrenceDate: utcDate('2026-10-12'),
      type: 'DELETED',
      originalDate: utcDate('2026-10-12'),
      originalStartTime: '08:00',
      originalEndTime: '10:00',
    },
    {
      id: 'ex-2',
      masterId: 'master-1',
      occurrenceDate: utcDate('2026-10-19'),
      type: 'MODIFIED',
      originalDate: utcDate('2026-10-19'),
      originalStartTime: '08:00',
      originalEndTime: '10:00',
      overrideStartTime: '14:00',
      overrideEndTime: '16:00',
      overrideRoomId: 'room-2',
    },
  ];

  const deletedWeek = generateWeeklyOccurrences({ masters, exceptions, weekStart: '2026-10-12' });
  assert.equal(deletedWeek.length, 0);

  const modifiedWeek = generateWeeklyOccurrences({ masters, exceptions, weekStart: '2026-10-19' });
  assert.equal(modifiedWeek.length, 1);
  assert.equal(modifiedWeek[0].occurrenceDate, '2026-10-19');
  assert.equal(modifiedWeek[0].startTime, '14:00');
  assert.equal(modifiedWeek[0].roomId, 'room-2');
});

test('assertNoConflict raises explicit business errors', () => {
  const candidate = {
    masterId: 'master-1',
    originalDate: '2026-10-19',
    occurrenceDate: '2026-10-19',
    startTime: '14:00',
    endTime: '16:00',
    professorId: 'prof-1',
    roomId: 'room-1',
    groupId: 'group-1',
  };
  const existing = [{
    masterId: 'other-master',
    originalDate: '2026-10-19',
    occurrenceDate: '2026-10-19',
    startTime: '15:00',
    endTime: '17:00',
    professorId: 'prof-1',
    roomId: 'room-2',
    groupId: 'group-2',
  }];

  assert.throws(() => assertNoConflict(candidate, existing), (error) => {
    assert.ok(error instanceof SessionBusinessError);
    assert.equal(error.code, SESSION_ERROR_CODES.CONFLICT_TEACHER);
    return true;
  });
});

test('editOccurrence stores a modified exception with original references', async () => {
  const saved = [];
  const repository = {
    async findMasterById() { return createMaster(); },
    async listOccurrencesInRange() { return []; },
    async saveException(_uniqueWhere, data) { saved.push(data); return { id: 'ex-1', ...data }; },
  };
  const service = new RecurringSessionService(repository, { now: () => utcDate('2026-10-01') });

  const result = await service.editOccurrence({
    masterId: 'master-1',
    occurrenceDate: '2026-10-19',
    changes: { overrideDate: '2026-10-20', startTime: '14:00', endTime: '16:00', roomId: 'room-2' },
  });

  assert.equal(saved.length, 1);
  assert.equal(saved[0].originalDate.toISOString().slice(0, 10), '2026-10-19');
  assert.equal(saved[0].originalStartTime, '08:00');
  assert.equal(saved[0].overrideDate.toISOString().slice(0, 10), '2026-10-20');
  assert.equal(result.occurrence.occurrenceDate, '2026-10-20');
});

test('deleteSeriesFromDate closes the series before the cutoff date', async () => {
  let updated = null;
  const repository = {
    async findMasterById() { return createMaster(); },
    async updateMaster(_id, data) { updated = data; return data; },
  };
  const service = new RecurringSessionService(repository, { now: () => utcDate('2026-10-01') });

  await service.deleteSeriesFromDate({ masterId: 'master-1', fromDate: '2026-10-19' });
  assert.equal(toDateOnlyString(updated.effectiveEndDate), '2026-10-18');
});

test('editSeriesFromDate splits a series forward from the pivot date', async () => {
  const updates = [];
  const creates = [];
  const repository = {
    async findMasterById() { return createMaster({ effectiveStartDate: utcDate('2026-09-07') }); },
    async listOccurrencesInRange() { return []; },
    async updateMaster(_id, data) { updates.push(data); return data; },
    async createMaster(data) { creates.push(data); return { id: 'master-2', ...data }; },
  };
  const service = new RecurringSessionService(repository, { now: () => utcDate('2026-10-01') });

  const result = await service.editSeriesFromDate({
    masterId: 'master-1',
    fromDate: '2026-10-19',
    changes: { startTime: '14:00', endTime: '16:00' },
  });

  assert.equal(result.split, true);
  assert.equal(updates.length, 1);
  assert.equal(toDateOnlyString(updates[0].effectiveEndDate), '2026-10-18');
  assert.equal(creates.length, 1);
  assert.equal(creates[0].startTime, '14:00');
  assert.equal(toDateOnlyString(creates[0].effectiveStartDate), '2026-10-19');
});

test('past occurrences are locked', async () => {
  const repository = {
    async findMasterById() { return createMaster(); },
  };
  const service = new RecurringSessionService(repository, { now: () => utcDate('2026-10-20') });

  await assert.rejects(() => service.deleteOccurrence({ masterId: 'master-1', occurrenceDate: '2026-10-12' }), (error) => {
    assert.equal(error.code, SESSION_ERROR_CODES.PAST_OCCURRENCE_LOCKED);
    return true;
  });
});