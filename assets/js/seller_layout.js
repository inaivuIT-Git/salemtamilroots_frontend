// logout

// import { API_BASE_URL } from "./config";

window.sellerLogout = function () {

  // 1️⃣ Clear session
  sessionStorage.clear();

  // 2️⃣ Clear global auth object
  delete window.AUTH;

  // 3️⃣ Clear SPA state
  window.dashboardState = {};
  lastQuery = "";

  // 4️⃣ Hard redirect (prevents back navigation)
  window.location.replace("index.html");

  window.clearNotifications?.();

};


window.getAuth = function () {
  return {
    userType: sessionStorage.getItem("userType"),
    sellerId: Number(sessionStorage.getItem("sellerId")),
    userId: Number(sessionStorage.getItem("userId"))
  };
};

window.getAuthOrRedirect = function () {
  const auth = getAuth();

  if (!auth.sellerId || !auth.userId || auth.userType !== "SellerAdmin") {
    window.location.replace("index.html");
    return null;
  }

  return auth;
};


document.addEventListener("DOMContentLoaded", () => {
  const auth = getAuthOrRedirect();
  if (!auth) return;

  if (!auth || auth.userType !== "SellerAdmin" || !auth.sellerId) {
    window.location.replace("index.html");
    return;
  }

  console.log("✅ Seller authorized");

  initSidebarNavigation();

  if (!location.hash) {
    location.hash = "#/dashboard";
  } else {
    loadPage(location.hash);
  }
});


console.log("🔥 seller_layout.js LOADED");


let isBooting = true;     // Page just loaded
let isRestoring = false; // Reload / back / forward



const ROUTES = {
  dashboard: "dashboard.html",
  products: "products.html",
  orders: "orders.html",
  manageproduct: "manageProduct.html", // ✅ FIXED
  preview: "sellerProductPreview.html"
};


window.addEventListener("popstate", () => {
    const path = window.location.pathname + window.location.search;
    isRestoring = true;
    loadPage(path);
});


/* ================= GLOBAL IMAGE HELPERS ================= */

/* ================= GLOBAL IMAGE HELPERS ================= */

window.API_BASE = window.API_BASE_URL;
console.log("Resolved API_BASE:", window.API_BASE);
const NO_IMAGE_PATH = "assets/Images/NoProductImage.png";


/**
 * Converts backend image path → browser usable URL
 * @param {string | null | undefined} path
 * @returns {string}
 */
window.getImageUrl = function (path) {
    if (!path) return NO_IMAGE_PATH;

    // already absolute
    if (path.startsWith("http")) return path;

    return API_BASE + path;
};


// ===== ADD PRODUCT IMAGE STATE =====
let mainImageFile = null;
let additionalImageFiles = [];
let currentPageUrl = null;

let isEditModeImages = false;
let existingMainImageUrl = null;
let existingAdditionalImageUrls = [];

let manageProductInitialized = false;

window.addEventListener("hashchange", () => {
    loadPage(location.hash);
});

/* ===== SIDEBAR NAVIGATION ======= */
function initSidebarNavigation() {
  document.querySelectorAll(".nav-link[data-route]").forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();

      const route = link.dataset.route;
      if (!route) return;

      location.hash = "#/" + route;
      //updatePageTitle(link.dataset.page);
    });
  });
}


/* ===== DASHBOARD CARD NAVIGATION ===== */

document.addEventListener("click", (e) => {
  const card = e.target.closest(".dashboard-link");
  if (!card) return;

  const route = card.dataset.route;   // ✅ correct
  const page = card.dataset.page;

  if (!route || !page) return;

  // update URL
  location.hash = "#/" + route;

  // sync sidebar highlight
  const sidebarLink =
    document.querySelector(`#desktopSidebar .nav-link[data-route="${route}"]`) ||
    document.querySelector(`#mobileSidebar .nav-link[data-route="${route}"]`);

  if (sidebarLink) {
    setActiveLink(sidebarLink);
  }

  //updatePageTitle(page);
});


/* ===== LOAD PRODUCTS PAGE ===== */
function loadPage(hash) {
    if (!hash || !hash.startsWith("#")) return;

    console.log("📄 loadPage hash =", hash);

    const clean = hash.replace("#/", "");
    const [route, query] = clean.split("?");

    updatePageTitle(route.charAt(0).toUpperCase() + route.slice(1));

    const pageUrl = ROUTES[route.toLowerCase()];

    if (!pageUrl) {
        console.error("❌ Unknown route:", route);
        return;
    }

    fetch(pageUrl)
        .then(res => {
            if (!res.ok) throw new Error("Page not found: " + pageUrl);
            return res.text();
        })
        .then(html => {
            const container = document.getElementById("pageContent");
            container.innerHTML = html;
             lastQuery = "";

            currentPageUrl = hash;

            // ✅ COMMON INIT
            initPopovers(container);
            buildBreadcrumbs(pageUrl);
            syncSidebarWithRoute(route);

            if (route === "dashboard") {
                loadSellerDashboard();     
                initDashboardCharts?.();   
            }

            if (route === "products") {
                loadSellerProducts?.();
            }

            if (route === "orders") {
                loadsellerOrders?.();
            }

            if (route === "manageProduct") {
                requestAnimationFrame(() => {
                    initmanageProductPage?.();
                    initImageUploader?.();
                });
            }

            if (route === "preview") {
                const params = new URLSearchParams(query);
                initSellerProductPreview?.(params.get("productId"));
            }
        })
        .catch(err => {
            console.error(err);
            document.getElementById("pageContent").innerHTML =
                `<p class="text-danger">Failed to load page</p>`;
        });
}


function syncSidebarWithRoute(route) {
    document.querySelectorAll(".nav-link").forEach(l => l.classList.remove("active"));

    const link =
        document.querySelector(`.nav-link[data-route="${route}"]`);

    if (link) link.classList.add("active");
}

function syncSidebarWithUrl() {
    const path = window.location.pathname.toLowerCase();

    const link =
        document.querySelector(`#desktopSidebar .nav-link[data-url$="${path}"]`) ||
        document.querySelector(`#mobileSidebar .nav-link[data-url$="${path}"]`);

    if (link) setActiveLink(link);
}


/* ===== ACTIVE SIDEBAR LINK ===== */
function setActiveLink(activeLink){
    document.querySelectorAll(".nav-link[data-url]")
    .forEach(link => link.classList.remove("active"));

    activeLink.classList.add("active")
}

/* ===== PAGE TITLE ===== */

window.updatePageTitle = function(title){
    const pageTitle = document.getElementById("pageTitle");
    const mobilePagetitle = document.getElementById("mobilePageTitle")

    if(pageTitle) pageTitle.textContent = title;
    if(mobilePagetitle) mobilePagetitle.textContent = title;
}

function normalizeKey(key){
    return key.toLowerCase().replace(/\s+/g,"").replace(/_/g,"");
}

function prettifyField(key) {
    return key
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/_/g, " ")
        .replace(/\b\w/g, c => c.toUpperCase());
}

/* ======= REQUIRED FIELD DETECTION ====== */

function getRequiredFieldsFromForm(container = document) {
    const requiredFields = [];

    container.querySelectorAll("label.required").forEach(label => {
        const field =
            label.nextElementSibling?.matches("input, textarea, select")
                ? label.nextElementSibling
                : label.parentElement.querySelector("input, textarea, select");

        if (!field) return;
        if (!field.name) return;

        requiredFields.push(
            normalizeKey(field.name)
        );
    });

    return [...new Set(requiredFields)];
}

/* ===== SIDEBAR TOGGLE (DESKTOP) ===== */
const sidebarToggle = document.getElementById("sidebarToggle");
const desktopSidebar = document.getElementById("desktopSidebar");

sidebarToggle.addEventListener("click", () => {

    // 1️⃣ Toggle sidebar itself
    desktopSidebar.classList.toggle("collapsed");

    // 2️⃣ Toggle layout state on body (VERY IMPORTANT)
    document.body.classList.toggle("sidebar-collapsed");

    // 3️⃣ Toggle arrow icon
    const icon = sidebarToggle.querySelector("i");
    icon.classList.toggle("bi-arrow-left");
    icon.classList.toggle("bi-arrow-right");
});

function initDashboardCharts(){
    const salesCanvas = document.getElementById("salesChart");
    if(salesCanvas){
        new Chart(salesCanvas , {
            type:"bar",
            data: {
                labels :  ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],
                datasets : [{
                    data : [12,18,14,20,16,22,19],
                    borderWidth : 1 ,
                    borderRadius : 6
                }]
            },
            options : {
                Plugins : { legend : {display : false}},
                scales : {
                    x : { grid : {display : false}},
                    y : { 
                        grid : {display : false} ,
                        beginAtZero : true
                    }
                }
            }
        });
    }
}


function saveImportedProducts(products){
    products.forEach(p => {
        console.log("Saving:" , p);
    });

    toastSuccess(`${products.length } products imported Successfully`);

    loadPage("products.html")
    updatePageTitle("products")
}


/* ========= BOOTSTRAP POPOVER  ========= */
function initPopovers(container = document){
    container.querySelectorAll('[data-bs-toggle="popover"]').forEach(el => {
        if(!bootstrap.Popover.getInstance(el)){
            new bootstrap.Popover(el);
        }
    });
}

document.addEventListener("click", (e) => {
    document
      .querySelectorAll('[data-bs-toggle="popover"]')
      .forEach(el => {
        const pop = bootstrap.Popover.getInstance(el);
        if (!pop) return;

        const popoverEl = document.querySelector(".popover");
        if (!el.contains(e.target) && !popoverEl?.contains(e.target)) {
            pop.hide();
        }
      });
});

/* ========= IMAGE UPLOADER (SPA SAFE) ========= */

let additionalImagePreviews = [];
const MAX_IMAGES = 5;

function initImageUploader() {
    console.log("Image uploader initialized ✅");

    mainImageFile = null;
    additionalImageFiles = [];

    // ❌ DO NOT RESET PREVIEWS IN EDIT MODE
    if (!isEditModeImages) {
        additionalImagePreviews = [];
    }

    renderThumbs();
}


/* ========= EVENT DELEGATION ========= */

document.addEventListener("click", (e) => {

    /* MAIN IMAGE CLICK */
    if (e.target.closest("#mainImageBox")) {
        const input = document.getElementById("mainImageInput");
        if (input) input.click();
    }

    /* ADDITIONAL IMAGE CLICK */
    if (e.target.closest(".add-thumb")) {
        const input = document.getElementById("additionalImageInput");
        if (input) input.click();
    }
});

/* ========= MAIN IMAGE CHANGE ========= */

document.addEventListener("change", (e) => {
    if (e.target.id !== "mainImageInput") return;

    const file = e.target.files[0];
    if (!file) return;

    mainImageFile = file;

    const reader = new FileReader();
    reader.onload = () => {
        const preview = document.getElementById("mainImagePreview");
        const box = document.getElementById("mainImageBox");

        preview.src = reader.result;
        preview.classList.remove("d-none");
        box.querySelector("i")?.classList.add("d-none");

        if(!box.querySelector(".image-delete")){
            const del = document.createElement("div");
            del.className = "image-delete";
            del.innerHTML = "&times;"
            del.onclick = removeMainImage;
            box.appendChild(del);
        }
    };
    reader.readAsDataURL(file);
});

function removeMainImage(e){
    e.stopPropagation();

    mainImageFile = null;
    existingMainImageUrl = null;

    const preview = document.getElementById("mainImagePreview");
    const box = document.getElementById("mainImageBox");

    preview.src = "";
    preview.classList.add("d-none");
    box.querySelector("i")?.classList.remove("d-none");
    box.querySelector(".image-delete")?.remove();

    document.getElementById("mainImageInput").value = "";
}


/* ========= ADDITIONAL IMAGE CHANGE ========= */

document.addEventListener("change", (e) => {
    if (e.target.id !== "additionalImageInput") return;

    const file = e.target.files[0];
    if (!file || additionalImagePreviews.length >= MAX_IMAGES) return;

    const reader = new FileReader();
    reader.onload = () => {
        additionalImagePreviews.push(reader.result);
        additionalImageFiles.push(file);
        renderThumbs();
    };
    reader.readAsDataURL(file);

    e.target.value = "";
});

/* ========= RENDER THUMBNAILS ========= */

function renderThumbs() {
    const container = document.getElementById("thumbContainer");
    if (!container) return;

    container.innerHTML = "";

    additionalImagePreviews.forEach((src, index) => {
        const div = document.createElement("div");
        div.className = "thumb";

        const img = document.createElement("img");
        img.src = src;

        img.onclick = () => {
            document.getElementById("mainImagePreview").src = src;
        };

        const del = document.createElement("div");
        del.className = "image-delete";
        del.innerHTML = "&times;";
        del.onclick = (e) => {
            e.stopPropagation();

            // 🔥 remove preview
            additionalImagePreviews.splice(index, 1);

            // 🔥 remove file ONLY if it is a newly added image
            if (additionalImageFiles[index]) {
                additionalImageFiles.splice(index, 1);
            }

            renderThumbs();
        };

        div.appendChild(img);
        div.appendChild(del);
        container.appendChild(div);
    });

    if (additionalImagePreviews.length < MAX_IMAGES) {
        const add = document.createElement("div");
        add.className = "thumb add-thumb";
        add.innerHTML = `<i class="bi bi-plus-lg"></i>`;
        container.appendChild(add);
    }
}


function removeAdditionalImages(index){
    additionalImagePreviews.splice(index , 1);
    additionalImageFiles.splice(index , 1);
    renderThumbs();
}

function preloadImagesForEdit(mainUrl, additionalUrls = []) {
    isEditModeImages = true;

    existingMainImageUrl = mainUrl;
    existingAdditionalImageUrls = [...additionalUrls];

    // MAIN IMAGE PREVIEW
    if (mainUrl) {
        const preview = document.getElementById("mainImagePreview");
        const box = document.getElementById("mainImageBox");

        preview.src = getImageUrl(mainUrl);
        preview.classList.remove("d-none");
        box.querySelector("i")?.classList.add("d-none");

        if (!box.querySelector(".image-delete")) {
            const del = document.createElement("div");
            del.className = "image-delete";
            del.innerHTML = "&times;";
            del.onclick = removeMainImage;
            box.appendChild(del);
        }
    }

    // ADDITIONAL IMAGES → PREVIEW ARRAY
    additionalImagePreviews = additionalUrls.map(u => getImageUrl(u));

    renderThumbs();
}

function buildBreadcrumbs(pageUrl) {
    const nav = document.getElementById("breadcrumbNav");
    if (!nav) return;

    const ol = nav.querySelector(".breadcrumb");
    if (!ol) return;

    const hash = location.hash.toLowerCase();

    /* ========= HIDE ON DASHBOARD ========= */
    if (!hash || hash === "#/dashboard") {
        nav.classList.add("d-none");
        return;
    }

    nav.classList.remove("d-none");
    ol.innerHTML = "";

    /* ========= HELPERS ========= */

    function addCrumb(label, hashUrl = null, active = false) {
        const li = document.createElement("li");
        li.className = "breadcrumb-item";

        if (active || !hashUrl) {
            li.classList.add("active");
            li.textContent = label;
        } else {
            const a = document.createElement("a");
            a.href = "#";
            a.textContent = label;
            a.onclick = e => {
                e.preventDefault();
                location.hash = hashUrl;
            };
            li.appendChild(a);
        }
        ol.appendChild(li);
    }

    function getProductId() {
        const query = location.hash.split("?")[1];
        if (!query) return null;
        const params = new URLSearchParams(query);
        return params.get("productId");
    }

    const productId = getProductId();

    /* ========= FLOW ========= */

    // 1️⃣ Dashboard (always)
    addCrumb("Dashboard", "#/dashboard");

    // 2️⃣ Products parent
    if (
        hash.startsWith("#/products") ||
        hash.startsWith("#/preview") ||
        hash.startsWith("#/manageproduct")
    ) {
        addCrumb("Products", "#/products");
    }

    // 3️⃣ Product Preview
    if (hash.startsWith("#/preview")) {
        addCrumb("Product Preview", null, true);
        return;
    }

    // 4️⃣ Manage Product (ADD / EDIT)
    if (hash.startsWith("#/manageproduct")) {

        // EDIT MODE
        if (productId) {
            addCrumb(
                "Product Preview",
                `#/preview?productId=${productId}`
            );
            addCrumb("Edit Product", null, true);
            return;
        }

        // ADD MODE
        addCrumb("Add Product", null, true);
        return;
    }

    // 5️⃣ Orders
    if (hash.startsWith("#/orders")) {
        addCrumb("Orders", null, true);
        return;
    }
}

/* ================= GLOBAL SEARCH ================= */


const searchInput = document.getElementById("globalSearchInput");

if (searchInput) {
    let searchTimeout;

    searchInput.addEventListener("keyup", (e) => {
        const query = e.target.value.trim();

        if (e.key === "Enter") {
            triggerGlobalSearch(query);
            return;
        }

        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            if (query.length >= 3) {
                triggerGlobalSearch(query);
            }
        }, 400);
    });
}

let lastQuery = "";

async function triggerGlobalSearch(query) {
    if (!query || query === lastQuery) return;
    lastQuery = query;
      const auth = getAuthOrRedirect();
  if (!auth) return;

  const { sellerId, userId } = auth;

    try {
        const res = await fetch(
            `${API_BASE}/api/Search/seller?q=${encodeURIComponent(query)}&type=dashboard`,
            {
                headers: {
                    "X-Seller-Id": sellerId,
                    "X-User-Id": userId
                }
            }
        );

        if (!res.ok) throw new Error("Search failed");

        const json = await res.json();
        const data = json.data || {};

        const products = data.products || [];
        const orders   = data.orders || [];

        // 🔀 DASHBOARD SEARCH REDIRECTION LOGIC

        // 1️⃣ Only orders found → Orders page
        if (orders.length > 0 && products.length === 0) {
            location.hash = `#/orders?search=${encodeURIComponent(query)}`;
            return;
        }

        // 2️⃣ Only products/categories found → Products page
        if (products.length > 0 && orders.length === 0) {
            location.hash = `#/products?search=${encodeURIComponent(query)}`;
            return;
        }

        // 3️⃣ Both found → Orders page (priority)
        if (orders.length > 0 && products.length > 0) {
            location.hash = `#/orders?search=${encodeURIComponent(query)}`;
            return;
        }

        // 4️⃣ Nothing found
        toastWarning("No results found");

    } catch (err) {
        console.error("Global search error:", err);
    }
}

const clearSearchBtn = document.getElementById("clearSearchBtn");

/* SHOW / HIDE ❌ */
if (searchInput && clearSearchBtn) {
    searchInput.addEventListener("input", () => {
        if (searchInput.value.trim()) {
            clearSearchBtn.classList.remove("d-none");
        } else {
            clearSearchBtn.classList.add("d-none");
        }
    });

    clearSearchBtn.addEventListener("click", clearGlobalSearch);
}

function clearGlobalSearch() {
    if (!searchInput) return;

    // clear input & state
    searchInput.value = "";
    lastQuery = "";

    clearSearchBtn?.classList.add("d-none");

    // remove ?search= from URL
    const route = location.hash.split("?")[0];
    location.hash = route;

    // reset tables based on page
    if (route.startsWith("#/products")) {
        renderProductTable?.(allProducts);
        productCount?.(allProducts.length);
    }

    if (route.startsWith("#/orders")) {
        filteredOrders = [...orders];
        renderFilteredOrders?.();
    }

    if (route === "#/dashboard") {
        loadSellerProducts?.();
        loadsellerOrders?.({ forDashboard: true });
    }
}


document.addEventListener("click", (e) => {
  const logoutBtn = e.target.closest("#logoutBtn");
  if (!logoutBtn) return;

  e.preventDefault();

  toastInfo("Logging out...");

  setTimeout(() => {
      sellerLogout();
  }, 900);
});




/* ================= ADVANCED GLOBAL TOAST ================= */

function createToast(message, type = "success", delay = 1000) {
    const stack = document.getElementById("toastStack");
    if (!stack) return;

    const icons = {
        success: "bi-check-circle-fill",
        error: "bi-x-circle-fill",
        warning: "bi-exclamation-triangle-fill",
        info: "bi-info-circle-fill"
    };

    const colors = {
        success: "text-bg-success",
        error: "text-bg-danger",
        warning: "text-bg-warning",
        info: "text-bg-primary"
    };

    const toastEl = document.createElement("div");
    toastEl.className = `toast align-items-center ${colors[type]} border-0 mb-2`;
    toastEl.role = "alert";

    toastEl.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                <i class="bi ${icons[type]} me-2"></i>
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;

    stack.appendChild(toastEl);

    const toast = new bootstrap.Toast(toastEl, { delay });

    toast.show();

    toastEl.addEventListener("hidden.bs.toast", () => toastEl.remove());
}

/* SIMPLE HELPERS */

window.toastSuccess = msg => createToast(msg, "success");
window.toastError   = msg => createToast(msg, "error", 4000);
window.toastWarning = msg => createToast(msg, "warning");
window.toastInfo    = msg => createToast(msg, "info");

