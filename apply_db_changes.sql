-- Add the missing columns to the reports table
ALTER TABLE reports 
ADD COLUMN IF NOT EXISTS report_type TEXT DEFAULT 'progress',
ADD COLUMN IF NOT EXISTS project_progress TEXT,
ADD COLUMN IF NOT EXISTS challenges_mitigations TEXT,
ADD COLUMN IF NOT EXISTS model_name TEXT;