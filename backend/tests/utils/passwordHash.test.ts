import { hashPassword, verifyPassword } from '../../src/utils/passwordHash';

describe('passwordHash', () => {
  it('verifica correctamente una contraseña contra su propio hash', () => {
    const hash = hashPassword('correcto-caballo-batería');

    expect(verifyPassword('correcto-caballo-batería', hash)).toBe(true);
  });

  it('rechaza una contraseña incorrecta contra un hash existente', () => {
    const hash = hashPassword('correcto-caballo-batería');

    expect(verifyPassword('otra-contraseña', hash)).toBe(false);
  });

  it('genera un hash distinto cada vez por el salt aleatorio', () => {
    const hashA = hashPassword('misma-contraseña');
    const hashB = hashPassword('misma-contraseña');

    expect(hashA).not.toEqual(hashB);
  });

  it('rechaza un hash almacenado malformado sin lanzar excepción', () => {
    expect(verifyPassword('cualquier-cosa', 'hash-sin-formato-salt-dos-puntos')).toBe(false);
  });
});
