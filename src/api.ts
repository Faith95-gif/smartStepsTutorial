// src/api.ts
const API_URL = "http://localhost:5000"; // your backend

export async function fetchData(endpoint: string) {
  const res = await fetch(`${API_URL}/${endpoint}`);
  if (!res.ok) throw new Error("Network response was not ok");
  return res.json();
}
