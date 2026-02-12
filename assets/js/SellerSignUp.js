import { API_BASE_URL } from "./config.js";
document.addEventListener("DOMContentLoaded", () => {

    const form = document.querySelector(".needs-validation");
    const toastEl = document.getElementById("signupToast");
    const toast = new bootstrap.Toast(toastEl);
    const signupBtn = document.getElementById("signupBtn");
    const spinner = document.getElementById("loadingSpinner");


    //Paasword
    const togglePassword = document.querySelector("#togglePassword");
    const password = document.querySelector("#password");

    togglePassword.addEventListener("click", function () {
        const isHidden = password.getAttribute("type") === "password";
        password.setAttribute("type", isHidden ? "text" : "password");

        this.classList.toggle("bi-eye");
        this.classList.toggle("bi-eye-slash");
    });
    function validatePasswordMatch() {
        const pass = document.getElementById("password").value;
        const confirm = document.getElementById("confirmPassword").value;

        if (pass !== confirm) {
            document.getElementById("confirmPassword").setCustomValidity("Passwords do not match");
        } else {
            document.getElementById("confirmPassword").setCustomValidity("");
        }
    }

    document.getElementById("password").addEventListener("input", validatePasswordMatch);
    document.getElementById("confirmPassword").addEventListener("input", validatePasswordMatch);


    form.addEventListener("submit", function (event) {
        event.preventDefault();
        event.stopPropagation();

        if (!form.checkValidity()) {
            form.classList.add("was-validated");
            return;
        }

        const payload = {
            user: {
                id: 0,
                passwordHash: document.getElementById("password").value,
                email: document.getElementById("email").value,
                firstname: document.getElementById("firstname").value,
                lastname: document.getElementById("lastname").value,
                phone: document.getElementById("phone").value
            },
            business: {
                businessName: document.getElementById("businessName").value,
                legalEntityType: document.getElementById("businessType").value,
                gst: document.getElementById("gstNumber").value,
                description: document.getElementById("businessDescription").value
            },
            contact: {
                contactPerson: document.getElementById("contactPerson").value,
                contactMobile: document.getElementById("contactMobile").value,
                contactEmail: document.getElementById("contactEmail").value
            },
            address: {
                addressLine1: document.getElementById("address1").value,
                addressLine2: document.getElementById("address2").value,
                city: document.getElementById("city").value,
                district: document.getElementById("district").value,
                state: document.getElementById("state").value,
                postalCode: document.getElementById("postalcode").value,
                country: document.getElementById("country").value
            }
        };

        spinner.classList.remove("d-none");
        signupBtn.disabled = true;
        signupBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Creating Account...`;

        fetch(`${API_BASE_URL}/Api/SignUp/seller`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        })

            .then(async res => {
                if (!res.ok) {
                    let message = (await res.text()) || "Signup failed";
                    throw new Error(message);
                }
                return res.json();
            })

            .then(data => {
                setTimeout(() => {
                    spinner.classList.add("d-none");
                    signupBtn.disabled = false;
                    signupBtn.innerHTML = "Sign Up";
                    // Show modal after successful registration
                    const modal = new bootstrap.Modal(
                        document.getElementById('sellerSuccessModal')
                    );
                    modal.show();

                    // Redirect when OK is clicked
                    document.getElementById("okBtn").addEventListener("click", function () {
                        window.location.href = "index.html";
                    });
                    // toast.show();

                    // setTimeout(() => {
                    //     window.location.href = "signin.html";
                    // }, 1200);

                    form.reset();
                    form.classList.remove('was-validated');

                }, 1500);
            })


            .catch(async err => {
                spinner.classList.add("d-none");
                signupBtn.disabled = false;
                signupBtn.innerHTML = "Sign Up";

                let errorMessage = "Something went wrong";

                try {
                    // If err is a fetch Response (ex: res.status 409)
                    const errorJson = await err.json();
                    errorMessage = errorJson.error?.message || errorMessage;
                } catch {
                    // If err.message contains JSON string
                    try {
                        const parsed = JSON.parse(err.message);
                        errorMessage = parsed.error?.message || parsed.message || err.message;
                    } catch {
                        // fallback to normal JS error message
                        errorMessage = err.message;
                    }
                }

                console.log("ERROR:", errorMessage);

                document.getElementById("errorToastMsg").textContent = errorMessage;
                const errToast = bootstrap.Toast.getOrCreateInstance(document.getElementById("errorToast"));
                errToast.show();
            });

    });
});
