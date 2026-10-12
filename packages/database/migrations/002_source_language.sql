-- Adds an explicit spoken/source language to meetings so a user-selected
-- language can drive transcription instead of relying only on auto-detection.
-- Idempotent: safe to run multiple times.
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS source_language VARCHAR(10);
