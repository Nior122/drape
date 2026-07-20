export interface Designer {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  city: string;
  country: string;
  avatarUrl: string;
  coverImageUrl: string;
  specialties: string[];
  minBudget: number;
  maxBudget: number;
  currency: string;
  avgRating: number;
  reviewCount: number;
  turnaroundDays: number;
  verified: boolean;
  portfolio: PortfolioItem[];
  reviews: Review[];
  whatsapp?: string;
  instagram?: string;
}

export interface PortfolioItem {
  id: string;
  imageUrl: string;
  title: string;
  category: string;
}

export interface Review {
  id: string;
  clientName: string;
  clientAvatarUrl: string;
  rating: number;
  comment: string;
  date: string;
  orderTitle: string;
}

export const SPECIALTIES = [
  "Bridal", "Evening Wear", "Tailoring", "Streetwear",
  "Ready-to-Wear", "Couture", "Accessories", "Knitwear",
  "Leather Goods", "Embroidery",
];

export const CITIES = [
  "Lagos", "London", "Paris", "New York", "Milan",
  "Accra", "Nairobi", "Dubai", "Tokyo", "Cape Town",
];

export const MOCK_DESIGNERS: Designer[] = [
  {
    id: "1",
    slug: "ada-obi-studio",
    name: "Ada Obi Studio",
    tagline: "Where tradition meets modernity",
    description: "Ada Obi Studio is a luxury bespoke atelier founded in Lagos, specialising in Afro-contemporary couture. Each piece is a love letter to heritage — hand-embroidered with Aso-oke and Kente-inspired motifs, reimagined for the modern wardrobe. Ada's work has been featured in Vogue Africa and worn at state ceremonies across West Africa.",
    city: "Lagos",
    country: "Nigeria",
    avatarUrl: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=200&h=200&fit=crop&crop=face",
    coverImageUrl: "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=1200&h=400&fit=crop",
    specialties: ["Bridal", "Couture", "Embroidery"],
    minBudget: 800000,
    maxBudget: 8000000,
    currency: "NGN",
    avgRating: 4.9,
    reviewCount: 47,
    turnaroundDays: 21,
    verified: true,
    whatsapp: "+2348012345678",
    instagram: "@adaobistudio",
    portfolio: [
      { id: "p1", imageUrl: "https://images.unsplash.com/photo-1566479179817-d51c5c9c0b85?w=600&h=750&fit=crop", title: "Ivory Celestial Gown", category: "Bridal" },
      { id: "p2", imageUrl: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&h=750&fit=crop", title: "Aso-oke Evening Set", category: "Couture" },
      { id: "p3", imageUrl: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=600&h=750&fit=crop", title: "Heritage Embroidered Jacket", category: "Embroidery" },
      { id: "p4", imageUrl: "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600&h=750&fit=crop", title: "Golden Hour Kaftan", category: "Couture" },
      { id: "p5", imageUrl: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&h=750&fit=crop", title: "Lagos Nights Dress", category: "Evening Wear" },
      { id: "p6", imageUrl: "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=600&h=750&fit=crop", title: "Ceremony Buba Set", category: "Bridal" },
    ],
    reviews: [
      { id: "r1", clientName: "Chidinma A.", clientAvatarUrl: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=60&h=60&fit=crop&crop=face", rating: 5, comment: "Ada brought my vision to life in the most extraordinary way. The embroidery detail on my bridal aso-oke was breathtaking — every guest asked who made it.", date: "2025-11-12", orderTitle: "Custom Bridal Aso-oke Set" },
      { id: "r2", clientName: "Folake O.", clientAvatarUrl: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=60&h=60&fit=crop&crop=face", rating: 5, comment: "Professional, talented, and genuinely cares about her clients. The fit was absolutely perfect on first try.", date: "2025-10-03", orderTitle: "Evening Couture Gown" },
      { id: "r3", clientName: "Ngozi B.", clientAvatarUrl: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=60&h=60&fit=crop&crop=face", rating: 5, comment: "Worth every penny. I've commissioned three pieces now and each one has been better than the last.", date: "2025-09-17", orderTitle: "Embroidered Agbada Set" },
    ],
  },
  {
    id: "2",
    slug: "maison-delacroix",
    name: "Maison Delacroix",
    tagline: "Parisian precision, global perspective",
    description: "A Paris-trained atelier now based in London, Maison Delacroix brings impeccable tailoring to a new generation. Founder Isabelle Delacroix studied at the École de la Chambre Syndicale de la Couture Parisienne before working under two Maisons in the Rue du Faubourg Saint-Honoré. Now independent, she creates made-to-measure pieces with a directional modern sensibility.",
    city: "London",
    country: "United Kingdom",
    avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&crop=face",
    coverImageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&h=400&fit=crop",
    specialties: ["Tailoring", "Ready-to-Wear", "Evening Wear"],
    minBudget: 1920000,
    maxBudget: 19200000,
    currency: "NGN",
    avgRating: 4.8,
    reviewCount: 31,
    turnaroundDays: 28,
    verified: true,
    whatsapp: "+447911123456",
    instagram: "@maisond",
    portfolio: [
      { id: "p1", imageUrl: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600&h=750&fit=crop", title: "The Founder Suit", category: "Tailoring" },
      { id: "p2", imageUrl: "https://images.unsplash.com/photo-1521341957697-b93449760f30?w=600&h=750&fit=crop", title: "Parisian Trench", category: "Ready-to-Wear" },
      { id: "p3", imageUrl: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&h=750&fit=crop", title: "Midnight Crêpe Gown", category: "Evening Wear" },
      { id: "p4", imageUrl: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=600&h=750&fit=crop", title: "Structured Power Blazer", category: "Tailoring" },
      { id: "p5", imageUrl: "https://images.unsplash.com/photo-1562572159-4efd90232a60?w=600&h=750&fit=crop", title: "Bias-Cut Silk Slip", category: "Evening Wear" },
      { id: "p6", imageUrl: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&h=750&fit=crop", title: "Winter Wool Capsule", category: "Ready-to-Wear" },
    ],
    reviews: [
      { id: "r1", clientName: "Emily R.", clientAvatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=60&h=60&fit=crop&crop=face", rating: 5, comment: "The suit Isabelle made for my partnership announcement was the best investment I've made. Seven years later, it still fits perfectly and looks current.", date: "2025-12-01", orderTitle: "Bespoke Double-Breasted Suit" },
      { id: "r2", clientName: "Valentina M.", clientAvatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=60&h=60&fit=crop&crop=face", rating: 5, comment: "Maison Delacroix is the real deal. True couture craft at a price point that isn't entirely impossible.", date: "2025-11-08", orderTitle: "Evening Gown" },
      { id: "r3", clientName: "Sophie K.", clientAvatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=60&h=60&fit=crop&crop=face", rating: 4, comment: "Beautiful work and excellent communication. Took slightly longer than estimated but the result was perfect.", date: "2025-10-22", orderTitle: "Bespoke Trench Coat" },
    ],
  },
];

export function getDesignerBySlug(slug: string): Designer | undefined {
  return MOCK_DESIGNERS.find((d) => d.slug === slug);
}

export function filterDesigners(params: {
  search?: string;
  specialty?: string;
  city?: string;
  minBudget?: number;
  maxBudget?: number;
  minRating?: number;
}): Designer[] {
  return MOCK_DESIGNERS.filter((d) => {
    if (params.search) {
      const q = params.search.toLowerCase();
      if (!d.name.toLowerCase().includes(q) && !d.tagline.toLowerCase().includes(q) && !d.city.toLowerCase().includes(q)) return false;
    }
    if (params.specialty && !d.specialties.includes(params.specialty)) return false;
    if (params.city && d.city !== params.city) return false;
    if (params.minBudget && d.maxBudget < params.minBudget) return false;
    if (params.maxBudget && d.minBudget > params.maxBudget) return false;
    if (params.minRating && d.avgRating < params.minRating) return false;
    return true;
  });
}
