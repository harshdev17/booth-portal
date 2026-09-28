-- Migration 0001: Authentication + RBAC foundation
-- Scope: admin/staff identity, roles, permissions, sessions, audit logging.
-- Applicant-facing tables, applications, payments, inventory, draw, allotment,
-- documents, and QR verification are added in later migrations once their
-- business rules are confirmed (see .ai/OPEN_QUESTIONS.md).
--
-- Engine/charset chosen for MySQL/MariaDB compatibility (Hostinger target).

SET NAMES utf8mb4;

-- -----------------------------------------------------------------------
-- roles: named permission bundles (Super Admin, Admin, Allotment Staff, ...)
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `key`         VARCHAR(64)  NOT NULL UNIQUE, -- e.g. 'super_admin', 'admin'
  name          VARCHAR(128) NOT NULL,
  description   VARCHAR(512) NULL,
  is_system     TINYINT(1)   NOT NULL DEFAULT 0, -- system roles cannot be deleted
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------------------
-- permissions: explicit permission catalogue (see .ai/RBAC.md Section 2)
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS permissions (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `key`         VARCHAR(64)  NOT NULL UNIQUE, -- e.g. 'application:approve'
  description   VARCHAR(512) NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------------------
-- role_permissions: many-to-many role <-> permission
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id       BIGINT UNSIGNED NOT NULL,
  permission_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------------------
-- users: internal KDB staff/admin accounts only.
-- Applicant accounts are a separate concern (future migration) — this table
-- is not shared with the public applicant portal's identity model.
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  full_name         VARCHAR(191)  NOT NULL,
  email             VARCHAR(191)  NOT NULL UNIQUE,
  password_hash     VARCHAR(255)  NOT NULL, -- bcrypt hash, never plaintext, never logged
  role_id           BIGINT UNSIGNED NOT NULL,
  status            ENUM('active', 'disabled') NOT NULL DEFAULT 'active',
  failed_login_count INT UNSIGNED NOT NULL DEFAULT 0,
  locked_until      DATETIME NULL, -- basic brute-force lockout support
  last_login_at     DATETIME NULL,
  password_changed_at DATETIME NULL,
  must_change_password TINYINT(1) NOT NULL DEFAULT 0,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT,
  INDEX idx_users_role_id (role_id),
  INDEX idx_users_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------------------
-- sessions: server-side session registry. The session cookie carries only
-- a signed, random session id (see src/lib/auth/session.ts) — this table
-- lets sessions be revoked server-side (logout everywhere, disable user).
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
  id            VARCHAR(64)  NOT NULL PRIMARY KEY, -- random session id, not the cookie's signature
  user_id       BIGINT UNSIGNED NOT NULL,
  ip_address    VARCHAR(64)  NULL, -- populated only if IP logging is approved, see .ai/OPEN_QUESTIONS.md
  user_agent    VARCHAR(512) NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at    DATETIME     NOT NULL,
  revoked_at    DATETIME     NULL,
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_sessions_user_id (user_id),
  INDEX idx_sessions_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------------------
-- audit_logs: append-only. No UPDATE/DELETE should ever be issued against
-- this table by application code (see .ai/AUDIT_LOGS.md Section 4).
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  actor_user_id BIGINT UNSIGNED NULL, -- NULL for unauthenticated events (e.g. failed login)
  actor_role_key VARCHAR(64) NULL,
  action        VARCHAR(128) NOT NULL, -- e.g. 'auth.login.success', 'auth.login.failed', 'role.updated'
  module        VARCHAR(64)  NOT NULL, -- e.g. 'auth', 'rbac'
  entity_type   VARCHAR(64)  NULL,
  entity_id     VARCHAR(64)  NULL,
  previous_value JSON        NULL,
  new_value     JSON         NULL,
  ip_address    VARCHAR(64)  NULL, -- see .ai/OPEN_QUESTIONS.md — only if approved
  user_agent    VARCHAR(512) NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_logs_actor FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_audit_actor (actor_user_id),
  INDEX idx_audit_module_action (module, action),
  INDEX idx_audit_entity (entity_type, entity_id),
  INDEX idx_audit_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
