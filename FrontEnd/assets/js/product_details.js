import { callApi } from "./callApi.js";
import { showToast } from "./toast.js";
const urlParam = new URLSearchParams(window.location.search)
const userId = sessionStorage.getItem("userId");
const displayname = urlParam.get("name");



const noImage = 'assets/Images/NoProductImage.png';
let selectedVariantId = null;
const API_BASE = API_BASE_URL;

async function load() {

    const productName = displayname;
    const productUrl = `${API_BASE_URL}/api/Product/details/by-name/${encodeURIComponent(productName)}`;
    const response =await callApi(productUrl,{},"GET");
    console.log("detail",response);
    const productDetail = response.data;


    
    // image section (Main image)
    const mainSection = document.getElementById("mainImage");
    // console.log(data.images[0])
    const mainImageHtml = `${productDetail.imageUrl ? `<img src="${API_BASE_URL}${productDetail.imageUrl}" alt="Vita Roots" class="img-fluid" id="product-details__mainImage">` : `<img src="${noImage}" alt="No Image" class="img-fluid" id="product-details__mainImage">`}`   ;
    mainSection.innerHTML += mainImageHtml;

    // Side Images
    const sideImage = document.getElementById("sideImage");
    let sideImageHtml = "";

    const imagesUrls = [
        productDetail.imageUrl,
        ...(productDetail.additionalImages || [])
    ];

    imagesUrls.slice(0, 6).forEach(imgUrl => {
        sideImageHtml += `${imgUrl ? 
            `<img src="${API_BASE}${imgUrl}" alt="Product image" width="50" height="50" class="img-fluid rounded">` 
            : `<img src="${noImage}" alt="No Image" width="60" height="70" class="img-fluid rounded">`}`;
    });
    
    sideImage.innerHTML += sideImageHtml;

    // Interactive design for images
    let mainImage = document.getElementById("product-details__mainImage");
    const thumbnail = document.querySelector(".product-details__thumbnail");
    let thumbnails = document.querySelectorAll(".product-details__thumbnail img");

    thumbnails[0]?.classList.add("active");

    thumbnail.addEventListener("mouseover", (e) => {
        if (e.target.tagName === "IMG") {
            thumbnails.forEach(img => img.classList.remove("active"));
            e.target.classList.add("active");
            mainImage.src = e.target.src;
        }
    });


    // product name and description

    //console.log(productDetail)
    document.getElementById("productName").textContent = productDetail.displayName;
    document.getElementById("description").textContent = productDetail.shortDescription;

    //Ratings Star
    const starRating = document.getElementById("ratingStar");
    //let starRatingHtml = ratingGenerater(data.rating);
    //starRating.innerHTML += starRatingHtml;

    // Rating and Reviews

    //document.getElementById("ratingReviews").textContent = `Ratings & ${data.reviewsCount} Reviews`;
    //console.log(Math.round((data.price/data.originalPrice)*100));
    //price

    document.getElementById("price").textContent = `$${productDetail.variants[0].mrp}`;
    document.getElementById("mrp").textContent = `$${productDetail.variants[0].finalPrice}`;
    document.getElementById("discount").textContent = `${100 - Math.round((productDetail.variants[0].finalPrice / productDetail.variants[0].mrp) * 100)}% Offer`;

    // SIZE BUTTONS AND FUNCTIONS

    const sizeContainer = document.getElementById("sizeContainer");
    const priceEl = document.getElementById("price");
    const mrpEl = document.getElementById("mrp");
    const discountEl = document.getElementById("discount");
    sizeContainer.innerHTML = "";

    productDetail.variants.forEach((variant, index) => {
        const btn = document.createElement("button");

        btn.className = "btn product-details__sizebtn px-3 me-2 mb-2";
        btn.textContent = `${variant.weight}${variant.unit.toLowerCase()}`;

        // Default active first button
        if (index === 0) {
            btn.classList.add("active");
            selectedVariantId = variant.productId;
            updatePrice(variant);

            checkDetailWishlist(selectedVariantId);
        }

        btn.addEventListener("click", () => {
            // Remove active class from all buttons
            document
                .querySelectorAll(".product-details__sizebtn")
                .forEach(b => b.classList.remove("active"));

            // Add active class to clicked button
            btn.classList.add("active");

            // Store selected variant id
            selectedVariantId = variant.productId;
            // Update price
            updatePrice(variant);

            checkDetailWishlist(selectedVariantId);
        });

        sizeContainer.appendChild(btn);
    });

    function updatePrice(variant) {
        var diff = variant.mrp - variant.finalPrice;
        mrpEl.textContent = `${diff > 0 ? variant.mrp : ''}`;
        priceEl.textContent = `₹ ${variant.finalPrice}`;
        discountEl.textContent = `${diff > 0 ? Math.round((diff / variant.mrp) * 100) + '% Offer' : ''}`;
        console.log("productId ", selectedVariantId)
    }


    //details page
    document.getElementById("name").textContent = productDetail.displayName;
    document.getElementById("descrip").textContent = productDetail.description;
    // //seller Info

    document.getElementById("sellerName").textContent = productDetail.sellerName;
    document.getElementById("sellerPhone").textContent = productDetail.phone;
    document.getElementById("sellerEmail").textContent = productDetail.email;
    document.getElementById("location").textContent = productDetail.location ? productDetail.location : "Not Available";
    document.getElementById("aboutSeller").textContent = productDetail.about;

    getStocks(productDetail);
    // reviews and ratings
    const reviewCard = document.getElementById("reviewCard");
    let reviewCardHtml = "";
    data.reviews.forEach(review => {
        reviewCardHtml += `<div class="d-flex align-items-center">
                                <div>
                                    <img src="assets/Images/productDetails/profileImage.jpg"
                                        alt="tharunkumar profile image" width="45px" height="45px" class="img-fluid" style="border-radius:50%">

                                </div>
                                <div>
                                    <p class="fs-5 ms-3" id="reviewerName">${review.userName}</p>
                                    <p class="ms-3 text-warning" id="reviewerRating">${ratingGenerater(review.rating)}
                                    </p>
                                </div>

                            </div>
                            <div class="mt-2">
                                <p id="reviewerComment">${review.comment}</p>
                                <p class="text-muted mt-1" id="reviewerPost">${formatDate(review.createdAt)}</p>
                            </div>
                            <hr>
`
    })
    reviewCard.innerHTML += reviewCardHtml;
}

function ratingGenerater(rating) {
    let starRatingHtml = "";
    for (let star = 1; star <= 5; star++) {
        if (star <= rating)
            starRatingHtml += `<i class="bi bi-star-fill"></i>  `;
        else if (rating % 1 == "0.5")
            starRatingHtml += `<i class="bi bi-star-half"></i>  `;

        else
            starRatingHtml += `<i class="bi bi-star"></i>  `;
    }
    return starRatingHtml;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    console.log(`date:${date}`)
    const options = { day: "2-digit", month: "short", year: "numeric" };
    return date.toLocaleDateString("en-GB", options);
}


// ⭐ stock

function getStocks(productDetail) {
    if (productDetail.availableQuantity < 1) {
        document.getElementById("stockAlert").innerHTML = `
            <div class="alert alert-danger fw-bold text-center py-3"><i class="bi bi-exclamation-octagon-fill"> ${productDetail.stockStatus} !</i> </div>`;

        const cartBtn = document.querySelector(".product-details__cartBtn");
        const buyBtn = document.querySelector(".product-details__buyBtn");

        if (cartBtn) cartBtn.classList.add("d-none");
        if (buyBtn) buyBtn.classList.add("d-none");

        const buttonContainer = document.querySelector("#leftSection .d-flex");

        if (buttonContainer) {
            buttonContainer.innerHTML = `
                <div class="w-100 text-center mt-3">
                   <p class="fw-bold text-danger mb-2">This product is currently unavailable .</p>
                   <button class="btn btn-outline-danger fw-semibol px-4 py-2" id="remindBtn">Remind Me</button>
                </div>`;
        }

        return { staus: "out" };
    }
    if (productDetail.availableQuantity <= productDetail.minimumStockLevel) {
        document.getElementById("stockAlert").innerHTML = `
            <div class="alert alert-primary fw-bold text-center py-2">
                <i class="bi bi-info-circle-fill"> ${productDetail.stockStatus}</i> 
                
            </div>
        `;
        return { status: "few" };
    }
    return { status: "ok" };
}


document.addEventListener("DOMContentLoaded", load());

//Common helper for Add to cart
async function handleAddToCart({ redirectToCart = false, updateButton = false } = {}) {
    if (!selectedVariantId) {
        showToast("Please select a size");
        return false;
    }

    if (!userId) {
        const returnUrl = encodeURIComponent(window.location.href);
        window.location.href = `signin.html?returnUrl=${returnUrl}`;
        return false;
    }

    const isAdded = await addProductInCart();

    if (!isAdded) {
        showToast("Failed to add item to cart", "error");
        return false;
    }

    showToast("Item added to cart", "success");

    if (updateButton) {
        updateCartButtonUI();
    }

    if (redirectToCart) {
        setTimeout(() => {
            window.location.href = "viewcart.html";
        }, 400);
    }

    return true;
}

//UI helper
function updateCartButtonUI() {
    const cartBtn = document.getElementById("addToCartBtn");

    cartBtn.innerHTML = `<i class="bi bi-cart-check me-2"></i> Go to Cart`;
    cartBtn.dataset.added = "true";
    cartBtn.classList.add("btn-success");
    cartBtn.style.border = "none";
}

//Api caller For buttons
async function addProductInCart() {
    try {
        const payload = {
            userId,
            productId: selectedVariantId,
            quantity: 1
        };

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



//Add to cart button functionality
const cartBtn = document.getElementById("addToCartBtn");

cartBtn.addEventListener("click", async () => {
    if (cartBtn.dataset.added === "true") {
        window.location.href = "viewcart.html";
        return;
    }

    await handleAddToCart({ updateButton: true });
});

//Buy Now button Func
document.getElementById("buyNowBtn").addEventListener("click", async () => {
    if (!userId) {
        const returnUrl = encodeURIComponent(window.location.href);
        window.location.href = `signin.html?returnUrl=${returnUrl}`;
        return false;
    }

    await handleAddToCart({ redirectToCart: true });
});


async function checkDetailWishlist(productId) {
    if (!userId) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/WishList/get-by-user`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: Number(userId), productId : selectedVariantId })
        });

        const result = await response.json();
        if (!result.isSuccess) return;

        const wishlistIds = result.data.map(x => x.productId);

        if (wishlistIds.includes(productId)) {
            setWishlisted(true);
        }
    } catch (err) {
        console.error("Wishlist load failed", err);
    }
}

function setWishlisted(state) {
    const box = document.getElementById("detailWishlist");
    const icon = box.querySelector("i");
    const text = box.querySelector(".wishlist-text");

    if (state) {
        box.classList.add("active");
        icon.classList.replace("bi-heart", "bi-heart-fill");
        text.innerText = "Wishlisted";
    } else {
        box.classList.remove("active");
        icon.classList.replace("bi-heart-fill", "bi-heart");
        text.innerText = "Wishlist";
    }
}
document.getElementById("detailWishlist").addEventListener("click", async () => {

    if (!userId) {
        const returnUrl = encodeURIComponent(window.location.href);
        window.location.href = `signin.html?returnUrl=${returnUrl}`;
        return false;
    }

    const box = document.getElementById("detailWishlist");
    const isActive = box.classList.contains("active");

    const url = isActive
        ? `${API_BASE_URL}/api/WishList/remove`
        : `${API_BASE_URL}/api/WishList/add`;

    try {
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                userId: Number(userId),
                productId: selectedVariantId   // or productDetail.productId if needed
            })
        });

        const result = await res.json();
        if (!result.isSuccess) return;

        setWishlisted(!isActive);
        showToast(isActive ? "Removed from wishlist" : "Added to wishlist", "success");

    } catch {
        showToast("Wishlist failed", "error");
    }
});
