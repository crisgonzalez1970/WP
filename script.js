const STORAGE_KEY = "auth-demo-users";
const AUTH_KEY = "auth-demo-user";

const loginView = document.getElementById("login-view");
const dashboardView = document.getElementById("dashboard-view");
const usersView = document.getElementById("users-view");
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

let users = [];

function setMessage(element, text, isError = false) {
  element.textContent = text;
  element.classList.toggle("error", isError);
}

function showView(viewName) {
  loginView.classList.remove("active");
  dashboardView.classList.remove("active");
  usersView.classList.remove("active");

  if (viewName === "login") {
    loginView.classList.add("active");
  } else if (viewName === "dashboard") {
    dashboardView.classList.add("active");
  } else if (viewName === "users") {
    usersView.classList.add("active");
  }
}

function resetUserForm() {
  userForm.reset();
  userIdInput.value = "";
  userRoleInput.value = "viewer";
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
  showView("dashboard");
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

  if (id) {
    users = users.map((user) => (user.id === Number(id) ? { ...user, username, password, role } : user));
    setMessage(usersMessage, "Usuario actualizado correctamente.");
  } else {
    const newUser = {
      id: Date.now(),
      username,
      password,
      role
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
      showView("users");
      userUsernameInput.focus();
    }
  }
});

const showAbmDashboardBtn = document.getElementById("show-abm-dashboard-btn");
const backToLoginBtn = document.getElementById("back-to-login-btn");
const cancelUserBtn = document.getElementById("cancel-user-btn");
const logoutBtn = document.getElementById("logout-btn");

showAbmDashboardBtn.addEventListener("click", () => {
  showView("users");
  setMessage(usersMessage, "");
});

backToLoginBtn.addEventListener("click", () => {
  showView("dashboard");
  setMessage(loginMessage, "");
});

cancelUserBtn.addEventListener("click", () => {
  resetUserForm();
  setMessage(usersMessage, "");
});

logoutBtn.addEventListener("click", () => {
  sessionStorage.removeItem(AUTH_KEY);
  showView("login");
  loginForm.reset();
  setMessage(loginMessage, "");
});

(async () => {
  await loadUsers();
  renderUsersTable();
  resetUserForm();

  const savedUser = sessionStorage.getItem(AUTH_KEY);
  if (savedUser) {
    showDashboard(savedUser);
  } else {
    showView("login");
  }
})();

