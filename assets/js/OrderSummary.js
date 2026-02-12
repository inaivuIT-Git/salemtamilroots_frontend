
import { callApi } from "./callApi.js";
import { showToast } from "./toast.js";

const AddressSection = document.getElementById("addressDetails");
const orderId = sessionStorage.getItem("orderId");
const userId = sessionStorage.getItem("userId");
const DefaultAddressUrl = `${API_BASE_URL}/api/OrderProcess/address/${userId}`;
const AllAddressesUrl = `${API_BASE_URL}/api/OrderProcess/address/all/${userId}`;
const productPriceUrl = `${API_BASE_URL}/api/OrderProcess/orderSummary/${orderId}`;
const orderUpdateUrl = `${API_BASE_URL}/api/OrderProcess/order`;
const paymentUrl = `${API_BASE_URL}/api/OrderProcess/payment/${orderId}`;
const noImage = 'assets/Images/NoProductImage.png';
function renderDefaultLayout() {
  AddressSection.innerHTML = `
        <h4 class="section-heading">Deliver To</h4> 

        <div id="deliveryAddress"></div>

        <div class="d-flex justify-content-between pb-2">
            <p></p>
            <button class="text-primary btn" id="changeAddress">
                Change <i class="bi bi-chevron-down"></i>
            </button>
        </div>
    `;


  document.getElementById("changeAddress").addEventListener("click", loadAllAddressDetails);
}

//renderAdress
function renderSelectedAddress(address) {

  const DeliveryAddress = document.getElementById("deliveryAddress");
  console.log(address);
  if (!DeliveryAddress) return;
  if (address == null) {
    AddressSection.innerHTML = ` <h3 class="section-heading">Deliver To</h3>
                                                <div class="text-center"><button class="btn text-center fs-5 text-primary" id="addAddress"> <i class="bi bi-plus"></i> Add Address </button></div>`;

  }
  console.log(address);
  console.log(address.addressId);
  sessionStorage.setItem("selectedAddressId", address.addressId);
  DeliveryAddress.innerHTML = `
        <div class="d-flex gap-3 fw-medium pb-2">
            <p>${address.recipientname}</p>
              <p>${address.phoneNumber ?? ""}</p>
          </div>
        <p>
            ${address.addressline1}, ${address.addressline2},
            ${address.city}, ${address.district} - ${address.postalcode}
        </p>
    `;
}

/* =========================
   LOAD DEFAULT ADDRESS
========================= */
async function loadDefaultAddress() {
  try {
    const response = await fetch(DefaultAddressUrl);
    if (!response.ok) throw new Error("Failed to fetch default address");

    const result = await response.json();
    if (!result) return;
    console.log("Default Address Result:", result);
    const data = result.data;
    //selectedAddress = data;
    
      renderSelectedAddress(data);
    
    

  } catch (error) {
    console.error("Default Address Error:", error);

  }
}

/* =========================
   LOAD ALL ADDRESSES
========================= */
async function loadAllAddressDetails() {
  try {
    const response = await fetch(AllAddressesUrl);
    if (!response.ok) throw new Error("Failed to fetch addresses");

    const { data } = await response.json();

    let html = `
        <div class="address-options">
            <h4 class="section-heading">Deliver To</h4>`;

    if (Array.isArray(data)) {
      data.forEach(address => {
        html += `
                <label class="address-item d-flex gap-2 p-2 border rounded mb-2">
                    <input type="radio"
                           name="addressOption"
                           class="form-check-input mt-1 address-radio"
                           value="${address.addressId}">
                    <div>
                        <div class="fw-medium d-flex gap-3">
                            <span>${address.recipientname}</span>
                            <span>${address.phoneNumber ?? ""}</span>
                        </div>
                        <p class="mb-0 text-muted small">
                            ${address.addressline1}, ${address.addressline2},
                            ${address.city}, ${address.district} - ${address.postalcode}
                        </p>
                    </div>
                </label>`;
      });
    }

    html += `<button class="btn text-primary" id="addAddress"> <i class="bi bi-plus"></i> Add Address </button></div>`;

    AddressSection.innerHTML = html;

    // store list for lookup
    AddressSection.addressList = data;

  } catch (error) {
    console.error("Load All Address Error:", error);
  }
}


async function loadProductAndPrice() {
  try {
    const response = await fetch(productPriceUrl);
    if (!response.ok) throw new Error("Failed to fetch addresses");
    const result = await response.json();

    const data = result.data;
    console.log(data);
    //Assinging price
    const savedPrice = data.orderdiscount + data.coupondiscount;
    document.getElementById("totalItems").textContent = data.totalitems;
    document.getElementById("subtotal").textContent = `₹ ${data.subtotal}`
    if (data.orderdiscount === 0) {
      document.getElementById("discountRow").style.display = "none";
    }
    if (data.coupondiscount === 0) {
      document.getElementById("couponRow").style.display = "none";
    }
    if (data.transportcharge === 0) {
      document.getElementById("deliveryRow").style.display = "none";
    }
    if (data.taxamount === 0) {
      document.getElementById("taxRow").style.display = "none";
    }
    document.getElementById("discountPrice").textContent = `- ₹ ${data.orderdiscount}`
    document.getElementById("couponPrice").textContent = `- ₹ ${data.coupondiscount}`
    document.getElementById("taxPrice").textContent = `₹ ${data.taxamount}`
    document.getElementById("deliveryPrice").textContent = `₹ ${data.transportcharge}`
    document.getElementById("totalAmount").textContent = `₹ ${data.finalamount}`
    document.getElementById("savedPrice").textContent = `₹ ${savedPrice}`



    //product details
    const productDetails = document.getElementById("productDetails");
    const items = data.items;

    items.forEach(item => {
      const SellingPrice = Number((item.unitPrice - item.itemDiscount).toFixed(2));
      const discPerc = Math.round((item.itemDiscount / item.unitPrice) * 100)
      const imageUrl = item.imageUrl ? getImageUrl(item.imageUrl) : noImage;
      console.log(imageUrl);
      const ProductHtml = `<div class="row mb-4">
                                <!-- image and quantity -->
                                <div class="col-4 col-md-3">
                                    <div class="d-flex flex-column">
                                        <img src="${imageUrl}" alt="${item.productName}"
                                            class="img-fluid product-detail__img">
                                        <div class="text-center mt-2 qty">
                                            <p class="text-muted">Qty : ${item.quantity}</p>
                                        </div>
                                    </div>
                                </div>
                                <!-- details -->
                                <div class="col-8 col-md-9">
                                    <p class="product-name fs-5 text-truncate">${item.productName}</p>
                                    <p>Size <span class="text-muted">${item.weightValue} ${item.unitType}</span></p>
                                    <!-- ratings -->
                                    <div class="d-flex align-items-center gap-1 my-2">
                                        <span class="fw-semibold">3</span>
                                        <i class="bi bi-star-fill text-warning"></i>
                                        <span class="text-success">(1k reviews)</span>
                                    </div>
                                    <!-- price -->
                                    <div class="d-flex align-items-center mb-2 text-center">
                                        ${item.itemDiscount > 0 ? `<p class="fw-bold me-2 fs-5">₹${SellingPrice}</p>
                                        <p class="text-muted me-4 fs-6"><s>₹${item.unitPrice}</s></p>
                                        <p class="text-danger fw-bold fs-6">${discPerc}% Off</p>` : `<p class="fw-bold me-2 fs-5">₹${item.unitPrice}</p>`

        }
                                    </div>
                                    <p class="text-muted"><i class="bi bi-truck"></i> Estimated delivery within one week.</p>

                                </div>
                            </div>`

      productDetails.innerHTML += ProductHtml;
    });

  }
  catch (error) {
    console.error("Load Price Error:", error);

  }

}
/* =========================
   RADIO → SET AS DEFAULT
========================= */
AddressSection.addEventListener("change", (e) => {
  const radio = e.target.closest("input.address-radio");
  if (!radio) return;

  const selectedId = radio.value;

  const address = AddressSection.addressList
    ?.find(a => String(a.addressId) === String(selectedId));

  if (!address) {
    console.warn("Address not found for:", selectedId);
    return;
  }

  renderDefaultLayout();
  renderSelectedAddress(address);
});

/* PAGE LOAD */
document.addEventListener("DOMContentLoaded", () => {
  renderDefaultLayout();
  loadDefaultAddress();
  loadProductAndPrice();
  updateStatus("CheckoutInitiated")
});

//Update status method 
async function updateStatus(status) {
  const updateUrl = `${API_BASE_URL}/api/OrderProcess/order/status`;
  const payload = {
    userId: parseInt(userId),
    orderId: parseInt(orderId),
    status: status
  }
  console.log("type", typeof (userId))
  console.log("payloaa", payload);
  const response = await callApi(updateUrl, payload, "PUT");
  console.log("res", response)
  if (!response.success) {
    alert("update:Something Went wrong");
  }

}
// Add Address HTML 
const AddAddress = `
<form class="needs-validation" novalidate>

  <!-- Address Details -->
  <div>
    <h4 class="mb-4">Address Details</h4>

    <div class="row">

      <!-- Name -->
      <div class="col-md-6 mb-3">
        <div class="form-floating position-relative">
          <i class="bi bi-person-fill icon"></i>
          <input
            type="text"
            id="firstname"
            class="form-control"
            placeholder="First Name"
            required
            pattern="^[A-Za-z ]+$"
          >
          <label for="firstname" class="ms-4">
            Name <span class="text-danger">*</span>
          </label>
          <div class="invalid-feedback">
            Please enter your first name.
          </div>
        </div>
      </div>

      <!-- Phone -->
      <div class="col-md-6 mb-3">
        <div class="form-floating position-relative">
          <i class="bi bi-telephone-plus-fill icon"></i>
          <input
            type="text"
            id="phone"
            class="form-control"
            placeholder="Phone Number"
            required
            pattern="^[0-9]{10}$"
          >
          <label for="phone" class="ms-4">
            Phone Number <span class="text-danger">*</span>
          </label>
          <div class="invalid-feedback">
            Please enter a valid 10-digit phone number.
          </div>
        </div>
      </div>

      <!-- Address Line 1 -->
      <div class="col-md-6 mb-3">
        <div class="form-floating position-relative">
          <i class="bi bi-geo-alt-fill icon"></i>
          <input
            type="text"
            id="address1"
            class="form-control"
            placeholder="Address Line 1"
            required
          >
          <label for="address1" class="ms-4">
            House.No / Flat / Building <span class="text-danger">*</span>
          </label>
          <div class="invalid-feedback">
            Please enter House.No / Flat / Building name.
          </div>
        </div>
      </div>

      <!-- Postal Code -->
      <div class="col-md-6 mb-3">
        <div class="form-floating position-relative">
          <i class="bi bi-mailbox2 icon"></i>
          <input
            type="text"
            id="postalcode"
            class="form-control"
            placeholder="Postal Code"
            pattern="^[0-9]{5,6}$"
            required
          >
          <label for="postalcode" class="ms-4">
            Postal Code <span class="text-danger">*</span>
          </label>
          <div class="invalid-feedback">
            Enter a valid postal code.
          </div>
        </div>
      </div>

      <!-- Address Description -->
      <div class="col-md-12 mb-3 descrip">
        <div class="form-floating position-relative">
          <i class="bi bi-geo-fill icon"></i>
          <textarea
            id="address2"
            class="form-control"
            placeholder="Address"
            style="height:100px"
            required
          ></textarea>
          <label for="address2" class="ms-4">
            Address
          </label>
          <div class="invalid-feedback">
            Please enter your address.
          </div>
        </div>
      </div>

      <!-- City -->
      <div class="col-md-6 mb-3">
        <div class="form-floating position-relative">
          <i class="bi bi-building-fill icon"></i>
          <input
            type="text"
            id="city"
            class="form-control"
            placeholder="City"
          >
          <label for="city" class="ms-4">City</label>
        </div>
      </div>

      <!-- District -->
      <div class="col-md-6 mb-3">
        <div class="form-floating position-relative">
          <i class="bi bi-map-fill icon"></i>
          <input
            type="text"
            id="district"
            class="form-control"
            placeholder="District"
            required
          >
          <label for="district" class="ms-4">
            District <span class="text-danger">*</span>
          </label>
          <div class="invalid-feedback">
            Please enter a district.
          </div>
        </div>
      </div>

      <!-- State -->
      <div class="col-md-6 mb-3">
        <div class="form-floating position-relative">
          <i class="bi bi-flag-fill icon"></i>
          <input
            type="text"
            id="state"
            class="form-control"
            placeholder="State"
            required
          >
          <label for="state" class="ms-4">
            State <span class="text-danger">*</span>
          </label>
        </div>
      </div>

      <!-- Country -->
      <div class="col-md-6">
        <div class="form-floating position-relative">
          <i class="bi bi-globe-central-south-asia icon"></i>
          <input
            type="text"
            id="country"
            class="form-control"
            placeholder="Country"
            required
          >
          <label for="country" class="ms-4">
            Country <span class="text-danger">*</span>
          </label>
          <div class="invalid-feedback">
            Enter a valid country name.
          </div>
        </div>
      </div>

    </div>
  </div>

  <!-- Submit -->
  <div class="text-center">
    <button type="submit" id="addAddressBtn" class="btn btn-green py-2">
      <span
        class="spinner-border spinner-border-sm me-2 d-none"
        id="loadingSpinner"
      ></span>
      Save & Deliver Here
    </button>
    <button
    type="button"
    id="cancelAddressBtn"
    class="btn btn-outline-secondary py-2"
  >
    Cancel
  </button>
  </div>

</form>
`;


AddressSection.addEventListener("click", (e) => {
  if (e.target.closest("#cancelAddressBtn")) {
    renderDefaultLayout();
    loadDefaultAddress();
    return;
  }
  if (!e.target.closest("#addAddress")) return;

  AddressSection.innerHTML = AddAddress;

  const form = AddressSection.querySelector(".needs-validation");
  const AddAddressBtn = AddressSection.querySelector("#addAddressBtn");
  const spinner = AddressSection.querySelector("#loadingSpinner");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (!form.checkValidity()) {
      form.classList.add("was-validated");
      return;
    }

    const payload = {
      userId: Number(sessionStorage.getItem("userId")),
      addressId: 0, // 0 = new address

      recipientname: document.getElementById("firstname").value.trim(),
      phoneNumber: document.getElementById("phone").value.trim(),

      addressline1: document.getElementById("address1").value.trim(),
      addressline2: document.getElementById("address2").value.trim(),

      city: document.getElementById("city").value.trim(),
      district: document.getElementById("district").value.trim(),
      state: document.getElementById("state").value.trim(),
      country: document.getElementById("country").value.trim(),

      postalcode: document.getElementById("postalcode").value.trim()
    };


    AddAddressBtn.disabled = true;
    spinner.classList.remove("d-none");

    try {
      const res = await fetch(`${API_BASE_URL}/api/OrderProcess/address`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      const address = result.data;
      if (!res.ok || !result.isSuccess) {
        throw new Error(result.error?.message || "Failed to save address");
      }

      //alert("Address saved successfully", "success");
      renderDefaultLayout();
      renderSelectedAddress(address);

      form.reset();
      form.classList.remove("was-validated");



    } catch (err) {
      console.log(err.message, "error");
    } finally {
      spinner.classList.add("d-none");
      AddAddressBtn.disabled = false;
    }
  });
});


document.getElementById("proceedBtn").addEventListener("click", () => {
 const addressId = sessionStorage.getItem("selectedAddressId");
  if (!addressId) {
      showToast("Please select a delivery address before proceeding.","error");
      return;
    }
  updateOrderDetail();
  updateStatus("PaymentInitiated");
  createTransaction();
 
}
);

async function updateOrderDetail() {
  try {
     const addressId = sessionStorage.getItem("selectedAddressId");

    //Basic validation
    const request = {
      orderId: orderId,
      shippingId: addressId
    };
    console.log("What pay",request);
    const response = await fetch(orderUpdateUrl,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          // "Authorization": `Bearer ${token}` // if JWT is used
        },
        body: JSON.stringify(request)
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to update order");
    }

    const result = await response.json();

    console.log("Order updated successfully:", result);

    sessionStorage.removeItem("selectedAddressId");



  } catch (error) {
    console.error("Update order error:", error);
    alert("Something went wrong while proceeding. Please try again.");
  }
}

async function createTransaction() {
  // Implementation for creating a transaction

  try {
      const response = await callApi(paymentUrl, {}, "POST");
      console.log(response)
      sessionStorage.setItem("paymentId", response.data.transactionId);

      if (!response.success) {
        alert("Payment Creation:Something Went wrong");
        return;
      }
      sessionStorage.removeItem("selectedAddressId");
    window.location.href = "PaymentPage.html";

  } catch (error) {
    console.error("Error creating transaction:", error);
  }
}


//ORDER CANCELLATION

document.getElementById("confirmCancelOrder").addEventListener("click", () => {
  updateStatus("PaymentCancelled");
  sessionStorage.removeItem("orderId");
  window.location.href = "viewcart.html";
})



