-- Create users table
CREATE TABLE IF NOT EXISTS users (
  uuid uuid PRIMARY KEY,
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

-- Create forms table
CREATE TABLE IF NOT EXISTS forms (
  uuid uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(uuid) ON DELETE CASCADE,
  description character varying(1000) NOT NULL,
  type character varying(100) NOT NULL,
  formcontent text NOT NULL,
  isdraft boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);