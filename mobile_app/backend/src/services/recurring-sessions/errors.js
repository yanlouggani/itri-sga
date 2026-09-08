const SESSION_ERROR_CODES = {
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  SERIES_NOT_FOUND: 'SERIES_NOT_FOUND',
  OCCURRENCE_NOT_FOUND: 'OCCURRENCE_NOT_FOUND',
  CONFLICT_TEACHER: 'CONFLICT_TEACHER',
  CONFLICT_ROOM: 'CONFLICT_ROOM',
  CONFLICT_GROUP: 'CONFLICT_GROUP',
  INVALID_SCOPE: 'INVALID_SCOPE',
  PAST_OCCURRENCE_LOCKED: 'PAST_OCCURRENCE_LOCKED',
};

class SessionBusinessError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'SessionBusinessError';
    this.code = code;
    this.details = details;
  }
}

module.exports = { SESSION_ERROR_CODES, SessionBusinessError };