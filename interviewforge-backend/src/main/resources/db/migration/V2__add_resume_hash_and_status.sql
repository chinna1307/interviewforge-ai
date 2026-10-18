-- Migration: Add content hash, processing status, and failure reason to resumes table
-- Safe for execution on PostgreSQL / Supabase with existing data

ALTER TABLE resumes ADD COLUMN IF NOT EXISTS file_hash VARCHAR(64);
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS processing_status VARCHAR(20) DEFAULT 'READY';
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS failure_reason TEXT;

-- Update existing records to READY if status is null
UPDATE resumes SET processing_status = 'READY' WHERE processing_status IS NULL;

-- Unique index on (user_id, file_hash) to prevent duplicate uploads per user
-- We use a partial index where file_hash is not null to preserve legacy records with null hash
CREATE UNIQUE INDEX IF NOT EXISTS uq_resumes_user_file_hash 
ON resumes (user_id, file_hash) 
WHERE file_hash IS NOT NULL;
