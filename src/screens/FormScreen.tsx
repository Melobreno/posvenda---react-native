import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  Alert,
  Platform,
  StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Cliente } from '../database/database';

interface FormScreenProps {
  cliente?: Cliente; // Se fornecido, modo de Edição. Caso contrário, Cadastro.
  onBack: () => void;
  onSave: (clienteData: Omit<Cliente, 'id'>) => Promise<void>;
}

export const FormScreen: React.FC<FormScreenProps> = ({
  cliente,
  onBack,
  onSave
}) => {
  const isEditing = !!cliente;

  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [dataCompra, setDataCompra] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Preenche os campos se estiver editando
  useEffect(() => {
    if (cliente) {
      setNome(cliente.nome);
      setTelefone(cliente.telefone || '');
      setEmail(cliente.email || '');
      
      // Parse da data YYYY-MM-DD
      if (cliente.data_ultima_compra) {
        const parts = cliente.data_ultima_compra.split('-');
        if (parts.length === 3) {
          const ano = parseInt(parts[0], 10);
          const mes = parseInt(parts[1], 10) - 1;
          const dia = parseInt(parts[2], 10);
          setDataCompra(new Date(ano, mes, dia));
        }
      }
    }
  }, [cliente]);

  // Formata data em formato legível brasileiro (DD/MM/AAAA)
  const formatarDataBR = (date: Date) => {
    const dia = String(date.getDate()).padStart(2, '0');
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const ano = date.getFullYear();
    return `${dia}/${mes}/${ano}`;
  };

  // Converte data para salvar no banco (YYYY-MM-DD)
  const formatarDataDB = (date: Date) => {
    const dia = String(date.getDate()).padStart(2, '0');
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const ano = date.getFullYear();
    return `${ano}-${mes}-${dia}`;
  };

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    // Esconde o picker no Android imediatamente após a escolha
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (selectedDate) {
      setDataCompra(selectedDate);
    }
  };

  const handleSave = async () => {
    // Validação básica
    if (!nome.trim()) {
      Alert.alert('Erro', 'O nome do cliente é obrigatório.');
      return;
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      Alert.alert('Erro', 'Por favor, insira um e-mail válido.');
      return;
    }

    try {
      const dataParaSalvar: Omit<Cliente, 'id'> = {
        nome: nome.trim(),
        telefone: telefone.trim(),
        email: email.trim(),
        data_ultima_compra: formatarDataDB(dataCompra)
      };

      await onSave(dataParaSalvar);
      Alert.alert(
        'Sucesso', 
        isEditing ? 'Cliente atualizado com sucesso!' : 'Cliente cadastrado com sucesso!'
      );
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar o cliente.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Feather name="x" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditing ? 'Editar Cliente' : 'Novo Cliente'}
        </Text>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Feather name="check" size={22} color="#2563eb" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.formCard}>
          
          {/* Campo Nome */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nome Completo *</Text>
            <View style={styles.inputWrapper}>
              <Feather name="user" size={18} color="#94a3b8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Ex: João Silva"
                placeholderTextColor="#94a3b8"
                value={nome}
                onChangeText={setNome}
                autoCapitalize="words"
              />
            </View>
          </View>

          {/* Campo Telefone */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Telefone / WhatsApp</Text>
            <View style={styles.inputWrapper}>
              <Feather name="phone" size={18} color="#94a3b8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Ex: 11988887777"
                placeholderTextColor="#94a3b8"
                value={telefone}
                onChangeText={setTelefone}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* Campo E-mail */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>E-mail</Text>
            <View style={styles.inputWrapper}>
              <Feather name="mail" size={18} color="#94a3b8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Ex: joao@email.com"
                placeholderTextColor="#94a3b8"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Campo Data da Última Compra */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Data da Última Compra *</Text>
            <TouchableOpacity 
              style={styles.dateSelector}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
            >
              <Feather name="calendar" size={18} color="#2563eb" style={styles.inputIcon} />
              <Text style={styles.dateText}>{formatarDataBR(dataCompra)}</Text>
              <Feather name="chevron-down" size={16} color="#64748b" style={styles.dateChevron} />
            </TouchableOpacity>

            {/* DateTimePicker nativo (Renderiza dependendo do estado no Android e Inline/Modal no iOS) */}
            {(showDatePicker || Platform.OS === 'ios') && (
              <View style={Platform.OS === 'ios' ? styles.iosDatePickerContainer : null}>
                <DateTimePicker
                  value={dataCompra}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  onChange={handleDateChange}
                  maximumDate={new Date()} // Impede selecionar datas futuras para compras passadas
                  locale="pt-BR"
                />
                {Platform.OS === 'ios' && (
                  <TouchableOpacity 
                    style={styles.iosDatePickerDoneBtn}
                    onPress={() => setShowDatePicker(false)}
                  >
                    <Text style={styles.iosDatePickerDoneBtnText}>Concluir Data</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

        </View>

        {/* Botão de Ação Inferior */}
        <TouchableOpacity 
          style={styles.submitBtn} 
          onPress={handleSave}
          activeOpacity={0.8}
        >
          <Feather name="save" size={18} color="#ffffff" style={styles.btnIcon} />
          <Text style={styles.submitBtnText}>
            {isEditing ? 'Atualizar Cadastro' : 'Salvar Cliente'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
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
    paddingTop: 16,
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
  },
  saveButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  formCard: {
    backgroundColor: '#ffffff',
    margin: 16,
    borderRadius: 20,
    padding: 20,
    gap: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    backgroundColor: '#f8fafc',
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    backgroundColor: '#f8fafc',
  },
  dateText: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
  },
  dateChevron: {
    marginLeft: 8,
  },
  iosDatePickerContainer: {
    marginTop: 8,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  iosDatePickerDoneBtn: {
    backgroundColor: '#f1f5f9',
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  iosDatePickerDoneBtnText: {
    color: '#2563eb',
    fontWeight: '700',
    fontSize: 13,
  },
  submitBtn: {
    backgroundColor: '#2563eb',
    height: 48,
    marginHorizontal: 16,
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
  submitBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  btnIcon: {
    marginRight: 8,
  },
});
