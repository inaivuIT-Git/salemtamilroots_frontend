const api_base =   `${API_BASE_URL}/api/Product`;
// import { API_BASE_URL } from "./config.js";
let allProducts =[];
const NO_IMAGE_PATH = "/FrontEnd/assets/Images/NoProductImage.png";

/* ======================== SEARCH QUERY FROM URL  =============== */

function getProductSearchQuery() {
    const hash = location.hash;
    const queryString = hash.split("?")[1];
    if (!queryString) return null;

    const params = new URLSearchParams(queryString);
    return params.get("search");
}


/* ======================== LOAD SELLER PRODUCTS  =============== */

window.loadSellerProducts = async function () {
    const auth = window.getAuthOrRedirect();
if (!auth) return;

    const { sellerId } = auth;

    try {
        const response = await fetch(`${api_base}/seller/${sellerId}`);
        const json = await response.json();

        if (!json.isSuccess) {
           toastError("Failed to load products");
           showProductError("Failed to load products");
           return;
        }

        allProducts = json.data || []; // 🔥 cache once
        productCount(allProducts.length);
        newProductCount(allProducts);   

        // 🔍 APPLY SEARCH IF EXISTS
        const search = getProductSearchQuery();
        if (search) {
            await searchProductsFrontend(search);
        } else {
            renderProductTable(allProducts);
        }

    } catch (err) {
       console.error(err);
       toastError("Server not reachable");
       showProductError("Something went wrong");
    }
}



/* =================================================
   RENDER PRODUCT TABLE
   ================================================= */
function renderProductTable(products) {
    const tbody = document.getElementById("productTableBody");
    if (!tbody) return;

   tbody.innerHTML = "";

    if (!products.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-muted">
                    No products found
                </td>
            </tr>`;
        return;
    }

    products.forEach((p, i) => {
        let statusBadge =
            p.availableQuantity <= 0
                ? `<span class="badge bg-danger">Out of Stock</span>`
                : p.availableQuantity <= p.minimumStockLevel
                ? `<span class="badge bg-warning text-dark">Low Stock</span>`
                : `<span class="badge bg-success">In Stock</span>`;

            let productImage = p.imageUrl ? getImageUrl(p.imageUrl) : NO_IMAGE_PATH;

        tbody.innerHTML += `
        <tr class="product-row" data-id="${p.productId}" style="cursor:pointer">
            <td>${i + 1}</td>
            <td><img src="${productImage}" class="product-img"></td>
            <td class="fw-semibold">${p.productName}</td>
            <td>${p.category}</td>
            <td>₹${p.mrp}</td>
            <td>${p.availableQuantity}</td>
            <td>${p.minimumStockLevel}</td>
            <td>${statusBadge}</td>
        </tr>`;
    });
}


/* =======================  PRODUCT COUNT  ================== */
function productCount(count) {
    const dashboardCount = document.getElementById("dashboardProductCount");
    if (dashboardCount) dashboardCount.textContent = count;

    const prodPageCount = document.getElementById("ProductPageCount");
    if (prodPageCount) prodPageCount.textContent = count;
}
function newProductCount(products) {
    const newCount = products.filter(p => p.isNew === true).length;

    const el = document.getElementById("dashboardNewProductCount");
    if (el) el.textContent = newCount;
}

/* ======================== Add Product Button CLICK ======================== */
document.addEventListener("click", e => {
  const btn = e.target.closest(".add-product-btn");
  if (!btn) return;

  const route = btn.dataset.route;
  if (!route) return;

  location.hash = `#/${route}`;
});
/* ======================== ROW CLICK ======================== */

document.addEventListener("click", (e) => {
    const row = e.target.closest(".product-row");
    if (!row) return;

    const auth = window.getAuthOrRedirect();
if (!auth) return;

    const productId = row.dataset.id;
    // ✅ SPA navigation
    location.hash = `#/preview?productId=${productId}`;
    updatePageTitle("Product Preview");
});


/* ====================  ERROR STATE  ======================= */
function showProductError(message) {
    const tbody = document.getElementById("productTableBody");
    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="7" class="text-danger text-center">
                ${message}
            </td>
        </tr>`;

    toastError(message);
}


/* ====================  Product Search  ======================= */

function filterProductsByIds(productIds) {
    const idSet = new Set(productIds);
    const filtered = allProducts.filter(p => idSet.has(p.productId));

    renderProductTable(filtered);
    productCount(filtered.length);
    if (!filtered.length) {
        toastWarning("No matching products found");
    }
}

async function searchProductsFrontend(query) {

    const auth = window.getAuthOrRedirect();
if (!auth) return;

    const { sellerId } = auth;

    if (!query) {
        renderProductTable(allProducts);
        productCount(allProducts.length);
        return;
    }

    try {
        const res = await fetch( `${API_BASE_URL}/api/Search/seller?q=${encodeURIComponent(query)}&type=product`,{
            headers: { "X-Seller-Id": sellerId}
        });


        if (!res.ok) {
            toastError("Product search failed");
            return;
        }

        const json = await res.json();
        const productIds = (json.data?.products || []).map(p => p.productId);

        filterProductsByIds(productIds);

    } catch (err) {
        console.error("Product search failed", err);
        toastError("Unable to search products");
    }
}

/* ======================== HANDLE HASH CHANGE ======================== */
/* Allows re-search when navigating again */

window.addEventListener("hashchange", () => {
    if (!location.hash.startsWith("#/products")) return;

    const search = getProductSearchQuery();
    if (search) {
        searchProductsFrontend(search);
    } else {
        renderProductTable(allProducts);
        productCount(allProducts.length);
    }
});

function filterNewProducts() {
    const newProducts = allProducts.filter(p => p.isNew === true);

    renderProductTable(newProducts);
    productCount(newProducts.length);
}

document.addEventListener("click", (e) => {
    const card = e.target.closest(".new-products-card");
    if (!card) return;

    filterNewProducts();
});
