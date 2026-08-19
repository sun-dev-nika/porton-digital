import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { useCreateInvitation } from '../hooks/useCreateInvitation';

export function CreateInvitationScreen(): JSX.Element {
  const [visitorName, setVisitorName] = useState('');
  const [validFrom, setValidFrom] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const { submit, error, invitation, isSubmitting } = useCreateInvitation();

  return (
    <View>
      <TextInput
        testID="invitation-visitor-input"
        placeholder="Nombre del visitante"
        value={visitorName}
        onChangeText={setVisitorName}
      />
      <TextInput
        testID="invitation-valid-from-input"
        placeholder="Válido desde (ISO 8601)"
        autoCapitalize="none"
        value={validFrom}
        onChangeText={setValidFrom}
      />
      <TextInput
        testID="invitation-valid-until-input"
        placeholder="Válido hasta (ISO 8601)"
        autoCapitalize="none"
        value={validUntil}
        onChangeText={setValidUntil}
      />
      {invitation !== null ? <Text testID="invitation-code">{invitation.code}</Text> : null}
      {error !== null ? <Text testID="invitation-error">{error}</Text> : null}
      <Pressable
        testID="invitation-submit-button"
        disabled={isSubmitting}
        onPress={() => {
          void submit(visitorName, validFrom, validUntil);
        }}
      >
        <Text>Crear invitación</Text>
      </Pressable>
    </View>
  );
}
