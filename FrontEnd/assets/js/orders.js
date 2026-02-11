console.log("🔥 orders.js LOADED");
let orderToastLock = false;
let orderModalInstance = null;


// import { API_BASE_URL } from "./config.js";

// const ALLOWED_TRANSITIONS = {
//   // ================= CONFIRMED =================
//   71: [84, 109], // OrderConfirmed → ReadyForFulfillment, CancelledInventoryIssue

//   // ================= FULFILLMENT =================
//   84: [85, 106], // ReadyForFulfillment → PickingStarted, CancelledBeforeFulfillment

//   85: [86], // PickingStarted → PickingCompleted
//   86: [87], // PickingCompleted → PackingInProgress
//   87: [88], // PackingInProgress → Packed
//   88: [89], // Packed → ReadyForDispatch

//   // ================= SHIPPING =================
//   89: [90, 92], // ReadyForDispatch → ShipmentCreated, Dispatched
//   90: [91],     // ShipmentCreated → ShipmentAssigned
//   91: [92],     // ShipmentAssigned → Dispatched
//   92: [96],     // Dispatched → OutForDelivery

//   96: [98, 97], // OutForDelivery → Delivered, DeliveryAttempted
//   97: [96],     // DeliveryAttempted → OutForDelivery

//   // ================= RETURN =================
//   110: [111],
//   111: [112],
//   112: [113],
//   113: [114],
//   114: [115],
//   115: [116],

//   // ================= RTO =================
//   118: [119]
// };

/* ================= GLOBAL STATE ================= */

let orders = [];
let orderTimelines = {};
let currentOrderId = null;
let filteredOrders = [];

/* ================= ORDER SEARCH QUERY ================= */

function getOrderSearchQuery() {
  const hash = location.hash;
  const queryString = hash.split("?")[1];
  if (!queryString) return null;

  const params = new URLSearchParams(queryString);
  return params.get("search");
}

/* ================= PAGE ENTRY ================= */

window.loadsellerOrders = async function (options = { forDashboard: false }) {
  const tbody = document.getElementById("orderTableBody");
  if (!tbody && !options.forDashboard) return;

   if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-muted">
          Loading orders...
        </td>
      </tr>
    `;
  }

  try {
   const auth = window.getAuthOrRedirect();
if (!auth) return;

const { sellerId } = auth;


const res = await fetch(
  `${API_BASE_URL}/api/OrderProcess/sellerOrders`,
  {
    headers: {
      "X-Seller-Id": sellerId
    }
  }
);

    const json = await res.json();
    if (!json.isSuccess) throw new Error("Order API failed");

    orders = json.data.orders;
    filteredOrders = [...orders]; 
    console.table(
  orders.map(o => ({
    id: o.orderId,
    status: o.orderStatusText,
    group: o.sellerStatusGroup
  }))
); 
    

    const search = getOrderSearchQuery(); 
    if (search) { await searchOrdersFrontend(search);}
    else {renderFilteredOrders();}

    if (tbody) {
      updateOrderStats(json.data.stats);

      initOrderFilters();
    }

  }catch (err) {
  console.error("❌ Orders load error", err);

  toastError("Failed to load orders");

  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-danger text-center">
          Failed to load orders
        </td>
      </tr>
    `;
  }
}

};

/* ================= RENDER TABLE ================= */

function renderFilteredOrders() {
  const tbody = document.getElementById("orderTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (!filteredOrders.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-muted text-center">
          No orders found
        </td>
      </tr>
    `;
    return;
  }

  filteredOrders.forEach(o => {
    tbody.innerHTML += `
      <tr>
        <td>
          <a href="#" class="order-link fw-semibold" data-order-id="${o.orderId}">
            ${o.orderNumber}
          </a>
        </td>
        <td>${o.customerName ?? "-"}</td>
        <td>${o.totalItems}</td>
        <td>₹${o.finalAmount}</td>
        <td><input type="date" class="form-control form-control-sm" value="${formatDate(o.orderDate)}" disabled></td>
        <td><input type="date" class="form-control form-control-sm" value="${formatDate(o.expectedShipment)}" disabled></td>
        <td>
          <span class="badge bg-${getStatusColor(o.sellerStatusGroup)}">
            ${o.orderStatusText}
          </span>
        </td>
      </tr>
    `;
  });
}



/* ================= ORDER STATS ================= */

function updateOrderStats(stats) {
  document.getElementById("newOrders").textContent = stats.new ?? 0;
  document.getElementById("pendingOrders").textContent = stats.pending ?? 0;
  document.getElementById("cancelledOrders").textContent = stats.cancelled ?? 0;
  document.getElementById("returnedOrders").textContent = stats.returned ?? 0;
  document.getElementById("completedOrders").textContent = stats.completed ?? 0;
}

/* ================= ORDER DETAILS MODAL ================= */

document.addEventListener("click", e => {
  const link = e.target.closest(".order-link");
  if (!link) return;

  e.preventDefault();
  openOrderDetails(link.dataset.orderId);
});


async function openOrderDetails(orderId) {
  if (!orderToastLock) {
  toastInfo("Loading order details...");
  orderToastLock = true;

  setTimeout(() => {
    orderToastLock = false;
  }, 3000); // 👈 3 seconds delay
}


  currentOrderId = orderId ;

  const auth = window.getAuthOrRedirect();
if (!auth) return;

const { sellerId } = auth;
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/OrderProcess/Sellerorder-details/${orderId}`,
      {
        headers: {
          "X-Seller-Id": sellerId
        }
      }
    );

    const json = await res.json();
    if (!json.isSuccess) throw new Error("Order details failed");

    const d = json.data;

    // Header
    modalOrderId.textContent = d.orderNumber;

    // Customer
    custName.textContent = d.customerName;
    custPhone.textContent = d.customerPhone;
    custAddress.textContent = d.customerAddress;

    // Items
   orderDetailsBody.innerHTML = "";
   d.items.forEach(i => {
  const rules = i.editRules;
  const allowed = rules?.allowedNextStatuses ?? [];
 

    orderDetailsBody.innerHTML += `
<tr data-orderitem-id="${i.orderItemId}">
  <td>${i.productId}</td>
  <td>${i.productName}</td>
  <td>₹${i.unitPrice}</td>
  <td>${i.quantity}</td>

  <td>
    <input type="date"
      class="form-control form-control-sm ship-date"
      ${!rules.canEditDates ? "disabled" : ""}
      value="${formatDate(i.expectedShipment)}">
  </td>

  <td>
    <input type="date"
      class="form-control form-control-sm delivery-date"
      ${!rules.canEditDates ? "disabled" : ""}
      value="${formatDate(i.expectedDeliveryDate)}">
  </td>

  <td>
    ${
      !rules.canEdit || allowed.length === 0
        ? `<span class="text-muted">${i.internalStatusText}</span>`
        : `
        <div class="dropdown position-static">
          <button
            class="btn btn-sm btn-outline-secondary dropdown-toggle status-btn"
            data-bs-toggle="dropdown"
            data-selected-status="${i.internalStatus}">
            ${i.internalStatusText}
          </button>
          <ul class="dropdown-menu">
            ${allowed.map(s => `
              <li>
                <button
                  class="dropdown-item status-option"
                  data-status="${s.statusId}">
                  ${formatStatusText(s.text)}
                </button>
              </li>
            `).join("")}
          </ul>
        </div>
        `
    }
  </td>

  <td>
    <input type="text"
      class="form-control form-control-sm seller-comment"
      ${!rules.canEditComments ? "disabled" : ""}
      value="${i.command ?? ""}">
  </td>

  <td>
    <button
      class="btn btn-sm btn-success update-item-btn"
      ${!rules.canEdit ? "disabled" : ""}>
      Update
    </button>
  </td>
</tr>
`;

  });
  orderTimelines[orderId] ??= [];

  if (!orderTimelines[orderId].length) {
    addTimeline(orderId, "Order opened");
  }
  renderTimeline(orderId);

  if (!orderModalInstance) {
    orderModalInstance = new bootstrap.Modal(orderDetailsCard, {
    backdrop: true,
    keyboard: true
  });
}

orderModalInstance.show();

  } catch (err) {
    console.error("❌ Order details error", err);
    toastError("Failed to load order details");
  }
}


document.addEventListener("click", e => {
  const option = e.target.closest(".status-option");
  if (!option) return;

  const status = option.dataset.status;
  const row = option.closest("tr");
  const btn = row.querySelector(".status-btn");

  btn.textContent = option.textContent.trim();
  btn.dataset.selectedStatus = status;
});

/* ================= UPDATE STATUS ================= */

document.addEventListener("click", async e => {
  const btn = e.target.closest(".update-item-btn");
  if (!btn) return;

  const row = btn.closest("tr");

 const statusBtn = row.querySelector(".status-btn");

const payload = {
  orderItemId: Number(row.dataset.orderitemId),
  newInternalStatus: Number(statusBtn.dataset.selectedStatus),
  shippingDate: row.querySelector(".ship-date").value || null,
  expectedDeliveryDate: row.querySelector(".delivery-date").value || null,
  sellerComment: row.querySelector(".seller-comment").value
};
console.log("UPDATE PAYLOAD 👉", payload);
  btn.disabled = true;
  btn.textContent = "Updating...";

  try {
    const auth = window.getAuthOrRedirect();
if (!auth) return;

const { userId, sellerId } = auth;
    const res = await fetch(
      `${API_BASE_URL}/api/OrderProcess/seller`,
      {
        method: "PUT",
        headers: {
  "Content-Type": "application/json",
  "X-User-Id": auth.userId,
  "X-Seller-Id": auth.sellerId
},
        body: JSON.stringify(payload)
      }
    );

    const json = await res.json();
    if (!json.isSuccess) {
      toastError(json.error?.message || "Update failed");
      btn.disabled = false;
      btn.textContent = "Update";
      return;
    }
    toastSuccess("Order Status updated successfully");
    addTimeline( currentOrderId,`Status updated to ${statusBtn.textContent.trim()}`);

    orderModalInstance?.hide();
    loadsellerOrders();

  } catch (err) {
  console.error("UPDATE ERROR", err);
  toastError("Order Status Update failed ");
}

  btn.disabled = false;
  btn.textContent = "Update";
});


const orderModalEl = document.getElementById("orderDetailsCard");

if (orderModalEl) {
  orderModalEl.addEventListener("hidden.bs.modal", () => {

    // remove ALL backdrops
    document.querySelectorAll(".modal-backdrop").forEach(b => b.remove());

    // restore body
    document.body.classList.remove("modal-open");
    document.body.style.removeProperty("overflow");
    document.body.style.removeProperty("padding-right");

    // reset instance
    orderModalInstance = null;

    // ✅ reload orders AFTER modal fully closed
    loadsellerOrders();
  });
}




/* ================= TIMELINE ================= */

function addTimeline(orderId, text) {
  orderTimelines[orderId] ??= [];
  orderTimelines[orderId].push({
    status: text,
    time: new Date().toLocaleString()
  });
}

function renderTimeline(orderId) {
  orderTimeline.innerHTML = "";
  (orderTimelines[orderId] || []).forEach(t => {
    orderTimeline.innerHTML += `
      <li class="list-group-item d-flex justify-content-between">
        <strong>${t.status}</strong>
        <span class="text-muted">${t.time}</span>
      </li>
    `;
  });
}

/* ================= HELPERS ================= */

function formatDate(d) {
  return d ? d.split("T")[0] : "";
}
// function isShipmentLocked(group) {
//   return group !== 1; // only PENDING editable
// }
// function canEditDates(status) {
//   return [
//     71, // OrderConfirmed
//     84, // ReadyForFulfillment
//     85, // PickingStarted
//     86, // PickingCompleted
//     87, // PackingInProgress
//     88  // Packed
//   ].includes(status);
// }

function formatStatusText(text) {
  return text.replace(/([A-Z])/g, " $1").trim();
}


function getStatusColor(group) {

  // numeric groups
  switch (Number(group)) {
    case 0: return "primary";   // new
    case 1: return "warning";   // pending
    case 2: return "danger";    // cancelled
    case 3: return "secondary"; // returned
    case 4: return "success";   // completed
  }

  // fallback by status text (extra safety)
  if (typeof group === "string") {
    const g = group.toLowerCase();

    if (g.includes("pending")) return "warning";
    if (g.includes("cancel")) return "danger";
    if (g.includes("return")) return "secondary";
    if (g.includes("complete") || g.includes("deliver")) return "success";
    if (g.includes("new")) return "primary";
  }

  return "info"; // never black again
}

// function getStatusText(id) {
//   const map = {
//     // ===== ORDER FLOW =====
//     69: "Order Created",
//     70: "Checkout Initiated",
//     71: "Order Confirmed",
//     72: "Order Pending Review",
//     73: "Order On Hold",
//     74: "Order Approved",

//     // ===== PAYMENT =====
//     75: "Payment Initiated",
//     76: "Payment Pending",
//     77: "Payment Authorized",
//     78: "Payment Captured",
//     79: "Payment Failed",
//     //80: "Payment Cancelled",

//     // ===== FULFILLMENT =====
//     81: "Inventory Allocated",
//     82: "Inventory Shortage",
//     83: "Backorder Created",
//     84: "Ready For Fulfillment", 
//     85: "Picking Started",
//     86: "Picking Completed",
//     87: "Packing In Progress",
//     88: "Packed",
//     89: "Ready For Dispatch",

//     // ===== SHIPPING =====
//     91: "Shipment Created",
//     92: "Shipment Assigned",
//     93: "Dispatched",
//     94: "In Transit",
//     95: "Delivery Delayed",
//     96: "Out For Delivery",
//     97: "Delivery Attempted",
//     98: "Delivered",
//     99: "Delivery Confirmed",

//     // ===== ORDER FINAL =====
//     100: "Invoice Generated",
//     101: "Order Completed",
//     102: "Order Archived",

//     // ===== CANCELLATION =====
//     58 : "PaymentCancelled",
//     103: "Cancellation Requested by Customer",
//     104: "Cancellation Requested by Admin",
//     105: "Cancellation Pending Approval",
//     107: "Cancelled Before Fulfillment",
//     108: "Cancelled After Fulfillment",
//     109: "Cancelled Due to Inventory Issue",

//     // ===== RETURN =====
//     110: "Return Requested",
//     111: "Return Approved",
//     112: "Pickup Scheduled",
//     113: "Pickup Completed",
//     114: "Return In Transit",
//     115: "Return Received",
//     116: "Return Inspected",

//     // ===== RTO =====
//     117: "RTO Initiated",
//     118: "RTO In Transit",
//     119: "RTO Received",
//     120: "RTO Closed",

//     // ===== EXCHANGE =====
//     121: "Exchange Requested",
//     122: "Exchange Approved",
//     123: "Exchange Completed",

//     // ===== REFUND =====
//     124: "Refund Initiated",
//     125: "Refund Completed",

//     // ===== SYSTEM =====
//     126: "Order Expired",
//     127: "Order Flagged as Fraud",
//     128: "Order Error (System)"
//   };

//   return map[id] || "Unknown Status";
// }
//filter /sorting

function initOrderFilters() {
  const filterTypeEl = document.getElementById("filterType");
  const applyBtn = document.getElementById("applyFilterBtn");
  const resetBtn = document.getElementById("resetFilterBtn");

  // 🔒 Guard (VERY IMPORTANT)
  if (!filterTypeEl || !applyBtn || !resetBtn) {
    console.warn("⚠️ Order filter elements not found");
    return;
  }

  // FILTER TYPE CHANGE
  filterTypeEl.addEventListener("change", e => {
    const showRange = e.target.value === "range";
    document.querySelectorAll(".range-field")
      .forEach(el => el.classList.toggle("d-none", !showRange));
  });

  // APPLY FILTER
  applyBtn.addEventListener("click", applyOrderFilter);

  // RESET FILTER
  resetBtn.addEventListener("click", resetOrderFilter);
}

function applyOrderFilter() {
  const filterType = document.getElementById("filterType").value;
  const sortType = document.getElementById("sortType").value;
  const from = document.getElementById("fromDate").value;
  const to = document.getElementById("toDate").value;

  filteredOrders = [...orders];

  const todayStr = new Date().toISOString().split("T")[0];

  if (filterType === "today") {
    filteredOrders = filteredOrders.filter(o =>
      o.orderDate?.split("T")[0] === todayStr
    );
  }

  if (filterType === "week") {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());

    filteredOrders = filteredOrders.filter(o =>
      new Date(o.orderDate) >= weekStart
    );
  }

  if (filterType === "month") {
    const m = new Date().getMonth();
    const y = new Date().getFullYear();

    filteredOrders = filteredOrders.filter(o => {
      const d = new Date(o.orderDate);
      return d.getMonth() === m && d.getFullYear() === y;
    });
  }

  if (filterType === "range" && from && to) {
    filteredOrders = filteredOrders.filter(o => {
      const d = o.orderDate?.split("T")[0];
      return d >= from && d <= to;
    });
  }

  // SORT
  if (sortType === "latest") {
    filteredOrders.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));
  } else if (sortType === "oldest") {
    filteredOrders.sort((a, b) => new Date(a.orderDate) - new Date(b.orderDate));
  } else if (sortType === "amountHigh") {
    filteredOrders.sort((a, b) => b.finalAmount - a.finalAmount);
  } else if (sortType === "amountLow") {
    filteredOrders.sort((a, b) => a.finalAmount - b.finalAmount);
  }

  renderFilteredOrders();
}

function resetOrderFilter() {
  filteredOrders = [...orders];

  document.getElementById("filterType").value = "all";
  document.getElementById("sortType").value = "latest";
  document.getElementById("fromDate").value = "";
  document.getElementById("toDate").value = "";

  document.querySelectorAll(".range-field")
    .forEach(el => el.classList.add("d-none"));

  renderFilteredOrders();
}



//stats filter 


document.addEventListener("click", e => {
  const card = e.target.closest(".stat-card");
  if (!card) return;

  const type = card.dataset.stat.toUpperCase(); // NEW / PENDING / etc

  // Active UI
  document.querySelectorAll(".stat-card")
    .forEach(c => c.classList.remove("active"));
  card.classList.add("active");

  // Reset
  filteredOrders = [...orders];

  // FILTER USING STRING GROUPS (FROM API)
  filteredOrders = filteredOrders.filter(o =>
    o.sellerStatusGroup === type
  );

  // Reset dropdown UI
  document.getElementById("filterType").value = "all";
  document.getElementById("sortType").value = "latest";

  console.log("Filtered:", type, filteredOrders.length);

  renderFilteredOrders();
});



/* =========================== 
SEARCH
=========================== */


/* ================= FILTER ORDERS BY IDS ================= */

function filterOrdersByIds(orderIds) {
  if (!Array.isArray(orderIds) || orderIds.length === 0) {
    filteredOrders = [];
    renderFilteredOrders();
    return;
  }

  const idSet = new Set(orderIds);

  filteredOrders = orders.filter(o =>
    idSet.has(o.orderId)
  );

  renderFilteredOrders();
  if (!filteredOrders.length) {
  toastWarning("No matching orders found");
}
}


/* ================= SEARCH ORDERS ================= */

async function searchOrdersFrontend(query) {
  if (!query) {
    filteredOrders = [...orders];
    renderFilteredOrders();
    return;
  }

  try {
    const auth = window.getAuthOrRedirect();
if (!auth) return;

const { sellerId } = auth;


    const res = await fetch(
      `${API_BASE_URL}/api/Search/seller?q=${encodeURIComponent(query)}&type=order`,{
        headers: { "X-Seller-Id": auth.sellerId}
      }
    );

    if (!res.ok) {
      toastError("Order search failed");
      return;
    }

    const json = await res.json();
    const orderIds = (json.data?.orders || []).map(o => o.orderId);

    filterOrdersByIds(orderIds);

  } catch (err) {
    console.error("Order search failed", err);
    toastError("Unable to search orders");
  }
}
/* ================= HANDLE HASH CHANGE ================= */

window.addEventListener("hashchange", () => {
  if (!location.hash.startsWith("#/orders")) return;

  const search = getOrderSearchQuery();

  if (search) {
    searchOrdersFrontend(search);
  } else {
    filteredOrders = [...orders];
    renderFilteredOrders();
  }
});



