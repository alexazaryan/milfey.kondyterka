import { auth, db } from "./firebase.js";
import {
   signInWithEmailAndPassword,
   signOut,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import {
   collection,
   addDoc,
   getDocs,
   deleteDoc,
   doc,
   updateDoc,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

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

/* ===================== IMGBB ===================== */
async function uploadPhoto(file) {
   const base64 = await toBase64(file);
   const formData = new FormData();
   formData.append("image", base64.split(",")[1]);
   const res = await fetch(
      `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`,
      {
         method: "POST",
         body: formData,
      },
   );
   const data = await res.json();
   return data.data.url;
}

function toBase64(file) {
   return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
   });
}

/* ===================== ДОДАТИ ТОВАР ===================== */
window.addProduct = async function () {
   const name = document.getElementById("p-name").value.trim();
   const desc = document.getElementById("p-desc").value.trim();
   const price = document.getElementById("p-price").value.trim();
   const photoFile = document.getElementById("p-photo").files[0];
   const status = document.getElementById("form-status");

   if (!name || !desc || !price || !photoFile) {
      status.textContent = "⚠️ Заповніть всі поля!";
      status.className = "form-status error";
      return;
   }

   status.textContent = "Завантаження фото...";
   status.className = "form-status";

   try {
      const photoUrl = await uploadPhoto(photoFile);
      await addDoc(collection(db, "products"), {
         name,
         desc,
         price: Number(price),
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
      document.getElementById("name-count").textContent = "0/25";
      document.getElementById("desc-count").textContent = "0/100";
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
   const snapshot = await getDocs(collection(db, "products"));
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

/* ===================== ВИДАЛИТИ ===================== */
window.deleteProduct = async function (id) {
   if (!confirm("Видалити цей товар?")) return;
   await deleteDoc(doc(db, "products", id));
   loadProducts();
};

/* ===================== ЛІЧИЛЬНИКИ ===================== */
document.getElementById("p-name").addEventListener("input", function () {
   document.getElementById("name-count").textContent =
      this.value.length + "/25";
});
document.getElementById("p-desc").addEventListener("input", function () {
   document.getElementById("desc-count").textContent =
      this.value.length + "/100";
});

/* ===================== ПРЕВЬЮ ФОТО ===================== */
document.getElementById("p-photo").addEventListener("change", function () {
   const preview = document.getElementById("photo-preview");
   if (this.files[0]) {
      preview.src = URL.createObjectURL(this.files[0]);
      preview.style.display = "block";
   }
});
