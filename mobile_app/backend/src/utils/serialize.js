function serializeUser(user) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role.toLowerCase(),
    identifier: user.identifier,
    groupId: user.groupId,
    groupName: user.group ? user.group.name : null,
    isActive: user.isActive,
  };
}

function serializeSession(session) {
  return {
    id: session.id,
    moduleId: session.moduleId,
    moduleName: session.module ? session.module.name : null,
    professorId: session.professorId,
    professorName: session.professor
      ? `${session.professor.firstName} ${session.professor.lastName}`
      : null,
    groupId: session.groupId,
    groupName: session.group ? session.group.name : null,
    roomId: session.roomId,
    roomName: session.room ? session.room.name : null,
    sessionDate: session.sessionDate.toISOString().slice(0, 10),
    startTime: session.startTime,
    endTime: session.endTime,
    status: session.status.toLowerCase(),
    currentQrToken: session.currentQrToken,
    qrTokenExpiresAt: session.qrTokenExpiresAt
      ? session.qrTokenExpiresAt.toISOString()
      : null,
    presentCount: session.presentCount,
    absentCount: session.absentCount,
    lateCount: session.lateCount,
    totalMarked: session.presentCount + session.absentCount + session.lateCount,
  };
}

module.exports = { serializeUser, serializeSession };
