 export function showToast(message, type = "success") {
    const container = document.getElementById("toastContainer");

   const toast = document.createElement("div");
    toast.className = `toast ${type}`;
   toast.innerHTML = `
    <div class="icon">
      ${type === "success" ? "✔" : "✖"}
    </div>
    <div class="message">${message}</div>
  `;

    container.appendChild(toast);

    setTimeout(() => toast.classList.add("show"), 100);
    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 300);
    }, 3000); 
}