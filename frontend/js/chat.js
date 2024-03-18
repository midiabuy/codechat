// Definição do token de autenticação
const token = 'zYzP7ocstxh3Sscefew4FZTCu4ehnM8v4hu';

// Mapeamento dos tipos de mensagem para emojis correspondentes
const messageTypeLookup = {
  imageMessage: '📷 Imagem', // Android, IOS, WEB e Desktop - No IOS retorna imageMessage mesmo temporaria
  audioMessage: '🎶 Áudio',  // Android, IOS, WEB e Desktop - No IOS retorna audioMessage mesmo temporaria - Desktop nao tem Audio Temporario
  videoMessage: '📹 Vídeo', // Android, IOS, WEB e Desktop - No IOS retorna videoMessage mesmo temporaria
  locationMessage: '📍 Localização', // Android e IOS - WEB e Desktop nao tem opcao de enviar localizacao
  liveLocationMessage: '📍 Localização em tempo real', // Android e IOS - WEB e Desktop nao tem opcao de enviar localizacao
  viewOnceMessageV2: '📷  Mídia temporaria', // Foto e Video Temporario - ANDROID e Desktop
  viewOnceMessage: '📷  Mídia temporaria', // Foto e Video temporario - WEB
  viewOnceMessageV2Extension: '🎶 Audio Temporario', // Audio temporario - ANDROID e WEB
  documentMessage: '📎 Arquivo', // Android, IOS, WEB e Desktop
  contactMessage: '👤 Contato', // Android, IOS, WEB e Desktop
  stickerMessage: '📃 Figurinha', // Android, IOS, WEB e Desktop
  pollCreationMessage: '📊 Enquete', // Web e Desktop
  pollCreationMessageV3: '📊 Enquete', // Android e IOS
};

// Função assíncrona para buscar informações dos contatos
async function contactCards(instanceName) {
  async function getPicture(jid) {
    try {
      // Verifica se a imagem de perfil do contato está em cache
      const cachedPicture = localStorage.getItem(`picture_${jid}`);
      if (cachedPicture) {
        return cachedPicture;
      }

      // Faz uma solicitação para obter a URL da imagem de perfil do servidor
      const request = await fetch(
        `http://localhost:8084/chat/fetchProfilePictureUrl/${instanceName}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            apikey: token,
          },
          body: JSON.stringify({ number: jid }), // Corpo da solicitação com o número de telefone do contato
        },
      );

      // Verifica se a solicitação foi bem-sucedida
      if (!request.ok) {
        throw new Error(`Error: ${request.status} - ${request.statusText}`);
      }

      // Extrai a URL da imagem de perfil da resposta da solicitação
      const response = await request.json();

      // Salva a URL da imagem de perfil em cache
      if (response && response.profilePictureUrl) {
        localStorage.setItem(`picture_${jid}`, response.profilePictureUrl);
        return response.profilePictureUrl;
      }

      return ''; // Retorna uma string vazia se a imagem de perfil não estiver disponível
    } catch (error) {
      console.error('Error fetching profile picture:', error.message); // Manipula erros
      return ''; // Retorna uma string vazia em caso de erro
    }
  }
  try {
    // Solicitação para obter as mensagens do servidor
    const messageResponse = await fetch(
      `http://localhost:8084/chat/findMessages/${instanceName}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          apikey: token,
        },
        body: JSON.stringify({ page: 1 }), // Corpo da solicitação com o número da página
      },
    );

    // Verifica se a solicitação foi bem-sucedida
    if (!messageResponse.ok) {
      throw new Error(`Error: ${messageResponse.status} - ${messageResponse.statusText}`);
    }

    // Extrai os dados da resposta da solicitação
    const messageData = await messageResponse.json();
    const records = messageData.messages.records;
    console.log(records);

    // Mapa para armazenar os contatos
    const contactsMap = new Map();

    // Itera sobre os registros de mensagens para agrupar as informações dos contatos
    for (const item of records) {
      if (!contactsMap.has(item.keyRemoteJid)) {
        contactsMap.set(item.keyRemoteJid, {
          jid: item.keyRemoteJid,
          name: null,
          picture: '',
          messages: [],
        });
      }

      // Determina o conteúdo da mensagem
      let messageContent = '';
      if (typeof item.content === 'object' && item.content.text) {
        messageContent = item.content.text;
      } else {
        messageContent = messageTypeLookup[item.messageType] || item.content || '';
      }

      // Adiciona a mensagem ao contato correspondente
      contactsMap.get(item.keyRemoteJid).messages.push({
        name: item.pushName,
        content: messageContent,
        sentByClient: item.keyFromMe,
      });

      // Se a mensagem não foi enviada pelo cliente e o nome do contato ainda não foi definido, define o nome
      if (!item.keyFromMe && !contactsMap.get(item.keyRemoteJid).name) {
        contactsMap.get(item.keyRemoteJid).name = item.pushName;
      }
    }

    // Converte o mapa de contatos em uma matriz e busca a imagem de perfil para cada contato
    const contacts = [];
    for (const contact of contactsMap.values()) {
      const picture = await getPicture(contact.jid);
      contact.picture = picture;
      contact.lastMessage = contact.messages[0];
      contacts.push(contact);
    }

    // Seleciona os cinco primeiros contatos para exibição
    const fiveContacts = contacts.slice(0, 5);
    displayContacts(fiveContacts); // Exibe os contatos na interface
  } catch (error) {
    console.error('Error:', error.message); // Manipula erros
  }
}

// Função para exibir os contatos na interface do usuário
function displayContacts(contacts) {
  const contactsContainer = document.getElementById('contacts-container');
  contactsContainer.innerHTML = ''; // Limpa o conteúdo anterior

  // Itera sobre os contatos para criar e adicionar os elementos HTML correspondentes
  for (const contact of contacts) {
    const card = document.createElement('div');
    card.classList.add('contact-card');

    const image = document.createElement('img');
    image.src = contact.picture;
    image.alt = contact.name;

    const detailsContainer = document.createElement('div');
    detailsContainer.classList.add('contact-card-details');

    const contactName = document.createElement('h2');
    contactName.textContent = contact.name;

    const lastMessageContent = document.createElement('p');
    lastMessageContent.textContent = contact.lastMessage.sentByClient
      ? `Você: ${contact.lastMessage.content}`
      : contact.lastMessage.content;

    detailsContainer.appendChild(contactName);
    detailsContainer.appendChild(lastMessageContent);

    card.appendChild(image);
    card.appendChild(detailsContainer);

    contactsContainer.appendChild(card);
  }
}

// Inicia o processo de busca e exibição de contatos
contactCards('Murilo');