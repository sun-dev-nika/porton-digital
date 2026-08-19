import * as SecureStore from 'expo-secure-store';

import { createInvitation } from '../../src/api/invitations';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

function jsonResponse(status: number, body: unknown): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response;
}

describe('createInvitation', () => {
  const secureStore = SecureStore as jest.Mocked<typeof SecureStore>;

  beforeEach(() => {
    jest.resetAllMocks();
    global.fetch = jest.fn();
  });

  it('llama a POST /invitations con visitorName, validFrom y validUntil en el body', async () => {
    secureStore.getItemAsync.mockResolvedValue('stored-jwt-token');
    const invitationResponse = {
      invitation: {
        id: 1,
        code: 'ABCDEFGHJKMN',
        visitorName: 'Juan Pérez',
        validFrom: '2026-01-01T10:00:00.000Z',
        validUntil: '2026-01-01T12:00:00.000Z',
      },
    };
    (global.fetch as jest.Mock).mockResolvedValue(jsonResponse(201, invitationResponse));

    const result = await createInvitation({
      visitorName: 'Juan Pérez',
      validFrom: '2026-01-01T10:00:00.000Z',
      validUntil: '2026-01-01T12:00:00.000Z',
    });

    expect(result).toEqual(invitationResponse);
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('http://localhost:3000/invitations');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({
      visitorName: 'Juan Pérez',
      validFrom: '2026-01-01T10:00:00.000Z',
      validUntil: '2026-01-01T12:00:00.000Z',
    });
  });
});
