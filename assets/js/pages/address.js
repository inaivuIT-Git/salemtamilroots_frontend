import { callApi } from '../callApi.js';

// --- Configuration ---
const BASE_URL = `${API_BASE_URL}/api`;
// --- STATE MANAGEMENT ---
let addresses = [];
let userId = sessionStorage.getItem("userId");
const touchedFields = new Set(); 



async function loadAddresses() {
    try {
        const result = await callApi(`${BASE_URL}/OrderProcess/address/all/${userId}`);

        console.log("RAW API RESULT:", result);
        if (!result.success) {
            console.error("Failed to fetch addresses");
            return;
        }

        // 🔁 Map backend → UI model
        addresses = result.data.map(a => ({
            id: a.addressId,
            name: a.recipientname,
            phone: a.phoneNumber,
            pincode: a.postalcode,
            locality: a.addressline1 || '',
            full: a.addressline2 || '',
            city: a.city,
            district: a.district || '',
            state: a.state || '',
            type: a.addressType || 'home'
        }));
        renderAddresses();

    } catch (error) {
        console.error("Error fetching addresses:", error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const addAddressBtn = document.getElementById('add-address-btn');
    if (addAddressBtn) {
        addAddressBtn.addEventListener('click', showAddressForm);
    }
});

// --- UI LOGIC ---
function renderAddresses() {
    const list = document.getElementById('address-list');
    list.innerHTML = addresses.map(addr => `
            <div class="col-12">
                <div class="address-card p-3">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <span class="badge bg-light text-muted border mb-2 small">${addr.type.toUpperCase()}</span>
                            <div class="fw-bold mb-1">${addr.name} <span class="ms-3 text-muted">${addr.phone}</span></div>
                            <div class="text-muted small">${addr.full}, ${addr.locality}, ${addr.city} - <span class="fw-bold text-dark">${addr.pincode}</span></div>
                        </div>
                        <div class="dropdown">
                            <i class="bi bi-three-dots-vertical cursor-pointer" data-bs-toggle="dropdown"></i>
                            <ul class="dropdown-menu shadow border-0">
                                <li><a class="dropdown-item" href="javascript:void(0)" onclick="showAddressForm(${addr.id})">Edit</a></li>
                                <li><a class="dropdown-item text-danger" href="javascript:void(0)" onclick="deleteAddressAPI(${addr.id})">Delete</a></li>
                            </ul>
                        </div>
                    </div>
                </div> 
            </div>
        `).join('');
}

let addrPincode, addrCity, addrState, errPincode, addrName, addrPhone, addrFull;

document.addEventListener('DOMContentLoaded', () => {
    addrPincode = document.getElementById('addrPincode');
    addrCity = document.getElementById('addrCity');
    addrState = document.getElementById('addrState');
    errPincode = document.getElementById('errPincode'); 
    addrName = document.getElementById('addrName'); 
    addrPhone = document.getElementById('addrPhone'); 
    addrFull = document.getElementById('addrFull');

    if (!addrPincode) {
        console.warn("Address form not loaded yet");
        return;
    }

    addrPincode.addEventListener('input', onPincodeInput);
    loadAddresses();

    function onPincodeInput() {
        const pincode = addrPincode.value.trim();
        clearLocationFields();
        errPincode.textContent = '';
        if (/^[1-9]\d{5}$/.test(pincode)) {
            fetchCityStateByPincode(pincode);
        }
    } 

    document.querySelectorAll('#addressForm input, #addressForm textarea').forEach(el => { 
        el.addEventListener('input', () => { 
            el.classList.remove('is-invalid'); 

            const err = document.getElementById('err' + el.id.replace('addr', '')); 
            if (err) err.textContent = '';
        })
    }) 

    document.querySelectorAll('#addressForm input, #addressForm textarea, #addressForm select').forEach(el => { 
        el.addEventListener('input', checkAddressFormValidity); 
        el.addEventListener('change', checkAddressFormValidity);
    })
}); 

// function validateField(input, errorEl) { 
//     if (!input.checkValidity()) { 
//         errorEl.textContent = input.title; 
//         input.classList.add('is-invalid'); 
//         return false;
//     } 
//     errorEl.textContent = ''; 
//     input.classList.remove('is-invalid'); 
//     return true;
// }
 
// function validateAddressForm() { 
//     let valid = true; 

//     valid = validateField(addrName, document.getElementById('errName')) && valid;
//     valid = validateField(addrPhone, document.getElementById('errPhone')) && valid; 
//     valid = validateField(addrPincode, document.getElementById('errPincode')) && valid; 
//     valid = validateField(addrFull, document.getElementById('errFull')) && valid; 
//     valid = validateField(addrState, document.getElementById('errState')) && valid;

//     return valid;
// }
async function fetchCityStateByPincode(pincode) {
    try {
        errPincode.textContent = ''; 

        const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
        const data = await response.json();

        if (data[0].Status !== "Success") {
            errPincode.textContent = 'Invalid pincode';
            clearLocationFields();
            return;
        }
        const postOffice = data[0].PostOffice[0];
        addrCity.value = postOffice.Block || postOffice.Name;
        //addrDistrict.value = postOffice.district || '';
        addrState.value = postOffice.State || ''; 
        checkAddressFormValidity();
    } catch (error) {
        errPincode.textContent = 'Unable to fetch pincode details';
        clearLocationFields();
    }
}
function clearLocationFields() {
    addrCity.value = '';
    //addrDistrict.value = '';
    addrState.value = ''; 
    checkAddressFormValidity();
} 

function checkAddressFormValidity() {
    const form = document.getElementById('addressForm');
    const saveBtn = document.getElementById('saveAddressBtn');
    if (!form || !saveBtn) return;

    let firstInvalid = null;

    form.querySelectorAll('input, textarea, select').forEach(field => {

        // ❗ Only validate touched fields
        if (!touchedFields.has(field.id)) return;

        if (!field.checkValidity() && !firstInvalid) {
            firstInvalid = field;
        }
    });

    // Extra autofill rules (city/state)
    if (touchedFields.has('addrPincode')) {
        if (!addrCity.value && !firstInvalid) firstInvalid = addrCity;
        if (!addrState.value && !firstInvalid) firstInvalid = addrState;
    }

    // Clear previous states
    form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
    form.querySelectorAll('.error-text').forEach(el => el.textContent = '');

    if (firstInvalid) {
        firstInvalid.classList.add('is-invalid');

        const err = document.getElementById(
            'err' + firstInvalid.id.replace('addr', '')
        );

        if (err) err.textContent = firstInvalid.title || 'This field is required';

        saveBtn.disabled = true;
        return;
    }

    // SAVE enabled only when whole form is valid
    saveBtn.disabled = !form.checkValidity() || !addrCity.value || !addrState.value;
}

    const form = document.getElementById('addressForm');
    const saveBtn = document.getElementById('saveAddressBtn');

    if (!form || !saveBtn) return;

    let firstInvalid = null;

    // Reset old errors
    form.querySelectorAll('.is-invalid').forEach(el => {
        el.classList.remove('is-invalid');
    });

    // Check all real form fields
    form.querySelectorAll('input, textarea, select').forEach(field => {
        if (!field.checkValidity() && !firstInvalid) {
            firstInvalid = field;
        }
    });

    // Extra checks for autofill fields
    if (!addrCity.value.trim() && !firstInvalid) {
        firstInvalid = addrCity;
    }

    if (!addrState.value.trim() && !firstInvalid) {
        firstInvalid = addrState;
    }

    if (firstInvalid) {
        firstInvalid.classList.add('is-invalid');

        const err = document.getElementById(
            'err' + firstInvalid.id.replace('addr', '')
        );
        if (err) err.textContent = firstInvalid.title || 'This field is required';

        saveBtn.disabled = true;
        return;
    }

    saveBtn.disabled = false;
}


function showAddressForm(id = null) {
    // Toggle UI
    document.getElementById('address-list').classList.add('d-none');
    document.getElementById('add-address-btn').classList.add('d-none');
    document.getElementById('address-form-wrapper').classList.remove('d-none');

    if (id !== null) { 
        const addr = addresses.find(a => a.id === id); 

        if (!addr) { 
            console.warn("Address not found for id:", id); 
            return;
        }
        // Edit Mode: Populate Fields
        document.getElementById('saveAddressBtn').disabled = true; 

        document.getElementById('form-title').innerText = "EDIT ADDRESS";
        document.getElementById('addrId').value = addr.id;
        document.getElementById('addrName').value = addr.name;
        document.getElementById('addrPhone').value = addr.phone;
        document.getElementById('addrPincode').value = addr.pincode;
        document.getElementById('addrLocality').value = addr.locality;
        document.getElementById('addrFull').value = addr.full;
        document.getElementById('addrCity').value = addr.city;
        document.getElementById('addrType').value = addr.type;
    } else {
        // Add Mode: Clear Fields 
        document.getElementById('saveAddressBtn').disabled = true; 

        document.getElementById('form-title').innerText = "ADD NEW ADDRESS";
        document.getElementById('addressForm').reset();
        document.getElementById('addrId').value = "";
    }
}

function hideAddressForm() {
    document.getElementById('address-list').classList.remove('d-none');
    document.getElementById('add-address-btn').classList.remove('d-none');
    document.getElementById('address-form-wrapper').classList.add('d-none');
};

// -----UI TO API PAYLOAD MAP 
function mapUIToApiPayload(addressId = null) {
    return {
        userId: userId,
        addressId: addressId ? Number(addressId) : 0,
        recipientname: document.getElementById('addrName').value,
        phoneNumber: document.getElementById('addrPhone').value,
        postalcode: document.getElementById('addrPincode').value,
        addressline1: document.getElementById('addrLocality').value,
        addressline2: document.getElementById('addrFull').value,
        city: addrCity.value,
        state: addrState.value,
        addressType: document.getElementById('addrType').value
        // district:"",
        // state:"",
        // country:""
    };
}

// --- SIMULATED API INTEGRATION ---
document.addEventListener('DOMContentLoaded', () => { 
    const form = document.getElementById('addressForm'); 
    if (!form) return; 

    form.setAttribute('novalidate', 'novalidate'); 

    form.addEventListener('submit', async (e) => {
    e.preventDefault();   

    const id = document.getElementById('addrId').value;
    const payload = mapUIToApiPayload(id);

    try {
        if (id) {
            await callApi(`${BASE_URL}/OrderProcess/address/${id}`, payload, 'PUT');
        } else {

            console.log("payload", payload);
            const response = await callApi(`${BASE_URL}/OrderProcess/address`, payload, 'POST');

        }

        hideAddressForm();
        // renderAddresses(); 
        loadAddresses();
    } catch (err) {
        console.error("savve failed:", err);
        alert("failed to save address");
    }

});  });

async function deleteAddressAPI(id) {
    if (!confirm('Are you sure you want to delete this address?')) return;

    try {
        const res = await callApi(`${BASE_URL}/OrderProcess/address/${id}`, {}, 'DELETE');
        console.log("delete response", res);
        if (!res?.success) { alert("failed to delete address"); return; }

        alert("address deleted successfully");
        loadAddresses();
    } catch (error) {
        console.error("Delete failed:", error);
        alert("Failed to delete address");
    }
}

window.showAddressForm = showAddressForm;
window.deleteAddressAPI = deleteAddressAPI;
window.hideAddressForm = hideAddressForm;


// Initialize
document.addEventListener('DOMContentLoaded', loadAddresses);
function toggleSidebar() { document.getElementById('sidebar').classList.toggle('active'); }
