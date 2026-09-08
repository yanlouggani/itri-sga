-- ============================================================
-- ITRI Academy — IMPORT OPTIONNEL : weekly_entries → session_masters
-- ============================================================
-- Convertit l'existant (modèle hebdomadaire à héritage) en séries
-- récurrentes. À exécuter UNIQUEMENT après migration_session_masters.sql.
--
-- APPROXIMATION ASSUMÉE :
--   weekly_entries hérite par (groupid, dayofweek, starttime) : la ligne au
--   week_start le plus élevé ≤ semaine cible fait foi. L'historique des forks
--   (changements de prof/salle/heure) n'est PAS reproduit.
--   → Pour chaque créneau EFFECTIF de la semaine la plus récente, une série
--     est créée à partir de cette semaine (effective_end_date = NULL).
--   Les séries s'appliquent donc au présent et au futur ; le passé reste
--   consultable dans weekly_entries (table conservée).
--
-- Idempotent : les séries importées portent series_key 'legacy_...' et sont
-- simplement re-créées si la procédure est relancée (DROP d'abord).

-- Nettoyage des éventuelles précédentes importations
delete from session_exceptions where master_id in (
  select id from session_masters where series_key like 'legacy_%'
);
delete from session_masters where series_key like 'legacy_%';

with max_week as (
  select max(week_start) as w from weekly_entries
),
latest as (
  select distinct on (groupid, dayofweek, starttime)
    groupid, dayofweek, starttime, endtime, professorid, roomid
  from weekly_entries
  where week_start = (select w from max_week)
  order by groupid, dayofweek, starttime, week_start desc
)
insert into session_masters (
  series_key, parent_master_id, moduleid, professorid, groupid, roomid,
  weekday, starttime, endtime, effective_start_date, effective_end_date,
  status
)
select
  'legacy_' || g.moduleid::text || '_' || l.groupid::text
    || '_' || l.dayofweek || '_' || to_char(l.starttime, 'HH24MI'),
  null,
  g.moduleid,
  l.professorid,
  l.groupid,
  l.roomid,
  l.dayofweek,
  l.starttime,
  l.endtime,
  (select w from max_week),
  null,
  'active'
from latest l
join groups g on g.id = l.groupid
where l.professorid is not null
  and l.roomid is not null
  and g.moduleid is not null;

-- NOTE : les créneaux sans prof/salle/module sont ignorés (une série exige
-- ces trois références, contrairement aux weekly_entries qui les tolèrent NULL).
