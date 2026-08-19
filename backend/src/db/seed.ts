import { DatabaseSync } from 'node:sqlite';

const DEV_PASSWORD_HASH = 'dev-only-placeholder-hash';

export function seedDevelopmentData(db: DatabaseSync): void {
  const insertUnit = db.prepare('INSERT INTO units (label) VALUES (?)');
  const unitId = insertUnit.run('101').lastInsertRowid;

  const insertResident = db.prepare(
    'INSERT INTO residents (unitId, fullName, email, passwordHash) VALUES (?, ?, ?, ?)',
  );
  insertResident.run(unitId, 'Residente de Prueba', 'resident@dev.local', DEV_PASSWORD_HASH);

  const insertGuard = db.prepare(
    'INSERT INTO guards (fullName, email, passwordHash) VALUES (?, ?, ?)',
  );
  insertGuard.run('Guardia de Prueba', 'guard@dev.local', DEV_PASSWORD_HASH);
}
