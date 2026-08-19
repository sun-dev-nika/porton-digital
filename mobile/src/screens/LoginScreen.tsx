import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { useLogin } from '../hooks/useLogin';

export function LoginScreen(): JSX.Element {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { submit, error, isSubmitting } = useLogin();

  return (
    <View>
      <TextInput
        testID="login-email-input"
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        testID="login-password-input"
        placeholder="Contraseña"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {error !== null ? <Text testID="login-error">{error}</Text> : null}
      <Pressable
        testID="login-submit-button"
        disabled={isSubmitting}
        onPress={() => {
          void submit(email, password);
        }}
      >
        <Text>Ingresar</Text>
      </Pressable>
    </View>
  );
}
