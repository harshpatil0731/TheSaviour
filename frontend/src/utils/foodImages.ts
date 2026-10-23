/**
 * Relevant high-quality image mappings for Shopery Organic Civic theme
 */

export const FOOD_IMAGES: Record<string, string> = {
  // Cooked meals
  'COOKED_MEALS': 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
  'cooked_meals': 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
  'cooked_meal': 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=600&q=80',
  'Cooked Meals': 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=600&q=80',

  // Bakery items
  'BAKERY': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80',
  'bakery': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80',
  'bakery_produce': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80',
  'Bakery Produce': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80',

  // Raw rations & grains
  'RAW_RATIONS': 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80',
  'raw_rations': 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80',
  'raw_ration_kit': 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80',
  'Raw Ration Kit': 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80',

  // Infant formula & baby nutrition
  'INFANT_FORMULA': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80',
  'infant_formula': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80',
  'Infant Formula': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80',

  // Medical supplies
  'REFRIGERATED_MEDICINE': 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=600&q=80',
  'refrigerated_medicine': 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=600&q=80',
  'Refrigerated Medicine': 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=600&q=80',

  // Packaged grocery & pantry
  'PACKAGED_FOOD': 'https://images.unsplash.com/photo-1607349913338-fca6f7fc42d0?auto=format&fit=crop&w=600&q=80',
  'packaged_food': 'https://images.unsplash.com/photo-1607349913338-fca6f7fc42d0?auto=format&fit=crop&w=600&q=80',
  'Packaged Food': 'https://images.unsplash.com/photo-1607349913338-fca6f7fc42d0?auto=format&fit=crop&w=600&q=80',

  // Drinking water & hydration
  'DRINKING_WATER': 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=600&q=80',
  'water': 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=600&q=80',
};

export const DEFAULT_AID_IMAGE = 'https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?auto=format&fit=crop&w=600&q=80';

export function getAidImage(categoryOrTitle?: string): string {
  if (!categoryOrTitle) return DEFAULT_AID_IMAGE;
  const key = categoryOrTitle.trim();
  if (FOOD_IMAGES[key]) return FOOD_IMAGES[key];
  
  const lower = key.toLowerCase();
  if (lower.includes('biryani') || lower.includes('meal') || lower.includes('lunch') || lower.includes('dinner') || lower.includes('thali') || lower.includes('rice')) {
    return 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=600&q=80';
  }
  if (lower.includes('bread') || lower.includes('bakery') || lower.includes('bun') || lower.includes('pastry') || lower.includes('cake')) {
    return 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80';
  }
  if (lower.includes('ration') || lower.includes('grain') || lower.includes('dal') || lower.includes('lentil') || lower.includes('flour') || lower.includes('wheat')) {
    return 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80';
  }
  if (lower.includes('infant') || lower.includes('baby') || lower.includes('formula') || lower.includes('milk') || lower.includes('lacto')) {
    return 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80';
  }
  if (lower.includes('med') || lower.includes('pharma') || lower.includes('insulin') || lower.includes('vaccine') || lower.includes('cold')) {
    return 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=600&q=80';
  }
  if (lower.includes('water') || lower.includes('hydrate')) {
    return 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=600&q=80';
  }

  return DEFAULT_AID_IMAGE;
}

export const FLEET_IMAGE = 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=600&q=80';
export const SHELTER_IMAGE = 'https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=600&q=80';
export const HERO_BANNER_IMAGE = 'https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?auto=format&fit=crop&w=1200&q=80';
