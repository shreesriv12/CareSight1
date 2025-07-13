/*
  # CareSight Healthcare Platform Schema

  1. New Tables
    - `users`
      - `id` (uuid, primary key, references auth.users)
      - `email` (text, unique)
      - `full_name` (text)
      - `role` (text, check constraint for patient/nurse/admin)
      - `created_at` (timestamp)
    
    - `patients`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `name` (text)
      - `age` (integer)
      - `gender` (text)
      - `diagnosis` (text)
      - `medications` (text array)
      - `preferred_language` (text)
      - `communication_method` (text)
      - `photo_url` (text)
      - `assigned_nurse_id` (uuid, foreign key to users)
      - `last_emotion` (text)
      - `last_alert` (text)
      - `created_at` (timestamp)
    
    - `alerts`
      - `id` (uuid, primary key)
      - `patient_id` (uuid, foreign key to patients)
      - `type` (text)
      - `message` (text)
      - `timestamp` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for role-based access control
    - Patients can only access their own data
    - Nurses can access assigned patients
    - Admin has full access
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('patient', 'nurse', 'admin')),
  created_at timestamptz DEFAULT now()
);

-- Create patients table
CREATE TABLE IF NOT EXISTS patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  age integer DEFAULT 0,
  gender text DEFAULT '',
  diagnosis text DEFAULT '',
  medications text[] DEFAULT '{}',
  preferred_language text DEFAULT 'English',
  communication_method text DEFAULT 'verbal',
  photo_url text DEFAULT '',
  assigned_nurse_id uuid REFERENCES users(id),
  last_emotion text DEFAULT '',
  last_alert text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Create alerts table
CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'info',
  message text NOT NULL,
  timestamp timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admin can read all users"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admin can insert users"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Patients table policies
CREATE POLICY "Patients can read own data"
  ON patients
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Nurses can read assigned patients"
  ON patients
  FOR SELECT
  TO authenticated
  USING (
    assigned_nurse_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Patients can update own profile"
  ON patients
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Nurses can update assigned patients"
  ON patients
  FOR UPDATE
  TO authenticated
  USING (
    assigned_nurse_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Patients can insert own data"
  ON patients
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Alerts table policies
CREATE POLICY "Users can read relevant alerts"
  ON alerts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = patient_id AND (
        p.user_id = auth.uid() OR
        p.assigned_nurse_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM users u
          WHERE u.id = auth.uid() AND u.role = 'admin'
        )
      )
    )
  );

CREATE POLICY "Nurses and admin can insert alerts"
  ON alerts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = patient_id AND (
        p.assigned_nurse_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM users u
          WHERE u.id = auth.uid() AND u.role = 'admin'
        )
      )
    )
  );