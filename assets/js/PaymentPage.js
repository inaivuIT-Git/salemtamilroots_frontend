import { callApi } from "./callApi.js";

const userId = sessionStorage.getItem("userId");
const orderId = sessionStorage.getItem("orderId");
const views = {
    empty: document.getElementById('view-empty'),
    upi: document.getElementById('view-upi'),
    cod: document.getElementById('view-cod')
};

const opts = {
    upi: document.getElementById('opt-upi'),
    cod: document.getElementById('opt-cod')
};

const confirmBtn = document.getElementById("btn-upi");

function selectMethod(method) {
    // 1. Reset UI Visuals
    Object.values(opts).forEach(el => el.classList.remove('active'));
    document.getElementById(`opt-${method}`).classList.add('active');

    // 2. Switch Content Views
    Object.values(views).forEach(el => el.classList.add('d-none-custom'));
    views[method].classList.remove('d-none-custom');

}

document.getElementById("opt-upi")
    .addEventListener("click", () => selectMethod("upi"));

document.getElementById("opt-cod")
    .addEventListener("click", () => selectMethod("cod"));


//----------------------
//API INTEGRATION
//----------------------
async function CreateCashFreeOrder() {
    try {
        const cashFreeOrderUrl = `${API_BASE_URL}/api/OrderProcess/cashfree/order/process`;
        const payload = {
            orderId: parseInt(orderId),
            userId: parseInt(userId)
        };
        const response = await callApi(cashFreeOrderUrl, payload, "POST");

        console.log("Cashfree order response", response);
        if (!response.success) {
            throw new Error("Failed to create Cashfree order");

        }
        console.log("Redirecting to Cashfree payment page...", response);
        const paymenetSessionId = response.data.paymentSessionId;
        sessionStorage.setItem("cashfreeOrderId", response.data.cashfreeOrderId);
        sessionStorage.setItem("paymentSessionId", paymenetSessionId);
        RedirectToCashfree(paymenetSessionId);
    }
    catch (error) {
        console.error("Cashfree order error:", error);
    }

}

function RedirectToCashfree(paymentSessionId) {
    const cashfree = Cashfree({
        mode: "sandbox",
    });

    let checkoutOptions = {
        paymentSessionId: paymentSessionId,
        redirectTarget: "_self",
        returnUrl: `${window.location.origin}/PaymentStatus.html`,
    }
    

    cashfree.checkout(checkoutOptions);
}

async function fetchPayment() {

    console.log("Fetching payment for Order ID:", orderId);
    try {
        const response = await fetch(`${API_BASE_URL}/api/OrderProcess/payment/${orderId}`)
        if (!response.ok) {
            console.error("Failed to fetch payment data", error);
        }

        const result = await response.json();
        const data = result.data;
        console.log(data);
        console.log(`Total Amount: ${data.amount}`);
        document.getElementById("totalAmount").textContent = data.amount.toFixed(2);
    }
    catch (error) {
        console.error("Error fetching payment data", error);
    }
}

// Place Order Event Listeners methods
async function placeOrder(paymentMethod) {

    try {
        const response = await fetch(
            `${API_BASE_URL}/api/OrderProcess/payment`,
            {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: parseInt(userId),
                    orderId: orderId,
                    paymentMethod,
                })
            }
        );

        const result = await response.json();

        if (!response.ok || result.isSuccess === false) {

            handleApiResponseError(result);
            return;
        }

        // ✅ Success
        const status = paymentMethod == "COD" ? "OrderConfirmed" : "PaymentPending";
        updateStatus(status);
        if (status === "OrderConfirmed") {
            sessionStorage.removeItem("orderId");
            sessionStorage.removeItem("selectedAddressId");
            sessionStorage.removeItem("paymentId");
            showSuccessAndRedirect();
        }


    } catch (error) {
        console.error("Network error:", error);
        redirectToErrorPage(
            "NETWORK",
            "We’re unable to reach the server right now. Please try again later."
        );
    }
}

async function updateStatus(status) {

    const updateUrl = `${API_BASE_URL}/api/OrderProcess/order/status`;
    const payload = {
        userId: parseInt(userId),
        orderId: parseInt(orderId),
        status: status
    }

    const response = await callApi(updateUrl, payload, "PUT");
    if (!response.success) {
        alert("update:Something Went wrong");
    }

}

async function updatePaymentStatus(status) {
    const endPointUrl = `${API_BASE_URL}/api/OrderProcess/payment/status`;
    const payload = {
        userId: parseInt(userId),
        orderId: parseInt(orderId),
        status: status
    }
    const response = await callApi(updateUrl, payload, "PUT");
    if (!response.success) {
        alert("update:Something Went wrong");
    }
}

document.addEventListener('DOMContentLoaded', function () {
    fetchPayment();
});

document.getElementById("btn-cod").addEventListener("click", function () {
    placeOrder("COD"); // Call the function to

});

document.getElementById("btn-upi").addEventListener("click", function () {
    placeOrder("UPI");
    CreateCashFreeOrder();
});

document.getElementById("paymentCancelBtn").addEventListener("click", () => {
    updateStatus("PaymentCancelled");
    updatePaymentStatus("Cancelled");
    sessionStorage.removeItem("selectedAddressId");
    sessionStorage.removeItem("orderId");
    sessionStorage.removeItem("paymentId");
    window.location.href = "viewcart.html";

})



// Error handler

function handleApiResponseError(apiResponse) {

    let message = "Something went wrong. Please try again.";
    let code = apiResponse?.statusCode || "ERROR";

    // Prefer backend error message
    if (apiResponse?.error?.message) {
        message = apiResponse.error.message;
    }

    const majorErrors = [401, 403, 404, 500, 502, 503];

    if (majorErrors.includes(code)) {
        redirectToErrorPage(code, message);
    } else {
        // For minor errors, show inline alert or toast
        alert(message);
    }
}


function redirectToErrorPage(code, message) {
    const params = new URLSearchParams({
        code,
        message
    });

    window.location.href = `error.html?${params.toString()}`;
}

function showSuccessAndRedirect() {
    // Hide existing page content
    document.body.innerHTML = `
        <div class="success-wrapper">
            <div class="success-card">
                <div class="success-icon">
                    <i class="bi bi-check-lg"></i>
                </div>

                <h5 class="mt-3">Order Placed Successfully</h5>

                <p class="text-muted small mt-2">
                    We’ve received your payment details.
                    Your order will be confirmed shortly and you’ll receive a notification.
                </p>

                <p class="text-muted small mt-3">
                    Redirecting to home page…
                </p>
            </div>
        </div>
    `;

    // Redirect after delay
    setTimeout(() => {
        window.location.replace("index.html"); // or /home.html or /orders.html
    }, 3500);
}

