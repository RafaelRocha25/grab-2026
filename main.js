/* ===========================
   GRAB ASA BRANCA - SHARED JS
   =========================== */

document.addEventListener('DOMContentLoaded', function () {

  // ===========================
  // HAMBURGER / MOBILE NAV
  // ===========================
  const hamburger = document.querySelector('.hamburger');
  const mobileNav = document.querySelector('.mobile-nav');
  if (hamburger && mobileNav) {
    hamburger.addEventListener('click', function () {
      hamburger.classList.toggle('open');
      mobileNav.classList.toggle('open');
    });
    // Close on link click
    mobileNav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        hamburger.classList.remove('open');
        mobileNav.classList.remove('open');
      });
    });
  }

  // ===========================
  // BACK TO TOP
  // ===========================
  const backToTop = document.querySelector('.back-to-top');
  if (backToTop) {
    window.addEventListener('scroll', function () {
      if (window.scrollY > 400) {
        backToTop.classList.add('visible');
      } else {
        backToTop.classList.remove('visible');
      }
    });
    backToTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // ===========================
  // ACTIVE NAV LINK
  // ===========================
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.main-nav a, .mobile-nav a').forEach(function (a) {
    if (a.getAttribute('href') === currentPage) {
      a.classList.add('active');
    }
  });

  // ===========================
  // HERO SLIDER
  // ===========================
  const slider = document.querySelector('.slider-track');
  if (slider) {
    const slides = slider.querySelectorAll('.slide');
    const dots = document.querySelectorAll('.slider-dot');
    const prevBtn = document.querySelector('.slider-btn.prev');
    const nextBtn = document.querySelector('.slider-btn.next');
    let current = 0;
    let autoInterval;

    function goTo(idx) {
      current = (idx + slides.length) % slides.length;
      slider.style.transform = 'translateX(-' + (current * 100) + '%)';
      dots.forEach(function (d, i) {
        d.classList.toggle('active', i === current);
      });
    }

    function startAuto() {
      autoInterval = setInterval(function () { goTo(current + 1); }, 5000);
    }

    function resetAuto() {
      clearInterval(autoInterval);
      startAuto();
    }

    if (prevBtn) prevBtn.addEventListener('click', function () { goTo(current - 1); resetAuto(); });
    if (nextBtn) nextBtn.addEventListener('click', function () { goTo(current + 1); resetAuto(); });
    dots.forEach(function (d, i) {
      d.addEventListener('click', function () { goTo(i); resetAuto(); });
    });

    // Drag/swipe support
    let startX = 0;
    slider.addEventListener('touchstart', function (e) { startX = e.touches[0].clientX; }, { passive: true });
    slider.addEventListener('touchend', function (e) {
      const diff = startX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 50) { goTo(diff > 0 ? current + 1 : current - 1); resetAuto(); }
    });

    goTo(0);
    startAuto();
  }

  // ===========================
  // LIGHTBOX
  // ===========================
  const overlay = document.querySelector('.lightbox-overlay');
  if (overlay) {
    const lightboxImg = overlay.querySelector('#lightbox-main-img');
    const lightboxCaption = overlay.querySelector('.lightbox-caption');
    const lightboxCounter = overlay.querySelector('.lightbox-counter');
    const closeBtn = overlay.querySelector('.lightbox-close');
    const prevNav = overlay.querySelector('.lightbox-nav.prev');
    const nextNav = overlay.querySelector('.lightbox-nav.next');

    let images = [];
    let currentIdx = 0;

    function openLightbox(idx) {
      currentIdx = idx;
      updateLightbox();
      overlay.classList.add('open');
      document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
      overlay.classList.remove('open');
      document.body.style.overflow = '';
    }

    function updateLightbox() {
      const img = images[currentIdx];
      lightboxImg.src = img.src;
      lightboxImg.alt = img.alt || '';
      if (lightboxCaption) lightboxCaption.textContent = img.caption || '';
      if (lightboxCounter) lightboxCounter.textContent = (currentIdx + 1) + ' / ' + images.length;
    }

    // Gather all gallery thumbs
    function refreshImages() {
      images = [];
      document.querySelectorAll('.gallery-thumb, .bwg_mosaic_thumbnails_1 a, .traves-gallery img').forEach(function (thumb) {
        const img = thumb.tagName.toLowerCase() === 'img' ? thumb : thumb.querySelector('img');
        const link = thumb.closest('a');
        images.push({
          src: (link && link.getAttribute('href')) ? link.getAttribute('href') : img.src.replace('/thumb/', '/'),
          alt: img.alt || img.title || '',
          caption: img.getAttribute('title') || img.alt || ''
        });
      });
    }

    window.initGallery = function () {
      refreshImages();
      document.querySelectorAll('.gallery-thumb, .bwg_mosaic_thumbnails_1 a, .traves-gallery img').forEach(function (thumb, i) {
        thumb.addEventListener('click', function (e) {
          e.preventDefault();
          refreshImages();
          openLightbox(i);
        });
      });
    };

    if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeLightbox();
    });
    if (prevNav) prevNav.addEventListener('click', function () {
      currentIdx = (currentIdx - 1 + images.length) % images.length;
      updateLightbox();
    });
    if (nextNav) nextNav.addEventListener('click', function () {
      currentIdx = (currentIdx + 1) % images.length;
      updateLightbox();
    });

    document.addEventListener('keydown', function (e) {
      if (!overlay.classList.contains('open')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') { currentIdx = (currentIdx - 1 + images.length) % images.length; updateLightbox(); }
      if (e.key === 'ArrowRight') { currentIdx = (currentIdx + 1) % images.length; updateLightbox(); }
    });
  }

  // ===========================
  // GALLERY PAGINATION
  // ===========================
  window.initGalleryPagination = function (containerId, thumbsData, perPage) {
    perPage = perPage || 24;
    const container = document.getElementById(containerId);
    if (!container) return;

    let page = 0;
    const totalPages = Math.ceil(thumbsData.length / perPage);

    const pageInfo = container.parentElement.querySelector('.gallery-page-info');
    const prevBtn = container.parentElement.querySelector('.gallery-pages .btn-prev');
    const nextBtn = container.parentElement.querySelector('.gallery-pages .btn-next');
    const firstBtn = container.parentElement.querySelector('.gallery-pages .btn-first');
    const lastBtn = container.parentElement.querySelector('.gallery-pages .btn-last');

    function renderPage(p) {
      page = p;
      const start = p * perPage;
      const slice = thumbsData.slice(start, start + perPage);
      container.innerHTML = slice.map(function (img) {
        return '<a href="' + img.full + '" class="gallery-thumb"><img src="' + img.thumb + '" alt="' + (img.caption || '') + '" title="' + (img.caption || '') + '" loading="lazy"></a>';
      }).join('');

      if (pageInfo) pageInfo.textContent = 'Página ' + (p + 1) + ' de ' + totalPages;
      if (prevBtn) prevBtn.disabled = p === 0;
      if (firstBtn) firstBtn.disabled = p === 0;
      if (nextBtn) nextBtn.disabled = p === totalPages - 1;
      if (lastBtn) lastBtn.disabled = p === totalPages - 1;

      if (window.initGallery) window.initGallery();
    }

    if (prevBtn) prevBtn.addEventListener('click', function () { if (page > 0) renderPage(page - 1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { if (page < totalPages - 1) renderPage(page + 1); });
    if (firstBtn) firstBtn.addEventListener('click', function () { renderPage(0); });
    if (lastBtn) lastBtn.addEventListener('click', function () { renderPage(totalPages - 1); });

    renderPage(0);
  };

  // ===========================
  // ACCORDION (MODULES)
  // ===========================
  document.querySelectorAll('.module-header').forEach(function (header) {
    header.addEventListener('click', function () {
      const item = header.closest('.module-item');
      item.classList.toggle('open');
    });
  });

  // ===========================
  // CONTACT FORM
  // ===========================
  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      contactForm.style.display = 'none';
      const success = document.querySelector('.form-success');
      if (success) success.style.display = 'block';
    });
  }

});


/* === CONSOLIDATED FROM INDEX === */
/* === SLIDER === */
    const track = document.getElementById('slider-track');
    const dots  = document.querySelectorAll('.slider-dot');
    const TOTAL = 3;
    let current = 0, autoTimer;

    function goTo(idx) {
      current = ((idx % TOTAL) + TOTAL) % TOTAL;
      if(track) track.style.transform = `translateX(-${current * 100}%)`;
      dots.forEach((d, i) => d.classList.toggle('active', i === current));
    }
    function startAuto() { autoTimer = setInterval(() => goTo(current + 1), 5000); }
    function resetAuto() { clearInterval(autoTimer); startAuto(); }

    const p = document.getElementById('slider-prev'); if(p) p.addEventListener('click', () => { goTo(current - 1); resetAuto(); });
    const n = document.getElementById('slider-next'); if(n) n.addEventListener('click', () => { goTo(current + 1); resetAuto(); });
    dots.forEach(d => d.addEventListener('click', () => { goTo(+d.dataset.index); resetAuto(); }));
    const h = document.querySelector('.hero-slider'); if(h) h.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft') { goTo(current - 1); resetAuto(); }
      if (e.key === 'ArrowRight') { goTo(current + 1); resetAuto(); }
    });
    startAuto();

    /* === HAMBURGER === */
    const hamburger = document.getElementById('hamburger');
    const mobileNav = document.getElementById('mobile-nav');

if (hamburger)     hamburger.addEventListener('click', () => {
      const open = mobileNav.classList.toggle('open');
      hamburger.classList.toggle('open', open);
      hamburger.setAttribute('aria-expanded', String(open));
    });
if (mobileNav)     mobileNav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      mobileNav.classList.remove('open');
      hamburger.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
    }));

    /* === DROPDOWN PROJETOS === */
    const dropdownBtn = document.getElementById('dropdown-projetos-btn');
    const dropdownParent = dropdownBtn.closest('.has-dropdown');

if (dropdownBtn)     dropdownBtn.addEventListener('click', e => {
      e.preventDefault();
      const open = dropdownParent.classList.toggle('open');
if (dropdownBtn)       dropdownBtn.setAttribute('aria-expanded', String(open));
    });

    document.addEventListener('click', e => {
      if (!dropdownParent.contains(e.target)) {
        dropdownParent.classList.remove('open');
if (dropdownBtn)         dropdownBtn.setAttribute('aria-expanded', 'false');
      }
    });

    /* === SCROLL EVENTS === */
    const siteHeader = document.getElementById('site-header');
    const backToTop  = document.getElementById('back-to-top');

    window.addEventListener('scroll', () => {
      siteHeader.classList.toggle('scrolled', window.scrollY > 60);
      backToTop.classList.toggle('visible', window.scrollY > 400);
    }, { passive: true });

if (backToTop)     backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

    /* === INTERSECTION OBSERVER === */
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));

    /* === READ MORE === */
    const btnReadMore     = document.getElementById('btn-read-more');
    const readMoreContent = document.getElementById('quem-somos-more');

if (btnReadMore)     btnReadMore.addEventListener('click', () => {
      const expanded = readMoreContent.classList.toggle('expanded');
      btnReadMore.classList.toggle('expanded', expanded);
      btnReadMore.setAttribute('aria-expanded', String(expanded));
    });

    /* === MODAL HISTÓRIA === */
    const modal       = document.getElementById('historia-modal');
    const modalClose  = document.getElementById('modal-close');
    const btnHistoria = document.getElementById('btn-historia-modal');

    function openModal() {
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      modalClose.focus();
    }
    function closeModal() {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      btnHistoria.focus();
    }

if (btnHistoria)     btnHistoria.addEventListener('click', openModal);
if (modalClose)     modalClose.addEventListener('click', closeModal);
    modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal.classList.contains('open')) closeModal(); });

    /* === FORMULÁRIO === */
    const form = document.getElementById('contact-form');
    const formSuccess = document.getElementById('form-success');

if (form)     form.addEventListener('submit', e => {
      e.preventDefault();
      const btn = form.querySelector('.btn-submit');
      btn.disabled = true;
      btn.textContent = 'Enviando...';
      setTimeout(() => {
        form.style.display = 'none';
        formSuccess.classList.add('show');
      }, 800);
    });