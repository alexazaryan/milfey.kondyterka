import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
   getAuth,
   signInWithEmailAndPassword,
   signOut,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import {
   getFirestore,
   collection,
   addDoc,
   getDocs,
   deleteDoc,
   doc,
   query,
   orderBy,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

const firebaseConfig = {
   apiKey: "AIzaSyBMScsarZua1lDu29-oc4P74-Km3GItMsg",
   authDomain: "milfey-kondyterka.firebaseapp.com",
   projectId: "milfey-kondyterka",
   storageBucket: "milfey-kondyterka.firebasestorage.app",
   messagingSenderId: "68782081603",
   appId: "1:68782081603:web:c8ebf7a592707fe3cd76f6",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const IMGBB_API_KEY = "b7636e548e191116b0f327bdc1e07423";

/* ===================== ЛОГІН ===================== */
window.login = async function () {
   const email = document.getElementById("email").value;
   const password = document.getElementById("password").value;
   try {
      await signInWithEmailAndPassword(auth, email, password);
      showAdmin();
   } catch (e) {
      document.getElementById("login-error").textContent =
         "Невірний email або пароль";
   }
};

window.logout = async function () {
   await signOut(auth);
   document.getElementById("login-screen").style.display = "flex";
   document.getElementById("admin-screen").style.display = "none";
};

window.togglePassword = function () {
   const input = document.getElementById("password");
   input.type = input.type === "password" ? "text" : "password";
};

/* ===================== ПОКАЗАТИ АДМІНКУ ===================== */
function showAdmin() {
   document.getElementById("login-screen").style.display = "none";
   document.getElementById("admin-screen").style.display = "block";
   loadProducts();
}

/* ===================== СТИСНЕННЯ ФОТО ===================== */
function compressImage(file, maxWidth = 800, quality = 0.82) {
   return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
         URL.revokeObjectURL(url);
         let w = img.width;
         let h = img.height;
         if (w > maxWidth) {
            h = Math.round((h * maxWidth) / w);
            w = maxWidth;
         }
         const canvas = document.createElement("canvas");
         canvas.width = w;
         canvas.height = h;
         canvas.getContext("2d").drawImage(img, 0, 0, w, h);
         resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = url;
   });
}

/* ===================== IMGBB ===================== */
async function uploadPhoto(file) {
   const base64 = await compressImage(file);
   const formData = new FormData();
   formData.append("image", base64.split(",")[1]);
   const res = await fetch(
      `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`,
      { method: "POST", body: formData },
   );
   const data = await res.json();
   return data.data.url;
}

/* ===================== ДОДАТИ ТОВАР ===================== */
window.addProduct = async function () {
   const name = document.getElementById("p-name").value.trim();
   const desc = document.getElementById("p-desc").value.trim();
   const price = document.getElementById("p-price").value.trim();
   const photoFile = document.getElementById("p-photo").files[0];
   const status = document.getElementById("form-status");
   const weight = document.getElementById("p-weight").value.trim();
   const shelf = document.getElementById("p-shelf").value.trim();

   if (!name || !desc || !price || !photoFile) {
      status.textContent = "⚠️ Заповніть всі поля!";
      status.className = "form-status error";
      return;
   }

   status.textContent = "Стиснення та завантаження фото...";
   status.className = "form-status";

   try {
      const photoUrl = await uploadPhoto(photoFile);
      await addDoc(collection(db, "products"), {
         name,
         desc,
         price: Number(price),
         weight,
         shelf,
         photoUrl,
         createdAt: Date.now(),
      });
      status.textContent = "✅ Товар додано!";
      status.className = "form-status success";
      setTimeout(() => {
         status.textContent = "";
         status.className = "form-status";
      }, 4000);
      document.getElementById("p-name").value = "";
      document.getElementById("p-desc").value = "";
      document.getElementById("p-price").value = "";
      document.getElementById("p-photo").value = "";
      document.getElementById("name-count").textContent = "0/35";
      document.getElementById("desc-count").textContent = "0/150";
      document.getElementById("photo-preview").style.display = "none";
      loadProducts();
   } catch (e) {
      status.textContent = "❌ Помилка: " + e.message;
      status.className = "form-status error";
   }
};

/* ===================== СПИСОК ТОВАРІВ ===================== */
async function loadProducts() {
   const list = document.getElementById("products-list");
   list.innerHTML = '<p class="loading">Завантаження...</p>';
   const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
   const snapshot = await getDocs(q);
   if (snapshot.empty) {
      list.innerHTML =
         '<p class="no-products">Товарів ще немає. Додайте перший!</p>';
      return;
   }
   list.innerHTML = "";
   snapshot.forEach((docSnap) => {
      const p = docSnap.data();
      list.innerHTML += `
      <div class="product-card">
        <img src="${p.photoUrl}" alt="${p.name}" />
        <div class="product-info">
          <h4>${p.name}</h4>
          <p>${p.desc}</p>
          <span class="product-price">${p.price} грн</span>
        </div>
        <button class="delete-btn" onclick="deleteProduct('${docSnap.id}')">Видалити</button>
      </div>`;
   });
}

/* ===================== ВИДАЛИТИ ==================== */
window.deleteProduct = async function (id) {
   if (!confirm("Видалити цей товар?")) return;
   await deleteDoc(doc(db, "products", id));
   loadProducts();
};

/* ===================== ЛІЧИЛЬНИКИ ===================== */
document.getElementById("p-name").addEventListener("input", function () {
   document.getElementById("name-count").textContent =
      this.value.length + "/35";
});
document.getElementById("p-desc").addEventListener("input", function () {
   document.getElementById("desc-count").textContent =
      this.value.length + "/150";
});

/* ===================== ПРЕВЬЮ ФОТО ===================== */
document.getElementById("p-photo").addEventListener("change", function () {
   const preview = document.getElementById("photo-preview");
   if (this.files[0]) {
      preview.src = URL.createObjectURL(this.files[0]);
      preview.style.display = "block";
   }
});
