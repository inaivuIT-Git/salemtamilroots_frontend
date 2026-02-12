import { showToast } from "./toast.js";
// UNIVERSAL API CALL HELPER
export async function callApi(url, body = {}, method = "GET") {
    try {
        
        showLoader()
        const options = {
            method: method,
            headers: {
                "Content-Type": "application/json"
            }
        };
        console.log("API CALL:", { url, body, method });

        
        // For POST / PUT / DELETE, send body
        if (method !== "GET") {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(url, options);
        const result = await response.json();

        if (!response.ok) {
            if (response.status === 404 && body?.silent404) {
                return null;
            }
        }

        // middleware success model handling
        if (!result.isSuccess) {
            showToast("Something went wrong!", "error");
            return { success: false,errorMsg:result.error.message };
        }

        return { success: result.isSuccess, data: result.data, error: result.error };

    } catch (err) {
        //showToast("Server unreachable!", "error");
        return { success: false };
    }
    finally{
        hideLoader();
    }
}

// ---------------//
// LOADER 
const loader = document.getElementById("dots-loader");

function showLoader() {
  loader.classList.remove("d-none");
}

function hideLoader() {
  loader.classList.add("d-none");
}
//----------------// 


// UNIVERSAL API CALL HELPER (With & Without Token)
// export async function callApi(url, body = null, method = "GET") {
//     try {
//         showLoader();

//         const token = localStorage.getItem("token"); // may be null

//         const headers = {
//             "Content-Type": "application/json"
//         };

//         // 🔐 Add token only if available
//         if (token) {
//             headers["Authorization"] = `Bearer ${token}`;
//         }

//         const options = {
//             method,
//             headers
//         };

//         console.log("API CALL:", { url, body, method });

//         // Send body only for methods that support it
//         if (body && method !== "GET") {
//             options.body = JSON.stringify(body);
//         }

//         const response = await fetch(url, options);

//         // 🔴 Unauthorized handling
//         if (response.status === 401) {
//             showToast("Please login to continue", "error");
//             return { success: false, unauthorized: true };
//         }

//         // No content
//         if (response.status === 204) {
//             return { success: true };
//         }

//         const result = await response.json();

//         // Handle HTTP errors
//         if (!response.ok) {
//             return {
//                 success: false,
//                 status: response.status,
//                 error: result?.error || "Request failed"
//             };
//         }

//         // Backend success flag check
//         if (result?.isSuccess === false) {
//             showToast(result?.error || "Something went wrong!", "error");
//             return { success: false };
//         }

//         return {
//             success: true,
//             data: result.data,
//             error: result.error
//         };

//     } catch (err) {
//         console.error("API Error:", err);
//         showToast("Server unreachable!", "error");
//         return { success: false };
//     } finally {
//         hideLoader();
//     }
// }

// // ----------------
// // LOADER
// const loader = document.getElementById("dots-loader");

// function showLoader() {
//     loader?.classList.remove("d-none");
// }

// function hideLoader() {
//     loader?.classList.add("d-none");
// }
