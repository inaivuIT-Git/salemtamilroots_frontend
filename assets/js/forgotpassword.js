import { showToast } from "./toast.js";

/* ===========================
   ELEMENTS
=========================== */

const step1 = document.getElementById("step1");
const step2 = document.getElementById("step2");

const sendOtpBtn = document.getElementById("sendOtpBtn");
const resetBtn = document.getElementById("resetBtn");

const bgImage = document.getElementById("bgImage");

/* ===========================
   IMAGE PATHS
=========================== */

const OTP_IMG = "assets/Images/send-otp.png";
const RESET_IMG = "assets/Images/change-password.png";

/* ===========================
   DEFAULT IMAGE
=========================== */

if (bgImage) bgImage.style.backgroundImage = `url(${OTP_IMG})`;

/* ===========================
   SEND OTP
=========================== */

sendOtpBtn.addEventListener("click", async () => {

  const email = document.getElementById("email").value.trim().toLowerCase();

  if (!email) return showToast("Enter your email", "error");
  if (!email.includes("@")) return showToast("Enter valid email", "error");

  sendOtpBtn.disabled = true;
  sendOtpBtn.textContent = "Checking email...";

  try {
    // ================= VERIFY EMAIL =================
    const verifyRes = await fetch(`${API_BASE_URL}/api/Auth/verify-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });

    const verifyData = await verifyRes.json();

    if (!verifyRes.ok || !verifyData.isSuccess)
      throw new Error(verifyData.message || "Email not registered");

    // ================= SEND OTP =================
    sendOtpBtn.textContent = "Sending OTP...";

    const otpRes = await fetch(`${API_BASE_URL}/api/Auth/send-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        emailOrPhone: email,
        purpose: window.APP_CONFIG.OTP_PURPOSE.FORGOT_PASSWORD
      })
    });

    const otpData = await otpRes.json();

    if (!otpRes.ok || !otpData.isSuccess)
      throw new Error(otpData.message || "Failed to send OTP");

    showToast(`OTP sent to ${email}`, "success");

    // ================= MOVE TO STEP 2 =================
    step1.classList.remove("active");
    step2.classList.remove("active");
    void step2.offsetWidth;
    step2.classList.add("active");

    if (bgImage) bgImage.style.backgroundImage = `url(${RESET_IMG})`;

  } catch (err) {
    showToast(err.message, "error");
  }

  sendOtpBtn.disabled = false;
  sendOtpBtn.textContent = "Send OTP";
});


/* ===========================
   VERIFY OTP + RESET PASSWORD
=========================== */

resetBtn.addEventListener("click", async () => {

  const email = document.getElementById("email").value.trim().toLowerCase();
  const otp = document.getElementById("otp").value.trim();
  const newPwd = document.getElementById("newPassword").value.trim();
  const confirmPwd = document.getElementById("confirmPassword").value.trim();

  if (!otp || !newPwd || !confirmPwd)
    return showToast("Fill all fields", "error");

  if (newPwd.length < 6)
    return showToast("Password must be at least 6 characters", "error");

  if (newPwd !== confirmPwd)
    return showToast("Passwords do not match", "error");

  resetBtn.disabled = true;
  resetBtn.textContent = "Resetting Password ...";
  try {

    // ---------- VERIFY OTP ----------
    const verifyRes = await fetch(`${API_BASE_URL}/api/Auth/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        emailOrPhone: email,
        otp: otp,
        purpose: window.APP_CONFIG.OTP_PURPOSE.FORGOT_PASSWORD
      })
    });

    const verifyData = await verifyRes.json();

    if (!verifyRes.ok || !verifyData.isSuccess)
      throw new Error(verifyData.message || "Invalid OTP");

    // ---------- RESET PASSWORD ----------
    const resetRes = await fetch(`${API_BASE_URL}/api/Auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email,
        newPassword: newPwd
      })
    });

    const resetData = await resetRes.json();

    if (!resetRes.ok || !resetData.isSuccess)
      throw new Error(resetData.message || "Password reset failed");

    showToast("Password reset successful", "success");

    setTimeout(() => {
      window.location.href = "/FrontEnd/signin.html";
    }, 1200);

  } catch (err) {
    showToast(err.message, "error");
  }
  resetBtn.disabled = false;
  resetBtn.textContent = "Reset Password";
});

/* ===========================
   PASSWORD EYE TOGGLE (FIXED)
=========================== */

document.querySelectorAll(".toggle-eye").forEach(icon => {

  icon.addEventListener("click", function () {

    const inputId = this.getAttribute("data-target");
    const input = document.getElementById(inputId);
    if (!input) return;

    const isHidden = input.type === "password";
    input.type = isHidden ? "text" : "password";

    this.classList.toggle("bi-eye");
    this.classList.toggle("bi-eye-slash");

    this.classList.add("animate-eye");
    setTimeout(() => this.classList.remove("animate-eye"), 200);
  });
});
