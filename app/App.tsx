import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { supabase } from './lib/supabase';

export default function App() {
  const [status, setStatus] = useState('Checking connection...');

  useEffect(() => {
    async function testConnection() {
      const { error } = await supabase
        .from('modes')
        .select('id')
        .limit(1);

      if (error) {
        setStatus(`Connection failed: ${error.message}`);
      } else {
        setStatus('Successfully connected to Supabase!');
      }
    }

    testConnection();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Modo</Text>
      <Text>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 16,
  },
});