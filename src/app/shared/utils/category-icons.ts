import * as lucideIcons from '@ng-icons/lucide';
import { LUCIDE_ICON_CATEGORIES } from './lucide-categories';

export interface CategoryIconDefinition {
  id: string;
  label: string;
  iconName: string;
  categoriaSugerida?: 'gasto' | 'ingreso';
  categories: string[];
}

export interface IconCategoryTab {
  id: string;
  label: string;
}

export const ICON_CATEGORY_TABS: IconCategoryTab[] = [
  { id: 'finance', label: 'Finanzas' },
  { id: 'food-beverage', label: 'Comida & Bebida' },
  { id: 'transportation', label: 'Transporte' },
  { id: 'home', label: 'Hogar' },
  { id: 'shopping', label: 'Compras' },
  { id: 'devices', label: 'Dispositivos' },
  { id: 'design', label: 'Diseño' },
  { id: 'medical', label: 'Salud & Medicina' },
  { id: 'travel', label: 'Viajes' },
  { id: 'sports', label: 'Deportes' },
  { id: 'animals', label: 'Mascotas' },
  { id: 'gaming', label: 'Gaming' },
  { id: 'tools', label: 'Herramientas' },
  { id: 'social', label: 'Social & Personas' },
];

function toKebabCase(str: string): string {
  let s = str;
  if (s.startsWith('lucide')) {
    s = s.substring(6);
  } else if (s.startsWith('hero')) {
    s = s.substring(4);
  }
  return s.replace(/([a-z0-9])([A-Z])/g, (m, p1, p2) => p1 + '-' + p2).toLowerCase();
}

function formatIconLabel(iconKey: string): string {
  let name = iconKey;
  if (name.startsWith('lucide')) {
    name = name.substring(6);
  } else if (name.startsWith('hero')) {
    name = name.substring(4);
  }
  return name.replace(/([A-Z0-9])/g, ' $1').trim();
}

function getCategoriesForIcon(iconName: string, fallbackCats?: string[]): string[] {
  const kebab = toKebabCase(iconName);
  const fromLucide = LUCIDE_ICON_CATEGORIES[kebab] || [];
  if (fallbackCats && fallbackCats.length > 0) {
    return Array.from(new Set([...fromLucide, ...fallbackCats]));
  }
  return fromLucide;
}

// 1. Iconos populares de finanzas y vida cotidiana (con etiquetas amigables en español)
const CURATED_ICONS: CategoryIconDefinition[] = [
  { id: 'tag', label: 'General / Etiqueta', iconName: 'lucideTag', categories: getCategoriesForIcon('lucideTag', ['shopping']) },
  { id: 'food', label: 'Comida y Alimentos', iconName: 'lucideUtensils', categoriaSugerida: 'gasto', categories: getCategoriesForIcon('lucideUtensils', ['food-beverage']) },
  { id: 'restaurants', label: 'Restaurantes y Bares', iconName: 'lucideUtensilsCrossed', categoriaSugerida: 'gasto', categories: getCategoriesForIcon('lucideUtensilsCrossed', ['food-beverage']) },
  { id: 'coffee', label: 'Cafetería y Bebidas', iconName: 'lucideCoffee', categoriaSugerida: 'gasto', categories: getCategoriesForIcon('lucideCoffee', ['food-beverage']) },
  { id: 'shopping', label: 'Supermercado y Despensa', iconName: 'lucideShoppingCart', categoriaSugerida: 'gasto', categories: getCategoriesForIcon('lucideShoppingCart', ['shopping', 'finance']) },
  { id: 'shopping-bag', label: 'Ropa y Tiendas', iconName: 'lucideShoppingBag', categoriaSugerida: 'gasto', categories: getCategoriesForIcon('lucideShoppingBag', ['shopping']) },
  { id: 'transport', label: 'Transporte y Auto', iconName: 'lucideCar', categoriaSugerida: 'gasto', categories: getCategoriesForIcon('lucideCar', ['transportation']) },
  { id: 'fuel', label: 'Gasolina y Combustible', iconName: 'lucideFuel', categoriaSugerida: 'gasto', categories: getCategoriesForIcon('lucideFuel', ['transportation']) },
  { id: 'bus', label: 'Transporte Público / Autobús', iconName: 'lucideBus', categoriaSugerida: 'gasto', categories: getCategoriesForIcon('lucideBus', ['transportation']) },
  { id: 'home', label: 'Hogar y Renta', iconName: 'lucideHouse', categoriaSugerida: 'gasto', categories: getCategoriesForIcon('lucideHouse', ['home']) },
  { id: 'bills', label: 'Luz y Servicios', iconName: 'lucideZap', categoriaSugerida: 'gasto', categories: getCategoriesForIcon('lucideZap', ['home', 'devices']) },
  { id: 'wifi', label: 'Internet y Conexión', iconName: 'lucideWifi', categoriaSugerida: 'gasto', categories: getCategoriesForIcon('lucideWifi', ['devices', 'home']) },
  { id: 'phone', label: 'Telefonía Móvil', iconName: 'lucideSmartphone', categoriaSugerida: 'gasto', categories: getCategoriesForIcon('lucideSmartphone', ['devices']) },
  { id: 'tech', label: 'Tecnología e Informática', iconName: 'lucideLaptop', categoriaSugerida: 'gasto', categories: getCategoriesForIcon('lucideLaptop', ['devices']) },
  { id: 'tv', label: 'Streaming y Televisión', iconName: 'lucideTv', categoriaSugerida: 'gasto', categories: getCategoriesForIcon('lucideTv', ['devices', 'home']) },
  { id: 'health', label: 'Salud y Medicina', iconName: 'lucideHeartPulse', categoriaSugerida: 'gasto', categories: getCategoriesForIcon('lucideHeartPulse', ['medical']) },
  { id: 'pharmacy', label: 'Farmacia y Medicamentos', iconName: 'lucidePill', categoriaSugerida: 'gasto', categories: getCategoriesForIcon('lucidePill', ['medical']) },
  { id: 'gym', label: 'Gimnasio y Deporte', iconName: 'lucideDumbbell', categoriaSugerida: 'gasto', categories: getCategoriesForIcon('lucideDumbbell', ['sports']) },
  { id: 'pets', label: 'Mascotas y Veterinaria', iconName: 'lucidePawPrint', categoriaSugerida: 'gasto', categories: getCategoriesForIcon('lucidePawPrint', ['animals']) },
  { id: 'education', label: 'Educación y Universidad', iconName: 'lucideGraduationCap', categoriaSugerida: 'gasto', categories: getCategoriesForIcon('lucideGraduationCap', ['social']) },
  { id: 'books', label: 'Libros y Cursos', iconName: 'lucideBookOpen', categoriaSugerida: 'gasto', categories: getCategoriesForIcon('lucideBookOpen', ['social']) },
  { id: 'salary', label: 'Sueldo / Salario y Empleo', iconName: 'lucideBriefcase', categoriaSugerida: 'ingreso', categories: getCategoriesForIcon('lucideBriefcase', ['finance']) },
  { id: 'wallet', label: 'Cartera y Efectivo', iconName: 'lucideWallet', categoriaSugerida: 'ingreso', categories: getCategoriesForIcon('lucideWallet', ['finance']) },
  { id: 'cash', label: 'Dinero en Efectivo', iconName: 'lucideBanknote', categoriaSugerida: 'ingreso', categories: getCategoriesForIcon('lucideBanknote', ['finance']) },
  { id: 'piggy', label: 'Ahorro y Alcancía', iconName: 'lucidePiggyBank', categoriaSugerida: 'ingreso', categories: getCategoriesForIcon('lucidePiggyBank', ['finance']) },
  { id: 'card', label: 'Tarjetas y Crédito', iconName: 'lucideCreditCard', categories: getCategoriesForIcon('lucideCreditCard', ['finance']) },
  { id: 'dollar', label: 'Dólares y Divisas', iconName: 'lucideDollarSign', categoriaSugerida: 'ingreso', categories: getCategoriesForIcon('lucideDollarSign', ['finance']) },
  { id: 'euro', label: 'Euros y Divisas', iconName: 'lucideEuro', categoriaSugerida: 'ingreso', categories: getCategoriesForIcon('lucideEuro', ['finance']) },
  { id: 'coins', label: 'Monedas y Sueltos', iconName: 'lucideCoins', categoriaSugerida: 'ingreso', categories: getCategoriesForIcon('lucideCoins', ['finance']) },
  { id: 'taxes', label: 'Impuestos y Facturas', iconName: 'lucideReceipt', categoriaSugerida: 'gasto', categories: getCategoriesForIcon('lucideReceipt', ['finance']) },
  { id: 'investments', label: 'Inversiones y Rendimientos', iconName: 'lucideTrendingUp', categoriaSugerida: 'ingreso', categories: getCategoriesForIcon('lucideTrendingUp', ['finance']) },
  { id: 'crypto', label: 'Criptomonedas / Bitcoin', iconName: 'lucideBitcoin', categoriaSugerida: 'ingreso', categories: getCategoriesForIcon('lucideBitcoin', ['finance']) },
  { id: 'gift', label: 'Regalos y Donaciones', iconName: 'lucideGift', categories: getCategoriesForIcon('lucideGift', ['shopping', 'social']) },
  { id: 'beauty', label: 'Cuidado Personal y Belleza', iconName: 'lucideSparkles', categoriaSugerida: 'gasto', categories: getCategoriesForIcon('lucideSparkles', ['design']) },
  { id: 'music', label: 'Música y Conciertos', iconName: 'lucideMusic', categoriaSugerida: 'gasto', categories: getCategoriesForIcon('lucideMusic', ['devices', 'social']) },
  { id: 'leisure', label: 'Cine y Ocio', iconName: 'lucideFilm', categoriaSugerida: 'gasto', categories: getCategoriesForIcon('lucideFilm', ['devices', 'social']) },
  { id: 'events', label: 'Eventos y Entradas', iconName: 'lucideTicket', categoriaSugerida: 'gasto', categories: getCategoriesForIcon('lucideTicket', ['social']) },
  { id: 'travel', label: 'Viajes y Vuelos', iconName: 'lucidePlane', categoriaSugerida: 'gasto', categories: getCategoriesForIcon('lucidePlane', ['travel', 'transportation']) },
  { id: 'repairs', label: 'Mantenimiento y Reparación', iconName: 'lucideWrench', categoriaSugerida: 'gasto', categories: getCategoriesForIcon('lucideWrench', ['tools', 'home']) },
  { id: 'insurance', label: 'Seguros y Protección', iconName: 'lucideShieldCheck', categoriaSugerida: 'gasto', categories: getCategoriesForIcon('lucideShieldCheck', ['finance', 'home']) },
  { id: 'subscriptions', label: 'Suscripciones y Cuotas', iconName: 'lucideCalendarDays', categoriaSugerida: 'gasto', categories: getCategoriesForIcon('lucideCalendarDays', ['finance']) },
  { id: 'delivery', label: 'Envíos y Paquetería', iconName: 'lucidePackage', categoriaSugerida: 'gasto', categories: getCategoriesForIcon('lucidePackage', ['shopping', 'transportation']) },
];

// 2. Catálogo completo de Lucide Icons categorizado
const usedIconNames = new Set(CURATED_ICONS.map((item) => item.iconName));
const ALL_LUCIDE_ICONS: CategoryIconDefinition[] = [...CURATED_ICONS];

for (const key of Object.keys(lucideIcons)) {
  if (!usedIconNames.has(key)) {
    ALL_LUCIDE_ICONS.push({
      id: key,
      label: formatIconLabel(key),
      iconName: key,
      categories: getCategoriesForIcon(key),
    });
  }
}

export const CATEGORY_ICONS: CategoryIconDefinition[] = ALL_LUCIDE_ICONS;

export const CATEGORY_ICONS_MAP: Record<string, string> = {
  ...(lucideIcons as Record<string, string>),

  // Database ID aliases for backward compatibility with existing tags
  tag: lucideIcons.lucideTag,
  food: lucideIcons.lucideUtensils,
  restaurants: lucideIcons.lucideUtensilsCrossed,
  coffee: lucideIcons.lucideCoffee,
  shopping: lucideIcons.lucideShoppingCart,
  'shopping-bag': lucideIcons.lucideShoppingBag,
  transport: lucideIcons.lucideCar,
  fuel: lucideIcons.lucideFuel,
  bus: lucideIcons.lucideBus,
  home: lucideIcons.lucideHouse,
  'home-modern': lucideIcons.lucideHouse,
  bills: lucideIcons.lucideZap,
  wifi: lucideIcons.lucideWifi,
  phone: lucideIcons.lucideSmartphone,
  tech: lucideIcons.lucideLaptop,
  tv: lucideIcons.lucideTv,
  health: lucideIcons.lucideHeartPulse,
  pharmacy: lucideIcons.lucidePill,
  gym: lucideIcons.lucideDumbbell,
  fitness: lucideIcons.lucideDumbbell,
  pets: lucideIcons.lucidePawPrint,
  education: lucideIcons.lucideGraduationCap,
  books: lucideIcons.lucideBookOpen,
  salary: lucideIcons.lucideBriefcase,
  wallet: lucideIcons.lucideWallet,
  cash: lucideIcons.lucideBanknote,
  piggy: lucideIcons.lucidePiggyBank,
  card: lucideIcons.lucideCreditCard,
  dollar: lucideIcons.lucideDollarSign,
  euro: lucideIcons.lucideEuro,
  coins: lucideIcons.lucideCoins,
  taxes: lucideIcons.lucideReceipt,
  investments: lucideIcons.lucideTrendingUp,
  crypto: lucideIcons.lucideBitcoin,
  gift: lucideIcons.lucideGift,
  beauty: lucideIcons.lucideSparkles,
  music: lucideIcons.lucideMusic,
  leisure: lucideIcons.lucideFilm,
  events: lucideIcons.lucideTicket,
  travel: lucideIcons.lucidePlane,
  repairs: lucideIcons.lucideWrench,
  insurance: lucideIcons.lucideShieldCheck,
  subscriptions: lucideIcons.lucideCalendarDays,
  delivery: lucideIcons.lucidePackage,
  receipt: lucideIcons.lucideReceipt,
  other: lucideIcons.lucideTag,
};

const ID_TO_ICON_NAME: Record<string, string> = {};
for (const item of CATEGORY_ICONS) {
  ID_TO_ICON_NAME[item.id] = item.iconName;
}
ID_TO_ICON_NAME['receipt'] = 'lucideReceipt';
ID_TO_ICON_NAME['coins'] = 'lucideCoins';
ID_TO_ICON_NAME['pets'] = 'lucidePawPrint';
ID_TO_ICON_NAME['fitness'] = 'lucideDumbbell';
ID_TO_ICON_NAME['gym'] = 'lucideDumbbell';
ID_TO_ICON_NAME['other'] = 'lucideTag';
ID_TO_ICON_NAME['briefcase'] = 'lucideBriefcase';
ID_TO_ICON_NAME['food'] = 'lucideUtensils';
ID_TO_ICON_NAME['transport'] = 'lucideCar';
ID_TO_ICON_NAME['home'] = 'lucideHouse';
ID_TO_ICON_NAME['shopping'] = 'lucideShoppingCart';
ID_TO_ICON_NAME['bills'] = 'lucideZap';
ID_TO_ICON_NAME['salary'] = 'lucideBriefcase';
ID_TO_ICON_NAME['tag'] = 'lucideTag';

export function getCategoryIconName(iconId?: string | null): string {
  if (!iconId) return 'lucideTag';
  if (iconId in ID_TO_ICON_NAME) {
    return ID_TO_ICON_NAME[iconId];
  }
  if (iconId in CATEGORY_ICONS_MAP) {
    return iconId;
  }
  return 'lucideTag';
}

export function getCategoryIconPath(iconId?: string | null): string {
  return CATEGORY_ICONS_MAP[iconId || 'tag'] || '';
}
