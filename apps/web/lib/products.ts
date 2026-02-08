import { api } from "@/lib/api";

export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  stockCritical: number;
  isActive: boolean;
  createdAt: string;
};

export async function listProducts() {
  return api<Product[]>("/products");
}

export async function createProduct(input: {
  name: string;
  category: string;
  price: number;
  stock?: number;
  stockCritical?: number;
}) {
  return api<Product>("/products", { method: "POST", body: JSON.stringify(input) });
}

export async function updateProduct(id: string, patch: Partial<{
  name: string;
  category: string;
  price: number;
  stockCritical: number;
}>) {
  return api<Product>(`/products/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
}

export async function setProductActive(id: string, isActive: boolean) {
  return api<Product>(`/products/${id}/active`, { method: "PATCH", body: JSON.stringify({ isActive }) });
}

export async function adjustProductStock(id: string, delta: number, reason?: string) {
  return api<Product>(`/products/${id}/stock`, { method: "PATCH", body: JSON.stringify({ delta, reason }) });
}
