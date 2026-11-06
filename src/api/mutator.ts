// src/api/mutator.ts
// Task 6 で本実装する。ここでは Orval の静的解析を通すためのスタブ
export async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  void url;
  void options;
  throw new Error("mutator not implemented");
}
