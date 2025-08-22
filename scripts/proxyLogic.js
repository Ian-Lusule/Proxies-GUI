
document.addEventListener('DOMContentLoaded', () => {
    const PROXIES_URL = './assets/tested_proxies.json';
    const proxyList = document.getElementById('proxy-list');
    const countryFilter = document.getElementById('countryFilter');
    const protocolFilter = document.getElementById('protocolFilter');
    const speedFilter = document.getElementById('speedFilter');
    const tableHeaders = document.querySelectorAll('.proxy-table th[data-sort]');
    const lastUpdatedElement = document.getElementById('last-updated');

    let allProxies = [];
    let filteredProxies = [];

    // Fetches the JSON file and initializes the UI
    const fetchProxies = async () => {
        try {
            const response = await fetch(PROXIES_URL);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const data = await response.json();
            allProxies = data;
            
            // Populate country filter and set up initial state
            populateFilters();
            filterAndRenderProxies();

            // Set last updated time
            const now = new Date();
            lastUpdatedElement.textContent = `Last updated: ${now.toLocaleDateString()} at ${now.toLocaleTimeString()}`;

        } catch (error) {
            proxyList.innerHTML = `<tr><td colspan="6" class="error-message">Failed to load proxies. Please try again later.</td></tr>`;
            console.error('Error fetching the proxy list:', error);
        }
    };

    // Populates the country filter dropdown with unique countries
    const populateFilters = () => {
        const countries = [...new Set(allProxies.map(p => p.country))].sort();
        countries.forEach(country => {
            const option = document.createElement('option');
            option.value = country;
            option.textContent = country;
            countryFilter.appendChild(option);
        });
    };

    // Renders the proxies into the HTML table
    const renderProxies = (proxiesToRender) => {
        proxyList.innerHTML = '';
        if (proxiesToRender.length === 0) {
            proxyList.innerHTML = `<tr><td colspan="6" class="no-results-message">No proxies found matching your criteria.</td></tr>`;
            return;
        }

        proxiesToRender.forEach(proxy => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${proxy.ip}</td>
                <td>${proxy.protocol}</td>
                <td>${proxy.country}</td>
                <td>${proxy.latency_ms} ms</td>
                <td class="status-cell">
                    <span class="status-dot status-${proxy.status.toLowerCase()}"></span>
                    ${proxy.status}
                </td>
                <td>
                    <button class="copy-btn" data-ip="${proxy.ip}" data-protocol="${proxy.protocol}">Copy</button>
                </td>
            `;
            proxyList.appendChild(row);
        });
    };

    // Handles filtering and re-rendering of the proxy list
    const filterAndRenderProxies = () => {
        const country = countryFilter.value;
        const protocol = protocolFilter.value;
        const speed = speedFilter.value;

        filteredProxies = allProxies.filter(proxy => {
            const countryMatch = !country || proxy.country === country;
            const protocolMatch = !protocol || proxy.protocol === protocol;
            const speedMatch = !speed || proxy.speed_category === speed;
            return proxy.status === "Active" && countryMatch && protocolMatch && speedMatch;
        });
        
        // Sort after filtering
        sortProxies();
    };

    // Handles sorting of the proxy list
    const sortProxies = (sortKey = 'latency_ms', sortDirection = 'asc') => {
        filteredProxies.sort((a, b) => {
            let valA = a[sortKey];
            let valB = b[sortKey];

            if (typeof valA === 'string') {
                valA = valA.toLowerCase();
                valB = valB.toLowerCase();
            }

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        renderProxies(filteredProxies);
    };

    // Event listeners
    countryFilter.addEventListener('change', filterAndRenderProxies);
    protocolFilter.addEventListener('change', filterAndRenderProxies);
    speedFilter.addEventListener('change', filterAndRenderProxies);

    tableHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const sortKey = header.getAttribute('data-sort');
            const sortDirection = header.classList.contains('sort-asc') ? 'desc' : 'asc';
            
            // Reset all header classes
            tableHeaders.forEach(h => h.classList.remove('sort-asc', 'sort-desc'));
            
            // Add class to current header
            header.classList.add(`sort-${sortDirection}`);
            sortProxies(sortKey, sortDirection);
        });
    });

    // Handle "Copy" button clicks
    proxyList.addEventListener('click', (e) => {
        if (e.target.classList.contains('copy-btn')) {
            const ip = e.target.getAttribute('data-ip');
            const protocol = e.target.getAttribute('data-protocol');
            const proxyString = `${protocol.toLowerCase()}://${ip}`;
            navigator.clipboard.writeText(proxyString)
                .then(() => {
                    e.target.textContent = 'Copied!';
                    setTimeout(() => {
                        e.target.textContent = 'Copy';
                    }, 2000);
                })
                .catch(err => {
                    console.error('Failed to copy text:', err);
                });
        }
    });

    // Initial fetch of proxies
    fetchProxies();
});
