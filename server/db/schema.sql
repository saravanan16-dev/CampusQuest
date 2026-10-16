-- CampusQuest schema (MySQL 8+)
CREATE DATABASE IF NOT EXISTS campusquest CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE campusquest;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL,
  password_hash VARCHAR(100) NOT NULL,
  role ENUM('student','teacher','admin') NOT NULL DEFAULT 'student',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS classes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  academic_year VARCHAR(20) NOT NULL,
  section VARCHAR(20) NOT NULL DEFAULT 'A',
  UNIQUE KEY uq_classes (name, academic_year, section)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS student_enrollments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  class_id INT NOT NULL,
  student_id INT NOT NULL,
  UNIQUE KEY uq_enrollment (class_id, student_id),
  CONSTRAINT fk_enr_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE RESTRICT,
  CONSTRAINT fk_enr_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS subjects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(30) NOT NULL,
  name VARCHAR(150) NOT NULL,
  UNIQUE KEY uq_subjects_code (code)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS teacher_assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  teacher_id INT NOT NULL,
  class_id INT NOT NULL,
  subject_id INT NOT NULL,
  UNIQUE KEY uq_assignment (teacher_id, class_id, subject_id),
  CONSTRAINT fk_ta_teacher FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_ta_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE RESTRICT,
  CONSTRAINT fk_ta_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS topics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  subject_id INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  UNIQUE KEY uq_topic (subject_id, name),
  CONSTRAINT fk_topic_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS resources (
  id INT AUTO_INCREMENT PRIMARY KEY,
  subject_id INT NOT NULL,
  class_id INT NOT NULL,
  topic_id INT NULL,
  title VARCHAR(200) NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  uploaded_by INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_res_class_subject (class_id, subject_id),
  KEY ix_res_topic (topic_id),
  CONSTRAINT fk_res_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE RESTRICT,
  CONSTRAINT fk_res_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE RESTRICT,
  CONSTRAINT fk_res_topic FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE SET NULL,
  CONSTRAINT fk_res_user FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  subject_id INT NOT NULL,
  topic_id INT NOT NULL,
  text TEXT NOT NULL,
  type ENUM('mcq','true_false') NOT NULL DEFAULT 'mcq',
  options JSON NOT NULL,
  correct_answer VARCHAR(255) NOT NULL,
  difficulty ENUM('easy','medium','hard') NOT NULL DEFAULT 'medium',
  explanation TEXT NULL,
  archived TINYINT(1) NOT NULL DEFAULT 0,
  created_by INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_q_topic (topic_id),
  KEY ix_q_subject_diff (subject_id, difficulty),
  CONSTRAINT fk_q_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE RESTRICT,
  CONSTRAINT fk_q_topic FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE RESTRICT,
  CONSTRAINT fk_q_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS assessments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  class_id INT NOT NULL,
  subject_id INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  created_by INT NOT NULL,
  opens_at DATETIME NULL,
  closes_at DATETIME NULL,
  duration_min INT NULL,
  status ENUM('draft','published','closed') NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_asm (class_id, subject_id, status),
  CONSTRAINT fk_asm_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE RESTRICT,
  CONSTRAINT fk_asm_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE RESTRICT,
  CONSTRAINT fk_asm_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS assessment_questions (
  assessment_id INT NOT NULL,
  question_id INT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  marks INT NOT NULL DEFAULT 1,
  PRIMARY KEY (assessment_id, question_id),
  CONSTRAINT fk_aq_asm FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
  CONSTRAINT fk_aq_q FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS submissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  assessment_id INT NOT NULL,
  student_id INT NOT NULL,
  started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  submitted_at DATETIME NULL,
  total_score INT NULL,
  max_score INT NULL,
  UNIQUE KEY uq_submission (assessment_id, student_id),
  KEY ix_sub_student (student_id, submitted_at),
  CONSTRAINT fk_sub_asm FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE RESTRICT,
  CONSTRAINT fk_sub_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS submission_answers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  submission_id INT NOT NULL,
  question_id INT NOT NULL,
  selected_answer VARCHAR(255) NULL,
  is_correct TINYINT(1) NOT NULL DEFAULT 0,
  marks_awarded INT NOT NULL DEFAULT 0,
  UNIQUE KEY uq_sub_answer (submission_id, question_id),
  KEY ix_sa_question (question_id),
  CONSTRAINT fk_sa_sub FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE RESTRICT,
  CONSTRAINT fk_sa_q FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Practice attempts outside assessments (used by the improvement loop)
CREATE TABLE IF NOT EXISTS practice_attempts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  question_id INT NOT NULL,
  selected_answer VARCHAR(255) NULL,
  is_correct TINYINT(1) NOT NULL DEFAULT 0,
  attempted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_pa_student (student_id, question_id),
  CONSTRAINT fk_pa_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_pa_q FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE RESTRICT
) ENGINE=InnoDB;
