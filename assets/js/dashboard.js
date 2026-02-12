console.log("📊 dashboard.js loaded");

let orderPieChart = null;

/* ================= DASHBOARD ENTRY ================= */

window.loadSellerDashboard = async function () {
  const auth = getAuthOrRedirect();
  if (!auth) return;

  try {
    const res = await fetch(`${API_BASE}/api/seller/dashboard`, {
      headers: {
        "X-User-Id": auth.userId
      }
    });

    if (!res.ok) throw new Error("Dashboard API failed");

    const json = await res.json();
    const data = json.data;

    if (!data) return;

    document.getElementById("sellername").textContent = data.sellerName || "Seller";
    document.getElementById("businessName").textContent =data.businessName || "Business";

    // 🔢 TOP CARDS
    document.getElementById("dashboardProductCount").textContent =
      data.totalProducts ?? 0;

    document.getElementById("dashboardTodaysorder").textContent =
      data.todaysOrders ?? 0;

    // 📊 PIE
    renderOrderPie({
      new: data.newOrders,
      pending: data.pendingOrders,
      completed: data.completedOrders,
      returned: data.returnOrders
    });

    console.log("📊 Dashboard data:", data);

  } catch (err) {
    console.error("Dashboard load failed:", err);
    toastError("Failed to load dashboard");
  }
};


/* ================= PIE CHART ================= */

function renderOrderPie(stats) {
  const canvas = document.getElementById("orderChart");
  const card = document.querySelector(".order-status-card");
  const emptyMsg = document.getElementById("noOrderMsg");

  if (!canvas || !stats) return;

  const values = [
    stats.new || 0,
    stats.pending || 0,
    stats.completed || 0,
    stats.returned || 0
  ];

  const total = values.reduce((a, b) => a + b, 0);

  // 💤 No orders
  if (total === 0) {
    card?.classList.add("d-none");
    emptyMsg?.classList.remove("d-none");

    if (orderPieChart) {
      orderPieChart.destroy();
      orderPieChart = null;
    }
    return;
  }

  emptyMsg?.classList.add("d-none");
  card?.classList.remove("d-none");

  const labels = ["New", "Pending", "Completed", "Returned"];

  if (orderPieChart) orderPieChart.destroy();

  orderPieChart = new Chart(canvas, {
    type: "pie",
    data: {
      labels,
      datasets: [{ data: values }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "bottom" }
      },
      onClick: (evt, elements) => {
        if (!elements.length) return;
        const map = ["new", "pending", "completed", "returned"];
        location.hash = `#/orders?stat=${map[elements[0].index]}`;
      }
    }
  });
}
