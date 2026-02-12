/* =====================================================
  manageProduct.js
===================================================== */
/* =============================
   CATEGORY CACHE
============================= */

let CATEGORY_MAP = {}; // { "haircare": 2, "skincare": 5 }

async function preloadCategoriesForImport() {
  if (Object.keys(CATEGORY_MAP).length) return;

  try {
    const res = await fetch(`${API_BASE_URL}/api/Category`);
    const result = await res.json();

    result.data
      .filter(c => c.isActive)
      .forEach(c => {
        CATEGORY_MAP[normalizeKey(c.categoryName)] = c.categoryId;
      });

    console.log("✅ Category cache loaded:", CATEGORY_MAP);
  } catch (err) {
  console.error("❌ Category load failed", err);
  toastError("Failed to load categories");
}
}



const pricing = {
  paymentGateway : 2, // %
  infrastructure : 5,
  infraType : "Flat", //flat
  commission : 5,
  commissionType : "Percentage"  //%
}
let isEditMode = false ;    
let editingProductId = null ;
let isFillingForm = false;

function detectEditMode(){
  const hash = location.hash;
  const query = hash.split("?")[1];
  if (!query) return;

  const params = new URLSearchParams(query);
  const prodId = params.get("productId");

  if (prodId) {
    isEditMode = true;
    editingProductId = Number(prodId);
  }
}



let Required_fields =[];
let validatedImportRows =[];
console.log("🔥 manageProduct.js LOADED");



/* =====================================================  
   ENTRY POINT (CALL AFTER PARTIAL LOAD)
===================================================== */
window.initmanageProductPage = async function () {
  console.log("🔥 initmanageProductPage called");

  detectEditMode();
  await loadCategories();
  bindEvents();
  handleDiscountTypeChange(); // default state

  if(isEditMode){
    await loadProductForEdit(editingProductId)
  }
}

/* =====================================================  
   EVENT BINDINGS
===================================================== */
function bindEvents() {
  document.querySelector('[name="discType"]')
    ?.addEventListener("change", handleDiscountTypeChange);

  document.querySelector('[name="basePrice"]')
    ?.addEventListener("input", calculateSellingPrice);

  document.querySelector('[name="discamnt"]')
    ?.addEventListener("input", calculateSellingPrice);

  document.getElementById("saveProductBtn")
    ?.addEventListener("click", saveProduct);
  
  document.getElementById("uploadPriceCheckbox")
  ?.addEventListener("change", togglePriceHistoryMode);

  document.getElementById("futurePriceFile")
  ?.addEventListener("change", handleFuturePriceFile);

}


function togglePriceHistoryMode() {  
  const uploadChecked =
    document.getElementById("uploadPriceCheckbox")?.checked === true;

  const manualDiv = document.getElementById("futurePriceManual");
  const uploadDiv = document.getElementById("futurePriceUpload");

  if (!manualDiv || !uploadDiv) return;

  // 🔁 show / hide sections
  manualDiv.classList.toggle("d-none", uploadChecked);
  uploadDiv.classList.toggle("d-none", !uploadChecked);

  // ✅ ADD THIS BLOCK (DISABLE MANUAL INPUTS)
  document
    .querySelectorAll("#futurePriceManual input")
    .forEach(input => {
      input.readOnly = uploadChecked;
      input.classList.toggle("bg-light", uploadChecked);
      if (uploadChecked) input.value = "";
    });
}




/* =====================================================  
   LOAD CATEGORIES (UNCHANGED)
===================================================== */
async function loadCategories() {
  const categorySelect = document.getElementById("categorySelect");
  if (!categorySelect) return;

  try {
    const response = await fetch(`${API_BASE_URL}/api/Category`);
    const result = await response.json();

    categorySelect.innerHTML = `<option value="">Select Category</option>`;

    result.data
      .filter(c => c.isActive)
      .forEach(c => {
        const opt = document.createElement("option");
        opt.value = c.categoryId;
        opt.textContent = c.categoryName;
        categorySelect.appendChild(opt);
      });

  } catch (err) {
    console.error("❌ Category load failed", err);
    toastError("Category load failed");
  }
}

/* =====================================================  
   DISCOUNT TYPE UI CONTROL
===================================================== */
function handleDiscountTypeChange() {
  const discType = getValue('[name="discType"]');

  const discountInput = document.querySelector('[name="discamnt"]');
  const discountDiv = discountInput?.closest(".col-md-6");

  const offerStart = document.querySelector('[name="offStartDate"]');
  const offerEnd = document.querySelector('[name="offEndDate"]');

  const offerStartDiv = offerStart?.closest(".col-md-6");
  const offerEndDiv = offerEnd?.closest(".col-md-6");

  // 🔹 Hide all first
  [discountDiv, offerStartDiv, offerEndDiv]
    .forEach(el => el && (el.style.display = "none"));

  // 🔹 Disable (DO NOT CLEAR)
  [discountInput, offerStart, offerEnd]
    .forEach(el => el && (el.disabled = true));

  /* ========= PERCENTAGE OR FLAT ========= */
  if (discType === "Percentage" || discType === "Flat") {
    discountDiv.style.display = "";
    offerStartDiv.style.display = "";
    offerEndDiv.style.display = "";

    discountInput.disabled = false;
    offerStart.disabled = false;
    offerEnd.disabled = false;

    // UI hint
    discountInput.placeholder =
      discType === "Percentage"
        ? "Enter percentage (1–100)"
        : "Enter flat discount amount";
  }

  /* ========= NO DISCOUNT ========= */
  if (discType === "No Discount" && !isFillingForm) {
  discountInput.value = 0;
  offerStart.value = "";
  offerEnd.value = "";
}

  calculateSellingPrice();
}



/* =====================================================  
   SELLING PRICE CALCULATION
===================================================== */
function calculateSellingPrice() {
  const basePrice = Number(getValue('[name="basePrice"]')) || 0;
  const discount = Number(getValue('[name="discamnt"]')) || 0;
  const discType = getValue('[name="discType"]'); // ✅ FIX

  if(basePrice <=0){ 
    setValue('#sellingPrice' , "");
    return;
  }
  console.log({
  basePrice,
  infra: pricing.infrastructure,
  commission: pricing.commission,
  gateway: pricing.paymentGateway
});


  let discountedPrice = basePrice;

  if(discType === "Percentage") discountedPrice -=(basePrice * discount)/100;
  if(discType === "Flat") discountedPrice -=discount;

  discountedPrice = Math.max(discountedPrice,0);

  const infra = pricing.infraType === "Percentage" 
    ? (basePrice * pricing.infrastructure) / 100
    : pricing.infrastructure;;
  const commission = pricing.commissionType === "Percentage"
    ? (basePrice * pricing.commission) / 100
    : pricing.commission;
  console.log("commission" , commission)

  const subtotal = discountedPrice + infra + commission ;

  const gatewayRate = pricing.paymentGateway /100;

  const finalPrice = subtotal / (1 -gatewayRate);

  setValue('#sellingPrice', finalPrice.toFixed(2));

}

/* =====================================================  
   VALIDATION (WITH CONDITIONAL RULES)
===================================================== */
function validateForm() {
  clearErrors();
  let isValid = true;
  let firstInvalid = null;

  const required = [
    '#categorySelect',
    '[name="name"]',
    '[name="tags"]',
    '[name="shortDesc"]',
    '[name="fulldescription"]',
    '[name="quantity"]',
    '[name="units"]',
    '[name="basePrice"]',
    '[name="initialStock"]',
    '[name="minStock"]'
  ];

  required.forEach(sel => {
    const el = document.querySelector(sel);
    if (!el || !el.value.trim()) {
      showError(el, "This field is required");
      if (!firstInvalid) firstInvalid = el;
      isValid = false;
    }
  });

 const discType = getValue('[name="discType"]');
 const hasDiscount = discType === "Percentage" || discType === "Flat";



  if (hasDiscount) {
      
    const discountInput = document.querySelector('[name="discamnt"]');
    const offerStart = document.querySelector('[name="offStartDate"]');
    const offerEnd = document.querySelector('[name="offEndDate"]');

    if (discType === "Percentage" && (discountInput.value <= 0 || discountInput.value > 100)) {
      showError(discountInput, "Percentage must be between 1 and 100");
      isValid = false;
    }

    if (discType === "Flat" && discountInput.value <= 0) {
      showError(discountInput, "Flat discount must be greater than 0");
      isValid = false;
    }

    if (!offerStart.value) {
      showError(offerStart, "Required");
      isValid = false;
    }

    if (!offerEnd.value) {
      showError(offerEnd, "Required");
      isValid = false;
    }
  }

  if (firstInvalid) firstInvalid.focus();
  return isValid;
}


function collectFuturePriceHistories() { 
  const uploadChecked =
    document.getElementById("uploadPriceCheckbox")?.checked === true;

  const histories = [];

  /* ===========================
     🔹 MANUAL FUTURE PRICE
     (DEFAULT MODE)
     =========================== */
  if (!uploadChecked) {
    const futureBasePrice =
      Number(document.getElementById("futureBasePrice")?.value || 0);

    const priceFrom =
      document.getElementById("priceEffectiveFrom")?.value || null;

    const priceTo =
      document.getElementById("priceEffectiveTo")?.value || null;

    // ✔ Only push if seller actually entered future price + from date
    if (futureBasePrice > 0 && priceFrom) {

 // ❗ DATE VALIDATION

const today = new Date();
today.setHours(0,0,0,0);

const fromDate = new Date(priceFrom);
fromDate.setHours(0,0,0,0);

const toDate = priceTo ? new Date(priceTo) : null;
if (toDate) toDate.setHours(0,0,0,0);

// From must be today or future
if (fromDate < today) {
  toastWarning("Price Effective From must be today or a future date");
  return [];
}

// To must be >= From
if (toDate && toDate < fromDate) {
  toastWarning("Price Effective To cannot be before Price Effective From");
  return [];
}


  histories.push({
  basePrice: futureBasePrice,
  priceEffectiveFrom: toDateTime00(priceFrom),
  priceEffectiveTo: toDateTime00(priceTo)
});

}

  }

  /* ===========================
     🔹 UPLOADED FUTURE PRICES
     =========================== */
  if (uploadChecked) {
    validatedImportRows
      .filter(r => r.errors?.length === 0)
      .forEach(r => {
        const price = Number(r.data.baseprice || 0);
        const from = r.data.priceeffectivefrom;
        const to = r.data.priceeffectiveto || null;

        if (price > 0 && from) {
          histories.push({
            basePrice: price,
            priceEffectiveFrom: toDateTime00(from),
            priceEffectiveTo: toDateTime00(to)
          });

        }
      });
  }

  return histories;
}

function handleFuturePriceFile(e) { 
  const file = e.target.files[0];
  if (!file) return;

  console.log("📂 Future price file selected:", file.name);

  const ext = file.name.split(".").pop().toLowerCase();

  if (ext === "csv") {
    readFuturePriceCSV(file);
  } else if (ext === "xlsx" || ext === "xls") {
    readFuturePriceExcel(file);
  } else {
    toastWarning("Only CSV / Excel allowed for future price history");
  }
}


function previewFuturePrices(rows) { 
  const modalEl = document.getElementById("futurePricePreviewModal");
  const tbody = document.getElementById("futurePricePreviewBody");

  if (!modalEl || !tbody) {
    console.error("Future price preview modal not found");
    return;
  }

  tbody.innerHTML = "";

  rows.forEach((r, index) => {
    const isValid = r.errors.length === 0;

    const tr = document.createElement("tr");
    tr.className = isValid ? "table-success" : "table-danger";

    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${r.data.baseprice}</td>
      <td>${r.data.priceeffectivefrom}</td>
      <td>${r.data.priceeffectiveto || "-"}</td>
      <td>
        ${isValid
          ? '<span class="badge bg-success">Valid</span>'
          : '<span class="badge bg-danger">Invalid</span>'}
      </td>
      <td>${r.errors.join(", ") || "-"}</td>
    `;

    tbody.appendChild(tr);
  });

  new bootstrap.Modal(modalEl).show();
}


function readFuturePriceCSV(file) { 
  const reader = new FileReader();

  reader.onload = e => {
    const workbook = XLSX.read(e.target.result, { type: "string" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    const rows = XLSX.utils.sheet_to_json(sheet, {
      defval: "",
      raw: false
    });

    // 🔥 Store in SAME variable your collector uses
    validatedImportRows = rows.map(r => ({
      data: {
        baseprice: Number(r.baseprice || 0),
        priceeffectivefrom: r.priceeffectivefrom,
        priceeffectiveto: r.priceeffectiveto || null
      },
      errors: validateFuturePriceRow(r)
    }));

    console.log("✅ Future price histories loaded:", validatedImportRows);

    previewFuturePrices(validatedImportRows);
  };

  reader.readAsText(file);
}

function validateFuturePriceRow(row) { 
  const errors = [];

  if (!row.baseprice || Number(row.baseprice) <= 0)
    errors.push("Invalid baseprice");

  if (!row.priceeffectivefrom)
    errors.push("priceeffectivefrom missing");

  const today = new Date();
  today.setHours(0,0,0,0);

  const from = row.priceeffectivefrom ? new Date(row.priceeffectivefrom) : null;
  const to = row.priceeffectiveto ? new Date(row.priceeffectiveto) : null;

  if (from) from.setHours(0,0,0,0);
  if (to) to.setHours(0,0,0,0);

  // From must be today or future
  if (from && from < today) {
    errors.push("priceeffectivefrom must be today or future");
  }

  // To must be >= From
  if (from && to && to < from) {
    errors.push("Invalid date range");
  }

  return errors;
}



/* ===================================================== 
   BUILD PAYLOAD
===================================================== */
function buildCreatePayload() {
  const histories = collectFuturePriceHistories();

  return {
    categoryId: Number(document.getElementById("categorySelect")?.value),
    productName: getValue('[name="name"]'),
    tag: getValue('[name="tags"]'),
    shortDescription: getValue('[name="shortDesc"]'),
    description: getValue('[name="fulldescription"]'),
    weightValue: Number(getValue('[name="quantity"]')),
    unit: getValue('[name="units"]').toUpperCase(),
    basePrice: Number(getValue('[name="basePrice"]')),
    discountType: normalizeDiscountType(),
    discountValue: Number(getValue('[name="discamnt"]')) || 0,
    offerStartDate: toDateTime00(getValue('[name="offStartDate"]')),
    offerEndDate: toDateTime00(getValue('[name="offEndDate"]')),
    isActive: isChecked('[name="isactive"]'),
    isSeasonal: isChecked('[name="isSeasonal"]'),
    isFree: isChecked('[name="isFree"]'),
    initialStock: Number(getValue('[name="initialStock"]')),
    minimumStockLevel: Number(getValue('[name="minStock"]')),
    batchCode: getValue('[name="batchcode"]'),
    manufacturedOn: toDateTime00(getValue('[name="manufacturedDate"]')),
    expiresOn: toDateTime00(getValue('[name="expiryDate"]')),
    batchQuantity: Number(getValue('[name="batchQuantity"]')),

    // 🔥 CRITICAL FIX
    ...(histories.length && { priceHistories: histories })
  };
}


function buildPayload() { 
  return isEditMode
    ? buildUpdatePayload()
    : buildCreatePayload();
}

/* ===================================================== 
   SAVE PRODUCT
===================================================== */
async function saveProduct() {

  const auth = window.getAuthOrRedirect();
if (!auth) return;

  const { sellerId, userId } = auth;

  console.log("🟢 Save clicked", { isEditMode });

  if (!isEditMode) {
  const ok = validateForm();
  console.log("Validation result:", ok);
  if (!ok) return;
}
  if (!isEditMode && !validateForm()) return;
  startProductLoader();

  const payload = buildPayload();

  console.log("FINAL PAYLOAD", JSON.stringify(payload, null, 2));

  const url = isEditMode
    ? `${API_BASE_URL}/api/Product/${editingProductId}`
    : `${API_BASE_URL}/api/Product`;

  const method = isEditMode ? "PUT" : "POST";

  //const body = isEditMode ? JSON.stringify(payload) : JSON.stringify([payload]);

  const body = JSON.stringify(payload);
  const response = await fetch(url, {
    method,
    headers: {
    "Content-Type": "application/json",
    "X-User-Id": userId,
    "X-Seller-Id": sellerId
  },
    body
  });

  const result = await response.json();
  console.log("🟥 FULL SAVE RESPONSE:", result);
console.log("🟥 DATA TYPE:", typeof result.data, result.data);

  console.log("payload :" , result );

  if (!response.ok || !result.isSuccess) {
  toastError(result?.message || "Save failed");
  stopProductLoader();
  return;
}

/* ✅ SAVE PRODUCT ID AFTER CREATE */
if (!isEditMode) {
  const productId = Array.isArray(result.data)
    ? result.data[0]
    : result.data?.productId || result.data?.id;

  console.log("🆔 Created Product ID:", productId);

  if (productId) {
    window.createdProductId = productId;
    sessionStorage.setItem("createdProductId", productId);
  } else {
    console.error("❌ productId NOT FOUND", result);
  }
}


toastSuccess(isEditMode ? "Product updated successfully" : "Product created successfully");
stopProductLoader();

// auto upload images for new product
if (!isEditMode) {
  saveImagesBtn?.click();
}
}



/* =====================================================
   HELPERS
===================================================== */
function getValue(sel) {
  return document.querySelector(sel)?.value.trim() || "";
}
function setValue(sel, v) {
  const el = document.querySelector(sel);
  if (el) el.value = v;
}
function isChecked(sel) {
  return document.querySelector(sel)?.checked || false;
}
function showError(el, msg) {
  el.classList.add("is-invalid");
  const d = document.createElement("div");
  d.className = "invalid-feedback";
  d.innerText = msg;
  el.closest(".col-md-6, .mb-3")?.appendChild(d);
}
function clearErrors() {
  document.querySelectorAll(".is-invalid").forEach(e => e.classList.remove("is-invalid"));
  document.querySelectorAll(".invalid-feedback").forEach(e => e.remove());
}
function disableAndClear(el) {
  if (!el) return;
  el.value = "";
  el.disabled = true;
}
function enable(el) {
  if (el) el.disabled = false;
}
function mapDiscountTypeForUI(type) {
  return type || "None";
}
function normalizeDiscountType() {
  const t = getValue('[name="discType"]');
  if (t === "Percentage") return "Percentage";
  if (t === "Flat") return "Flat";
  return "None";
}

/* =============================
   HEADER NORMALIZATION
============================= */

function normalizeKey(key) {
  return key
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/_/g, "")
    .replace(/-/g, "")
    .replace(/[^\w]/g, "");
}

const HEADER_ALIAS_MAP = {
  category: ["category", "categoryid", "cat", "catid", "categoryid"],
  name: ["name", "productname", "product", "title", "itemname", "item", "producttitle", "itemtitle"],
  tags: ["tags", "keywords", "tag", "label", "labels"],
  shortdesc: ["shortdesc", "shortdescription", "shortdesciption", "brief", "summary", "shortinfo", "intro"],
  fulldescription: ["fulldescription", "description", "fulldesc", "desc", "details", "productdetails", "productdescription"],
  quantity: ["quantity", "qty", "weight", "weightvalue"],
  units: ["units", "unit", "uom", "measure", "measurement"],
  baseprice: ["baseprice", "price", "mrp", "cost", "sellingprice", "amount", "rate", "basecost"],
  disctype: ["disctype", "discounttype", "discount", "type", "offertype"],
  discamnt: ["discamnt", "discountamount", "discountvalue", "discamount", "discvalue"],
  offerstartdate: ["offerstartdate", "offerstart", "startdate"],
  offerenddate: ["offerenddate", "offerend", "enddate"],
  initialstock: ["initialstock", "stock", "openingstock", "startingstock", "initialqty"],
  minstock: ["minstock", "minimumstock", "minstocklevel", "minlevel", "minimumlevel"],
  isactive: ["isactive", "active", "status", "isavailable", "available", "isenabled", "enabled"],
  batchcode: ["batchcode", "batch", "batchno", "batchnumber"],
  manufactureddate: ["manufactureddate", "mfgdate", "mfd", "manufacturedon", "mfgon"],
  expirydate: ["expirydate", "expdate", "expirationdate", "exp", "expiry"],
  batchquantity: ["batchquantity", "batchqty", "batchsize"],
};


document.addEventListener("click", async (e) => {
  const btn = e.target.closest("#saveProductImagesBtn");
  if (!btn) return;

  // ✅ START IMAGE LOADER
  startImagesLoader();

  const auth = window.getAuthOrRedirect();
  if (!auth) {
    stopImagesLoader();
    return;
  }

  const { sellerId, userId } = auth;

  const productId =
    window.createdProductId || sessionStorage.getItem("createdProductId");

  if (!productId) {
    toastWarning("Please save the product before uploading images.");
    stopImagesLoader();
    return;
  }

  if (!mainImageFile && !existingMainImageUrl) {
    toastWarning("Please select a main image");
    stopImagesLoader();
    return;
  }

  const formData = new FormData();

  // ✅ ONLY send MainImage if user selected a new file
  if (mainImageFile instanceof File) {
    formData.append("MainImage", mainImageFile);
  }

  // ✅ Send only newly added additional images
  additionalImageFiles.forEach(file => {
    formData.append("AdditionalImages", file);
  });

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/products/images/${productId}`,
      {
        method: "POST",
        headers: {
          "X-User-Id": userId,
          "X-Seller-Id": sellerId
        },
        body: formData
      }
    );

    const text = await response.text();
    console.log("IMAGE UPLOAD RESPONSE:", text);

    if (response.status >= 200 && response.status < 300) {
      toastSuccess("🖼️ Product Images Uploaded Successfully!");
    } else {
      toastError("Image upload failed");
    }

  } catch (err) {
    console.error("❌ Image upload error", err);
    toastError("Error uploading images");
  }

  // ✅ STOP IMAGE LOADER (always)
  stopImagesLoader();
});



function getPreviewFields() {
  return [
    ...Required_fields,
    "discamnt",
    "offerstartdate",
    "offerenddate"
  ];
}


/* ===== IMPORT PRODUCT ===== */

document.addEventListener("click" , (e) => {
    const importBtn = e.target.closest("#importProductBtn");
    if(!importBtn) return ;

    document.getElementById("importFileInput").click();
})
// HANDLE FILE SELECTION
document.addEventListener("change" ,async e =>
{
    if(e.target.id !== "importFileInput") return ;

    const file = e.target.files[0];
    if(!file) return ;

    if (!Required_fields.length) {
      await preloadRequiredFields();
    }

    await preloadCategoriesForImport();

    handleImportFile(file);
    e.target.value = "";
});

async function preloadRequiredFields() {
    const res = await fetch("manageProduct.html");
    const html = await res.text();
    const temp = document.createElement("div");
    temp.innerHTML = html;
    Required_fields = getRequiredFieldsFromForm(temp);
}

function handleImportFile(file) {
    const ext = file.name.split(".").pop().toLowerCase();

    if (ext === "csv") {
        readCSV(file);
    } 
    else if (ext === "xlsx" || ext === "xls") {
        readExcel(file);
    } 
    else {
        toastWarning("Only CSV or Excel files allowed");
    }
}

function readCSV(file) {
    const reader = new FileReader();

    reader.onload = e => {
        const data = e.target.result;

        const workbook = XLSX.read(data, { type: "string" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];

        const products = XLSX.utils.sheet_to_json(sheet, {
            defval: "",
            raw: false
        });

        processImportedProducts(products);
    };

    reader.readAsText(file);
}


function readExcel(file){
    const reader = new FileReader();

    reader.onload = (e) =>{
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data , {type : "array"});
        const sheet = workbook.Sheets[workbook.SheetNames[0]];

        const products = XLSX.utils.sheet_to_json(sheet ,{defval : ""});
        processImportedProducts(products);
    };
    reader.readAsArrayBuffer(file);
}

function mapProduct(headers , row){
    const product = {};
    headers.forEach((key , index) => {
        product[key] = row[index]?.trim();
    });
    return product ; 
}

/* ========= VALIDATION ======= */

function validateRows(products) {
  return products.map((p, i) => {
    const data = {};
    const errors = [];

    // ----------------------------
    // Normalize + alias mapping
    // ----------------------------
    Object.keys(p).forEach(originalKey => {
      const normalized = normalizeKey(originalKey);
      const systemKey = resolveSystemKey(normalized);
      if (!systemKey) return;

      // CATEGORY handled earlier (already mapped to ID)
      if (systemKey === "category") {
        const name = p[originalKey]?.toString().trim();
        const catId = CATEGORY_MAP[normalizeKey(name)];
        if (!catId) {
          errors.push(`Unknown category: ${name}`);
        } else {
          data.category = catId;
        }
        return;
      }

      data[systemKey] = p[originalKey];
    });

    // ----------------------------
    // REQUIRED FIELD CHECK
    // ----------------------------
    Required_fields.forEach(f => {
      if (!data[f] || data[f].toString().trim() === "") {
        errors.push(`${f} missing`);
      }
    });

    // ----------------------------
    // DISCOUNT CONDITIONAL RULE
    // ----------------------------
    const discountType =
      (data.disctype || "").toString().toLowerCase();

    const hasDiscount =
      discountType === "percentage" || discountType === "flat";

    if (hasDiscount) {
      // discountValue
      if (!data.discamnt || Number(data.discamnt) <= 0) {
        errors.push("discountValue required for discount");
      }

      // offerStartDate
      if (!data.offerstartdate) {
        errors.push("offerStartDate required for discount");
      }

      // offerEndDate
      if (!data.offerenddate) {
        errors.push("offerEndDate required for discount");
      }

      // date range check
      if (
        data.offerstartdate &&
        data.offerenddate &&
        new Date(data.offerenddate) < new Date(data.offerstartdate)
      ) {
        errors.push("offerEndDate cannot be before offerStartDate");
      }
    } else {
      // normalize no-discount case
      data.disctype = "none";
      data.discamnt = 0;
      data.offerstartdate = null;
      data.offerenddate = null;
    }

    return {
      row: i + 2,
      data,
      errors
    };
  });
}

function resolveSystemKey(normalizedKey) {
  for (const systemKey in HEADER_ALIAS_MAP) {
    if (HEADER_ALIAS_MAP[systemKey].includes(normalizedKey)) {
      return systemKey;
    }
  }
  return null; // unknown column
}


function processImportedProducts(products){
    validatedImportRows = validateRows(products);
    openImportPreviewModal(validatedImportRows);
    toastInfo("Preview loaded. Review before importing.");

}

/* ================= IMPORT PREVIEW MODAL ================= */

function openImportPreviewModal(rows) {

    const modalEl = document.getElementById("importPreviewModal");
    if (!modalEl) {
        console.error("❌ importPreviewModal not found in DOM");
        return;
    }

    const tbody = modalEl.querySelector("#importPreviewBody");
    const theadRow = modalEl.querySelector("thead tr");
    const summary = modalEl.querySelector("#importSummaryText");
    const PREVIEW_FIELDS = getPreviewFields();


    if (!tbody || !theadRow) {
        console.error("❌ importPreviewBody or table header missing");
        return;
    }

    // reset
    theadRow.innerHTML = `<th data-field="row">Row</th>`;
    tbody.innerHTML = "";

    PREVIEW_FIELDS.forEach(f => {
  theadRow.innerHTML += `<th data-field="${f}">${prettifyField(f)}</th>`;
});

    theadRow.innerHTML += `
  <th data-field="status">Status</th>
  <th data-field="errors">Errors</th>
`;


    let valid = 0, invalid = 0;

    rows.forEach(r => {
        const tr = document.createElement("tr");
        tr.className = r.errors.length ? "table-danger" : "table-success";

        r.errors.length ? invalid++ : valid++;

        tr.innerHTML =
  `<td data-field="row">${r.row}</td>` +
  PREVIEW_FIELDS
    .map(f => `<td data-field="${f}">${r.data[f] ?? "-"}</td>`)
    .join("") +
  `<td data-field="status">${r.errors.length ? "Invalid" : "Valid"}</td>` +
  `<td data-field="errors">${r.errors.join(", ") || "-"}</td>`;



        tbody.appendChild(tr);
    });

    summary.textContent = `Valid: ${valid} | Invalid: ${invalid}`;

    new bootstrap.Modal(modalEl).show();
}

document.addEventListener("click", async (e) => {
  if (!e.target.closest("#confirmImportBtn")) return;
   const auth = window.getAuthOrRedirect();
if (!auth) return;

  const { sellerId, userId } = auth;

  const validProducts = validatedImportRows.filter(r => r.errors.length === 0);

  if (!validProducts.length) {
    toastWarning("No valid products to import");
    return;
  }

  const payload = validProducts.map(r => bulkImportProductsImport(r.data));

  console.log("📦 BULK IMPORT PAYLOAD:", payload);
  console.log(payload.map(p => ({
  discountType: p.discountType,
  discountValue: p.discountValue,
  offerStartDate: p.offerStartDate,
  offerEndDate: p.offerEndDate
})));

  try {
    const response = await fetch(`${API_BASE_URL}/api/Product/bulk`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-User-Id": userId,
        "X-Seller-Id": sellerId
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok || !result.isSuccess) {
      toastError(result?.message || "Failed to import products");
      return;
    }

    toastSuccess(`✅ ${payload.length} products imported successfully`);
    bootstrap.Modal
      .getInstance(document.getElementById("importPreviewModal"))
      .hide();

    location.hash = "#/products";
    updatePageTitle("Products");

  } catch (err) {
    console.error("❌ Import failed:", err);
    toastError("Error occurred during import");
  }
});

function bulkImportProductsImport(row) {
  const discountType = mapDiscount(row.disctype);
  const hasDiscount =
  ["percentage", "flat"].includes(discountType.toLowerCase());

  const basePrice = Number(row.baseprice || 0);

  return {
    categoryId: Number(row.category),
    productName: row.name,
    tag: row.tags,
    shortDescription: row.shortdesc,
    description: row.fulldescription,
    weightValue: Number(row.quantity),

    unit: mapUnit(row.units),

    basePrice: basePrice,
    // sellingPrice: basePrice,

      discountType: discountType,
    discountValue: hasDiscount ? Number(row.discamnt) : 0,
    offerStartDate: hasDiscount ? toDateTime00(row.offerstartdate) : null,
    offerEndDate: hasDiscount ? toDateTime00(row.offerenddate) : null,


    isActive: true,
    isSeasonal : false,
    isFree : false ,

    initialStock: Number(row.initialstock),
    minimumStockLevel: Number(row.minstock),

    batchCode: row.batchcode,
    manufacturedOn: normalizeDateOnly(row.manufactureddate),
    expiresOn: normalizeDateOnly(row.expirydate),
    batchQuantity: Number(row.batchquantity),

    importKey: crypto.randomUUID()
  };
}


//helpers 
function mapUnit(unit) {
  const map = {
    g: "G",
    kg: "KG",
    mg: "MG",
    ml: "ML",
    l: "L",
    pcs: "PCS",
    pack: "PACK",
    bottle: "BOTTLE",
    caps : "CAPS",
    tabs : "TABS",
    box: "BOX"
  };
  return map[unit?.toLowerCase()] || null;
}

function mapDiscount(discount) {
  const map = {
    percentage: "Percentage",
    flat: "Flat",
    "no discount": "None",
    none: "None",
    "": "None"
  };
  return map[discount?.toString().toLowerCase()] || "None";
}



function normalizeDateOnly(val) {
  if (!val) return null;
  const d = new Date(val);
  if (isNaN(d)) return null;
  return d.toISOString().split("T")[0]; // yyyy-MM-dd
}

function normalizeDate(val) {
  if (!val) return "";
  return val.split("T")[0]; // works for both formats
}



// Edit / Update Product

async function loadProductForEdit(productId) {   

  const auth = window.getAuthOrRedirect();
if (!auth) return;

  const { sellerId, userId } = auth;

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/Product/seller/details/by-id/${productId}`,
      {
        method: "GET",
        headers: {
          "X-User-Id": userId,
          "X-Seller-Id": sellerId
        }
      }
    );

    const result = await response.json();
    if (!result.isSuccess) {
      toastError("Failed to load Product");
      return;
    }

    const api = result.data;
const v = api.variants?.[0] || {};
const b = api.batches?.[0] || {};   // ✅ BATCH
console.log(api.batches[0]);

const formModel = {
  productId: api.productId,

  productName: api.displayName,
  tag: api.tags || "",

  shortDescription: api.shortDescription,
  description: api.description,

  categoryId: api.categoryId,

  weightValue: v.weight,
  unit: v.unit,

  basePrice: v.basePrice,
  initialStock: v.availableQuantity,
  minimumStockLevel: v.minimumStockLevel,

  discountType: (() => {
  const t = (v.discountType || "").toLowerCase();
  if (t === "percentage") return "Percentage";
  if (t === "flat") return "Flat";
  return "No Discount";
})(),
  discountValue: v.discountValue,

  offerStartDate: api.discountHistory?.[0]?.offerStartDate || null,
  offerEndDate: api.discountHistory?.[0]?.offerEndDate || null,

  // 🟢 BATCH (THIS WAS MISSING)
  
  batchCode: b.batchNumber || "",
  manufacturedOn: b.manufacturedOn || "",
  expiresOn: b.expiresOn || "",
  batchQuantity: b.quantity ?? "",

  isActive: v.isActive,
  isSeasonal: v.isSeasonal,
  isFree: v.isFree,

  priceHistories: api.priceHistory || [],

  imageUrl: api.imageUrl,
  additionalImages: api.additionalImages || []
};

fillProductForm(formModel);
updateUIForEditMode();
preloadImagesForEdit(
    api.imageUrl,
    api.additionalImages || []
);

  } catch (err) {
    console.error("Edit load Failed", err);
    toastError("Error loading product for edit");
  }
}

function fillProductForm(p) {  

   isFillingForm = true; 
  const categorySelect = document.getElementById("categorySelect");

  setValue('[name="name"]', p.productName);
  setValue('[name="tags"]', p.tag);
  setValue('[name="shortDesc"]', p.shortDescription);
  setValue('[name="fulldescription"]', p.description);

  setValue('[name="quantity"]', p.weightValue);
  setValue('[name="units"]', p.unit?.toUpperCase());
  setValue('[name="basePrice"]', p.basePrice);
  setValue('[name="initialStock"]', p.initialStock);
  setValue('[name="minStock"]', p.minimumStockLevel);

  if (categorySelect) {
    const trySet = () => {
      categorySelect.value = p.categoryId;
      if (!categorySelect.value) {
        setTimeout(trySet, 50);
      }
    };
    trySet();
  }

 setValue('[name="discType"]', mapDiscountTypeForUI(p.discountType));

  // Set values FIRST
  setValue('[name="discamnt"]', p.discountValue ?? 0);
  setValue('[name="offStartDate"]', p.offerStartDate);
  setValue('[name="offEndDate"]', p.offerEndDate);

  // Apply UI logic AFTER values
  handleDiscountTypeChange();

  


document.querySelector('[name="isactive"]').checked = p.isActive;
document.querySelector('[name="isSeasonal"]').checked = p.isSeasonal;
document.querySelector('[name="isFree"]').checked = p.isFree;

setValue('[name="batchcode"]', p.batchCode);
setValue('[name="manufacturedDate"]', normalizeDate(p.manufacturedOn));
setValue('[name="expiryDate"]', normalizeDate(p.expiresOn));
setValue('[name="batchQuantity"]', p.batchQuantity);

  window.createdProductId = p.productId;
  sessionStorage.setItem("createdProductId", p.productId);

  // ✅ FUTURE PRICE MODE (EDIT CASE)
  if (Array.isArray(p.priceHistories) && p.priceHistories.length > 0) {
    const chk = document.getElementById("uploadPriceCheckbox");
    if (chk) {
      chk.checked = true;
      togglePriceHistoryMode();
    }
  }

  isFillingForm = false; 
}


function updateUIForEditMode() { 
  // 📝 Header text
  const title = document.querySelector("h4");
  if (title) title.innerText = "✏️ Update Product";

  // 🟢 Button text
  const saveBtn = document.getElementById("saveProductBtn");
  if (saveBtn) saveBtn.innerText = "Update Product";

  // 🚫 Hide import (edit mode only)
  document.getElementById("importProductBtn")?.classList.add("d-none");

  // 🔒 LOCK FIELDS (MUST NOT CHANGE IN EDIT MODE)
  [
    "quantity",
    "units",
    "batchcode",
    "manufacturedDate",
    "expiryDate",
    "batchQuantity"
  ].forEach(name => {
    const el = document.querySelector(`[name="${name}"]`);
    if (el) {
      el.disabled = true;
      el.classList.add("bg-light"); // optional visual cue
    }
  });
}

function buildUpdatePayload() {
  const histories = collectFuturePriceHistories();
  const discountType = normalizeDiscountType();

  return {
    categoryId: Number(document.getElementById("categorySelect")?.value),
    productName: getValue('[name="name"]'),
    tag: getValue('[name="tags"]'),
    shortDescription: getValue('[name="shortDesc"]'),
    description: getValue('[name="fulldescription"]'),
    basePrice: Number(getValue('[name="basePrice"]')),
    discountType: discountType,

    discountValue:  discountType === "None"  ? 0 : Number(getValue('[name="discamnt"]')) || 0,

    offerStartDate:  discountType === "None" ? null : toDateTime00(getValue('[name="offStartDate"]')),

    offerEndDate: discountType === "None" ? null : toDateTime00(getValue('[name="offEndDate"]')),
    isActive: isChecked('[name="isactive"]'),
    isSeasonal: isChecked('[name="isSeasonal"]'),
    isFree: isChecked('[name="isFree"]'),
    addStockQuantity: Number(getValue('[name="initialStock"]')) || 0,

    // 🔥 CRITICAL FIX
    ...(histories.length && { priceHistories: histories })
  };
}



function toDateTime00(date) { 
  if (!date) return null;

  const d = new Date(date);
  if (isNaN(d)) return null;

  return d.toISOString().split(".")[0]; // ✅ yyyy-MM-ddTHH:mm:ss
}


const saveProductBtn = document.getElementById("saveProductBtn");
const saveProductLoader = document.getElementById("saveProductLoader");
const saveProductText = document.getElementById("saveProductText");

const saveImagesBtn = document.getElementById("saveProductImagesBtn");
const saveImagesLoader = document.getElementById("saveImagesLoader");
const saveImagesText = document.getElementById("saveImagesText");

function startProductLoader() {
  saveProductBtn.disabled = true;
  saveProductLoader.classList.remove("d-none");
  saveProductText.innerText = isEditMode ? "Updating..." : "Saving...";
}

function stopProductLoader() {
  saveProductBtn.disabled = false;
  saveProductLoader.classList.add("d-none");
  saveProductText.innerText = isEditMode ? "Update Product" : "Save Product";
}

function startImagesLoader() {
  saveImagesBtn.disabled = true;
  saveImagesLoader.classList.remove("d-none");
  saveImagesText.innerText = "Uploading...";
}

function stopImagesLoader() {
  saveImagesBtn.disabled = false;
  saveImagesLoader.classList.add("d-none");
  saveImagesText.innerText = "Save Images";
}
