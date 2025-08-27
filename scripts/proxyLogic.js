document.addEventListener('DOMContentLoaded', () => {
  // === Config ===
  const PROXIES_URL = './assets/tested_proxies.json';
  const PAGE_SIZE = 20;           // rows per page
  const REFRESH_MS = 30_000;      // auto-refresh interval

  // === DOM ===
  const proxyList = document.getElementById('proxy-list');
  const countryFilter = document.getElementById('countryFilter');
  const protocolFilter = document.getElementById('protocolFilter');
  const speedFilter = document.getElementById('speedFilter');
  const searchIP = document.getElementById('searchIP');
  const tableHeaders = document.querySelectorAll('.proxy-table th[data-sort]');
  const lastUpdatedElement = document.getElementById('last-updated');
  const spinner = document.getElementById('loadingSpinner');
  const paginationEl = document.getElementById('pagination');
  const darkToggle = document.getElementById('darkModeToggle');

  // === State ===
  let allProxies = [];
  let filteredProxies = [];
  let currentPage = 1;
  let sortKey = 'latency_ms';
  let sortDirection = 'asc';
  let refreshTimer = null;

  // === Helpers ===
  const showSpinner = (show) => {
    spinner.style.display = show ? 'block' : 'none';
  };

  const setLastUpdated = () => {
    const now = new Date();
    lastUpdatedElement.textContent = `Last updated: ${now.toLocaleDateString()} at ${now.toLocaleTimeString()}`;
  };

  const numericCompare = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

  const applySort = (arr) => {
    return arr.sort((a, b) => {
      let va = a[sortKey];
      let vb = b[sortKey];

      const bothNumbers = typeof va === 'number' && typeof vb === 'number';
      if (bothNumbers) {
        const cmp = numericCompare(va, vb);
        return sortDirection === 'asc' ? cmp : -cmp;
      }

      // string compare fallback
      va = (va ?? '').toString().toLowerCase();
      vb = (vb ?? '').toString().toLowerCase();
      if (va < vb) return sortDirection === 'asc' ? -1 : 1;
      if (va > vb) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const renderProxies = () => {
    proxyList.innerHTML = '';

    if (filteredProxies.length === 0) {
      proxyList.innerHTML = `<tr><td colspan="6" class="no-results-message">No proxies found matching your criteria.</td></tr>`;
      paginationEl.innerHTML = '';
      return;
    }

    // Pagination window
    const totalPages = Math.max(1, Math.ceil(filteredProxies.length / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;
    const start = (currentPage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const pageItems = filteredProxies.slice(start, end);

    pageItems.forEach(proxy => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${proxy.ip}</td>
        <td>${proxy.protocol}</td>
        <td>${proxy.country}</td>
        <td>${Number(proxy.latency_ms) || 0} ms</td>
        <td class="status-cell">
          <span class="status-dot status-${(proxy.status || '').toLowerCase()}"></span>
          ${proxy.status}
        </td>
        <td>
          <button class="copy-btn" data-ip="${proxy.ip}" data-protocol="${proxy.protocol}">Copy</button>
        </td>
      `;
      proxyList.appendChild(row);
    });

    renderPagination(totalPages);
  };

  const renderPagination = (totalPages) => {
    paginationEl.innerHTML = '';

    const prevBtn = document.createElement('button');
    prevBtn.textContent = 'Prev';
    prevBtn.disabled = currentPage <= 1;
    prevBtn.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        renderProxies();
      }
    });

    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Next';
    nextBtn.disabled = currentPage >= totalPages;
    nextBtn.addEventListener('click', () => {
      if (currentPage < totalPages) {
        currentPage++;
        renderProxies();
      }
    });

    const pageInfo = document.createElement('span');
    pageInfo.className = 'page-indicator';
    pageInfo.textContent = `Page ${currentPage} / ${totalPages}`;

    paginationEl.appendChild(prevBtn);
    paginationEl.appendChild(pageInfo);
    paginationEl.appendChild(nextBtn);
  };

  const populateCountries = () => {
    // Collect unique countries
    const countries = [...new Set(allProxies.map(p => p.country).filter(Boolean))].sort();
    // Clear existing (keep "All Countries")
    countryFilter.querySelectorAll('option:not([value=""])').forEach(o => o.remove());
    countries.forEach(country => {
      const option = document.createElement('option');
      option.value = country;
      option.textContent = country;
      countryFilter.appendChild(option);
    });
  };

  const filterProxies = () => {
    const q = (searchIP.value || '').trim().toLowerCase();
    const country = countryFilter.value;
    const protocol = protocolFilter.value;
    const speed = speedFilter.value;

    filteredProxies = allProxies.filter(proxy => {
      // only show Active
      if ((proxy.status || '').toLowerCase() !== 'active') return false;

      const ipMatch = !q || (proxy.ip || '').toLowerCase().includes(q);
      const countryMatch = !country || proxy.country === country;
      const protocolMatch = !protocol || proxy.protocol === protocol;
      const speedMatch = !speed || proxy.speed_category === speed;
      return ipMatch && countryMatch && protocolMatch && speedMatch;
    });

    // Sort + render
    applySort(filteredProxies);
    currentPage = 1;
    renderProxies();
  };

  const clearSortClasses = () => {
    tableHeaders.forEach(h => h.classList.remove('sort-asc', 'sort-desc'));
  };

  const setHeaderSortClass = () => {
    const th = document.querySelector(`.proxy-table th[data-sort="${sortKey}"]`);
    if (!th) return;
    th.classList.add(sortDirection === 'asc' ? 'sort-asc' : 'sort-desc');
  };

  // Simple debounce for search input
  const debounce = (fn, ms) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(null, args), ms);
    };
  };

  // === Fetch + refresh ===
  const fetchProxies = async () => {
    showSpinner(true);
    try {
      // Cache-buster query param to defeat aggressive static caching
      const url = `${PROXIES_URL}?t=${Date.now()}`;
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      // Accept both array of strings or array of objects; normalize if needed
      if (Array.isArray(data)) {
        if (data.length && typeof data[0] === 'string') {
          // If someone switches to plain "ip:port" list later, coerce minimally
          allProxies = data.map(ip => ({
            ip, protocol: 'HTTP', country: 'Unknown',
            latency_ms: 0, speed_category: '', status: 'Active'
          }));
        } else {
          allProxies = data;
        }
      } else {
        allProxies = [];
      }

      populateCountries();
      setLastUpdated();
      filterProxies();
    } catch (err) {
      console.error('Error fetching proxies:', err);
      proxyList.innerHTML = `<tr><td colspan="6" class="error-message">Failed to load proxies. Please try again later.</td></tr>`;
      paginationEl.innerHTML = '';
    } finally {
      showSpinner(false);
    }
  };

  const startAutoRefresh = () => {
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = setInterval(fetchProxies, REFRESH_MS);
  };

  // === Events ===
  countryFilter.addEventListener('change', filterProxies);
  protocolFilter.addEventListener('change', filterProxies);
  speedFilter.addEventListener('change', filterProxies);
  searchIP.addEventListener('input', debounce(filterProxies, 200));

  tableHeaders.forEach(header => {
    header.addEventListener('click', () => {
      const key = header.getAttribute('data-sort');
      if (key === sortKey) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        sortKey = key;
        sortDirection = 'asc';
      }
      clearSortClasses();
      setHeaderSortClass();
      applySort(filteredProxies);
      renderProxies();
    });
  });

  // Copy buttons (event delegation)
  proxyList.addEventListener('click', (e) => {
    const btn = e.target.closest('.copy-btn');
    if (!btn) return;
    const ip = btn.getAttribute('data-ip');
    const protocol = (btn.getAttribute('data-protocol') || 'http').toLowerCase();
    const proxyString = `${protocol}://${ip}`;
    navigator.clipboard.writeText(proxyString)
      .then(() => {
        const original = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => (btn.textContent = original), 1500);
      })
      .catch(err => console.error('Clipboard failed:', err));
  });

  // === Dark mode ===
  const applyInitialTheme = () => {
    const saved = localStorage.getItem('pgui_theme');
    if (saved === 'dark') {
      document.body.classList.add('dark-mode');
      darkToggle.textContent = '☀️ Light Mode';
    }
  };

  darkToggle.addEventListener('click', () => {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('pgui_theme', isDark ? 'dark' : 'light');
    darkToggle.textContent = isDark ? '☀️ Light Mode' : '🌙 Dark Mode';
  });

  // === Init ===
  applyInitialTheme();
  clearSortClasses();
  setHeaderSortClass();
  fetchProxies();
  startAutoRefresh();
});
