export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  inStock: boolean;
  stockCount: number;
  rating: number;
  description: string;
}

export const products: Product[] = [
  { id: 'PROD-A1', name: 'Wireless Noise-Cancelling Headphones', category: 'audio', price: 249.99, inStock: true, stockCount: 42, rating: 4.7, description: 'Premium ANC headphones with 30hr battery, multipoint pairing, and spatial audio.' },
  { id: 'PROD-B2', name: 'Ergonomic Keyboard', category: 'peripherals', price: 159.99, inStock: true, stockCount: 18, rating: 4.5, description: 'Split mechanical keyboard with hot-swappable switches and tenting kit.' },
  { id: 'PROD-C3', name: 'USB-C Hub', category: 'accessories', price: 39.99, inStock: true, stockCount: 200, rating: 4.3, description: '7-in-1 USB-C hub with 4K HDMI, 100W PD pass-through, and SD card reader.' },
  { id: 'PROD-D4', name: '27" 4K Monitor', category: 'displays', price: 449.99, inStock: true, stockCount: 7, rating: 4.8, description: 'IPS panel, 120Hz, USB-C with 96W charging, height-adjustable stand.' },
  { id: 'PROD-E5', name: 'Standing Desk Mat', category: 'furniture', price: 79.99, inStock: true, stockCount: 55, rating: 4.2, description: 'Anti-fatigue mat with massage points and beveled edges.' },
  { id: 'PROD-F6', name: 'Webcam Pro 4K', category: 'peripherals', price: 129.99, inStock: false, stockCount: 0, rating: 4.6, description: '4K webcam with AI auto-framing, noise-cancelling mic, and privacy shutter.' },
  { id: 'PROD-G7', name: 'Laptop Stand', category: 'accessories', price: 49.99, inStock: true, stockCount: 88, rating: 4.4, description: 'Aluminum laptop stand with adjustable height and cable management.' },
  { id: 'PROD-H8', name: 'Wireless Mouse', category: 'peripherals', price: 69.99, inStock: true, stockCount: 130, rating: 4.1, description: 'Ergonomic vertical mouse with 4000 DPI sensor and Bluetooth 5.0.' },
];

export function findProduct(productId: string): Product | undefined {
  return products.find(p => p.id === productId);
}

export function searchProducts(query: string): Product[] {
  const q = query.toLowerCase();
  return products.filter(p =>
    p.name.toLowerCase().includes(q) ||
    p.category.toLowerCase().includes(q) ||
    p.description.toLowerCase().includes(q)
  );
}

export function getProductsByCategory(category: string): Product[] {
  return products.filter(p => p.category.toLowerCase() === category.toLowerCase());
}
