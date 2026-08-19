import { getRoleHomeRoute } from '../../src/hooks/useLogin';

describe('getRoleHomeRoute', () => {
  it('devuelve /residentHome para el rol resident', () => {
    expect(getRoleHomeRoute('resident')).toBe('/residentHome');
  });

  it('devuelve /guardHome para el rol guard', () => {
    expect(getRoleHomeRoute('guard')).toBe('/guardHome');
  });
});
