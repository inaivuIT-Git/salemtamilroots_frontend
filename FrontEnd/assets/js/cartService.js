 import { callApi } from "./callApi.js";

export async function fetchCartSummary() {
  const userId = localStorage.getItem("userId");

  // 🔐 Not logged in → empty cart
  if (!userId) {
    return { totalItems: 0 };
  }

  const result = await callApi(`${API_BASE_URL}/api/cart/${userId}`, null, "GET",{ silent404: true } );

  // 🟢 Cart not created yet OR empty cart
  if (!result || !result.success || !result.data) {
    return { totalItems: 0 };
  }

  // ✅ Normal case
  return result.data.summary ?? { totalItems: 0 };
}
