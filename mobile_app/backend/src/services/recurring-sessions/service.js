const { SESSION_ERROR_CODES, SessionBusinessError } = require('./errors');
const {
  toDateOnlyString,
  fromDateOnlyString,
  addDays,
  addWeeks,
  getWeekStart,
  sameDateOnly,
  compareDateOnly,
  isDateWithinRange,
  weekdayOnOrAfter,
} = require('./dates');

function timeToMinutes(timeString) {
  const [hours, minutes] = timeString.split(':').map((value) => parseInt(value, 10));
  return hours * 60 + minutes;
}

function overlaps(startA, endA, startB, endB) {
  return timeToMinutes(startA) < timeToMinutes(endB) && timeToMinutes(startB) < timeToMinutes(endA);
}

function buildOccurrenceId(masterId, occurrenceDate, exceptionId = null) {
  return [masterId, occurrenceDate, exceptionId].filter(Boolean).join(':');
}

function normalizeOccurrenceSource(master) {
  return {
    masterId: master.id,
    seriesKey: master.seriesKey,
    occurrenceDate: toDateOnlyString(master.effectiveStartDate),
    originalDate: toDateOnlyString(master.effectiveStartDate),
    originalStartTime: master.startTime,
    originalEndTime: master.endTime,
    startTime: master.startTime,
    endTime: master.endTime,
    moduleId: master.moduleId,
    professorId: master.professorId,
    groupId: master.groupId,
    roomId: master.roomId,
    weekday: master.weekday,
    status: 'scheduled',
    sourceType: 'master',
    exceptionId: null,
  };
}

function applyException(occurrence, exception) {
  if (!exception) return occurrence;
  if (exception.type === 'DELETED') return null;

  const nextOccurrenceDate = toDateOnlyString(exception.overrideDate ?? exception.occurrenceDate ?? occurrence.occurrenceDate);
  return {
    ...occurrence,
    id: buildOccurrenceId(occurrence.masterId, occurrence.originalDate, exception.id),
    occurrenceDate: nextOccurrenceDate,
    startTime: exception.overrideStartTime ?? occurrence.startTime,
    endTime: exception.overrideEndTime ?? occurrence.endTime,
    moduleId: exception.overrideModuleId ?? occurrence.moduleId,
    professorId: exception.overrideProfessorId ?? occurrence.professorId,
    groupId: exception.overrideGroupId ?? occurrence.groupId,
    roomId: exception.overrideRoomId ?? occurrence.roomId,
    sourceType: 'exception',
    exceptionId: exception.id,
  };
}

function generateWeeklyOccurrences({ masters, exceptions, weekStart, includeArchived = false }) {
  const normalizedWeekStart = getWeekStart(fromDateOnlyString(weekStart) ?? new Date());
  const weekDates = Array.from({ length: 7 }, (_, index) => addDays(normalizedWeekStart, index));
  const weekStartOnly = toDateOnlyString(normalizedWeekStart);
  const weekEndOnly = toDateOnlyString(addDays(normalizedWeekStart, 6));
  const exceptionMap = new Map();

  for (const exception of exceptions) {
    exceptionMap.set(`${exception.masterId}:${toDateOnlyString(exception.occurrenceDate)}`, exception);
  }

  const results = [];
  for (const master of masters) {
    if (!includeArchived && master.status === 'ARCHIVED') continue;
    if (!isDateWithinRange(weekStartOnly, master.effectiveStartDate, master.effectiveEndDate) && !isDateWithinRange(weekEndOnly, master.effectiveStartDate, master.effectiveEndDate)) {
      continue;
    }

    for (const currentDate of weekDates) {
      const currentDateOnly = toDateOnlyString(currentDate);
      if (currentDate.getUTCDay() !== master.weekday) continue;
      if (!isDateWithinRange(currentDateOnly, master.effectiveStartDate, master.effectiveEndDate)) continue;

      const sourceOccurrence = {
        ...normalizeOccurrenceSource(master),
        id: buildOccurrenceId(master.id, currentDateOnly),
        occurrenceDate: currentDateOnly,
        originalDate: currentDateOnly,
      };
      const projected = applyException(sourceOccurrence, exceptionMap.get(`${master.id}:${currentDateOnly}`));
      if (projected && isDateWithinRange(projected.occurrenceDate, weekStartOnly, weekEndOnly)) {
        results.push(projected);
      }
    }
  }

  for (const exception of exceptions) {
    if (exception.type !== 'MODIFIED' || !exception.overrideDate) continue;
    const overrideDateOnly = toDateOnlyString(exception.overrideDate);
    if (!isDateWithinRange(overrideDateOnly, weekStartOnly, weekEndOnly)) continue;

    const originalDateOnly = toDateOnlyString(exception.originalDate);
    const alreadyProjected = results.some((entry) => entry.masterId === exception.masterId && entry.originalDate === originalDateOnly);
    if (alreadyProjected) continue;

    const master = masters.find((item) => item.id === exception.masterId);
    if (!master || (!includeArchived && master.status === 'ARCHIVED')) continue;
    const sourceOccurrence = {
      ...normalizeOccurrenceSource(master),
      id: buildOccurrenceId(master.id, originalDateOnly),
      occurrenceDate: originalDateOnly,
      originalDate: originalDateOnly,
    };
    const projected = applyException(sourceOccurrence, exception);
    if (projected && isDateWithinRange(projected.occurrenceDate, weekStartOnly, weekEndOnly)) {
      results.push(projected);
    }
  }

  return results.sort((left, right) => {
    const dateOrder = compareDateOnly(left.occurrenceDate, right.occurrenceDate);
    if (dateOrder !== 0) return dateOrder;
    const timeOrder = timeToMinutes(left.startTime) - timeToMinutes(right.startTime);
    if (timeOrder !== 0) return timeOrder;
    return left.masterId.localeCompare(right.masterId);
  });
}

function assertNoConflict(candidate, existingOccurrences, options = {}) {
  const ignoreMasterId = options.ignoreMasterId ?? candidate.masterId;
  const ignoreOriginalDate = options.ignoreOriginalDate ?? candidate.originalDate;
  const ignoreExceptionId = options.ignoreExceptionId ?? candidate.exceptionId ?? null;

  for (const current of existingOccurrences) {
    if (current.masterId === ignoreMasterId && current.originalDate === ignoreOriginalDate) continue;
    if (ignoreExceptionId && current.exceptionId === ignoreExceptionId) continue;
    if (current.occurrenceDate !== candidate.occurrenceDate) continue;
    if (!overlaps(candidate.startTime, candidate.endTime, current.startTime, current.endTime)) continue;

    if (candidate.professorId && current.professorId === candidate.professorId) {
      throw new SessionBusinessError(SESSION_ERROR_CODES.CONFLICT_TEACHER, 'Teacher conflict', {
        candidate,
        conflict: current,
      });
    }
    if (candidate.roomId && current.roomId === candidate.roomId) {
      throw new SessionBusinessError(SESSION_ERROR_CODES.CONFLICT_ROOM, 'Room conflict', {
        candidate,
        conflict: current,
      });
    }
    if (candidate.groupId && current.groupId === candidate.groupId) {
      throw new SessionBusinessError(SESSION_ERROR_CODES.CONFLICT_GROUP, 'Group conflict', {
        candidate,
        conflict: current,
      });
    }
  }
}

function createDeletedExceptionPayload(master, occurrenceDate, note = null) {
  return {
    masterId: master.id,
    occurrenceDate: fromDateOnlyString(occurrenceDate),
    type: 'DELETED',
    originalDate: fromDateOnlyString(occurrenceDate),
    originalStartTime: master.startTime,
    originalEndTime: master.endTime,
    overrideDate: null,
    overrideStartTime: null,
    overrideEndTime: null,
    overrideModuleId: null,
    overrideProfessorId: null,
    overrideGroupId: null,
    overrideRoomId: null,
    note,
  };
}

function createModifiedExceptionPayload(master, occurrenceDate, changes = {}) {
  return {
    masterId: master.id,
    occurrenceDate: fromDateOnlyString(occurrenceDate),
    type: 'MODIFIED',
    originalDate: fromDateOnlyString(occurrenceDate),
    originalStartTime: master.startTime,
    originalEndTime: master.endTime,
    overrideDate: changes.overrideDate ? fromDateOnlyString(changes.overrideDate) : null,
    overrideStartTime: changes.startTime ?? null,
    overrideEndTime: changes.endTime ?? null,
    overrideModuleId: changes.moduleId ?? null,
    overrideProfessorId: changes.professorId ?? null,
    overrideGroupId: changes.groupId ?? null,
    overrideRoomId: changes.roomId ?? null,
    note: changes.note ?? null,
  };
}

function mergeMasterPatch(master, patch) {
  return {
    seriesKey: master.seriesKey,
    parentMasterId: master.parentMasterId ?? null,
    moduleId: patch.moduleId ?? master.moduleId,
    professorId: patch.professorId ?? master.professorId,
    groupId: patch.groupId ?? master.groupId,
    roomId: patch.roomId ?? master.roomId,
    weekday: patch.weekday ?? master.weekday,
    startTime: patch.startTime ?? master.startTime,
    endTime: patch.endTime ?? master.endTime,
    effectiveStartDate: patch.effectiveStartDate ? fromDateOnlyString(patch.effectiveStartDate) : master.effectiveStartDate,
    effectiveEndDate: patch.effectiveEndDate === undefined
      ? master.effectiveEndDate
      : (patch.effectiveEndDate ? fromDateOnlyString(patch.effectiveEndDate) : null),
    status: patch.status ?? master.status,
    archivedAt: patch.archivedAt ? new Date(patch.archivedAt) : master.archivedAt ?? null,
  };
}

function weekStartForDate(dateOnly) {
  return toDateOnlyString(getWeekStart(fromDateOnlyString(dateOnly)));
}

class RecurringSessionService {
  constructor(repository, options = {}) {
    this.repository = repository;
    this.now = options.now ?? (() => new Date());
  }

  todayOnly() {
    return toDateOnlyString(this.now());
  }

  async projectWeek(weekStart, options = {}) {
    const normalizedWeekStart = toDateOnlyString(weekStart);
    const startDate = fromDateOnlyString(normalizedWeekStart);
    const endDate = addDays(startDate, 6);
    const masters = await this.repository.listMastersForProjection({
      startDate,
      endDate,
      includeArchived: !!options.includeArchived,
    });
    const exceptions = await this.repository.listExceptionsForProjection({
      startDate,
      endDate,
      includeArchived: !!options.includeArchived,
    });
    return generateWeeklyOccurrences({
      masters,
      exceptions,
      weekStart: normalizedWeekStart,
      includeArchived: !!options.includeArchived,
    });
  }

  async projectWeekWithConflicts(weekStart) {
    const recurringOccurrences = await this.projectWeek(weekStart);
    const startDate = fromDateOnlyString(toDateOnlyString(weekStart));
    const endDate = addDays(startDate, 6);
    const legacySessions = await this.repository.listLegacySessionsInRange({ startDate, endDate });
    return { recurringOccurrences, legacySessions };
  }

  async createSeries({
    moduleId,
    professorId,
    groupId,
    roomId,
    weekday,
    startTime,
    endTime,
    effectiveStartDate,
    effectiveEndDate = null,
    seriesKey = null,
    parentMasterId = null,
  }) {
    if (!moduleId || !professorId || !groupId || !roomId || weekday === undefined || !startTime || !endTime || !effectiveStartDate) {
      throw new SessionBusinessError(SESSION_ERROR_CODES.INVALID_SCOPE, 'Missing required fields');
    }

    const normalizedStartDate = toDateOnlyString(effectiveStartDate);
    const normalizedEndDate = effectiveEndDate ? toDateOnlyString(effectiveEndDate) : null;
    const master = {
      id: undefined,
      seriesKey: seriesKey ?? `series_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      parentMasterId,
      moduleId,
      professorId,
      groupId,
      roomId,
      weekday,
      startTime,
      endTime,
      effectiveStartDate: fromDateOnlyString(normalizedStartDate),
      effectiveEndDate: normalizedEndDate ? fromDateOnlyString(normalizedEndDate) : null,
      status: 'ACTIVE',
      archivedAt: null,
    };

    const conflictWindowStart = fromDateOnlyString(weekStartForDate(normalizedStartDate));
    const conflictWindowEnd = addDays(conflictWindowStart, 6);
    const projected = generateWeeklyOccurrences({
      masters: [{ ...master, id: '__preview__' }],
      exceptions: [],
      weekStart: weekStartForDate(normalizedStartDate),
      includeArchived: false,
    }).find((entry) => entry.occurrenceDate >= normalizedStartDate) ?? null;

    if (projected) {
      const existingOccurrences = await this.repository.listOccurrencesInRange({
        startDate: conflictWindowStart,
        endDate: conflictWindowEnd,
      });
      assertNoConflict(projected, existingOccurrences, { ignoreMasterId: null, ignoreOriginalDate: null });
    }

    return this.repository.createMaster(master);
  }

  async deleteOccurrence({ masterId, occurrenceDate, note = null }) {
    const master = await this.repository.findMasterById(masterId);
    if (!master) {
      throw new SessionBusinessError(SESSION_ERROR_CODES.SERIES_NOT_FOUND, 'Series not found');
    }

    const normalizedOccurrenceDate = toDateOnlyString(occurrenceDate);
    if (compareDateOnly(normalizedOccurrenceDate, this.todayOnly()) < 0) {
      throw new SessionBusinessError(SESSION_ERROR_CODES.PAST_OCCURRENCE_LOCKED, 'Past occurrence cannot be modified');
    }

    const payload = createDeletedExceptionPayload(master, normalizedOccurrenceDate, note);
    const savedException = await this.repository.saveException({
      masterId: payload.masterId,
      occurrenceDate: payload.occurrenceDate,
    }, payload);

    return { master, exception: savedException };
  }

  async editOccurrence({ masterId, occurrenceDate, changes = {} }) {
    const master = await this.repository.findMasterById(masterId);
    if (!master) {
      throw new SessionBusinessError(SESSION_ERROR_CODES.SERIES_NOT_FOUND, 'Series not found');
    }

    const normalizedOccurrenceDate = toDateOnlyString(occurrenceDate);
    if (compareDateOnly(normalizedOccurrenceDate, this.todayOnly()) < 0) {
      throw new SessionBusinessError(SESSION_ERROR_CODES.PAST_OCCURRENCE_LOCKED, 'Past occurrence cannot be modified');
    }

    const payload = createModifiedExceptionPayload(master, normalizedOccurrenceDate, changes);
    const projected = applyException({
      ...normalizeOccurrenceSource(master),
      id: buildOccurrenceId(master.id, normalizedOccurrenceDate),
      occurrenceDate: normalizedOccurrenceDate,
      originalDate: normalizedOccurrenceDate,
    }, { ...payload, id: 'preview' });

    const conflictWindowStart = fromDateOnlyString(weekStartForDate(projected.occurrenceDate));
    const conflictWindowEnd = addDays(conflictWindowStart, 6);
    const existingOccurrences = await this.repository.listOccurrencesInRange({
      startDate: conflictWindowStart,
      endDate: conflictWindowEnd,
      excludeMasterId: masterId,
      excludeOriginalDate: normalizedOccurrenceDate,
    });
    assertNoConflict(projected, existingOccurrences, {
      ignoreMasterId: masterId,
      ignoreOriginalDate: normalizedOccurrenceDate,
    });

    const savedException = await this.repository.saveException({
      masterId: payload.masterId,
      occurrenceDate: payload.occurrenceDate,
    }, payload);

    return { master, exception: savedException, occurrence: projected };
  }

  async editSeriesFromDate({ masterId, fromDate, changes = {} }) {
    const master = await this.repository.findMasterById(masterId);
    if (!master) {
      throw new SessionBusinessError(SESSION_ERROR_CODES.SERIES_NOT_FOUND, 'Series not found');
    }

    const normalizedFromDate = toDateOnlyString(fromDate);
    if (compareDateOnly(normalizedFromDate, this.todayOnly()) < 0) {
      throw new SessionBusinessError(SESSION_ERROR_CODES.PAST_OCCURRENCE_LOCKED, 'Past occurrences are locked');
    }

    const isDirectUpdate = sameDateOnly(normalizedFromDate, master.effectiveStartDate);
    if (isDirectUpdate) {
      const updatedMaster = mergeMasterPatch(master, { ...changes, effectiveStartDate: normalizedFromDate });
      const projected = generateWeeklyOccurrences({
        masters: [{ ...updatedMaster, id: master.id }],
        exceptions: [],
        weekStart: weekStartForDate(normalizedFromDate),
      }).find((entry) => entry.masterId === master.id) ?? null;

      if (projected) {
        const conflictWindowStart = fromDateOnlyString(weekStartForDate(normalizedFromDate));
        const conflictWindowEnd = addDays(conflictWindowStart, 6);
        const existingOccurrences = await this.repository.listOccurrencesInRange({
          startDate: conflictWindowStart,
          endDate: conflictWindowEnd,
          excludeMasterId: masterId,
        });
        assertNoConflict(projected, existingOccurrences, { ignoreMasterId: masterId });
      }

      const savedMaster = await this.repository.updateMaster(masterId, updatedMaster);
      return { master: savedMaster, split: false };
    }

    const predecessorEndDate = toDateOnlyString(addDays(fromDateOnlyString(normalizedFromDate), -1));
    const newMasterPreview = mergeMasterPatch(master, {
      ...changes,
      effectiveStartDate: normalizedFromDate,
      effectiveEndDate: null,
      parentMasterId: master.id,
    });

    const firstProjectedDate = weekdayOnOrAfter(normalizedFromDate, newMasterPreview.weekday);
    const projected = generateWeeklyOccurrences({
      masters: [{ ...newMasterPreview, id: '__preview__' }],
      exceptions: [],
      weekStart: weekStartForDate(firstProjectedDate),
    }).find((entry) => entry.occurrenceDate === firstProjectedDate) ?? null;

    if (projected) {
      const conflictWindowStart = fromDateOnlyString(weekStartForDate(firstProjectedDate));
      const conflictWindowEnd = addDays(conflictWindowStart, 6);
      const existingOccurrences = await this.repository.listOccurrencesInRange({
        startDate: conflictWindowStart,
        endDate: conflictWindowEnd,
        excludeMasterId: masterId,
      });
      assertNoConflict(projected, existingOccurrences, { ignoreMasterId: masterId });
    }

    const updatedCurrentMaster = await this.repository.updateMaster(masterId, {
      ...master,
      effectiveEndDate: fromDateOnlyString(predecessorEndDate),
    });

    const createdMaster = await this.repository.createMaster({
      ...newMasterPreview,
      seriesKey: master.seriesKey,
      parentMasterId: master.id,
      effectiveStartDate: fromDateOnlyString(normalizedFromDate),
      effectiveEndDate: null,
      status: 'ACTIVE',
      archivedAt: null,
    });

    return { master: createdMaster, predecessor: updatedCurrentMaster, split: true };
  }

  async deleteSeriesFromDate({ masterId, fromDate }) {
    const master = await this.repository.findMasterById(masterId);
    if (!master) {
      throw new SessionBusinessError(SESSION_ERROR_CODES.SERIES_NOT_FOUND, 'Series not found');
    }

    const normalizedFromDate = toDateOnlyString(fromDate);
    if (compareDateOnly(normalizedFromDate, this.todayOnly()) < 0) {
      throw new SessionBusinessError(SESSION_ERROR_CODES.PAST_OCCURRENCE_LOCKED, 'Past occurrences are locked');
    }

    const closedMaster = await this.repository.updateMaster(masterId, {
      ...master,
      effectiveEndDate: fromDateOnlyString(toDateOnlyString(addDays(fromDateOnlyString(normalizedFromDate), -1))),
    });

    return { master: closedMaster };
  }

  async archiveSeries({ masterId }) {
    const master = await this.repository.findMasterById(masterId);
    if (!master) {
      throw new SessionBusinessError(SESSION_ERROR_CODES.SERIES_NOT_FOUND, 'Series not found');
    }

    const archivedAt = new Date(this.now());
    const seriesMasters = await this.repository.findMastersBySeriesKey(master.seriesKey);
    const archivedMasters = [];
    for (const seriesMaster of seriesMasters) {
      archivedMasters.push(await this.repository.updateMaster(seriesMaster.id, {
        ...seriesMaster,
        status: 'ARCHIVED',
        archivedAt,
      }));
    }

    return { masters: archivedMasters, archivedAt };
  }
}

module.exports = {
  SESSION_ERROR_CODES,
  SessionBusinessError,
  toDateOnlyString,
  fromDateOnlyString,
  addDays,
  addWeeks,
  getWeekStart,
  sameDateOnly,
  compareDateOnly,
  isDateWithinRange,
  weekdayOnOrAfter,
  generateWeeklyOccurrences,
  applyException,
  assertNoConflict,
  RecurringSessionService,
};