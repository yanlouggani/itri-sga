const { prisma } = require('../../db');

function mapMaster(row) {
  return {
    id: row.id,
    seriesKey: row.seriesKey,
    parentMasterId: row.parentMasterId,
    moduleId: row.moduleId,
    professorId: row.professorId,
    groupId: row.groupId,
    roomId: row.roomId,
    weekday: row.weekday,
    startTime: row.startTime,
    endTime: row.endTime,
    effectiveStartDate: row.effectiveStartDate,
    effectiveEndDate: row.effectiveEndDate,
    status: row.status,
    archivedAt: row.archivedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapException(row) {
  return {
    id: row.id,
    masterId: row.masterId,
    occurrenceDate: row.occurrenceDate,
    type: row.type,
    originalDate: row.originalDate,
    originalStartTime: row.originalStartTime,
    originalEndTime: row.originalEndTime,
    overrideDate: row.overrideDate,
    overrideStartTime: row.overrideStartTime,
    overrideEndTime: row.overrideEndTime,
    overrideModuleId: row.overrideModuleId,
    overrideProfessorId: row.overrideProfessorId,
    overrideGroupId: row.overrideGroupId,
    overrideRoomId: row.overrideRoomId,
    note: row.note,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function createRecurringSessionsRepository(client = prisma) {
  return {
    async findMasterById(id) {
      const row = await client.sessionMaster.findUnique({ where: { id } });
      return row ? mapMaster(row) : null;
    },

    async findMastersBySeriesKey(seriesKey) {
      const rows = await client.sessionMaster.findMany({ where: { seriesKey } });
      return rows.map(mapMaster);
    },

    async listMastersForProjection({ startDate, endDate, includeArchived = false }) {
      const rows = await client.sessionMaster.findMany({
        where: {
          ...(includeArchived ? {} : { status: 'ACTIVE' }),
          OR: [
            { effectiveEndDate: null },
            { effectiveEndDate: { gte: startDate } },
          ],
          effectiveStartDate: { lte: endDate },
        },
      });
      return rows.map(mapMaster);
    },

    async listExceptionsForProjection({ startDate, endDate, includeArchived = false }) {
      const rows = await client.sessionException.findMany({
        where: {
          occurrenceDate: { gte: startDate, lte: endDate },
          master: includeArchived ? undefined : { status: 'ACTIVE' },
        },
      });
      return rows.map(mapException);
    },

    async listLegacySessionsInRange({ startDate, endDate }) {
      const rows = await client.session.findMany({
        where: { sessionDate: { gte: startDate, lte: endDate } },
        include: { module: true, professor: true, group: true, room: true },
      });
      return rows.map((row) => ({
        id: row.id,
        masterId: row.recurrenceMasterId ?? null,
        occurrenceDate: row.sessionDate,
        originalDate: row.originalDate ?? row.sessionDate,
        originalStartTime: row.originalStartTime ?? row.startTime,
        originalEndTime: row.originalEndTime ?? row.endTime,
        startTime: row.startTime,
        endTime: row.endTime,
        moduleId: row.moduleId,
        professorId: row.professorId,
        groupId: row.groupId,
        roomId: row.roomId,
        status: row.status,
        sourceType: 'legacy',
      }));
    },

    async listOccurrencesInRange({ startDate, endDate, excludeMasterId = null, excludeOriginalDate = null }) {
      const recurring = await this.listMastersForProjection({ startDate, endDate, includeArchived: false });
      const exceptions = await this.listExceptionsForProjection({ startDate, endDate, includeArchived: false });
      const { generateWeeklyOccurrences } = require('./service');
      const recurringOccurrences = generateWeeklyOccurrences({
        masters: recurring,
        exceptions,
        weekStart: startDate,
      }).filter((item) => {
        if (excludeMasterId && item.masterId === excludeMasterId) return false;
        if (excludeOriginalDate && item.originalDate === excludeOriginalDate) return false;
        return true;
      });
      const legacySessions = await this.listLegacySessionsInRange({ startDate, endDate });
      return [...recurringOccurrences, ...legacySessions];
    },

    async saveException(uniqueWhere, data) {
      const row = await client.sessionException.upsert({
        where: { masterId_occurrenceDate: uniqueWhere },
        update: data,
        create: data,
      });
      return mapException(row);
    },

    async updateMaster(id, data) {
      const row = await client.sessionMaster.update({ where: { id }, data });
      return mapMaster(row);
    },

    async createMaster(data) {
      const row = await client.sessionMaster.create({ data });
      return mapMaster(row);
    },

    async deleteMaster(id) {
      await client.sessionMaster.delete({ where: { id } });
    },
  };
}

module.exports = { createRecurringSessionsRepository };