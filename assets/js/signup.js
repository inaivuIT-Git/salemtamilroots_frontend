document.addEventListener("DOMContentLoaded", () => {

    /* ===============================
       STATE
    =============================== */
    let otpSent = false;
    let otpVerified = false;
    let hasSubmitted = false;

    /* ===============================
       ELEMENTS
    =============================== */
    const form = document.querySelector(".needs-validation");
    const signupBtn = document.getElementById("signupBtn");
    const spinner = document.getElementById("loadingSpinner");

    const emailInput = document.getElementById("email");
    const sendOtpBtn = document.getElementById("sendOtpBtn");

    const otpModal = document.getElementById("otpModal");
    const otpBoxes = document.querySelectorAll(".otp-box");
    const verifyOtpBtn = document.getElementById("verifyOtpBtn");
    const otpError = document.getElementById("otpError");

    const signupToast = new bootstrap.Toast(document.getElementById("signupToast"));
    const errorToast = bootstrap.Toast.getOrCreateInstance(
        document.getElementById("errorToast")
    );
    const errorToastMsg = document.getElementById("errorToastMsg");

    /* ===============================
       HELPERS
    =============================== */

    const normalizeEmail = () =>
        emailInput.value.trim().toLowerCase();

    function showError(message) {
        errorToastMsg.textContent = message;
        errorToast.show();
    }

    function isFormValid() {
        return form.checkValidity();
    }

    function updateSignupButton() {
        signupBtn.disabled = !(isFormValid() && otpVerified);
    }

    function resetOtpState() {
        otpSent = false;
        otpVerified = false;
        verifyOtpBtn.disabled = true;
        otpError.classList.add("d-none");
        otpBoxes.forEach(b => b.value = "");
        //updateSignupButton();
    }

    /* ===============================
       PASSWORD VISIBILITY
    =============================== */

    const togglePassword = document.getElementById("togglePassword");
    const passwordInput = document.getElementById("password");

    togglePassword.addEventListener("click", () => {
        const isHidden = passwordInput.type === "password";
        passwordInput.type = isHidden ? "text" : "password";
        togglePassword.classList.toggle("bi-eye");
        togglePassword.classList.toggle("bi-eye-slash");
    });

    /* ===============================
       PASSWORD MATCH VALIDATION
    =============================== */

    function validatePasswordMatch() {
        const pass = passwordInput.value;
        const confirm = document.getElementById("confirmPassword");

        confirm.setCustomValidity(
            pass !== confirm.value ? "Passwords do not match" : ""
        );
    }

    passwordInput.addEventListener("input", validatePasswordMatch);
    document.getElementById("confirmPassword")
        .addEventListener("input", validatePasswordMatch);

    /* ===============================
       EMAIL VALIDATION + OTP BUTTON
    =============================== */

    emailInput.addEventListener("input", () => {
        sendOtpBtn.disabled = !emailInput.checkValidity();
        resetOtpState();
    });

    /* ===============================
       SEND OTP
    =============================== */

    sendOtpBtn.addEventListener("click", async () => {
        if (!emailInput.checkValidity() || otpSent) return;

        try {
            sendOtpBtn.disabled = true;

            const res = await fetch(
                `${API_BASE_URL}/api/Auth/send-otp`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        emailOrPhone: normalizeEmail(),
                        purpose: window.APP_CONFIG.OTP_PURPOSE.SIGNUP
                    })
                }
            );

            const data = await res.json();
            console.log("res", res);
            console.log("result", data);
            if (!res.ok || !data.isSuccess) {
                throw new Error(data.message || "Failed to send OTP");
            }
            otpSent = true;
            bootstrap.Modal.getOrCreateInstance(otpModal).show();
            otpBoxes[0].focus();

        } catch (err) {
            showError(err.message);
            sendOtpBtn.disabled = false;
        }
    });

    /* ===============================
       OTP INPUT HANDLING
    =============================== */

    function getOtp() {
        return Array.from(otpBoxes).map(b => b.value).join("");
    }

    function updateVerifyButton() {
        verifyOtpBtn.disabled = getOtp().length !== 4;
    }

    otpBoxes.forEach((box, index) => {

        box.addEventListener("input", () => {
            box.value = box.value.replace(/\D/g, "");
            if (box.value && index < otpBoxes.length - 1) {
                otpBoxes[index + 1].focus();
            }
            updateVerifyButton();
        });

        box.addEventListener("keydown", e => {
            if (e.key === "Backspace" && !box.value && index > 0) {
                otpBoxes[index - 1].focus();
            }
        });

    });

    /* ===============================
       VERIFY OTP
    =============================== */

    verifyOtpBtn.addEventListener("click", async () => {
        try {
            const otp = getOtp();
            otpError.classList.add("d-none");

            const res = await fetch(
                `${API_BASE_URL}/api/Auth/verify-otp`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        emailOrPhone: normalizeEmail(),
                        otp: otp,
                        purpose: window.APP_CONFIG.OTP_PURPOSE.SIGNUP
                    })
                }
            );

            const data = await res.json();
            console.log("result", data);
            if (!res.ok || !data.isSuccess)
                throw new Error(data.message || "Invalid OTP");

            otpVerified = true;
            emailInput.readOnly = true;

            // show verified icon
            document.getElementById("emailVerifiedIcon")
                .classList.remove("d-none");
            document.getElementById("sendOtpBtn").classList.add("d-none");

            // close modal
            bootstrap.Modal.getInstance(otpModal).hide();

            //updateSignupButton();

        } catch (err) {
            otpError.textContent = err.message;
            otpError.classList.remove("d-none");
            otpVerified = false;
            // updateSignupButton();
        }
    });

    /* ===============================
       FORM SUBMIT
    =============================== */


    form.addEventListener("submit", async (e) => {
    e.preventDefault();
    e.stopPropagation();

    hasSubmitted = true;
    form.classList.add("was-validated");

    try {
        // Form validation
        if (!isFormValid()) {
            showError("Please complete the form correctly before submitting.");
            return;
        }

        // OTP validation
        if (!otpVerified) {
            showError("Please verify your email before signing up.");
            return;
        }

        const userData = {
            firstname: firstname.value.trim(),
            lastname: lastname.value.trim(),
            phone: phone.value.trim(),
            email: normalizeEmail(),
            passwordhash: passwordInput.value
        };

        spinner.classList.remove("d-none");
        signupBtn.disabled = true;

        const res = await fetch(`${API_BASE_URL}/api/SignUp/customer`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(userData)
        });

        const data = await res.json();

        if (!res.ok || !data.isSuccess) {
            throw new Error(data?.error?.message || "Signup failed");
        }

        signupToast.show();
        setTimeout(() => {
            window.location.href = "signin.html";
        }, 1200);

    } catch (err) {
        console.error(err);
        showError(err.message || "Something went wrong");
        signupBtn.disabled = false;
    } finally {
        spinner.classList.add("d-none");
    }
});


});
