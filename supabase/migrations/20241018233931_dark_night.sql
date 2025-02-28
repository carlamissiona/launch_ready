/*
  # Create forms table

  1. New Tables
    - `forms`
      - `uuid` (uuid, primary key)
      - `user_id` (uuid, references users.uuid)
      - `description` (character varying 1000)
      - `type` (character varying 100)
      - `formcontent` (text)
      - `isdraft` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `forms` table
    - Add policy for authenticated users to read their own forms
    - Add policy for authenticated users to insert their own forms
    - Add policy for authenticated users to update their own forms
    - Add policy for authenticated users to delete their own forms
*/

CREATE TABLE IF NOT EXISTS forms (
  uuid uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(uuid) ON DELETE CASCADE,
  description character varying(1000) NOT NULL,
  type character varying(100) NOT NULL,
  formcontent text NOT NULL,
  isdraft boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own forms"
  ON forms
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own forms"
  ON forms
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own forms"
  ON forms
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own forms"
  ON forms
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);