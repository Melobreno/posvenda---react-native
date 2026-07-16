import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configura como o aplicativo deve lidar com notificações quando está em primeiro plano (foreground)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Solicita permissão do usuário para enviar notificações.
 * Retorna true se a permissão foi concedida.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (Platform.OS === 'android') {
    // Configura o canal de notificação para Android
    await Notifications.setNotificationChannelAsync('posvenda-alerts', {
      name: 'Alertas de Pós-Venda',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  return finalStatus === 'granted';
}

/**
 * Cancela uma notificação agendada anteriormente usando o ID da notificação.
 */
export async function cancelClientNotification(notificationId: string | null | undefined): Promise<void> {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    console.warn(`Erro ao cancelar notificação ${notificationId}:`, error);
  }
}

/**
 * Agenda uma notificação local para 180 dias após a data da última compra.
 * Cancela qualquer notificação anterior, caso exista.
 * Retorna o ID da nova notificação agendada, ou null se a data do alerta já passou.
 */
export async function scheduleClientNotification(
  nomeCliente: string,
  dataUltimaCompra: string, // Formato YYYY-MM-DD
  notificationIdAnterior?: string | null
): Promise<string | null> {
  // 1. Cancelar notificação existente, se houver
  if (notificationIdAnterior) {
    await cancelClientNotification(notificationIdAnterior);
  }

  // 2. Calcular data de alerta (180 dias depois da última compra)
  const parts = dataUltimaCompra.split('-');
  if (parts.length !== 3) {
    console.error('Data inválida para agendamento. Formato esperado: YYYY-MM-DD');
    return null;
  }

  const ano = parseInt(parts[0], 10);
  const mes = parseInt(parts[1], 10) - 1; // Meses em JS começam do 0
  const dia = parseInt(parts[2], 10);

  const dataCompra = new Date(ano, mes, dia, 12, 0, 0); // Define meio-dia para evitar problemas de fuso
  const dataAlerta = new Date(dataCompra.getTime() + 180 * 24 * 60 * 60 * 1000);
  
  const agora = new Date();

  // 3. Se a data do alerta estiver no futuro, agenda
  if (dataAlerta > agora) {
    try {
      const hasPermission = await requestNotificationPermissions();
      if (!hasPermission) {
        console.warn('Permissão de notificações negada. Notificação não será agendada.');
        return null;
      }

      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: "⚠️ Pós-Venda Necessário!",
          body: `O cliente ${nomeCliente} está há 6 meses sem comprar. Entre em contato!`,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: dataAlerta,
        },
      });

      return id;
    } catch (error) {
      console.error('Erro ao agendar notificação:', error);
      return null;
    }
  }

  return null; // Caso a data do alerta já tenha passado
}
