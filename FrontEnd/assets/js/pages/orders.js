import { callApi } from '../callApi.js';
import { showToast } from '../toast.js';

window.onerror = function (msg, src, line) {
    console.error("Global JS Error:", msg, src, line);
};
// --- Configuration ---
const BASE_URL = `${API_BASE_URL}/api`;
const userId = sessionStorage.getItem("userId") || 41;
let ordersData = [];




// ----------INIT ---------- 
document.addEventListener('DOMContentLoaded', () => {
    fetchOrders();

    // Back button (order details to orders list) 
    const backBtn = document.getElementById('backToOrdersBtn');
    if (backBtn) {
        backBtn.addEventListener('click', showListView);
    }
});


// --- API Integration ---
async function fetchOrders() {
    toggleLoading(true);

    // const userId = sessionStorage.getItem("userId")|| 41;

    if (!userId) {
        showToast("Please sign in to view your orders.", "error");
        toggleLoading(false);
        return;
    }

    const result = await callApi(`${BASE_URL}/dashboard/orders/user/${userId}`);
    console.log("RAW API RESULT:", result);
    if (!result.success) {
        toggleLoading(false);
        return;
    }

    console.table(result.data.map(o => ({
        orderId: o.orderId,
        status: o.orderStatus,
        code: o.orderStatusCode
    })));

    // 🔁 Map backend → UI model

    ordersData = result.data

        .map(o => ({
            orderId: o.orderId,
            id: `#${o.orderNumber}`,
            date: new Date(o.orderDate).toLocaleDateString(),
            status: o.orderStatus ?? 'Processing',
            amount: `₹${o.totalAmount}`,
            totalItems: o.totalItems

        }));
    renderOrdersList(ordersData);
    toggleLoading(false);
}

console.log(ordersData);


// --- UI Rendering ---  
function isCancelled(order) {
    if (!order?.orderStatus) return false;
    return order.orderStatus.toLowerCase() === 'cancelled' || order.orderStatusCode === -1;
}

function getStatusClass(status) {
    const map = {
        'pending': 'pending',
        'placed': 'pending',
        'order confirmed': 'confirmed',
        'processing': 'processing',
        'shipped': 'shipped',
        'out for delivery': 'out',
        'delivered': 'delivered',
        'cancelled': 'cancelled'
    };
    return map[status.toLowerCase()] || 'processing';
}

// Refund applicable only for prepaid orders 
function isRefundApplicable(order) {
    return order.paymentMethod !== 'COD' && isCancelled(order);
}

// Refund initiated state 
function isRefundInitiated(order) {
    return (order.orderStatus === 'Cancelled' || order.orderStatusCode === 7) && order.paymentStatus === 'RefundPending';
}
// Fully refunded 
function isRefundedCompleted(order) {
    return order.paymentStatus === 'Refunded';
}
function isPrepaid(order) {
    return order.paymentMethod !== 'COD';
}
function needsRefundDetails(order) {
    if (!isCancelled(order)) return false;
    if (isPrepaid(order)) return false;
    return order.paymentStatus !== 'RefundPending' && order.paymentStatus !== 'Refunded';
}

function renderRefundUI(order) {
    const refundBox = document.getElementById('refundBanner');
    const refundStatusText = document.getElementById('refundStatusText');
    const refundAmountText = document.getElementById('refundAmountText');
    const refundMessageText = document.getElementById('refundMessageText');
    const refundDetailsPanel = document.getElementById('refundDetailsPanel');
    const refundUpiId = document.getElementById('refundUpiId');
    const submitRefundDetailsBtn = document.getElementById('submitRefundDetailsBtn');
    const refundDetailsMsg = document.getElementById('refundDetailsMsg');

    if (!refundBox) return;

    refundBox.classList.add('d-none');
    refundDetailsPanel?.classList.add('d-none');
    if (refundDetailsMsg) {
        refundDetailsMsg.classList.add('d-none');
        refundDetailsMsg.innerText = '';
    }

    if (!isCancelled(order)) return;

    const amount = order.refund?.amount ?? order.finalAmount;

    const showBanner = (title, message) => {
        refundBox.classList.remove('d-none');
        refundStatusText.innerText = title;
        refundAmountText.innerText = amount;
        refundMessageText.innerText = message;
    };

    if (isPrepaid(order)) {
        if (isRefundedCompleted(order)) {
            showBanner("Refund Completed", "Refund completed successfully to your original payment method.");
        } else if (isRefundInitiated(order)) {
            showBanner("Refund Initiated", "Amount will be credited to your original payment method within 3–5 business days.");
        } else {
            showBanner("Refund Will Be Initiated", "Amount will be credited to your original payment method within 3–5 business days.");
        }
        return;
    }

    if (isRefundedCompleted(order)) {
        showBanner("Refund Completed", "Refund completed successfully to your UPI.");
        return;
    }

    if (isRefundInitiated(order)) {
        showBanner("Refund Initiated", "Amount will be credited to your UPI within 3–5 business days.");
        return;
    }

    showBanner("Refund Details Required", "Enter a UPI ID or phone number to receive your refund.");
    refundDetailsPanel?.classList.remove('d-none');
    if (submitRefundDetailsBtn) {
        submitRefundDetailsBtn.onclick = () => {
            const upiValue = refundUpiId?.value?.trim() ?? '';
            if (!upiValue) {
                if (refundDetailsMsg) {
                    refundDetailsMsg.innerText = "Please enter a valid UPI ID or phone number.";
                    refundDetailsMsg.classList.remove('d-none');
                }
                return;
            }
            order.paymentStatus = 'RefundPending';
            showToast("Refund initiated. Amount will be credited to your UPI.", "success");
            renderRefundUI(order);
        };
    }
}

function renderOrdersList(orders) {
    const body = document.getElementById('orders-table-body');

    if (!orders.length) {
        body.innerHTML = `
        <tr>
            <td colspan="5" class="text-center text-muted py-4">
                No orders found
            </td>
        </tr>`;
        return;
    }

    body.innerHTML = orders.map(o => {

        const statusClass = getStatusClass(o.status);
        return `
        <tr>
            <td class="ps-4 fw-bold">${o.id}</td>
            <td class="text-muted">${o.date}</td>
           <td>
                    <span class="badge-status status-${statusClass}">
                        ${o.status}
                    </span>
                </td>
            <td class="fw-bold">${o.amount}</td>
            <td class="text-end pe-4">
                <button class="btn btn-sm btn-outline-primary px-3 me-2 view-btn" data-order-id="${o.orderId}">View</button> 
             </td>
        </tr>
    `;
    }).join('');

    // Attach events after rendering 
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => { showDetailsView(btn.dataset.orderId); });
    });
}
console.log("Orders Data:", ordersData);

function showInlineError(message) {
    const errorMsg = document.getElementById("cancelInlineMsg");
    errorMsg.innerText = message;
    errorMsg.classList.remove('d-none');
}

// --- Cancel Order Api--- 
async function cancelOrderApi(payload) {
    return await callApi(`${BASE_URL}/dashboard/orders/${payload.orderId}/cancel`, payload, 'POST');
}

async function showDetailsView(orderId) {

    document.getElementById("order-status-container").classList.add("d-none");
    document.getElementById('orders-list-view').style.display = 'none';
    document.getElementById('order-details-view').style.display = 'block';

    try {
        const response = await callApi(`${BASE_URL}/dashboard/orders/details?orderId=${orderId}&userId=${userId}`);
        console.log("Order Details API Response:", response);
        if (!response.success) { showToast("Unable to load order details", 'error'); return; };

        const order = response.data;
        console.log("Order Details:", order);

        currentOrderId = order.orderId;

        const cancelBtn = document.getElementById("cancelOrderBtn");
        const cancelNotAllowedMsg = document.getElementById("cancelInlineMsg");


        // Reset 
        cancelBtn.classList.add('d-none');
        cancelNotAllowedMsg.classList.add('d-none');


        // Show Cancel only if order is cancellable 
        const nonCancellableStatuses = ['shipped', 'out for delivery', 'delivered', 'cancelled'];
        if (!nonCancellableStatuses.includes(order.orderStatus.toLowerCase())) {
            cancelBtn.classList.remove('d-none');
            cancelNotAllowedMsg.classList.add('d-none');
            cancelBtn.onclick = () => openCancelPanel(order.orderId);
        } else {
            cancelBtn.classList.add('d-none');
            cancelNotAllowedMsg.classList.remove('d-none');
        }

        function openCancelPanel(orderId) {
            const panel = document.getElementById("cancelReasonPanel");
            const errorMsg = document.getElementById("cancelInlineMsg");
            const reasonSelect = document.getElementById("cancelReasonSelect");
            const noteInput = document.getElementById("cancelReasonNote");

            panel.classList.remove('d-none');
            errorMsg.classList.add('d-none');
            errorMsg.innerText = '';

            reasonSelect.value = '';
            noteInput.value = '';
            noteInput.classList.add('d-none');

            // show note only for "Other" reason 
            reasonSelect.onchange = () => {
                noteInput.classList.toggle('d-none', reasonSelect.value !== '5');
            };

            document.getElementById('cancelReasonBackBtn').onclick = () => {
                panel.classList.add('d-none');

            };
            document.getElementById('confirmCancelBtn').onclick = async () => {
                if (!reasonSelect.value) {
                    showInlineError("Please select a reason for cancellation.");
                    return;
                }
                const payload = {
                    orderId: orderId,
                    userId: userId,
                    reason: parseInt(reasonSelect.value),
                    reasonNote: noteInput.value || null
                };

                const result = await cancelOrderApi(payload);

                if (!result.success) {
                    showInlineError(result.message || "Unable to cancel order");
                    return;
                }

                // SUCCESS UI 
                panel.classList.add('d-none');
                document.getElementById('cancelOrderBtn').classList.add('d-none');
                document.getElementById('cancelledMessage').classList.remove('d-none');

                showToast(order.paymentMethod === 'COD' ? "Order cancelled successfully" : "Order cancelled. Refund will be initiated shortly.");
            }


        }

        // handle cancelled orders  
        const statusContainer = document.getElementById('order-status-container');
        const cancelled = isCancelled(order);
        const timelineWraper = document.querySelector('.step-item')?.parentElement;
        const cancelledMessage = document.getElementById('cancelledMessage');

        if (cancelled) {
            // Hide timeline  
            statusContainer.classList.remove('d-none');
            cancelledMessage.classList.remove('d-none');
            document.querySelectorAll('.step-item').forEach(el => el.classList.add('d-none'));

        } else {
            // normal order - show timeline  
            cancelledMessage.classList.add('d-none');
            document.querySelectorAll('.step-item').forEach(el => el.classList.remove('d-none'));
            // Update Timeline Logic
            updateTimeline(order);
        }

        // Refund Status Banner 
        const refundBox = document.getElementById('refundBanner');
        refundBox.classList.add('d-none');

        if (isCancelled(order) && isRefundApplicable(order)) {
            refundBox.classList.remove('d-none');

            //     if (isRefundInitiated(order)) { 
            //         refundBox.innerHTML = `<div class="alert alert-warning">
            //             <i class="fas fa-info-circle me-2"></i> 
            //             💸 Refund initiated for <strong>₹${order.refund?.amount ?? order.finalAmount}</strong><br>
            //             Amount will be credited within 3–5 business days.
            //         </div>`;
            // } 

            // if (isRefundedCompleted(order)) { 
            //     refundBox.innerHTML = `<div class="alert alert-success">
            //         <i class="fas fa-check-circle me-2"></i> 
            //         ✅ Refund of <strong>₹${order.refund?.amount}</strong> completed.
            //         Refund completed successfully.
            //     </div>`;
            // }
            if (isRefundInitiated(order)) {
                document.getElementById('refundStatusText').innerText = "Refund Initiated";
                document.getElementById('refundAmountText').innerText = order.refund?.amount ?? order.finalAmount;
            }
            if (isRefundedCompleted(order)) {
                document.getElementById('refundStatusText').innerText = "Refund Completed";
                document.getElementById('refundAmountText').innerText = order.refund?.amount;
                statusContainer.classList.replace('status-cancelled-theme', 'status-success-theme'); // Optional: change color to green
            }
        } else {
            refundBox.classList.add('d-none');
        }
        const discount = order.orderDiscount ?? 0;
        const delivery = order.transportCharge ?? 0;

        // Order Headers
        document.getElementById('detail-id').innerText = "Order " + order.orderNumber;
        document.getElementById('detail-date').innerText = "Placed on " + new Date(order.orderDate).toLocaleDateString();
        document.getElementById('summary-subtotal').innerText = `₹${order.subtotal.toFixed(2)}`;
        document.getElementById('summary-discount').innerText = discount > 0 ? `-₹${discount}` : '₹0.00';
        document.getElementById('summary-delivery').innerText = delivery > 0 ? `₹${delivery}` : 'FREE';
        document.getElementById('summary-total').innerText = `₹${order.finalAmount.toFixed(2)}`;



        // shipping Address 
        document.getElementById('shipping-address').innerHTML = `
           <strong>${order.shippingAddress?.name ?? ''}</strong><br>
            ${order.shippingAddress?.addressLine ?? ''}<br>
            Phone: ${order.shippingAddress?.phone ?? ''}`;

        console.log(order.items[0].imageUrl)
        // List Items
        document.getElementById('detail-items-list').innerHTML = order.items.map(item => {
            const statusClass = getStatusClass(item.status);
            let deliveryText = '';
            if (!cancelled) {
                if (item.status === 'Delivered') {
                    deliveryText = `Delivered on ${new Date(item.expectedDeliveryDate).toLocaleDateString()}`;
                } else if (item.expectedDeliveryDate) {
                    deliveryText = `Expected by ${new Date(item.expectedDeliveryDate).toLocaleDateString()}`;
                }
            }

            return `
        <div class="order-item-row d-flex align-items-center border-top py-3 gap-3"> 

            <!-- LEFT: Product Info -->
        <div class="item-left d-flex align-items-center flex-grow-1">
            <img src="${item.imageUrl}" alt="${item.productName}"
                 class="rounded me-3"
                 style="width: 60px; height: 60px; object-fit: cover;">

            <div>
                <h6 class="fw-bold mb-1">${item.productName}</h6>
                <small class="text-muted">Qty: ${item.quantity}</small>
            </div>
        </div>

                <!-- MIDDLE: Status + Delivery -->
        <div class="item-middle text-center" style="min-width: 160px;">
            <span class="badge-status status-${statusClass}">
                ${item.status}
            </span>
            ${deliveryText
                    ? `<div class="small text-muted mt-1">${deliveryText}</div>`
                    : ''}
        </div>

            <!-- RIGHT: Price + Review -->
        <div class="item-right text-end" style="min-width: 120px;">
            <div class="fw-bold">₹${item.unitPrice}</div>

           ${item.isReviewed
                    ? `<span class="badge bg-success mt-1">Reviewed</span>`
                    : item.canReview
                        ? `<button class="btn btn-sm btn-link p-0 mt-1 review-item-btn"
              data-product-id="${item.productId}">
              Rate & Review
          </button>`
                        : ''
                }
        </div> 
    </div>
    `;
        }).join('');
    }

    catch (error) {
        console.error("Error fetching order details:", error);
        showToast("Unable to load order details", 'error');
    }
} 

  window.addEventListener("load", () => {
        setTimeout(() => { 
            document.body.classList.add("page-ready");
        },150);
    });

let currentOrderId = null;
document.getElementById('detail-items-list').addEventListener('click', e => {
    if (!e.target.classList.contains('review-item-btn')) return;

    const productId = e.target.dataset.productId;
    openReviewModal(currentOrderId, e.target.dataset.productId);
    // openReviewModal(orderId, productId);
});
// Timeline helper 
function getTimelineStartIndex(order) {
    if (order.paymentMethod === 'COD') {
        return 1; // order confirmed
    } return 0;  // pending payment
}

async function updateTimeline(order) {
    const banner = document.getElementById('awaitingPaymentBanner');
    const steps = [
        'step-pending',
        'step-confirmed',
        'step-processing',
        'step-shipped',
        'step-out',
        'step-delivered'
    ];

    // Reset all 
    banner.classList.add('d-none');
    document.querySelectorAll('.step-item').forEach(el => { el.classList.remove('active', 'completed', 'd-none'); });


    // Cancelled orders → hide timeline 
    if (isCancelled(order)) {
        // if (order.orderStatus.toLowerCase() === -1) {
        document.querySelectorAll('.step-item').forEach(el => el.classList.add('d-none'));
        return;
    }
    // Payment pending -> show banner
    if (order.orderStatusCode === 0) {
        banner.classList.remove('d-none');
        document.querySelectorAll('.step-item').forEach(el => el.classList.add('d-none'));
        return;
    }
    // COD -> hide payment step completely  
    // const startStep = order.paymentMethod === 'COD' ? 1 : 0;
    if (order.paymentMethod === 'COD') {
        document.getElementById('step-pending')?.classList.add('d-none');
    }

   const startStep = order.paymentMethod === 'COD' ? 1 : 0;
    const currentStep = order.orderStatusCode;

   // completed → FULL green 
    for (let i = startStep; i < currentStep; i++) {
        const step = document.getElementById(steps[i]);
        if (step) step.classList.add('completed'); 
        await delay(600); // Add delay for animation effect
    }

     // active → half green (except delivered)
    // if (currentStep < steps.length - 1) {
    //     const activeStep = document.getElementById(steps[currentStep]);
    //     if (activeStep) activeStep.classList.add('active');
    // } else {
    //     const lastStep = document.getElementById(steps[currentStep]);
    //     if (lastStep) lastStep.classList.add('completed');
    // }  
      // Active step
    const activeStep = document.getElementById(steps[currentStep]);
    if (activeStep) {
        activeStep.classList.add('active');
    }
} 

// helper 
function delay(ms) { 
    return new Promise(resolve => setTimeout(resolve, ms));
}

function showListView() {
    document.getElementById('orders-list-view').style.display = 'block';
    document.getElementById('order-details-view').style.display = 'none';
}
// --- Review Modal --- 
async function openReviewModal(orderId, productId) {

    const result = await callApi(`${BASE_URL}/dashboard/orders/details/${orderId}`);
    if (!result || !result.success) return;

    const item = result.data.items.find(i => i.productId == productId);

    document.getElementById('modal-order-id').innerText = item.orderNumber;
    const modalBody = document.getElementById('review-products-list');


    modalBody.innerHTML = `
            <div class="product-review-row mb-3" data-product-id="${item.productId}">
                <div class="row align-items-center">
                    <div class="col-md-2">
                        <div class="bg-light rounded p-2 text-center">
                            <i class="bi bi-box-seam fs-2 text-secondary"></i>
                        </div>
                    </div>
                    <div class="col-md-10">
                        <h6 class="fw-bold mb-1">${item.productName}</h6>
                        <div class="star-rating mb-2">
                            ${[5, 4, 3, 2, 1].map(star => `<input type="radio" id="star-${star}" name="rating" value="${star}"> 
                               <label for="star-${star}">
                        <i class="bi bi-star-fill"></i>
                    </label>
                                `).join('')}
                        </div>
                        <textarea class="form-control form-control-sm border-0 bg-light review-text" placeholder="Write your review here..." rows="2"></textarea>
                    </div>
                </div>
            </div>
        `;

    const modal = new bootstrap.Modal(document.getElementById('reviewModal'));
    modal.show();

    // Handle Review Submission
    document.getElementById('submitReviewBtn').onclick = async () => {
        const success = await submitAllReviews(orderId, productId, modal);

        if (success) {
            document.activeElement.blur();
            modal.hide();
        };
    }
}
async function submitAllReviews(orderId, productId, modal) {

    const rating = document.querySelector(`input[name="rating"]:checked`)?.value;
    const comment = document.querySelector('.review-text').value;

    if (!rating) { showToast("Please select rating", 'error'); return; }

    console.log(rating);
    console.log(comment)
    const payload = {
        userId: 41,
        orderId: Number(orderId),
        productId: Number(productId),
        ratings: parseInt(rating, 10),
        commend: comment
    };
    console.log(payload)
    const response = await callApi(`${BASE_URL}/reviews`, payload, 'POST');


    if (!response?.success) {
        if (response?.message?.toLowerCase().includes('exists')) {
            showToast("Already reviewed this product");
            return;
        }
        showToast('failed to submit review');
        return;
    }
    showToast('Thank you! Your review has been submitted');
    // Disable button + show badge immediately 
    const btn = document.querySelector(`.review-item-btn[data-product-id="${productId}"]`);
    if (btn) {
        btn.outerHTML = `<span class="badge bg-success mt-1">Reviewed</span>`;
    }
    modal.hide();
}

function toggleLoading(isLoading) {
    const spinner = document.getElementById('loading-spinner');
    const listView = document.getElementById('orders-list-view');
    if (isLoading) {
        spinner.classList.remove('d-none');
        listView.style.opacity = '0.5';
    } else {
        spinner.classList.add('d-none');
        listView.style.opacity = '1';
    }
}

// Initial Load
// document.addEventListener('DOMContentLoaded', fetchOrders);
