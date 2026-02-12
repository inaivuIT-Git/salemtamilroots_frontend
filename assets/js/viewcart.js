import { callApi } from "./callApi.js";
import { showToast } from "./toast.js";
//import { API_BASE_URL } from "./config.js";
import { fetchCartSummary } from "./cartService.js";

document.addEventListener("DOMContentLoaded", async () => {

    const cartSummaryEl = document.getElementById("cartSummary");
    const cartItemsEl = document.getElementById("cart-items");
    const subTotalEl = document.getElementById("subtotal");
    const totalEl = document.getElementById("total");
    const itemCountEl = document.getElementById("itemCount");
    const discountEl = document.getElementById("discount");
    const couponDiscountEl = document.getElementById("coupenDiscount");
    const saveTextEl = document.getElementById("saveText");
    LoadCart();

    document.addEventListener("cart:Updated", LoadCart);

    async function LoadCart() {
        const userId = sessionStorage.getItem("userId");
        if (!userId) return;

        try {
            const result = await callApi(`${API_BASE_URL}/api/cart/${userId}`, {}, "GET");

            const cart = result.data?.items || [];
            console.log("Cart items:", cart);
            console.log(result);
            const summary = result.data?.summary;

            if (cart.length === 0) {
                cartItemsEl.innerHTML = `
                <div class="text-center mt-3">
                   <img src="assets/Images/card-empty.png" alt="Empty Cart" style="max-width:280px;"/>
                   <h3>Your Cart is empty 🌿</h3>
                   <p class="mb-4 text-muted">Add items to start shopping.</p>
                   <a href="index.html" class="btn btn-success mt-2">Continue shopping</a> 
                </div>`;

                // Hide cart summary 
                cartSummaryEl.classList.add("d-none");
                return;
            }

            // Show summary when items exist
            cartSummaryEl.classList.remove("d-none");

            cartItemsEl.innerHTML = "";
            let totalItems = 0;
            let totalsave = 0;
            console.log(cart) 

            cart.forEach(item => {
                const hasDiscount = item.discountAmount > 0;

                const finalPrice = hasDiscount
                    ? (item.unitPrice - item.discountAmount).toFixed(2)
                    : item.unitPrice.toFixed(2);

                let discountText = "";

                if (hasDiscount) {
                    if (item.discountType === 30) { // flat amount
                        discountText = `₹${item.discountValue} OFF`;
                    } else {
                        discountText = `${Math.round((item.discountAmount / item.unitPrice) * 100)}% OFF`;
                    } 
                } 
                    cartItemsEl.insertAdjacentHTML(
                        "beforeend",
                        `
  <div class="cart-item border-bottom py-3" data-id="${item.cartItemId}">
    
    <div class="d-flex">
      <!-- Product Image -->
      <img src="${getImageUrl(item.imageUrl)}" 
           class="product-img me-3" 
           alt="${item.productName}" 
           style="width:90px;height:90px;object-fit:contain;">
      
      <!-- Product Details -->
      <div class="flex-grow-1">
        
        <div class="fw-semibold">
          ${item.productName} <span class="text-muted small">${item.weightValue ? `${item.weightValue} ${item.unitName}` : ""}</span>
        </div> 

       

        <div class="text-muted small mb-1">
          Seller: <span class="fw-medium">${item.sellerName || ""}</span>
          <span class="badge bg-primary ms-1">Assured</span>
        </div>

        <!-- Price Section -->
        <div class="mt-2">
  <span class="fw-bold fs-5">₹${finalPrice}</span>

  ${hasDiscount ? `
    <span class="text-muted text-decoration-line-through ms-2">
      ₹${item.unitPrice}
    </span>
    <span class="text-success fw-semibold ms-2">
      ${discountText}
    </span>
  ` : ""}
</div>

        <!-- Quantity Controls -->
        <div class="d-flex align-items-center mt-2 data-product-name="${item.productName}" data-cart-id="${item.cartItemId}" data-product-id="${item.productId}">
          <button class="btn btn-outline-secondary btn-sm"
                  onclick="changeQuantity(${item.cartItemId}, -1)">−</button>

          <span class="mx-3 fw-semibold" data-qty="${item.cartItemId}">${item.quantity}</span>

          <button class="btn btn-outline-secondary btn-sm"
                  onclick="changeQuantity(${item.cartItemId}, 1)">+</button>
        </div>

        <!-- Actions -->
        <div class="mt-2">
          <button class="btn btn-link text-dark text-decoration-none px-0"
                  onclick="openRemoveModal(${item.cartItemId}, ${item.productId})">
            REMOVE
          </button>
        </div>

      </div>
    </div>


  </div>
  `
                    );

                    totalItems += item.quantity;
                    totalsave += item.discountAmount * item.quantity;
              });
            console.log(summary);
            // Update summary section
            subTotalEl.textContent = `₹${summary.subTotal}`;
            discountEl.textContent = `₹${summary.totalDiscount}`;
            totalEl.textContent = `₹${summary.grandTotal}`;
            couponDiscountEl.textContent = `₹${summary.transportCharge}`;
            itemCountEl.textContent = totalItems;
            saveTextEl.textContent = `You will save ₹${totalsave.toFixed(2)} on this order`;
        }
        catch (error) {
            console.error("Error loading cart:", error);
        }
    }


    window.changeQuantity = async function (cartItemId, change) {
        const qtyEl = document.querySelector(`[data-qty="${cartItemId}"]`);

        const cartItemEl = document.querySelector(`[data-cart-id="${cartItemId}"]`);

        const productName = cartItemEl?.dataset?.productName || "Item";
        const productId = Number(cartItemEl?.dataset?.productId);

        const currentQty = parseInt(qtyEl.textContent);

        const newQty = currentQty + change;

        // if zero -> delete 
        if (newQty <= 0) {
            await removeItem(productId);
            return;
        }

        const result = await callApi(
            `${API_BASE_URL}/api/cart/update-quantity`,
            { cartItemId, quantity: newQty },
            "PUT"
        );



        if (result.success) {
            showToast(`You've changed "${productName}" quantity to ${newQty}`, "success");

            document.dispatchEvent(new Event("cart:Updated"));
            LoadCart();
        }
    }

    window.removeItem = async function (productId) {
        const userId = sessionStorage.getItem("userId");

        const result = await callApi(
            `${API_BASE_URL}/api/cart/remove/${userId}/${productId}`,
            {},
            "DELETE"
        );

        if (result.success) {
            showToast("Item removed", "success");
            document.dispatchEvent(new Event("cart:Updated"));
            LoadCart();
        }
    }

    let removeCartItemId = null;
    let removeProductId = null;

    window.openRemoveModal = function (cartItemId, productId) {
        removeCartItemId = cartItemId;
        removeProductId = productId;
        document.getElementById("removeModal").classList.remove("d-none");
    };

    window.closeRemoveModal = function () {
        removeCartItemId = null;
        removeProductId = null;
        document.getElementById("removeModal").classList.add("d-none");
    };

    // confirm button logic 
    document.getElementById("confirmRemoveBtn").addEventListener("click", async () => {
        if (!removeProductId) return;

        await removeItem(removeProductId);
        closeRemoveModal();
    });

});

//_____________________________________//
// --------Check out button logic ---- //
//_____________________________________//
document.getElementById("checkoutBtn").addEventListener("click", () => {
   
        CreateOrder();
    
});

async function CreateOrder() {

    const userId = sessionStorage.getItem("userId");
    const response = await callApi(`${API_BASE_URL}/api/cart/${userId}`, {}, "GET");

    if (!response.success) {
        // alert("Failed to fetch cart items.");
        showToast("Failed to create order. Please try again.");
        return;
    }


    const Items = response.data.items;

    const OrderItems = [];

    Items.forEach((item) => {


        OrderItems.push({
            productId: item.productId,
            quantity: item.quantity,
        });

    });
  

    const OrderResult = await callApi(
        `${API_BASE_URL}/api/OrderProcess/placeorder`,
        {
            userId: userId,
            items: OrderItems,
        },
        "Post"
    );
    if (!OrderResult.success) {
        showToast("Failed to create order. Please try again.");
        return;
    }
    sessionStorage.setItem("orderId", OrderResult.data);
    window.location.href = "OrderSummary.html";

}
