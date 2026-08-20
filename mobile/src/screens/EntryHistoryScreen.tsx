import { Text, View } from 'react-native';

import { useEntryHistory } from '../hooks/useEntryHistory';

export function EntryHistoryScreen(): JSX.Element {
  const { isLoading, error, entries } = useEntryHistory();

  return (
    <View>
      {isLoading ? <Text testID="entry-history-loading">Cargando...</Text> : null}
      {error !== null ? <Text testID="entry-history-error">{error}</Text> : null}
      {error === null
        ? entries.map((entry) => (
            <View key={entry.id} testID={`entry-item-${entry.id}`}>
              <Text testID={`entry-visitor-${entry.id}`}>{entry.visitorName}</Text>
              <Text testID={`entry-date-${entry.id}`}>{entry.enteredAt}</Text>
            </View>
          ))
        : null}
    </View>
  );
}
