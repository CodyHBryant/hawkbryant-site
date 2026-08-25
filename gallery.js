(() => {
  'use strict';

  const galleryGrid = document.getElementById('gallery-grid');
  const lightbox = document.getElementById('lightbox');
  const lightboxImage = document.getElementById('lightbox-img');
  const closeButton = document.getElementById('lightbox-close');
  const previousButton = document.getElementById('lightbox-prev');
  const nextButton = document.getElementById('lightbox-next');

  if (!galleryGrid || !lightbox || !lightboxImage) return;

  let galleryItems = [];
  let currentIndex = 0;
  let lastFocusedElement = null;

  function captionFor(photo) {
    return [photo.title, photo.year].filter(Boolean).join(', ');
  }

  function setMetadata(element, photo) {
    const fields = ['project', 'location', 'medium', 'camera', 'filmStock'];

    fields.forEach((field) => {
      if (photo[field]) element.dataset[field] = photo[field];
    });
  }

  function createGalleryItem(photo, index) {
    const figure = document.createElement('figure');
    const image = document.createElement('img');
    const caption = document.createElement('figcaption');
    const captionText = captionFor(photo);

    figure.className = 'gallery-item';
    figure.dataset.photoId = photo.id;
    figure.tabIndex = 0;
    figure.setAttribute('role', 'button');
    figure.setAttribute('aria-label', `Open ${captionText || photo.alt || 'photograph'}`);
    setMetadata(figure, photo);

    image.src = photo.src;
    image.alt = photo.alt || '';
    image.loading = index < 4 ? 'eager' : 'lazy';
    image.decoding = 'async';

    caption.textContent = captionText;

    figure.append(image, caption);
    figure.addEventListener('click', () => openLightbox(index, figure));
    figure.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      openLightbox(index, figure);
    });

    return { figure, image, photo };
  }

  function showImage(index) {
    if (!galleryItems.length) return;

    currentIndex = (index + galleryItems.length) % galleryItems.length;
    const item = galleryItems[currentIndex];

    lightboxImage.src = item.image.currentSrc || item.image.src;
    lightboxImage.alt = item.photo.alt || '';
  }

  function openLightbox(index, trigger) {
    lastFocusedElement = trigger || document.activeElement;
    showImage(index);
    lightbox.classList.add('active');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    closeButton.focus();
  }

  function closeLightbox() {
    if (!lightbox.classList.contains('active')) return;

    lightbox.classList.remove('active');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';

    if (lastFocusedElement) lastFocusedElement.focus();
  }

  function previousImage() {
    showImage(currentIndex - 1);
  }

  function nextImage() {
    showImage(currentIndex + 1);
  }

  function bindLightboxControls() {
    closeButton.addEventListener('click', closeLightbox);
    previousButton.addEventListener('click', previousImage);
    nextButton.addEventListener('click', nextImage);

    lightbox.addEventListener('click', (event) => {
      if (event.target === lightbox) closeLightbox();
    });

    document.addEventListener('keydown', (event) => {
      if (!lightbox.classList.contains('active')) return;
      if (event.key === 'Escape') closeLightbox();
      if (event.key === 'ArrowLeft') previousImage();
      if (event.key === 'ArrowRight') nextImage();
    });
  }

  async function loadGallery() {
    try {
      const response = await fetch('data/photos.json');
      if (!response.ok) throw new Error(`Gallery data request failed: ${response.status}`);

      const data = await response.json();
      if (!Array.isArray(data.photos)) throw new Error('Gallery data must contain a photos array.');

      const photos = data.photos
        .filter((photo) => photo && photo.featured !== false && photo.src)
        .sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER));

      const fragment = document.createDocumentFragment();
      galleryItems = photos.map((photo, index) => {
        const item = createGalleryItem(photo, index);
        fragment.append(item.figure);
        return item;
      });

      galleryGrid.replaceChildren(fragment);
      bindLightboxControls();
    } catch (error) {
      console.error(error);
      galleryGrid.textContent = 'The gallery could not be loaded.';
    }
  }

  loadGallery();
})();
