import { findProduct, searchProducts, getProductsByCategory } from '../data/products.js';
import type { ParsedSidecarIntent } from 'minns-sdk';
import type { HandlerResult } from './order-tracking.js';

export function handleProducts(intent: ParsedSidecarIntent): HandlerResult {
  switch (intent.intent) {
    case 'product_info': {
      const productId = intent.slots.product_id != null ? String(intent.slots.product_id) : undefined;
      const query = intent.slots.query != null ? String(intent.slots.query) : undefined;
      if (productId) {
        const product = findProduct(productId);
        if (!product) return { response: `Product ${productId} not found.`, success: false };
        return {
          response: `**${product.name}** ($${product.price.toFixed(2)})\n\n${product.description}\n\nRating: ${'★'.repeat(Math.round(product.rating))} (${product.rating}/5)\nAvailability: ${product.inStock ? `In stock (${product.stockCount} available)` : 'Out of stock'}`,
          data: product,
          observationType: 'product_lookup',
          success: true,
        };
      }
      if (query) {
        const results = searchProducts(query);
        if (results.length === 0) return { response: `I couldn't find any products matching "${query}".`, success: false };
        const list = results.slice(0, 4).map(p => `- **${p.name}** — $${p.price.toFixed(2)} (${p.rating}★)`).join('\n');
        return {
          response: `Here are products matching "${query}":\n${list}`,
          data: results,
          observationType: 'product_search',
          success: true,
        };
      }
      return { response: 'What product would you like to know about? You can give me a product ID or search term.' };
    }
    case 'availability': {
      const productId = intent.slots.product_id != null ? String(intent.slots.product_id) : undefined;
      if (!productId) return { response: 'Which product would you like to check availability for?' };
      const product = findProduct(productId);
      if (!product) return { response: `Product ${productId} not found.`, success: false };
      return {
        response: product.inStock
          ? `**${product.name}** is in stock with ${product.stockCount} units available.`
          : `**${product.name}** is currently out of stock. I can notify you when it's back.`,
        data: { id: product.id, name: product.name, inStock: product.inStock, stockCount: product.stockCount },
        observationType: 'availability_check',
        success: true,
      };
    }
    case 'recommend': {
      const category = intent.slots.category != null ? String(intent.slots.category) : undefined;
      const items = category ? getProductsByCategory(category) : searchProducts('');
      const topItems = (items.length > 0 ? items : searchProducts(''))
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 3);
      const list = topItems.map(p => `- **${p.name}** — $${p.price.toFixed(2)} (${p.rating}★) — ${p.description.slice(0, 60)}...`).join('\n');
      return {
        response: `Here are my top recommendations${category ? ` in ${category}` : ''}:\n${list}`,
        data: topItems,
        observationType: 'product_recommendation',
        success: true,
      };
    }
    default:
      return { response: 'I can help you find products, check availability, and make recommendations. What are you looking for?' };
  }
}
