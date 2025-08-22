#!/usr/bin/env python3
import requests
import os

# GitHub API URL for the file
GITHUB_API_URL = "https://api.github.com/repos/Ian-Lusule/Proxies-Scripts/contents/Proxies-GUI-Scripts/tested_proxies.json"

# Destination path to save the file
DESTINATION_PATH = "assets/tested_proxies.json"

# GitHub token (recommended to use environment variable for security)
GITHUB_TOKEN = os.getenv("FETCH_PROXIES_TOKEN")

if not GITHUB_TOKEN:
    raise EnvironmentError("Environment variable FETCH_PROXIES_TOKEN is not set")

headers = {
    "Authorization": f"token {GITHUB_TOKEN}",
    "Accept": "application/vnd.github.v3.raw"
}

def fetch_and_save():
    print(f"Fetching file from {GITHUB_API_URL}...")
    response = requests.get(GITHUB_API_URL, headers=headers)

    if response.status_code == 200:
        os.makedirs(os.path.dirname(DESTINATION_PATH), exist_ok=True)
        with open(DESTINATION_PATH, "wb") as f:
            f.write(response.content)
        print(f"File successfully saved to {DESTINATION_PATH}")
    else:
        print(f"Failed to fetch file. HTTP {response.status_code}: {response.text}")

if __name__ == "__main__":
    fetch_and_save()

