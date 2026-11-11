'use strict';

(() => {
  function createButton(label, text) {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', label);
    button.textContent = text;
    return button;
  }

  function controls(container, move) {
    const navigation = document.createElement('div');
    navigation.className = 'static-gallery-controls';
    for (const [step, label, symbol] of [[-1, 'Previous image', '‹'], [1, 'Next image', '›']]) {
      const button = createButton(label, symbol);
      button.addEventListener('click', () => move(step));
      navigation.append(button);
    }
    container.append(navigation);
    return navigation;
  }

  function imageRatio(image) {
    const [width, height] = (image.dataset.imageDimensions || '').split('x').map(Number);
    if (width && height) return width / height;
    if (image.naturalWidth && image.naturalHeight) return image.naturalWidth / image.naturalHeight;
    return 0;
  }

  function carousel(gallery) {
    const track = gallery.querySelector(':scope > .sqs-gallery');
    if (!track) return;
    const slides = [...track.children].filter(slide => slide.matches('img') || slide.querySelector('img'));
    if (!slides.length) return;
    gallery.classList.add('static-gallery');
    const firstImage = slides[0].matches('img') ? slides[0] : slides[0].querySelector('img');
    const setRatio = () => {
      const ratio = imageRatio(firstImage);
      if (ratio) gallery.style.setProperty('--gallery-ratio', ratio);
    };
    setRatio();
    if (!imageRatio(firstImage)) firstImage.addEventListener('load', setRatio, { once: true });

    let current = 0;
    function select(position) {
      current = (position + slides.length) % slides.length;
      for (const [index, slide] of slides.entries()) slide.hidden = index !== current;
    }
    select(0);
    if (slides.length < 2) return;
    controls(gallery, step => select(current + step));
    gallery.setAttribute('role', 'region');
    gallery.setAttribute('aria-label', 'Image gallery');
    gallery.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      select(current + (event.key === 'ArrowLeft' ? -1 : 1));
    });
  }

  let viewer;
  function openViewer(photos, position) {
    if (!viewer) {
      const dialog = document.createElement('dialog');
      dialog.className = 'static-photo-dialog';
      dialog.setAttribute('aria-label', 'Photo gallery');
      const frame = document.createElement('figure');
      const image = document.createElement('img');
      const caption = document.createElement('figcaption');
      const close = createButton('Close gallery', '×');
      close.className = 'static-photo-close';
      close.addEventListener('click', () => dialog.close());
      dialog.addEventListener('click', event => {
        if (event.target === dialog) dialog.close();
      });
      frame.append(image, caption);
      dialog.append(frame, close);
      document.body.append(dialog);

      let current = 0;
      let entries = [];
      function select(index) {
        current = (index + entries.length) % entries.length;
        const entry = entries[current];
        image.src = entry.image;
        image.alt = entry.alt;
        caption.replaceChildren(...(entry.caption ? [...entry.caption.children].map(node => node.cloneNode(true)) : []));
        caption.hidden = !caption.textContent.trim();
      }
      const navigation = controls(frame, step => select(current + step));
      dialog.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight'].includes(event.key) || entries.length < 2) return;
        event.preventDefault();
        select(current + (event.key === 'ArrowLeft' ? -1 : 1));
      });
      viewer = (items, index) => {
        entries = items;
        navigation.style.display = entries.length > 1 ? '' : 'none';
        select(index);
        if (!dialog.open) dialog.showModal();
        close.focus();
      };
    }
    viewer(photos, position);
  }

  function enableLightbox(links, photos) {
    if (typeof HTMLDialogElement === 'undefined' || !HTMLDialogElement.prototype.showModal) return;
    links.forEach((link, index) => link.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      openViewer(photos, index);
    }));
  }

  function systemGallery(gallery) {
    const track = gallery.querySelector('.slides');
    if (!track) return;
    const slides = [...track.children].filter(slide => slide.matches('.slide') && slide.querySelector('img[src]'));
    if (!slides.length) return;
    gallery.classList.remove('sqs-system-gallery-init');
    gallery.classList.add('sqs-system-gallery-ready', 'static-system-gallery');

    const entries = slides.map(slide => {
      const image = slide.querySelector('img[src]');
      return { image: image.getAttribute('src'), alt: image.alt, caption: slide.querySelector('.slide-meta') };
    });
    if (slides.length > 1) {
      const links = slides.map((slide, index) => {
        const image = slide.querySelector('img[src]');
        if (image.closest('a')) return image.closest('a');
        const link = document.createElement('a');
        link.className = 'static-photo-trigger';
        link.href = entries[index].image;
        link.setAttribute('aria-label', entries[index].alt ? 'View ' + entries[index].alt : 'View image ' + (index + 1));
        image.replaceWith(link);
        link.append(image);
        return link;
      });
      enableLightbox(links, entries);
    }

    const photos = slides.map(slide => slide.querySelector('img[src]'));
    function layout() {
      const width = track.clientWidth;
      if (!width) return;
      const gap = 20;
      const columns = Math.max(1, Math.min(3, Math.floor((width + gap) / 320)));
      const columnWidth = (width - gap * (columns - 1)) / columns;
      const heights = Array(columns).fill(0);
      for (const [index, slide] of slides.entries()) {
        const column = heights.indexOf(Math.min(...heights));
        const height = columnWidth / (imageRatio(photos[index]) || 4 / 3);
        slide.style.setProperty('left', column * (columnWidth + gap) + 'px', 'important');
        slide.style.setProperty('top', heights[column] + 'px', 'important');
        slide.style.setProperty('width', columnWidth + 'px', 'important');
        slide.style.setProperty('height', height + 'px', 'important');
        heights[column] += height + gap;
      }
      track.style.setProperty('height', Math.max(...heights) - gap + 'px', 'important');
    }
    layout();
    if ('ResizeObserver' in window) {
      let previousWidth = track.clientWidth;
      new ResizeObserver(() => {
        if (track.clientWidth === previousWidth) return;
        previousWidth = track.clientWidth;
        layout();
      }).observe(track);
    } else {
      window.addEventListener('resize', layout);
    }
    for (const image of photos) {
      if (!imageRatio(image)) image.addEventListener('load', layout, { once: true });
    }
  }

  function enableGalleries() {
    for (const gallery of document.querySelectorAll('.sqs-gallery-block-slider, .sqs-gallery-block-slideshow')) {
      carousel(gallery);
    }
    for (const gallery of document.querySelectorAll('.sqs-system-gallery.sqs-gallery-list')) {
      systemGallery(gallery);
    }
    for (const gallery of document.querySelectorAll('.sqs-gallery-block-grid')) {
      const links = [...gallery.querySelectorAll('a.js-gallery-lightbox-opener[href]')];
      const photos = links.map(link => ({ image: link.getAttribute('href'), alt: link.querySelector('img')?.alt || '' }));
      if (links.length) enableLightbox(links, photos);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', enableGalleries, { once: true });
  else enableGalleries();
})();
