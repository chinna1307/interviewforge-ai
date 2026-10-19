-- ==============================================================================
-- Migration: V3__one_active_resume_per_user.sql
-- Goal: Enforce exactly one active resume per user at the database level
-- Target: Supabase PostgreSQL 17 / pgvector
-- Safe & Non-Destructive: Preserves existing primary keys, foreign keys, metadata,
--                         and all existing rows without dropping tables or deleting data.
-- ==============================================================================

-- ==============================================================================
-- SECTION 1: READ-ONLY PREVIEW QUERY
-- Run this query FIRST in Supabase SQL Editor.
-- It does NOT modify any data. It displays the exact candidate that will be chosen
-- for each user, the priority tier, and the reason it was selected.
-- ==============================================================================
/*
WITH ranked_candidates AS (
    SELECT 
        r.id,
        r.user_id,
        r.file_name,
        r.processing_status,
        r.is_active AS currently_active,
        (r.extracted_text IS NOT NULL AND length(trim(r.extracted_text)) > 0) AS has_extracted_text,
        r.uploaded_at,
        CASE 
            WHEN r.processing_status = 'READY' THEN 1
            WHEN r.processing_status IS NULL AND r.extracted_text IS NOT NULL AND length(trim(r.extracted_text)) > 0 THEN 2
            WHEN r.processing_status IS NULL THEN 3
            WHEN r.processing_status = 'FAILED' AND r.extracted_text IS NOT NULL AND length(trim(r.extracted_text)) > 0 THEN 4
            WHEN r.processing_status = 'FAILED' THEN 5
            ELSE 6
        END AS priority_tier,
        CASE 
            WHEN r.processing_status = 'READY' 
                THEN '1. Confirmed READY resume with active indexing'
            WHEN r.processing_status IS NULL AND r.extracted_text IS NOT NULL AND length(trim(r.extracted_text)) > 0 
                THEN '2. Eligible legacy resume with extracted text (newest eligible)'
            WHEN r.processing_status IS NULL 
                THEN '3. Legacy resume without extracted text'
            WHEN r.processing_status = 'FAILED' AND r.extracted_text IS NOT NULL AND length(trim(r.extracted_text)) > 0 
                THEN '4. Fallback: newest FAILED resume with extracted text (no READY or legacy resumes exist)'
            WHEN r.processing_status = 'FAILED' 
                THEN '5. Fallback: newest FAILED resume without extracted text'
            ELSE '6. Fallback: other unindexed resume'
        END AS selection_reason,
        ROW_NUMBER() OVER (
            PARTITION BY r.user_id
            ORDER BY 
                CASE 
                    WHEN r.processing_status = 'READY' THEN 1
                    WHEN r.processing_status IS NULL AND r.extracted_text IS NOT NULL AND length(trim(r.extracted_text)) > 0 THEN 2
                    WHEN r.processing_status IS NULL THEN 3
                    WHEN r.processing_status = 'FAILED' AND r.extracted_text IS NOT NULL AND length(trim(r.extracted_text)) > 0 THEN 4
                    WHEN r.processing_status = 'FAILED' THEN 5
                    ELSE 6
                END ASC,
                r.uploaded_at DESC NULLS LAST,
                r.id DESC
        ) AS rank_in_user
    FROM public.resumes r
)
SELECT 
    user_id,
    id AS selected_candidate_resume_id,
    file_name,
    processing_status,
    has_extracted_text,
    uploaded_at,
    currently_active,
    CASE 
        WHEN currently_active = true THEN 'NO CHANGE (Already active)'
        ELSE 'WILL BE ACTIVATED (Replacing previous active state)'
    END AS action_preview,
    selection_reason
FROM ranked_candidates
WHERE rank_in_user = 1
ORDER BY user_id ASC;
*/

-- ==============================================================================
-- SECTION 2: SAFE, IDEMPOTENT MIGRATION SCRIPT
-- ==============================================================================

-- Step 1: Add is_active column if not already present
ALTER TABLE public.resumes 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT false;

-- Step 2: Ensure exactly ONE active resume per user using strict priority:
--   Priority 1: Confirmed READY resume (newest if multiple exist)
--   Priority 2: Eligible legacy resume with processing_status IS NULL and non-empty extracted_text (newest eligible)
--   Priority 3: Legacy resume with processing_status IS NULL (without text)
--   Priority 4: Fallback: FAILED resume with extracted_text (only if no READY or legacy resume exists)
--   Priority 5: Fallback: FAILED resume without text
--
-- Setting `is_active = (r.id IN (...))` ensures that for each user:
--   - The single selected candidate gets `is_active = true`
--   - All other resumes (including older legacy or previously marked active failed resumes) get `is_active = false`
-- This makes the migration 100% idempotent and safe to rerun at any time.
WITH candidate_active_resumes AS (
    SELECT DISTINCT ON (user_id) id
    FROM public.resumes
    ORDER BY user_id,
             CASE 
                 WHEN processing_status = 'READY' THEN 1
                 WHEN processing_status IS NULL AND extracted_text IS NOT NULL AND length(trim(extracted_text)) > 0 THEN 2
                 WHEN processing_status IS NULL THEN 3
                 WHEN processing_status = 'FAILED' AND extracted_text IS NOT NULL AND length(trim(extracted_text)) > 0 THEN 4
                 WHEN processing_status = 'FAILED' THEN 5
                 ELSE 6
             END ASC,
             uploaded_at DESC NULLS LAST,
             id DESC
)
UPDATE public.resumes r
SET is_active = (r.id IN (SELECT id FROM candidate_active_resumes));

-- Step 3: Set failure_reason for active resumes that lack vector indexing so users understand why retry is available
UPDATE public.resumes
SET failure_reason = 'Vector indexing incomplete. Please retry indexing to enable full AI interview features.'
WHERE is_active = true 
  AND (processing_status IS NULL OR processing_status = 'FAILED')
  AND (failure_reason IS NULL OR failure_reason = '');

-- Step 4: Create partial unique index enforcing at most one active resume per user
-- Rows with is_active = false (staged uploads, failed attempts, retired) are excluded
CREATE UNIQUE INDEX IF NOT EXISTS uq_resumes_one_active_per_user 
ON public.resumes (user_id) 
WHERE (is_active = true);

-- Step 5: Create index for rapid active resume lookups by user and status
CREATE INDEX IF NOT EXISTS idx_resumes_user_active_status 
ON public.resumes (user_id, is_active, processing_status);

-- ==============================================================================
-- SECTION 3: POST-MIGRATION VERIFICATION QUERIES
-- ==============================================================================
-- 1. Confirm unique partial index exists:
--    SELECT indexname, indexdef 
--    FROM pg_indexes 
--    WHERE schemaname = 'public' AND tablename = 'resumes' AND indexname = 'uq_resumes_one_active_per_user';
--
-- 2. Verify that every user has at most 1 active resume:
--    SELECT user_id, count(*) 
--    FROM public.resumes 
--    WHERE is_active = true 
--    GROUP BY user_id 
--    HAVING count(*) > 1;
--
-- 3. Check User 1 records: Record #6 is active, #1-#5 inactive, #7-#9 inactive FAILED:
--    SELECT id, user_id, file_name, processing_status, is_active, failure_reason
--    FROM public.resumes 
--    WHERE user_id = 1
--    ORDER BY id ASC;
-- ==============================================================================

-- ==============================================================================
-- SECTION 4: ROLLBACK SCRIPT & RECOVERY OPTIONS
-- ==============================================================================
-- Level 1: Non-Destructive Constraint Relax (RECOMMENDED if constraint conflicts occur)
-- Drops the unique and lookup indexes without losing the `is_active` column or application state.
-- Backend queries (r.is_active) continue to function without crashing.
--
-- DROP INDEX IF EXISTS public.idx_resumes_user_active_status;
-- DROP INDEX IF EXISTS public.uq_resumes_one_active_per_user;
--
-- Level 2: State Reversion (Reverts active flag for User 1 back to prior state without dropping column)
-- UPDATE public.resumes SET is_active = (id = 9) WHERE user_id = 1;
--
-- Level 3: Destructive Rollback (WARNING: Only use if rolling back backend code to commit 1f4194d)
-- Dropping `is_active` discards all active/inactive tracking and will cause runtime errors
-- in any backend version that contains the `active` property on Resume entity.
--
-- DROP INDEX IF EXISTS public.idx_resumes_user_active_status;
-- DROP INDEX IF EXISTS public.uq_resumes_one_active_per_user;
-- ALTER TABLE public.resumes DROP COLUMN IF EXISTS is_active;
-- ==============================================================================

