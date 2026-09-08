# SGAU Backend (Node/Express + MySQL)

## Local dev (Windows)
1) Start MySQL (WAMP)
2) Install dependencies
3) Run Prisma migration
4) Optionally seed an admin user
5) Start API

## Commands
- `npm install`
- `npm run prisma:migrate`
- `npm run seed`
- `npm run dev`

## API base URL
All endpoints are served under `/api`.

## Recurring sessions API
The recurring-session module uses a parent `session_master` plus `session_exception` records.

### Read a week projection
`GET /api/recurring-sessions/week/2026-10-12`

### Delete one occurrence
`POST /api/recurring-sessions/masters/:masterId/occurrences/2026-10-12/delete`

```json
{ "note": "Holiday closure" }
```

### Edit one occurrence
`POST /api/recurring-sessions/masters/:masterId/occurrences/2026-10-12/edit`

```json
{
	"overrideDate": "2026-10-19",
	"startTime": "14:00",
	"endTime": "16:00",
	"roomId": "room-2"
}
```

### Edit the series from a pivot date
`POST /api/recurring-sessions/masters/:masterId/edit-from/2026-10-19`

```json
{
	"startTime": "14:00",
	"endTime": "16:00",
	"roomId": "room-2"
}
```

### Delete the series from a pivot date
`POST /api/recurring-sessions/masters/:masterId/delete-from/2026-10-19`

### Archive the whole series
`POST /api/recurring-sessions/masters/:masterId/archive`

### Error codes
- `SESSION_NOT_FOUND`
- `SERIES_NOT_FOUND`
- `OCCURRENCE_NOT_FOUND`
- `CONFLICT_TEACHER`
- `CONFLICT_ROOM`
- `CONFLICT_GROUP`
- `INVALID_SCOPE`
- `PAST_OCCURRENCE_LOCKED`

### Behavior rules
- Occurrences inherit from `session_master`.
- `deleted` exceptions hide one occurrence without deleting the parent.
- `modified` exceptions override only the supplied fields.
- A change from a pivot date splits the series by closing the old master and creating a successor master.
- Archived series remain historized and can still be projected when requested explicitly.

## Env
Create `.env` from `.env.example` and update values.
