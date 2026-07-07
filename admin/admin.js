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
   updateDoc, //редактировать продукт
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
const PRODUCT_LIMIT = 50;

let editingId = null; //редактировать продукт

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
window.saveProduct = async function () {
   const name = document.getElementById("p-name").value.trim();
   const desc = document.getElementById("p-desc").value.trim();
   const price = document.getElementById("p-price").value.trim();
   const photoFile = document.getElementById("p-photo").files[0];
   const status = document.getElementById("form-status");
   const weight = document.getElementById("p-weight").value.trim();

   // фото обязательно только при добавлении нового товара
   if (!name || !desc || !price || (!editingId && !photoFile)) {
      status.textContent = "⚠️ Заповніть всі поля!";
      status.className = "form-status error";
      return;
   }

   // лимит на количество товаров
   if (!editingId) {
      const snapshotCount = (await getDocs(collection(db, "products"))).size;
      if (snapshotCount >= PRODUCT_LIMIT) {
         status.textContent =
            "⚠️ Досягнуто ліміт 50 товарів. Зверніться до розробника для збільшення ліміту.";
         status.className = "form-status error";
         return;
      }
   }

   status.textContent = editingId
      ? "Оновлення..."
      : "Стиснення та завантаження фото...";
   status.className = "form-status";

   try {
      const data = {
         name,
         desc,
         price: Number(price),
         weight,
      };

      // фото грузим только если выбрали новое
      if (photoFile) {
         data.photoUrl = await uploadPhoto(photoFile);
      }

      if (editingId) {
         await updateDoc(doc(db, "products", editingId), data);
         status.textContent = "✅ Товар оновлено!";
      } else {
         data.createdAt = Date.now();
         await addDoc(collection(db, "products"), data);
         status.textContent = "✅ Товар додано!";
      }

      status.className = "form-status success";
      setTimeout(() => {
         status.textContent = "";
         status.className = "form-status";
      }, 4000);

      resetForm();
      loadProducts();
   } catch (e) {
      status.textContent = "❌ Помилка: " + e.message;
      status.className = "form-status error";
   }
};

function resetForm() {
   editingId = null;
   document.getElementById("p-name").value = "";
   document.getElementById("p-desc").value = "";
   document.getElementById("p-price").value = "";
   document.getElementById("p-photo").value = "";
   document.getElementById("p-weight").value = "";
   document.getElementById("name-count").textContent = "0/35";
   document.getElementById("desc-count").textContent = "0/300";
   document.getElementById("photo-preview").style.display = "none";
   document.getElementById("save-btn").textContent = "Додати товар";
   document.getElementById("form-title").textContent = "Додати товар";
}

window.cancelEdit = function () {
   resetForm();
   loadProducts();
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
        <div class="card-actions">
          <button class="edit-btn" onclick='editProduct("${docSnap.id}", ${JSON.stringify(p.name)}, ${JSON.stringify(p.desc)}, ${p.price}, ${JSON.stringify(p.weight || "")}, ${JSON.stringify(p.photoUrl)})'>Редагувати</button>
          <button class="delete-btn" onclick="deleteProduct('${docSnap.id}')">Видалити</button>
        </div>
      </div>`;
   });

   checkLimit(snapshot.size);
}

function checkLimit(count) {
   const saveBtn = document.getElementById("save-btn");
   const limitMsg = document.getElementById("limit-msg");

   if (count >= PRODUCT_LIMIT && !editingId) {
      saveBtn.disabled = true;
      limitMsg.style.display = "block";
   } else {
      saveBtn.disabled = false;
      limitMsg.style.display = "none";
   }
}

/* ===================== ВИДАЛИТИ ==================== */
window.deleteProduct = async function (id) {
   if (!confirm("Видалити цей товар?")) return;
   await deleteDoc(doc(db, "products", id));
   loadProducts();
};

// ===================== РЕДАГУВАТИ продукт ===================== */
window.editProduct = async function (id, name, desc, price, weight, photoUrl) {
   editingId = id;
   document.getElementById("p-name").value = name;
   document.getElementById("p-desc").value = desc;
   document.getElementById("p-price").value = price;
   document.getElementById("p-weight").value = weight;
   document.getElementById("name-count").textContent = name.length + "/35";
   document.getElementById("desc-count").textContent = desc.length + "/300";
   document.getElementById("photo-preview").src = photoUrl;
   document.getElementById("photo-preview").style.display = "block";
   document.getElementById("save-btn").textContent = "Зберегти зміни";
   document.getElementById("form-title").textContent = "Редагування товару";
   window.scrollTo({ top: 0, behavior: "smooth" });
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
