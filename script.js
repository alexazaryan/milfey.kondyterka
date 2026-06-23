const products = [
   {
      id: 1,
      name: "Кокосовий торт",
      sub: "Вафельний, 80 г",
      price: 45,
      emoji: "🥥",
      bg: "#5dcad022",
   },
   {
      id: 2,
      name: "Зі згущеним молоком",
      sub: "Вафельний, 80 г",
      price: 45,
      emoji: "🥛",
      bg: "#48a9ef22",
   },
   {
      id: 3,
      name: "Шоколадний",
      sub: "Вафельний, 80 г",
      price: 48,
      emoji: "🍫",
      bg: "#a0785022",
   },
   {
      id: 4,
      name: "Полуничний",
      sub: "Вафельний, 80 г",
      price: 48,
      emoji: "🍓",
      bg: "#f7a8b822",
   },
   {
      id: 5,
      name: "Ванільний",
      sub: "Вафельний, 80 г",
      price: 43,
      emoji: "🍦",
      bg: "#f6e8a122",
   },
   {
      id: 6,
      name: "Арахісовий",
      sub: "Вафельний, 80 г",
      price: 50,
      emoji: "🥜",
      bg: "#c9a87c22",
   },
];

let cart = {};

function renderProducts() {
   document.getElementById("productGrid").innerHTML = products
      .map(
         (p, i) => `
    <div class="card" style="transition-delay:${i * 120}ms">
      <div class="card-img" style="background:${p.bg}">
        <span style="filter:drop-shadow(0 4px 10px rgba(0,0,0,.12))">${p.emoji}</span>
      </div>
      <div class="card-body">
        <div class="card-name">${p.name}</div>
        <div class="card-sub">${p.sub}</div>
        <div class="card-footer">
          <div class="price">${p.price} <small>грн</small></div>
          <button class="add-btn" id="btn-${p.id}" onclick="addToCart(${p.id})">В кошик</button>
        </div>
      </div>
    </div>`,
      )
      .join("");
   animateCards();
}

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

function addToCart(id) {
   if (cart[id]) return;
   cart[id] = 1;
   updateCartUI();
   const btn = document.getElementById("btn-" + id);
   btn.textContent = "✓ Додано";
   btn.classList.add("added");
}

function removeFromCart(id) {
   delete cart[id];
   updateCartUI();
   const btn = document.getElementById("btn-" + id);
   if (btn) {
      btn.textContent = "В кошик";
      btn.classList.remove("added");
   }
}

function changeQty(id, delta) {
   if (!cart[id]) return;
   cart[id] = cart[id] + delta;
   if (cart[id] <= 0) {
      delete cart[id];
      const btn = document.getElementById("btn-" + id);
      if (btn) {
         btn.textContent = "В кошик";
         btn.classList.remove("added");
      }
   }
   updateCartUI();
}

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
      body.innerHTML = `<div class="drawer-empty">
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
      const p = products.find((x) => x.id == id),
         qty = cart[id];
      sum += p.price * qty;
      html += `<div class="cart-item">
      <div class="cart-item-icon">${p.emoji}</div>
      <div class="cart-item-info">
        <div class="cart-item-name">${p.name}</div>
        <div class="cart-item-price">${p.price} грн × ${qty} = ${p.price * qty} грн</div>
      </div>
      <div class="qty-ctrl">
        <button class="qty-btn" onclick="changeQty(${id},-1)">−</button>
        <span class="qty-num">${qty}</span>
        <button class="qty-btn" onclick="changeQty(${id},1)">+</button>
      </div>
    </div>`;
   });
   body.innerHTML = html;
   foot.style.display = "";
   document.getElementById("totalPrice").textContent = sum + " грн";
}

function toggleCart() {
   const isOpen = document.getElementById("drawer").classList.contains("open");
   document.getElementById("drawer").classList.toggle("open");
   document.getElementById("drawerOverlay").classList.toggle("open");
   document.body.style.overflow = isOpen ? "" : "hidden";
   if (!isOpen) showScreen("screenCart", "left");
}

function showScreen(toId, dir) {
   const all = document.querySelectorAll(".drawer-screen");
   const current = document.querySelector(".drawer-screen.active");
   if (!dir) dir = "right";

   all.forEach((s) => {
      s.classList.remove("active", "left", "right");
      s.classList.add(
         s.id === toId ? "active" : dir === "right" ? "left" : "right",
      );
   });
   const target = document.getElementById(toId);
   target.classList.remove("left", "right");
   target.classList.add("active");

   if (toId === "screenOrder") fillOrderSummary();
}

function initPhone() {
   const ph = document.getElementById("fPhone");
   if (!ph) return;
   ph.value = "+380";
   ph.addEventListener("focus", function () {
      if (!this.value) this.value = "+380";
   });
}

function fillOrderSummary() {
   const keys = Object.keys(cart);
   let sum = 0,
      html = "";
   keys.forEach((id) => {
      const p = products.find((x) => x.id == id),
         qty = cart[id];
      sum += p.price * qty;
      html += `<div class="order-summary-item"><span>${p.emoji} ${p.name} × ${qty}</span><span>${p.price * qty} грн</span></div>`;
   });
   html += `<div class="order-summary-total"><span>Разом</span><span>${sum} грн</span></div>`;
   document.getElementById("orderSummary").innerHTML =
      '<div class="order-summary-title">Ваше замовлення</div>' + html;
}

function submitOrder() {
   const fields = [
      { id: "fName", val: document.getElementById("fName").value.trim() },
      {
         id: "fLastName",
         val: document.getElementById("fLastName").value.trim(),
      },
      { id: "fPhone", val: document.getElementById("fPhone").value.trim() },
      { id: "fCity", val: document.getElementById("fCity").value.trim() },
      { id: "fNova", val: document.getElementById("fNova").value.trim() },
   ];

   let hasError = false;
   fields.forEach((f) => {
      const el = document.getElementById(f.id);
      if (
         !f.val ||
         (f.id === "fPhone" && f.val.replace(/\D/g, "").length < 10)
      ) {
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

   // Тут буде відправка в Telegram бот
   cart = {};
   updateCartUI();
   document.querySelectorAll(".add-btn").forEach((btn) => {
      btn.textContent = "В кошик";
      btn.classList.remove("added");
   });
   showScreen("screenSuccess", "right");
}

function toggleAbout() {
   document.getElementById("aboutOverlay").classList.toggle("open");
   document.body.style.overflow = document
      .getElementById("aboutOverlay")
      .classList.contains("open")
      ? "hidden"
      : "";
}

function closeOnBg(e, id, fn) {
   if (e.target.id === id) fn();
}

function toggleMenu() {
   document.getElementById("mobileMenu").classList.toggle("open");
   document.getElementById("burgerBtn").classList.toggle("open");
}

// Инициализация
renderProducts();
initPhone();
renderCartItems();
