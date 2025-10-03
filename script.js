/***********************
 * Dark Knight Portfolio - Interactive Features
 * GitHub Pages Compatible Version
 ***********************/
(function(){
  'use strict';
  
  // =========================
  // Loading Screen Animation
  // =========================
  
  function initLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    const body = document.body;
    const quotes = [
      '"It\'s not who I am underneath, but what I do that defines me."',
      '"Why do we fall? So we can learn to pick ourselves up."',
      '"The night is darkest just before the dawn."'
    ];
    
    let quoteIndex = 0;
    const quoteElement = document.querySelector('.loading-quotes');
    
    // Cycle through quotes faster
    const quoteInterval = setInterval(() => {
      quoteIndex = (quoteIndex + 1) % quotes.length;
      quoteElement.textContent = quotes[quoteIndex];
    }, 1500);
    
    // Hide loading screen after 2 seconds (50% faster)
    setTimeout(() => {
      loadingScreen.classList.add('loaded');
      body.classList.remove('loading');
      clearInterval(quoteInterval);
      
      // Remove loading screen from DOM after transition
      setTimeout(() => {
        loadingScreen.remove();
      }, 500);
    }, 2000);
  }
  
  // Wait for DOM to be fully loaded for GitHub Pages
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      initLoadingScreen();
      initializePortfolio();
    });
  } else {
    initLoadingScreen();
    initializePortfolio();
  }
  
  function initializePortfolio() {
    // Cache DOM elements with error handling
    const mobileToggle = document.getElementById('mobile-toggle');
    const mobileNav = document.getElementById('mobile-nav');
    const mobileThemeToggle = document.getElementById('mobile-theme-toggle');
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.documentElement;
    
    // Initialize active section detection
    initActiveSectionDetection();
    const toTopBtn = document.getElementById('to-top');

    // Check if critical elements exist before proceeding
    if (!body) {
      console.error('Critical DOM elements not found');
      return;
    }

    // Batman-themed console message
    console.log(`
      🦇 Welcome to the Dark Knight's Digital Cave 🦇
      ════════════════════════════════════════════════
      "It's not who I am underneath, but what I do that defines me."
      - The Dark Knight Developer
      
      You've found the secret developer console.
      The Dark Knight's code is always watching...
      
      GitHub Pages Version - Optimized for deployment
    `);

  // Theme: read preference from localStorage or system
  function readTheme(){
    try {
      const stored = localStorage.getItem('dark-knight-theme');
      if(stored) return stored;
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    } catch (e) {
      console.warn('LocalStorage access failed, using default theme');
      return 'dark';
    }
  }
  
  function applyTheme(t){
    try {
      body.setAttribute('data-theme', t);
      const pressed = t === 'light';
      if(themeToggle) {
        themeToggle.setAttribute('aria-pressed', pressed);
        themeToggle.textContent = t === 'light' ? '🌞 Light Mode' : '🌙 Dark Knight Mode';
      }
      if(mobileThemeToggle) {
        mobileThemeToggle.textContent = t === 'light' ? '🌞 Light Mode' : '🌙 Dark Knight Mode';
      }
      localStorage.setItem('dark-knight-theme', t);
      
      // Batman theme change effect
      createBatSignal();
    } catch (e) {
      console.warn('Theme application failed:', e);
    }
  }
  
  // Bat signal effect when changing themes
  function createBatSignal() {
    const batSignal = document.createElement('div');
    batSignal.innerHTML = '🦇';
    batSignal.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      font-size: 2rem;
      z-index: 9999;
      pointer-events: none;
      opacity: 0;
      transform: scale(0) rotate(0deg);
      transition: all 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
      filter: drop-shadow(0 0 20px rgba(255, 215, 0, 0.8));
    `;
    
    document.body.appendChild(batSignal);
    
    // Animate bat signal
    setTimeout(() => {
      batSignal.style.opacity = '1';
      batSignal.style.transform = 'scale(1.5) rotate(360deg)';
    }, 50);
    
    setTimeout(() => {
      batSignal.style.opacity = '0';
      batSignal.style.transform = 'scale(0) rotate(720deg)';
    }, 1000);
    
    setTimeout(() => {
      document.body.removeChild(batSignal);
    }, 1600);
  }
  
  // Initialize theme
  applyTheme(readTheme());

  // Theme toggle functionality with Batman flair
  function toggleTheme() {
    const current = body.getAttribute('data-theme');
    const next = current === 'light' ? 'dark' : 'light';
    applyTheme(next);
    
    // Show themed message
    const message = next === 'dark' ? 
      'Welcome to the shadows, Dark Knight.' : 
      'The sun rises over Gotham.';
    showTemporaryMessage(message);
  }

  // Temporary message display function
  function showTemporaryMessage(message) {
    const messageEl = document.createElement('div');
    messageEl.textContent = message;
    messageEl.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: var(--batman-gradient);
      border: 2px solid var(--accent);
      color: var(--accent);
      padding: 1rem 2rem;
      border-radius: 12px;
      z-index: 10000;
      font-weight: 600;
      box-shadow: 0 0 30px rgba(255, 215, 0, 0.4);
      opacity: 0;
      transition: all 0.3s ease;
      backdrop-filter: blur(10px);
    `;
    
    document.body.appendChild(messageEl);
    
    setTimeout(() => messageEl.style.opacity = '1', 50);
    setTimeout(() => messageEl.style.opacity = '0', 2000);
    setTimeout(() => document.body.removeChild(messageEl), 2300);
  }

  // Desktop and mobile theme buttons
  themeToggle && themeToggle.addEventListener('click', toggleTheme);
  mobileThemeToggle && mobileThemeToggle.addEventListener('click', toggleTheme);

  // Mobile navigation toggle
  if (mobileToggle && mobileNav) {
    const mobileCloseBtn = document.getElementById('mobile-close');
    
    function closeMobileNav() {
      mobileToggle.setAttribute('aria-expanded', 'false');
      mobileNav.setAttribute('aria-hidden', 'true');
      mobileNav.classList.remove('open');
      document.body.style.overflow = '';
    }
    
    function openMobileNav() {
      mobileToggle.setAttribute('aria-expanded', 'true');
      mobileNav.setAttribute('aria-hidden', 'false');
      mobileNav.classList.add('open');
      document.body.style.overflow = 'hidden';
    }

    // Hamburger menu toggle
    mobileToggle.addEventListener('click', () => {
      const isOpen = mobileToggle.getAttribute('aria-expanded') === 'true';
      
      if (isOpen) {
        closeMobileNav();
      } else {
        openMobileNav();
      }
    });

    // Close button functionality
    if (mobileCloseBtn) {
      mobileCloseBtn.addEventListener('click', closeMobileNav);
    }

    // Close mobile nav when clicking navigation links
    const mobileNavLinks = mobileNav.querySelectorAll('.mobile-nav-link[href^="#"]');
    mobileNavLinks.forEach(link => {
      link.addEventListener('click', closeMobileNav);
    });

    // Close mobile nav when clicking outside
    mobileNav.addEventListener('click', (e) => {
      if (e.target === mobileNav) {
        closeMobileNav();
      }
    });

    // Close mobile nav on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mobileNav.classList.contains('open')) {
        closeMobileNav();
      }
    });
  }

  // Project preview modal
  const modal = document.getElementById('modal');
  const modalClose = document.getElementById('modal-close');
  const modalTitle = document.getElementById('modal-title');
  const modalImg = document.getElementById('modal-img');
  const modalDesc = document.getElementById('modal-desc');
  const modalLink = document.getElementById('modal-link');

  function openModal(data){
    modalTitle.textContent = data.title || 'Project';
    modalImg.src = data.img || '';
    modalImg.alt = data.title || 'Project image';
    modalDesc.textContent = data.desc || '';
    modalLink.href = data.link || '#';
    modal.classList.add('open');
    modal.setAttribute('aria-hidden','false');
    // trap focus simply by focusing close button
    modalClose.focus();
  }
  function closeModal(){
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden','true');
  }
  // attach preview buttons
  document.querySelectorAll('.card').forEach(card=>{
    const previewBtn = card.querySelector('.preview-btn');
    const projectData = JSON.parse(card.getAttribute('data-project') || '{}');
    // optionally add a link key for modal button
    projectData.link = projectData.link || (card.querySelector('a') ? card.querySelector('a').href : '#');
    previewBtn && previewBtn.addEventListener('click', ()=> openModal(projectData));
    // keyboard: enter on card opens modal (accessible)
    card.addEventListener('keydown',(e)=>{
      if(e.key === 'Enter' || e.key === ' '){
        e.preventDefault();
        openModal(projectData);
      }
    });
  });
  modalClose.addEventListener('click', closeModal);
  modal.addEventListener('click',(e)=>{
    if(e.target === modal) closeModal();
  });
  document.addEventListener('keydown', (e)=>{
    if(e.key === 'Escape') closeModal();
  });

  // Contact form with Batman flair
  const contactForm = document.getElementById('contact-form');
  if(contactForm){
    contactForm.addEventListener('submit', (e)=>{
      e.preventDefault();
      const name = contactForm.name.value.trim() || 'Citizen of Gotham';
      
      // Create Batman-style success message
      showTemporaryMessage(`Signal received, ${name}. The Dark Knight will respond within 24 hours.`);
      
      // Add some visual flair
      createBatSignal();
      
      contactForm.reset();
    });
  }

  // Enhanced card hover effects with Batman animations
  document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('mouseenter', () => {
      // Add subtle glow effect
      card.style.boxShadow = `
        0 20px 60px rgba(0,0,0,0.8),
        0 0 40px rgba(255, 215, 0, 0.4),
        inset 0 1px 0 rgba(255, 215, 0, 0.2)
      `;
    });
    
    card.addEventListener('mouseleave', () => {
      card.style.boxShadow = '';
    });
  });

  // Back-to-top with enhanced Batman styling
  let scrollTimer = null;
  function handleScroll() {
    if (scrollTimer !== null) {
      clearTimeout(scrollTimer);
    }
    scrollTimer = setTimeout(() => {
      if(window.scrollY > 400) {
        toTopBtn.classList.add('show');
      } else {
        toTopBtn.classList.remove('show');
      }
    }, 10);
  }
  
  window.addEventListener('scroll', handleScroll, { passive: true });
  
  toTopBtn.addEventListener('click', () => {
    // Add bat signal effect when returning to top
    createBatSignal();
    window.scrollTo({top:0,behavior:'smooth'});
  });

  // Batman-themed page load effect
  document.addEventListener('DOMContentLoaded', () => {
    // Add entrance animation to hero section
    const hero = document.querySelector('.hero');
    if (hero) {
      hero.style.opacity = '0';
      hero.style.transform = 'translateY(50px)';
      
      setTimeout(() => {
        hero.style.transition = 'all 1s cubic-bezier(0.4, 0, 0.2, 1)';
        hero.style.opacity = '1';
        hero.style.transform = 'translateY(0)';
      }, 300);
    }
    
    // Show welcome message for first-time visitors
    if (!localStorage.getItem('dark-knight-visited')) {
      setTimeout(() => {
        showTemporaryMessage('Welcome to the Dark Knight\'s domain...');
        localStorage.setItem('dark-knight-visited', 'true');
      }, 1500);
    }
  });

  // Enhanced keyboard navigation
  document.addEventListener('keydown', (e) => {
    // Easter egg: Konami code for Batman
    const konamiCode = [38, 38, 40, 40, 37, 39, 37, 39, 66, 65]; // ↑↑↓↓←→←→BA
    window.konamiInput = window.konamiInput || [];
    window.konamiInput.push(e.keyCode);
    
    if (window.konamiInput.length > konamiCode.length) {
      window.konamiInput.shift();
    }
    
    if (window.konamiInput.join(',') === konamiCode.join(',')) {
      // Activate Batman mode
      document.body.style.filter = 'hue-rotate(45deg) saturate(1.5)';
      showTemporaryMessage('🦇 BATMAN MODE ACTIVATED 🦇');
      createBatSignal();
      
      setTimeout(() => {
        document.body.style.filter = '';
      }, 5000);
      
      window.konamiInput = [];
    }
  });

  // Create flying Batman animations
  function createFlyingBats() {
    const batSymbols = ['🦇', '🦇', '🦇', '🦇'];
    
    batSymbols.forEach((bat, index) => {
      const flyingBat = document.createElement('div');
      flyingBat.className = 'flying-bat';
      flyingBat.textContent = bat;
      flyingBat.style.top = `${20 + (index * 20)}%`;
      flyingBat.style.left = '-100px';
      flyingBat.style.animationDelay = `${index * 4}s`;
      document.body.appendChild(flyingBat);
    });
  }

  // Create Batman gift elements
  function createBatmanGifts() {
    const giftSymbols = ['🎁', '⚡', '🌟'];
    
    giftSymbols.forEach((gift, index) => {
      const giftElement = document.createElement('div');
      giftElement.className = 'batman-gift';
      giftElement.textContent = gift;
      giftElement.style.top = `${25 + (index * 25)}%`;
      giftElement.style.left = '-100px';
      giftElement.style.animationDelay = `${3 + (index * 5)}s`;
      document.body.appendChild(giftElement);
    });
  }

  // Initialize Batman animations
  function initBatmanAnimations() {
    createFlyingBats();
    createBatmanGifts();
  }

  // Start animations after page load
  setTimeout(initBatmanAnimations, 1000);
  
  // =========================
  // Custom Cursor Animation
  // =========================
  
  } // End of initializePortfolio function
  
  // =========================
  // Active Section Detection
  // =========================
  
  function initActiveSectionDetection() {
    const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');
    const sections = document.querySelectorAll('section[id], main[id]');
    
    function updateActiveSection() {
      let currentSection = '';
      const scrollPosition = window.scrollY + 100; // Offset for header height
      
      sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.offsetHeight;
        
        if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
          currentSection = section.getAttribute('id');
        }
      });
      
      // Update navigation links
      navLinks.forEach(link => {
        link.classList.remove('active');
        const href = link.getAttribute('href');
        if (href === `#${currentSection}`) {
          link.classList.add('active');
        }
      });
    }
    
    // Update on scroll with throttling for performance
    let ticking = false;
    function requestTick() {
      if (!ticking) {
        requestAnimationFrame(updateActiveSection);
        ticking = true;
        setTimeout(() => ticking = false, 10);
      }
    }
    
    window.addEventListener('scroll', requestTick);
    
    // Initial update
    updateActiveSection();
  }

})(); // End of IIFE
