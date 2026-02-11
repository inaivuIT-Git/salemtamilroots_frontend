const userId = sessionStorage.getItem("userId") || 2;

let originalData = {};

let saveBtn;
let editBtn;

// Load profile (GET /PROFILE)
document.addEventListener("DOMContentLoaded", () => {
    editBtn = document.getElementById("editBtn");
    saveBtn = document.getElementById("saveBtn");

    editBtn.addEventListener("click", enableEdit);
    document.getElementById("profileForm").addEventListener("submit", saveProfile);
    loadProfile();
});

async function loadProfile() {
const res = await fetch(`${API_BASE_URL}/api/user/profile/${userId}`);

    const result = await res.json();
    const data = result.data;

    document.getElementById("firstName").value = data.firstname;
    document.getElementById("lastName").value = data.lastname || "";
    document.getElementById("email").value = data.email || "";
    document.getElementById("phone").value = data.phone || ""; 
    
     // SIDEBAR NAME ✅
    const sidebarName = document.getElementById("sidebar-name");
    if (sidebarName) {
        sidebarName.textContent = `${data.firstname} ${data.lastname ?? ""}`;
    }
     // SIDEBAR AVATAR (optional)
    const avatar = document.getElementById("sidebar-avatar");
    if (avatar) {
        const fullName = `${data.firstname} ${data.lastname ?? ""}`.trim();
        avatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=2874f0&color=fff`;
    }
    originalData = {
        firstname: data.firstname || "",
        lastname: data.lastname || "",
        email: data.email || "",
        phone: data.phone || ""
    };
}


function enableEdit() {

    document.querySelectorAll(".profile-field").forEach(input => {
        input.removeAttribute("readonly");
        input.addEventListener("input", checkForChanges);
    });

    saveBtn.disabled = true;
    document.getElementById("editBtn").classList.add('d-none');
    document.getElementById("profileActions").classList.remove("d-none");
}


// Enable Save only when value changes 
function checkForChanges() {
    const isChanged =
        document.getElementById("firstName").value !== originalData.firstname ||
        document.getElementById("lastName").value !== originalData.lastname ||
        document.getElementById("phone").value !== originalData.phone;

    saveBtn.disabled = !isChanged;
}


// save profile (PUT /PROFILE)  
async function saveProfile(e) {
    e.preventDefault();

    const payload = {
        firstname: document.getElementById("firstName").value,
        lastname: document.getElementById("lastName").value,
        phone: document.getElementById("phone").value
    };

    const res = await fetch(`${API_BASE_URL}/api/user/profile/${userId}`, {
        method: "PUT",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(payload)
    }); 
    if(!res.ok) { 
        showToast("Failed to update profile", "error");
    }

    if (res.ok) {
        originalData = { ...payload };
        cancelEdit();
        showToast("Profile updated successfully!");
    }
}

// Cancel edit mode 
document.getElementById("cancelBtn").addEventListener("click", cancelEdit); 
function cancelEdit() {
    document.getElementById("firstName").value = originalData.firstname;
    document.getElementById("lastName").value = originalData.lastname;
    document.getElementById("phone").value = originalData.phone;

    document.querySelectorAll(".profile-field").forEach(input => {
        input.setAttribute("readonly", "true");
    });

    document.getElementById("profileActions").classList.add("d-none"); 
    document.getElementById("editBtn").classList.remove("d-none");
}

    
