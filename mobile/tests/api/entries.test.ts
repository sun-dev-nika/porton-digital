import * as SecureStore from 'expo-secure-store';

import { createManualEntry, listResidentEntries } from '../../src/api/entries';

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

describe('listResidentEntries', () => {
  const secureStore = SecureStore as jest.Mocked<typeof SecureStore>;

  beforeEach(() => {
    jest.resetAllMocks();
    global.fetch = jest.fn();
  });

  it('llama a GET /residents/me/entries sin method ni body explícitos y propaga el resultado tipado', async () => {
    secureStore.getItemAsync.mockResolvedValue('stored-jwt-token');
    const entriesResponse = {
      entries: [
        {
          id: 1,
          invitationId: 1,
          visitorName: 'Juan Pérez',
          enteredAt: '2026-01-02T10:00:00.000Z',
        },
      ],
    };
    (global.fetch as jest.Mock).mockResolvedValue(jsonResponse(200, entriesResponse));

    const result = await listResidentEntries();

    expect(result).toEqual(entriesResponse);
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('http://localhost:3000/residents/me/entries');
    expect(init.method).toBe('GET');
    expect(init.body).toBeUndefined();
  });
});

describe('createManualEntry', () => {
  const secureStore = SecureStore as jest.Mocked<typeof SecureStore>;

  beforeEach(() => {
    jest.resetAllMocks();
    global.fetch = jest.fn();
  });

  it('llama a POST /entries/manual con el body esperado y propaga el resultado tipado', async () => {
    secureStore.getItemAsync.mockResolvedValue('stored-jwt-token');
    const manualEntryResponse = {
      entry: {
        id: 1,
        invitationId: null,
        unitId: 1,
        guardId: 1,
        visitorName: 'Juan Pérez',
        isManual: true,
        enteredAt: '2026-01-02T10:00:00.000Z',
      },
    };
    (global.fetch as jest.Mock).mockResolvedValue(jsonResponse(201, manualEntryResponse));

    const result = await createManualEntry({ visitorName: 'Juan Pérez', unitLabel: '101' });

    expect(result).toEqual(manualEntryResponse);
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('http://localhost:3000/entries/manual');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ visitorName: 'Juan Pérez', unitLabel: '101' });
  });
});
