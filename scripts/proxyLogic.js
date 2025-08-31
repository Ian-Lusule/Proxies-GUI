document.addEventListener('DOMContentLoaded', () => {
  const PROXIES_URL = './assets/tested_proxies.json';
  const PAGE_SIZE = 20;
  const REFRESH_MS = 150_000;

  const proxyList = document.getElementById('proxy-list');
  const protocolFilter = document.getElementById('protocolFilter');
  const latencyFilter = document.getElementById('latencyFilter');
  const anonymityFilter = document.getElementById('anonymityFilter');
  const searchIP = document.getElementById('searchIP');
  const showDead = document.getElementById('showDead');
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
    lastUpdatedElement.textContent = `Last updated: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
  };

  const numericCompare = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

  const applySort = (arr) => arr.sort((a, b) => {
    let va = a[sortKey], vb = b[sortKey];
    if (typeof va === 'number' && typeof vb === 'number') {
      const cmp = numericCompare(va, vb);
      return sortDirection === 'asc' ? cmp : -cmp;
    }
    va = (va ?? '').toString().toLowerCase();
    vb = (vb ?? '').toString().toLowerCase();
    return va < vb ? (sortDirection === 'asc' ? -1 : 1) :
           va > vb ? (sortDirection === 'asc' ? 1 : -1) : 0;
  });

  const renderProxies = () => {
    proxyList.innerHTML = '';
    if (!filteredProxies.length) {
      proxyList.innerHTML = `<tr><td colspan="8" class="no-results">No proxies found.</td></tr>`;
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
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${globalIndex}</td>
        <td>${proxy.ip}</td>
        <td>${proxy.port}</td>
        <td>${proxy.protocol.toUpperCase()}</td>
        <td>${proxy.latency_ms ?? '-'}</td>
        <td>${proxy.anonymity ?? '-'}</td>
        <td class="status-cell">
          <span class="status-dot status-${(proxy.status || '').toLowerCase()}"></span>
          ${proxy.status}
        </td>
        <td><button class="copy-btn" data-ip="${proxy.ip}" data-port="${proxy.port}" data-protocol="${proxy.protocol}">Copy</button></td>
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
    prevBtn.onclick = () => { currentPage--; renderProxies(); };

    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Next';
    nextBtn.disabled = currentPage >= totalPages;
    nextBtn.onclick = () => { currentPage++; renderProxies(); };

    const pageInfo = document.createElement('span');
    pageInfo.textContent = `Page ${currentPage} / ${totalPages}`;

    paginationEl.append(prevBtn, pageInfo, nextBtn);
  };

  const filterProxies = (resetPage = true) => {
    const q = (searchIP.value || "").trim().toLowerCase();
    const protocol = protocolFilter.value;
    const latency = latencyFilter.value;
    const anonymity = anonymityFilter.value;
    const includeDead = showDead.checked;

    filteredProxies = allProxies.filter(proxy => {
      if (!includeDead && proxy.status !== "alive") return false;
      const ipMatch = !q || proxy.ip.toLowerCase().includes(q);
      const protoMatch = !protocol || proxy.protocol === protocol;
      const anonMatch = !anonymity || proxy.anonymity === anonymity;

      let latencyMatch = true;
      if (latency && proxy.latency_ms != null) {
        const val = proxy.latency_ms;
        if (latency === "0-100") latencyMatch = val <= 100;
        else if (latency === "100-300") latencyMatch = val > 100 && val <= 300;
        else if (latency === "300-600") latencyMatch = val > 300 && val <= 600;
        else if (latency === "600+") latencyMatch = val > 600;
      }

      return ipMatch && protoMatch && anonMatch && latencyMatch;
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
      setLastUpdated();
      filterProxies(false);
    } catch (err) {
      console.error('Fetch error:', err);
      proxyList.innerHTML = `<tr><td colspan="8" class="error">Failed to load proxies.</td></tr>`;
    } finally { showSpinner(false); }
  };

  const startAutoRefresh = () => {
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = setInterval(fetchProxies, REFRESH_MS);
  };

  // Download
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
    const lines = filteredProxies.map(p => `${p.protocol.toLowerCase()}://${p.ip}:${p.port}`);
    downloadFile(`proxies_${getTimestamp()}.txt`, lines.join("\n"));
  };

  const exportCsv = () => {
    const header = "No,IP,Port,Protocol,Latency(ms),Anonymity,Status\n";
    const rows = filteredProxies.map((p, i) => [
      i + 1, p.ip, p.port, p.protocol, p.latency_ms ?? '', p.anonymity ?? '', p.status
    ].join(","));
    downloadFile(`proxies_${getTimestamp()}.csv`, header + rows.join("\n"));
  };

  // Events
  protocolFilter.onchange = () => filterProxies();
  latencyFilter.onchange = () => filterProxies();
  anonymityFilter.onchange = () => filterProxies();
  showDead.onchange = () => filterProxies();
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
    const text = `${btn.dataset.protocol.toLowerCase()}://${btn.dataset.ip}:${btn.dataset.port}`;
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
