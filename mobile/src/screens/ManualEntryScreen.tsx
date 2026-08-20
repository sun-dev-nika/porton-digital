import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { useManualEntry } from '../hooks/useManualEntry';

export function ManualEntryScreen(): JSX.Element {
  const [visitorName, setVisitorName] = useState('');
  const [unitLabel, setUnitLabel] = useState('');
  const { submit, error, entry, isSubmitting } = useManualEntry();

  return (
    <View>
      <TextInput
        testID="manual-entry-visitor-input"
        placeholder="Nombre del visitante"
        value={visitorName}
        onChangeText={setVisitorName}
      />
      <TextInput
        testID="manual-entry-unit-input"
        placeholder="Unidad (ej. 101)"
        autoCapitalize="none"
        value={unitLabel}
        onChangeText={setUnitLabel}
      />
      {entry !== null ? (
        <Text testID="manual-entry-success">Ingreso manual registrado</Text>
      ) : null}
      {error !== null ? <Text testID="manual-entry-error">{error}</Text> : null}
      <Pressable
        testID="manual-entry-submit-button"
        disabled={isSubmitting}
        onPress={() => {
          void submit(visitorName, unitLabel);
        }}
      >
        <Text>Registrar ingreso manual</Text>
      </Pressable>
    </View>
  );
}
