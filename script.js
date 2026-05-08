const API_KEY = '1eb8dd304876025cb465a58995f86453';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/w500';

let currentPage = 1;
let currentEndpoint = '/movie/popular';
let favorites = JSON.parse(localStorage.getItem('myMovies')) || [];
let watchlist = JSON.parse(localStorage.getItem('myWatchlist')) || [];

async function fetchMovies(endpoint, append = false) {
    const grid = document.getElementById('movieGrid');
    if (!append) {
        grid.innerHTML = Array(10).fill(0).map(() => `<div class="h-80 w-full rounded-2xl skeleton"></div>`).join('');
    }

    document.getElementById('loading').classList.remove('hidden');
    try {
        const url = `${BASE_URL}${endpoint}${endpoint.includes('?') ? '&' : '?'}api_key=${API_KEY}&page=${currentPage}`;
        const response = await fetch(url);
        const data = await response.json();
        renderCards(data.results, append);
    } catch (error) {
        console.error("Fetch Error:", error);
    }
    document.getElementById('loading').classList.add('hidden');
}

function renderCards(items, append, isWatchlistPage = false) {
    const grid = document.getElementById('movieGrid');
    if (!append) grid.innerHTML = '';

    items.forEach(item => {
        if (!item.poster_path && !item.profile_path) return;

        const isFav = favorites.some(fav => fav.id === item.id);
        const isAddedToWatchlist = watchlist.some(w => w.id === item.id);

        const card = document.createElement('div');
        card.className = 'movie-card group relative bg-slate-900 rounded-2xl overflow-hidden shadow-lg border border-slate-800 cursor-pointer';

        let type = item.media_type || (currentEndpoint.includes('/tv') ? 'tv' : currentEndpoint.includes('/person') ? 'person' : 'movie');
        card.onclick = () => openDetails(type, item.id);

        const image = item.poster_path || item.profile_path;
        const title = item.title || item.name;
        const rating = item.vote_average ? `★ ${item.vote_average.toFixed(1)}` : (type === 'person' ? 'Actor' : 'N/A');
        const date = (item.release_date || item.first_air_date || '').split('-')[0];

        card.innerHTML = `
                    <img src="${IMG_URL + image}" class="w-full h-80 object-cover group-hover:scale-110 transition-transform duration-500">
                    <div class="absolute top-3 right-3 z-30 flex flex-col gap-2">
                        <button onclick="toggleFavorite(event, ${JSON.stringify(item).replace(/"/g, '&quot;')})" 
                                class="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center hover:bg-rose-600 transition shadow-lg">
                            <i class="${isFav ? 'fas' : 'far'} fa-heart text-white"></i>
                        </button>
                        ${isWatchlistPage ? `
                        <button onclick="removeFromWatchlist(event, ${item.id})" 
                                class="w-10 h-10 rounded-full bg-red-600/80 backdrop-blur-md flex items-center justify-center hover:bg-red-700 transition shadow-lg">
                            <i class="fas fa-times text-white"></i>
                        </button>` : `
                        <button onclick="toggleWatchlist(event, ${JSON.stringify(item).replace(/"/g, '&quot;')})" 
                                class="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center hover:bg-blue-600 transition shadow-lg">
                            <i class="${isAddedToWatchlist ? 'fas' : 'far'} fa-bookmark text-white text-xs"></i>
                        </button>`}
                    </div>
                    <div class="overlay absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent opacity-0 p-5 flex flex-col justify-end">
                        <span class="text-rose-500 text-xs font-bold mb-1">${date}</span>
                        <h3 class="font-bold text-white leading-tight truncate">${title}</h3>
                        <div class="flex items-center justify-between mt-3">
                            <span class="bg-rose-600 text-[10px] px-2 py-1 rounded text-white font-bold">${rating}</span>
                            <i class="fas ${type === 'person' ? 'fa-user-tag' : 'fa-play-circle'} text-2xl text-white/80"></i>
                        </div>
                    </div>
                `;
        grid.appendChild(card);
    });
}

async function openDetails(type, id) {
    const modal = document.getElementById('trailerModal');
    const videoContainer = document.getElementById('videoContainer');
    modal.classList.remove('hidden');
    videoContainer.innerHTML = `<div class="loader"></div>`;

    try {
        if (type === 'person') {
            // Logic for Actors
            const res = await fetch(`${BASE_URL}/person/${id}?api_key=${API_KEY}`);
            const data = await res.json();
            document.getElementById('modalTitle').innerText = data.name;
            document.getElementById('modalDesc').innerText = data.biography || "Biography not available.";
            document.getElementById('modalRating').innerText = "Celebrity";
            document.getElementById('modalDate').innerText = data.birthday ? `Born: ${data.birthday}` : "N/A";

            if (data.profile_path) {
                videoContainer.innerHTML = `<img src="${IMG_URL + data.profile_path}" class="rounded-2xl shadow-2xl max-h-full object-contain p-4">`;
            } else {
                videoContainer.innerHTML = `<i class="fas fa-user text-6xl text-slate-700"></i>`;
            }
        } else {
            // Logic for Movies/TV
            const [detailsRes, videosRes] = await Promise.all([
                fetch(`${BASE_URL}/${type}/${id}?api_key=${API_KEY}`),
                fetch(`${BASE_URL}/${type}/${id}/videos?api_key=${API_KEY}`)
            ]);

            const details = await detailsRes.json();
            const videoData = await videosRes.json();
            const title = details.title || details.name;
            const trailer = videoData.results.find(v => v.type === 'Trailer' && v.site === 'YouTube') || videoData.results[0];

            document.getElementById('modalTitle').innerText = title;
            document.getElementById('modalDesc').innerText = details.overview || "No description available.";
            document.getElementById('modalRating').innerText = `★ ${details.vote_average ? details.vote_average.toFixed(1) : 'N/A'}`;
            document.getElementById('modalDate').innerText = (details.release_date || details.first_air_date || 'N/A').split('-')[0];

            if (trailer) {
                videoContainer.innerHTML = `<iframe class="w-full h-full" src="https://www.youtube.com/embed/${trailer.key}?autoplay=1" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
            } else {
                const ytLink = `https://www.youtube.com/results?search_query=${encodeURIComponent(title + ' trailer')}`;
                videoContainer.innerHTML = `<div class="text-white text-center p-10"><i class="fas fa-video-slash text-4xl mb-4"></i><p class="mb-6">No trailer found.</p><a href="${ytLink}" target="_blank" class="bg-rose-600 px-6 py-3 rounded-full font-bold">Search YouTube</a></div>`;
            }
        }
    } catch (error) { console.error("Modal Error:", error); }
}

function toggleWatchlist(event, movie) {
    event.stopPropagation();
    const index = watchlist.findIndex(m => m.id === movie.id);
    const btnIcon = event.currentTarget.querySelector('i');
    if (index === -1) {
        watchlist.push(movie);
        btnIcon.classList.replace('far', 'fas');
    } else {
        watchlist.splice(index, 1);
        btnIcon.classList.replace('fas', 'far');
    }
    localStorage.setItem('myWatchlist', JSON.stringify(watchlist));
}

function removeFromWatchlist(event, id) {
    event.stopPropagation();
    watchlist = watchlist.filter(m => m.id !== id);
    localStorage.setItem('myWatchlist', JSON.stringify(watchlist));
    showWatchlist();
}

function showWatchlist() {
    document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
    document.getElementById('sectionTitle').innerText = "My Watchlist";
    document.getElementById('loadMore').classList.add('hidden');
    if (watchlist.length === 0) {
        document.getElementById('movieGrid').innerHTML = `<div class="col-span-full py-20 text-center text-slate-500">No movies in Watchlist.</div>`;
    } else { renderCards(watchlist, false, true); }
}

function toggleFavorite(event, movie) {
    event.stopPropagation();
    const index = favorites.findIndex(f => f.id === movie.id);
    if (index === -1) { favorites.push(movie); }
    else { favorites.splice(index, 1); }
    localStorage.setItem('myMovies', JSON.stringify(favorites));
    if (document.getElementById('sectionTitle').innerText === 'My Favorite Movies') { showFavorites(); }
    else {
        const icon = event.currentTarget.querySelector('i');
        icon.classList.toggle('fas'); icon.classList.toggle('far');
    }
}

function showFavorites() {
    document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
    document.getElementById('sectionTitle').innerText = 'My Favorite Movies';
    document.getElementById('loadMore').classList.add('hidden');
    if (favorites.length === 0) {
        document.getElementById('movieGrid').innerHTML = `<div class="col-span-full py-20 text-center">No favorites yet</div>`;
    } else { renderCards(favorites, false); }
}

function filterByGenre(id, name, btn) {
    document.querySelectorAll('.genre-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentPage = 1;
    currentEndpoint = `/discover/movie?with_genres=${id}`;
    document.getElementById('sectionTitle').innerText = `${name} Movies`;
    fetchMovies(currentEndpoint);
}

function closeTrailer() {
    document.getElementById('trailerModal').classList.add('hidden');
    document.getElementById('videoContainer').innerHTML = '';
}

function changeCategory(endpoint, title, btn) {
    document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
    document.querySelectorAll('.genre-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('sectionTitle').innerText = title;
    document.getElementById('loadMore').classList.remove('hidden');
    currentPage = 1; currentEndpoint = endpoint;
    fetchMovies(endpoint);
}

document.getElementById('searchInput').addEventListener('keyup', (e) => {
    const query = e.target.value;
    if (query.length > 2) {
        currentEndpoint = `/search/multi?query=${query}`;
        currentPage = 1; fetchMovies(currentEndpoint);
    }
});

document.getElementById('loadMore').addEventListener('click', () => {
    currentPage++; fetchMovies(currentEndpoint, true);
});

document.getElementById('themeToggle').addEventListener('click', () => {
    document.getElementById('bodyTag').classList.toggle('bg-gray-100');
    document.getElementById('mainScroll').classList.toggle('bg-white');
    document.getElementById('sidebar').classList.toggle('bg-slate-50');
    document.getElementById('bodyTag').classList.toggle('text-slate-900');
});

fetchMovies(currentEndpoint);