import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { initDatabase, Cliente } from './src/database/database';
import { requestNotificationPermissions } from './src/services/notifications';
import { useClientes } from './src/hooks/useClientes';
import { HomeScreen } from './src/screens/HomeScreen';
import { DetailScreen } from './src/screens/DetailScreen';
import { FormScreen } from './src/screens/FormScreen';

function MainApp() {
  const [currentScreen, setCurrentScreen] = useState<'home' | 'detail' | 'form'>('home');
  const [selectedClienteId, setSelectedClienteId] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  const {
    clientes,
    loading,
    addCliente,
    updateCliente,
    deleteCliente,
    updateDataUltimaCompra,
    addHistorico,
    fetchHistorico,
    exportarRelatorio,
  } = useClientes();

  // Encontra o cliente selecionado se aplicável
  const clienteSelecionado = clientes.find((c) => c.id === selectedClienteId);

  // Navega de volta para a Home
  const handleBackToHome = () => {
    setCurrentScreen('home');
    setSelectedClienteId(null);
    setIsEditing(false);
  };

  // Trata seleção de cliente na lista
  const handleSelectCliente = (id: number) => {
    setSelectedClienteId(id);
    setCurrentScreen('detail');
  };

  // Inicia fluxo de adição de cliente
  const handleAddCliente = () => {
    setIsEditing(false);
    setSelectedClienteId(null);
    setCurrentScreen('form');
  };

  // Inicia fluxo de edição de cliente
  const handleEditCliente = () => {
    setIsEditing(true);
    setCurrentScreen('form');
  };

  // Trata exclusão de cliente
  const handleDeleteCliente = async (id: number) => {
    try {
      await deleteCliente(id);
      handleBackToHome();
    } catch (error) {
      console.error('Erro ao deletar cliente:', error);
    }
  };

  // Trata salvamento de cliente (Cadastro ou Edição)
  const handleSaveCliente = async (clienteData: Omit<Cliente, 'id'>) => {
    try {
      if (isEditing && selectedClienteId !== null) {
        await updateCliente(selectedClienteId, clienteData);
        // Atualiza a tela de detalhes para mostrar os dados novos
        setCurrentScreen('detail');
      } else {
        await addCliente(clienteData);
        setCurrentScreen('home');
      }
      setIsEditing(false);
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
      throw error;
    }
  };

  // Renderizador de telas condicional
  const renderScreen = () => {
    switch (currentScreen) {
      case 'detail':
        if (!clienteSelecionado) {
          return (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>Erro: Cliente não encontrado.</Text>
              <Text style={styles.linkText} onPress={handleBackToHome}>Voltar para Home</Text>
            </View>
          );
        }
        return (
          <DetailScreen
            cliente={clienteSelecionado}
            onBack={handleBackToHome}
            onEdit={handleEditCliente}
            onDelete={handleDeleteCliente}
            onUpdateDataCompra={updateDataUltimaCompra}
            onAddHistorico={addHistorico}
            fetchHistorico={fetchHistorico}
          />
        );
      case 'form':
        return (
          <FormScreen
            cliente={isEditing ? clienteSelecionado : undefined}
            onBack={clienteSelecionado ? () => setCurrentScreen('detail') : handleBackToHome}
            onSave={handleSaveCliente}
          />
        );
      case 'home':
      default:
        return (
          <HomeScreen
            clientes={clientes}
            loading={loading}
            onSelectCliente={handleSelectCliente}
            onAddCliente={handleAddCliente}
            onExportRelatorio={exportarRelatorio}
          />
        );
    }
  };

  return <View style={styles.appContainer}>{renderScreen()}</View>;
}

export default function App() {
  const [dbInitialized, setDbInitialized] = useState<boolean>(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    async function setupApp() {
      try {
        // Inicializa o SQLite antes de renderizar as telas que usam o hook de clientes
        await initDatabase();
        // Solicita permissão para notificações locais
        await requestNotificationPermissions();
        setDbInitialized(true);
      } catch (err: any) {
        console.error('Falha ao inicializar o aplicativo:', err);
        setInitError(err?.message || 'Erro ao configurar o banco de dados local.');
      }
    }
    setupApp();
  }, []);

  if (initError) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorTitle}>Erro Crítico de Inicialização</Text>
        <Text style={styles.errorText}>{initError}</Text>
      </View>
    );
  }

  if (!dbInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Configurando banco de dados...</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <View style={styles.root}>
        <StatusBar style="dark" />
        <MainApp />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  appContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 20,
    gap: 12,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#dc2626',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  linkText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
