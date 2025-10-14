/**
 * Utility functions for the Man Tab extension
 */

import type { ValidationResult } from "../../types/index.js";

/**
 * Formats a URL for display by removing protocol and www prefix
 * @param urlString - The URL string to format
 * @returns Formatted URL string for display
 */
export const formatUrl = (urlString: string): string => {
  if (!urlString) return "";

  try {
    if (urlString.startsWith("chrome://") || urlString.startsWith("file://")) {
      return urlString;
    }

    const url = new URL(urlString);
    const hostname = url.hostname.replace(/^www\./, "");
    const pathname = url.pathname === "/" ? "" : url.pathname;

    return hostname + pathname;
  } catch (error) {
    console.warn(`Failed to format URL: ${urlString}`, error);
    return urlString;
  }
};

/**
 * Extracts and formats the domain from a URL
 * @param urlString - The URL string to extract domain from
 * @returns Formatted domain string
 */
export const getDomain = (urlString: string): string => {
  if (!urlString) return "Unknown";

  try {
    if (
      urlString.startsWith("chrome://") ||
      urlString.startsWith("moz-extension://")
    ) {
      return "Browser Internal";
    }
    if (urlString.startsWith("file://")) {
      return "Local Files";
    }
    if (urlString.startsWith("about:")) {
      return "Browser Pages";
    }

    const url = new URL(urlString);
    return url.hostname.replace(/^www\./, "");
  } catch (error) {
    console.warn(`Failed to extract domain from URL: ${urlString}`, error);
    return "Other";
  }
};

/**
 * Formats a timestamp into a human-readable "time ago" string
 * @param lastAccessed - Timestamp in milliseconds
 * @returns Human-readable time string
 */
export const formatTimeAgo = (lastAccessed: number): string => {
  if (!lastAccessed || lastAccessed <= 0) return "UNKNOWN";

  const now = Date.now();
  const seconds = Math.floor((now - lastAccessed) / 1000);

  if (seconds < 0) return "FUTURE"; // Handle edge case
  if (seconds < 60) return "NOW";

  const intervals = [
    { label: "Y", seconds: 31536000 }, // year
    { label: "M", seconds: 2592000 }, // month (30 days)
    { label: "D", seconds: 86400 }, // day
    { label: "H", seconds: 3600 }, // hour
    { label: "MIN", seconds: 60 }, // minute
  ];

  for (const interval of intervals) {
    const count = Math.floor(seconds / interval.seconds);
    if (count >= 1) {
      return `${count}${interval.label} AGO`;
    }
  }

  return "NOW";
};

/**
 * Generates a current timestamp string for file naming
 * @returns Formatted timestamp string (YYYY-MM-DD_HH-MM-SS)
 */
export const getCurrentTimestamp = (): string => {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
};

/**
 * Validates if a string is a valid URL
 * @param urlString - The URL string to validate
 * @returns Validation result with success status and optional error
 */
export const validateUrl = (urlString: string): ValidationResult => {
  if (!urlString || typeof urlString !== "string") {
    return { isValid: false, error: "URL is required" };
  }

  if (urlString.trim().length === 0) {
    return { isValid: false, error: "URL cannot be empty" };
  }

  try {
    new URL(urlString);
    return { isValid: true };
  } catch (error) {
    return { isValid: false, error: "Invalid URL format" };
  }
};

/**
 * Validates session name
 * @param name - The session name to validate
 * @returns Validation result with success status and optional error
 */
export const validateSessionName = (name: string): ValidationResult => {
  if (!name || typeof name !== "string") {
    return { isValid: false, error: "Session name is required" };
  }

  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return { isValid: false, error: "Session name cannot be empty" };
  }

  if (trimmed.length > 100) {
    return {
      isValid: false,
      error: "Session name too long (max 100 characters)",
    };
  }

  // Check for invalid characters that might cause issues in file systems
  const invalidChars = /[<>:"/\\|?*]/;
  if (invalidChars.test(trimmed)) {
    return {
      isValid: false,
      error: "Session name contains invalid characters",
    };
  }

  return { isValid: true };
};

/**
 * Escapes HTML entities in a string to prevent XSS
 * @param text - The text to escape
 * @returns HTML-escaped text
 */
export const escapeHtml = (text: string): string => {
  if (typeof text !== "string") return "";

  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
};

/**
 * Safely parses JSON with error handling
 * @param jsonString - The JSON string to parse
 * @returns Parsed object or null if parsing fails
 */
export const safeJsonParse = <T = unknown>(jsonString: string): T | null => {
  if (!jsonString || typeof jsonString !== "string") return null;

  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    console.warn("Failed to parse JSON:", error);
    return null;
  }
};

/**
 * Debounces a function call
 * @param func - The function to debounce
 * @param delay - The delay in milliseconds
 * @returns Debounced function
 */
export const debounce = <T extends (...args: unknown[]) => unknown>(
  func: T,
  delay: number,
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;

  return (...args: Parameters<T>): void => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  };
};

/**
 * Truncates text to a specified length with ellipsis
 * @param text - The text to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated text with ellipsis if needed
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (!text || typeof text !== "string") return "";
  if (maxLength <= 0) return "";

  return text.length <= maxLength ? text : `${text.slice(0, maxLength - 3)}...`;
};

/**
 * Creates a safe filename by removing/replacing invalid characters
 * @param filename - The original filename
 * @returns Safe filename for download
 */
export const createSafeFilename = (filename: string): string => {
  if (!filename || typeof filename !== "string") return "untitled";

  return filename
    .replace(/[<>:"/\\|?*]/g, "_") // Replace invalid characters with underscore
    .replace(/\s+/g, "_") // Replace spaces with underscore
    .replace(/_{2,}/g, "_") // Replace multiple underscores with single
    .replace(/^_+|_+$/g, "") // Remove leading/trailing underscores
    .toLowerCase()
    .slice(0, 200); // Limit length
};

/**
 * Formats file size in human-readable format
 * @param bytes - Size in bytes
 * @returns Formatted size string
 */
export const formatFileSize = (bytes: number): string => {
  if (typeof bytes !== "number" || bytes < 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

/**
 * Generates a unique ID string
 * @returns Unique identifier string
 */
export const generateUniqueId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};
