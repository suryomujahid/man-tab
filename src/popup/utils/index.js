// --- Utility Functions ---

export function formatUrl(urlString) {
  try {
    if (urlString.startsWith("chrome://") || urlString.startsWith("file://")) {
      return urlString;
    }
    const url = new URL(urlString);
    return (
      url.hostname.replace(/^www\./, "") +
      (url.pathname === "/" ? "" : url.pathname)
    );
  } catch (error) {
    return urlString;
  }
}

export function getDomain(urlString) {
  try {
    if (urlString.startsWith("chrome://")) return "Chrome Internal";
    if (urlString.startsWith("file://")) return "Local Files";
    return new URL(urlString).hostname.replace(/^www\./, "");
  } catch (error) {
    return "Other";
  }
}

export function formatTimeAgo(lastAccessed) {
  const now = new Date().getTime();
  const seconds = Math.floor((now - lastAccessed) / 1000);
  if (seconds < 60) return "NOW";
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + "Y AGO";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + "M AGO";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + "D AGO";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + "H AGO";
  return Math.floor(seconds / 60) + "MIN AGO";
}

export function getCurrentTimestamp() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}
