/**
 * Roamio database seed script.
 *
 * Idempotent: clears existing seed content first, then inserts demo profiles,
 * ~40 real places (all 10 categories), ~15 verified KB chunks, and ~10 festivals.
 *
 * Prerequisites (run once in the Supabase SQL Editor):
 *   - supabase/schema.sql
 *   - supabase/seed_functions.sql  (provides insert_place / insert_festival RPCs)
 *
 * Run with:  npx tsx scripts/seed.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient, type PostgrestError } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---------------------------------------------------------------------------
// Verified Unsplash image pool (all return HTTP 200). Pick by best fit.
// ---------------------------------------------------------------------------
const IMG_ID = {
  indiaMonument: "1564507592333-c60657eea523", // iconic India monument (Taj-like)
  hawaMahal: "1599661046289-e31897846e41", // Hawa Mahal / Jaipur pink palace
  beach: "1512343879784-a960bf40e7f2", // tropical beach
  himalaya: "1626621341517-bbf3d9990a23", // Himalayan mountains (Manali)
  varanasi: "1561361513-2d000a50f0dc", // Varanasi ghats / Ganges
  bangkokTemple: "1563492065599-3520f775eeed", // Bangkok temple (Wat)
  baliTemple: "1537996194471-e657df975ab4", // Bali temple / rice terraces
  paris: "1502602898657-3e91760cbb34", // Paris / Eiffel Tower
  swissAlps: "1530122037265-a5f1f91d3b99", // Swiss Alps / mountain lake
  cafe: "1501339847302-ac426a4a7cbb", // cafe interior
  restaurant: "1517248135467-4c7edcad34c4", // restaurant / dining
  hotel: "1566073771259-6a8506099945", // hotel / resort
  museum: "1554907984-15263bfd63bd", // museum interior
  market: "1488459716781-31db52582fe9", // market / bazaar
  park: "1519331379826-f10be5486c6f", // park / green space
  viewpoint: "1464822759023-fed622ff2c3b", // mountain viewpoint / scenic
} as const;

type ImgKey = keyof typeof IMG_ID;

function imgUrl(key: ImgKey): string {
  return `https://images.unsplash.com/photo-${IMG_ID[key]}?w=1200&q=80&auto=format&fit=crop`;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Category =
  | "cafe"
  | "restaurant"
  | "hotel"
  | "monument"
  | "attraction"
  | "viewpoint"
  | "beach"
  | "park"
  | "museum"
  | "market";

interface SeedPlace {
  name: string;
  description: string;
  category: Category;
  city: string;
  state: string | null;
  country: string;
  lat: number;
  lng: number;
  rating: number;
  reviewCount: number;
  priceLevel: number;
  openingHours: Record<string, string>;
  isHistoric: boolean;
  cover: ImgKey;
  /** Second image after the cover (cover is always first in the images array). */
  second: ImgKey;
}

interface SeedKbChunk {
  /** Place name; must match a SeedPlace.name. Skipped if the place was not inserted. */
  place: string;
  content: string;
  source: string;
}

interface SeedFestival {
  name: string;
  description: string;
  lat: number | null;
  lng: number | null;
  city: string;
  country: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  significance: string;
  partnerDiscount: Record<string, unknown> | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function fail(context: string, error: PostgrestError | { message: string } | null): void {
  if (error) {
    throw new Error(`${context}: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// PLACES (~40, covering all 10 categories)
// ---------------------------------------------------------------------------
const PLACES: SeedPlace[] = [
  // --- Jaipur, Rajasthan, India ---
  {
    name: "Amber Fort",
    description:
      "A majestic hilltop fort of red sandstone and marble overlooking Maota Lake, built by Raja Man Singh I in 1592. Famous for its Sheesh Mahal (mirror palace) and sprawling courtyards.",
    category: "monument",
    city: "Jaipur",
    state: "Rajasthan",
    country: "India",
    lat: 26.9855,
    lng: 75.8513,
    rating: 4.7,
    reviewCount: 52000,
    priceLevel: 1,
    openingHours: { mon_sun: "08:00-17:30" },
    isHistoric: true,
    cover: "indiaMonument",
    second: "hawaMahal",
  },
  {
    name: "Hawa Mahal",
    description:
      "The five-storey 'Palace of Winds' built in 1799 by Maharaja Sawai Pratap Singh, its honeycomb facade of 953 small windows let royal women observe street life unseen.",
    category: "monument",
    city: "Jaipur",
    state: "Rajasthan",
    country: "India",
    lat: 26.9239,
    lng: 75.8267,
    rating: 4.5,
    reviewCount: 41000,
    priceLevel: 1,
    openingHours: { mon_sun: "09:00-17:00" },
    isHistoric: true,
    cover: "hawaMahal",
    second: "indiaMonument",
  },
  {
    name: "City Palace, Jaipur",
    description:
      "A grand royal residence complex begun by Maharaja Sawai Jai Singh II in the 1720s, blending Rajput and Mughal architecture with courtyards, museums and the Chandra Mahal.",
    category: "attraction",
    city: "Jaipur",
    state: "Rajasthan",
    country: "India",
    lat: 26.9258,
    lng: 75.8237,
    rating: 4.6,
    reviewCount: 38000,
    priceLevel: 2,
    openingHours: { mon_sun: "09:30-17:00" },
    isHistoric: true,
    cover: "hawaMahal",
    second: "indiaMonument",
  },
  {
    name: "Nahargarh Fort Viewpoint",
    description:
      "Perched on the Aravalli ridge, this 1734 fort offers sweeping panoramic views over Jaipur, especially stunning at sunset over the Pink City.",
    category: "viewpoint",
    city: "Jaipur",
    state: "Rajasthan",
    country: "India",
    lat: 26.9374,
    lng: 75.8153,
    rating: 4.5,
    reviewCount: 21000,
    priceLevel: 1,
    openingHours: { mon_sun: "10:00-22:00" },
    isHistoric: true,
    cover: "viewpoint",
    second: "hawaMahal",
  },
  {
    name: "Tapri Central Cafe",
    description:
      "A popular rooftop tea cafe near Central Park serving chai, regional snacks and views over the city greenery, beloved by Jaipur locals.",
    category: "cafe",
    city: "Jaipur",
    state: "Rajasthan",
    country: "India",
    lat: 26.9035,
    lng: 75.8003,
    rating: 4.3,
    reviewCount: 8200,
    priceLevel: 2,
    openingHours: { mon_sun: "09:00-23:00" },
    isHistoric: false,
    cover: "cafe",
    second: "viewpoint",
  },

  // --- Delhi, India ---
  {
    name: "Red Fort",
    description:
      "The vast red sandstone fortress that served as the main residence of the Mughal emperors for nearly 200 years from 1648. A UNESCO World Heritage Site and symbol of India's independence.",
    category: "monument",
    city: "Delhi",
    state: "Delhi",
    country: "India",
    lat: 28.6562,
    lng: 77.241,
    rating: 4.5,
    reviewCount: 58000,
    priceLevel: 1,
    openingHours: { tue_sun: "09:30-16:30" },
    isHistoric: true,
    cover: "indiaMonument",
    second: "varanasi",
  },
  {
    name: "Qutub Minar",
    description:
      "A 73-metre tapering tower of victory begun in 1193 by Qutb al-Din Aibak, the tallest brick minaret in the world and a UNESCO World Heritage Site.",
    category: "monument",
    city: "Delhi",
    state: "Delhi",
    country: "India",
    lat: 28.5245,
    lng: 77.1855,
    rating: 4.5,
    reviewCount: 47000,
    priceLevel: 1,
    openingHours: { mon_sun: "07:00-17:00" },
    isHistoric: true,
    cover: "indiaMonument",
    second: "hawaMahal",
  },
  {
    name: "Humayun's Tomb",
    description:
      "The 1570 garden-tomb of Mughal Emperor Humayun, commissioned by his widow Bega Begum. A UNESCO site that inspired the design of the Taj Mahal.",
    category: "monument",
    city: "Delhi",
    state: "Delhi",
    country: "India",
    lat: 28.5933,
    lng: 77.2507,
    rating: 4.6,
    reviewCount: 36000,
    priceLevel: 1,
    openingHours: { mon_sun: "06:00-18:00" },
    isHistoric: true,
    cover: "indiaMonument",
    second: "park",
  },
  {
    name: "India Gate",
    description:
      "A 42-metre war memorial arch designed by Edwin Lutyens, commemorating 70,000 Indian soldiers who died in World War I. The surrounding lawns are a popular evening gathering spot.",
    category: "attraction",
    city: "Delhi",
    state: "Delhi",
    country: "India",
    lat: 28.6129,
    lng: 77.2295,
    rating: 4.6,
    reviewCount: 49000,
    priceLevel: 1,
    openingHours: { mon_sun: "00:00-23:59" },
    isHistoric: true,
    cover: "indiaMonument",
    second: "park",
  },
  {
    name: "Lotus Temple",
    description:
      "A Bahá'í House of Worship completed in 1986, shaped like a lotus flower with 27 marble petals. Open to all faiths for quiet meditation.",
    category: "attraction",
    city: "Delhi",
    state: "Delhi",
    country: "India",
    lat: 28.5535,
    lng: 77.2588,
    rating: 4.5,
    reviewCount: 44000,
    priceLevel: 1,
    openingHours: { tue_sun: "09:00-17:30" },
    isHistoric: false,
    cover: "indiaMonument",
    second: "park",
  },
  {
    name: "National Museum, New Delhi",
    description:
      "India's premier museum, established in 1949, holding over 200,000 artefacts spanning 5,000 years from the Indus Valley Civilisation to modern art.",
    category: "museum",
    city: "Delhi",
    state: "Delhi",
    country: "India",
    lat: 28.6117,
    lng: 77.2195,
    rating: 4.4,
    reviewCount: 14000,
    priceLevel: 1,
    openingHours: { tue_sun: "10:00-18:00" },
    isHistoric: false,
    cover: "museum",
    second: "indiaMonument",
  },
  {
    name: "Chandni Chowk Market",
    description:
      "One of Delhi's oldest and busiest markets, laid out in the 17th century by Shah Jahan. A maze of lanes famous for street food, spices, textiles and jewellery.",
    category: "market",
    city: "Delhi",
    state: "Delhi",
    country: "India",
    lat: 28.6506,
    lng: 77.2303,
    rating: 4.3,
    reviewCount: 31000,
    priceLevel: 1,
    openingHours: { mon_sat: "10:00-20:00" },
    isHistoric: true,
    cover: "market",
    second: "indiaMonument",
  },

  // --- Goa, India ---
  {
    name: "Baga Beach",
    description:
      "A lively North Goa beach known for water sports, beach shacks and a buzzing nightlife scene along its golden sands.",
    category: "beach",
    city: "Baga",
    state: "Goa",
    country: "India",
    lat: 15.5566,
    lng: 73.7517,
    rating: 4.3,
    reviewCount: 39000,
    priceLevel: 1,
    openingHours: {},
    isHistoric: false,
    cover: "beach",
    second: "restaurant",
  },
  {
    name: "Palolem Beach",
    description:
      "A crescent-shaped South Goa beach fringed with palms, famed for its calm waters, colourful huts and laid-back atmosphere.",
    category: "beach",
    city: "Canacona",
    state: "Goa",
    country: "India",
    lat: 15.01,
    lng: 74.0233,
    rating: 4.5,
    reviewCount: 27000,
    priceLevel: 1,
    openingHours: {},
    isHistoric: false,
    cover: "beach",
    second: "hotel",
  },
  {
    name: "Anjuna Beach",
    description:
      "A rocky-shored North Goa beach famous for its Wednesday flea market, trance parties and bohemian, hippie-era heritage.",
    category: "beach",
    city: "Anjuna",
    state: "Goa",
    country: "India",
    lat: 15.5735,
    lng: 73.744,
    rating: 4.2,
    reviewCount: 22000,
    priceLevel: 1,
    openingHours: {},
    isHistoric: false,
    cover: "beach",
    second: "market",
  },
  {
    name: "Britto's Beach Shack",
    description:
      "An iconic Baga beachfront restaurant since 1965, serving fresh Goan seafood, prawn curries and chilled beer with toes in the sand.",
    category: "restaurant",
    city: "Baga",
    state: "Goa",
    country: "India",
    lat: 15.5556,
    lng: 73.7508,
    rating: 4.2,
    reviewCount: 16000,
    priceLevel: 2,
    openingHours: { mon_sun: "08:30-23:30" },
    isHistoric: false,
    cover: "restaurant",
    second: "beach",
  },
  {
    name: "Taj Holiday Village Resort, Goa",
    description:
      "A beachfront luxury resort in Sinquerim set amid landscaped gardens, with Portuguese-villa styling and direct access to the Arabian Sea.",
    category: "hotel",
    city: "Candolim",
    state: "Goa",
    country: "India",
    lat: 15.4994,
    lng: 73.7669,
    rating: 4.6,
    reviewCount: 9400,
    priceLevel: 4,
    openingHours: {},
    isHistoric: false,
    cover: "hotel",
    second: "beach",
  },

  // --- Manali, Himachal Pradesh, India ---
  {
    name: "Solang Valley Viewpoint",
    description:
      "A scenic Himalayan valley near Manali offering panoramic snow-peak views, paragliding and skiing, framed by the Beas River and pine forests.",
    category: "viewpoint",
    city: "Manali",
    state: "Himachal Pradesh",
    country: "India",
    lat: 32.317,
    lng: 77.156,
    rating: 4.4,
    reviewCount: 24000,
    priceLevel: 1,
    openingHours: { mon_sun: "07:00-18:00" },
    isHistoric: false,
    cover: "himalaya",
    second: "viewpoint",
  },
  {
    name: "Hadimba Temple",
    description:
      "A 1553 cedar-wood temple dedicated to Hidimba Devi, set in a deodar forest in Old Manali, distinctive for its pagoda-style roof.",
    category: "monument",
    city: "Manali",
    state: "Himachal Pradesh",
    country: "India",
    lat: 32.2496,
    lng: 77.1828,
    rating: 4.4,
    reviewCount: 19000,
    priceLevel: 1,
    openingHours: { mon_sun: "08:00-18:00" },
    isHistoric: true,
    cover: "himalaya",
    second: "indiaMonument",
  },
  {
    name: "Cafe 1947, Manali",
    description:
      "A riverside cafe in Old Manali on the banks of the Manalsu, popular for wood-fired pizzas, live music and mountain views.",
    category: "cafe",
    city: "Manali",
    state: "Himachal Pradesh",
    country: "India",
    lat: 32.2566,
    lng: 77.1796,
    rating: 4.3,
    reviewCount: 7600,
    priceLevel: 2,
    openingHours: { mon_sun: "09:00-23:00" },
    isHistoric: false,
    cover: "cafe",
    second: "himalaya",
  },

  // --- Varanasi, Uttar Pradesh, India ---
  {
    name: "Dashashwamedh Ghat",
    description:
      "The principal and oldest ghat of Varanasi on the Ganges, renowned for its nightly Ganga Aarti, a spectacular fire-and-chant ceremony attended by thousands.",
    category: "attraction",
    city: "Varanasi",
    state: "Uttar Pradesh",
    country: "India",
    lat: 25.305,
    lng: 83.01,
    rating: 4.6,
    reviewCount: 33000,
    priceLevel: 1,
    openingHours: { mon_sun: "00:00-23:59" },
    isHistoric: true,
    cover: "varanasi",
    second: "indiaMonument",
  },
  {
    name: "Kashi Vishwanath Temple",
    description:
      "One of the holiest Hindu temples dedicated to Lord Shiva, located on the western bank of the Ganges; the current structure was rebuilt in 1780 by Ahilyabai Holkar.",
    category: "monument",
    city: "Varanasi",
    state: "Uttar Pradesh",
    country: "India",
    lat: 25.3109,
    lng: 83.0107,
    rating: 4.6,
    reviewCount: 41000,
    priceLevel: 1,
    openingHours: { mon_sun: "03:00-23:00" },
    isHistoric: true,
    cover: "varanasi",
    second: "indiaMonument",
  },
  {
    name: "Assi Ghat",
    description:
      "The southernmost ghat of Varanasi at the confluence of the Assi and Ganges rivers, popular for sunrise boat rides, yoga and a daily morning aarti.",
    category: "viewpoint",
    city: "Varanasi",
    state: "Uttar Pradesh",
    country: "India",
    lat: 25.2877,
    lng: 83.0064,
    rating: 4.5,
    reviewCount: 18000,
    priceLevel: 1,
    openingHours: { mon_sun: "00:00-23:59" },
    isHistoric: true,
    cover: "varanasi",
    second: "viewpoint",
  },

  // --- Bangkok, Thailand ---
  {
    name: "Wat Arun",
    description:
      "The 'Temple of Dawn' on the Thonburi bank of the Chao Phraya, its 70-metre central prang is encrusted with colourful porcelain and seashells, glowing at sunrise and sunset.",
    category: "monument",
    city: "Bangkok",
    state: null,
    country: "Thailand",
    lat: 13.7437,
    lng: 100.4889,
    rating: 4.6,
    reviewCount: 46000,
    priceLevel: 1,
    openingHours: { mon_sun: "08:00-18:00" },
    isHistoric: true,
    cover: "bangkokTemple",
    second: "viewpoint",
  },
  {
    name: "Wat Pho",
    description:
      "One of Bangkok's oldest and largest temples, home to the 46-metre golden Reclining Buddha and regarded as the birthplace of traditional Thai massage.",
    category: "monument",
    city: "Bangkok",
    state: null,
    country: "Thailand",
    lat: 13.7465,
    lng: 100.4927,
    rating: 4.7,
    reviewCount: 51000,
    priceLevel: 1,
    openingHours: { mon_sun: "08:00-18:30" },
    isHistoric: true,
    cover: "bangkokTemple",
    second: "indiaMonument",
  },
  {
    name: "Grand Palace, Bangkok",
    description:
      "The dazzling former royal residence built in 1782, a complex of throne halls and temples including Wat Phra Kaew, home to the revered Emerald Buddha.",
    category: "attraction",
    city: "Bangkok",
    state: null,
    country: "Thailand",
    lat: 13.75,
    lng: 100.4914,
    rating: 4.6,
    reviewCount: 60000,
    priceLevel: 2,
    openingHours: { mon_sun: "08:30-15:30" },
    isHistoric: true,
    cover: "bangkokTemple",
    second: "indiaMonument",
  },
  {
    name: "Chatuchak Weekend Market",
    description:
      "One of the world's largest weekend markets with over 15,000 stalls across 27 sections, selling everything from clothing and antiques to street food and plants.",
    category: "market",
    city: "Bangkok",
    state: null,
    country: "Thailand",
    lat: 13.7999,
    lng: 100.5505,
    rating: 4.4,
    reviewCount: 42000,
    priceLevel: 1,
    openingHours: { sat_sun: "09:00-18:00" },
    isHistoric: false,
    cover: "market",
    second: "bangkokTemple",
  },

  // --- Bali, Indonesia ---
  {
    name: "Uluwatu Temple",
    description:
      "An 11th-century sea temple perched on a 70-metre clifftop above the Indian Ocean, famous for its sunset Kecak fire dance and resident macaques.",
    category: "monument",
    city: "Uluwatu",
    state: "Bali",
    country: "Indonesia",
    lat: -8.8291,
    lng: 115.0849,
    rating: 4.6,
    reviewCount: 38000,
    priceLevel: 1,
    openingHours: { mon_sun: "07:00-19:00" },
    isHistoric: true,
    cover: "baliTemple",
    second: "viewpoint",
  },
  {
    name: "Tanah Lot",
    description:
      "A 16th-century Hindu sea temple set on a tidal rock formation off Bali's southwest coast, one of the island's most photographed sunset landmarks.",
    category: "monument",
    city: "Tabanan",
    state: "Bali",
    country: "Indonesia",
    lat: -8.6212,
    lng: 115.0868,
    rating: 4.5,
    reviewCount: 35000,
    priceLevel: 1,
    openingHours: { mon_sun: "07:00-19:00" },
    isHistoric: true,
    cover: "baliTemple",
    second: "beach",
  },
  {
    name: "Ubud Monkey Forest",
    description:
      "The Sacred Monkey Forest Sanctuary in Ubud, a lush nature reserve and Hindu temple complex home to over 1,200 long-tailed macaques among ancient banyan trees.",
    category: "park",
    city: "Ubud",
    state: "Bali",
    country: "Indonesia",
    lat: -8.5188,
    lng: 115.2588,
    rating: 4.4,
    reviewCount: 29000,
    priceLevel: 1,
    openingHours: { mon_sun: "09:00-18:00" },
    isHistoric: false,
    cover: "park",
    second: "baliTemple",
  },
  {
    name: "Potato Head Beach Club",
    description:
      "An iconic Seminyak beach club with an oceanfront infinity pool, sunset DJ sets and a striking facade of recycled antique shutters.",
    category: "restaurant",
    city: "Seminyak",
    state: "Bali",
    country: "Indonesia",
    lat: -8.6776,
    lng: 115.1564,
    rating: 4.4,
    reviewCount: 18000,
    priceLevel: 3,
    openingHours: { mon_sun: "10:00-23:00" },
    isHistoric: false,
    cover: "restaurant",
    second: "beach",
  },

  // --- Paris, France ---
  {
    name: "Eiffel Tower",
    description:
      "The 330-metre wrought-iron lattice tower designed by Gustave Eiffel for the 1889 World's Fair, now the global symbol of Paris with observation decks over the city.",
    category: "monument",
    city: "Paris",
    state: null,
    country: "France",
    lat: 48.8584,
    lng: 2.2945,
    rating: 4.7,
    reviewCount: 60000,
    priceLevel: 2,
    openingHours: { mon_sun: "09:30-23:45" },
    isHistoric: true,
    cover: "paris",
    second: "viewpoint",
  },
  {
    name: "Louvre Museum",
    description:
      "The world's most-visited museum, a former royal palace housing some 35,000 works including the Mona Lisa and the Venus de Milo, fronted by I. M. Pei's glass pyramid.",
    category: "museum",
    city: "Paris",
    state: null,
    country: "France",
    lat: 48.8606,
    lng: 2.3376,
    rating: 4.7,
    reviewCount: 58000,
    priceLevel: 2,
    openingHours: { wed_mon: "09:00-18:00" },
    isHistoric: true,
    cover: "museum",
    second: "paris",
  },
  {
    name: "Les Deux Magots",
    description:
      "A historic Left-Bank cafe in Saint-Germain-des-Prés, a former haunt of Sartre, Hemingway and Picasso, famous for its hot chocolate and literary heritage.",
    category: "cafe",
    city: "Paris",
    state: null,
    country: "France",
    lat: 48.854,
    lng: 2.3334,
    rating: 4.3,
    reviewCount: 21000,
    priceLevel: 3,
    openingHours: { mon_sun: "07:30-01:00" },
    isHistoric: true,
    cover: "cafe",
    second: "paris",
  },
  {
    name: "Le Comptoir du Relais",
    description:
      "A beloved Saint-Germain bistro by chef Yves Camdeborde, serving refined French classics in an intimate Art Deco dining room.",
    category: "restaurant",
    city: "Paris",
    state: null,
    country: "France",
    lat: 48.851,
    lng: 2.3387,
    rating: 4.4,
    reviewCount: 9800,
    priceLevel: 3,
    openingHours: { mon_sun: "12:00-23:00" },
    isHistoric: false,
    cover: "restaurant",
    second: "paris",
  },

  // --- Switzerland ---
  {
    name: "Jungfraujoch",
    description:
      "The 'Top of Europe' at 3,454 metres, reached by Europe's highest railway station, offering eternal snow, the Aletsch Glacier and an Alpine research observatory.",
    category: "viewpoint",
    city: "Lauterbrunnen",
    state: "Bern",
    country: "Switzerland",
    lat: 46.5474,
    lng: 7.9856,
    rating: 4.7,
    reviewCount: 27000,
    priceLevel: 4,
    openingHours: { mon_sun: "08:00-18:00" },
    isHistoric: false,
    cover: "swissAlps",
    second: "viewpoint",
  },
  {
    name: "Matterhorn Viewpoint, Zermatt",
    description:
      "The iconic 4,478-metre pyramidal peak above the car-free village of Zermatt, one of the most photographed mountains on Earth.",
    category: "viewpoint",
    city: "Zermatt",
    state: "Valais",
    country: "Switzerland",
    lat: 45.9763,
    lng: 7.6586,
    rating: 4.8,
    reviewCount: 24000,
    priceLevel: 1,
    openingHours: {},
    isHistoric: false,
    cover: "swissAlps",
    second: "viewpoint",
  },
  {
    name: "Lake Geneva Park (Jardin Anglais)",
    description:
      "A lakeside English-style garden in Geneva with the famous Flower Clock, manicured lawns and views of the Jet d'Eau fountain.",
    category: "park",
    city: "Geneva",
    state: "Geneva",
    country: "Switzerland",
    lat: 46.2047,
    lng: 6.1503,
    rating: 4.4,
    reviewCount: 12000,
    priceLevel: 1,
    openingHours: { mon_sun: "00:00-23:59" },
    isHistoric: false,
    cover: "park",
    second: "swissAlps",
  },
  {
    name: "Hotel Schweizerhof Luzern",
    description:
      "A grand belle-époque lakefront hotel in Lucerne, open since 1845, blending historic elegance with views over Lake Lucerne and the Alps.",
    category: "hotel",
    city: "Lucerne",
    state: "Lucerne",
    country: "Switzerland",
    lat: 47.0529,
    lng: 8.3132,
    rating: 4.6,
    reviewCount: 6300,
    priceLevel: 4,
    openingHours: {},
    isHistoric: true,
    cover: "hotel",
    second: "swissAlps",
  },

  // --- Extra balancers (museums / markets / cafes) ---
  {
    name: "Albert Hall Museum",
    description:
      "The oldest museum in Rajasthan, an 1887 Indo-Saracenic landmark in Jaipur displaying paintings, carpets, an Egyptian mummy and decorative arts.",
    category: "museum",
    city: "Jaipur",
    state: "Rajasthan",
    country: "India",
    lat: 26.9117,
    lng: 75.8194,
    rating: 4.4,
    reviewCount: 16000,
    priceLevel: 1,
    openingHours: { mon_sun: "09:00-17:00" },
    isHistoric: true,
    cover: "museum",
    second: "hawaMahal",
  },
  {
    name: "Johari Bazaar",
    description:
      "Jaipur's historic jewellery market, lined with shops selling traditional Kundan and Meenakari gold work, gemstones and Rajasthani textiles.",
    category: "market",
    city: "Jaipur",
    state: "Rajasthan",
    country: "India",
    lat: 26.9189,
    lng: 75.8268,
    rating: 4.3,
    reviewCount: 11000,
    priceLevel: 2,
    openingHours: { mon_sat: "11:00-21:00" },
    isHistoric: true,
    cover: "market",
    second: "hawaMahal",
  },
  {
    name: "Wander Bali Cafe, Canggu",
    description:
      "A breezy tropical cafe in Canggu serving specialty coffee, smoothie bowls and brunch, a favourite of Bali's digital-nomad community.",
    category: "cafe",
    city: "Canggu",
    state: "Bali",
    country: "Indonesia",
    lat: -8.6478,
    lng: 115.1385,
    rating: 4.4,
    reviewCount: 5200,
    priceLevel: 2,
    openingHours: { mon_sun: "07:00-22:00" },
    isHistoric: false,
    cover: "cafe",
    second: "baliTemple",
  },
];

// ---------------------------------------------------------------------------
// KB CHUNKS (~15 verified facts, keyed by place name)
// ---------------------------------------------------------------------------
const KB_CHUNKS: SeedKbChunk[] = [
  {
    place: "Amber Fort",
    content:
      "Amber Fort (also spelled Amer Fort) was built beginning in 1592 by Raja Man Singh I, a trusted general of the Mughal emperor Akbar. Constructed from red sandstone and white marble, it served as the capital of the Kachwaha Rajputs until 1727. Its Sheesh Mahal hall is famed for thousands of tiny mirrors that light up the room from a single candle.",
    source: "Roamio verified KB",
  },
  {
    place: "Hawa Mahal",
    content:
      "Hawa Mahal, the 'Palace of Winds', was built in 1799 by Maharaja Sawai Pratap Singh and designed by Lal Chand Ustad. Its five-storey pink sandstone facade contains 953 small latticed windows (jharokhas) that allowed royal women to watch street festivals while remaining unseen, in keeping with the purdah custom. The windows also funnel cool breezes through the structure.",
    source: "Roamio verified KB",
  },
  {
    place: "Red Fort",
    content:
      "The Red Fort (Lal Qila) in Delhi was commissioned by Mughal Emperor Shah Jahan in 1638 and completed in 1648 when the capital moved from Agra to Shahjahanabad. It remained the main Mughal residence for about 200 years. India's Prime Minister addresses the nation from its ramparts every Independence Day, 15 August. It was designated a UNESCO World Heritage Site in 2007.",
    source: "Roamio verified KB",
  },
  {
    place: "Qutub Minar",
    content:
      "Qutub Minar is a 72.5-metre (about 73 m) tapering minaret in Delhi, the tallest brick minaret in the world. Its construction was begun in 1193 by Qutb al-Din Aibak, founder of the Delhi Sultanate, and completed by his successor Iltutmish. The five-storey tower is built of red sandstone and marble and is a UNESCO World Heritage Site.",
    source: "Roamio verified KB",
  },
  {
    place: "Humayun's Tomb",
    content:
      "Humayun's Tomb in Delhi was built between 1569 and 1570, commissioned by Humayun's widow Empress Bega Begum and designed by the Persian architect Mirak Mirza Ghiyas. It was the first garden-tomb on the Indian subcontinent and the first to use red sandstone at such scale, establishing a style that culminated in the Taj Mahal. It became a UNESCO World Heritage Site in 1993.",
    source: "Roamio verified KB",
  },
  {
    place: "Wat Arun",
    content:
      "Wat Arun, the Temple of Dawn, sits on the Thonburi west bank of the Chao Phraya River in Bangkok. Named after Aruna, the Hindu god of dawn, its central spire (prang) rises about 70 metres and is decorated with colourful porcelain and seashells once used as ballast by Chinese trading ships. The temple was given its current form during the reign of King Rama II in the early 19th century.",
    source: "Roamio verified KB",
  },
  {
    place: "Wat Pho",
    content:
      "Wat Pho in Bangkok is one of Thailand's oldest temples and houses the 46-metre-long, 15-metre-high gold-plated Reclining Buddha. The temple is regarded as the birthplace of traditional Thai massage and still operates a renowned massage school. It predates Bangkok as the capital and was restored and expanded by King Rama I in the 1780s.",
    source: "Roamio verified KB",
  },
  {
    place: "Grand Palace, Bangkok",
    content:
      "The Grand Palace in Bangkok was established in 1782 by King Rama I as the official residence of the Kings of Siam. Within its walls stands Wat Phra Kaew, the Temple of the Emerald Buddha, which houses Thailand's most sacred Buddha image, carved from a single block of jade. The palace served as the royal residence until 1925.",
    source: "Roamio verified KB",
  },
  {
    place: "Eiffel Tower",
    content:
      "The Eiffel Tower was designed by the engineering firm of Gustave Eiffel and built between 1887 and 1889 as the centrepiece of the 1889 Exposition Universelle marking the centenary of the French Revolution. Standing about 330 metres tall, it was the world's tallest man-made structure until 1930. Originally intended to be dismantled after 20 years, it was saved by its value as a radio transmission tower.",
    source: "Roamio verified KB",
  },
  {
    place: "Louvre Museum",
    content:
      "The Louvre in Paris began as a 12th-century fortress under Philip II and became a royal palace before opening as a public museum in 1793 during the French Revolution. It is the world's most-visited museum, holding around 35,000 works including Leonardo da Vinci's Mona Lisa and the ancient Venus de Milo. The glass pyramid entrance, designed by I. M. Pei, was inaugurated in 1989.",
    source: "Roamio verified KB",
  },
  {
    place: "Uluwatu Temple",
    content:
      "Pura Luhur Uluwatu is a Balinese sea temple (pura) perched on a cliff about 70 metres above the Indian Ocean at Bali's southwestern tip. It is one of the island's six key 'sad kahyangan' temples believed to protect Bali from evil spirits. Each evening a Kecak fire-and-trance dance is performed at the clifftop amphitheatre at sunset.",
    source: "Roamio verified KB",
  },
  {
    place: "Tanah Lot",
    content:
      "Tanah Lot is a Hindu sea temple set on a rocky outcrop off Bali's southwest coast. According to tradition it was established in the 16th century by the priest Dang Hyang Nirartha. At high tide the rock is cut off by the sea, and the temple is one of Bali's most famous sunset destinations.",
    source: "Roamio verified KB",
  },
  {
    place: "Dashashwamedh Ghat",
    content:
      "Dashashwamedh Ghat is the main and one of the oldest ghats of Varanasi, located on the Ganges close to the Kashi Vishwanath Temple. Its name relates to a legend that Lord Brahma performed a sacrifice of ten horses (dasha-ashwamedha) here. Every evening priests perform an elaborate Ganga Aarti with fire lamps, conch shells and chanting before crowds of pilgrims and visitors.",
    source: "Roamio verified KB",
  },
  {
    place: "Hadimba Temple",
    content:
      "Hadimba Temple in Manali was built in 1553 and is dedicated to Hidimba Devi, a character from the Mahabharata. Set within a forest of deodar cedars, it is notable for its multi-tiered pagoda-style wooden roof and ornately carved doorway rather than a conventional idol shrine.",
    source: "Roamio verified KB",
  },
  {
    place: "Kashi Vishwanath Temple",
    content:
      "Kashi Vishwanath Temple in Varanasi is one of the most sacred Hindu temples dedicated to Lord Shiva and houses one of the twelve Jyotirlingas. The present temple was rebuilt in 1780 by Maharani Ahilyabai Holkar of Indore. The Sikh ruler Maharaja Ranjit Singh later donated gold to plate its towers, giving rise to its nickname, the Golden Temple of Varanasi.",
    source: "Roamio verified KB",
  },
];

// ---------------------------------------------------------------------------
// FESTIVALS (~10, with 2026/2027 upcoming dates relative to 2026-06-16)
// ---------------------------------------------------------------------------
const FESTIVALS: SeedFestival[] = [
  {
    name: "Holi",
    description:
      "The vibrant Hindu festival of colours celebrating the arrival of spring and the triumph of good over evil. Mathura and Vrindavan host some of the most famous celebrations.",
    lat: 27.4924,
    lng: 77.6737,
    city: "Mathura",
    country: "India",
    startDate: "2027-03-13",
    endDate: "2027-03-14",
    significance:
      "Marks the victory of good over evil and the start of spring; people throw coloured powders and water in joyful celebration.",
    partnerDiscount: null,
  },
  {
    name: "Diwali",
    description:
      "The five-day Hindu festival of lights, when homes and streets glow with oil lamps, candles and fireworks. Jaipur's markets and palaces are spectacularly illuminated.",
    lat: 26.9124,
    lng: 75.7873,
    city: "Jaipur",
    country: "India",
    startDate: "2026-11-08",
    endDate: "2026-11-12",
    significance:
      "Celebrates the triumph of light over darkness and the return of Lord Rama to Ayodhya; symbolises new beginnings and prosperity.",
    partnerDiscount: null,
  },
  {
    name: "Durga Puja",
    description:
      "Kolkata's grandest festival, honouring the goddess Durga with elaborate themed pandals, artistry, music and processions over several days.",
    lat: 22.5726,
    lng: 88.3639,
    city: "Kolkata",
    country: "India",
    startDate: "2026-10-17",
    endDate: "2026-10-21",
    significance:
      "Commemorates goddess Durga's victory over the buffalo demon Mahishasura; a UNESCO Intangible Cultural Heritage celebration.",
    partnerDiscount: null,
  },
  {
    name: "Pushkar Camel Fair",
    description:
      "One of the world's largest camel and livestock fairs, combining trading, folk performances, competitions and a sacred lake pilgrimage in the desert town of Pushkar.",
    lat: 26.4897,
    lng: 74.5511,
    city: "Pushkar",
    country: "India",
    startDate: "2026-11-19",
    endDate: "2026-11-24",
    significance:
      "A centuries-old Rajasthani livestock fair coinciding with the Kartik Purnima pilgrimage to the holy Pushkar Lake.",
    partnerDiscount: null,
  },
  {
    name: "La Tomatina",
    description:
      "The world's biggest tomato fight, held on the last Wednesday of August in the town of Buñol, where tens of thousands hurl overripe tomatoes through the streets.",
    lat: 39.4197,
    lng: -0.7906,
    city: "Buñol",
    country: "Spain",
    startDate: "2026-08-26",
    endDate: "2026-08-26",
    significance:
      "A festive food fight held annually since 1945, now a global attraction and symbol of Spanish summer revelry.",
    partnerDiscount: null,
  },
  {
    name: "Oktoberfest",
    description:
      "The world's largest folk festival and beer celebration, held on Munich's Theresienwiese with traditional beer tents, Bavarian food, music and funfair rides.",
    lat: 48.1314,
    lng: 11.5497,
    city: "Munich",
    country: "Germany",
    startDate: "2026-09-19",
    endDate: "2026-10-04",
    significance:
      "Dating to a 1810 royal wedding celebration, it is the world's largest Volksfest and a hallmark of Bavarian culture.",
    partnerDiscount: null,
  },
  {
    name: "Songkran",
    description:
      "The Thai New Year water festival, when streets across Bangkok turn into joyful nationwide water fights symbolising cleansing and renewal.",
    lat: 13.7563,
    lng: 100.5018,
    city: "Bangkok",
    country: "Thailand",
    startDate: "2027-04-13",
    endDate: "2027-04-15",
    significance:
      "The traditional Thai New Year, where water is splashed to wash away misfortune and honour elders; recognised by UNESCO.",
    partnerDiscount: null,
  },
  {
    name: "Rio Carnival",
    description:
      "The world-famous Brazilian carnival, a dazzling spectacle of samba parades, costumes and street parties filling Rio de Janeiro before Lent.",
    lat: -22.9068,
    lng: -43.1729,
    city: "Rio de Janeiro",
    country: "Brazil",
    startDate: "2027-02-05",
    endDate: "2027-02-10",
    significance:
      "The largest carnival in the world, blending African, Portuguese and indigenous traditions in a pre-Lenten celebration.",
    partnerDiscount: null,
  },
  {
    name: "Nyepi",
    description:
      "Bali's Day of Silence marking the Balinese New Year, when the entire island observes 24 hours of quiet, fasting and meditation, preceded by vivid Ogoh-ogoh parades.",
    lat: -8.4095,
    lng: 115.1889,
    city: "Denpasar",
    country: "Indonesia",
    startDate: "2027-03-08",
    endDate: "2027-03-08",
    significance:
      "A Hindu day of self-reflection during which all activity ceases island-wide, including the airport, to welcome the Saka New Year.",
    partnerDiscount: null,
  },
  {
    name: "Venice Carnival",
    description:
      "An elegant centuries-old carnival famed for elaborate Venetian masks, baroque costumes and masquerade balls along the canals of Venice.",
    lat: 45.4408,
    lng: 12.3155,
    city: "Venice",
    country: "Italy",
    startDate: "2027-01-30",
    endDate: "2027-02-16",
    significance:
      "Renowned since the 13th century for its masks that historically dissolved social rank, it is one of the world's most iconic carnivals.",
    partnerDiscount: null,
  },
];

// ---------------------------------------------------------------------------
// Demo users
// ---------------------------------------------------------------------------
const DEMO_PASSWORD = "RoamioDemo!2024";
const DEMO_USERS: { email: string; fullName: string }[] = [
  { email: "demo1@roamio.test", fullName: "Aarav Sharma" },
  { email: "demo2@roamio.test", fullName: "Mia Chen" },
  { email: "demo3@roamio.test", fullName: "Liam Müller" },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  const sentinel = "00000000-0000-0000-0000-000000000000";

  // 1) Clear existing seed content (FK-safe order) for a clean reseed.
  console.log("Clearing existing seed content (kb_chunks, trip_items, saved_places, journal_entries, places, festivals)...");
  for (const table of [
    "kb_chunks",
    "trip_items",
    "saved_places",
    "journal_entries",
    "places",
    "festivals",
  ] as const) {
    const { error } = await supabase.from(table).delete().neq("id", sentinel);
    fail(`Failed clearing ${table}`, error);
  }

  // 2) Demo profiles via the admin API (handle_new_user trigger creates profile rows).
  let profilesCreated = 0;
  for (const { email, fullName } of DEMO_USERS) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (error) {
      // User may already exist — look it up and continue instead of crashing.
      const list = await supabase.auth.admin.listUsers();
      if (list.error) {
        throw new Error(`Failed creating user ${email} and could not list users: ${error.message} / ${list.error.message}`);
      }
      const existing = list.data.users.find((u) => u.email === email);
      if (existing) {
        console.log(`Demo user ${email} already exists — skipping creation.`);
      } else {
        throw new Error(`Failed creating demo user ${email}: ${error.message}`);
      }
    } else if (data.user) {
      profilesCreated += 1;
      console.log(`Created demo user ${email} (${fullName}).`);
    }
  }

  // 3) Places — insert each via the insert_place RPC and keep a name -> uuid map.
  const placeIdByName = new Map<string, string>();
  let placesInserted = 0;
  for (const p of PLACES) {
    const { data, error } = await supabase.rpc("insert_place", {
      p_name: p.name,
      p_description: p.description,
      p_category: p.category,
      p_city: p.city,
      p_state: p.state,
      p_country: p.country,
      p_lat: p.lat,
      p_lng: p.lng,
      p_rating: p.rating,
      p_review_count: p.reviewCount,
      p_price_level: p.priceLevel,
      p_opening_hours: p.openingHours,
      p_is_historic: p.isHistoric,
      p_cover_image: imgUrl(p.cover),
      p_images: [imgUrl(p.cover), imgUrl(p.second)],
      p_external_ids: {},
    });
    fail(`Failed inserting place "${p.name}"`, error);
    const placeId = data as string;
    placeIdByName.set(p.name, placeId);
    placesInserted += 1;
  }
  console.log(`Inserted ${placesInserted} places across all categories.`);

  // 4) KB chunks — verified facts for famous places (embedding left null for Brick 12).
  let kbInserted = 0;
  let kbSkipped = 0;
  for (const chunk of KB_CHUNKS) {
    const placeId = placeIdByName.get(chunk.place);
    if (!placeId) {
      kbSkipped += 1;
      console.log(`Skipping KB chunk for "${chunk.place}" — place was not inserted.`);
      continue;
    }
    const { error } = await supabase.from("kb_chunks").insert({
      place_id: placeId,
      content: chunk.content,
      source: chunk.source,
      verified: true,
    });
    fail(`Failed inserting KB chunk for "${chunk.place}"`, error);
    kbInserted += 1;
  }
  console.log(`Inserted ${kbInserted} kb_chunks${kbSkipped ? ` (${kbSkipped} skipped)` : ""}.`);

  // 5) Festivals — insert each via the insert_festival RPC.
  let festivalsInserted = 0;
  for (const f of FESTIVALS) {
    const { error } = await supabase.rpc("insert_festival", {
      p_name: f.name,
      p_description: f.description,
      p_lat: f.lat,
      p_lng: f.lng,
      p_city: f.city,
      p_country: f.country,
      p_start_date: f.startDate,
      p_end_date: f.endDate,
      p_significance: f.significance,
      p_partner_discount: f.partnerDiscount,
    });
    fail(`Failed inserting festival "${f.name}"`, error);
    festivalsInserted += 1;
  }
  console.log(`Inserted ${festivalsInserted} festivals.`);

  // 6) Summary.
  console.log("\n=== Roamio seed summary ===");
  console.log(`Profiles (demo users created this run): ${profilesCreated} / ${DEMO_USERS.length}`);
  console.log(`Places inserted:                        ${placesInserted}`);
  console.log(`KB chunks inserted:                     ${kbInserted}`);
  console.log(`Festivals inserted:                     ${festivalsInserted}`);
  console.log("===========================\n");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
