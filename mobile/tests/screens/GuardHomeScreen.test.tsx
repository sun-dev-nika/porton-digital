import { fireEvent, render } from '@testing-library/react-native';

import { GuardHomeScreen } from '../../src/screens/GuardHomeScreen';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe('GuardHomeScreen', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('navega a /scan al presionar el control de escaneo', () => {
    const view = render(<GuardHomeScreen />);

    fireEvent.press(view.getByTestId('guard-home-scan-button'));

    expect(mockPush).toHaveBeenCalledWith('/scan');
  });

  it('navega a /manualEntry al presionar el control de registro manual (R11)', () => {
    const view = render(<GuardHomeScreen />);

    fireEvent.press(view.getByTestId('guard-home-manual-entry-button'));

    expect(mockPush).toHaveBeenCalledWith('/manualEntry');
  });
});
