document.getElementById('year').textContent = new Date().getFullYear();

// Reveal the sticky "Get a Quote" nudge once the visitor scrolls past the
// inline booking widget, so it reinforces rather than duplicates it.
const bookingSection = document.getElementById('booking');
const quoteNudge = document.getElementById('quote-nudge');

if (bookingSection && quoteNudge) {
  const observer = new IntersectionObserver(
    ([entry]) => {
      quoteNudge.classList.toggle('is-visible', entry.boundingClientRect.top < 0);
    },
    { threshold: 0 }
  );
  observer.observe(bookingSection);
}

// Mobile nav: toggle the slide-down panel and close it on link tap or outside click
const navToggle = document.getElementById('nav-toggle');
const navLinks = document.getElementById('nav-links');

if (navToggle && navLinks) {
  const closeNav = () => {
    navLinks.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
  };

  navToggle.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });

  navLinks.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', closeNav);
  });

  document.addEventListener('click', (event) => {
    if (!navLinks.classList.contains('is-open')) return;
    if (navLinks.contains(event.target) || navToggle.contains(event.target)) return;
    closeNav();
  });
}

// Nav goes from transparent (over the hero) to a solid ivory bar once the
// visitor scrolls past it.
const siteHeader = document.querySelector('.site-header');

if (siteHeader) {
  const updateHeaderState = () => {
    siteHeader.classList.toggle('is-scrolled', window.scrollY > 40);
  };
  updateHeaderState();
  window.addEventListener('scroll', updateHeaderState, { passive: true });
}

// Background video, progressively enhanced over each .media-bg[data-video]'s
// static fallback image. No video files exist in this project yet, so every
// slot currently 404s and stays on its image — drop a real .mp4 at the
// referenced path to activate it. Skipped entirely under reduced motion.
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!prefersReducedMotion) {
  document.querySelectorAll('.media-bg[data-video]').forEach((wrap) => {
    const src = wrap.dataset.video;
    if (!src) return;

    const video = document.createElement('video');
    video.className = 'media-video';
    video.autoplay = true;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.setAttribute('aria-hidden', 'true');

    const fallbackToImage = () => {
      wrap.classList.add('is-fallback');
      video.remove();
    };
    // A failed <source> candidate fires 'error' on the source itself, not
    // the video (the video only errors this way once every source is
    // exhausted with no candidates left to try) — listen on both.
    video.addEventListener('error', fallbackToImage);

    const source = document.createElement('source');
    source.addEventListener('error', fallbackToImage);
    source.src = src;
    source.type = 'video/mp4';

    video.appendChild(source);
    wrap.appendChild(video);
  });
}
