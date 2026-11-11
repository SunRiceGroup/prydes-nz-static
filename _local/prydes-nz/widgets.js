'use strict';

function resizeSelector(frame) {
  const size = () => {
    const content = frame.contentDocument?.getElementById('surveyContainer');
    if (!content) return;
    const observer = new ResizeObserver(() => {
      frame.style.height = Math.ceil(content.getBoundingClientRect().height) + 2 + 'px';
    });
    observer.observe(content);
  };
  frame.addEventListener('load', size, {once: true});
  if (frame.contentDocument?.readyState === 'complete') size();
}

const selector = document.querySelector('iframe#prydes-quiz');
if (selector) resizeSelector(selector);

function normalize(text) {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}

async function startStockists(root) {
  const response = await fetch('/_local/prydes-nz/stockists.json');
  if (!response.ok) return;
  const {stores, outline} = await response.json();
  const list = root.querySelector('.stockists-list');
  const map = root.querySelector('svg');
  const dots = map.querySelector('g');
  const status = root.querySelector('.stockists-status');
  const field = root.querySelector('input');
  map.querySelector('path').setAttribute('d', outline);
  const full = {x: 0, y: 22, w: 540, h: 710};
  let view = {...full};
  let selected;
  let visible = [];
  let pointer;
  const svg = 'http://www.w3.org/2000/svg';
  const points = stores.map((store) => ({
    ...store,
    x: (store.lon - 165) * 36,
    y: (-33 - store.lat) * 48,
    text: normalize(store.name + ' ' + store.address),
  }));

  function drawView() {
    map.setAttribute('viewBox', [view.x, view.y, view.w, view.h].join(' '));
  }

  function link(text, href) {
    const node = document.createElement('a');
    node.textContent = text;
    node.href = href;
    if (href.startsWith('http')) {
      node.target = '_blank';
      node.rel = 'noopener noreferrer';
    }
    return node;
  }

  function select(point, move) {
    const active = visible.find((entry) => entry.point === point);
    if (!active) return;
    if (selected) {
      selected.card.removeAttribute('data-active');
      selected.dot.removeAttribute('data-active');
    }
    selected = active;
    active.card.dataset.active = '';
    active.dot.dataset.active = '';
    list.scrollTop = Math.max(0, active.card.offsetTop - list.clientHeight / 4);
    if (move) {
      view = {w: 185, h: 238, x: point.x - 92.5, y: point.y - 119};
      drawView();
    }
  }

  function render(results) {
    selected = null;
    visible = [];
    list.replaceChildren();
    dots.replaceChildren();
    for (const point of results) {
      const card = document.createElement('li');
      const name = document.createElement('h3');
      const address = document.createElement('p');
      name.textContent = point.name;
      address.textContent = point.address;
      const actions = document.createElement('div');
      actions.className = 'stockists-links';
      const center = document.createElement('button');
      center.type = 'button';
      center.textContent = 'View on map';
      center.setAttribute('aria-label', 'View ' + point.name + ' on map');
      center.addEventListener('click', () => select(point, true));
      actions.append(center);
      if (point.phone) actions.append(link(point.phone, 'tel:' + point.phone.replace(/[^0-9+]/g, '')));
      if (point.url) actions.append(link('Website', point.url));
      actions.append(link('Directions', 'https://www.google.com/maps/dir/?api=1&destination=' +
        encodeURIComponent(point.lat + ',' + point.lon)));
      card.append(name, address, actions);
      list.append(card);

      const dot = document.createElementNS(svg, 'circle');
      dot.setAttribute('cx', point.x);
      dot.setAttribute('cy', point.y);
      dot.setAttribute('r', 4.8);
      const hint = document.createElementNS(svg, 'title');
      hint.textContent = point.name;
      dot.append(hint);
      dot.addEventListener('click', () => select(point, false));
      dots.append(dot);
      visible.push({point, card, dot});
    }
    const count = results.length;
    status.textContent = count ? count + (count === 1 ? ' stockist' : ' stockists') : 'No stockists match your search.';
    if (!count) view = {...full};
    else if (count <= 12) {
      const xs = results.map((point) => point.x);
      const ys = results.map((point) => point.y);
      const left = Math.min(...xs), right = Math.max(...xs);
      const top = Math.min(...ys), bottom = Math.max(...ys);
      const width = Math.max(right - left + 60, 160, (bottom - top + 60) * .76);
      const height = width / .76;
      view = {w: width, h: height, x: (left + right - width) / 2, y: (top + bottom - height) / 2};
    } else view = {...full};
    drawView();
  }

  function find() {
    const terms = normalize(field.value).split(/\s+/).filter(Boolean);
    render(points.filter((point) => terms.every((term) => point.text.includes(term))));
  }

  root.querySelector('.stockists-submit').addEventListener('click', find);
  root.querySelector('.stockists-reset').addEventListener('click', () => {
    field.value = '';
    find();
    field.focus();
  });
  field.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      find();
    }
  });

  for (const control of root.querySelectorAll('[data-map-zoom]')) {
    control.addEventListener('click', () => {
      if (control.dataset.mapZoom === 'reset') view = {...full};
      else {
        const factor = control.dataset.mapZoom === 'in' ? .73 : 1.37;
        const width = Math.min(full.w * 1.8, Math.max(42, view.w * factor));
        const height = view.h * width / view.w;
        view = {w: width, h: height, x: view.x + (view.w - width) / 2, y: view.y + (view.h - height) / 2};
      }
      drawView();
    });
  }

  map.addEventListener('pointerdown', (event) => {
    if (event.target.closest('circle') || event.button !== 0) return;
    pointer = {id: event.pointerId, x: event.clientX, y: event.clientY, view: {...view}};
    map.setPointerCapture(event.pointerId);
    map.dataset.dragging = '';
  });
  map.addEventListener('pointermove', (event) => {
    if (pointer?.id !== event.pointerId) return;
    const matrix = map.getScreenCTM();
    if (!matrix) return;
    view = {
      ...pointer.view,
      x: pointer.view.x - (event.clientX - pointer.x) / matrix.a,
      y: pointer.view.y - (event.clientY - pointer.y) / matrix.d,
    };
    drawView();
  });
  map.addEventListener('lostpointercapture', () => {
    pointer = null;
    delete map.dataset.dragging;
  });

  render(points);
}

const stockists = document.querySelector('#storemapper');
if (stockists) startStockists(stockists).catch(() => {
  stockists.querySelector('.stockists-status').textContent = 'The stockist directory could not be loaded.';
});

const contactMap = document.querySelector('.prydes-contact-map');
if (contactMap) {
  fetch('/_local/prydes-nz/stockists.json')
    .then((response) => response.ok ? response.json() : null)
    .then((data) => {
      if (data) contactMap.querySelector('path').setAttribute('d', data.outline);
    })
    .catch(() => {});
}
