import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator,
  StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Cliente } from '../database/database';
import { ClienteCard } from '../components/ClienteCard';
import { isClienteEmAlerta } from '../hooks/useClientes';

interface HomeScreenProps {
  clientes: Cliente[];
  loading: boolean;
  onSelectCliente: (id: number) => void;
  onAddCliente: () => void;
  onExportRelatorio: () => Promise<void>;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ 
  clientes, 
  loading, 
  onSelectCliente, 
  onAddCliente,
  onExportRelatorio
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filtro, setFiltro] = useState<'todos' | 'alerta' | 'emDia'>('todos');

  // Métricas do Dashboard
  const totalClientes = clientes.length;
  const totalAlerta = clientes.filter(c => isClienteEmAlerta(c.data_ultima_compra)).length;

  // Filtragem dinâmica dos clientes
  const clientesFiltrados = clientes.filter(cliente => {
    const matchesSearch = 
      cliente.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (cliente.telefone && cliente.telefone.includes(searchQuery)) ||
      (cliente.email && cliente.email.toLowerCase().includes(searchQuery.toLowerCase()));

    const emAlerta = isClienteEmAlerta(cliente.data_ultima_compra);
    
    if (filtro === 'alerta') return matchesSearch && emAlerta;
    if (filtro === 'emDia') return matchesSearch && !emAlerta;
    return matchesSearch;
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Pós-Venda</Text>
          <Text style={styles.headerSubtitle}>Gestão de Relacionamento</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity 
            style={[styles.refreshButton, { marginRight: 10, backgroundColor: '#e0f2fe' }]}
            onPress={onExportRelatorio}
            activeOpacity={0.7}
          >
            <Feather name="download" size={20} color="#0284c7" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={onAddCliente}
            activeOpacity={0.7}
          >
            <Feather name="user-plus" size={20} color="#0f172a" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Dashboard Summary Cards */}
      <View style={styles.dashboard}>
        <View style={[styles.dbCard, styles.dbCardBlue]}>
          <View style={styles.dbCardIconBgBlue}>
            <Feather name="users" size={20} color="#2563eb" />
          </View>
          <Text style={styles.dbValue}>{totalClientes}</Text>
          <Text style={styles.dbLabel}>Total de Clientes</Text>
        </View>

        <View style={[styles.dbCard, styles.dbCardRed]}>
          <View style={styles.dbCardIconBgRed}>
            <Feather name="alert-circle" size={20} color="#dc2626" />
          </View>
          <Text style={styles.dbValue}>{totalAlerta}</Text>
          <Text style={styles.dbLabel}>Clientes Críticos</Text>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Feather name="search" size={18} color="#94a3b8" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nome, telefone ou e-mail..."
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Feather name="x-circle" size={18} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Quick Filters */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filtro === 'todos' && styles.filterTabActive]}
          onPress={() => setFiltro('todos')}
        >
          <Text style={[styles.filterTabText, filtro === 'todos' && styles.filterTabTextActive]}>
            Todos
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, filtro === 'alerta' && styles.filterTabActive]}
          onPress={() => setFiltro('alerta')}
        >
          <View style={styles.filterTabBadgeRow}>
            <Text style={[styles.filterTabText, filtro === 'alerta' && styles.filterTabTextActive]}>
              Em Alerta
            </Text>
            {totalAlerta > 0 && (
              <View style={styles.badgeCount}>
                <Text style={styles.badgeCountText}>{totalAlerta}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, filtro === 'emDia' && styles.filterTabActive]}
          onPress={() => setFiltro('emDia')}
        >
          <Text style={[styles.filterTabText, filtro === 'emDia' && styles.filterTabTextActive]}>
            Em Dia
          </Text>
        </TouchableOpacity>
      </View>

      {/* Client List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Carregando clientes...</Text>
        </View>
      ) : clientesFiltrados.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconBg}>
            <Feather name="folder" size={48} color="#94a3b8" />
          </View>
          <Text style={styles.emptyTitle}>Nenhum cliente encontrado</Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery ? 'Tente ajustar sua busca ou filtro.' : 'Toque no botão flutuante (+) para cadastrar seu primeiro cliente.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={clientesFiltrados}
          keyExtractor={(item) => item.id!.toString()}
          renderItem={({ item }) => (
            <ClienteCard
              cliente={item}
              onPress={() => onSelectCliente(item.id!)}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Floating Action Button (FAB) */}
      <TouchableOpacity 
        style={styles.fab} 
        onPress={onAddCliente}
        activeOpacity={0.8}
      >
        <Feather name="plus" size={24} color="#ffffff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc', // Fundo iOS padrão (off-white)
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dashboard: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  dbCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    // Sombra suave
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
  },
  dbCardBlue: {
    borderColor: '#e0f2fe',
  },
  dbCardRed: {
    borderColor: '#fee2e2',
  },
  dbCardIconBgBlue: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  dbCardIconBgRed: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  dbValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
  },
  dbLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#0f172a',
    fontSize: 14,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#e2e8f0',
  },
  filterTabActive: {
    backgroundColor: '#0f172a',
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  filterTabTextActive: {
    color: '#ffffff',
  },
  filterTabBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeCount: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  badgeCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
  },
  listContent: {
    paddingBottom: 88, // Espaço para o FAB
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    color: '#64748b',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    marginTop: 48,
  },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563eb', // Azul moderno
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
});
