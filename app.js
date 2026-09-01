const categories = ['Animation','All Work','Character Art','Environments','Game Assets & UI','Process & Concepts','Matching Sets'];
const gallery = document.querySelector('.gallery-grid');
const filters = document.querySelector('.filters');
const loadMore = document.querySelector('.load-more');
const lightbox = document.querySelector('.lightbox');
const lightboxMedia = document.querySelector('.lightbox-media');
const lightboxCategory = document.querySelector('.lightbox-meta span');
const lightboxTitle = document.querySelector('.lightbox-meta h2');
const lightboxCredit = document.querySelector('.lightbox-meta p');
let items = [];
let activeCategory = 'Animation';
const pageSize = 24;
let visibleCount = pageSize;

// The opening edit is intentionally arranged by colour: warm, earth, green,
// blue, violet and finally dark/neutral. Remaining work follows the edit.
const curatedOrder = [
  'art-104','art-095','art-160','art-107',
  'art-124','art-029','art-200','art-013',
  'art-051','art-056','art-089','art-141',
  'art-136','art-190','art-038','art-177',
  'art-075','art-073','art-185','art-207',
  'art-172','art-152','art-175','art-167'
];
const animationFirst = ['art-177','art-178','art-012','art-038','art-073','art-136','art-141','art-185','art-090'];

function orderedItems(source) {
  const order = activeCategory === 'Animation' ? animationFirst : curatedOrder;
  const rank = new Map(order.map((id,index) => [id,index]));
  return [...source].sort((a,b) => {
    const aRank = rank.has(a.id) ? rank.get(a.id) : Number.MAX_SAFE_INTEGER;
    const bRank = rank.has(b.id) ? rank.get(b.id) : Number.MAX_SAFE_INTEGER;
    return aRank - bRank;
  });
}

function categoryCount(category) {
  return category === 'All Work' ? items.length : items.filter(item => item.category === category).length;
}

function filteredItems() {
  const filtered = activeCategory === 'All Work' ? items : items.filter(item => item.category === activeCategory);
  return orderedItems(filtered);
}

function createFilters() {
  filters.innerHTML = categories.map(category => `<button type="button" class="${category === activeCategory ? 'active' : ''}" data-category="${category}" aria-pressed="${category === activeCategory}">${category}<span>${categoryCount(category)}</span></button>`).join('');
  filters.querySelectorAll('button').forEach(button => button.addEventListener('click', () => {
    activeCategory = button.dataset.category;
    visibleCount = pageSize;
    createFilters();
    renderGallery();
  }));
}

function mediaMarkup(item, index) {
  const src = item.src.replace(/^\/+/, '');
  if (item.media === 'video') return `<video src="${src}" muted loop playsinline preload="metadata" controlslist="nodownload" draggable="false"></video>`;
  return `<img src="${src}" alt="${item.title} — ${item.category}" loading="${index < 8 ? 'eager' : 'lazy'}" draggable="false">`;
}

function renderGallery() {
  const filtered = filteredItems();
  gallery.innerHTML = filtered.slice(0, visibleCount).map((item,index) => `
    <article class="gallery-card tone-${Math.min(5, Math.floor(index / 4))}">
      <button class="art-frame" type="button" data-art="${item.id}" aria-label="Open ${item.title} by ${item.artist}">
        ${mediaMarkup(item,index)}<span class="open-cue">OPEN +</span>
      </button>
      <div class="card-meta"><div><span>${item.category}</span><h3>${item.title}</h3></div><p>${item.artist}</p></div>
    </article>`).join('');
  gallery.querySelectorAll('[data-art]').forEach(button => {
    button.addEventListener('click', () => openArt(button.dataset.art));
    const video = button.querySelector('video');
    if (video) {
      button.addEventListener('mouseenter', () => video.play().catch(() => {}));
      button.addEventListener('mouseleave', () => { video.pause(); video.currentTime = 0; });
    }
  });
  loadMore.hidden = visibleCount >= filtered.length;
  loadMore.querySelector('span').textContent = `${Math.min(visibleCount, filtered.length)} / ${filtered.length}`;
}

function openArt(id) {
  const item = items.find(candidate => candidate.id === id);
  if (!item) return;
  const src = item.src.replace(/^\/+/, '');
  lightboxMedia.innerHTML = item.media === 'video' ? `<video src="${src}" controls controlslist="nodownload" autoplay loop playsinline draggable="false"></video>` : `<img src="${src}" alt="${item.title}" draggable="false">`;
  lightboxCategory.textContent = item.category;
  lightboxTitle.textContent = item.title;
  lightboxCredit.textContent = `Credit: ${item.artist}`;
  lightbox.hidden = false;
  document.body.classList.add('modal-open');
  document.querySelector('.close-lightbox').focus();
}

function closeArt() {
  lightbox.hidden = true;
  lightboxMedia.innerHTML = '';
  document.body.classList.remove('modal-open');
}

loadMore.addEventListener('click', () => { visibleCount += pageSize; renderGallery(); });
document.querySelector('.close-lightbox').addEventListener('click', closeArt);
lightbox.addEventListener('mousedown', event => { if (event.target === lightbox) closeArt(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !lightbox.hidden) closeArt(); });
document.querySelectorAll('.cover-art[data-art], .spotlight-card[data-art]').forEach(button => button.addEventListener('click', () => openArt(button.dataset.art)));

document.addEventListener('contextmenu', event => {
  if (event.target instanceof Element && event.target.closest('img, video, .art-frame, .feature, .lightbox-media')) event.preventDefault();
});
document.addEventListener('dragstart', event => {
  if (event.target instanceof Element && event.target.closest('img, video')) event.preventDefault();
});
document.addEventListener('keydown', event => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') event.preventDefault();
});

const gallerySource = Array.isArray(window.GALLERY_DATA)
  ? Promise.resolve(window.GALLERY_DATA)
  : fetch('gallery-data.json').then(response => response.json());

gallerySource.then(data => {
  items = data;
  createFilters();
  renderGallery();
}).catch(() => {
  gallery.innerHTML = '<p>Gallery could not load. Please refresh the page.</p>';
});
