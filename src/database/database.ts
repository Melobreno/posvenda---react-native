import * as SQLite from 'expo-sqlite';

export interface Cliente {
  id?: number;
  nome: string;
  telefone: string;
  email: string;
  data_ultima_compra: string; // Formato YYYY-MM-DD
  notification_id?: string | null;
}

export interface HistoricoAtendimento {
  id?: number;
  cliente_id: number;
  data_atendimento: string; // Formato YYYY-MM-DD HH:mm:ss ou YYYY-MM-DD
  detalhes: string;
  efetuou_compra?: number; // 0 ou 1
  produto?: string | null;
  valor?: number | null;
  observacao?: string | null;
}

/**
 * Retorna uma instância de conexão com o banco de dados SQLite.
 */
export async function getDatabase() {
  return await SQLite.openDatabaseAsync('posvenda.db');
}

/**
 * Inicializa o banco de dados, configurando as tabelas e habilitando chaves estrangeiras.
 */
export async function initDatabase() {
  const db = await getDatabase();
  
  // Habilita suporte a chaves estrangeiras (importante para ON DELETE CASCADE)
  await db.execAsync('PRAGMA foreign_keys = ON;');

  // Criar tabela de clientes se não existir
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      telefone TEXT,
      email TEXT,
      data_ultima_compra TEXT NOT NULL,
      notification_id TEXT
    );
  `);

  // Criar tabela de histórico de atendimento se não existir
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS historico_atendimento (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cliente_id INTEGER NOT NULL,
      data_atendimento TEXT NOT NULL,
      detalhes TEXT NOT NULL,
      efetuou_compra INTEGER DEFAULT 0,
      produto TEXT,
      valor REAL,
      observacao TEXT,
      FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
    );
  `);

  // Executa migrações para adicionar as novas colunas caso o banco já existisse
  try {
    await db.execAsync('ALTER TABLE historico_atendimento ADD COLUMN efetuou_compra INTEGER DEFAULT 0;');
  } catch (e) {
    // Coluna pode já existir
  }
  try {
    await db.execAsync('ALTER TABLE historico_atendimento ADD COLUMN produto TEXT;');
  } catch (e) {
    // Coluna pode já existir
  }
  try {
    await db.execAsync('ALTER TABLE historico_atendimento ADD COLUMN valor REAL;');
  } catch (e) {
    // Coluna pode já existir
  }
  try {
    await db.execAsync('ALTER TABLE historico_atendimento ADD COLUMN observacao TEXT;');
  } catch (e) {
    // Coluna pode já existir
  }
}
