const token = "zYzP7ocstxh3Sscefew4FZTCu4ehnM8v4hu";

async function contactCards(instanceName) {
  const getPicture = async (jid) => {
    try {
      const request = await fetch(`http://localhost:8084/chat/fetchProfilePictureUrl/${instanceName}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "apikey": token
        },
        body: JSON.stringify({
          "number": jid,
        })
      });

      if (!request.ok) {
        throw new Error(`Error: ${request.status} - ${request.statusText}`);
      }

      const response = await request.json();

      if (response && response.profilePictureUrl) {
        return response.profilePictureUrl;
      }

      return "";
    } catch (error) {
      console.error("Error fetching profile picture:", error.message);
      return "";
    }
  };

  const messageResponse = await fetch(`http://localhost:8084/chat/findMessages/${instanceName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      "apikey": token
    },
    body: JSON.stringify({
      "page": 1,
    })
  });

  const messageData = await messageResponse.json();
  const records = messageData.messages.records;
  console.log(records); 

  const contactsMap = new Map();
  records.forEach((item) => {
    if (!contactsMap.has(item.keyRemoteJid)) {
      contactsMap.set(item.keyRemoteJid, {
        jid: item.keyRemoteJid,
        name: null,
        picture: "",
        messages: [
          {
            name: item.pushName,
            content: item.content,
          }
        ]
      });
    } else {
      contactsMap.get(item.keyRemoteJid).messages.push({
        name: item.pushName,
        content: item.content,
      });
      if (!item.keyFromMe && contactsMap.get(item.keyRemoteJid).name === null) {
        contactsMap.get(item.keyRemoteJid).name = item.pushName;
      }
    }
  });

  const contacts = await Promise.all([...contactsMap.values()].map(async (contact) => {
    const picture = await getPicture(contact.jid);
    contact.picture = picture;
    contact.lastMessage = contact.messages[0];
    return contact;
  }));

  const fiveContacts = contacts.slice(0, 5);
  console.log(fiveContacts);

  displayContacts(fiveContacts);
}

function displayContacts(contacts) {
  const contactsContainer = document.getElementById('contacts-container');
  contactsContainer.innerHTML = ''; // Limpa o conteúdo anterior

  contacts.forEach(contact => {
    const card = document.createElement('div');
    card.classList.add('contact-card');

    const image = document.createElement('img');
    image.src = contact.picture;
    image.alt = contact.name;

    const contactName = document.createElement('h2');
    contactName.textContent = contact.name;

    const name = document.createElement('p');
    name.textContent = contact.lastMessage.name;

    const lastMessage = document.createElement('p');
    lastMessage.textContent = contact.lastMessage.content;

    card.appendChild(image);
    card.appendChild(contactName);
    card.appendChild(name);
    card.appendChild(lastMessage);

    contactsContainer.appendChild(card);
});
}

contactCards("Lucas");

// ptt = audio
// url = imagem
// text = texto