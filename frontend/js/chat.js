// Definição do token de autenticação
const token = 'zYzP7ocstxh3Sscefew4FZTCu4ehnM8v4hu';

// Mapeamento dos tipos de mensagem para emojis correspondentes
const messageTypeLookup = {
  imageMessage: '📷 Imagem', // Android, IOS, WEB e Desktop - No IOS retorna imageMessage mesmo temporaria *TRATADO
  audioMessage: '🎶 Áudio', // Android, IOS, WEB e Desktop - No IOS retorna audioMessage mesmo temporaria - Desktop nao tem Audio Temporario *TRATADO
  videoMessage: '📹 Vídeo', // Android, IOS, WEB e Desktop - No IOS retorna videoMessage mesmo temporaria *TRATADO
  locationMessage: '📍 Localização', // Android e IOS - WEB e Desktop nao tem opcao de enviar localizacao *TRATADO
  liveLocationMessage: '📍 Localização em tempo real', // Android e IOS - WEB e Desktop nao tem opcao de enviar localizacao *TRATADO
  viewOnceMessageV2: '📷  Mídia temporaria', // Foto e Video Temporario - ANDROID e Desktop *TRATADO
  viewOnceMessage: '📷  Mídia temporaria', // Foto e Video temporario - WEB *TRATADO
  viewOnceMessageV2Extension: '🎶 Audio Temporario', // Audio temporario - ANDROID e WEB *TRATADO
  documentMessage: '📎 Arquivo', // Android, IOS, WEB e Desktop *TRATADO
  contactMessage: '👤 Contato', // Android, IOS, WEB e Desktop *MAIS OU MENOS TRATADO
  stickerMessage: '📃 Figurinha', // Android, IOS, WEB e Desktop *TRATADO
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

    async function getMediaMessage(keyId) {
      const mediaResponse = await fetch(
        `http://localhost:8084/chat/retrieverMediaMessage/${instanceName}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            apikey: token,
          },
          body: JSON.stringify({
            keyId: keyId,
          }),
        },
      );

      const mediaBuffer = await mediaResponse.arrayBuffer();
      const mediaBlob = new Blob([mediaBuffer], {
        type: mediaResponse.headers.get('content-type'),
      });
      return mediaBlob;
    }

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
      if (
        item.messageType === 'extendedTextMessage' ||
        item.messageType === 'conversation'
      ) {
        messageContent =
          typeof item.content === 'object' ? item.content.text : item.content;
      } else if (item.messageType === 'imageMessage') {
        messageContent = item.content.viewOnce
          ? '📷  Mídia temporária'
          : await getMediaMessage(item.keyId);
      } else if (item.messageType === 'videoMessage') {
        messageContent = item.content.viewOnce
          ? '📷  Mídia temporária'
          : await getMediaMessage(item.keyId);
      } else if (item.messageType === 'audioMessage') {
        messageContent = item.content.viewOnce
          ? '🎶  Áudio temporário'
          : await getMediaMessage(item.keyId);
      } else if (item.messageType === 'documentMessage') {
        messageContent = await getMediaMessage(item.keyId);
      } else if (item.messageType === 'stickerMessage') {
        messageContent = await getMediaMessage(item.keyId);
      } else if (item.messageType === 'contactMessage') {
        messageContent = item.content;
      } else if (
        item.messageType === 'locationMessage' ||
        item.messageType === 'liveLocationMessage'
      ) {
        messageContent = item.content;
      } else if (
        item.messageType === 'pollCreationMessage' ||
        item.messageType === 'pollCreationMessageV3'
      ) {
        messageContent = item.content;
      }

      // Adiciona a mensagem ao contato correspondente
      contactsMap.get(item.keyRemoteJid).messages.push({
        name: item.pushName,
        content: messageContent,
        sentByClient: item.keyFromMe,
        messageType: item.messageType,
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
    console.log(fiveContacts);
    displayContacts(fiveContacts); // Exibe os contatos na interface
  } catch (error) {
    console.error('Error:', error.message); // Manipula erros
  }
}

function getMessageContent(message) {
  let content = '';
  const messageType = message.messageType;

  // Verifica se messageTypeLookup tem um valor correspondente
  if (messageTypeLookup.hasOwnProperty(messageType)) {
    content = messageTypeLookup[messageType];
  } else {
    // Se não houver um valor correspondente, apenas usa o conteúdo original da mensagem
    content = message.content;
  }

  return content;
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
      ? `Você: ${getMessageContent(contact.lastMessage)}`
      : getMessageContent(contact.lastMessage);

    detailsContainer.appendChild(contactName);
    detailsContainer.appendChild(lastMessageContent);

    // Adiciona um evento de clique ao card de contato
    card.addEventListener('click', () => handleContactClick(contact));

    card.appendChild(image);
    card.appendChild(detailsContainer);

    contactsContainer.appendChild(card);
  }
}

// Função para lidar com o clique em um card de contato
function handleContactClick(contact) {
  console.log('Contact clicked:', contact);

  // Obter o JID do contato clicado
  const destinationJid = contact.jid;

  // Atualizar o campo oculto com o destinationJid
  document.getElementById('destination-jid').value = destinationJid;

  // Lógica de renderização da conversa do contato à direita da barra lateral
  renderConversation(contact);
}

// Função para renderizar a conversa do contato à direita da barra lateral
async function renderConversation(contact) {
  const conversationContainer = document.getElementById('conversation-container');
  conversationContainer.innerHTML = ''; // Limpa o conteúdo anterior

  // Itera sobre as mensagens do contato para renderizá-las
  for (const message of contact.messages) {
    const messageContainer = document.createElement('div');
    messageContainer.classList.add('message-container');

    const isSentByClient = message.sentByClient;

    // Adiciona a classe "sent_message" se a mensagem foi enviada pelo cliente
    if (isSentByClient) {
      messageContainer.classList.add('sent-message');
    }

    if (message.messageType == 'imageMessage') {
      if (message.content === '📷  Mídia temporária') {
        const messageTemporary = document.createElement('p');
        messageTemporary.textContent =
          '⚠️ Esta mensagem é temporária e por motivos de privacidade só pode ser vista no seu celular.';
        messageContainer.appendChild(messageTemporary);
      } else {
        const messageImage = new Image(); // document.createElement('img');
        let fileReader = new FileReader();
        fileReader.onload = function () {
          messageImage.src = fileReader.result;
        };
        fileReader.readAsDataURL(message.content);
        messageContainer.appendChild(messageImage);
      }
    } else if (message.messageType == 'videoMessage') {
      if (message.content === '📷  Mídia temporária') {
        const messageTemporary = document.createElement('p');
        messageTemporary.textContent =
          '⚠️ Esta mensagem é temporária e por motivos de privacidade só pode ser vista no seu celular.';
        messageContainer.appendChild(messageTemporary);
      } else {
        const videoMessage = document.createElement('video');
        videoMessage.controls = true;
        let fileReader = new FileReader();
        fileReader.onload = function () {
          videoMessage.src = fileReader.result;
        };
        fileReader.readAsDataURL(message.content);
        messageContainer.appendChild(videoMessage);
      }
    } else if (message.messageType == 'audioMessage') {
      if (message.content === '🎶  Áudio temporário') {
        const messageTemporary = document.createElement('p');
        messageTemporary.textContent =
          '⚠️ Esta mensagem é temporária e por motivos de privacidade só pode ser vista no seu celular.';
        messageContainer.appendChild(messageTemporary);
      } else {
        const audioMessage = document.createElement('audio');
        audioMessage.controls = true;
        let fileReader = new FileReader();
        fileReader.onload = function () {
          audioMessage.src = fileReader.result;
        };
        fileReader.readAsDataURL(message.content);
        messageContainer.classList.add('audio-message');
        messageContainer.appendChild(audioMessage);
      }
    } else if (
      message.messageType == 'viewOnceMessageV2' ||
      message.messageType == 'viewOnceMessage' ||
      message.messageType == 'viewOnceMessageV2Extension'
    ) {
      const temporaryMessageWarning = document.createElement('p');
      temporaryMessageWarning.textContent =
        '⚠️ Esta mensagem é temporária e por motivos de privacidade só pode ser vista no seu celular.';
      messageContainer.appendChild(temporaryMessageWarning);
    } else if (message.messageType == 'documentMessage') {
      const documentContainer = document.createElement('p');
      const documentMessage = document.createElement('a');
      let fileReader = new FileReader();
      fileReader.onload = function () {
        documentMessage.href = fileReader.result;
        documentMessage.download = 'file';
      };
      fileReader.readAsDataURL(message.content);
      documentMessage.textContent = '📎 Baixar arquivo';
      documentContainer.appendChild(documentMessage);
      messageContainer.appendChild(documentContainer);
    } else if (message.messageType == 'stickerMessage') {
      const stickerMessage = new Image();
      let fileReader = new FileReader();
      fileReader.onload = function () {
        stickerMessage.src = fileReader.result;
      };
      fileReader.readAsDataURL(message.content);
      messageContainer.appendChild(stickerMessage);
    } else if (message.messageType === 'contactMessage') {
      const contactCard = document.createElement('div');
      contactCard.classList.add('contact-card');

      const contactEmoji = document.createElement('span');
      contactEmoji.textContent = '👤';
      contactEmoji.classList.add('contact-emoji');

      const contactDisplayName = document.createElement('span');
      contactDisplayName.textContent = message.content.displayName;
      contactDisplayName.classList.add('contact-name');

      contactCard.appendChild(contactEmoji);
      contactCard.appendChild(contactDisplayName);

      contactCard.addEventListener('click', () => {
        alert(
          `Nome: ${message.content.displayName}\nNúmero: ${message.content.vcard.match(/TEL.*:(.*)/)[1]}`,
        );
      });

      messageContainer.appendChild(contactCard);
    } else if (
      message.messageType === 'locationMessage' ||
      message.messageType === 'liveLocationMessage'
    ) {
      const locationDiv = document.createElement('div');
      messageContainer.classList.add('location');

      const locationMessage = document.createElement('a');
      locationMessage.href = `https://www.google.com/maps/search/?api=1&query=${message.content.degreesLatitude},${message.content.degreesLongitude}`;
      locationMessage.target = '_blank';
      locationDiv.appendChild(locationMessage);

      const locationImage = document.createElement('img');
      locationImage.src = `data:image/jpeg;base64,${message.content.jpegThumbnail}`;
      locationMessage.appendChild(locationImage);

      const locationText = document.createElement('p');
      locationText.textContent =
        message.messageType === 'locationMessage'
          ? '📍 Localização'
          : '📍 Localização em tempo real';
      locationDiv.appendChild(locationText);

      messageContainer.appendChild(locationDiv);
    } else if (
      message.messageType === 'pollCreationMessage' ||
      message.messageType === 'pollCreationMessageV3'
    ) {
      const pollCard = document.createElement('div');
      pollCard.classList.add('poll-card');

      const pollTitle = document.createElement('h4');
      pollTitle.textContent = message.content.name;
      pollCard.appendChild(pollTitle);

      const optionsList = document.createElement('ul');
      for (const option of message.content.options) {
        const optionItem = document.createElement('li');
        optionItem.textContent = option.optionName;
        optionsList.appendChild(optionItem);
      }
      pollCard.appendChild(optionsList);

      messageContainer.appendChild(pollCard);
    } else {
      const messageContent = document.createElement('p');
      if (message.content.includes('http')) {
        const messageContentURL = document.createElement('a');
        messageContentURL.textContent = message.content;
        messageContentURL.href = message.content;
        messageContentURL.target = '_blank';
        messageContent.appendChild(messageContentURL);
      } else {
        messageContent.textContent = message.content;
        messageContainer.appendChild(messageContent);
      }
      messageContainer.appendChild(messageContent);
    }

    conversationContainer.appendChild(messageContainer);
  }

  const contactContainer = document.createElement('div');
  contactContainer.classList.add('contact-header');
  conversationContainer.appendChild(contactContainer);

  const contactImage = document.createElement('img');
  contactImage.src = contact.picture;
  contactImage.alt = contact.name;
  contactImage.classList.add('contact-image-header');
  contactContainer.appendChild(contactImage);

  const contactNameHeader = document.createElement('h3');
  contactNameHeader.textContent = contact.name;
  contactNameHeader.classList.add('contact-name-header');
  contactContainer.appendChild(contactNameHeader);
}

// Função assíncrona para enviar uma mensagem de texto
async function sendMessage(instanceName, number, text) {
  try {
    const response = await fetch(
      `http://localhost:8084/message/sendText/${instanceName}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          apikey: token,
        },
        body: JSON.stringify({
          number: number,
          options: {
            delay: 1200,
            presence: 'composing',
          },
          textMessage: {
            text: text,
          },
        }),
      },
    );

    // Verifica se a solicitação foi bem-sucedida
    if (!response.ok) {
      throw new Error(`Error: ${response.status} - ${response.statusText}`);
    }

    const responseData = await response.json();
    console.log('Mensagem enviada:', responseData);
    // Aqui você pode adicionar lógica adicional, como atualizar a interface de usuário para refletir a mensagem enviada.
  } catch (error) {
    console.error('Error sending message:', error.message);
    // Aqui você pode lidar com erros, como exibir uma mensagem de erro na interface de usuário.
  }
}

// Função para enviar mídia
async function sendMedia(instanceName, data) {
  try {
    console.log('Enviando mídia...');

    const response = await fetch(
      `http://localhost:8084/message/sendMediaFile/${instanceName}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: token,
        },
        body: data,
      },
    );

    if (!response.ok) {
      throw new Error(`Error: ${response.status} - ${response.statusText}`);
    }

    console.log('Mídia enviada com sucessoo!');
  } catch (error) {
    console.error('Error sending media:', error.message);
  }
}

// Adiciona um evento de clique ao botão de enviar mídia
document.getElementById('send-media-button').addEventListener('click', async () => {
  const mediaInput = document.getElementById('media-input');
  const mediaFile = mediaInput.files[0];

  if (mediaFile) {
    console.log('Arquivo selecionado:', mediaFile.name);

    // Obter o destinationJid armazenado
    const destinationJid = document.getElementById('destination-jid').value;

    const formData = new FormData();

    formData.append('number', destinationJid);
    // formData.append('caption', 'playlist');
    formData.append('attachment', mediaFile);

    // Defina o tipo de mídia com base no tipo de arquivo ou de alguma outra lógica
    let mediaType;
    if (mediaFile.type.startsWith('audio')) {
      mediaType = 'audio';
    } else if (mediaFile.type.startsWith('image')) {
      mediaType = 'image';
    } else {
      mediaType = 'document';
    }

    formData.append('mediatype', mediaType);
    formData.append('presence', 'composing');
    formData.append('delay', 1200);

    await sendMedia('Murilo', formData);
  }
});

// Adiciona um evento de clique ao botão de enviar mensagem
document.getElementById('send-button').addEventListener('click', async () => {
  const messageInput = document.getElementById('message-input');
  const message = messageInput.value.trim(); // Obtém o texto da mensagem e remove espaços em branco extras

  // Verifica se a mensagem não está vazia
  if (message !== '') {
    // Obter o destinationJid armazenado
    const destinationJid = document.getElementById('destination-jid').value;
    // Substitua 'SeuInstanceName' pelo nome da instância correta que você deseja usar ao enviar a mensagem.
    // Substitua '123@broadcast' pelo número dinâmico correto.
    await sendMessage('Lucas', destinationJid, message);

    // Limpa o campo de entrada após o envio da mensagem
    messageInput.value = '';
  }
});

// Inicia o processo de busca e exibição de contatos
contactCards('Lucas');
