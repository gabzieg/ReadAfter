import React, { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import * as Linking from 'expo-linking';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  const navigationRef = useRef(null);

  useEffect(() => {
    // Intercepta links do Instagram compartilhados para o app
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleIncomingUrl(url);
    });
    Linking.getInitialURL().then(url => {
      if (url) handleIncomingUrl(url);
    });
    return () => subscription.remove();
  }, []);

  function handleIncomingUrl(url) {
    if (!url) return;
    const isReel = url.includes('instagram.com/reel') ||
                   url.includes('instagram.com/p/');
    if (isReel) {
      Alert.alert(
        '🎬 Reel detectado!',
        'Deseja salvar e analisar este Reel com IA?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Salvar',
            onPress: () => {
              navigationRef.current?.navigate('Main', {
                screen: 'Início',
                params: { incomingUrl: url },
              });
            },
          },
        ]
      );
    }
  }

  return (
    <>
      <StatusBar style="dark" backgroundColor="#FFFFFF" />
      <AppNavigator ref={navigationRef} />
    </>
  );
}
