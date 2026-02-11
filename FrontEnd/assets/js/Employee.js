/* ========= EMPLOYEE DATA (GLOBAL) ========= */
window.employees = [
    {
        id: 1,
        empId: "EMP001",
        name: "Priya Sharma",
        email: "priya@company.com",
        phone: "9876543210",
        role: "Sales Executive",
        department: "Sales",
        status: "Active"
    },
    {
        id: 2,
        empId: "EMP002",
        name: "Rahul Kumar",
        email: "rahul@company.com",
        phone: "9123456789",
        role: "Inventory Manager",
        department: "Warehouse",
        status: "Inactive"
    }
];

/* ========= LOAD EMPLOYEES ========= */
function loadSellerEmployees() {

    const tbody = document.getElementById("employeeTableBody");
    if (!tbody) return;

    tbody.innerHTML = "";

    employees.forEach(e => {
        tbody.innerHTML += `
            <tr class="employee-row" data-id="${e.empId}">
                <td>${e.id}</td>
                <td>${e.empId}</td>
                <td>${e.name}</td>
                <td>${e.role}</td>
                <td>${e.department}</td>
                <td>
                    <span class="badge ${
                        e.status === "Active" ? "bg-success" : "bg-secondary"
                    }">${e.status}</span>
                </td>
            </tr>
        `;
    });
}


document.addEventListener("click", (e) => {
    const row = e.target.closest(".employee-row");
    if (!row) return;

    const empId = row.dataset.id;
    const emp = employees.find(e => e.empId === empId);
    if (!emp) return;

    document.getElementById("modalEmployeeId").textContent = emp.empId;

    // View fields
    empName.textContent = emp.name;
    empEmail.textContent = emp.email;
    empPhone.textContent = emp.phone;
    empRole.textContent = emp.role;
    empDept.textContent = emp.department;
    empStatus.textContent = emp.status;

    // Edit fields
    editEmpName.value = emp.name;
    editEmpEmail.value = emp.email;
    editEmpPhone.value = emp.phone;
    editEmpRole.value = emp.role;
    editEmpDept.value = emp.department;
    editEmpStatus.value = emp.status;

    // Attach ID to edit button
    document.querySelector(".edit-employee-btn").dataset.id = emp.empId;

    new bootstrap.Modal(
        document.getElementById("employeeDetailModal")
    ).show();
});

document.addEventListener("click" ,(e) => {
    // ENTER EDIT MODE
    if(e.target.closest(".edit-employee-btn")){
        document.querySelectorAll(".view-field").forEach(el => el.classList.add("d-none"));
        document.querySelectorAll(".edit-field").forEach(el => el.classList.remove("d-none"));

        document.querySelector(".edit-employee-btn").classList.add("d-none");
        document.querySelector(".save-employee-btn").classList.remove("d-none");
    }

     // SAVE CHANGES

     if(e.target.closest(".save-employee-btn")){
        const empId = document.querySelector(".edit-employee-btn").dataset.id;
        const emp = employees.find(e => e.empId === empId);
        if(!emp) return;

        emp.name = editEmpName.value;
        emp.email = editEmpEmail.value;
        emp.phone = editEmpPhone.value;
        emp.role = editEmpRole.value;
        emp.department = editEmpDept.value;
        emp.status = editEmpStatus.value;

        loadSellerEmployees();


        // Exit edit mode
        document.querySelectorAll(".view-field").forEach(el => el.classList.remove("d-none"));
        document.querySelectorAll(".edit-field").forEach(el => el.classList.add("d-none"));

        document.querySelector(".edit-employee-btn").classList.remove("d-none");
        document.querySelector(".save-employee-btn").classList.add("d-none");

        bootstrap.Modal.getInstance(document.getElementById("employeeDetailModal")).hide();
     }
});
