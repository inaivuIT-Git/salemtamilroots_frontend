const bgImage = document.querySelector(".image-section");

if (bgImage) {
  bgImage.style.backgroundImage =
    "url('assets/Images/signin.png')";
}

import { showToast } from "./toast.js";


const params = new URLSearchParams(window.location.search);
const returnUrl = params.get("returnUrl");

const form = document.getElementById("loginForm");
const cancelBtn = document.getElementById("cancelBtn");
const errorMsg = document.getElementById("errorMsg");
const successful = document.getElementById("successful");

const togglePwd = document.getElementById("password");
const eyeToggle = document.getElementById("togglePassword");

const loginBtn = document.getElementById("loginBtn");
const loginLoader = document.getElementById("loginLoader");
const loginText = document.querySelector(".btn-text");

form.addEventListener("submit", async function (e) {
  e.preventDefault();

  const emailOrPhone = document.getElementById("number").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!emailOrPhone || !password) {
    return showMessage(errorMsg, "Please fill in both fields.");
  }

  // 👉 Show loader
  loginBtn.disabled = true;
  loginLoader.classList.remove("d-none");
  loginText.textContent = "Signing in...";

  try {
    const response = await fetch(`${API_BASE_URL}/api/Auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emailOrPhone, password }),
    });

    let result;
    try {
      result = await response.json();
    } catch {
      result = { message: "Invalid response format from server." };
    }

    const message =
      result.message ||
      result.error ||
      result.title ||
      "Login Successful.";

    if (response.ok) {
      const token = result.data.token;
      const user = result.data.user;

      const userType = user.userType;
      sessionStorage.setItem("token", token);
      sessionStorage.setItem("userType", userType);
      sessionStorage.setItem("userId", user.userId);

      if (userType === "Customer") {
        sessionStorage.setItem("customerId", user.customerId);
      } else if (userType === "SellerAdmin") {
        sessionStorage.setItem("sellerId", user.sellerId);
      } else if (userType === "Admin") {
        sessionStorage.setItem("adminId", user.adminId);
      }

      showToast("Login Successful", "success");

      setTimeout(() => {
        resetLoginButton();

        const params = new URLSearchParams(window.location.search);
        const returnUrl = params.get("returnUrl");

        if (returnUrl) {
          window.location.href = returnUrl;
          return; // ✅ stop further execution
        }

        if (userType === "Customer") {
          window.location.href = "index.html";
        } else if (userType === "SellerAdmin") {
          window.location.href = "seller_layout.html";
        } else if (userType === "Admin") {
          window.location.href = "AdminPage.html";
        }
      }, 1000);
    } else {
      resetLoginButton();

      console.log("STATUS:", response.status);
      console.log("RESULT:", result);

      const backendMessage =
        result?.error?.message ||
        result?.message ||
        result?.error ||
        "Login failed";

      showToast(backendMessage, "error");
    }
  } catch (error) {
    console.error("Network Error:", error);
    resetLoginButton();
    showToast("Unable to connect to the server.", "error");
  }
});

cancelBtn.addEventListener("click", () => {
  errorMsg.style.display = "none";
  window.location.replace("index.html");
});


function resetLoginButton() {
  loginBtn.disabled = false;
  loginLoader.classList.add("d-none");
  loginText.textContent = "Login";
}

function showMessage(element, message, success = false) {
  element.textContent = message;
  element.style.display = "block";
  element.style.color = success ? "green" : "red";

  setTimeout(() => {
    element.style.display = "none";
  }, 4000);
}

// ✔ Password Show / Hide Toggle
eyeToggle.addEventListener("click", function () {
  const isHidden = togglePwd.getAttribute("type") === "password";
  togglePwd.setAttribute("type", isHidden ? "text" : "password");

  this.classList.add("animate-eye");
  setTimeout(() => this.classList.remove("animate-eye"), 200);

  this.classList.toggle("bi-eye");
  this.classList.toggle("bi-eye-slash");
});
