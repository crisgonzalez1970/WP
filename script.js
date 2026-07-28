const STORAGE_KEY = "auth-demo-users";
const AUTH_KEY = "auth-demo-user";
const ALBUM_KEY = "auth-demo-album";

const loginView = document.getElementById("login-view");
const dashboardView = document.getElementById("dashboard-view");
const usersView = document.getElementById("users-view");
const albumView = document.getElementById("album-view");
const loginForm = document.getElementById("login-form");
const loginMessage = document.getElementById("login-message");
const welcomeName = document.getElementById("welcome-name");
const usersMessage = document.getElementById("users-message");
const usersTableBody = document.getElementById("users-table-body");
const userForm = document.getElementById("user-form");
const userIdInput = document.getElementById("user-id");
const userUsernameInput = document.getElementById("user-username");
const userPasswordInput = document.getElementById("user-password");
const userRoleInput = document.getElementById("user-role");
const driveFolderIdInput = document.getElementById("drive-folder-id");
const driveApiKeyInput = document.getElementById("drive-api-key");
const driveViewUrlInput = document.getElementById("drive-view-url");

let users = [];
let albumPhotos = [];
let driveAccessToken = null;

function setMessage(element, text, isError = false) {
  element.textContent = text;
  element.classList.toggle("error", isError);
}

function showView(viewName) {
  document.querySelectorAll(".page-panel").forEach((panel) => {
    panel.classList.remove("active");
  });
  document.querySelectorAll(".sidebar-button").forEach((button) => {
    button.classList.remove("active");
  });

  const target = document.getElementById(viewName);
  if (target) {
    target.classList.add("active");
  }

  const activeButton = document.querySelector(`.sidebar-button[data-page="${viewName}"]`);
  if (activeButton) {
    activeButton.classList.add("active");
  }
}

function resetUserForm() {
  userForm.reset();
  userIdInput.value = "";
  userRoleInput.value = "viewer";
  driveFolderIdInput.value = "";
  driveApiKeyInput.value = "";
  driveViewUrlInput.value = "";
}

function renderUsersTable() {
  if (!usersTableBody) {
    return;
  }

  usersTableBody.innerHTML = "";

  users.forEach((user) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${user.username}</td>
      <td>${user.password}</td>
      <td>${user.role}</td>
      <td>
        <button class="action-btn" type="button" data-action="edit" data-id="${user.id}">Editar</button>
        <button class="action-btn" type="button" data-action="delete" data-id="${user.id}">Eliminar</button>
      </td>
    `;
    usersTableBody.appendChild(row);
  });
}

function persistUsers() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

async function loadUsers() {
  const savedUsers = localStorage.getItem(STORAGE_KEY);
  if (savedUsers) {
    users = JSON.parse(savedUsers);
    return users;
  }

  try {
    const response = await fetch("./BD/users.json");
    if (!response.ok) throw new Error("No se pudo cargar la base de usuarios");
    users = await response.json();
    persistUsers();
    return users;
  } catch (error) {
    console.error(error);
    users = [
      { id: 1, username: "demo", password: "demo123", role: "viewer" },
      { id: 2, username: "admin", password: "admin123", role: "admin" }
    ];
    persistUsers();
    return users;
  }
}

function showDashboard(username) {
  welcomeName.textContent = `Hola, ${username}. Tu acceso fue validado correctamente.`;
  showView("dashboard-view");
}

function persistAlbum() {
  localStorage.setItem(ALBUM_KEY, JSON.stringify(albumPhotos));
}

function getSortedPhotos() {
  const sorted = [...albumPhotos].sort((a, b) => new Date(b.date) - new Date(a.date));
  return sorted;
}

function renderAlbum() {
  const albumGrid = document.getElementById("album-grid");
  const sortValue = document.getElementById("album-sort").value;
  const photos = sortValue === "asc" ? [...albumPhotos].sort((a, b) => new Date(a.date) - new Date(b.date)) : getSortedPhotos();

  const activeDrive = users.find((user) => user.username === sessionStorage.getItem(AUTH_KEY));
  const driveInfo = activeDrive ? `Fuente: ${activeDrive.driveFolderId || "sin álbum"}` : "";

  albumGrid.innerHTML = "";

  if (!photos.length) {
    albumGrid.innerHTML = `<div><p class="message">No hay fotos aún.</p><p class="message">${driveInfo}</p></div>`;
    return;
  }

  photos.forEach((photo) => {
    const card = document.createElement("article");
    card.className = "album-card";
    card.innerHTML = `
      <img src="${photo.url}" alt="${photo.name}" />
      <div class="album-info">
        <h3>${photo.name}</h3>
        <p><strong>Lugar:</strong> ${photo.place}</p>
        <p><strong>Evento:</strong> ${photo.event}</p>
        <p><strong>Fecha:</strong> ${photo.date}</p>
        <button class="action-btn" type="button" data-edit-id="${photo.id}">Editar</button>
      </div>
    `;
    albumGrid.appendChild(card);
  });
}

function loadAlbum() {
  const saved = localStorage.getItem(ALBUM_KEY);
  if (saved) {
    albumPhotos = JSON.parse(saved);
    return;
  }

  albumPhotos = [
    {
      id: 1,
      name: "Atardecer en la montaña",
      place: "Bariloche",
      event: "Viaje familiar",
      date: "2024-05-10",
      driveFileId: "",
      url: "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=800&q=80"
    },
    {
      id: 2,
      name: "Playa del amanecer",
      place: "Mar del Plata",
      event: "Fin de semana",
      date: "2024-08-20",
      driveFileId: "",
      url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80"
    },
    {
      id: 3,
      name: "Ciudad nocturna",
      place: "Buenos Aires",
      event: "Salida de trabajo",
      date: "2025-01-15",
      driveFileId: "",
      url: "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=800&q=80"
    }
  ];
  persistAlbum();
}

function getActiveDriveUser() {
  const username = sessionStorage.getItem(AUTH_KEY);
  return users.find((user) => user.username === username) || null;
}

async function initializeDriveApi(activeUser) {
  if (window.gapi?.client) {
    return;
  }

  await new Promise((resolve, reject) => {
    const existingScript = document.getElementById("gapi-script");
    if (existingScript) {
      existingScript.addEventListener("load", resolve, { once: true });
    } else {
      const script = document.createElement("script");
      script.id = "gapi-script";
      script.src = "https://apis.google.com/js/api.js";
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    }
  });

  const apiKey = activeUser?.driveApiKey || "";
  await window.gapi.client.init({
    apiKey,
    discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"],
  });
}

async function requestDriveAccessToken(activeUser) {
  if (driveAccessToken) {
    return driveAccessToken;
  }

  const clientId = activeUser?.driveApiKey || "";
  if (!clientId) {
    throw new Error("Configura un Client ID de Google OAuth en el ABM para sincronizar con Google Photos.");
  }

  await initializeDriveApi(activeUser);

  return new Promise((resolve, reject) => {
    const tokenClient = window.google?.accounts?.oauth2?.initTokenClient({
      client_id: clientId,
      scope: "https://www.googleapis.com/auth/drive.file",
      callback: (response) => {
        if (response.error) {
          reject(new Error(response.error));
          return;
        }

        driveAccessToken = response.access_token;
        window.gapi.client.setToken({ access_token: response.access_token });
        resolve(response.access_token);
      }
    });

    if (!tokenClient) {
      reject(new Error("No se pudo inicializar Google Auth. Verifica el Client ID."));
      return;
    }

    tokenClient.requestAccessToken();
  });
}

async function updatePhotoMetadataInDrive(photo, activeUser) {
  if (!photo.driveFileId) {
    throw new Error("Agrega el ID del archivo de Drive para sincronizar esta foto.");
  }

  const accessToken = await requestDriveAccessToken(activeUser);
  if (!accessToken) {
    throw new Error("No se pudo obtener acceso a Drive.");
  }

  const payload = {
    name: photo.name || "foto",
    description: JSON.stringify({
      place: photo.place,
      event: photo.event,
      date: photo.date,
      source: "auth-welcome-app"
    })
  };

  await window.gapi.client.drive.files.update({
    fileId: photo.driveFileId,
    resource: payload,
    supportsAllDrives: true,
    fields: "id,name,description"
  });
}

function authenticateUser(username, password) {
  return users.find((user) => user.username === username && user.password === password);
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (users.length === 0) {
    await loadUsers();
  }

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const foundUser = authenticateUser(username, password);

  if (foundUser) {
    sessionStorage.setItem(AUTH_KEY, foundUser.username);
    setMessage(loginMessage, "");
    showDashboard(foundUser.username);
  } else {
    setMessage(loginMessage, "Usuario o contraseña incorrectos.", true);
  }
});

userForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const username = userUsernameInput.value.trim();
  const password = userPasswordInput.value.trim();
  const role = userRoleInput.value;
  const id = userIdInput.value;

  if (!username || !password) {
    setMessage(usersMessage, "Completa usuario y contraseña.", true);
    return;
  }

  const driveFolderId = driveFolderIdInput.value.trim();
  const driveApiKey = driveApiKeyInput.value.trim();
  const driveViewUrl = driveViewUrlInput.value.trim();

  if (id) {
    users = users.map((user) =>
      user.id === Number(id)
        ? { ...user, username, password, role, driveFolderId, driveApiKey, driveViewUrl }
        : user
    );
    setMessage(usersMessage, "Usuario actualizado correctamente.");
  } else {
    const newUser = {
      id: Date.now(),
      username,
      password,
      role,
      driveFolderId,
      driveApiKey,
      driveViewUrl
    };
    users.push(newUser);
    setMessage(usersMessage, "Usuario creado correctamente.");
  }

  persistUsers();
  renderUsersTable();
  resetUserForm();
});

usersTableBody.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) {
    return;
  }

  const { action, id } = button.dataset;

  if (action === "delete") {
    users = users.filter((user) => user.id !== Number(id));
    persistUsers();
    renderUsersTable();
    setMessage(usersMessage, "Usuario eliminado.");
  }

  if (action === "edit") {
    const user = users.find((entry) => entry.id === Number(id));
    if (user) {
      userIdInput.value = user.id;
      userUsernameInput.value = user.username;
      userPasswordInput.value = user.password;
      userRoleInput.value = user.role;
      driveFolderIdInput.value = user.driveFolderId || "";
      driveApiKeyInput.value = user.driveApiKey || "";
      driveViewUrlInput.value = user.driveViewUrl || "";
      showView("users-view");
      userUsernameInput.focus();
    }
  }
});

const showAbmDashboardBtn = document.getElementById("show-abm-dashboard-btn");
const showAlbumBtn = document.getElementById("show-album-btn");
const backToLoginBtn = document.getElementById("back-to-login-btn");
const backToDashboardBtn = document.getElementById("back-to-dashboard-btn");
const cancelUserBtn = document.getElementById("cancel-user-btn");
const logoutBtn = document.getElementById("logout-btn");
const sortAlbumBtn = document.getElementById("sort-album-btn");
const albumSort = document.getElementById("album-sort");
const albumForm = document.getElementById("album-form");
const sidebarButtons = document.querySelectorAll(".sidebar-button");
const albumIdInput = document.getElementById("album-id");
const albumNameInput = document.getElementById("album-name");
const albumPlaceInput = document.getElementById("album-place");
const albumEventInput = document.getElementById("album-event");
const albumDateInput = document.getElementById("album-date");
const albumDriveFileIdInput = document.getElementById("album-drive-file-id");
const albumMessage = document.getElementById("album-message");
const cancelAlbumBtn = document.getElementById("cancel-album-btn");

showAbmDashboardBtn.addEventListener("click", () => {
  showView("users-view");
  setMessage(usersMessage, "");
});

showAlbumBtn.addEventListener("click", () => {
  showView("album-view");
  renderAlbum();
});

backToLoginBtn.addEventListener("click", () => {
  showView("dashboard-view");
  setMessage(loginMessage, "");
});

backToDashboardBtn.addEventListener("click", () => {
  showView("dashboard-view");
});

cancelUserBtn.addEventListener("click", () => {
  resetUserForm();
  setMessage(usersMessage, "");
});

sortAlbumBtn.addEventListener("click", () => {
  renderAlbum();
});

albumSort.addEventListener("change", () => {
  renderAlbum();
});

sidebarButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const page = button.dataset.page;
    if (page) {
      showView(page);
      if (page === "album-view") {
        renderAlbum();
      }
    }
  });
});

albumForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const id = Number(albumIdInput.value);
  const photo = albumPhotos.find((entry) => entry.id === id);
  if (!photo) {
    setMessage(albumMessage, "No se encontró la foto.", true);
    return;
  }

  photo.name = albumNameInput.value.trim();
  photo.place = albumPlaceInput.value.trim();
  photo.event = albumEventInput.value.trim();
  photo.date = albumDateInput.value;
  photo.driveFileId = albumDriveFileIdInput.value.trim();

  persistAlbum();
  renderAlbum();

  const activeUser = getActiveDriveUser();
  try {
    if (photo.driveFileId) {
      await updatePhotoMetadataInDrive(photo, activeUser);
      setMessage(albumMessage, "Foto actualizada en Google Photos y en la app.");
    } else {
      setMessage(albumMessage, "Cambios guardados localmente. Agrega el ID del archivo de Photos para sincronizarlo.");
    }
  } catch (error) {
    setMessage(albumMessage, `Se guardó localmente, pero no se pudo sincronizar con Google Photos: ${error.message}`, true);
  }

  albumForm.reset();
  albumIdInput.value = "";
});

cancelAlbumBtn.addEventListener("click", () => {
  albumForm.reset();
  albumIdInput.value = "";
  albumDriveFileIdInput.value = "";
  setMessage(albumMessage, "");
});

document.getElementById("album-grid").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-edit-id]");
  if (!button) return;
  const photo = albumPhotos.find((entry) => entry.id === Number(button.dataset.editId));
  if (!photo) return;
  albumIdInput.value = photo.id;
  albumNameInput.value = photo.name;
  albumPlaceInput.value = photo.place;
  albumEventInput.value = photo.event;
  albumDateInput.value = photo.date;
  albumDriveFileIdInput.value = photo.driveFileId || "";
  setMessage(albumMessage, "Editando foto seleccionada. Solo se permite editar metadatos.");
});

logoutBtn.addEventListener("click", () => {
  sessionStorage.removeItem(AUTH_KEY);
  showView("login-view");
  loginForm.reset();
  setMessage(loginMessage, "");
});

(async () => {
  await loadUsers();
  loadAlbum();
  renderUsersTable();
  renderAlbum();
  resetUserForm();

  const savedUser = sessionStorage.getItem(AUTH_KEY);
  if (savedUser) {
    showDashboard(savedUser);
  } else {
    showView("login-view");
  }
})();

