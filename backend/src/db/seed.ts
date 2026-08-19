import { DatabaseSync } from 'node:sqlite';

import { hashPassword } from '../utils/passwordHash';

// Contraseña de desarrollo documentada para los usuarios sembrados; solo válida en local/test.
export const DEV_SEED_PASSWORD = 'dev-password-123';

export function seedDevelopmentData(db: DatabaseSync): void {
  const devPasswordHash = hashPassword(DEV_SEED_PASSWORD);

  const insertUnit = db.prepare('INSERT INTO units (label) VALUES (?)');
  const unitId = insertUnit.run('101').lastInsertRowid;

  const insertResident = db.prepare(
    'INSERT INTO residents (unitId, fullName, email, passwordHash) VALUES (?, ?, ?, ?)',
  );
  insertResident.run(unitId, 'Residente de Prueba', 'resident@dev.local', devPasswordHash);

  const insertGuard = db.prepare(
    'INSERT INTO guards (fullName, email, passwordHash) VALUES (?, ?, ?)',
  );
  insertGuard.run('Guardia de Prueba', 'guard@dev.local', devPasswordHash);
}
