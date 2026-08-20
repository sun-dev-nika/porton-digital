import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';

import {
  parseNotificationInvitationId,
  useNotificationDeepLink,
} from '../../src/hooks/useNotificationDeepLink';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

let capturedListener: ((response: unknown) => void) | undefined;
const mockRemove = jest.fn();

jest.mock('expo-notifications', () => ({
  addNotificationResponseReceivedListener: jest.fn(),
  getLastNotificationResponseAsync: jest.fn(),
}));

const mockedAddNotificationResponseReceivedListener =
  Notifications.addNotificationResponseReceivedListener as jest.Mock;
const mockedGetLastNotificationResponseAsync =
  Notifications.getLastNotificationResponseAsync as jest.Mock;

function buildResponse(data: unknown): unknown {
  return { notification: { request: { content: { data } } } };
}

describe('parseNotificationInvitationId', () => {
  it('devuelve el id como string para un número (R9)', () => {
    expect(parseNotificationInvitationId({ invitationId: 42 })).toBe('42');
  });

  it('devuelve el id como string para un string no vacío (R9)', () => {
    expect(parseNotificationInvitationId({ invitationId: '42' })).toBe('42');
  });

  it('devuelve null para un objeto sin invitationId (R10)', () => {
    expect(parseNotificationInvitationId({})).toBeNull();
  });

  it('devuelve null para invitationId null (R10)', () => {
    expect(parseNotificationInvitationId({ invitationId: null })).toBeNull();
  });

  it('devuelve null para invitationId string vacío o solo espacios (R10)', () => {
    expect(parseNotificationInvitationId({ invitationId: '' })).toBeNull();
    expect(parseNotificationInvitationId({ invitationId: '   ' })).toBeNull();
  });

  it('devuelve null para data null, undefined o no-objeto (R10)', () => {
    expect(parseNotificationInvitationId(null)).toBeNull();
    expect(parseNotificationInvitationId(undefined)).toBeNull();
    expect(parseNotificationInvitationId('texto')).toBeNull();
  });
});

describe('useNotificationDeepLink', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedListener = undefined;
    mockedAddNotificationResponseReceivedListener.mockImplementation((listener) => {
      capturedListener = listener;
      return { remove: mockRemove };
    });
    mockedGetLastNotificationResponseAsync.mockResolvedValue(null);
  });

  it('navega a invitationDetail cuando el listener recibe un invitationId válido (R9)', () => {
    renderHook(() => useNotificationDeepLink());

    capturedListener!(buildResponse({ invitationId: 7 }));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/invitationDetail',
      params: { id: '7' },
    });
  });

  it('no navega cuando el listener recibe un payload sin invitationId válido (R10)', () => {
    renderHook(() => useNotificationDeepLink());

    capturedListener!(buildResponse({}));

    expect(mockPush).not.toHaveBeenCalled();
  });
});

describe('useNotificationDeepLink — arranque en frío', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedListener = undefined;
    mockedAddNotificationResponseReceivedListener.mockImplementation((listener) => {
      capturedListener = listener;
      return { remove: mockRemove };
    });
  });

  it('navega exactamente una vez cuando getLastNotificationResponseAsync resuelve con un invitationId válido (R11)', async () => {
    mockedGetLastNotificationResponseAsync.mockResolvedValueOnce(
      buildResponse({ invitationId: 7 }),
    );

    renderHook(() => useNotificationDeepLink());

    await waitFor(() => expect(mockPush).toHaveBeenCalledTimes(1));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/invitationDetail',
      params: { id: '7' },
    });
  });

  it('no navega cuando getLastNotificationResponseAsync resuelve con null (arranque normal) (R12)', async () => {
    mockedGetLastNotificationResponseAsync.mockResolvedValueOnce(null);

    renderHook(() => useNotificationDeepLink());

    await waitFor(() => expect(mockedGetLastNotificationResponseAsync).toHaveBeenCalledTimes(1));
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('no navega cuando getLastNotificationResponseAsync resuelve con un payload inválido (R12)', async () => {
    mockedGetLastNotificationResponseAsync.mockResolvedValueOnce(buildResponse({}));

    renderHook(() => useNotificationDeepLink());

    await waitFor(() => expect(mockedGetLastNotificationResponseAsync).toHaveBeenCalledTimes(1));
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('no navega tras desmontar el hook antes de que la promesa resuelva (guarda isActive)', async () => {
    let resolvePromise: (value: unknown) => void;
    mockedGetLastNotificationResponseAsync.mockReturnValueOnce(
      new Promise((resolve) => {
        resolvePromise = resolve;
      }),
    );

    const { unmount } = renderHook(() => useNotificationDeepLink());
    unmount();

    await act(async () => {
      resolvePromise!(buildResponse({ invitationId: 7 }));
      await Promise.resolve();
    });

    expect(mockPush).not.toHaveBeenCalled();
  });
});
