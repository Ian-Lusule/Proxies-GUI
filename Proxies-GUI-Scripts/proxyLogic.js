let validatedProxies = [];
let currentPage = 1;
const pageSize = 15;

async function fetchProxies() {
    try {
        const res = await fetch('/Proxies-GUI-Scripts/output/proxies.json');
        if (!res.ok) throw new Error('Failed to fetch proxies.json');
        const proxies = await res.json();
        return proxies;
    } catch (e) {
        console.error(`Failed to fetch proxies: ${e}`);
        return [];
    }
}

async function validateProxy(proxy) {
    await new Promise(resolve => setTimeout(resolve, Math.random() * 2000)); // Simulate validation delay
    const latency = Math.floor(Math.random() * 1000);
    const isActive = Math.random() > 0.2;
    const status = isActive ? 'Active' : 'Inactive';
    const speed = latency <= 100 ? 'Excellent (0-100ms)' :
                  latency <= 200 ? 'Good (100-200ms)' :
                  latency <= 500 ? 'Medium (200-500ms)' :
                  'Poor (500ms+)';
    return { ...proxy, latency, status, speed };
}

async function fetchAndValidateProxies() {
    const tableBody = document.getElementById('proxyTableBody');
    tableBody.innerHTML = '<tr><td colspan="5">Loading proxies...</td></tr>';

    validatedProxies = [];
    const countryFilter = document.getElementById('countryFilter');
    countryFilter.innerHTML = '<option>All Countries</option>';

    const proxies = await fetchProxies();

    const uniqueCountries = new Set(proxies.map(p => p.country));
    uniqueCountries.forEach(country => {
        if (country) {
            const option = document.createElement('option');
            option.value = country;
            option.textContent = country;
            countryFilter.appendChild(option);
        }
    });

    const validationPromises = proxies.map(async (proxy) => {
        const validated = await validateProxy(proxy);
        validatedProxies.push(validated);
        renderTable();
        updateStats(validatedProxies);
        return validated;
    });

    await Promise.all(validationPromises);
    renderTable();
    updateStats(validatedProxies);
}

function getFilteredProxies() {
    const protocol = document.getElementById('protocolFilter').value;
    const country = document.getElementById('countryFilter').value;
    const speed = document.getElementById('speedFilter').value;
    const status = document.getElementById('statusFilter').value;

    return validatedProxies.filter(p => {
        const matchesProtocol = protocol === 'All Protocols' || p.protocol === protocol;
        const matchesCountry = country === 'All Countries' || p.country === country;
        const matchesSpeed = speed === 'All Speeds' || p.speed === speed;
        const matchesStatus = status === 'All Status' ||
                              (status === 'Active Only' && p.status === 'Active') ||
                              (status === 'Inactive Only' && p.status === 'Inactive');
        return matchesProtocol && matchesCountry && matchesSpeed && matchesStatus;
    });
}

function renderTable() {
    const tableBody = document.getElementById('proxyTableBody');
    tableBody.innerHTML = '';

    const filtered = getFilteredProxies();
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    const pageProxies = filtered.slice(start, end);

    pageProxies.forEach(validated => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${validated.ip}</td>
            <td>${validated.country}</td>
            <td>${validated.latency} ms</td>
            <td>${validated.protocol}</td>
            <td class="actions">
                <button onclick="testProxy('${validated.ip}')">Test</button>
                <button onclick="removeProxy('${validated.ip}')">Remove</button>
            </td>
        `;
        row.dataset.status = validated.status;
        row.dataset.speed = validated.speed;
        row.dataset.protocol = validated.protocol;
        row.dataset.country = validated.country;
        tableBody.appendChild(row);
    });

    if (pageProxies.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5">No proxies found</td></tr>';
    }

    renderPagination(filtered.length);
}

function renderPagination(total) {
    const pageCount = Math.ceil(total / pageSize);
    const pagination = document.getElementById('pagination');
    pagination.innerHTML = '';
    for (let i = 1; i <= pageCount; i++) {
        const btn = document.createElement('button');
        btn.innerText = i;
        btn.onclick = () => {
            currentPage = i;
            renderTable();
        };
        if (i === currentPage) btn.disabled = true;
        pagination.appendChild(btn);
    }
}

function updateStats(proxies) {
    const totalProxiesEl = document.getElementById('totalProxies');
    const activeProxiesEl = document.getElementById('activeProxies');
    const avgLatencyEl = document.getElementById('avgLatency');
    const successRateEl = document.getElementById('successRate');

    const total = proxies.length;
    const active = proxies.filter(p => p.status === 'Active').length;
    const avgLatency = total ? (proxies.reduce((sum, p) => sum + p.latency, 0) / total).toFixed(2) : 0;
    const successRate = total ? ((active / total) * 100).toFixed(2) : 0;

    totalProxiesEl.textContent = total;
    activeProxiesEl.textContent = active;
    avgLatencyEl.textContent = `${avgLatency} ms`;
    successRateEl.textContent = `${successRate}%`;
}

function testProxy(ip) {
    alert(`Testing proxy: ${ip}`);
}

function removeProxy(ip) {
    validatedProxies = validatedProxies.filter(p => p.ip !== ip);
    renderTable();
    updateStats(validatedProxies);
}

function exportProxies() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(validatedProxies, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', 'proxies.json');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

document.addEventListener('DOMContentLoaded', () => {
    fetchAndValidateProxies();
    setInterval(fetchAndValidateProxies, 30 * 60 * 1000); // Refresh every 30 minutes
    document.getElementById('refreshBtn').addEventListener('click', fetchAndValidateProxies);
    document.getElementById('exportBtn').addEventListener('click', exportProxies);
    document.getElementById('protocolFilter').addEventListener('change', renderTable);
    document.getElementById('countryFilter').addEventListener('change', renderTable);
    document.getElementById('speedFilter').addEventListener('change', renderTable);
    document.getElementById('statusFilter').addEventListener('change', renderTable);
    document.getElementById('darkModeToggle').addEventListener('change', () => {
        document.body.classList.toggle('dark-mode');
    });
});
