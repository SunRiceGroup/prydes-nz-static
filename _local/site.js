'use strict';

function enableNavigation() {
    for (const label of document.querySelectorAll('.folder-toggle-label, .mobile-nav-toggle-label')) {
        label.tabIndex = 0;
        label.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                label.click();
            }
        });
    }

    const header = document.querySelector('#header');
    if (header?.querySelector('#mainNavWrapper.show-on-scroll')) {
        const update = () => header.classList.toggle('static-nav-fixed', scrollY > header.offsetHeight);
        window.addEventListener('scroll', update, {passive: true});
        update();
    }
}

async function resolveArchive() {
    const query = new URLSearchParams(location.search);
    if (![...query.keys()].some(key => ['author','offset','reversePaginate','tag','category'].includes(key))) return;
    query.sort();
    const path = decodeURIComponent(location.pathname).replace(/\/$/, '') || '/';
    const response = await fetch('/_local/archive-map.json');
    if (!response.ok) return;
    const aliases = await response.json();
    const target = aliases[path + '?' + query.toString()];
    if (target) location.replace(target + location.hash);
}

let searchIndex;
function getSearchIndex() {
    searchIndex ??= fetch('/_local/search-index.json').then(response => {
        if (!response.ok) throw new Error('Search index unavailable');
        return response.json();
    });
    return searchIndex;
}

function findMatches(items, query) {
    const phrase = query.toLocaleLowerCase('en-NZ');
    const words = phrase.split(/\s+/);
    return items.map(([url, title, description]) => {
        const heading = title.toLocaleLowerCase('en-NZ');
        const text = description.toLocaleLowerCase('en-NZ');
        if (!words.every(word => heading.includes(word) || text.includes(word))) return null;
        const rank = heading.includes(phrase) ? 3 : words.every(word => heading.includes(word)) ? 2 : 1;
        return {url, title, description, rank};
    }).filter(Boolean).sort((a, b) => b.rank - a.rank || a.title.localeCompare(b.title, 'en-NZ'));
}

function searchResult(item, preview = false) {
    const row = document.createElement(preview ? 'div' : 'li');
    if (preview) row.className = 'search-result';
    const link = document.createElement('a');
    link.href = item.url;
    link.textContent = item.title;
    row.append(link);
    if (!preview && item.description) {
        const description = document.createElement('p');
        description.textContent = item.description.slice(0, 260);
        row.append(description);
    }
    return row;
}

function enableSearch() {
    for (const wrapper of document.querySelectorAll('[data-local-search]')) {
        const field = wrapper.querySelector('input[type="search"]');
        if (!field) continue;
        const button = wrapper.querySelector('[data-search-submit]');
        const popup = wrapper.querySelector('.sqs-search-preview-ui');
        const list = popup?.querySelector('.sqs-search-ui-list');
        const notice = popup?.querySelector('.search-result-notice');
        let timer;
        const queryUrl = value => '/search/?' + new URLSearchParams({q: value});
        const submit = () => {
            const term = field.value.trim();
            if (term) location.assign(queryUrl(term));
        };
        field.addEventListener('keydown', event => {
            if (event.key === 'Enter' && !event.isComposing) {
                event.preventDefault();
                submit();
            }
            if (event.key === 'Escape') popup?.classList.add('hide');
        });
        button?.addEventListener('click', submit);
        if (!popup || !list) continue;
        field.addEventListener('input', () => {
            clearTimeout(timer);
            const value = field.value.trim();
            if (value.length < 2) {
                popup.classList.add('hide');
                return;
            }
            timer = setTimeout(async () => {
                try {
                    const matches = findMatches(await getSearchIndex(), value);
                    if (value !== field.value.trim()) return;
                    list.replaceChildren(...matches.slice(0, 5).map(item => searchResult(item, true)));
                    if (notice) {
                        notice.textContent = matches.length ? 'Search results' : 'No results found';
                        notice.classList.remove('hide');
                    }
                    popup.classList.remove('hide');
                } catch {
                    popup.classList.add('hide');
                }
            }, 125);
        });
        wrapper.addEventListener('focusout', event => {
            if (!wrapper.contains(event.relatedTarget)) popup.classList.add('hide');
        });
    }
}

async function renderSearchPage() {
    const list = document.querySelector('#search-results');
    if (!list) return;
    const query = new URLSearchParams(location.search).get('q')?.trim();
    if (!query) return;
    document.querySelector('#search-query').value = query;
    const status = document.querySelector('#search-status');
    try {
        const matches = findMatches(await getSearchIndex(), query);
        list.replaceChildren(...matches.map(item => searchResult(item)));
        status.textContent = matches.length ? matches.length + ' results' : 'No results found.';
    } catch {
        status.textContent = 'Search is temporarily unavailable.';
    }
}

enableNavigation();
enableSearch();
renderSearchPage();
resolveArchive().catch(() => {});
