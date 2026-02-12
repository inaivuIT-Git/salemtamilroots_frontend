// ================= IMAGE CONFIG =================
const API_BASE = "https://salemtamilroots.in";
const noImage = "assets/Images/NoProductImage.png";

/**
 * Converts backend image path to full UI URL
 * @param {string | null | undefined} path
 * @returns {string}
 */
function getImageUrl(path) {
    if (!path) {
        return `${noImage}`;
    }

    // Already absolute (safety)
    if (path.startsWith("http")) {
        return path;
    }

    return `${API_BASE}${path}`;
}


// Loads header & footer and initializes header behaviour
async function includeTemplate() {
    const elements = document.querySelectorAll("[data-template]");
    if (!elements.length) return;

    // ✅ fetch once
    const response = await fetch("template.html");
    const html = await response.text();

    const temp = document.createElement("div");
    temp.innerHTML = html;

    elements.forEach(el => {
        const target = el.getAttribute("data-template");
        const part = temp.querySelector(target);
        if (part) {
            el.innerHTML = part.innerHTML;
        }
    });

    initHeader(); 
   // updateNavbarCartCount(); // ✅ update after header loads
}

function initHeader() {
    // Mobile Search
    const mobileSearchBtn = document.getElementById("mobileSearchBtn");
    const mobileSearch = document.getElementById("mobileSearch");
    const closeSearch = document.getElementById("closeSearch");

    if (mobileSearchBtn && mobileSearch && closeSearch) {
        mobileSearchBtn.addEventListener("click", () => {
            mobileSearch.classList.add("show");
        });

        closeSearch.addEventListener("click", () => {
            mobileSearch.classList.remove("show");
        });
    } 

    
    // Mobile Menu Icon Toggle
    const menuToggler = document.getElementById("menuToggler");
    const mainNav = document.getElementById("mainNav");

    if (menuToggler && mainNav) {
        mainNav.addEventListener("show.bs.collapse", () => {
            menuToggler.querySelector("i")
                ?.classList.replace("bi-list", "bi-x-lg");
        });

        mainNav.addEventListener("hide.bs.collapse", () => {
            menuToggler.querySelector("i")
                ?.classList.replace("bi-x-lg", "bi-list");
        });
    }

    // Wishlist Button Redirect
    const wishlistBtn = document.getElementById("wishlist-btn");
    const CartBtn = document.getElementById("shop-bag");

    if (wishlistBtn) {
        wishlistBtn.addEventListener("click", () => {
            const userId = sessionStorage.getItem("userId");
            window.location.href = userId
                ? `wishlist.html?userId=${userId}`
                : "signin.html";
        });
    } 

    // Profile Button Redirect 
    const userProfileBtn = document.getElementById("user-profile"); 
    if (userProfileBtn) { 
        userProfileBtn.addEventListener("click", () => { 
            const userId = sessionStorage.getItem("userId");
            window.location.href = userId
                ? `profile.html?userId=${userId}`
                : "signin.html"; 
        })
    }

    const cartBag = document.getElementById("shop-bag"); 

    if(cartBag) { 
        cartBag.addEventListener("click", () => { 
            const userId = sessionStorage.getItem("userId"); 
            console.log(sessionStorage.getItem("userId"));
 
            window.location.href = userId ?  `viewcart.html`
                : "signin.html";
            }) 
    } 

    // Navbar search (desktop + mobile) 
    const searchForm = document.getElementById("navbar-search-form"); 
    const searchInput = document.getElementById("navbar-search-input");
    const mobileSearchInput = document.getElementById("mobile-search-input"); 

    function handleSearch(keyword) { 
        if (!keyword || keyword.trim().length < 1) return; 

        window.location.href = `products_listing.html?q=${encodeURIComponent(keyword.trim())}`;
    } 

    // Desktop search 
    if (searchForm && searchInput) { 
        searchForm.addEventListener("submit", (e) => {
            e.preventDefault();
            handleSearch(searchInput.value)
         });    }
    
         // mobile search 
         if (mobileSearchInput) { 
            mobileSearchInput.addEventListener("keydown", (e) => { 
                if (e.key === "Enter") { 
                    e.preventDefault(); 
                    handleSearch(mobileSearchInput.value); 
                }
                });
} } 


document.addEventListener("DOMContentLoaded", includeTemplate); 
//document.addEventListener("cart:Updated", updateNavbarCartCount);
// document.addEventListener("DOMContentLoaded", updateNavbarCartCount);
