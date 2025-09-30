/*
  # Fix RLS policies for call_logs table
  
  1. Changes
    - Drop existing policies that require authentication
    - Add new policies that allow anonymous access
    - Allow public access for SELECT, INSERT, and UPDATE operations
  
  2. Security Note
    - This allows anonymous users to interact with call logs
    - Suitable for demo/testing environments
    - For production, implement proper authentication
*/

DROP POLICY IF EXISTS "Anyone can view call logs" ON call_logs;
DROP POLICY IF EXISTS "Anyone can insert call logs" ON call_logs;
DROP POLICY IF EXISTS "Anyone can update call logs" ON call_logs;

CREATE POLICY "Public can view call logs"
  ON call_logs FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public can insert call logs"
  ON call_logs FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Public can update call logs"
  ON call_logs FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);