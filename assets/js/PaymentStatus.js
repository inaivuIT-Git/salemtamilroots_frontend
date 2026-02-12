import { callApi } from "./callApi.js";
const $ = id => document.getElementById(id);

async function init() {
    const cashfreeOrderId = sessionStorage.getItem("cashfreeOrderId");
    const orderId = sessionStorage.getItem("orderId");
    
    if (!cashfreeOrderId) return renderFailed("Session expired.");

    try {
        const res = await fetch(
            `${API_BASE_URL}/api/OrderProcess/confirm-order?cashfreeOrderId=${cashfreeOrderId}`
        );
        const { data } = await res.json();
        const status = data.orderStatus;
        PaymentStatusUpdate(orderId, status);
        render(status, data);
    } catch {
        renderFailed("Unable to verify payment right now.");
    }
}


// UPDATE STATUS IN ORDER,ITEMS AND PAYMENT TABLES
async function PaymentStatusUpdate(orderId,status) {
    if(status == "PAID"){
        status = "Success";
    }
    else{
        status = "Failed";
    }
    
    // Call API here
    const updateUrl = `${API_BASE_URL}/api/AdminDashboard/paymentStatus`;
    const payload = {
        orderId: orderId,
        userId: sessionStorage.getItem("userId"),
        status: status,
    };
    const response = await callApi(updateUrl, payload, "PUT");
    if (response.isSucces) {
        alert("Changed status")
        
    }
}

function render(status, data) {
    $("loading").classList.add("d-none");
    $("content").classList.remove("d-none");

    const icon = $("statusIcon");
    icon.className = "status-circle mb-3";

    if (status === "PAID") {
        icon.classList.add("status-paid");
        icon.innerHTML = "<i class='bi bi-check-lg'></i>";
        $("statusTitle").innerText = "Order Confirmed";
        $("statusMsg").innerText = "Your herbal order has been placed successfully.";
        fillReceipt(data);
    }
    else if (status === "ACTIVE") {
        icon.classList.add("status-pending");
        icon.innerHTML = "<i class='bi bi-hourglass-split'></i>";
        $("statusTitle").innerText = "Payment Pending";
        $("statusMsg").innerText = "Please complete the payment to continue.";
        fillReceipt(data);
        addRetryButton();
    }
    else {
        renderFailed("Payment could not be completed.");
    }
}

function renderFailed(message) {
    $("loading").classList.add("d-none");
    $("content").classList.remove("d-none");

    const icon = $("statusIcon");
    icon.className = "status-circle status-failed mb-3";
    icon.innerHTML = "<i class='bi bi-x-lg'></i>";

    $("statusTitle").innerText = "Payment Failed";
    $("statusMsg").innerText = message;
    $("receipt").classList.add("d-none");
}

function fillReceipt(data) {
    $("orderId").innerText = data.orderId;
    $("amount").innerText = `₹${data.orderAmount}`;
}

function addRetryButton() {
    const btn = document.createElement("button");
    btn.className = "btn btn-pay";
    btn.innerText = "Complete Payment";
    btn.onclick = retryPayment;
    $("actions").prepend(btn);
}

function retryPayment() {
    const sessionId = sessionStorage.getItem("paymentSessionId");
    if (!sessionId) return alert("Session expired");

    Cashfree({ mode: "sandbox" }).checkout({
        paymentSessionId: sessionId,
        redirectTarget: "_self"
    });
}

window.onload = init;
