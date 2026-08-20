import * as SecureStore from 'expo-secure-store';

import {
  createInvitation,
  getInvitation,
  listInvitations,
  validateInvitationByCode,
} from '../../src/api/invitations';

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

describe('listInvitations', () => {
  const secureStore = SecureStore as jest.Mocked<typeof SecureStore>;

  beforeEach(() => {
    jest.resetAllMocks();
    global.fetch = jest.fn();
  });

  it('llama a GET /invitations sin method ni body explícitos y propaga el resultado tipado', async () => {
    secureStore.getItemAsync.mockResolvedValue('stored-jwt-token');
    const listResponse = {
      invitations: [
        {
          id: 1,
          code: 'ABCDEFGHJKMN',
          visitorName: 'Juan Pérez',
          validFrom: '2026-01-01T10:00:00.000Z',
          validUntil: '2026-01-01T12:00:00.000Z',
          status: 'pending',
        },
      ],
    };
    (global.fetch as jest.Mock).mockResolvedValue(jsonResponse(200, listResponse));

    const result = await listInvitations();

    expect(result).toEqual(listResponse);
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('http://localhost:3000/invitations');
    expect(init.method).toBe('GET');
    expect(init.body).toBeUndefined();
  });
});

describe('getInvitation', () => {
  const secureStore = SecureStore as jest.Mocked<typeof SecureStore>;

  beforeEach(() => {
    jest.resetAllMocks();
    global.fetch = jest.fn();
  });

  it('llama a GET /invitations/<id> sin method ni body explícitos y propaga el resultado tipado', async () => {
    secureStore.getItemAsync.mockResolvedValue('stored-jwt-token');
    const detailResponse = {
      invitation: {
        id: 1,
        code: 'ABCDEFGHJKMN',
        visitorName: 'Juan Pérez',
        validFrom: '2026-01-01T10:00:00.000Z',
        validUntil: '2026-01-01T12:00:00.000Z',
        status: 'pending',
      },
    };
    (global.fetch as jest.Mock).mockResolvedValue(jsonResponse(200, detailResponse));

    const result = await getInvitation(1);

    expect(result).toEqual(detailResponse);
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('http://localhost:3000/invitations/1');
    expect(init.method).toBe('GET');
    expect(init.body).toBeUndefined();
  });
});

describe('validateInvitationByCode', () => {
  const secureStore = SecureStore as jest.Mocked<typeof SecureStore>;

  beforeEach(() => {
    jest.resetAllMocks();
    global.fetch = jest.fn();
  });

  it('llama a GET /invitations/by-code/<code-codificado> sin method ni body explícitos y propaga el resultado tipado', async () => {
    secureStore.getItemAsync.mockResolvedValue('stored-jwt-token');
    const validationResponse = {
      status: 'valid',
      invitation: {
        id: 1,
        visitorName: 'Juan Pérez',
        validFrom: '2026-01-01T10:00:00.000Z',
        validUntil: '2026-01-01T12:00:00.000Z',
      },
    };
    (global.fetch as jest.Mock).mockResolvedValue(jsonResponse(200, validationResponse));

    const result = await validateInvitationByCode('CODE WITH SPACE/SLASH');

    expect(result).toEqual(validationResponse);
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe(
      `http://localhost:3000/invitations/by-code/${encodeURIComponent('CODE WITH SPACE/SLASH')}`,
    );
    expect(init.method).toBe('GET');
    expect(init.body).toBeUndefined();
  });
});
