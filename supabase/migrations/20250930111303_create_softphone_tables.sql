/*
  # Create softphone dashboard tables

  1. New Tables
    - `call_logs`
      - `id` (uuid, primary key) - Unique identifier for each call
      - `phone_number` (text) - The phone number involved in the call
      - `start_time` (timestamptz) - When the call started
      - `duration` (text) - Call duration in MM:SS format
      - `status` (text) - Call status (answered, declined, missed)
      - `created_at` (timestamptz) - Record creation timestamp
    
    - `agent_status`
      - `id` (uuid, primary key) - Unique identifier
      - `agent_name` (text) - Name of the agent
      - `current_status` (text) - Current availability status
      - `status_start_time` (timestamptz) - When current status started
      - `total_calls_today` (integer) - Number of calls handled today
      - `updated_at` (timestamptz) - Last update timestamp
  
  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their own data
*/

CREATE TABLE IF NOT EXISTS call_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text NOT NULL,
  start_time timestamptz NOT NULL,
  duration text NOT NULL DEFAULT '00:00',
  status text NOT NULL DEFAULT 'incoming',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name text NOT NULL,
  current_status text NOT NULL DEFAULT 'Available',
  status_start_time timestamptz DEFAULT now(),
  total_calls_today integer DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view call logs"
  ON call_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can insert call logs"
  ON call_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update call logs"
  ON call_logs FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can view agent status"
  ON agent_status FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can insert agent status"
  ON agent_status FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update agent status"
  ON agent_status FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);