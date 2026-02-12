import { callApi } from "./callApi.js";
import { showToast } from "./toast.js";

/* ================================
   COMMON HELPERS
================================ */
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value ?? "N/A";
}

async function updateSellerStatus({ userId, sellerId, status }) {
  userId = 1; // TEMP FIX FOR TESTING
  const payload = { userId, sellerId, status };

  try {
    const response = await callApi(
      `${API_BASE_URL}/api/AdminDashboard/seller`,
      payload,
      "PUT"
    );

    if (!response?.success) {
      showToast("Failed to update seller status");
      return;
    }

    showToast(`Seller ${status} successfully`);

    // ✅ FIX: Properly hide Bootstrap modal
    const actionModal = document.getElementById("actionModal");
    const modalInstance = bootstrap.Modal.getInstance(actionModal);
    if (modalInstance) {
      modalInstance.hide();
    }

    LoadSellerDetails();

  } catch (err) {
    console.error(err);
    showToast("Something went wrong", "error");
  }
}

/* ================================
   NAVIGATION & SIDEBAR
================================ */
document.querySelectorAll(".nav-link").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-link").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    document.getElementById(btn.dataset.page).classList.add("active");
  });
});

document.getElementById("sidebarToggle").onclick = () => {
  document.getElementById("sidebar").classList.toggle("open");
};

document.querySelectorAll("#sidebar .nav-link").forEach(link => {
  link.addEventListener("click", () => {
    if (window.innerWidth <= 768) {
      document.getElementById("sidebar").classList.remove("open");
    }
  });
});

/* ================================
   MODAL LOGIC (REUSABLE)
================================ */
const actionModal = document.getElementById("actionModal");
let currentSeller = null;

actionModal.addEventListener("show.bs.modal", e => {
  const trigger = e.relatedTarget;
  currentSeller = JSON.parse(trigger.dataset.seller);

  document.querySelector(".modal-title").textContent =
    currentSeller.sellerBusiness?.businessName ?? "Seller Details";

  // USER
  setText("mUserName", currentSeller.user?.firstname);
  setText("mUserEmail", currentSeller.user?.email);
  setText("mUserPhone", currentSeller.user?.phone);

  // BUSINESS
  setText("mBusinessName", currentSeller.sellerBusiness?.businessName);
  setText("mEntityType", currentSeller.sellerBusiness?.legalEntityType);
  setText("mGST", currentSeller.sellerBusiness?.gst);
  setText("mBusinessDesc", currentSeller.sellerBusiness?.description);

  // CONTACT
  setText("mContactPerson", currentSeller.sellerContact?.contactPerson);
  setText("mContactMobile", currentSeller.sellerContact?.contactMobile);
  setText("mContactEmail", currentSeller.sellerContact?.contactEmail);

  // ADDRESS
  const a = currentSeller.address;
  setText(
    "mAddress",
    a
      ? `${a.addressLine1}, ${a.addressLine2}, ${a.city}, ${a.state} - ${a.postalCode}`
      : null
  );
});

document.getElementById("approveSeller").addEventListener("click", () => {
  updateSellerStatus({
    userId: currentSeller.user.id,
    sellerId: currentSeller.sellerId,
    status: "Approved"
  });
});

document.getElementById("rejectSeller").addEventListener("click", () => {
  updateSellerStatus({
    userId: currentSeller.user.id,
    sellerId: currentSeller.sellerId,
    status: "Rejected"
  });
});
// ================================
// REJECT PAYMENT MODAL
// ================================
const rejectModalEl = document.getElementById("rejectModal");
const rejectReasonEl = document.getElementById("rejectReason");
const rejectIdEl = document.getElementById("rejectId");
const confirmRejectBtn = document.getElementById("confirmReject");

let rejectModalInstance = null;

if (rejectModalEl) {
  rejectModalInstance = new bootstrap.Modal(rejectModalEl);

  rejectModalEl.addEventListener("hidden.bs.modal", () => {
    rejectReasonEl.value = "";
    rejectIdEl.value = "";
  });
}

/* ================================
   SELLER LIST
================================ */
const SellerBtn = document.getElementById("sell");
SellerBtn.addEventListener("click", LoadSellerDetails);

let sellerCache = [];

async function LoadSellerDetails() {

  const pendingContainer = document.getElementById("pendingSellers");
  const approvedContainer = document.getElementById("approvedSellers");
  const rejectedContainer = document.getElementById("rejectedSellers");
  const suspendedContainer = document.getElementById("suspendedSellers");
  try {
    const response = await callApi(
      `${API_BASE_URL}/api/AdminDashboard/sellers`,
      {},
      "GET"
    );

    if (!response?.success || !response.data?.length) {
      pendingContainer.innerHTML = `
        <div class="text-center text-muted">
          No seller requests available
        </div>`;
      return;
    }

    sellerCache = response.data;

    pendingContainer.innerHTML = `
      <table class="table admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Business</th>
            <th>Contact</th>
            <th>Status</th>
            <th class="text-center">Action</th>
            <th></th>
          </tr>
        </thead>
        <tbody>${renderTableByStatus("PENDING")}</tbody>
      </table>
    `;

    approvedContainer.innerHTML = `<table class="table admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Business</th>
            <th>Contact</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>${renderTableByStatus("APPROVED")}</tbody>
      </table>`;

    rejectedContainer.innerHTML = `<table class="table admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Business</th>
            <th>Contact</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>${renderTableByStatus("REJECTED")}</tbody>
      </table>`;

    suspendedContainer.innerHTML = `<table class="table admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Business</th>
            <th>Contact</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>${renderTableByStatus("SUSPENDED")}</tbody>
      </table>`;

  } catch (err) {
    console.error(err);
    pendingContainer.innerHTML = `<p class="text-danger text-center">Something went wrong</p>`;
  }
}
const rowRenderers = {
  APPROVED: renderApprovedRow,
  PENDING: renderPendingRow,
  REJECTED: renderRejectedRow,
  SUSPENDED: renderSuspendedRow
};
function renderTableByStatus(status) {
  const renderer = rowRenderers[status];

  if (!renderer) return "";

  return sellerCache
    .filter(s => s.status?.toUpperCase() === status)
    .map(renderer)
    .join("");

}

function renderPendingRow(seller) {
  return `
    <tr>
      <td>#SEL-${seller.sellerId}</td>
      <td>${seller.sellerBusiness?.businessName ?? "N/A"}</td>
      <td>${seller.user?.phone ?? "N/A"}</td>
      <td>
        <span class="badge badge-pending">${seller.status}</span>
      </td>
      <td class="text-center">
        <button class="btn-action approve"
                data-action="approve"
                data-id="${seller.sellerId}">
          <i class="bi bi-check"></i> 
        </button>
        <button class="btn-action reject"
                data-action="reject"
                data-id="${seller.sellerId}">
          <i class="bi bi-x"></i> 
        </button>
      </td>
      <td>
        <i class="bi bi-three-dots-vertical"
           data-bs-toggle="modal"
           data-bs-target="#actionModal"
           data-seller='${JSON.stringify(seller)}'
           style="cursor:pointer"></i>
      </td>
    </tr>
  `;
}

function renderApprovedRow(seller) {
  return `
    <tr>
      <td>#SEL-${seller.sellerId}</td>
      <td>${seller.sellerBusiness?.businessName ?? "N/A"}</td>
      <td>${seller.user?.phone ?? "N/A"}</td>
      <td>
        <span class="badge bg-success">${seller.status}</span>
      </td>
      
      <td>
        <i class="bi bi-three-dots-vertical"
           data-bs-toggle="modal"
           data-bs-target="#actionModal"
           data-seller='${JSON.stringify(seller)}'
           style="cursor:pointer"></i>
      </td>
    </tr>
  `;
}

function renderRejectedRow(seller) {
  return `
    <tr>
      <td>#SEL-${seller.sellerId}</td>
      <td>${seller.sellerBusiness?.businessName ?? "N/A"}</td>
      <td>${seller.user?.phone ?? "N/A"}</td>
      <td>
        <span class="badge bg-danger">${seller.status}</span>
      </td>
      <td>
        <i class="bi bi-three-dots-vertical"
           data-bs-toggle="modal"
           data-bs-target="#actionModal"
           data-seller='${JSON.stringify(seller)}'
           style="cursor:pointer"></i>
      </td>
    </tr>
  `;
}

function renderSuspendedRow(seller) {
  return `
    <tr>
      <td>#SEL-${seller.sellerId}</td>
      <td>${seller.sellerBusiness?.businessName ?? "N/A"}</td>
      <td>${seller.user?.phone ?? "N/A"}</td>
      <td>
        <span class="badge bg-warning">${seller.status}</span>
      </td>
      <td>
        <i class="bi bi-three-dots-vertical"
           data-bs-toggle="modal"
           data-bs-target="#actionModal"
           data-seller='${JSON.stringify(seller)}'
           style="cursor:pointer"></i>
      </td>
    </tr>
  `;
}


/* ================================
   TABLE BUTTON HANDLER (DELEGATION)
================================ */
document.addEventListener("click", e => {
  const btn = e.target.closest(".btn-action");
  if (!btn) return;

  const sellerId = btn.dataset.id;
  const action = btn.dataset.action;

  const seller = sellerCache.find(s => s.sellerId == sellerId);
  if (!seller) return;

  updateSellerStatus({
    userId: seller.user.id,
    sellerId,
    status: action === "approve" ? "Approved" : "Rejected"
  });
});


//--------------------??------------------------------------------------//
// PAYMENT PAGE
//------------------//

const paymentMenu = document.getElementById("pay");

paymentMenu.addEventListener("click", loadpaymentpage)

async function loadpaymentpage() {
  const fetchAllPaymentUrl = `${API_BASE_URL}/api/AdminDashboard/payments`;
  const response = await callApi(fetchAllPaymentUrl, {}, "GET");
  //const paymentPage = document.getElementById("payments");

  if (response.data.lenght == 0) {
    paymentPage.innerHTML = `<h2 class="text-center"> No Payment transactions are available </h2>`
  }
  renderUpiPayments(response.data);

}

function renderUpiPayments(data) {
  //const tableBody = document.getElementById("upiTableBody");
  const allTableBody = document.getElementById("allTableBody");
  //tableBody.innerHTML = "";
  allTableBody.innerHTML = "";
  // if (!data || data.length === 0) {
  //   tableBody.innerHTML = `
  //     <tr>
  //       <td colspan="6" class="text-center text-muted">
  //         No UPI payments pending verification
  //       </td>
  //     </tr>`;
  //   return;
  // }

  data.forEach(item => {


    const row = document.createElement("tr");
    if (0) {

      row.innerHTML = `
        <td>#${item.orderId}</td>
        <td>${item.customerName}</td>
        <td class="amount">₹${item.orderAmount}</td>
        <td>${item.upiId}</td>
        <td>${item.transactionReference}</td>
        <td class="text-center">
           <button class="btn-action approve" data-order-id="${item.orderId}">
              <i class="bi bi-check"></i> Verify
            </button>
          <button class="btn-action reject"
        data-order-id="${item.orderId}">
            <i class="bi bi-x"></i> Reject
          </button>
        </td>
      `;

      tableBody.appendChild(row);
    }

    else {

      row.innerHTML = `
        <td>#${item.orderId}</td>
        <td>${item.customerName}</td>
        <td class="amount">₹${item.orderAmount}</td>
        <td>
          <span class="badge bg-secondary">
            ${item.paymentMethod}
          </span>
        </td>
        <td>
          <span class="badge badge-pending">
            ${item.paymentStatus}
          </span>
       </td>
        
      `;
      allTableBody.appendChild(row);
    }
  });
}

function openRejectPaymentModal(orderId) {
  rejectIdEl.value = orderId;
  rejectModalInstance.show();
}

confirmRejectBtn.addEventListener("click", async () => {
  const orderId = rejectIdEl.value;
  const reason = rejectReasonEl.value.trim();

  if (!reason) {
    showToast("Please enter rejection reason");
    rejectReasonEl.focus();
    return;
  }

  await rejectPayment(orderId, reason);
  rejectModalInstance.hide();
});



/* ==============================
   ACTION HANDLERS
================================ */
async function verifyPayment(orderId) {
  showToast(`UPI payment verified for Order #${orderId}`);
  // Call API here
  const updateUrl = `${API_BASE_URL}/api/AdminDashboard/paymentStatus`;
  const payload = {
    orderId: orderId,
    userId: 28,
    status: "Success",
  };
  const response = await callApi(updateUrl, payload, "PUT");
  if (response.isSucces) {
    showToast("Changed status")
    loadpaymentpage();
  }
}


async function rejectPayment(orderId, reason) {
  const updateUrl = `${API_BASE_URL}/api/AdminDashboard/paymentStatus`;

  const payload = {
    orderId: Number(orderId),
    userId: 28,
    status: "Rejected",
    reason
  };

  const response = await callApi(updateUrl, payload, "PUT");

  if (response.success) {
    showToast("Payment rejected successfully");
    loadpaymentpage(); // refresh
  } else {
    showToast("Failed to reject payment", "Error");
  }
}


// --------------------------------------------------------

// LOOKUP PAGE JS

//----------------------------------------------------
const typeModal = new bootstrap.Modal(document.getElementById('typeModal'));
const deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));


// --- Open Type Add Modal ---
document.getElementById("addTypeBtn").addEventListener("click", openAddTypeModal);
// ---Open Value add Model---
document.getElementById("addValueBtn").addEventListener("click", openAddLookupValueModal)
// Finding the model is for add or edit
let isEditMode = false;

//Finding which delete
let isTypeDelete = false;
function openAddTypeModal() {
  isEditMode = false;

  document.getElementById("typeModalTitle").innerText = "Add Lookup Type";
  document.getElementById("typeSubmitBtn").innerText = "Add";

  document.getElementById("descriptionInput").value = "";
  document.getElementById("typeNameInput").value = "";

  bootstrap.Modal
    .getOrCreateInstance(document.getElementById("typeModal"))
    .show();
}

// --- Open lookup Type Edit Modal ---
function openEditTypeModal(data) {

  isEditMode = true;

  document.getElementById("typeModalTitle").innerText = "Edit Lookup Type";
  document.getElementById("typeSubmitBtn").innerText = "Update";

  document.getElementById("descriptionInput").value = data.description;
  document.getElementById("typeNameInput").value = data.typeName;
  document.getElementById("lookupTypeIdInput").value = data.typeId;

  bootstrap.Modal
    .getOrCreateInstance(document.getElementById("typeModal"))
    .show();
}

function openAddLookupValueModal() {
  isEditMode = false;
  document.getElementById("lookupValueModalTitle").innerText = "Add Lookup Value";
  document.getElementById("lookupValueSubmitBtn").innerText = "Add";


  bootstrap.Modal
    .getOrCreateInstance(document.getElementById("lookupValueModal"))
    .show();
}

function openUpdateLookupValueModal(data) {
  isEditMode = true;

  // Update modal title & button text
  document.getElementById("lookupValueModalTitle").innerText = "Update Lookup Value";
  document.getElementById("lookupValueSubmitBtn").innerText = "Update";

  // Fill form fields
  document.getElementById("lookupValueIdInput").value = data.valueId;
  document.getElementById("lookupTypeSelect").value = data.typeId;
  document.getElementById("displayValueInput").value = data.displayValue;
  document.getElementById("lookupCodeInput").value = data.lookupCode;
  document.getElementById("sortOrderInput").value = data.sortOrder;

  // Disable lookup type dropdown (cannot change type on edit)
  const lookupTypeSelect = document.getElementById("lookupTypeSelect");
  lookupTypeSelect.setAttribute("disabled", true);

  // Clear previous validation states
  document.querySelectorAll("#lookupValueModal .is-invalid")
    .forEach(el => el.classList.remove("is-invalid"));

  // Open modal
  bootstrap.Modal
    .getOrCreateInstance(document.getElementById("lookupValueModal"))
    .show();
}

// FUNCTION FOR OPEN DELETE MODEL
function openDeleteModel(data) {

  document.getElementById("delName").textContent = data.deleteName;
  document.getElementById("deleteId").value = data.deleteId;
  document.getElementById("typeId").value = data.typeId;
  bootstrap.Modal
    .getOrCreateInstance(document.getElementById("deleteModal"))
    .show();
}


//Submit button logic for addin lookup type
document.getElementById("typeSubmitBtn").addEventListener("click", function () {

  const typeNameInput = document.getElementById("typeNameInput");
  const descriptionInput = document.getElementById("descriptionInput");
  const typeIdInput = document.getElementById("lookupTypeIdInput");

  const typeName = typeNameInput.value.trim();
  const description = descriptionInput.value.trim();
  const typeId = typeIdInput.value;

  let isValid = true;

  // Reset previous errors
  typeNameInput.classList.remove("is-invalid");
  descriptionInput.classList.remove("is-invalid");

  // Validate Type Name
  if (!typeName) {
    typeNameInput.classList.add("is-invalid");
    isValid = false;
  }

  // Validate Description
  if (!description) {
    descriptionInput.classList.add("is-invalid");
    isValid = false;
  }

  // Stop if validation fails
  if (!isValid) return;


  // ADD vs EDIT
  if (isEditMode) {
    const payload = {
      typeId: typeId,
      typeName: typeName,
      typeDescription: description
    }
    updateType(payload);
  } else {
    const payload = {
      typeName: typeName,
      typeDescription: description
    }
    addType(payload);
  }
});


// Remove error when type some thingg
document.getElementById("typeModal").addEventListener("input", function (e) {
  if (e.target.classList.contains("form-control") && e.target.value.trim()) {
    e.target.classList.remove("is-invalid");
  }
});



//Submit button logic for addin lookup value
document.getElementById("lookupValueSubmitBtn")
  .addEventListener("click", async function () {


    // -------- Get Elements --------
    const lookupTypeSelect = document.getElementById("lookupTypeSelect");
    const displayValueInput = document.getElementById("displayValueInput");
    const lookupCodeInput = document.getElementById("lookupCodeInput");
    const sortOrderInput = document.getElementById("sortOrderInput");
    const valueIdInput = document.getElementById("lookupValueIdInput");

    // -------- Get Values --------
    const valueId = valueIdInput.value;
    const select = document.getElementById("lookupTypeSelect");
    const option = select.selectedOptions[0];

    const typeId = option.value;
    const typeName = option.text;

    console.log(typeId, typeName);
    const displayValue = displayValueInput.value.trim();
    const lookupCode = lookupCodeInput.value.trim().toUpperCase();
    const sortOrder = sortOrderInput.value;

    let isValid = true;

    // -------- Reset Validation --------
    [lookupTypeSelect, displayValueInput, lookupCodeInput, sortOrderInput]
      .forEach(el => el.classList.remove("is-invalid"));

    // -------- Validation --------
    if (!typeId && !isEditMode) {

      lookupTypeSelect.classList.add("is-invalid");
      isValid = false;
    }

    if (!displayValue) {
      displayValueInput.classList.add("is-invalid");
      isValid = false;
    }

    if (!lookupCode) {
      lookupCodeInput.classList.add("is-invalid");
      isValid = false;
    }



    if (!isValid) return;

    // -------- Prepare Payload --------

    if (!isEditMode) {
      const payload = {
        typeId: typeId,
        displayValue: displayValue,
        lookupCode: lookupCode,
        sortOrder: Number(sortOrder)
      };
      addLookUpValue(payload, typeName);
    }
    else {
      const payload = {
        typeId: typeId,
        valueId: valueId,
        displayValue: displayValue,
        lookupCode: lookupCode,
        sortOrder: Number(sortOrder)
      };
      updateLookupValue(payload)
    }

  });
document.getElementById("lookupValueModal").addEventListener("input", function (e) {
  if (e.target.classList.contains("form-control") && e.target.value.trim()) {
    e.target.classList.remove("is-invalid");
  }
});

// DELETE LOOKUP TYPE and VALUE
//--------------------

const deleteBtn = document.getElementById("deleteTypeBtn");
deleteBtn.addEventListener("click", async function () {
  var id = document.getElementById("deleteId").value;
  var typeId = document.getElementById("typeId").value;
  alert(typeId)
  const deleteUrl = (isTypeDelete) ? `${API_BASE_URL}/api/AdminDashboard/lookupType/${id}` : `${API_BASE_URL}/api/AdminDashboard/lookupValue/${id}`;


  const response = await callApi(deleteUrl, {}, "DELETE");
  if (!response.success) {
    return;
  }
  showToast("Deleted successfully!");
  bootstrap.Modal
    .getOrCreateInstance(document.getElementById("deleteModal"))
    .hide();

  isTypeDelete ? RenderLookupType() : fetchLookupValues(typeId);

})



// Add and Update for LookUPvalues--
async function addLookUpValue(valueData, typeName) {

  const addValueUrl = `${API_BASE_URL}/api/AdminDashboard/lookupValue`
  const response = await callApi(addValueUrl, valueData, "POST");

  if (!response.success) {
    return;
  }
  showToast("Added Successfully");
  bootstrap.Modal
    .getOrCreateInstance(document.getElementById("lookupValueModal"))
    .hide();
// set active and showing updated filled
  const el = document.querySelector(
    `.type-item[data-id="${valueData.typeId}"]`
  );

  if (el) {
    switchType(typeName, valueData.typeId, el);
  }
  return;
}


async function updateLookupValue(data) {
  const updateUrl = `${API_BASE_URL}/api/AdminDashboard/lookupValue`;
  const response = await callApi(updateUrl, data, "PUT");
  if (response.success) {
    showToast("Updated Successfuly");
    bootstrap.Modal
      .getOrCreateInstance(document.getElementById("lookupValueModal"))
      .hide();
    fetchLookupValues(data.typeId);
  }
  return;
}


//Add and update lookup type api calls
async function addType(data) {

  const typeAddUrl = `${API_BASE_URL}/api/AdminDashboard/lookupType`;
  const response = await callApi(typeAddUrl, data, "POST");
  if (!response.success) {
    showToast("Unable to add LookupType", "error");
    return;
  }
  showToast("Added Successfully");
  bootstrap.Modal
    .getOrCreateInstance(document.getElementById("typeModal"))
    .hide();
  RenderLookupType();
  return;
}

async function updateType(data) {
  const updateTypeUrl = `${API_BASE_URL}/api/AdminDashboard/lookupType`;
  const response = await callApi(updateTypeUrl, data, "PUT");
  if (response.success) {

    showToast("Updated Successfully");
    bootstrap.Modal
      .getOrCreateInstance(document.getElementById("typeModal"))
      .hide();
    RenderLookupType();
    return;
  }
}



// --- Search Logic for Types (Search Name or ID) ---
document.getElementById('typeSearch').addEventListener('input', function (e) {
  let val = e.target.value.toLowerCase();
  document.querySelectorAll('.type-item').forEach(item => {
    let name = item.querySelector('.type-label').innerText.toLowerCase();
    let id = item.getAttribute('data-id').toLowerCase();
    item.style.display = (name.includes(val) || id.includes(val)) ? 'flex' : 'none';
  });
});

// --- Search Logic for Values (Search Name or ID) ---
document.getElementById('valueSearch').addEventListener('input', function (e) {
  let val = e.target.value.toLowerCase();
  let rows = document.querySelectorAll('#valueBody tr');
  rows.forEach(row => {
    let text = row.innerText.toLowerCase();
    row.style.display = text.includes(val) ? '' : 'none';
  });
});



document.getElementById("look").addEventListener("click", () => {
  RenderLookupType();
})

// RENDERING LOOKUP TYPES
// ------------------
async function RenderLookupType() {
  const typeList = document.getElementById("typeList");
  try {
    const typeUrl = `${API_BASE_URL}/api/AdminDashboard/lookuptype`;
    const response = await callApi(typeUrl, {}, "GET");
    console.log(response);
    if (!response.success) {
      typeList.innerHTML = `<p class="text-danger text-center">${response.error.message} !</p>`;
      console.log("Something Went Wrong " + response.error);
      return
    }

    const data = response.data;
    // share lookup types to lookup value type id Drop down
    populateLookupTypes(data);

    typeList.innerHTML = ""; // clear existing

    let isFirst = true;

    data.forEach(i => {

      const isActiveClass = isFirst ? "active" : "";

      const typeHtml = `
  <div class="type-item ${isActiveClass}"
       data-id="${i.typeId}"
       data-name="${i.typeName}"
       data-description="${i.typeDescription}">
       
    <div class="d-flex align-items-center gap-2">
      <span class="id-badge">${i.typeId}</span>
      <span class="type-label">${i.typeName}</span>
    </div>

    <div class="type-actions">
      <button class="btn btn-sm text-primary p-1 updateTypeBtn">
        <i class="bi bi-pencil"></i>
      </button>
      <button class="btn btn-sm text-danger p-1 deleteTypeBtn">
        <i class="bi bi-trash"></i>
      </button>
    </div>
  </div>
`;


      typeList.innerHTML += typeHtml;

      // First item → update right view
      if (isFirst) {
        setActiveType(i.typeName, i.typeId);
        isFirst = false;
      }
    });


  }
  catch (err) {
    console.error(err);
  }
}

// active class
function setActiveType(typeName, typeId) {
  document.getElementById("activeTitle").innerText = typeName;
  document.getElementById("activeIDHeader").innerText = `Type ID: ${typeId}`;

  // Fetch lookup values for this type
  fetchLookupValues(typeId);
}

typeList.addEventListener("click", function (e) {
  const item = e.target.closest(".type-item");
  if (!item) return;

  //Prevent type selection when clicking the update button

  const updateBtn = e.target.closest(".updateTypeBtn");
  if (updateBtn) {
    e.stopPropagation();   // ✅ STOP bubbling
    //handleUpdate(updateBtn);
    return;
  }

  const deleteBtn = e.target.closest(".deleteTypeBtn");
  if (deleteBtn) {
    e.stopPropagation();   // ✅ STOP bubbling
    handleDelete(deleteBtn);
    return;
  }
  switchType(item.dataset.name, item.dataset.id, item);
});

function switchType(name, id, el) {
  document.querySelectorAll('.type-item')
    .forEach(i => i.classList.remove('active'));

  el.classList.add('active');

  setActiveType(name, id);
}

async function fetchLookupValues(typeId) {
  console.log("Fetching lookup values for typeId:", typeId);

  const valueUrl = `${API_BASE_URL}/api/AdminDashboard/lookupValue/${typeId}`;
  const response = await callApi(valueUrl, {}, "GET");
  const data = response.data;
  if (!response.success) {
    const valueBody = document.getElementById("valueBody");
    console.log("Something Went Wrong " + response);
    valueBody.innerHTML = `<p class="text-danger text-center">${response.errorMsg}</p>`;

    return
  }
  renderlookupValues(data, typeId);

}


// RENDERING LOOKUP VALUES
async function renderlookupValues(data, typeId) {

  console.log("sa", data)
  const valueBody = document.getElementById("valueBody");
  valueBody.innerHTML = "";
  data.forEach(lv => {
    const row = `
    <tr 
      data-value-id="${lv.valueId}"
      data-lookup-type-id="${typeId}"
      data-display-value="${lv.displayValue}"
      data-lookup-code="${lv.lookupCode}"
      data-sort-order="${lv.sortOrder}"
    >
      <td class="ps-4">
        <span class="id-badge">${lv.valueId}</span>
      </td>
      <td>
        <div class="truncate">${lv.displayValue}</div>
      </td>
      <td>
        <code>${lv.lookupCode}</code>
      </td>
      <td class="text-center">${lv.sortOrder}</td>
      <td class="text-end pe-4 actions-col">
        <button class="btn btn-sm btn-outline-secondary me-1 updateValueBtn">
          <i class="bi bi-pencil"></i>
        </button>
        <button class="btn btn-sm btn-outline-danger deleteValueBtn">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    </tr>
  `;

    document.getElementById("valueBody").insertAdjacentHTML("beforeend", row);
  });
}


// populate lookup type
function populateLookupTypes(types) {
  const select = document.getElementById("lookupTypeSelect");
  select.innerHTML = `<option value="">-- Select Lookup Type --</option>`;

  types.forEach(t => {
    select.innerHTML += `
      <option value="${t.typeId}">
        ${t.typeName}
      </option>
    `;
  });
}

// LOOKUP Type UPDATE AND DELETE FUNC
// ------------------------
document.getElementById("typeList").addEventListener("click", function (e) {
  const editBtn = e.target.closest(".updateTypeBtn");
  const deleteBtn = e.target.closest(".deleteTypeBtn");
  if (!editBtn && !deleteBtn) return;


  if (editBtn) {
    const typeDataSet = editBtn.closest(".type-item");
    console.log(typeDataSet);
    const typeData = {
      typeId: typeDataSet.dataset.id,
      typeName: typeDataSet.dataset.name,
      description: typeDataSet.dataset.description
    }
    console.log("saa", typeData)
    openEditTypeModal(typeData);
  }
  if (deleteBtn) {
    isTypeDelete = true;
    const typeDataSet = deleteBtn.closest(".type-item");
    const data = new DeleteLookupRequest(
      typeDataSet.dataset.id,
      typeDataSet.dataset.name,
    )
    openDeleteModel(data);
  }

})

// LOOKUP VALUE UPDATE AND DELETE FUNC
// ------------------------

document.getElementById("valueBody").addEventListener("click", function (e) {

  const editBtn = e.target.closest(".updateValueBtn");
  const deleteBtn = e.target.closest(".deleteValueBtn");
  if (!editBtn && !deleteBtn) return;
  if (editBtn) {
    const row = editBtn.closest("tr");
    console.log(row.dataset);
    const valueData = {
      valueId: Number(row.dataset.valueId),
      typeId: Number(row.dataset.lookupTypeId),
      displayValue: row.dataset.displayValue,
      lookupCode: row.dataset.lookupCode,
      sortOrder: Number(row.dataset.sortOrder)
    };

    openUpdateLookupValueModal(valueData);
  }
  if (deleteBtn) {
    isTypeDelete = false;
    const row = deleteBtn.closest("tr");
    const data = new DeleteLookupRequest(
      row.dataset.valueId,
      row.dataset.displayValue,
      row.dataset.lookupTypeId
    )
    
    openDeleteModel(data);
  }
});


class DeleteLookupRequest {
  constructor(deleteId, deleteName, typeId = 0) {
    this.deleteId = deleteId;
    this.deleteName = deleteName;
    this.typeId = typeId;
  }
}