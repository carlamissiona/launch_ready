/*
  # Create users table

  1. New Tables
    - `users`
      - `uuid` (uuid, primary key)
      - `fullname` (character varying 300)
      - `email` (character varying 100, unique)
      - `password` (text)
      - `address` (character varying 1000)
      - `city` (character varying 100)
      - `bio` (character varying 2000)
      - `paid_user` (boolean)
      - `verification_token` (text)
      - `is_verified` (boolean)
      - `login_session` (character varying 1000)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `users` table
    - Add policy for authenticated users to read their own data
    - Add policy for authenticated users to update their own data
*/

CREATE TABLE IF NOT EXISTS users (
  uuid uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fullname character varying(300) NOT NULL,
  email character varying(100) UNIQUE NOT NULL,
  password text NOT NULL,
  address character varying(1000) DEFAULT '',
  city character varying(100) DEFAULT '',
  bio character varying(2000) DEFAULT '',
  paid_user boolean DEFAULT false,
  verification_token text,
  is_verified boolean DEFAULT false,
  login_session character varying(1000),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = uuid);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = uuid);