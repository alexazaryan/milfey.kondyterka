import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
   getFirestore,
   collection,
   getDocs,
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
const db = getFirestore(app);

const TG_TOKEN = "8914645879:AAFMR2fSWzvNZrUpvA80aXC8EJGkN3pW1Mo";
const TG_CHAT_ID = "333932386";

/* ======================
   CART STATE
   ====================== */
let cart = {};
let products = [];

/* ======================
   LOAD PRODUCTS FROM FIREBASE
   ====================== */
async function loadProducts() {
   try {
      const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      products = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      renderProducts();
   } catch (e) {
      console.error("Помилка завантаження товарів:", e);
      renderProducts();
   }
}

/* ======================
   RENDER PRODUCTS
   ====================== */
function renderProducts() {
   const grid = document.getElementById("productGrid");

   if (!products.length) {
      grid.innerHTML = `
      <div class="products-empty">
        <div class="products-empty-icon">🧇</div>
        <p class="products-empty-title">Незабаром тут з'являться смаколики!</p>
        <p class="products-empty-sub">Ми вже готуємо асортимент — заходьте пізніше</p>
      </div>`;
      return;
   }

   grid.innerHTML = `<div class="products">${products
      .map(
         (p, i) => `
    <div class="card" style="transition-delay:${i * 100}ms">
      <div class="card-img">
        <img src="${p.photoUrl}" alt="${p.name}" loading="lazy" />
      </div>
      <div class="card-body">
        <div class="card-name">${p.name}</div>
        <div class="card-sub">${p.desc}</div>
        <div class="card-footer">
          <div class="price">${p.price} <small>грн</small></div>
          <button class="add-btn" id="btn-${p.id}" onclick="addToCart('${p.id}')">В кошик</button>
        </div>
      </div>
    </div>`,
      )
      .join("")}</div>`;

   animateCards();
}

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
   document.getElementById("cartCountDesktop").textContent = total;
   document.getElementById("cartCountMobile").textContent = total;
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
        <div class="cart-item-icon"><img src="${p.photoUrl}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover;border-radius:10px;" /></div>
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
   await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
         chat_id: TG_CHAT_ID,
         text: text,
         parse_mode: "HTML",
      }),
   });
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
   document.body.style.overflow = document
      .getElementById("aboutOverlay")
      .classList.contains("open")
      ? "hidden"
      : "";
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
   INIT
   ====================== */
initPhone();
renderCartItems();
loadProducts();

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
