export const CREATE_UNITS_TABLE = `
  CREATE TABLE units (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    label TEXT NOT NULL UNIQUE,
    createdAt TEXT NOT NULL DEFAULT (datetime('now'))
  )
`;

export const CREATE_RESIDENTS_TABLE = `
  CREATE TABLE residents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    unitId INTEGER NOT NULL,
    fullName TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    passwordHash TEXT NOT NULL,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (unitId) REFERENCES units (id)
  )
`;

export const CREATE_GUARDS_TABLE = `
  CREATE TABLE guards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fullName TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    passwordHash TEXT NOT NULL,
    createdAt TEXT NOT NULL DEFAULT (datetime('now'))
  )
`;

export const CREATE_INVITATIONS_TABLE = `
  CREATE TABLE invitations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    residentId INTEGER NOT NULL,
    unitId INTEGER NOT NULL,
    visitorName TEXT NOT NULL,
    validFrom TEXT NOT NULL,
    validUntil TEXT NOT NULL,
    usedAt TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (residentId) REFERENCES residents (id),
    FOREIGN KEY (unitId) REFERENCES units (id)
  )
`;

export const CREATE_ENTRIES_TABLE = `
  CREATE TABLE entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invitationId INTEGER,
    unitId INTEGER NOT NULL,
    guardId INTEGER NOT NULL,
    visitorName TEXT NOT NULL,
    isManual INTEGER NOT NULL DEFAULT 0,
    enteredAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (invitationId) REFERENCES invitations (id),
    FOREIGN KEY (unitId) REFERENCES units (id),
    FOREIGN KEY (guardId) REFERENCES guards (id)
  )
`;

export const SCHEMA_STATEMENTS = [
  CREATE_UNITS_TABLE,
  CREATE_RESIDENTS_TABLE,
  CREATE_GUARDS_TABLE,
  CREATE_INVITATIONS_TABLE,
  CREATE_ENTRIES_TABLE,
];
