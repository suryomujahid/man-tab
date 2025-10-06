<a href="https://chromewebstore.google.com/detail/man-tab/kblpjoppmghjjcbdnnffdmciipdcbgfo" title="Available in the Chrome Web Store"><img src="https://github.com/user-attachments/assets/53689556-fdda-4759-a40a-937d3645497c" alt="Available in the Chrome Web Store"></a>
<!-- TODO: Add Firefox Add-on store link -->


# Man Tab

Man Tab is a browser extension designed to help you efficiently manage your browser tabs. It provides a clear, organized interface to find, filter, and interact with your open tabs, reducing clutter and improving your browsing experience.

## Features

- **Search and Filter:** Instantly search through your open tabs by title or URL. Apply filters to view tabs based on their inactivity period (e.g., inactive for more than a day, a week, or a month).
- **Sort Tabs:** Organize your tabs by activity, title, or URL to quickly find what you need.
- **View Modes:** Choose between a simple list view or a grouped view that organizes tabs by domain.
- **Tab Actions:**
  - **Pin Tabs:** Keep important tabs accessible by pinning them.
  - **Go to Tab:** Jump directly to any tab from the extension's interface.
  - **Close Tabs:** Close single or multiple selected tabs at once.
  - **Bookmark Tabs:** Save a selection of tabs to a new bookmark folder.
  - **Save as MHT (Chrome only):** Save selected tabs as `.mht` files for offline viewing. If multiple tabs are selected, they are bundled into a single `.zip` archive.
- **Session Management:**
  - **Save Sessions:** Save a group of selected tabs as a session to restore them later.
  - **Restore Sessions:** Reopen all tabs from a saved session in a new window.
  - **Delete Sessions:** Remove saved sessions you no longer need.
  - **Import Sessions:** Load sessions from a JSON file.
  - **Export Sessions:** Save all your sessions to a JSON file for backup.

## How to Use

1.  **Open the Extension:** Click the Man Tab icon in your browser's toolbar to open the side panel (Chrome) or sidebar (Firefox).
2.  **Manage Your Tabs:**
    -   Use the search bar to find specific tabs.
    -   Apply filters and sorting options to organize the list.
    -   Select the tabs you want to manage using the checkboxes.
3.  **Perform Actions:**
    -   Click **Close Tabs** to close all selected tabs.
    -   Click **Bookmark Tabs** to save the selected tabs to your bookmarks.
    -   Click **Save as MHT** to download the selected tabs for offline use (Chrome only).
    -   To save a session, enter a name in the session input field and click **Save Selected**.

## Development

This project uses [Vite](https://vitejs.dev/) for development and building.

### Prerequisites

-   [Node.js](https://nodejs.org/) (v18 or newer)
-   [npm](https://www.npmjs.com/)

### Running Locally

1.  **Install Dependencies:**
    ```bash
    npm install
    ```

2.  **Start the Development Server:**
    The development server will watch for file changes and automatically rebuild the extension.
    -   For Chrome:
        ```bash
        npm run dev -- --mode chrome
        ```
    -   For Firefox:
        ```bash
        npm run dev -- --mode firefox
        ```

3.  **Load the Extension in Your Browser:**

    -   **Chrome:**
        1.  Open Chrome and navigate to `chrome://extensions`.
        2.  Enable "Developer mode" in the top right corner.
        3.  Click "Load unpacked".
        4.  Select the `dist/chrome` directory from this project.

    -   **Firefox:**
        1.  Open Firefox and navigate to `about:debugging`.
        2.  Click "This Firefox" in the sidebar.
        3.  Click "Load Temporary Add-on...".
        4.  Select the `dist/firefox/manifest.json` file from this project.

## License

The VT323 font used in this project is licensed under the SIL Open Font License.
