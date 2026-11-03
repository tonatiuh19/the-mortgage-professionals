-- Scheduler offers phone calls and office visits only. Existing video meetings keep their type.
ALTER TABLE scheduled_meetings
  MODIFY COLUMN meeting_type enum('phone','video','teams','office') NOT NULL DEFAULT 'phone';

ALTER TABLE scheduler_settings
  ADD COLUMN allow_office tinyint(1) NOT NULL DEFAULT 1 AFTER allow_phone;

UPDATE scheduler_settings
SET allow_video = 0, allow_teams = 0
WHERE tenant_id = 2;
