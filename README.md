#  Secure File Downloader - Chrome Extension

A robust and security-focused Chrome extension designed to scan web pages, identify specific file types, and manage batch downloads safely.

##  Key Features

* **Deep Scanning:** Scans the active tab, including all nested frames (iframes), to find downloadable assets.
* **Smart Filtering:** Supports multiple file categories:
    * Documents (PDF, DOCX, DOC).
    * Media (MP3, MP4, WebM, Images).
    * Archives (ZIP, RAR, 7Z, etc.).
* **Security First:**
    * **Extension Blocking:** Automatically blocks dangerous extensions like `.exe`, `.bat`, `.cmd`, `.js`, and more.
    * **Network Safety:** Validates protocols and prevents downloads from `localhost` or internal IP addresses.
    * **Filename Sanitization:** Automatically cleans filenames of illegal characters and limits length to ensure filesystem compatibility.
* **Batch Management:**
    * Select/Deselect all files with one click.
    * Controlled download delay (500ms) to prevent browser freezing or server blocking.
    * Limit of 50 concurrent downloads for optimal performance.
* **Clean UI:** Minimalist interface with real-time status updates and file statistics.

##  Installation (Developer Mode)

1.  Download or clone this repository to your local machine.
2.  Open Google Chrome and navigate to `chrome://extensions/`.
3.  Enable **"Developer mode"** in the top right corner.
4.  Click **"Load unpacked"**.
5.  Select the folder containing the extension files (`manifest.json`, etc.).

##  Project Structure

* `manifest.json`: Defines extension permissions (activeTab, downloads, scripting) and metadata.
* `secure_popup.html`: The user interface, localized for RTL support.
* `secure_popup.js`: The core logic for scanning, security validation, and download handling.

##  Disclaimer

Always ensure you have permission to download content from websites. Use this tool responsibly and only download files from trusted sources.
