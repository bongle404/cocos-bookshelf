export type Distributor = 'panmac' | 'hachette' | 'unknown';

export interface BookRow {
  isbn: string;
  title: string;
  author: string;
  format: 'Paperback' | 'Trade Paperback' | 'Hardback' | 'Board/Novelty' | 'Other';
  category: string;
  categoryRaw: string;
  rrp: number | null;
  buyPrice: number | null;
  marginPct: number | null;
  stock: number;
  pubYear: number | null;
  pubDate: string;
  cartonQty: number | null;
  distributor: Distributor;
  flagged: boolean;
  // Order pack fields
  orderCartons: number;
  buyPriceOverride: number | null;
}
