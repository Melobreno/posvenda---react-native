import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  TextInput,
  Alert,
  Modal,
  StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Cliente, HistoricoAtendimento } from '../database/database';
import { isClienteEmAlerta } from '../hooks/useClientes';
import { validarTexto, validarNumero, ValidacaoErro } from '../utils/validation';

interface DetailScreenProps {
  cliente: Cliente;
  onBack: () => void;
  onEdit: () => void;
  onDelete: (id: number) => void;
  onUpdateDataCompra: (id: number, novaData: string) => Promise<void>;
  onAddHistorico: (
    id: number,
    detalhes: string,
    efetuouCompra: number,
    produto: string,
    valor: number,
    observacao: string
  ) => Promise<void>;
  fetchHistorico: (id: number) => Promise<HistoricoAtendimento[]>;
}

export const DetailScreen: React.FC<DetailScreenProps> = ({
  cliente,
  onBack,
  onEdit,
  onDelete,
  onUpdateDataCompra,
  onAddHistorico,
  fetchHistorico
}) => {
  const [historico, setHistorico] = useState<HistoricoAtendimento[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [efetuouCompra, setEfetuouCompra] = useState<'sim' | 'nao'>('nao');
  const [produtoComprado, setProdutoComprado] = useState('');
  const [valorProduto, setValorProduto] = useState('');
  const [observacao, setObservacao] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(true);

  const emAlerta = isClienteEmAlerta(cliente.data_ultima_compra);

  // Carrega histórico de atendimentos
  const carregarHistorico = async () => {
    setLoadingHistory(true);
    try {
      const logs = await fetchHistorico(cliente.id!);
      setHistorico(logs);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    } finally {
      setLoadingHistory(false);
    }
  };


  useEffect(() => {
    carregarHistorico();
  }, [cliente.id]);

  // Formatar data (DD/MM/AAAA)
  const formatarData = (dataStr: string) => {
    if (!dataStr) return '';
    const parts = dataStr.split('-');
    if (parts.length !== 3) return dataStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  // Clique rápido: Telefone
  const ligarCliente = () => {
    if (!cliente.telefone) return;
    const url = `tel:${cliente.telefone.replace(/\s+/g, '')}`;
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Alert.alert('Erro', 'Não é possível fazer chamadas neste dispositivo.');
        }
      });
  };

  // Clique rápido: WhatsApp
  const enviarWhatsApp = () => {
    if (!cliente.telefone) return;
    const numeros = cliente.telefone.replace(/\D/g, ''); // apenas números
    // Se não tiver DDI, adiciona 55 (Brasil) por padrão
    const ddi = numeros.length <= 11 ? '55' + numeros : numeros;
    const url = `https://wa.me/${ddi}?text=${encodeURIComponent('Olá, tudo bem?')}`;

    Linking.openURL(url).catch(() => {
      Alert.alert('Erro', 'Não foi possível abrir o WhatsApp.');
    });
  };

  // Clique rápido: E-mail
  const enviarEmail = () => {
    if (!cliente.email) return;
    const url = `mailto:${cliente.email}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Erro', 'Não foi possível abrir o aplicativo de e-mail.');
    });
  };

  // Ação: Confirmar Exclusão
  const confirmarExclusao = () => {
    Alert.alert(
      'Excluir Cliente',
      `Tem certeza que deseja excluir ${cliente.nome}? Esta ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => onDelete(cliente.id!)
        }
      ]
    );
  };

  // Ação: Atualizar data da compra para HOJE
  const renovarCicloCompra = async () => {
    const hoje = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    Alert.alert(
      'Renovar Ciclo',
      'Deseja atualizar a data da última compra deste cliente para HOJE? Isso reiniciará o alerta de 6 meses.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Atualizar',
          onPress: async () => {
            try {
              await onUpdateDataCompra(cliente.id!, hoje);
              // Registra automaticamente o atendimento no histórico
              await onAddHistorico(cliente.id!, 'Atualização da data da última compra para a data atual (Renovação de Ciclo).', 0, '', 0, '');
              carregarHistorico();
              Alert.alert('Sucesso', 'Ciclo de pós-venda renovado com sucesso!');
            } catch (error) {
              Alert.alert('Erro', 'Ocorreu um erro ao atualizar.');
            }
          }
        }
      ]
    );
  };

  // Ação: Registrar novo atendimento
  const salvarAtendimento = async () => {
    try {
      let produto = '';
      let valor = 0;
      let obs = '';

      if (efetuouCompra === 'sim') {
        produto = validarTexto(produtoComprado, 'Por favor, informe o produto comprado (mínimo de 2 caracteres).');
        if (produto.length < 2) {
          throw new ValidacaoErro('Por favor, informe o produto comprado (mínimo de 2 caracteres).');
        }
        valor = validarNumero(valorProduto, 'Por favor, informe um valor válido do produto.');
      } else {
        obs = validarTexto(observacao, 'Por favor, preencha as observações.');
      }

      const detalhesStr = efetuouCompra === 'sim'
        ? `Nova compra: ${produto} (R$ ${valor.toFixed(2)})`
        : obs;

      await onAddHistorico(
        cliente.id!,
        detalhesStr,
        efetuouCompra === 'sim' ? 1 : 0,
        produto,
        valor,
        obs
      );

      // Reseta os estados
      setEfetuouCompra('nao');
      setProdutoComprado('');
      setValorProduto('');
      setObservacao('');
      setModalVisible(false);
      carregarHistorico();
      Alert.alert('Sucesso', 'Contato registrado no histórico!');
    } catch (error) {
      if (error instanceof ValidacaoErro) {
        Alert.alert('Erro', error.message);
      } else {
        console.error('Erro ao salvar atendimento:', error);
        Alert.alert('Erro', 'Erro ao salvar histórico de atendimento.');
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Feather name="arrow-left" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Detalhes</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.actionButton} onPress={onEdit}>
            <Feather name="edit-3" size={20} color="#2563eb" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.deleteBtn]} onPress={confirmarExclusao}>
            <Feather name="trash-2" size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Perfil do Cliente */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>{cliente.nome.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.clientName}>{cliente.nome}</Text>

          {emAlerta ? (
            <View style={[styles.badge, styles.badgeAlerta]}>
              <Feather name="alert-triangle" size={12} color="#e11d48" style={styles.badgeIcon} />
              <Text style={styles.badgeTextAlerta}>Alerta: +6 Meses Inativo</Text>
            </View>
          ) : (
            <View style={[styles.badge, styles.badgeEmDia]}>
              <Feather name="check" size={12} color="#16a34a" style={styles.badgeIcon} />
              <Text style={styles.badgeTextEmDia}>Em Dia com Pós-Venda</Text>
            </View>
          )}

          {/* Atalhos Rápidos */}
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[styles.quickBtn, !cliente.telefone && styles.quickBtnDisabled]}
              onPress={ligarCliente}
              disabled={!cliente.telefone}
            >
              <View style={[styles.quickIconBg, styles.bgPhone]}>
                <Feather name="phone" size={20} color="#0284c7" />
              </View>
              <Text style={styles.quickLabel}>Ligar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickBtn, !cliente.telefone && styles.quickBtnDisabled]}
              onPress={enviarWhatsApp}
              disabled={!cliente.telefone}
            >
              <View style={[styles.quickIconBg, styles.bgWhatsapp]}>
                <Feather name="message-circle" size={20} color="#16a34a" />
              </View>
              <Text style={styles.quickLabel}>WhatsApp</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickBtn, !cliente.email && styles.quickBtnDisabled]}
              onPress={enviarEmail}
              disabled={!cliente.email}
            >
              <View style={[styles.quickIconBg, styles.bgMail]}>
                <Feather name="mail" size={20} color="#ea580c" />
              </View>
              <Text style={styles.quickLabel}>E-mail</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Informações Detalhadas */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Informações Gerais</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Telefone</Text>
            <Text style={styles.infoValue}>{cliente.telefone || 'Não cadastrado'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>E-mail</Text>
            <Text style={styles.infoValue}>{cliente.email || 'Não cadastrado'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Última Compra</Text>
            <Text style={[styles.infoValue, emAlerta && styles.alertText]}>
              {formatarData(cliente.data_ultima_compra)}
            </Text>
          </View>
        </View>

        {/* Ações de Pós-Venda */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.btnSecundario} onPress={() => setModalVisible(true)}>
            <Feather name="plus-circle" size={18} color="#2563eb" style={styles.btnIcon} />
            <Text style={styles.btnSecundarioText}>Registrar Atendimento</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.btnPrimario} onPress={renovarCicloCompra}>
            <Feather name="refresh-cw" size={16} color="#ffffff" style={styles.btnIcon} />
            <Text style={styles.btnPrimarioText}>Renovar Ciclo (Venda Hoje)</Text>
          </TouchableOpacity>
        </View>

        {/* Linha do Tempo de Pós-Venda */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Histórico de Contatos</Text>

          {loadingHistory ? (
            <Text style={styles.emptyText}>Carregando histórico...</Text>
          ) : historico.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Feather name="message-square" size={24} color="#cbd5e1" />
              <Text style={styles.emptyHistoryText}>Nenhum contato registrado para este cliente.</Text>
            </View>
          ) : (
            <View style={styles.timeline}>
              {historico.map((item, index) => (
                <View key={item.id!.toString()} style={styles.timelineItem}>
                  <View style={styles.timelineLeft}>
                    <View style={styles.timelineDot} />
                    {index < historico.length - 1 && <View style={styles.timelineLine} />}
                  </View>
                  <View style={styles.timelineRight}>
                    <Text style={styles.timelineDate}>{formatarData(item.data_atendimento)}</Text>
                    <Text style={styles.timelineContent}>{item.detalhes}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modal para Adicionar Atendimento */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Registrar Pós-Venda</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Feather name="x" size={22} color="#475569" />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Efetuou nova compra?</Text>
              <View style={styles.selectorContainer}>
                <TouchableOpacity
                  style={[
                    styles.selectorBtn,
                    efetuouCompra === 'sim' ? styles.selectorBtnActive : styles.selectorBtnInactive,
                  ]}
                  onPress={() => setEfetuouCompra('sim')}
                >
                  <Text
                    style={[
                      styles.selectorBtnText,
                      efetuouCompra === 'sim' ? styles.selectorBtnTextActive : styles.selectorBtnTextInactive,
                    ]}
                  >
                    Sim
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.selectorBtn,
                    efetuouCompra === 'nao' ? styles.selectorBtnActive : styles.selectorBtnInactive,
                  ]}
                  onPress={() => setEfetuouCompra('nao')}
                >
                  <Text
                    style={[
                      styles.selectorBtnText,
                      efetuouCompra === 'nao' ? styles.selectorBtnTextActive : styles.selectorBtnTextInactive,
                    ]}
                  >
                    Não
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {efetuouCompra === 'sim' ? (
              <View style={styles.conditionalContainer}>
                <Text style={styles.formLabel}>Produto comprado</Text>
                <TextInput
                  style={styles.modalInputSingle}
                  placeholder="Ex: Camiseta, Monitor, etc."
                  placeholderTextColor="#94a3b8"
                  value={produtoComprado}
                  onChangeText={setProdutoComprado}
                />

                <Text style={styles.formLabel}>Valor do produto (R$)</Text>
                <TextInput
                  style={styles.modalInputSingle}
                  placeholder="Ex: 99.90"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  value={valorProduto}
                  onChangeText={setValorProduto}
                />
              </View>
            ) : (
              <View style={styles.conditionalContainer}>
                <Text style={styles.formLabel}>Observação</Text>
                <TextInput
                  style={styles.modalInputMultiline}
                  placeholder="Descreva o motivo ou observações..."
                  placeholderTextColor="#94a3b8"
                  multiline={true}
                  numberOfLines={4}
                  value={observacao}
                  onChangeText={setObservacao}
                />
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalBtnCancelText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSave]}
                onPress={salvarAtendimento}
              >
                <Text style={styles.modalBtnSaveText}>Registrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 26,
    paddingBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e0f2fe', // Azul bem suave
  },
  deleteBtn: {
    backgroundColor: '#fee2e2', // Vermelho bem suave
  },
  scrollContent: {
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: '#ffffff',
    margin: 16,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  avatarContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#bfdbfe',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2563eb',
  },
  clientName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 9999,
    marginBottom: 24,
  },
  badgeAlerta: {
    backgroundColor: '#ffe4e6',
  },
  badgeEmDia: {
    backgroundColor: '#dcfce7',
  },
  badgeIcon: {
    marginRight: 6,
  },
  badgeTextAlerta: {
    fontSize: 12,
    fontWeight: '700',
    color: '#e11d48',
  },
  badgeTextEmDia: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16a34a',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    borderTopWidth: 1,
    borderColor: '#f1f5f9',
    paddingTop: 16,
  },
  quickBtn: {
    alignItems: 'center',
  },
  quickBtnDisabled: {
    opacity: 0.4,
  },
  quickIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  bgPhone: {
    backgroundColor: '#e0f2fe',
  },
  bgWhatsapp: {
    backgroundColor: '#dcfce7',
  },
  bgMail: {
    backgroundColor: '#ffedd5',
  },
  quickLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  infoLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '600',
  },
  alertText: {
    color: '#ef4444',
  },
  actionsContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  btnPrimario: {
    backgroundColor: '#2563eb',
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  btnPrimarioText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  btnSecundario: {
    backgroundColor: '#ffffff',
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  btnSecundarioText: {
    color: '#2563eb',
    fontSize: 15,
    fontWeight: '700',
  },
  btnIcon: {
    marginRight: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  emptyHistory: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 12,
  },
  emptyHistoryText: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
  },
  timeline: {
    paddingLeft: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 18,
  },
  timelineLeft: {
    alignItems: 'center',
    marginRight: 16,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2563eb',
    borderWidth: 2,
    borderColor: '#bfdbfe',
    zIndex: 1,
  },
  timelineLine: {
    width: 2,
    position: 'absolute',
    top: 12,
    bottom: -18,
    backgroundColor: '#e2e8f0',
  },
  timelineRight: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  timelineDate: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 4,
  },
  timelineContent: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },
  // Estilos do Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#0f172a',
    height: 100,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  selectorContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  selectorBtn: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  selectorBtnActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  selectorBtnInactive: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
  },
  selectorBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  selectorBtnTextActive: {
    color: '#ffffff',
  },
  selectorBtnTextInactive: {
    color: '#475569',
  },
  conditionalContainer: {
    marginBottom: 20,
  },
  modalInputSingle: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#0f172a',
    height: 44,
    marginBottom: 16,
  },
  modalInputMultiline: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#0f172a',
    height: 100,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBtnCancel: {
    backgroundColor: '#f1f5f9',
  },
  modalBtnCancelText: {
    color: '#475569',
    fontWeight: '600',
  },
  modalBtnSave: {
    backgroundColor: '#2563eb',
  },
  modalBtnSaveText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
