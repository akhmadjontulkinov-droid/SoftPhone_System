/*
  # Add call status to call logs

  1. Changes
    - Add `call_status` column to `call_logs` table
      - Type: text
      - Values: 'answered' or 'declined'
      - Default: 'answered'
    
  2. Notes
    - This column tracks whether a call was successfully picked up or declined
    - Existing records will default to 'answered' status
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'call_logs' AND column_name = 'call_status'
  ) THEN
    ALTER TABLE call_logs ADD COLUMN call_status text DEFAULT 'answered';
  END IF;
END $$;