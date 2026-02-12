import { callApi } from "./callApi.js";
import { showToast } from "./toast.js";
//import { API_BASE_URL } from "./config.js";

document.addEventListener("DOMContentLoaded", function () {

    const productContainer = document.getElementById("productContainer");
    const paginationContainer = document.getElementById("paginationContainer");
    const chooseSort = document.getElementById("chooseSort");

    let Product = [];
    let filteredProducts = [];
    let currentPage = 1;
    let firstLoad = true;
    const productsPerPage = 12;
    const noImage = "assets/Images/NoProductImage.png";

    let isSearchMode = false;

    let quantities = {}; // ⭐ Quantity store

    async function fetchProducts(categoryId) {
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/Product/listing/${categoryId}`);
            console.log(response);
            const data = await response.json();
            console.log("Fetched Products:", data); 
            Product = data.data || [];
            filteredProducts = [...Product];
            currentPage = 1;
            firstLoad = true;

            // ⭐ SET CATEGORY TITLE
            if (Product.length > 0 && Product[0].category) {
                document.getElementById("listingTitle").innerText = Product[0].category;
            } else {
                document.getElementById("listingTitle").innerText = "Products";
            }
            initializeProducts();
        }
        catch (error) {
            console.error("Error fetching products:", error);
            productContainer.innerHTML = `<p class="text-danger">Failed to load products!</p>`;
        }
    } 

    async function fetchSearchProducts(keyword) {
    try {
        const response = await callApi(
            `${API_BASE_URL}}/api/Search/customer?q=${encodeURIComponent(keyword)}`,
            {},
            "GET"
        );

        const products = response?.data?.data || [];

        Product = products;
        filteredProducts = [...products];
        currentPage = 1;
        firstLoad = true;

        document.getElementById("listingTitle").innerText =
            `Search results for "${keyword}"`;

        // ✅ NO PRODUCTS FOUND
        if (!products.length) {
            productContainer.innerHTML = `
                <div class="col-12 text-center py-5">
                    <h5 class="fw-bold mb-2">No results found</h5>
                    <p class="text-muted">
                        We couldn't find any products matching
                        <strong>"${keyword}"</strong>
                    </p>

                </div>
            `;
            paginationContainer.innerHTML = "";
            return;
        }

        // ✅ PRODUCTS FOUND
        initializeProducts();

    } catch (error) {
        console.error("Search error:", error);
        productContainer.innerHTML = `
            <div class="col-12 text-center py-5 text-danger">
                Failed to load search results. Please try again.
            </div>
        `;
    }
}


function renderNewRibbon(product) {
  if (!product.isNew) return "";

  // check if offer ribbon also exists
  const hasOffer =
    product.discountApplied &&
    Number(product.finalPrice) < Number(product.mrp);

  // if offer exists → push NEW down
  const top = hasOffer ? "8px" : "8px";

  return `
    <div class="ribbon ribbon-new" style="top:${top}">
      NEW
    </div>
  `;
}



function renderRating(product) {
  const rating = Number(product.averageRating || 0);
  const count = Number(product.ratingCount || 0);

  // OPTION 1: No ratings yet
  if (count === 0) {
    return `
      <div class="no-rating-text">
        No ratings yet
      </div>
    `;
  }

  // Rated product
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5;
  let starsHtml = "";

  for (let i = 1; i <= 5; i++) {
    if (i <= fullStars) {
      starsHtml += `<i class="bi bi-star-fill text-warning"></i>`;
    } else if (i === fullStars + 1 && halfStar) {
      starsHtml += `<i class="bi bi-star-half text-warning"></i>`;
    } else {
      starsHtml += `<i class="bi bi-star text-warning"></i>`;
    }
  }

  return `
    <div class="d-flex align-items-center gap-2 rating-stars">
      <span class="fw-semibold">${rating.toFixed(1)}</span>
      <div class="stars">${starsHtml}</div>
      <span class="text-muted">(${count})</span>
    </div>
  `;
}
async function fetchSearchProducts(keyword) {
        try { 
            const response = await callApi(`${API_BASE_URL}/api/Search/customer?q=${encodeURIComponent(keyword)}`, {}, "GET"); 
           // const result = await response.json(); 
            const Products = response.data?.data || [];  

            Product = Products;
            filteredProducts = [...Products]; 
            currentPage = 1; 
            firstLoad = true; 
            console.log("Search Products:", Products);
            document.getElementById("listingTitle").innerText = `Search results for "${keyword}"`;  

            // NO PRODUCTS FOUND 
            if (Products.length === 0) { 
                productContainer.innerHTML = `<div class="col-12 text-center py-5">
                    <h5 class="fw-bold mb-2">No results found</h5>
                    <p class="text-muted">
                        We couldn't find any products matching
                        <strong>"${keyword}"</strong>
                    </p>
                </div> `;
                paginationContainer.innerHTML = "";
                return;
            } 
            initializeProducts();
            syncCartUIFromAPI();
            HighlightWishlist();
    } catch (error) { 
        console.error("Search error:", error);
        productContainer.innerHTML=`<p class="text-danger">Failed to load search results. Please try again.</p>`; 
    } } 


function renderOfferRibbon(product) {
  if (!product.discountApplied) return "";

  const mrp = Number(product.mrp);
  const finalPrice = Number(product.finalPrice);

  if (!mrp || !finalPrice || finalPrice >= mrp) return "";

  const discountAmount = mrp - finalPrice;
  const discountPercent = Math.round((discountAmount / mrp) * 100);

  const label =
    discountPercent >= 5
      ? `${discountPercent}% OFF`
      : `₹${discountAmount.toFixed(0)} OFF`;

  // if NEW exists → push OFFER down
  const hasNew = product.isNew;
  const top = hasNew ? "38px" : "8px";

  return `
    <div class="ribbon ribbon-offer" style="top:${top}">
      ${label}
    </div>
  `;
}



    // ⭐ Render Products
    function Products() {
        const start = (currentPage - 1) * productsPerPage;
        const end = start + productsPerPage;
        const slicedProducts = filteredProducts.slice(start, end);

        productContainer.innerHTML = slicedProducts.map(s => {
            let productImage = s.imageUrl ? getImageUrl(s.imageUrl) : noImage;
            const stock = getStocks(s);
            return `
            <div class="col-6 col-sm-6 col-lg-3 product-item">
                <div class="card product-card p-3 border rounded shadow-sm h-100">
                    ${renderOfferRibbon(s)}
                    ${renderNewRibbon(s)}
                    <a href="product_details.html?name=${encodeURIComponent(s.displayName)}" class="text-decoration-none">
                        <div class="position-relative product-image-wrapper">
                            <img src="${productImage}"alt="${s.productName}" class="img-fluid mb-2 rounded">
                            ${stock.status === "out" ? `<div class="position-absolute top-0 start-0  w-100 h-100 d-flex align-items-center , justify-content-center bg-dark bg-opacity-50 rounded" ><span class="text-white fw-bold text-uppercase">${stock.text}</span></div>` : ""}
                        </div>
                    </a>

                    <div class="card-body text-start px-2 pb-0 pt-2">
                        <p class="product-name fs-5 mb-0 text-truncate">${s.productName}</p>
                        
                            ${renderRating(s)}
                        <div class="d-flex justify-content-between align-items-center my-2 ">

                            <div class="price">
                                ${ s.discountApplied ? `
                                    <span class="fw-bold text-dark me-2">₹${s.finalPrice}</span>
                                    <span class="text-danger text-decoration-line-through fs-6">₹${s.mrp}</span>` 
                                       : ` <span class="fw-bold text-dark">₹${s.mrp}</span>`
                                }
                            </div>
                        </div>

                        <div class="action-area" id="action-${s.productId}">
                        ${stock.status === "out" ? `<button class="btn btn-secondary w-100 mt-2 disabled">Unavailable</button>` :

                    `<div class="cart-row cart-row-${s.productId}">
                               <button data-id="${s.productId}" class="btn text-white add-to-cart-btn cart-btn-${s.productId}">Add to Cart</button>
                               <i class="bi bi-heart wishlist-icon fs-4" data-id="${s.productId}"></i>
                            </div> 

                          <!-- Row: Quantity + Heart (same height, same row) -->
                           <div class="qty-row qty-row-${s.productId} d-none">
                                <div class="qty-box ">
                                    <button class="qty-change" data-id="${s.productId}" data-action="minus">−</button>
                                    <span id="qty-${s.productId}" class="qty-value">1</span>
                                    <button class="qty-change" data-id="${s.productId}" data-action="plus">+</button>
                                </div>

                             <i class="bi bi-heart wishlist-icon fs-4" data-id="${s.productId}"></i>
                            </div>`
                }
                        </div>
                    </div>
                    ${stock.status === "few" ? `<p class="fw-bold mb-2 text-center" style="color:${stock.color};"><i class="bi bi-info-circle-fill"> ${stock.text}</i></p>` : " "}
                </div>
            </div>
        `}).join("");
    }

    async function syncCartUIFromAPI() {
        const userId = sessionStorage.getItem("userId");
        if (!userId) return;

        const result = await callApi(
            `${API_BASE_URL}/api/cart/${userId}`,
            {},
            "GET"
        );

        const cartItems = result?.data?.items || [];

        const cartMap = {};
        cartItems.forEach(i => {
            cartMap[i.productId] = i.quantity;
        });

        document.querySelectorAll(".action-area").forEach(area => {
            const productId = Number(area.id.replace("action-", ""));
            const cartRow = area.querySelector(`.cart-row-${productId}`);
            const qtyRow = area.querySelector(`.qty-row-${productId}`);
            const qtyEl = document.getElementById(`qty-${productId}`);

            if (!cartMap[productId]) {
                cartRow?.classList.remove("d-none");
                qtyRow?.classList.add("d-none");
            } else {
                cartRow?.classList.add("d-none");
                qtyRow?.classList.remove("d-none");
                if (qtyEl) qtyEl.innerText = cartMap[productId];
            }
        });
    }




    // ⭐ Pagination
    function Paginations() {
        const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
        paginationContainer.innerHTML = "";

        // Previous
        const prev = document.createElement("li");
        prev.className = `page-item ${currentPage === 1 ? "disabled" : ""}`;
        prev.innerHTML = `<a class="page-link" href="#">&laquo;</a>`;
        prev.addEventListener("click", (e) => {
            e.preventDefault();
            if (currentPage > 1) {
                currentPage--;
                Products();
                Paginations();
                syncCartUIFromAPI();
                HighlightWishlist();
                window.scrollTo({ top: 0, behavior: "smooth" });
            }
        });
        paginationContainer.appendChild(prev);

        // Numbers
        for (let i = 1; i <= totalPages; i++) {
            const li = document.createElement("li");
            li.className = `page-item ${i === currentPage ? "active" : ""}`;
            li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
            li.addEventListener("click", (e) => {
                e.preventDefault();
                currentPage = i;
                Products();
                Paginations();
                syncCartUIFromAPI();
                HighlightWishlist();
                window.scrollTo({ top: 0, behavior: "smooth" });
            });
            paginationContainer.appendChild(li);
        }

        // Next
        const next = document.createElement("li");
        next.className = `page-item ${currentPage === totalPages ? "disabled" : ""}`;
        next.innerHTML = `<a class="page-link" href="#">&raquo;</a>`;
        next.addEventListener("click", (e) => {
            e.preventDefault();
            if (currentPage < totalPages) {
                currentPage++;
                Products();
                Paginations();
                syncCartUIFromAPI();
                HighlightWishlist();
                window.scrollTo({ top: 0, behavior: "smooth" });
            }
        });
        paginationContainer.appendChild(next);
    }

    // ⭐ Sorting
chooseSort.addEventListener("click", function (event) {
  if (!event.target.classList.contains("dropdown-item")) return;

  event.preventDefault();
  const sortValue = event.target.dataset.value;

  const getPrice = (p) =>
    p.discountApplied ? Number(p.finalPrice) : Number(p.mrp);

  switch (sortValue) {

    case "priceLow":
      filteredProducts.sort((a, b) => getPrice(a) - getPrice(b));
      break;

    case "priceHigh":
      filteredProducts.sort((a, b) => getPrice(b) - getPrice(a));
      break;

    case "newProducts":
      filteredProducts = [...Product].sort(
        (a, b) => b.productId - a.productId
      );
      break;

    case "collections":
  if (isSearchMode && categoryId) {
    isSearchMode = false;
    fetchProducts(categoryId); // reload full category
    return;
  }

  filteredProducts = [...Product];
  filteredProducts.sort((a, b) => b.productId - a.productId);
  break;
  }

  currentPage = 1;
  Products();
  Paginations();
  syncCartUIFromAPI();
  HighlightWishlist();
});


    // ⭐ Initial Load
function initializeProducts() {
    if (firstLoad) {
        filteredProducts.sort((a, b) => b.productId - a.productId);
        firstLoad = false;
    }
    Products();
    Paginations();
    syncCartUIFromAPI();
    HighlightWishlist();
}


    // ⭐ ADD TO CART → Switch to Quantity Row
document.addEventListener("click", async function (e) {

    if (!e.target.classList.contains("add-to-cart-btn")) return;

        const productId = parseInt(e.target.dataset.id);
        const userId = sessionStorage.getItem("userId");

        if (!userId) {
        const returnUrl = encodeURIComponent(window.location.href);
        window.location.href = `signin.html?returnUrl=${returnUrl}`;
        return false;
    }

        // API CALL → Add product with quantity 1 
        const result = await callApi(`${API_BASE_URL}/api/cart/add`,
            {
                userId: Number(userId),
                productId: productId,
                quantity: 1
            },
            "POST"
        );

        if (!result.success) return;

        const updatedItem = result.data.items.find(i => i.productId === productId);
        const qty = updatedItem.quantity;

        document.querySelector(`.cart-row-${productId}`).classList.add("d-none");
        document.querySelector(`.qty-row-${productId}`).classList.remove("d-none");

        document.getElementById(`qty-${productId}`).innerText = qty;

        showToast(result.data.message || "Added to cart!", "success");
        console.log(showToast);

    });

    // ⭐ PLUS / MINUS Buttons
    document.addEventListener("click", async function (e) {

        if (!e.target.classList.contains("qty-change")) return;

        const productId = parseInt(e.target.dataset.id);
        const action = e.target.dataset.action;
        const userId = sessionStorage.getItem("userId");

        let currentQty = parseInt(document.getElementById(`qty-${productId}`).innerText);

        // New quantity 
        let newQty = action === "plus" ? currentQty + 1 : currentQty - 1;

        // If qty becomes 0 → remove item 
        if (newQty === 0) {
            const result = await callApi("http://localhost:44366/api/cart/remove",
                {
                    userId: Number(userId),
                    productId: productId
                }
            );

            if (!result.success) return;

            // // Show Add-to-cart button again
            document.querySelector(`.qty-row-${productId}`).classList.add("d-none");
            document.querySelector(`.cart-row-${productId}`).classList.remove("d-none");

            showToast("Item removed from cart");
            return;
        }

        //  Otherwise → update item 
        const result = await callApi(`${API_BASE_URL}/api/cart/add`, {
            userId: Number(userId),
            productId: productId,
            quantity: newQty
        });

        if (!result.success) return;

        const updatedItem = result.data.items.find(i => i.productId === productId);
        document.getElementById(`qty-${productId}`).innerText = updatedItem.quantity;

        showToast("Quantity updated");
    });

    // Load Selected Category
    const urlParams = new URLSearchParams(window.location.search);
    const categoryId = urlParams.get("id"); 
    const searchQuery = urlParams.get("q");
    

    // ⭐ PLUS / MINUS Buttons
    document.addEventListener("click", async function (e) {

        if (!e.target.classList.contains("qty-change")) return;

        const productId = parseInt(e.target.dataset.id);
        const action = e.target.dataset.action;
        const userId = sessionStorage.getItem("userId");

        const qtyEl = document.getElementById(`qty-${productId}`);
        let currentQty = Number(qtyEl.innerText);

        // New quantity 
        const newQty = action === "plus" ? currentQty + 1 : currentQty - 1;

        // if (newQty < 0) return;

        // If qty becomes 0 → remove item 
        if (newQty <= 0) {
            // const result = await callApi("https://localhost:44366/api/cart/remove",
            //     {
            //         userId: Number(userId),
            //         productId: productId
            //     },
            //     "DELETE"
            // ); 
            console.log("Removing item", productId);
            const result = await callApi(
                `${API_BASE_URL}/api/cart/remove/${userId}/${productId}`,
                {},
                "DELETE"
            );

            // if (!result?.success) return;

            showToast("Item removed from cart", "success");
            document.dispatchEvent(new Event("cart:Updated"));
            return;
        }

        //  Otherwise → update item 
        const result = await callApi(`${API_BASE_URL}/api/cart/add`, {
            userId: Number(userId),
            productId: productId,
            quantity: newQty
        }, "POST"
        );

        if (!result.success) return;

        // update qty in UI 
        qtyEl.innerText = newQty;

        showToast("Quantity updated", "success");
        document.dispatchEvent(new Event("cart:Updated"));
    });
    // Listen to cart:Updated event

    document.addEventListener("cart:Updated", syncCartUIFromAPI);
    window.addEventListener("focus", syncCartUIFromAPI);

    if (searchQuery) {  
        // search mode 
        
        fetchSearchProducts(searchQuery);
    } else if (categoryId) { 
        // category mode 
        
        fetchProducts(categoryId);
    } else { 
        productContainer.innerHTML = `<p class="text-danger">No products to display</p>`;
    }



    // if (!categoryId) {
    //     productContainer.innerHTML = `<p class="text-danger">No category selected!</p>`;
    // } else {
    //     fetchProducts(categoryId);
    // }

   // ⭐ Wishlist Highlighting

async function HighlightWishlist() {
    const userId = sessionStorage.getItem("userId");
    if (!userId) return;
    console.log("userId" ,userId)
    try {
        const response = await fetch(`${API_BASE_URL}/api/WishList/get-by-user`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                userId: Number(userId)
            })
        });

        const result = await response.json();
        if (!result.isSuccess) return;

        const wishlist = result.data.map(item => item.productId);

        wishlist.forEach(productId => {
            const icons = document.querySelectorAll(`.wishlist-icon[data-id='${productId}']`);

            icons.forEach(icon => {
                icon.classList.remove("bi-heart");
                icon.classList.add("bi-heart-fill", "text-danger");
            });
            
        });
    }
    catch (error) {
        console.error("Error fetching wishlist:", error);
    }
}



    // ⭐ Wishlist Add/Remove
    document.addEventListener("click", async function (e) {
    if (!e.target.classList.contains("wishlist-icon")) return;

    const icon = e.target;
    const productId = icon.dataset.id;
    const userId = sessionStorage.getItem("userId");

    if (!userId) {
        const returnUrl = encodeURIComponent(window.location.href);
        window.location.href = `signin.html?returnUrl=${returnUrl}`;
        return false;
    }

    icon.style.pointerEvents = "none";
    setTimeout(() => icon.style.pointerEvents = "auto", 800);

    try {
        const url = icon.classList.contains("bi-heart-fill")
            ? `${API_BASE_URL}/api/WishList/remove`
            : `${API_BASE_URL}/api/WishList/add`;

        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                userId: Number(userId),
                productId: Number(productId)
            })
        });

        const result = await response.json();
        if (!result.isSuccess) throw new Error();

        icon.classList.toggle("bi-heart");
        icon.classList.toggle("bi-heart-fill");
        icon.classList.toggle("text-danger");
    }
    catch {
        alert("Wishlist action failed. Try again.");
    }
});


    // ⭐ stock

    function getStocks(product){
        if(product.availableQuantity < product.minimumStockLevel ){
            return { status:"out" , text : product.stockStatus , color : "red"}; 
        }
        if(product.availableQuantity  <= product.minimumStockLevel){
            return { status: "few", text : product.stockStatus , color : "blue"}
        }
        return {status:"ok", text : "" , color : ""};
    }
});