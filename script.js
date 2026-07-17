import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
   getFirestore,
   collection,
   getDocs,
   query,
   orderBy,
   doc,
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
const db = getFirestore(app);

/* ======================
   CATEGORIES
   ====================== */
const CATEGORIES = [
   {
      id: "tort",
      name: "Вафельні торти",
      slogan: "Свято, доступне щодня",
      emoji: "🎂",
   },
   {
      id: "horishky",
      name: "Горішки та трубочки",
      slogan: "Улюблений смак з дитинства",
      emoji: "🥜",
   },
   {
      id: "pechyvo",
      name: "Печиво та десерти",
      slogan: "Вже захочеш ще",
      emoji: "🍪",
   },
];

/* ======================
   CART STATE
   ====================== */
let cart = {};
let products = [];

/* catalog navigation state */
let catalogState = { view: "categories", category: null, product: null };
let galleryIndex = 0;
let categoryCovers = {}; // кастомні обкладинки з адмінки

/* чи вже виконали початкову маршрутизацію за URL (щоб не робити це двічі) */
let initialRouteApplied = false;

/* ======================
   ROUTING (реальні URL для категорій і товарів)
   ====================== */

/* перетворює поточний catalogState у шлях URL */
function stateToPath(state) {
   if (state.view === "list" && state.category) {
      return `/catalog/${state.category}`;
   }
   if (state.view === "detail" && state.category && state.product) {
      return `/product/${state.category}/${state.product}`;
   }
   return "/";
}

/* записує URL в адресний рядок без перезавантаження сторінки */
function pushRoute(state) {
   const path = stateToPath(state);
   if (window.location.pathname !== path) {
      window.history.pushState(null, "", path);
   }
   updateMetaForState(state);
}

/* оновлює <title> під поточний екран (проста SEO-допомога) */
function updateMetaForState(state) {
   if (state.view === "detail" && state.product) {
      const p = products.find((x) => x.id === state.product);
      if (p) {
         document.title = `${p.name} — Milfey`;
         return;
      }
   }
   if (state.view === "list" && state.category) {
      const cat = categoryInfo(state.category);
      if (cat) {
         document.title = `${cat.name} — Milfey`;
         return;
      }
   }
   document.title = "Milfey — Вафельні торти";
}

/* читає поточний URL і виставляє catalogState (виклик при першому завантаженні та на popstate) */
function applyRouteFromLocation(scroll) {
   const parts = window.location.pathname.split("/").filter(Boolean);

   if (parts[0] === "product" && parts[1] && parts[2]) {
      const cat = categoryInfo(parts[1]);
      const exists = products.some((p) => p.id === parts[2]);
      if (cat && exists) {
         catalogState = {
            view: "detail",
            category: parts[1],
            product: parts[2],
         };
         galleryIndex = 0;
         renderProducts();
         updateMetaForState(catalogState);
         if (scroll) document.getElementById("catalog").scrollIntoView();
         return;
      }
   }

   if (parts[0] === "catalog" && parts[1]) {
      const cat = categoryInfo(parts[1]);
      if (cat) {
         catalogState = { view: "list", category: parts[1], product: null };
         renderProducts();
         updateMetaForState(catalogState);
         if (scroll) document.getElementById("catalog").scrollIntoView();
         return;
      }
   }

   // невідомий або кореневий шлях — показуємо категорії
   catalogState = { view: "categories", category: null, product: null };
   renderProducts();
   updateMetaForState(catalogState);
}

/* назад/вперед у браузері */
window.addEventListener("popstate", () => {
   applyRouteFromLocation(false);
});

/* ======================
   LOAD CATEGORY COVERS
   ====================== */
async function loadCategoryCovers() {
   try {
      const snap = await getDoc(doc(db, "settings", "categoryCovers"));
      if (snap.exists()) categoryCovers = snap.data();
   } catch (e) {
      console.error("Помилка завантаження обкладинок:", e);
   }
}

/* ======================
   LOAD PRODUCTS FROM FIREBASE
   ====================== */
async function loadProducts() {
   try {
      await loadCategoryCovers();
      const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      products = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      if (!initialRouteApplied) {
         initialRouteApplied = true;
         applyRouteFromLocation(false);
      } else {
         renderProducts();
      }
   } catch (e) {
      console.error("Помилка завантаження товарів:", e);
      if (!initialRouteApplied) {
         initialRouteApplied = true;
         applyRouteFromLocation(false);
      } else {
         renderProducts();
      }
   }
}

/* ======================
   HELPERS
   ====================== */
function getPhotos(p) {
   if (Array.isArray(p.photos) && p.photos.length) return p.photos;
   if (p.photoUrl) return [p.photoUrl];
   return [];
}

function getMainPhoto(p) {
   return getPhotos(p)[0] || "";
}

function categoryInfo(id) {
   return CATEGORIES.find((c) => c.id === id);
}

/* ======================
   MAIN RENDER SWITCH
   ====================== */
function renderProducts() {
   const grid = document.getElementById("productGrid");

   if (catalogState.view === "categories") renderCategoriesView(grid);
   else if (catalogState.view === "list") {
      renderListView(grid);
      animateCards();
   } else if (catalogState.view === "detail") renderDetailView(grid);
}

/* ======================
   VIEW 1: CATEGORIES
   ====================== */
function renderCategoriesView(grid) {
   grid.innerHTML = `<div class="category-grid">${CATEGORIES.map((c) => {
      const photo = categoryCoverPhoto(c.id);
      return `
    <div class="category-card" onclick="selectCategory('${c.id}')">
      <div class="category-card-anim">
        <div class="category-cover" data-cat="${c.id}" ${photo ? `data-lazy-cover="${photo}"` : ""}>
          <div class="category-cover-icon">${c.emoji}</div>
          <div class="category-cover-overlay"></div>
          <div class="category-cover-content">
            <div class="category-cover-name">${c.name}</div>
            <div class="category-cover-slogan">${c.slogan}</div>
            <button class="btn-teal category-cover-btn" onclick="event.stopPropagation(); selectCategory('${c.id}')">Замовити</button>
          </div>
        </div>
      </div>
    </div>`;
   }).join("")}</div>`;

   lazyLoadCategoryCovers();
}

/* ліниве завантаження фото обкладинок — вантажимо, коли блок видно на ~15% */
function lazyLoadCategoryCovers() {
   const covers = document.querySelectorAll(".category-cover[data-lazy-cover]");
   if (!covers.length) return;

   if (!("IntersectionObserver" in window)) {
      covers.forEach((el) => {
         el.style.setProperty(
            "--cover-photo",
            `url('${el.dataset.lazyCover}')`,
         );
         el.classList.add("has-photo");
      });
      return;
   }

   const io = new IntersectionObserver(
      (entries) => {
         entries.forEach((entry) => {
            if (entry.isIntersecting) {
               const el = entry.target;
               el.style.setProperty(
                  "--cover-photo",
                  `url('${el.dataset.lazyCover}')`,
               );
               el.classList.add("has-photo");
               io.unobserve(el);
            }
         });
      },
      { threshold: 0.15 },
   );

   covers.forEach((el) => io.observe(el));
}

/* обкладинка категорії: спочатку кастомне фото з адмінки, інакше — перше фото товару цієї категорії */
function categoryCoverPhoto(catId) {
   if (categoryCovers[catId]) return categoryCovers[catId];
   const first = products.find((p) => p.category === catId);
   return first ? getMainPhoto(first) : "";
}

window.selectCategory = function (catId) {
   catalogState = { view: "list", category: catId, product: null };
   pushRoute(catalogState);
   renderProducts();
   document.getElementById("catalog").scrollIntoView({ behavior: "smooth" });
};

/* ======================
   VIEW 2: PRODUCT LIST (по категорії)
   ====================== */

function truncate(text, max) {
   if (!text) return "";
   return text.length > max ? text.slice(0, max).trim() + "…" : text;
}
function renderListView(grid) {
   const cat = categoryInfo(catalogState.category);
   const list = products.filter((p) => p.category === catalogState.category);

   const header = `
    <div class="catalog-nav">
      <button class="catalog-back" onclick="backToCategories()">←</button>
      <div class="catalog-nav-title">${cat ? cat.emoji + " " + cat.name : "Товари"}</div>
    </div>
    <div class="catalog-breadcrumbs">Каталог › ${cat ? cat.name : ""}</div>`;

   if (!list.length) {
      grid.innerHTML = `${header}
        <div class="products-empty">
          <div class="products-empty-icon">🧇</div>
          <p class="products-empty-title">У цій категорії поки немає товарів</p>
        </div>`;
      return;
   }

   grid.innerHTML = `${header}<div class="products">${list
      .map(
         (p, i) => `
    <div class="card" style="transition-delay:${i * 100}ms" onclick="selectProduct('${p.id}')">
      <div class="card-img">
        <img src="${getMainPhoto(p)}" alt="${p.name}" loading="lazy" />
        ${p.badge ? `<div class="product-badge badge-${p.badge}">${p.badge === "new" ? "🆕 Новинка" : "🔥 Хіт продажів"}</div>` : ""}
      </div>
    <div class="card-body">
        <div class="card-name">${p.name}</div>
        <div class="card-desc">${truncate(p.desc, 60)}</div>
        <div class="card-footer">
          <div class="price">${p.price} <small>грн</small></div>
          <span class="card-details-link">Детальніше →</span>
        </div>
      </div>
    </div>`,
      )
      .join("")}</div>`;
}

window.backToCategories = function () {
   catalogState = { view: "categories", category: null, product: null };
   pushRoute(catalogState);
   renderProducts();
   document.getElementById("catalog").scrollIntoView({ behavior: "smooth" });
};

/* ======================
   VIEW 3: PRODUCT DETAIL
   ====================== */
window.selectProduct = function (id) {
   const p = products.find((x) => x.id === id);
   catalogState = {
      view: "detail",
      category: p ? p.category : catalogState.category,
      product: id,
   };
   pushRoute(catalogState);
   galleryIndex = 0;
   renderProducts();
   document.getElementById("catalog").scrollIntoView({ behavior: "smooth" });
};

window.backToList = function () {
   catalogState = {
      view: "list",
      category: catalogState.category,
      product: null,
   };
   pushRoute(catalogState);
   renderProducts();
   document.getElementById("catalog").scrollIntoView({ behavior: "smooth" });
};

function renderDetailView(grid) {
   const p = products.find((x) => x.id === catalogState.product);
   if (!p) {
      grid.innerHTML = "";
      catalogState = { view: "categories", category: null, product: null };
      pushRoute(catalogState);
      renderProducts();
      return;
   }
   const cat = categoryInfo(p.category);
   const photos = getPhotos(p);
   if (galleryIndex >= photos.length) galleryIndex = 0;

   const thumbs = photos
      .map(
         (url, i) => `
    <div class="gallery-thumb ${i === galleryIndex ? "active" : ""}" onclick="setGalleryIndex(${i})">
      <img src="${url}" alt="${p.name}" />
    </div>`,
      )
      .join("");

   grid.innerHTML = `
    <div class="catalog-nav">
      <button class="catalog-back" onclick="backToList()">←</button>
      <div class="catalog-nav-title">Назад до ${cat ? cat.name : "каталогу"}</div>
    </div>
    <div class="catalog-breadcrumbs">Каталог › ${cat ? cat.name : ""} › ${p.name}</div>
    <div class="product-detail">
      <div class="product-detail-gallery">
        <div class="product-detail-main" onclick="openLightbox()">
          <img src="${photos[galleryIndex] || ""}" alt="${p.name}" />
          <div class="zoom-hint">🔍</div>
          ${p.badge ? `<div class="product-badge badge-${p.badge}">${p.badge === "new" ? "🆕 Новинка" : "🔥 Хіт продажів"}</div>` : ""}
        </div>
        ${photos.length > 1 ? `<div class="gallery-thumbs">${thumbs}</div>` : ""}
      </div>
      <div class="product-detail-info">
        <h2 class="product-detail-name">${p.name}</h2>
        <p class="product-detail-desc">${p.desc}</p>
        <div class="product-detail-weight">
          ${p.weight ? "Вага: " + p.weight + (p.unit ? " " + p.unit : "") : ""}
        </div>
        <div class="product-detail-price">${p.price} <small>грн</small></div>
       <button class="btn-teal btn-full ${cart[p.id] ? "added" : ""}" id="btn-${p.id}" onclick="addToCart('${p.id}')">${cart[p.id] ? "✓ Додано" : '<i class="ti ti-shopping-cart"></i> В кошик'}</button>

        <div class="detail-spacer"></div>

        <div class="product-detail-delivery">
          <div class="delivery-info-title">🚚 Доставка та самовивіз</div>
          <div class="delivery-item">
            <span class="delivery-icon">📦</span>
            <div>
              <div class="delivery-name">Нова Пошта — від 700 грн</div>
              <div class="delivery-sub">Пакування за наш рахунок, доставка за ваш</div>
            </div>
          </div>
          <div class="delivery-item">
            <span class="delivery-icon">🏙️</span>
            <div>
              <div class="delivery-name">По Києву — від 900 грн</div>
              <div class="delivery-sub">Доставка безкоштовна</div>
            </div>
          </div>
          <div class="delivery-item">
            <span class="delivery-icon">🏠</span>
            <div>
              <div class="delivery-name">Самовивіз</div>
              <div class="delivery-sub">вул. Вікентія Хвойки 18/14, корпус 9<br>Пн–Пт, з 9:00 до 17:00</div>
            </div>
          </div>
        </div>
      </div>
    </div>`;
}

window.setGalleryIndex = function (i) {
   galleryIndex = i;
   renderDetailView(document.getElementById("productGrid"));
};

/* ======================
   LIGHTBOX (повноекранний перегляд фото)
   ====================== */
let lightboxIndex = 0;

function ensureLightboxDOM() {
   if (document.getElementById("lightboxOverlay")) return;

   const overlay = document.createElement("div");
   overlay.id = "lightboxOverlay";
   overlay.className = "lightbox-overlay";
   overlay.innerHTML = `
    <button class="lightbox-close" onclick="closeLightbox()">✕</button>
    <button class="lightbox-arrow lightbox-prev" onclick="lightboxPrev(event)">‹</button>
    <img class="lightbox-img" id="lightboxImg" src="" alt="" />
    <button class="lightbox-arrow lightbox-next" onclick="lightboxNext(event)">›</button>
   `;
   overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeLightbox();
   });
   document.body.appendChild(overlay);

   /* свайп на мобілці всередині лайтбоксу */
   let startX = 0;
   overlay.addEventListener(
      "touchstart",
      (e) => {
         startX = e.touches[0].clientX;
      },
      { passive: true },
   );
   overlay.addEventListener(
      "touchend",
      (e) => {
         const endX = e.changedTouches[0].clientX;
         const delta = endX - startX;
         if (delta > 60) lightboxPrev();
         else if (delta < -60) lightboxNext();
      },
      { passive: true },
   );
}

window.openLightbox = function () {
   const p = products.find((x) => x.id === catalogState.product);
   if (!p) return;
   const photos = getPhotos(p);
   if (!photos.length) return;

   ensureLightboxDOM();
   lightboxIndex = galleryIndex;
   document.getElementById("lightboxImg").src = photos[lightboxIndex];
   document.getElementById("lightboxOverlay").classList.add("open");
   document.body.style.overflow = "hidden";
};

window.closeLightbox = function () {
   const overlay = document.getElementById("lightboxOverlay");
   if (overlay) overlay.classList.remove("open");
   document.body.style.overflow = "";
};

window.lightboxNext = function (e) {
   if (e) e.stopPropagation();
   const p = products.find((x) => x.id === catalogState.product);
   if (!p) return;
   const photos = getPhotos(p);
   lightboxIndex = (lightboxIndex + 1) % photos.length;
   document.getElementById("lightboxImg").src = photos[lightboxIndex];
};

window.lightboxPrev = function (e) {
   if (e) e.stopPropagation();
   const p = products.find((x) => x.id === catalogState.product);
   if (!p) return;
   const photos = getPhotos(p);
   lightboxIndex = (lightboxIndex - 1 + photos.length) % photos.length;
   document.getElementById("lightboxImg").src = photos[lightboxIndex];
};

document.addEventListener("keydown", (e) => {
   const overlay = document.getElementById("lightboxOverlay");
   if (!overlay || !overlay.classList.contains("open")) return;
   if (e.key === "Escape") closeLightbox();
   if (e.key === "ArrowRight") lightboxNext();
   if (e.key === "ArrowLeft") lightboxPrev();
});

/* ======================
   CARD ANIMATION
   ====================== */
function animateCards() {
   const cards = document.querySelectorAll(".card");
   if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(
         (entries) => {
            entries.forEach((e) => {
               if (e.isIntersecting) {
                  e.target.classList.add("visible");
                  io.unobserve(e.target);
               }
            });
         },
         { threshold: 0.1 },
      );
      cards.forEach((c) => io.observe(c));
   } else {
      cards.forEach((c) => c.classList.add("visible"));
   }
}

/* ======================
   CART
   ====================== */
window.addToCart = function (id) {
   if (cart[id]) return;
   cart[id] = 1;
   updateCartUI();
   const btn = document.getElementById("btn-" + id);
   if (btn) {
      btn.textContent = "✓ Додано";
      btn.classList.add("added");
   }
};

window.changeQty = function (id, delta) {
   if (!cart[id]) return;
   cart[id] += delta;
   if (cart[id] <= 0) {
      delete cart[id];
      const btn = document.getElementById("btn-" + id);
      if (btn) {
         btn.textContent = "В кошик";
         btn.classList.remove("added");
      }
   }
   updateCartUI();
};

function updateCartUI() {
   const total = Object.values(cart).reduce((a, b) => a + b, 0);
   const desktopCount = document.getElementById("cartCountDesktop");
   const mobileCount = document.getElementById("cartCountMobile");
   desktopCount.textContent = total;
   mobileCount.textContent = total;
   desktopCount.classList.toggle("has-items", total > 0);
   mobileCount.classList.toggle("has-items", total > 0);
   renderCartItems();
}

function renderCartItems() {
   const body = document.getElementById("drawerBody");
   const foot = document.getElementById("drawerFoot");
   const keys = Object.keys(cart);

   if (!keys.length) {
      body.innerHTML = `
      <div class="drawer-empty">
        <div style="font-size:56px;margin-bottom:16px;">🛒</div>
        <p style="font-size:16px;font-weight:900;color:#1a3335;margin-bottom:8px;">Кошик порожній</p>
        <p style="font-size:14px;color:#4a7a7c;">Додайте щось смачне<br>з нашого каталогу!</p>
        <button class="btn-teal" onclick="toggleCart()" style="margin-top:20px;padding:10px 24px;font-size:14px;">Перейти до каталогу</button>
      </div>`;
      foot.style.display = "none";
      return;
   }

   let sum = 0,
      html = "";
   keys.forEach((id) => {
      const p = products.find((x) => x.id === id);
      if (!p) return;
      const qty = cart[id];
      sum += p.price * qty;
      html += `
      <div class="cart-item">
        <div class="cart-item-icon"><img src="${getMainPhoto(p)}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover;border-radius:10px;" /></div>
        <div class="cart-item-info">
          <div class="cart-item-name">${p.name}</div>
          <div class="cart-item-price">${p.price} грн × ${qty} = ${p.price * qty} грн</div>
        </div>
        <div class="qty-ctrl">
          <button class="qty-btn" onclick="changeQty('${id}',-1)">−</button>
          <span class="qty-num">${qty}</span>
          <button class="qty-btn" onclick="changeQty('${id}',1)">+</button>
        </div>
      </div>`;
   });

   body.innerHTML = html;
   foot.style.display = "";
   document.getElementById("totalPrice").textContent = sum + " грн";
}

/* ======================
   DRAWER / SCREENS
   ====================== */
window.toggleCart = function () {
   const isOpen = document.getElementById("drawer").classList.contains("open");
   document.getElementById("drawer").classList.toggle("open");
   document.getElementById("drawerOverlay").classList.toggle("open");
   document.body.style.overflow = isOpen ? "" : "hidden";
   if (!isOpen) showScreen("screenCart", "left");

   const callBtn = document.getElementById("callBtn");
   if (callBtn) callBtn.style.display = isOpen ? "" : "none";
};

window.showScreen = function (toId, dir) {
   if (!dir) dir = "right";
   document.querySelectorAll(".drawer-screen").forEach((s) => {
      s.classList.remove("active", "left", "right");
      s.classList.add(
         s.id === toId ? "active" : dir === "right" ? "left" : "right",
      );
   });
   if (toId === "screenOrder") fillOrderSummary();
};

function fillOrderSummary() {
   const keys = Object.keys(cart);
   let sum = 0,
      html = "";
   keys.forEach((id) => {
      const p = products.find((x) => x.id === id);
      if (!p) return;
      const qty = cart[id];
      sum += p.price * qty;
      html += `<div class="order-summary-item"><span>${p.name} × ${qty}</span><span>${p.price * qty} грн</span></div>`;
   });
   html += `<div class="order-summary-total"><span>Разом</span><span>${sum} грн</span></div>`;
   document.getElementById("orderSummary").innerHTML =
      '<div class="order-summary-title">Ваше замовлення</div>' + html;
}

/* ======================
   TELEGRAM
   ====================== */
async function sendToTelegram(text) {
   await sendTelegramNotification({ Замовлення: text }, "Milfey");
}

/* ======================
   ORDER FORM
   ====================== */
window.submitOrder = async function () {
   const fields = [
      { id: "fName" },
      { id: "fLastName" },
      { id: "fPhone" },
      { id: "fCity" },
      { id: "fNova" },
   ];

   let hasError = false;
   fields.forEach((f) => {
      const el = document.getElementById(f.id);
      const val = el.value.trim();
      if (!val || (f.id === "fPhone" && val.replace(/\D/g, "").length < 10)) {
         el.classList.add("error");
         el.addEventListener("input", () => el.classList.remove("error"), {
            once: true,
         });
         hasError = true;
      } else {
         el.classList.remove("error");
      }
   });

   if (hasError) return;

   const name = document.getElementById("fName").value.trim();
   const lastName = document.getElementById("fLastName").value.trim();
   const phone = document.getElementById("fPhone").value.trim();
   const email = document.getElementById("fEmail").value.trim();
   const city = document.getElementById("fCity").value.trim();
   const nova = document.getElementById("fNova").value.trim();
   const comment = document.getElementById("fComment").value.trim();

   let orderText = `🛒 <b>Нове замовлення!</b>\n\n`;
   orderText += `👤 <b>Клієнт:</b> ${name} ${lastName}\n`;
   orderText += `📞 <b>Телефон:</b> ${phone}\n`;
   if (email) orderText += `✉️ <b>Email:</b> ${email}\n`;
   orderText += `📍 <b>Місто:</b> ${city}\n`;
   orderText += `📦 <b>Відділення НП:</b> ${nova}\n`;
   if (comment) orderText += `💬 <b>Коментар:</b> ${comment}\n`;
   orderText += `\n🧇 <b>Товари:</b>\n`;

   let sum = 0;
   Object.keys(cart).forEach((id) => {
      const p = products.find((x) => x.id === id);
      if (!p) return;
      const qty = cart[id];
      sum += p.price * qty;
      orderText += `• ${p.name} × ${qty} = ${p.price * qty} грн\n`;
   });
   orderText += `\n💰 <b>Разом: ${sum} грн</b>`;

   await sendToTelegram(orderText);

   cart = {};
   updateCartUI();
   document.querySelectorAll(".add-btn").forEach((btn) => {
      btn.textContent = "В кошик";
      btn.classList.remove("added");
   });
   showScreen("screenSuccess", "right");
};

/* ======================
   ABOUT MODAL
   ====================== */
window.toggleAbout = function () {
   document.getElementById("aboutOverlay").classList.toggle("open");
   const isOpen = document
      .getElementById("aboutOverlay")
      .classList.contains("open");
   document.body.style.overflow = isOpen ? "hidden" : "";

   const callBtn = document.getElementById("callBtn");
   if (callBtn) callBtn.style.display = isOpen ? "none" : "";
};

window.closeOnBg = function (e, id, fn) {
   if (e.target.id === id) fn();
};

/* ======================
   MOBILE MENU
   ====================== */
window.toggleMenu = function () {
   document.getElementById("mobileMenu").classList.toggle("open");
   document.getElementById("burgerBtn").classList.toggle("open");
};

/* ======================
   PHONE PREFIX
   ====================== */
function initPhone() {
   const ph = document.getElementById("fPhone");
   if (!ph) return;
   ph.value = "+380";
   ph.addEventListener("focus", function () {
      if (!this.value) this.value = "+380";
   });
}

/* ======================
   SWIPE BACK (mobile)
   ====================== */
function initSwipeBack() {
   const grid = document.getElementById("productGrid");
   if (!grid) return;

   let startX = 0;
   let startY = 0;
   let tracking = false;

   grid.addEventListener(
      "touchstart",
      (e) => {
         if (catalogState.view === "categories") return;
         startX = e.touches[0].clientX;
         startY = e.touches[0].clientY;
         tracking = true;
      },
      { passive: true },
   );

   grid.addEventListener(
      "touchend",
      (e) => {
         if (!tracking) return;
         tracking = false;
         const endX = e.changedTouches[0].clientX;
         const endY = e.changedTouches[0].clientY;
         const deltaX = endX - startX;
         const deltaY = endY - startY;

         // свайп вправо (палець зліва направо), переважно горизонтальний рух
         if (deltaX > 70 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
            if (catalogState.view === "detail") backToList();
            else if (catalogState.view === "list") backToCategories();
         }
      },
      { passive: true },
   );
}

/* ======================
   INIT
   ====================== */
initPhone();
renderCartItems();
loadProducts();
initSwipeBack();

/* ======================
   HERO PARALLAX 3D
   ====================== */
const heroImg = document.querySelector(".hero-img img");
if (heroImg) {
   document.querySelector(".hero").addEventListener("mousemove", (e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      heroImg.style.transform = `
   translate(${x * 60}px, ${y * 40}px)
   rotateY(${x * 30}deg)
   rotateX(${-y * 30}deg)
   scale(${1 + Math.abs(x) * 0.1 + Math.abs(y) * 0.1})
`;
   });
   document.querySelector(".hero").addEventListener("mouseleave", () => {
      heroImg.style.transform = "translate(0,0) rotateY(0) rotateX(0) scale(1)";
   });
}

// FAQ
window.toggleFaq = function (btn) {
   const item = btn.closest(".faq-item");
   const wasOpen = item.classList.contains("open");
   document
      .querySelectorAll(".faq-item.open")
      .forEach((el) => el.classList.remove("open"));
   if (!wasOpen) item.classList.add("open");
};

/* ======================
   PARTNER BANNER / FORM
   ====================== */
setTimeout(() => {
   const banner = document.getElementById("partnerBanner");
   if (banner) banner.classList.add("show");
}, 3000);

window.closePartnerBanner = function (e) {
   e.stopPropagation();
   document.getElementById("partnerBanner").classList.remove("show");
};

window.openPartnerForm = function () {
   const banner = document.getElementById("partnerBanner");
   if (banner) banner.classList.remove("show");
   document.getElementById("partnerOverlay").classList.add("open");
   document.body.style.overflow = "hidden";
   const callBtn = document.getElementById("callBtn");
   if (callBtn) callBtn.style.display = "none";
};

window.closePartnerForm = function () {
   document.getElementById("partnerOverlay").classList.remove("open");
   document.body.style.overflow = "";
   const callBtn = document.getElementById("callBtn");
   if (callBtn) callBtn.style.display = "";
};

window.selectTime = function (btn) {
   document
      .querySelectorAll(".time-btn")
      .forEach((b) => b.classList.remove("active"));
   btn.classList.add("active");
};

window.submitPartnerForm = async function () {
   const nameEl = document.getElementById("pName");
   const phoneEl = document.getElementById("pPhone");
   const btn = document.querySelector("#partnerOverlay .btn-teal");
   let hasError = false;

   [nameEl, phoneEl].forEach((el) => {
      const val = el.value.trim();
      if (!val || (el === phoneEl && val.replace(/\D/g, "").length < 10)) {
         el.classList.add("error");
         el.addEventListener("input", () => el.classList.remove("error"), {
            once: true,
         });
         hasError = true;
      } else {
         el.classList.remove("error");
      }
   });
   if (hasError) return;

   const activeTimeBtn = document.querySelector(".time-btn.active");
   const fields = {
      "Ім'я та прізвище": nameEl.value.trim(),
      Телефон: phoneEl.value.trim(),
   };
   if (activeTimeBtn) fields["Зручний час"] = activeTimeBtn.textContent;

   await sendTelegramNotification(fields, "Milfey — Співпраця");

   btn.textContent = "✓ Заявку відправлено";
   btn.style.background = "var(--green)";
   btn.disabled = true;

   nameEl.value = "";
   phoneEl.value = "";
   document
      .querySelectorAll(".time-btn")
      .forEach((b) => b.classList.remove("active"));

   setTimeout(() => {
      closePartnerForm();
      btn.textContent = "Відправити заявку →";
      btn.style.background = "";
      btn.disabled = false;
   }, 2000);
};
// мой
