import { callApi } from "./callApi.js";
import{ showToast } from "./toast.js";
//mport { API_BASE_URL } from "./config.js";

const noImage = 'assets/Images/NoProductImage.png';
const userId = sessionStorage.getItem("userId") || null;
/************ BANNER CAROUSEL ************/
document.addEventListener("DOMContentLoaded", () => {


    const images = document.querySelectorAll(".banner img");
    const rightBtn = document.getElementById("banner__rightbtn");
    const leftBtn = document.getElementById("banner__leftbtn");
    const carousel = document.querySelector(".banner");
    const control = document.getElementById("control");



    if (images.length && rightBtn && leftBtn && carousel && control) {
        let index = 0;
        const intervalTime = 3000;

        const nextSlide = () => {
            images[index].classList.remove("active");
            index = (index + 1) % images.length;
            images[index].classList.add("active");
        };

        const prevSlide = () => {
            images[index].classList.remove("active");
            index = (images.length + index - 1) % images.length;
            images[index].classList.add("active");
        };

        rightBtn.addEventListener("click", nextSlide);
        leftBtn.addEventListener("click", prevSlide);

        let autoSlide = setInterval(nextSlide, intervalTime);

        carousel.addEventListener("mouseenter", () => {
            clearInterval(autoSlide);
            control.classList.remove("d-none");
        });

        carousel.addEventListener("mouseleave", () => {

            autoSlide = setInterval(nextSlide, intervalTime);
            control.classList.add("d-none");
        });
    }

    loadProducts();
    loadCategories();
    loadNewProducts();
});


// Most loved products script

const ProductsGetUrl = `${API_BASE_URL}/api/Product`;
const ProductRow = document.getElementById("productRow");

async function loadProducts() {
    try {
        // const response = await fetch(ProductsGetUrl);
        // const result = await response.json();
        const result = await callApi(ProductsGetUrl, {}, "GET")
        console.log("Product API result:", result);     
        const products = result.data;
        ProductRow.innerHTML = "";
        console.log("products", products);
        products.forEach((item, index) => {
            if (index >= 4) return;

            

           const basePrice = item.mrp;
           const finalPrice =item.finalPrice;
           let discountText = "";

        const discountPerc = Math.round(100 - (finalPrice / basePrice) * 100);;
        discountText = `${discountPerc}% Offer`;
            

            let productImages = item.imageUrl ? getImageUrl(item.imageUrl) : noImage;


            const cardHtml = `<div class="col-6 col-md-3">
                                <div class="loved-products__card"
                                    data-link="product_details.html?name=${encodeURIComponent(item.displayName)}">

                                    <div class="product-image-wrapper">
                                        <img src="${productImages}" class="product-image img-fluid">
                                    </div>

                                    <div class="p-2 pb-0">
                                        <p class="product-name fs-5 text-truncate">${item.displayName}</p>
                                        <p class="text-truncate text-muted fs-6">${item.shortDescription}</p>
                                    </div>

                                    <div class="d-flex align-items-center p-2">
                                    ${item.discountApplied ?`<p class="fw-bold me-2 fs-5">₹${finalPrice}</p>
                                        <p class="text-muted me-4 fs-6"><s>₹${basePrice}</s></p>
                                        <p class="text-danger fw-bold fs-6">${discountText}</p>` : `<p class="fw-bold me-2 fs-5">₹${basePrice}</p>`

                                    }
                                        
                                    </div>

                                    <div class="text-center pb-3">
                                        <button class="btn cart add-to-cart-btn"
                                                data-product-id="${item.productId}">
                                            Add to cart
                                        </button>
                                    </div>

                                </div>
                            </div>

            `;

            ProductRow.innerHTML += cardHtml;
        })
    }

    catch (err) {
        console.error("Error fetching products:", err);
        ProductRow.innerHTML = `<p class="text-danger text-center">Failed to load products.</p>`;
    }


}

document.addEventListener("click", async function (e) {

    /* =========================
       ADD TO CART CLICK
    ========================== */
    const cartBtn = e.target.closest(".add-to-cart-btn");
    if (cartBtn) {
        e.preventDefault();
        e.stopPropagation();
        if (!userId) {
        const returnUrl = encodeURIComponent(window.location.href);
        window.location.href = `signin.html?returnUrl=${returnUrl}`;
        return false;
    }
        const productId = cartBtn.dataset.productId;

        // Already added → go to cart
        if (cartBtn.dataset.added === "true") {
            window.location.href = "viewcart.html";
            return;
        }

        const result = await addProductInCart(productId);
        if (!result) return;

        showToast("Item added to cart", "success");

        cartBtn.innerHTML = `<i class="bi bi-cart-check me-2"></i> Go to Cart`;
        cartBtn.dataset.added = "true";
        cartBtn.classList.add("btn-success");
        cartBtn.style.border = "none";

        console.log("Added product ID:", productId);
        return; // ⛔ stop here
    }

    /* =========================
       CARD CLICK → DETAILS PAGE
    ========================== */
    const card = e.target.closest(".loved-products__card");
    if (card && card.dataset.link) {
        window.location.href = card.dataset.link;
    }
});


// PRODUCT ADDING TO CART FUNCTION
async function addProductInCart(productId) {
    try {
        const payload = {
            userId,
            productId,
            quantity: 1
        };
        console.log("Payload:", payload);   
        const response = await callApi(
            `${API_BASE_URL}/api/cart/add`,
            payload,
            "POST"
        );

        return response?.success === true;
    } catch (error) {
        console.error("Add to cart error:", error);
        showToast("Unable to add to cart");
        return false;
    }
}



// Categories Rendering
// --------------------//
const categoryFetchUrl = `${API_BASE_URL}/api/Category`;
const CategoriesRow = document.getElementById("CategoryRow");

async function loadCategories() {
    try {
        const response = await fetch(categoryFetchUrl);
        const data = await response.json();
        console.log("cvc",data);

        CategoriesRow.innerHTML = "";
        data.data.forEach((item, index) => {
            if (index >= 6) return;
            const categoryHtml = `
           
            <div class="col-6 col-md-2 text-center category__card">
            <a href="products_listing.html?id=${item.categoryId}">
                    <img src="assets/Images/Index/category/${item.categoryName}.png" alt="${item.categoryName}" width="100px" height="100px"
                        style="border-radius: 50%;">
                    <h5 class="mt-2">${item.categoryName}</h5>
                    </a>
                </div>
            `
            CategoriesRow.innerHTML += categoryHtml;
        })

    }
    catch (error) {
        console.log(error);
        CategoriesRow.innerHTML = `<p class="text-danger text-center">Failed to load category.</p>`;
    }
}


//--------//
//NEW PRODUCTS
//---------//
const NewProductsRow = document.getElementById("newProductsRow");

async function loadNewProducts() {
    try {
        const newProductsUrl = `${API_BASE_URL}/api/Product/new-products`;
        const response = await callApi(newProductsUrl, {}, "GET");
        console.log("New Products API result:", response);

        const products = response.data;

        console.log("df",products);
        NewProductsRow.innerHTML = "";
        products.forEach((item, index) => {
            const image = item.imageUrl ? getImageUrl(item.imageUrl) : noImage;
            const newProductHtml = `<div class="col-6 col-md-3 px-lg-4 p-2">
                    <div class="new-products__card">

                        <div class="product-image-wrapper">
                            <img src="${image}"
                                alt="${item.productName}"
                                class="product-image img-fluid">
                        </div>

                        <div class="p-2 mb-2 text-center">
                            <p class="product-name fs-5 text-truncate">${item.productName}</p>
                            <p class="text-truncate text-muted fs-6">${item.description}</p>

                            <a href="product_details.html?name=${encodeURIComponent(item.displayName)}"
                            class="btn mt-2"
                            id="viewBtn">View</a>
                        </div>

</div>
                </div>`
            NewProductsRow.innerHTML += newProductHtml;
        });
    }
    catch (error) {
        console.log(error);
        NewProductsRow.innerHTML = `<p class="text-danger text-center">Failed to load new products.</p>`;
    }
}