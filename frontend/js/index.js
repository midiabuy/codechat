const url = "http://localhost:8084/instance/create"
const token = "zYzP7ocstxh3Sscefew4FZTCu4ehnM8v4hu"

async function createInstance(instanceName) {
  await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      "apikey": token
    },
    body: JSON.stringify({ "instanceName": instanceName }),
  });

  await fetch(`http://localhost:8084/instance/connect/${instanceName}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      "apikey": token
    },
  }).then(response => response.json())
    .then(data => {
      document.getElementById('qrcode').src = data.base64;
    });
}

document.getElementById("instance-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const instanceName = document.getElementById("input-instance").value;
  createInstance(instanceName);
});

document.getElementById("chat-button").addEventListener("click", () => {
  window.location.href = "chat.html";
});