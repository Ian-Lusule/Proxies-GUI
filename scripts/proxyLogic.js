document.addEventListener('DOMContentLoaded', () => {
  const PROXIES_URL = './assets/tested_proxies.json';
  const PAGE_SIZE = 20;
  const REFRESH_MS = 30_000;

  const proxyList = document.getElementById('proxy-list');
  const countryFilter = document.getElementById('countryFilter');
  const protocolFilter = document.getElementById('protocolFilter');
  const speedFilter = document.getElementById('speedFilter');
  const searchIP = document.getElementById('searchIP');
  const showInactive = document.getElementById('showInactive');
  const downloadTxtBtn = document.getElementById('downloadTxt');
  const downloadCsvBtn = document.getElementById('downloadCsv');

  const tableHeaders = document.querySelectorAll('.proxy-table th[data-sort]');
  const lastUpdatedElement = document.getElementById('last-updated');
  const spinner = document.getElementById('loadingSpinner');
  const paginationEl = document.getElementById('pagination');
  const darkToggle = document.getElementById('darkModeToggle');

  let allProxies = [];
  let filteredProxies = [];
  let currentPage = 1;
  let sortKey = 'latency_ms';
  let sortDirection = 'asc';
  let refreshTimer = null;

  const showSpinner = (show) => spinner.style.display = show ? 'block' : 'none';

  const setLastUpdated = () => {
    const now = new Date();
    lastUpdatedElement.textContent = `Last updated: ${now.toLocaleDateString()} at ${now.toLocaleTimeString()}`;
  };

  const numericCompare = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

  const applySort = (arr) => arr.sort((a, b) => {
    let va = a[sortKey], vb = b[sortKey];
    const bothNum = typeof va === 'number' && typeof vb === 'number';
    if (bothNum) {
      const cmp = numericCompare(va, vb);
      return sortDirection === 'asc' ? cmp : -cmp;
    }
    va = (va ?? '').toString().toLowerCase();
    vb = (vb ?? '').toString().toLowerCase();
    return va < vb ? (sortDirection === 'asc' ? -1 : 1) :
           va > vb ? (sortDirection === 'asc' ? 1 : -1) : 0;
  });

  const getSpeedCategory = (latency) => {
    if (latency <= 100) return "Excellent (0-100ms)";
    if (latency <= 200) return "Good (100-200ms)";
    if (latency <= 500) return "Medium (200-500ms)";
    if (latency <= 1000) return "Poor (500-1000ms)";
    return "Unusable (1000ms+)";
  };

  const renderProxies = () => {
    proxyList.innerHTML = '';
    if (!filteredProxies.length) {
      proxyList.innerHTML = `<tr><td colspan="7" class="no-results-message">No proxies found.</td></tr>`;
      paginationEl.innerHTML = '';
      return;
    }

    const totalPages = Math.max(1, Math.ceil(filteredProxies.length / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;
    const start = (currentPage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const pageItems = filteredProxies.slice(start, end);

    pageItems.forEach((proxy, i) => {
      const globalIndex = start + i + 1;
      const latency = Number(proxy.latency_ms) || 0;
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${globalIndex}</td>
        <td>${proxy.ip}</td>
        <td>${proxy.protocol}</td>
        <td>${proxy.country}</td>
        <td>${latency.toFixed(2)} ms</td>
        <td class="status-cell">
          <span class="status-dot status-${(proxy.status || '').toLowerCase()}"></span>
          ${proxy.status}
        </td>
        <td><button class="copy-btn" data-ip="${proxy.ip}" data-protocol="${proxy.protocol}">Copy</button></td>
      `;
      proxyList.appendChild(row);
    });

    renderPagination(totalPages);
  };

  const renderPagination = (totalPages) => {
    paginationEl.innerHTML = '';
    if (totalPages <= 1) return;
    
    const prevBtn = document.createElement('button');
    prevBtn.textContent = 'Prev';
    prevBtn.disabled = currentPage <= 1;
    prevBtn.onclick = () => { if (currentPage > 1) { currentPage--; renderProxies(); }};

    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Next';
    nextBtn.disabled = currentPage >= totalPages;
    nextBtn.onclick = () => { if (currentPage < totalPages) { currentPage++; renderProxies(); }};

    const pageInfo = document.createElement('span');
    pageInfo.className = 'page-indicator';
    pageInfo.textContent = `Page ${currentPage} / ${totalPages}`;

    paginationEl.append(prevBtn, pageInfo, nextBtn);
  };

  const populateCountries = () => {
    const selected = countryFilter.value; 
    const countries = [...new Set(allProxies.map(p => p.country).filter(Boolean))].sort();
    countryFilter.querySelectorAll('option:not([value=""])').forEach(o => o.remove());
    countries.forEach(country => {
      const opt = document.createElement('option');
      opt.value = country;
      opt.textContent = country;
      if (country === selected) opt.selected = true;
      countryFilter.appendChild(opt);
    });
  };

  const filterProxies = (resetPage = true) => {
    const q = (searchIP.value || "").trim().toLowerCase();
    const country = countryFilter.value;
    const protocol = protocolFilter.value;
    const speed = speedFilter.value;
    const includeInactive = showInactive.checked;

    filteredProxies = allProxies.filter(proxy => {
      if (!includeInactive && (proxy.status || "").toLowerCase() !== "active") return false;

      const ipMatch = !q || (proxy.ip || "").toLowerCase().includes(q);
      const countryMatch = !country || proxy.country === country;
      const protocolMatch = !protocol || proxy.protocol === protocol;
      
      // Handle speed filtering
      const latency = Number(proxy.latency_ms) || 0;
      let proxySpeedCategory = proxy.speed_category;
      
      // If the proxy doesn't have a speed_category, calculate it
      if (!proxySpeedCategory) {
        proxySpeedCategory = getSpeedCategory(latency);
      }
      
      // For speed filtering, we need to check both the stored category and the calculated one
      const speedMatch = !speed || proxySpeedCategory === speed;

      return ipMatch && countryMatch && protocolMatch && speedMatch;
    });

    applySort(filteredProxies);
    if (resetPage) currentPage = 1;
    renderProxies();
  };

  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

  const fetchProxies = async () => {
    showSpinner(true);
    try {
      const url = `${PROXIES_URL}?t=${Date.now()}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      allProxies = Array.isArray(data) ? data : [];
      
      // Add speed_category if not present
      allProxies.forEach(proxy => {
        if (!proxy.speed_category) {
          const latency = Number(proxy.latency_ms) || 0;
          proxy.speed_category = getSpeedCategory(latency);
        }
      });
      
      populateCountries();
      setLastUpdated();
      filterProxies(false); 
    } catch (err) {
      console.error('Fetch error:', err);
      proxyList.innerHTML = `<tr><td colspan="7" class="error-message">Failed to load proxies. Check if the JSON file exists at ${PROXIES_URL}</td></tr>`;
      paginationEl.innerHTML = '';
    } finally { showSpinner(false); }
  };

  const startAutoRefresh = () => {
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = setInterval(fetchProxies, REFRESH_MS);
  };

  // Download Helpers
  const getTimestamp = () => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}`;
  };

  const downloadFile = (filename, content) => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportTxt = () => {
    const lines = filteredProxies.map(p => `${(p.protocol || "http").toLowerCase()}://${p.ip}`);
    downloadFile(`proxies_${getTimestamp()}.txt`, lines.join("\n"));
  };

  const exportCsv = () => {
    const header = "No,IP,Protocol,Country,Latency(ms),Status,Speed Category\n";
    const rows = filteredProxies.map((p, i) => [
      i + 1,
      p.ip,
      p.protocol,
      p.country,
      Number(p.latency_ms) || 0,
      p.status,
      p.speed_category || getSpeedCategory(Number(p.latency_ms) || 0)
    ].join(","));
    downloadFile(`proxies_${getTimestamp()}.csv`, header + rows.join("\n"));
  };

  // Events
  countryFilter.onchange = () => filterProxies();
  protocolFilter.onchange = () => filterProxies();
  speedFilter.onchange = () => filterProxies();
  showInactive.onchange = () => filterProxies();
  searchIP.oninput = debounce(() => filterProxies(), 200);

  downloadTxtBtn.onclick = exportTxt;
  downloadCsvBtn.onclick = exportCsv;

  tableHeaders.forEach(header => {
    header.onclick = () => {
      const key = header.dataset.sort;
      if (key === sortKey) sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      else { sortKey = key; sortDirection = 'asc'; }
      tableHeaders.forEach(h => h.classList.remove('sort-asc','sort-desc'));
      header.classList.add(sortDirection === 'asc' ? 'sort-asc' : 'sort-desc');
      applySort(filteredProxies);
      renderProxies();
    };
  });

  proxyList.addEventListener('click', e => {
    const btn = e.target.closest('.copy-btn');
    if (!btn) return;
    const ip = btn.dataset.ip;
    const protocol = (btn.dataset.protocol || 'http').toLowerCase();
    const text = `${protocol}://${ip}`;
    navigator.clipboard.writeText(text).then(() => {
      const orig = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => btn.textContent = orig, 1500);
    });
  });

  // Dark mode
  const applyInitialTheme = () => {
    if (localStorage.getItem('pgui_theme') === 'dark') {
      document.body.classList.add('dark-mode');
      darkToggle.textContent = '☀️ Light Mode';
    }
  };
  darkToggle.onclick = () => {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('pgui_theme', isDark ? 'dark' : 'light');
    darkToggle.textContent = isDark ? '☀️ Light Mode' : '🌙 Dark Mode';
  };

  // Init
  applyInitialTheme();
  fetchProxies();
  startAutoRefresh();
});
