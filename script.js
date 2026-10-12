const STUDENTS_KEY = "campusPortalStudents";
const AUTH_KEY = "campusPortalAuth";
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "1234";

function readStudents() {
  const savedStudents = localStorage.getItem(STUDENTS_KEY);
  if (!savedStudents) return [];

  const students = JSON.parse(savedStudents);
  if (!Array.isArray(students)) {
    throw new Error("Saved student records are not in a valid format.");
  }
  return students;
}

function showError(elementId, message) {
  const element = document.getElementById(elementId);
  element.textContent = message;
  element.hidden = false;
}

function saveAuth(auth) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
}

const loginForm = document.getElementById("login-form");
if (loginForm) {
  document.getElementById("login-tab").addEventListener("click", () => setAuthTab("login"));
  document.getElementById("signup-tab").addEventListener("click", () => setAuthTab("signup"));

  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const username = document.getElementById("login-username").value.trim();
    const password = document.getElementById("login-password").value;
    const role = document.getElementById("login-role").value;

    try {
      if (role === "Admin" && username.toLowerCase() === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        saveAuth({ username: ADMIN_USERNAME, role: "Admin" });
        window.location.assign("admin.html");
        return;
      }

      if (role === "Student") {
        const student = readStudents().find((record) =>
          record.username.toLowerCase() === username.toLowerCase() && record.password === password
        );
        if (student) {
          saveAuth({ username: student.username, role: "Student", studentId: student.studentId });
          window.location.assign("student.html");
          return;
        }
      }

      showError("login-error", "Those sign-in details don't match an account. Please check and try again.");
    } catch (error) {
      showError("login-error", `Unable to sign in: ${error.message}`);
    }
  });

  document.getElementById("signup-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const student = {
      name: form.elements.namedItem("name").value.trim(),
      studentId: form.elements.namedItem("studentId").value.trim(),
      year: form.elements.namedItem("year").value,
      course: form.elements.namedItem("course").value.trim(),
      username: form.elements.namedItem("username").value.trim(),
      password: form.elements.namedItem("password").value
    };

    if (student.username.length < 3 || student.password.length < 6) {
      showError("signup-error", "Username must be at least 3 characters and password at least 6 characters.");
      return;
    }

    try {
      const students = readStudents();
      const duplicate = students.some((record) =>
        record.username.toLowerCase() === student.username.toLowerCase() ||
        record.studentId.toLowerCase() === student.studentId.toLowerCase()
      );
      if (duplicate) {
        showError("signup-error", "That username or student ID is already registered.");
        return;
      }

      students.push(student);
      localStorage.setItem(STUDENTS_KEY, JSON.stringify(students));
      saveAuth({ username: student.username, role: "Student", studentId: student.studentId });
      window.location.assign("student.html");
    } catch (error) {
      showError("signup-error", `Unable to create your account: ${error.message}`);
    }
  });
}

function setAuthTab(activeTab) {
  const isLogin = activeTab === "login";
  const loginTab = document.getElementById("login-tab");
  const signupTab = document.getElementById("signup-tab");
  loginTab.classList.toggle("is-active", isLogin);
  signupTab.classList.toggle("is-active", !isLogin);
  loginTab.setAttribute("aria-selected", String(isLogin));
  signupTab.setAttribute("aria-selected", String(!isLogin));
  document.getElementById("login-panel").hidden = !isLogin;
  document.getElementById("signup-panel").hidden = isLogin;
}

function getAuth(requiredRole) {
  try {
    const auth = JSON.parse(localStorage.getItem(AUTH_KEY) || "null");
    if (auth && auth.role === requiredRole) return auth;
  } catch (error) {
    console.error("Unable to read the current account session.", error);
  }
  window.location.replace("index.html");
  return null;
}

function signOut() {
  localStorage.removeItem(AUTH_KEY);
  window.location.assign("index.html");
}

document.querySelectorAll("[data-sign-out]").forEach((button) => {
  button.addEventListener("click", signOut);
});

const adminPage = document.getElementById("student-roster");
if (adminPage) {
  const auth = getAuth("Admin");
  if (auth) {
    document.getElementById("admin-username").textContent = auth.username;
    renderRoster();
  }
}

function renderRoster() {
  const roster = document.getElementById("student-roster");
  if (!roster) return;

  try {
    const students = readStudents();
    document.getElementById("student-count").textContent = String(students.length);
    roster.replaceChildren();

    if (students.length === 0) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 6;
      cell.className = "empty-state";
      cell.textContent = "No students have registered yet.";
      row.append(cell);
      roster.append(row);
      return;
    }

    students.forEach((student) => {
      const row = document.createElement("tr");
      [student.name, student.studentId, student.year, student.course, student.username].forEach((value) => {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.append(cell);
      });

      const actionCell = document.createElement("td");
      const removeButton = document.createElement("button");
      removeButton.className = "button button-danger";
      removeButton.type = "button";
      removeButton.textContent = "Remove";
      removeButton.setAttribute("aria-label", `Remove student ${student.name}`);
      removeButton.addEventListener("click", () => removeStudent(student.studentId));
      actionCell.append(removeButton);
      row.append(actionCell);
      roster.append(row);
    });
  } catch (error) {
    const message = document.getElementById("roster-error");
    message.textContent = `Unable to load student records: ${error.message}`;
    message.hidden = false;
  }
}

function removeStudent(studentId) {
  if (!window.confirm("Remove this student account and its details?")) return;
  try {
    const students = readStudents();
    localStorage.setItem(STUDENTS_KEY, JSON.stringify(students.filter((student) => student.studentId !== studentId)));
    renderRoster();
  } catch (error) {
    const message = document.getElementById("roster-error");
    message.textContent = `Unable to remove student: ${error.message}`;
    message.hidden = false;
  }
}

const studentPage = document.getElementById("student-details");
if (studentPage) {
  const auth = getAuth("Student");
  if (auth) {
    try {
      const student = readStudents().find((record) => record.studentId === auth.studentId);
      if (!student) {
        signOut();
      } else {
        document.getElementById("student-welcome").textContent = `Welcome, ${student.name}`;
        document.getElementById("student-username").textContent = student.username;
        document.querySelectorAll("[data-student-field]").forEach((element) => {
          element.textContent = student[element.dataset.studentField];
        });
      }
    } catch (error) {
      const message = document.getElementById("student-error");
      message.textContent = `Unable to load your student details: ${error.message}`;
      message.hidden = false;
    }
  }
}
