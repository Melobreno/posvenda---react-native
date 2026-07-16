import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Cliente } from '../database/database';
import { isClienteEmAlerta } from '../hooks/useClientes';

interface ClienteCardProps {
  cliente: Cliente;
  onPress: () => void;
}

export const ClienteCard: React.FC<ClienteCardProps> = ({ cliente, onPress }) => {
  const emAlerta = isClienteEmAlerta(cliente.data_ultima_compra);

  // Formata a data para padrão brasileiro (DD/MM/AAAA)
  const formatarData = (dataStr: string) => {
    if (!dataStr) return '';
    const parts = dataStr.split('-');
    if (parts.length !== 3) return dataStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  return (
    <TouchableOpacity 
      style={[
        styles.card, 
        emAlerta ? styles.cardAlerta : styles.cardEmDia
      ]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.nome} numberOfLines={1}>
            {cliente.nome}
          </Text>
          {emAlerta ? (
            <View style={[styles.badge, styles.badgeAlerta]}>
              <Feather name="alert-triangle" size={10} color="#e11d48" style={styles.badgeIcon} />
              <Text style={styles.badgeTextAlerta}>Alerta: +6 Meses</Text>
            </View>
          ) : (
            <View style={[styles.badge, styles.badgeEmDia]}>
              <Feather name="check" size={10} color="#16a34a" style={styles.badgeIcon} />
              <Text style={styles.badgeTextEmDia}>Em Dia</Text>
            </View>
          )}
        </View>

        <View style={styles.body}>
          {cliente.telefone ? (
            <View style={styles.infoRow}>
              <Feather name="phone" size={14} color="#64748b" style={styles.infoIcon} />
              <Text style={styles.infoText}>{cliente.telefone}</Text>
            </View>
          ) : null}

          <View style={styles.infoRow}>
            <Feather name="calendar" size={14} color="#64748b" style={styles.infoIcon} />
            <Text style={styles.infoText}>
              Última compra: <Text style={styles.dataDestaque}>{formatarData(cliente.data_ultima_compra)}</Text>
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.arrowContainer}>
        <Feather name="chevron-right" size={20} color="#cbd5e1" />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginVertical: 6,
    marginHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderLeftWidth: 5,
    // Sombra para iOS
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    // Sombra para Android
    elevation: 2,
  },
  cardAlerta: {
    borderLeftColor: '#ef4444', // Vermelho para inativo
  },
  cardEmDia: {
    borderLeftColor: '#22c55e', // Verde para ativo
  },
  content: {
    flex: 1,
    paddingRight: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  nome: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
    marginRight: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  badgeAlerta: {
    backgroundColor: '#ffe4e6',
  },
  badgeEmDia: {
    backgroundColor: '#dcfce7',
  },
  badgeIcon: {
    marginRight: 4,
  },
  badgeTextAlerta: {
    fontSize: 10,
    fontWeight: '700',
    color: '#e11d48',
  },
  badgeTextEmDia: {
    fontSize: 10,
    fontWeight: '700',
    color: '#16a34a',
  },
  body: {
    gap: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIcon: {
    marginRight: 6,
  },
  infoText: {
    fontSize: 13,
    color: '#64748b',
  },
  dataDestaque: {
    fontWeight: '500',
    color: '#475569',
  },
  arrowContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
