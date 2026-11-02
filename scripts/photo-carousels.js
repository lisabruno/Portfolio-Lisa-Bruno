document.querySelectorAll('.project-carousel-shell').forEach((shell) => {
  const carousel = shell.querySelector('.project-carousel');
  const previousButton = shell.querySelector('.project-carousel-button--previous');
  const nextButton = shell.querySelector('.project-carousel-button--next');

  if (!carousel || !previousButton || !nextButton) {
    return;
  }

  const slide = carousel.querySelector('.project-carousel-slide');

  if (!slide) {
    return;
  }

  carousel.setAttribute('role', 'region');
  carousel.setAttribute('aria-roledescription', 'carrousel');
  if (!carousel.hasAttribute('aria-label')) {
    carousel.setAttribute('aria-label', 'Galerie défilante');
  }
  carousel.setAttribute('tabindex', '0');

  const getScrollDistance = () => slide.getBoundingClientRect().width + 14;
  const scrollBehavior = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';

  previousButton.addEventListener('click', () => {
    carousel.scrollBy({ left: -getScrollDistance(), behavior: scrollBehavior() });
  });

  nextButton.addEventListener('click', () => {
    carousel.scrollBy({ left: getScrollDistance(), behavior: scrollBehavior() });
  });

  carousel.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
      return;
    }

    event.preventDefault();
    carousel.scrollBy({
      left: event.key === 'ArrowLeft' ? -getScrollDistance() : getScrollDistance(),
      behavior: scrollBehavior()
    });
  });
});
