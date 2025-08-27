
# 🌐 Proxies GUI

An **interactive proxy list interface** built with **HTML, CSS, and JavaScript**. It dynamically loads a JSON file of tested proxies and provides:

✅ Filters by Country, Protocol, and Speed  
✅ Search by IP  
✅ Dark Mode Toggle (persistent via `localStorage`)  
✅ Sorting by column (IP, Protocol, Country, Latency)  
✅ Pagination (20 items per page)  
✅ Copy to Clipboard button for each proxy  
✅ Auto-Refresh (default: every 30 seconds, without losing current page)  
✅ Loading Spinner for better UX  

---

## 📂 Project Structure
```
Proxies-GUI/
│   index.html          # Main HTML page
│   .nojekyll           # Disables Jekyll for GitHub Pages
├── styles/
│   └── styles.css      # Stylesheet
├── scripts/
│   └── proxyLogic.js   # Frontend logic
└── assets/
    └── tested_proxies.json # Proxies list (dynamically generated)
```

---

## ✅ Features
- **Responsive Design**: Works on desktop and mobile.
- **Dark Mode**: Toggle persists between sessions.
- **Live Data**: Proxies auto-refresh every 30s.
- **Filtering & Search**: Find proxies by IP, country, protocol, or speed.
- **Sorting**: Click on headers to sort.
- **Pagination**: Handles large lists efficiently.
- **Copy to Clipboard**: Quickly copy proxies in `protocol://ip:port` format.

---

## 🔧 Installation & Setup

1. Clone the Repository:
```bash
git clone https://github.com/Ian-Lusule/Proxies-GUI.git
cd Proxies-GUI
```

2. Disable Jekyll (for GitHub Pages):
Ensure `.nojekyll` file exists in the root folder.

3. Deploy to GitHub Pages:
- Go to Settings → Pages.
- Under Build and Deployment, set:
  - Source: Deploy from branch
  - Branch: main (or your default branch)
  - Folder: / (root)
- Click Save.

4. Visit Your Site:
```
https://YOUR-USERNAME.github.io/Proxies-GUI/
```

---

## ⚙️ Configuration
You can modify settings in `scripts/proxyLogic.js`:
```javascript
const PAGE_SIZE = 20;       // Proxies per page
const REFRESH_MS = 30_000;  // Auto-refresh interval (30 seconds)
```

---

## 📄 tested_proxies.json Format
The JSON file should contain an **array of proxy objects**:
```json
[
  {
    "ip": "23.237.210.82:80",
    "protocol": "HTTP",
    "country": "United States",
    "latency_ms": 120,
    "speed_category": "Excellent (0-100ms)",
    "status": "Active"
  },
  {
    "ip": "104.222.32.98:80",
    "protocol": "HTTP",
    "country": "United States",
    "latency_ms": 200,
    "speed_category": "Good (100-200ms)",
    "status": "Inactive"
  }
]
```

---

## ✅ Live Demo
👉 View on GitHub Pages: `https://Ian-Lusule.github.io/Proxies-GUI/`

---

## 🛠 Built With
- HTML5
- CSS3
- Vanilla JavaScript

---

## 📌 Future Enhancements
- ✅ Download filtered proxies as .txt or .csv
- ✅ Show inactive proxies toggle
- ✅ Proxy health check in real-time
- ✅ Export settings to file

---

## 🤝 Contributing
Contributions are welcome! Fork this repo, make changes, and submit a pull request.

---

## 📜 License
MIT License © Ian-Lusule
