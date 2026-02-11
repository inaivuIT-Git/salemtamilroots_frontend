
document.addEventListener("DOMContentLoaded", async () => {

    const wishlistContainer = document.getElementById("wishlistContainer");
    const paginationContainer = document.getElementById("paginationContainer");

    let wishlistProducts = [];
    let currentPage = 1;
    const productsPerPage = 40;

    const userId = Number(sessionStorage.getItem("userId"));
    if (!userId) {
        wishlistContainer.innerHTML =
            `<p class="text-danger text-center">Please login to view your wishlist ❤️</p>`;
        return;
    }   

    /* ================= CART STATE ================= */
    let cartProductIds = new Set();

    async function fetchCartProducts() {
        try {
            const response = await fetch(
                `${API_BASE_URL}/api/cart/${userId}`,
                { method: "GET" }
            );

            const result = await response.json();
            const items = result?.data?.items || [];

            cartProductIds.clear();
            items.forEach(i => cartProductIds.add(i.productId));

        } catch (err) {
            console.error("Cart fetch failed", err);
        }
    }

    /* ================= FETCH WISHLIST ================= */
    async function fetchWishlist() {
        wishlistContainer.innerHTML = `<p>Wishlist Loading...</p>`;
        paginationContainer.innerHTML = "";

        try {
            const response = await fetch(
                `${API_BASE_URL}/api/WishList/get-by-user`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userId })
                }
            );

            const result = await response.json();

            if (!result.isSuccess) {
                if (result.statusCode === 404) {
                    showEmptyWishlist();
                    return;
                }

                wishlistContainer.innerHTML =
                    `<p class="text-danger">${result.error?.message || "Something went wrong"}</p>`;
                return;
            }

            wishlistProducts = result.data || [];
            if (wishlistProducts.length === 0) {
                showEmptyWishlist();
                return;
            }

            renderWishlist();
            renderPages();

        } catch (error) {
            console.error("Wishlist error", error);
            wishlistContainer.innerHTML =
                `<p class="text-danger">Something went wrong</p>`;
        }
    }

    /* ================= RENDER ================= */
    function renderWishlist() {
        const start = (currentPage - 1) * productsPerPage;
        const end = start + productsPerPage;
        const paginated = wishlistProducts.slice(start, end);

        wishlistContainer.innerHTML = paginated.map(item => {
            const product = item.product;
            const stock = getStocks(product);
            const inCart = cartProductIds.has(product.productId);
            let productImage = item.imageUrl ? getImageUrl(item.imageUrl) : noImage;

            return `
            <div class="col-6 col-sm-6 col-lg-3 product-item">
                <div class="card p-3 h-100 position-relative">

                    <button class="btn position-absolute top-0 end-0 m-2 wishlist-icon"
                        onclick="removeFromWishlist(${product.productId})">
                        <i class="bi bi-heart-fill text-danger fs-3"></i>
                    </button>

                    <a href="/FrontEnd/product_details.html?name=${encodeURIComponent(product.displayName)}">
                        <img src="${productImage}"
                             class="wishlist-img mb-2"
                             alt="${product.productName}">
                    </a>

                    <h6 class="text-truncate product-name">${product.productName}</h6>

                    <div class="price mb-2">
                        ${product.discountApplied
                            ? `<span class="fw-bold me-2">₹${product.finalPrice}</span>
                               <span class="text-danger text-decoration-line-through">₹${product.mrp}</span>`
                            : `<span class="fw-bold">₹${product.mrp}</span>`
                        }
                    </div>

                    ${
                        stock.status === "out"
                            ? `<button class="btn" disabled>Unavailable</button>`
                            : inCart
                                ? `<button class="btn text-white go-to-cart-btn">
                                        Go to Cart
                                   </button>`
                                : `<button class="btn text-white add-to-cart-btn"
                                        data-id="${product.productId}">
                                        Add to Cart
                                   </button>`
                    }
                </div>
            </div>`;
        }).join("");
    }

    /* ================= PAGINATION ================= */
    function renderPages() {
        const totalPages = Math.ceil(wishlistProducts.length / productsPerPage);
        paginationContainer.innerHTML = "";

        for (let i = 1; i <= totalPages; i++) {
            paginationContainer.innerHTML += `
                <li class="page-item ${i === currentPage ? "active" : ""}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>`;
        }

        document.querySelectorAll(".page-link").forEach(link => {
            link.addEventListener("click", e => {
                e.preventDefault();
                currentPage = Number(link.dataset.page);
                renderWishlist();
                renderPages();
            });
        });
    }

    /* ================= EMPTY ================= */
    function showEmptyWishlist() {
    wishlistContainer.innerHTML = `
        <div class="text-center ">
            <img src="/FrontEnd/assets/Images/wishlist-empty.png" alt="Empty Wishlist" style="max-width:380px;"/>

            <h3>Your wishlist is empty </h3>
            <p class="mb-4 text-muted">Add your favorite items to your wishlist !</p>
            <a href="/FrontEnd/index.html" class="btn btn-success mt-2">Continue shopping</a> 

        </div>
    `;

    paginationContainer.innerHTML = "";
}

    /* ================= REMOVE ================= */
    window.removeFromWishlist = async function (productId) {
        try {
            const response = await fetch(
                `${API_BASE_URL}/api/WishList/remove`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userId, productId })
                }
            );

            const result = await response.json();
            if (!result.isSuccess) return;

            wishlistProducts = wishlistProducts.filter(
                x => x.product.productId !== productId
            );

            wishlistProducts.length === 0
                ? showEmptyWishlist()
                : renderWishlist();

        } catch {
            alert("Remove failed");
        }
    };

    /* ================= ADD TO CART ================= */
    document.addEventListener("click", async e => {
        if (!e.target.classList.contains("add-to-cart-btn")) return;

        const btn = e.target;
        const productId = Number(btn.dataset.id);

        btn.disabled = true;

        try {
            const response = await fetch(
                "https://localhost:44366/api/cart/add",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userId, productId, quantity: 1 })
                }
            );

            const result = await response.json();
            if (!result.success && !result.isSuccess) {
                btn.disabled = false;
                return;
            }

            cartProductIds.add(productId);
            btn.innerText = "Go to Cart";
            btn.classList.remove("add-to-cart-btn");
            btn.classList.add("go-to-cart-btn");
            btn.disabled = false;

        } catch {
            btn.disabled = false;
            alert("Cart error");
        }
    });

    /* ================= GO TO CART ================= */
    document.addEventListener("click", e => {
        if (!e.target.classList.contains("go-to-cart-btn")) return;
        window.location.href = "/FrontEnd/viewcart.html";
    });

    /* ================= STOCK ================= */
    function getStocks(product) {
        if (product.availableQuantity < 1) return { status: "out" };
        if (product.availableQuantity <= product.minimumStockLevel) return { status: "few" };
        return { status: "ok" };
    }

    /* ================= INIT ================= */
    await fetchCartProducts();
    fetchWishlist();
});