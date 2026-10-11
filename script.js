
// ======= script.js (نسخة كاملة محدثة مع إصلاح صورة الهيرو + سلوك "Products") =======
document.addEventListener('DOMContentLoaded', function () {
  /* 1) Smooth scroll */
  const navLinks = document.querySelectorAll('header nav ul a');
  navLinks.forEach(link => {
    // ✅ لا نفعّل السموث سكرول على رابط "Products" الأساسي (الذي يفتح القائمة فقط)
    const isDropdownToggle = link.closest('li')?.classList.contains('dropdown') && link.nextElementSibling?.classList?.contains('dropdown-menu');
    if (isDropdownToggle) return;

    const targetId = link.getAttribute('href') || '';
    if (targetId.startsWith('#')) {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.querySelector(targetId);
        if (target) {
          const header = document.querySelector('header');
          const offset = header ? header.offsetHeight : 70;
          window.scrollTo({ top: target.offsetTop - offset, behavior: 'smooth' });
        }
      });
    }
  });

  /* 2) WhatsApp FAB */
  const fab = document.getElementById('contact-fab');
  if (fab) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 200) fab.classList.add('visible');
      else fab.classList.remove('visible');
    });
    const fabTooltip = fab.querySelector('.fab-tooltip');
    if (fabTooltip) {
      fab.addEventListener('click', (e) => { e.stopPropagation(); fabTooltip.classList.toggle('show'); });
      document.addEventListener('click', (e) => { if (!fab.contains(e.target)) fabTooltip.classList.remove('show'); });
    }
  }

  /* 3) Dropdowns (Products يفتح القائمة فقط؛ اختيار عنصر منها يمرّر) */
  const dropdownLinks = document.querySelectorAll('header ul li.dropdown > a');
  dropdownLinks.forEach(link => {
    const menu = link.nextElementSibling;
    link.addEventListener('click', (e) => {
      // ✅ افتح/اغلق القائمة بدون تمرير لأسفل
      e.preventDefault();
      e.stopPropagation();
      if (menu) menu.classList.toggle('show');
      document.querySelectorAll('.dropdown-menu').forEach(m => { if (m !== menu) m.classList.remove('show'); });
    });
  });
  // إغلاق أي قائمة مفتوحة عند النقر خارجها
  document.addEventListener('click', () => {
    document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.remove('show'));
  });

  /* 4) Hero canvas (مع معالجة مسار الصورة + Fallback) */
  const canvas = document.getElementById('hero-canvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    const hero = document.getElementById('hero');

    function resizeCanvas() {
      canvas.width = window.innerWidth;
      canvas.height = hero ? hero.clientHeight : 400;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // ✅ استخدم data-bg إن وُجد أو المسار الافتراضي، وحلّ المسار بالنسبة لصفحة النشر
    const imgUrlRaw = canvas.dataset.bg || 'images/MD.png';
    const imgUrl = new URL(imgUrlRaw, document.baseURI).href;

    const bgImage = new Image();
    bgImage.decoding = 'async';
    bgImage.src = imgUrl;

    let mouseX = 0, mouseY = 0;
    document.addEventListener('mousemove', (e) => {
      mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      mouseY = (e.clientY / window.innerHeight) * 2 - 1;
    });

    // Particles
    const particles = [];
    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 3 + 1;
        this.sx = Math.random() * 2 - 1;
        this.sy = Math.random() * 2 - 1;
        this.color = `rgba(0,123,255,${Math.random() * 0.5 + 0.2})`;
      }
      update() {
        this.x += this.sx; this.y += this.sy;
        if (this.x < 0 || this.x > canvas.width) this.sx *= -1;
        if (this.y < 0 || this.y > canvas.height) this.sy *= -1;
      }
      draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    for (let i = 0; i < 80; i++) particles.push(new Particle());

    function animateWithBg() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const ox = mouseX * 20, oy = mouseY * 20;
      const imgW = bgImage.width * (canvas.height / bgImage.height);
      ctx.globalAlpha = 0.08;
      ctx.drawImage(bgImage, (canvas.width - imgW) / 2 + ox, oy, imgW, canvas.height);
      ctx.globalAlpha = 1;
      particles.forEach(p => { p.update(); p.draw(); });
      requestAnimationFrame(animateWithBg);
    }

    function animateParticlesOnly() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => { p.update(); p.draw(); });
      requestAnimationFrame(animateParticlesOnly);
    }

    bgImage.onload = animateWithBg;

    // ✅ Fallback لو الصورة فشلت بالتحميل بعد النشر
    bgImage.onerror = () => {
      console.warn('Hero background image failed to load:', imgUrl);
      if (hero) {
        hero.style.background = `url("${imgUrl}") center / contain no-repeat`;
        hero.style.backgroundColor = '#fff';
      }
      animateParticlesOnly();
    };
  }

  /* 5) Spotlight Search (إظهار المنتج وتغبيش الباقي + حركة) */
  const searchInput = document.getElementById('searchInput');
  const searchButton = document.getElementById('searchButton');

  // إنشاء الماسك مرة واحدة
  let spotlightMask = document.getElementById('spotlight-mask');
  if (!spotlightMask) {
    spotlightMask = document.createElement('div');
    spotlightMask.id = 'spotlight-mask';
    document.body.appendChild(spotlightMask);
  }

  let lastHighlighted = null;
  let timer = null;

  function clearSpotlight() {
    document.body.classList.remove('spotlight-mode');
    spotlightMask.style.display = 'none';
    if (timer) { clearTimeout(timer); timer = null; }
    if (lastHighlighted) {
      lastHighlighted.classList.remove('product-highlight');
      lastHighlighted = null;
    }
    window.removeEventListener('scroll', updateSpotlightHole, { passive:true });
    window.removeEventListener('resize', updateSpotlightHole);
  }

  function setHoleForElement(el) {
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top  + rect.height / 2;
    const r = Math.hypot(rect.width, rect.height) / 2 + 24;
    spotlightMask.style.setProperty('--spot-x', `${cx}px`);
    spotlightMask.style.setProperty('--spot-y', `${cy}px`);
    spotlightMask.style.setProperty('--spot-r', `${r}px`);
  }

  function updateSpotlightHole() {
    if (lastHighlighted) setHoleForElement(lastHighlighted);
  }

  // ⬇⬇⬇ الحركة: اهتزاز/نبضة لجذب الانتباه ⬇⬇⬇
  function wiggleCard(card) {
    if (!card || !card.animate) return;
    card.animate(
      [
        { transform: 'translateY(0) scale(1)',   offset: 0   },
        { transform: 'translateY(-6px) scale(1.02)', offset: 0.2 },
        { transform: 'translateY(0) rotate(0deg)',   offset: 0.35 },
        { transform: 'translateY(0) rotate(-2deg)',  offset: 0.45 },
        { transform: 'translateY(0) rotate(2deg)',   offset: 0.55 },
        { transform: 'translateY(0) rotate(0deg)',   offset: 0.65 },
        { transform: 'translateY(-4px) scale(1.015)', offset: 0.8 },
        { transform: 'translateY(0) scale(1)',     offset: 1   }
      ],
      { duration: 1200, iterations: 2, easing: 'ease-in-out' }
    );
  }

  function doSpotlight(card) {
    clearSpotlight();
    document.body.classList.add('spotlight-mode');
    spotlightMask.style.display = 'block';

    card.classList.add('product-highlight');
    lastHighlighted = card;

    setHoleForElement(card);

    window.addEventListener('scroll', updateSpotlightHole, { passive:true });
    window.addEventListener('resize', updateSpotlightHole);

    card.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    setTimeout(() => wiggleCard(card), 350);

    timer = setTimeout(clearSpotlight, 3000);
  }

  function findCardByQuery(q) {
    const query = (q || '').toLowerCase().trim();
    if (!query) return null;
    const cards = document.querySelectorAll('.product-card');
    for (const card of cards) {
      const title = card.querySelector('h4')?.textContent.toLowerCase() || '';
      const desc  = card.querySelector('p')?.textContent.toLowerCase() || '';
      if (title.includes(query) || desc.includes(query)) return card;
    }
    return null;
  }

  function triggerSearch() {
    const card = findCardByQuery(searchInput?.value);
    if (card) {
      doSpotlight(card);
      if (searchInput) setTimeout(() => (searchInput.value = ''), 200);
    } else {
      clearSpotlight();
      if (searchInput && searchInput.value.trim() !== '') {
        alert(`No products found for "${searchInput.value}"!`);
      }
    }
  }

  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); triggerSearch(); }
    });
    searchInput.addEventListener('input', function () { if (this.value === '') clearSpotlight(); });
  }
  if (searchButton && searchInput) {
    searchButton.addEventListener('click', (e) => { e.preventDefault(); triggerSearch(); });
  }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') clearSpotlight(); });

  /* 6) CART LOGIC (popup + +/-/remove + order/clear) */
  (function () {
    let cart = []; // {id, name, quantity, price, image}
    const WHATSAPP_PHONE = '972599980107';

    const parsePrice = (txt) => {
      const n = parseFloat((txt || '').replace(/[^\d.]/g, ''));
      return isNaN(n) ? 0 : n;
    };
const formatPrice = (n) => {
  try { 
    return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(n);
  } catch { 
    return `₪${Number(n || 0).toFixed(2)}`; 
  }
};

    const makeId = (name, price) => `${name}::${price}`;

    function getQtyInputFrom(button) {
      const parent = button?.parentElement || button?.closest('.quantity-selector') || button?.closest('.quantity-mini');
      if (!parent) return null;
      return parent.querySelector('.quantity-input, .quantity-input-mini');
    }
    function increaseQuantity(btn) {
      const input = getQtyInputFrom(btn);
      if (!input) return;
      input.value = (parseInt(input.value || '1', 10) + 1).toString();
    }
    function decreaseQuantity(btn) {
      const input = getQtyInputFrom(btn);
      if (!input) return;
      const cur = parseInt(input.value || '1', 10);
      input.value = Math.max(1, cur - 1).toString();
    }

    function addToCart(button) {
      const card = button.closest('.product-card');
      if (!card) return;
      const name = (card.querySelector('h4')?.textContent || 'منتج').trim();
      const image = card.querySelector('img')?.getAttribute('src') || '';
      // ✅ الحصول على السعر الصحيح (السعر بعد التخفيض إن وُجد)
      let priceText = '';
      if (card.querySelector('.new-price')) {
        priceText = card.querySelector('.new-price').textContent; // السعر بعد الخصم
      } else if (card.querySelector('.price')) {
        priceText = card.querySelector('.price').textContent; // السعر العادي
      } else {
        priceText = '0';
      }

      const priceNum = parsePrice(priceText);
      const qtyInput = card.querySelector('.quantity-input, .quantity-input-mini');
      const qty = Math.max(1, parseInt(qtyInput?.value || '1', 10));
      const id = makeId(name, priceNum);

      const exist = cart.find(i => i.id === id);
      if (exist) exist.quantity += qty;
      else cart.push({ id, name, quantity: qty, price: priceNum, image });

      updateCartCount();
    }

    function updateCartCount() {
      const total = cart.reduce((s, i) => s + i.quantity, 0);
      const badge = document.getElementById('cart-count');
      if (badge) badge.textContent = String(total);
    }

    function incItem(id) { const it = cart.find(i => i.id === id); if (!it) return; it.quantity += 1; updateCartCount(); renderCart(); }
    function decItem(id) { const it = cart.find(i => i.id === id); if (!it) return; if (it.quantity > 1) it.quantity -= 1; else cart = cart.filter(i => i.id !== id); updateCartCount(); renderCart(); }
    function removeItem(id) { cart = cart.filter(i => i.id !== id); updateCartCount(); renderCart(); }
    function clearCart() { cart = []; updateCartCount(); renderCart(); }

    function renderCart() {
      const box = document.getElementById('cart-items');
      const totalEl = document.getElementById('cart-total');
      if (!box) return;

      box.innerHTML = '';
      let sum = 0;

      if (cart.length === 0) {
        box.innerHTML = '<p>السلة فارغة 🛒</p>';
        if (totalEl) totalEl.textContent = '';
        const clearBtn0 = document.getElementById('clear-cart');
        if (clearBtn0) clearBtn0.style.display = 'none';
        return;
      }

      cart.forEach(item => {
        const row = document.createElement('div');
        row.className = 'cart-row';

        const thumb = document.createElement('img');
        thumb.className = 'cart-thumb';
        thumb.src = item.image || '';
        thumb.alt = '';

        const title = document.createElement('div');
        title.className = 'cart-title';
        title.textContent = item.name;

        const qtyBox = document.createElement('div');
        qtyBox.className = 'cart-qty';

        const btnDec = document.createElement('button');
        btnDec.className = 'cart-qty-btn';
        btnDec.textContent = '−';
        btnDec.dataset.id = item.id;

        const qtyVal = document.createElement('span');
        qtyVal.className = 'cart-qty-value';
        qtyVal.textContent = String(item.quantity);

        const btnInc = document.createElement('button');
        btnInc.className = 'cart-qty-btn';
        btnInc.textContent = '+';
        btnInc.dataset.id = item.id;

        const del = document.createElement('button');
        del.className = 'cart-remove-btn';
        del.textContent = '🗑';
        del.title = 'حذف المنتج';
        del.dataset.id = item.id;

        qtyBox.appendChild(btnDec);
        qtyBox.appendChild(qtyVal);
        qtyBox.appendChild(btnInc);
        qtyBox.appendChild(del);

        const line = document.createElement('div');
        line.className = 'cart-line-total';
        line.textContent = formatPrice(item.quantity * item.price);

        row.appendChild(thumb);
        row.appendChild(title);
        row.appendChild(qtyBox);
        row.appendChild(line);
        box.appendChild(row);

        sum += item.quantity * item.price;
      });

      if (totalEl) totalEl.textContent = `الاجمالي: ₪${sum.toFixed(2)}`;

      let clearBtn = document.getElementById('clear-cart');
      let orderBtn = document.getElementById('order-now');

      if (!clearBtn) {
        clearBtn = document.createElement('button');
        clearBtn.id = 'clear-cart';
        clearBtn.textContent = 'تفريغ السلة';
        clearBtn.style.cssText = 'margin-top:10px;background:#f44336;color:#fff;border:none;padding:9px 12px;border-radius:10px;font-weight:800;cursor:pointer;';
        const popup = document.getElementById('cart-popup');
        if (popup) popup.appendChild(clearBtn);
      }
      clearBtn.style.display = 'inline-block';
      clearBtn.onclick = clearCart;

      if (!orderBtn) {
        orderBtn = document.createElement('button');
        orderBtn.id = 'order-now';
        orderBtn.className = 'order-now';
        orderBtn.textContent = 'اطلب الآن';
        const popup = document.getElementById('cart-popup');
        if (popup) popup.insertBefore(orderBtn, clearBtn);
      }
      orderBtn.onclick = () => {
        const message = buildOrderMessage();
        openWhatsApp(message);
      };

      box.onclick = (e) => {
        const plusBtn = e.target.closest('.cart-qty-btn') && e.target.textContent.trim() === '+';
        const minusBtn = e.target.closest('.cart-qty-btn') && e.target.textContent.trim() === '−';
        const rmBtn = e.target.closest('.cart-remove-btn');
        const id = e.target.dataset?.id || e.target.closest('button')?.dataset?.id;
        if (plusBtn && id) incItem(id);
        else if (minusBtn && id) decItem(id);
        else if (rmBtn && id) removeItem(id);
      };
    }

    function openCart() {
      renderCart();
      const ov = document.getElementById('cart-overlay');
      const pp = document.getElementById('cart-popup');
      if (ov) ov.style.display = 'block';
      if (pp) pp.style.display = 'block';
    }
    function closeCart() {
      const ov = document.getElementById('cart-overlay');
      const pp = document.getElementById('cart-popup');
      if (ov) ov.style.display = 'none';
      if (pp) pp.style.display = 'none';
    }

    function openWhatsApp(message) {
      const text = encodeURIComponent(message);
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      const appUrl = `whatsapp://send?phone=${WHATSAPP_PHONE}&text=${text}`;
      const webUrl = `https://web.whatsapp.com/send?phone=${WHATSAPP_PHONE}&text=${text}`;
      const mobileWebUrl = `https://wa.me/${WHATSAPP_PHONE}?text=${text}`;
      window.location.href = appUrl;
      setTimeout(() => { if (isMobile) window.location.href = mobileWebUrl; else window.open(webUrl, '_blank'); }, 3000);
    }

function buildOrderMessage() {
  if (cart.length === 0) return 'مرحبا، لدي استفسار حول المنتجات.';

  const header = 'مرحبا، أود إتمام الطلب التالي:';
  const lines = cart.map(i => `- ${i.quantity} × ${i.name}`);
  const total = cart.reduce((s, i) => s + i.quantity * i.price, 0);

  const footer = `الاجمالي: ₪${total.toFixed(2)}`;

  return [header, ...lines, footer].join('\n');
}


    function bindCartUI() {
      document.getElementById('cart-button')?.addEventListener('click', openCart);
      document.getElementById('cart-overlay')?.addEventListener('click', closeCart);
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeCart(); });
    }

    window.increaseQuantity = increaseQuantity;
    window.decreaseQuantity = decreaseQuantity;
    window.addToCart = addToCart;

    bindCartUI();
  })();

}); // ===== end DOMContentLoaded =====

/* إظهار أيقونة التواصل فقط عند قسم المنتجات + واتساب */
document.addEventListener("DOMContentLoaded", () => {
  const fab = document.getElementById("contact-fab");
  const mask = document.getElementById("wa-launch-mask");

  fab?.addEventListener("click", (e) => { e.stopPropagation(); fab.classList.toggle("open"); });
  document.addEventListener("click", (e) => { if (!fab?.contains(e.target)) fab?.classList.remove("open"); });

  const products = document.getElementById("products");
  if (products && "IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => fab?.classList.toggle("visible", entry.isIntersecting));
    }, { threshold: 0.1 });
    io.observe(products);
  }

  function openWhatsAppNative(phone, msg) {
    const text = encodeURIComponent(msg || "");
    const appUrl = `whatsapp://send?phone=${phone}&text=${text}`;
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const mobileWebUrl = `https://wa.me/${phone}?text=${text}`;
    const desktopWebUrl = `https://web.whatsapp.com/send?phone=${phone}&text=${text}`;

    if (mask) mask.style.display = "block";
    window.location.href = appUrl;
    setTimeout(() => {
      if (isMobile) window.location.href = mobileWebUrl;
      else window.open(desktopWebUrl, "_blank");
      setTimeout(() => { if (mask) mask.style.display = "none"; }, 600);
    }, 3000);
  }

  document.querySelectorAll(".contact-wa").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const phone = btn.getAttribute("data-phone") || "972592192531";
      const msg = btn.getAttribute("data-msg") || "";
      openWhatsAppNative(phone, msg);
      fab?.classList.remove("open");
    });
  });
});
