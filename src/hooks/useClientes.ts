import { useState, useEffect, useCallback } from 'react';
import { getDatabase, Cliente, HistoricoAtendimento } from '../database/database';
import { scheduleClientNotification, cancelClientNotification } from '../services/notifications';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Share } from 'react-native';

/**
 * Calcula a diferença em dias entre a data da última compra e a data atual
 * para determinar se o cliente está inativo há 180 dias ou mais.
 */
export function isClienteEmAlerta(dataUltimaCompra: string): boolean {
  if (!dataUltimaCompra) return false;

  const parts = dataUltimaCompra.split('-');
  if (parts.length !== 3) return false;

  const ano = parseInt(parts[0], 10);
  const mes = parseInt(parts[1], 10) - 1; // Meses em JS começam no 0
  const dia = parseInt(parts[2], 10);

  const dateCompra = new Date(ano, mes, dia);
  const hoje = new Date();

  // Zera as horas para comparar apenas as datas
  dateCompra.setHours(0, 0, 0, 0);
  hoje.setHours(0, 0, 0, 0);

  const diferencaMs = hoje.getTime() - dateCompra.getTime();
  const diferencaDias = Math.floor(diferencaMs / (1000 * 60 * 60 * 24));

  return diferencaDias >= 180;
}

export function useClientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Busca a lista de clientes atualizada no banco.
   */
  const fetchClientes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const db = await getDatabase();
      const result = await db.getAllAsync<Cliente>('SELECT * FROM clientes ORDER BY nome ASC');
      setClientes(result);
    } catch (err: any) {
      console.error('Erro ao buscar clientes no SQLite:', err);
      setError(err?.message || 'Erro ao carregar clientes.');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Adiciona um novo cliente no banco de dados e agenda o alerta de 180 dias.
   */
  const addCliente = async (novoCliente: Omit<Cliente, 'id'>): Promise<number | null> => {
    try {
      // 1. Agendar notificação local
      const notificationId = await scheduleClientNotification(
        novoCliente.nome,
        novoCliente.data_ultima_compra
      );

      // 2. Salvar dados no SQLite
      const db = await getDatabase();
      const result = await db.runAsync(
        'INSERT INTO clientes (nome, telefone, email, data_ultima_compra, notification_id) VALUES (?, ?, ?, ?, ?)',
        [
          novoCliente.nome,
          novoCliente.telefone || '',
          novoCliente.email || '',
          novoCliente.data_ultima_compra,
          notificationId,
        ]
      );

      await fetchClientes();
      return result.lastInsertRowId;
    } catch (err: any) {
      console.error('Erro ao cadastrar cliente:', err);
      setError(err?.message || 'Erro ao cadastrar cliente.');
      throw err;
    }
  };

  /**
   * Atualiza as informações cadastrais do cliente e reagenda a notificação se necessário.
   */
  const updateCliente = async (id: number, clienteAtualizado: Partial<Cliente>): Promise<void> => {
    try {
      const db = await getDatabase();

      // Busca cliente atual para verificar se a notificação precisa ser reagendada
      const current = await db.getFirstAsync<Cliente>('SELECT * FROM clientes WHERE id = ?', [id]);
      if (!current) throw new Error('Cliente não encontrado.');

      let notificationId = current.notification_id;

      // Se mudou o nome ou a data da última compra, reagendamos a notificação
      const nomeModificado = clienteAtualizado.nome && clienteAtualizado.nome !== current.nome;
      const dataModificada = clienteAtualizado.data_ultima_compra && clienteAtualizado.data_ultima_compra !== current.data_ultima_compra;

      if (nomeModificado || dataModificada) {
        notificationId = await scheduleClientNotification(
          clienteAtualizado.nome || current.nome,
          clienteAtualizado.data_ultima_compra || current.data_ultima_compra,
          current.notification_id
        );
      }

      const nome = clienteAtualizado.nome !== undefined ? clienteAtualizado.nome : current.nome;
      const telefone = clienteAtualizado.telefone !== undefined ? clienteAtualizado.telefone : current.telefone;
      const email = clienteAtualizado.email !== undefined ? clienteAtualizado.email : current.email;
      const data_ultima_compra = clienteAtualizado.data_ultima_compra !== undefined ? clienteAtualizado.data_ultima_compra : current.data_ultima_compra;

      await db.runAsync(
        'UPDATE clientes SET nome = ?, telefone = ?, email = ?, data_ultima_compra = ?, notification_id = ? WHERE id = ?',
        [nome, telefone, email, data_ultima_compra, notificationId ?? null, id]
      );

      await fetchClientes();
    } catch (err: any) {
      console.error('Erro ao atualizar cliente:', err);
      setError(err?.message || 'Erro ao atualizar dados do cliente.');
      throw err;
    }
  };

  /**
   * Exclui o cliente do banco de dados, cancela a notificação agendada
   * (e exclui os históricos de atendimento em cascata).
   */
  const deleteCliente = async (id: number): Promise<void> => {
    try {
      const db = await getDatabase();

      // Buscar cliente para obter ID da notificação e cancelá-la
      const current = await db.getFirstAsync<Cliente>('SELECT * FROM clientes WHERE id = ?', [id]);
      if (current && current.notification_id) {
        await cancelClientNotification(current.notification_id);
      }

      // Deleta cliente (chaves estrangeiras configuradas com ON DELETE CASCADE deletam o histórico)
      await db.runAsync('DELETE FROM clientes WHERE id = ?', [id]);

      await fetchClientes();
    } catch (err: any) {
      console.error('Erro ao deletar cliente:', err);
      setError(err?.message || 'Erro ao excluir cliente.');
      throw err;
    }
  };

  /**
   * Atualiza especificamente a data da última compra e redefine o ciclo de 6 meses da notificação.
   */
  const updateDataUltimaCompra = async (id: number, novaData: string): Promise<void> => {
    try {
      const db = await getDatabase();
      const current = await db.getFirstAsync<Cliente>('SELECT * FROM clientes WHERE id = ?', [id]);
      if (!current) throw new Error('Cliente não encontrado.');

      // Reagenda para a nova data de compra
      const notificationId = await scheduleClientNotification(
        current.nome,
        novaData,
        current.notification_id
      );

      await db.runAsync(
        'UPDATE clientes SET data_ultima_compra = ?, notification_id = ? WHERE id = ?',
        [novaData, notificationId, id]
      );

      await fetchClientes();
    } catch (err: any) {
      console.error('Erro ao atualizar data da última compra:', err);
      setError(err?.message || 'Erro ao atualizar data da compra.');
      throw err;
    }
  };

  /**
   * Adiciona um registro de atendimento para um cliente.
   */
  const addHistorico = async (
    clienteId: number,
    detalhes: string,
    efetuouCompra: number = 0,
    produto: string,
    valor: number,
    observacao: string
  ): Promise<void> => {
    if (clienteId === undefined || clienteId === null || isNaN(clienteId)) {
      console.warn('addHistorico chamado com clienteId inválido:', clienteId);
      return;
    }
    try {
      const db = await getDatabase();
      const hoje = new Date().toISOString().split('T')[0]; // Salva apenas a data YYYY-MM-DD

      await db.runAsync(
        'INSERT INTO historico_atendimento (cliente_id, data_atendimento, detalhes, efetuou_compra, produto, valor, observacao) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [clienteId, hoje, detalhes, efetuouCompra, produto, valor, observacao]
      );

      // Se efetuou nova compra, atualiza automaticamente a data da última compra do cliente
      if (efetuouCompra === 1) {
        await updateDataUltimaCompra(clienteId, hoje);
      }
    } catch (err: any) {
      console.error('Erro ao inserir histórico:', err);
      setError(err?.message || 'Erro ao salvar histórico de atendimento.');
      throw err;
    }
  };

  /**
   * Exporta um relatório CSV completo com o histórico de vendas e relacionamentos de todos os clientes.
   */
  const exportarRelatorio = async (): Promise<void> => {
    try {
      const db = await getDatabase();
      const rows = await db.getAllAsync<any>(`
        SELECT 
          c.nome, 
          c.telefone, 
          c.email, 
          c.data_ultima_compra,
          h.data_atendimento,
          h.detalhes,
          h.efetuou_compra,
          h.produto,
          h.valor,
          h.observacao
        FROM clientes c
        LEFT JOIN historico_atendimento h ON c.id = h.cliente_id
        ORDER BY c.nome ASC, h.data_atendimento DESC, h.id DESC
      `);

      // Gerar CSV com cabeçalho
      let csv = 'Nome;Telefone;E-mail;Data Ultima Compra;Status;Data do Contato;Efetuou Compra;Produto;Valor;Observacao\n';

      rows.forEach((row) => {
        const emAlerta = isClienteEmAlerta(row.data_ultima_compra);
        const status = emAlerta ? 'Em Alerta' : 'Em Dia';
        const efetuouCompraStr = row.efetuou_compra === 1 ? 'Sim' : (row.efetuou_compra === 0 ? 'Não' : '');
        const dataAtendimentoStr = row.data_atendimento || '';
        const produtoStr = row.produto || '';
        const valorStr = row.valor !== null && row.valor !== undefined ? row.valor.toString() : '';
        const observacaoStr = row.observacao || row.detalhes || '';

        const clean = (val: string) => {
          if (!val) return '';
          return val.replace(/;/g, ',').replace(/\n/g, ' ').replace(/"/g, '""').trim();
        };

        csv += `"${clean(row.nome)}";"${clean(row.telefone)}";"${clean(row.email)}";"${clean(row.data_ultima_compra)}";"${status}";"${clean(dataAtendimentoStr)}";"${efetuouCompraStr}";"${clean(produtoStr)}";"${valorStr}";"${clean(observacaoStr)}"\n`;
      });

      // Salvar como arquivo temporário .csv no FileSystem do Expo
      const fileUri = `${FileSystem.cacheDirectory}relatorio_posvenda.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csv, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // Compartilhar o arquivo nativamente
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Exportar Relatório de Vendas e Relacionamentos',
          UTI: 'public.comma-separated-values-text',
        });
      } else {
        throw new Error('O compartilhamento não está disponível neste dispositivo.');
      }
    } catch (err: any) {
      console.error('Erro ao exportar relatório:', err);
      setError(err?.message || 'Erro ao exportar relatório.');
      throw err;
    }
  };

  /**
   * Busca o histórico completo de atendimentos de um cliente específico.
   */
  const fetchHistorico = useCallback(async (clienteId: number): Promise<HistoricoAtendimento[]> => {
    if (clienteId === undefined || clienteId === null || isNaN(clienteId)) {
      return [];
    }
    try {
      const db = await getDatabase();
      return await db.getAllAsync<HistoricoAtendimento>(
        'SELECT * FROM historico_atendimento WHERE cliente_id = ? ORDER BY data_atendimento DESC, id DESC',
        [clienteId]
      );
    } catch (err) {
      console.error('Erro ao buscar histórico de atendimento:', err);
      return [];
    }
  }, []);

  // Carrega os clientes na montagem do hook
  useEffect(() => {
    fetchClientes();
  }, [fetchClientes]);

  return {
    clientes,
    loading,
    error,
    fetchClientes,
    addCliente,
    updateCliente,
    deleteCliente,
    updateDataUltimaCompra,
    addHistorico,
    fetchHistorico,
    exportarRelatorio,
  };
}
