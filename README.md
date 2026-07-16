# Guia de Execução Local - Pós-Venda Local

Este documento descreve como configurar e executar o projeto **Pós-Venda Local** em sua máquina de desenvolvimento. O projeto é um aplicativo mobile desenvolvido com **React Native**, **Expo**, **TypeScript**, **SQLite** local e **Expo Notifications**.

---

## 📋 Pré-requisitos

Antes de iniciar, certifique-se de ter instalado em sua máquina:

1. **Node.js**: Recomenda-se a versão LTS (v18 ou superior).
2. **Gerenciador de Pacotes**: `npm` (instalado por padrão com o Node.js).
3. **Ambiente de Execução (Escolha uma ou mais opções)**:
   - **Dispositivo Físico**: Aplicativo **Expo Go** instalado no seu celular (disponível na [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent) e na [App Store](https://apps.apple.com/app/expo-go/id984021022)).
   - **Emulador Android**: Configurado via Android Studio.
   - **Simulador iOS**: Configurado via Xcode (apenas para macOS).

---

## 🚀 Passo a Passo de Configuração

### 1. Clonar ou Acessar a Pasta do Projeto

Abra o terminal na pasta raiz do projeto:

```bash
cd "posvenda - react native"
```

### 2. Instalar as Dependências

Execute o comando abaixo para baixar e instalar as dependências do projeto listadas no `package.json`:

```bash
npm install
```

---

## 🏃 Como Executar o Aplicativo

Para iniciar o servidor de desenvolvimento do Expo (Metro Bundler), execute:

```bash
npm run start
```
ou alternativamente:
```bash
npx expo start
```

Isso iniciará o **Metro Bundler** no seu terminal e exibirá um QR Code interativo.

### Formas de Visualizar o App:

#### Opção A: No Dispositivo Físico (Mais recomendado para testar notificações)
1. Certifique-se de que seu celular e seu computador estão conectados na **mesma rede Wi-Fi**.
2. Abra o aplicativo **Expo Go** no celular.
3. No **Android**: Use a opção "Scan QR Code" do Expo Go e aponte para o QR Code no terminal.
4. No **iOS**: Abra a câmera padrão do sistema, aponte para o QR Code e toque no link sugerido para abrir no Expo Go.

#### Opção B: No Emulador Android
1. Inicie o seu emulador Android pelo Android Studio.
2. Com o Metro Bundler rodando no terminal, pressione a tecla `a` no seu teclado, ou execute diretamente:
   ```bash
   npm run android
   ```

#### Opção C: No Simulador iOS (Apenas macOS)
1. Inicie o simulador iOS pelo Xcode.
2. Com o Metro Bundler rodando no terminal, pressione a tecla `i` no seu teclado, ou execute diretamente:
   ```bash
   npm run ios
   ```

#### Opção D: No Navegador Web
1. Com o Metro Bundler rodando no terminal, pressione a tecla `w` no seu teclado, ou execute diretamente:
   ```bash
   npm run web
   ```
   *Nota: Algumas funcionalidades específicas de hardware ou persistência nativa do SQLite podem possuir comportamentos emulados ou diferentes na versão Web.*

---

## 🛠️ Estrutura do Projeto

Abaixo estão descritos os principais diretórios para você se localizar:

* **[App.tsx](file:///c:/Users/BrenoMelo/Documents/antigravity/posvenda%20-%20react%20native/App.tsx)**: Ponto de entrada do aplicativo. Configura a inicialização do banco de dados e os handlers de navegação.
* **`src/`**: Diretório principal do código-fonte:
  * **`src/database/`**: Configuração e migrações do banco SQLite local ([database.ts](file:///c:/Users/BrenoMelo/Documents/antigravity/posvenda%20-%20react%20native/src/database/database.ts)).
  * **`src/services/`**: Serviços integrados, como o agendamento de alertas locais ([notifications.ts](file:///c:/Users/BrenoMelo/Documents/antigravity/posvenda%20-%20react%20native/src/services/notifications.ts)).
  * **`src/components/`**: Componentes reutilizáveis de interface.
  * **`src/screens/`**: Telas do aplicativo (Listagem, Detalhes, Cadastro/Edição de Clientes e Histórico).
  * **`src/hooks/`**: Custom hooks para regras de negócio e acesso ao banco (como `useClientes`).
  * **`src/utils/`**: Funções auxiliares e de validação (como formatação de dados e validações).

---

## 💾 Persistência de Dados e Notificações Locais

* **Banco de Dados SQLite**: O aplicativo utiliza o `expo-sqlite` para salvar clientes e históricos localmente em um banco de dados chamado `posvenda.db`. A estrutura de tabelas é criada de forma totalmente automática no primeiro boot do app. Não é necessária nenhuma configuração de banco externo!
* **Notificações**: O app gerencia notificações locais. Ao registrar ou alterar a data da última compra de um cliente, o app agenda automaticamente uma notificação para **180 dias após essa data** para lembrar o usuário de realizar o pós-venda.

---

## 🔍 Resolução de Problemas Comuns

### 1. Erro de Conexão no Celular (QR Code não carrega ou dá timeout)
* Certifique-se de que o computador e o celular estejam na **mesma rede Wi-Fi**.
* Caso a rede possua bloqueios de segurança (como redes públicas ou corporativas), experimente iniciar o Expo com conexão de túnel via Ngrok:
  ```bash
  npx expo start --tunnel
  ```
  *(Nota: O Expo pode solicitar o download automático do pacote `@expo/ngrok` na primeira vez).*

### 2. Cache do Expo travado ou desatualizado
Se notar comportamentos estranhos ou mudanças no código que não se refletem no app, inicie limpando o cache:
```bash
npx expo start --clear
```

### 3. Falha de Typescript / Verificação de Tipos
Você pode executar uma checagem estática de tipos no projeto rodando:
```bash
npm run ts:check
```
