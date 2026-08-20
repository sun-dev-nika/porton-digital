import { Text, View } from 'react-native';

import { useDailyLog } from '../hooks/useDailyLog';

export function DailyLogScreen(): JSX.Element {
  const { isLoading, error, entries } = useDailyLog();

  return (
    <View>
      {isLoading ? <Text testID="daily-log-loading">Cargando...</Text> : null}
      {error !== null ? <Text testID="daily-log-error">{error}</Text> : null}
      {error === null
        ? entries.map((entry) => (
            <View key={entry.id} testID={`daily-log-item-${entry.id}`}>
              <Text testID={`daily-log-unit-${entry.id}`}>{entry.unitLabel}</Text>
              <Text testID={`daily-log-visitor-${entry.id}`}>{entry.visitorName}</Text>
              <Text testID={`daily-log-time-${entry.id}`}>{entry.enteredAt}</Text>
              <Text testID={`daily-log-source-${entry.id}`}>
                {entry.isManual ? 'Manual' : 'QR'}
              </Text>
            </View>
          ))
        : null}
    </View>
  );
}
