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
   updateDoc,
   getDocs,
   deleteDoc,
   doc,
   query,
   orderBy,
   setDoc,
   getDoc,
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

let editingId = null;
let existingPhotos = ["", "", ""]; // фото, які вже збережені (при редагуванні)

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
   loadCoverPhotos();
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

/* ===================== ДОДАТИ / ОНОВИТИ ТОВАР ===================== */
function clearFieldErrors() {
   ["p-name", "p-desc", "p-price", "p-weight"].forEach((id) => {
      document.getElementById(id).classList.remove("field-error");
   });
   document
      .querySelectorAll(".photo-slot-error")
      .forEach((el) => el.classList.remove("photo-slot-error"));
}

window.saveProduct = async function () {
   const name = document.getElementById("p-name").value.trim();
   const desc = document.getElementById("p-desc").value.trim();
   const price = document.getElementById("p-price").value.trim();
   const weight = document.getElementById("p-weight").value.trim();
   const unit = document.getElementById("p-unit").value;
   const category = document.getElementById("p-category").value;
   const badge = document.getElementById("p-badge").value;
   const status = document.getElementById("form-status");

   const photoFiles = [
      document.getElementById("p-photo-0").files[0],
      document.getElementById("p-photo-1").files[0],
      document.getElementById("p-photo-2").files[0],
   ];

   const hasAnyPhoto =
      photoFiles[0] ||
      existingPhotos[0] ||
      existingPhotos[1] ||
      existingPhotos[2];

   clearFieldErrors();
   let hasError = false;

   if (!name) {
      document.getElementById("p-name").classList.add("field-error");
      hasError = true;
   }
   if (!desc) {
      document.getElementById("p-desc").classList.add("field-error");
      hasError = true;
   }
   if (!price) {
      document.getElementById("p-price").classList.add("field-error");
      hasError = true;
   }
   if (!weight) {
      document.getElementById("p-weight").classList.add("field-error");
      hasError = true;
   }
   if (!hasAnyPhoto) {
      document
         .getElementById("p-photo-0")
         .closest(".file-label")
         .classList.add("photo-slot-error");
      hasError = true;
   }

   if (hasError) {
      status.textContent = "⚠️ Заповніть виділені поля!";
      status.className = "form-status error";
      return;
   }

   if (!editingId) {
      const snapshotCount = (await getDocs(collection(db, "products"))).size;
      if (snapshotCount >= PRODUCT_LIMIT) {
         status.textContent =
            "⚠️ Досягнуто ліміт 50 товарів. Зверніться до розробника для збільшення ліміту.";
         status.className = "form-status error";
         return;
      }
   }

   status.textContent = editingId ? "Оновлення..." : "Завантаження фото...";
   status.className = "form-status";

   try {
      // фото: якщо вибрано новий файл — вантажимо, інакше лишаємо старий (при редагуванні)
      const photos = [];
      for (let i = 0; i < 3; i++) {
         if (photoFiles[i]) {
            photos.push(await uploadPhoto(photoFiles[i]));
         } else if (existingPhotos[i]) {
            photos.push(existingPhotos[i]);
         }
      }

      const data = {
         name,
         desc,
         price: Number(price),
         weight,
         unit,
         category,
         badge,
         photos,
         photoUrl: photos[0] || "", // для сумісності зі старими картками
      };

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
   existingPhotos = ["", "", ""];
   document.getElementById("p-name").value = "";
   document.getElementById("p-desc").value = "";
   document.getElementById("p-price").value = "";
   document.getElementById("p-weight").value = "";
   document.getElementById("p-unit").value = "кг";
   document.getElementById("p-category").value = "tort";
   document.getElementById("p-badge").value = "";
   document.getElementById("name-count").textContent = "0/35";
   document.getElementById("desc-count").textContent = "0/500";

   for (let i = 0; i < 3; i++) {
      document.getElementById(`p-photo-${i}`).value = "";
      const prev = document.getElementById(`photo-preview-${i}`);
      prev.style.display = "none";
      prev.src = "";
   }

   document.getElementById("save-btn").textContent = "Додати товар";
   document.getElementById("form-title").textContent = "Додати товар";
}

window.cancelEdit = function () {
   resetForm();
   loadProducts();
};

/* ===================== СПИСОК ТОВАРІВ ===================== */
const CATEGORY_LABELS = {
   tort: "🎂 Вафельні торти",
   horishky: "🥜 Горішки та трубочки",
   pechyvo: "🍪 Печиво та десерти",
};

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
      const mainPhoto = (p.photos && p.photos[0]) || p.photoUrl || "";
      list.innerHTML += `
      <div class="product-card">
        <img src="${mainPhoto}" alt="${p.name}" />
        <div class="product-info">
          <h4>${p.name}</h4>
          <p>${p.desc}</p>
          <span class="product-price">${p.price} грн</span>
          <span class="product-category">${CATEGORY_LABELS[p.category] || "—"}</span>
          ${p.badge === "new" ? '<span class="product-category" style="color:#3bbec4">🆕 Новинка</span>' : ""}
          ${p.badge === "hit" ? '<span class="product-category" style="color:#ff6b9d">🔥 Хіт</span>' : ""}
        </div>
        <div class="card-actions">
          <button class="edit-btn" onclick='editProduct("${docSnap.id}")'>Редагувати</button>
          <button class="delete-btn" onclick="deleteProduct('${docSnap.id}')">Видалити</button>
        </div>
      </div>`;
   });

   checkLimit(snapshot.size);
   window._productsCache = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
   }));
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

/* ===================== ВИДАЛИТИ ===================== */
window.deleteProduct = async function (id) {
   if (!confirm("Видалити цей товар?")) return;
   await deleteDoc(doc(db, "products", id));
   loadProducts();
};

/* ===================== РЕДАГУВАТИ ===================== */
window.editProduct = async function (id) {
   const p = (window._productsCache || []).find((x) => x.id === id);
   if (!p) return;

   editingId = id;
   const photos =
      p.photos && p.photos.length ? p.photos : p.photoUrl ? [p.photoUrl] : [];
   existingPhotos = [photos[0] || "", photos[1] || "", photos[2] || ""];

   document.getElementById("p-name").value = p.name || "";
   document.getElementById("p-desc").value = p.desc || "";
   document.getElementById("p-price").value = p.price || "";
   document.getElementById("p-weight").value = p.weight || "";
   document.getElementById("p-unit").value = p.unit || "кг";
   document.getElementById("p-category").value = p.category || "tort";
   document.getElementById("p-badge").value = p.badge || "";
   document.getElementById("name-count").textContent =
      (p.name || "").length + "/35";
   document.getElementById("desc-count").textContent =
      (p.desc || "").length + "/500";

   for (let i = 0; i < 3; i++) {
      const prev = document.getElementById(`photo-preview-${i}`);
      document.getElementById(`p-photo-${i}`).value = "";
      if (existingPhotos[i]) {
         prev.src = existingPhotos[i];
         prev.style.display = "block";
      } else {
         prev.style.display = "none";
      }
   }

   document.getElementById("save-btn").textContent = "Зберегти зміни";
   document.getElementById("form-title").textContent = "Редагування товару";
   window.scrollTo({ top: 0, behavior: "smooth" });
};

/* ===================== ЛІЧИЛЬНИКИ ===================== */
document.getElementById("p-name").addEventListener("input", function () {
   document.getElementById("name-count").textContent =
      this.value.length + "/35";
   this.classList.remove("field-error");
});
document.getElementById("p-desc").addEventListener("input", function () {
   document.getElementById("desc-count").textContent =
      this.value.length + "/500";
   this.classList.remove("field-error");
});
document.getElementById("p-price").addEventListener("input", function () {
   this.classList.remove("field-error");
});
document.getElementById("p-weight").addEventListener("input", function () {
   this.classList.remove("field-error");
});

/* ===================== ПРЕВЬЮ ФОТО (0,1,2) ===================== */
for (let i = 0; i < 3; i++) {
   document
      .getElementById(`p-photo-${i}`)
      .addEventListener("change", function () {
         const preview = document.getElementById(`photo-preview-${i}`);
         if (this.files[0]) {
            preview.src = URL.createObjectURL(this.files[0]);
            preview.style.display = "block";
            this.closest(".file-label").classList.remove("photo-slot-error");
         }
      });
}

/* ===================== ОБКЛАДИНКИ КАТЕГОРІЙ ===================== */
window.toggleCoverAccordion = function () {
   const body = document.getElementById("cover-accordion-body");
   const arrow = document.getElementById("cover-accordion-arrow");
   const isOpen = body.classList.toggle("open");
   arrow.textContent = isOpen ? "▴" : "▾";
};

const CATEGORY_IDS = ["tort", "horishky", "pechyvo"];
let existingCoverPhotos = { tort: "", horishky: "", pechyvo: "" };

async function loadCoverPhotos() {
   try {
      const snap = await getDoc(doc(db, "settings", "categoryCovers"));
      if (snap.exists()) {
         const data = snap.data();
         CATEGORY_IDS.forEach((id) => {
            existingCoverPhotos[id] = data[id] || "";
            const preview = document.getElementById(`cover-preview-${id}`);
            const removeBtn = document.getElementById(`cover-remove-${id}`);
            if (data[id]) {
               preview.src = data[id];
               preview.style.display = "block";
               removeBtn.style.display = "inline-block";
            } else {
               preview.style.display = "none";
               removeBtn.style.display = "none";
            }
         });
      }
   } catch (e) {
      console.error("Помилка завантаження обкладинок:", e);
   }
}

for (const id of CATEGORY_IDS) {
   document
      .getElementById(`cover-photo-${id}`)
      .addEventListener("change", function () {
         const preview = document.getElementById(`cover-preview-${id}`);
         if (this.files[0]) {
            preview.src = URL.createObjectURL(this.files[0]);
            preview.style.display = "block";
         }
      });
}

window.removeCoverPhoto = function (id) {
   existingCoverPhotos[id] = "";
   document.getElementById(`cover-photo-${id}`).value = "";
   document.getElementById(`cover-preview-${id}`).style.display = "none";
   document.getElementById(`cover-remove-${id}`).style.display = "none";
};

window.saveCoverPhotos = async function () {
   const status = document.getElementById("cover-status");
   status.textContent = "Завантаження...";
   status.className = "form-status";

   try {
      const data = {};
      for (const id of CATEGORY_IDS) {
         const fileInput = document.getElementById(`cover-photo-${id}`);
         if (fileInput.files[0]) {
            data[id] = await uploadPhoto(fileInput.files[0]);
         } else {
            data[id] = existingCoverPhotos[id] || "";
         }
      }

      await setDoc(doc(db, "settings", "categoryCovers"), data);

      existingCoverPhotos = data;
      CATEGORY_IDS.forEach((id) => {
         document.getElementById(`cover-photo-${id}`).value = "";
         const removeBtn = document.getElementById(`cover-remove-${id}`);
         removeBtn.style.display = data[id] ? "inline-block" : "none";
      });

      status.textContent = "✅ Обкладинки збережено!";
      status.className = "form-status success";
      setTimeout(() => {
         status.textContent = "";
         status.className = "form-status";
      }, 4000);
   } catch (e) {
      status.textContent = "❌ Помилка: " + e.message;
      status.className = "form-status error";
   }
};
