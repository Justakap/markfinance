const apiUrl = process.env.REACT_APP_API_URL;

if (!apiUrl) {
  throw new Error("Missing REACT_APP_API_URL in frontend .env");
}

export const API_URL = apiUrl.replace(/\/$/, "");
