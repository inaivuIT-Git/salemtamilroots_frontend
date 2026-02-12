// import { API_BASE_URL } from "./config.js";
window.initSellerProductPreview = function(productId) {
    const auth = window.getAuthOrRedirect();
    if (!auth) return;

    console.log("🔥 initSellerProductPreview:", productId);

    if (!productId) {
        console.warn("No productId passed to preview");
        return;
    }

    // ✅ store for edit navigation
    window.currentPreviewProductId = productId;

    loadProductDetails(productId);
}

async function loadProductDetails(productId) {
    toastInfo("Loading product details...");

    const auth = getAuth();
    if (!auth) return;

    const sellerId = sessionStorage.getItem("sellerId");
    if (!sellerId) {
        toastError("Seller ID missing");
        return;
    }
    try {
        const res = await fetch(
            `${API_BASE_URL}/api/Product/seller/details/by-id/${productId}`,
            {
                method: "GET",
                headers: {
                    "X-Seller-Id": sellerId
                }
            });

        if (!res.ok) {
            toastError("Failed to fetch product");
            return;
        }

        const json = await res.json();
        if (!json.isSuccess) {
            toastError(json?.message || "Failed to load product");
            return;
        }

        const p = json.data;
        const v = p.variants?.[0];

        document.getElementById("productName").textContent = p.displayName;
        document.getElementById("productPrice").textContent = v?.finalPrice ?? 0;
        document.getElementById("productStatus").textContent = v?.isActive ? "Active" : "Inactive";

        //document.getElementById("detailProductId").textContent = p.productId;
        document.getElementById("detailCategory").textContent = p.categoryName;
        document.getElementById("detailProductName").textContent = p.displayName;
        document.getElementById("detailShortDesc").textContent = p.shortDescription || "-";
        document.getElementById("detailDescription").textContent = p.description || "-";

        document.getElementById("detailBasePrice").textContent = `₹${v?.basePrice ?? 0}`;
        document.getElementById("detailmrp").textContent = `₹${v?.mrp ?? 0}`;
        document.getElementById("detailsellingPrice").textContent = `₹${v?.finalPrice ?? 0}`;
        document.getElementById("detailStock").textContent = v?.availableQuantity ?? 0;
        document.getElementById("detailQuantity").textContent = v?.weight ?? 0;
        document.getElementById("detailUnit").textContent = v?.unit ?? "-";

        document.getElementById("detaildistype").textContent =
            v?.discountType ?? "No Discount";

        document.getElementById("detaildiscValue").textContent =
            v?.discountValue > 0 ? v.discountValue : "-";

        renderProductImages(p);
        renderPriceHistory(p.priceHistory);
        renderDiscountHistory(p.discountHistory);

    } catch (err) {
        console.error("Preview load error", err);
        toastError("Unable to load product preview");
    }
}



function renderProductImages(product) {
    const mainImg = document.getElementById("PreviewMainImage");
    const thumbStrip = document.getElementById("PreviewThumbContainer");

    if (!mainImg || !thumbStrip) return;

    thumbStrip.innerHTML = "";

    const FALLBACK_IMG = getImageUrl(null);

    /* ========= HELPERS ========= */

    function setMainImage(src) {    
        mainImg.src = src ? getImageUrl(src) : FALLBACK_IMG;
    }


    function createThumb(imgUrl, isActive = false) {
        const t = document.createElement("div");
        t.className = "preview-thumb" + (isActive ? " active" : "");

        const img = document.createElement("img");
        img.src = getImageUrl(imgUrl);

        // Fallback if image fails
        img.onerror = () => {
            img.src = FALLBACK_IMG;
        };

        t.appendChild(img);

        t.onclick = () => {
            document
                .querySelectorAll("#PreviewThumbContainer .preview-thumb")
                .forEach(x => x.classList.remove("active"));

            t.classList.add("active");
            setMainImage(img.src);
        };

        thumbStrip.appendChild(t);
    }

    /* ========= MAIN IMAGE ========= */

    if (product?.imageUrl?.trim()) {
        setMainImage(product.imageUrl);
        createThumb(product.imageUrl, true);
    } else {
        setMainImage(null);
    }

    /* ========= ADDITIONAL IMAGES ========= */

    if (Array.isArray(product?.additionalImages)) {
        product.additionalImages
            .filter(img => img && img.trim() !== "")
            .forEach(img => createThumb(img, false));
    }

    /* ========= NO IMAGES AT ALL ========= */

    if (!thumbStrip.children.length) {
        createThumb(null, true);
    }
}


function renderPriceHistory(list) {
    const box = document.getElementById("priceHistoryBox");

    if (!list || list.length === 0) {
        box.innerHTML = `<p class="text-muted">No price history for this product</p>`;
        return;
    }

    const now = new Date();

    const future = [];
    const present = [];
    const past = [];

    list.forEach(p => {
        const from = new Date(p.effectiveFrom);
        const to = p.effectiveTo ? new Date(p.effectiveTo) : null;

        if (from > now) {
            future.push(p);
        } else if (from <= now && (!to || now <= to)) {
            present.push(p);
        } else {
            past.push(p);
        }
    });

    // Sort groups
    future.sort((a, b) => new Date(a.effectiveFrom) - new Date(b.effectiveFrom));
    present.sort((a, b) => new Date(a.effectiveFrom) - new Date(b.effectiveFrom));
    past.sort((a, b) => new Date(b.effectiveFrom) - new Date(a.effectiveFrom));

    const ordered = [...future, ...present, ...past];

    box.innerHTML = ordered.map(p => {
        const from = new Date(p.effectiveFrom);
        const to = p.effectiveTo ? new Date(p.effectiveTo) : null;

        const isActive = from <= now && (!to || now <= to);

        return `
        <div class="border-bottom py-2 d-flex justify-content-between align-items-center">
            <div>
                Base ₹${p.basePrice} → MRP ₹${p.mrp}
                <br>
                <small class="text-muted">
                    ${formatDateDDMMYYYY(p.effectiveFrom)}
                    →
                    ${p.effectiveTo ? formatDateDDMMYYYY(p.effectiveTo) : "Present"}
                </small>
            </div>

            ${isActive
                ? `<span class="badge bg-success">Active</span>`
                : ""
            }
        </div>
        `;
    }).join("");
}



function renderDiscountHistory(list) {
    const box = document.getElementById("discountHistoryBox");

    if (!list || list.length === 0) {
        box.innerHTML = `<p class="text-muted">No discount history for this product</p>`;
        return;
    }

    const now = new Date();

    const future = [];
    const present = [];
    const past = [];

    list.forEach(d => {
        const from = new Date(d.offerStartDate);
        const to = new Date(d.offerEndDate);

        if (from > now) {
            future.push(d);
        } else if (from <= now && now <= to) {
            present.push(d);
        } else {
            past.push(d);
        }
    });

    future.sort((a, b) => new Date(a.offerStartDate) - new Date(b.offerStartDate));
    present.sort((a, b) => new Date(a.offerStartDate) - new Date(b.offerStartDate));
    past.sort((a, b) => new Date(b.offerStartDate) - new Date(a.offerStartDate));

    const ordered = [...future, ...present, ...past];

    box.innerHTML = ordered.map(d => {
        const from = new Date(d.offerStartDate);
        const to = new Date(d.offerEndDate);

        const isActive = from <= now && now <= to;

        return `
        <div class="border-bottom py-2 d-flex justify-content-between align-items-center">
            <div>
                ${d.discountType} - ${d.discountValue}
                <br>
                <small class="text-muted">
                    ${formatDateDDMMYYYY(d.offerStartDate)}
                    →
                    ${formatDateDDMMYYYY(d.offerEndDate)}
                </small>
            </div>

            ${isActive
                ? `<span class="badge bg-success">Active</span>`
                : ""
            }
        </div>
        `;
    }).join("");
}




document.addEventListener("click", (e) => {
    const btn = e.target.closest("#editProductBtn");
    if (!btn) return;

    if (!window.currentPreviewProductId) {
        toastError("Product ID not found");
        return;
    }
    toastInfo("Opening product editor...");

    // 🔁 Navigate to Add Product page in EDIT MODE
    location.hash = `#/manageProduct?productId=${window.currentPreviewProductId}`;
    updatePageTitle("Products / Update Product");
});

function formatDateDDMMYYYY(dateStr) {
    if (!dateStr) return "-";

    const d = new Date(dateStr);
    if (isNaN(d)) return "-";

    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();

    return `${dd}-${mm}-${yyyy}`;
}
