# Privacy Policy for Mosaic

**Last Updated:** March 15, 2026

Mosaic ("we", "our", or "the extension") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your data when you use the Mosaic browser extension.

## 1. Data Collection and Usage

Mosaic is designed to be entirely local to your machine. We **do not** collect, transmit, distribute, or sell any personal data, browsing history, or analytics to any external servers or third parties.

The extension requests specific permissions solely to provide its core functionality:

*   **`tabs` & `activeTab`:** Used strictly to read the URLs, titles, and IDs of your currently open browser tabs so they can be displayed, searched, and managed within the unified overview grid.
*   **`favicon`:** Used locally to retrieve and display the website icons associated with your open tabs, helping with fast visual identification.
*   **`tabCapture`:** Used to generate visual preview thumbnails of your active tabs. These thumbnails are generated locally on your machine.
*   **`<all_urls>`:** This "broad host" permission is necessary for the Chrome extension API to capture thumbnails and read the titles/URLs of any webpage you visit. This data is never sent off your device.

## 2. Data Storage

Mosaic uses `chrome.storage.local` to temporarily save the visual thumbnails of your open tabs. This caching mechanism is designed so the visual overview can render instantly without needing to generate new screenshots every time it opens.

*   **Local Only:** This cached data physically never leaves your browser profile on your personal computer.
*   **Transient:** When a tab is closed, its associated cached thumbnail data is automatically orphaned and subsequently overwritten or cleared as you browse.

## 3. Third-Party Access

Mosaic does not use any third-party analytics services (like Google Analytics), nor does it include advertising SDKs or tracking pixels. We have no backend servers, and we therefore have no technical ability to share your browsing data.

## 4. Changes to This Policy

We may update this Privacy Policy from time to time if the extension requires new permissions to support new features. Because we do not collect user emails or contact information, it is your responsibility to review this page periodically for any changes.

## 5. Contact

If you have any questions, concerns, or inquiries regarding this Privacy Policy or how Mosaic handles your data, please open an issue on the [Mosaic GitHub Repository](https://github.com/samirpatil2000/mosaic/issues).
