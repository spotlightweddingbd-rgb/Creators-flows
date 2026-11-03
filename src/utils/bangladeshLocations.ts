/**
 * Bangladesh Administrative Divisions and 64 Districts Dataset
 * Official 8 Divisions & 64 Districts of Bangladesh
 */

export interface BangladeshDistrict {
  id: string;
  name: string;
  bnName?: string;
  divisionId: string;
  divisionName: string;
}

export interface BangladeshDivision {
  id: string;
  name: string;
  districts: string[]; // district names
}

export const BANGLADESH_DIVISIONS: BangladeshDivision[] = [
  {
    id: 'dhaka',
    name: 'Dhaka Division',
    districts: [
      'Dhaka',
      'Gazipur',
      'Narayanganj',
      'Tangail',
      'Narsingdi',
      'Faridpur',
      'Gopalganj',
      'Kishoreganj',
      'Madaripur',
      'Manikganj',
      'Munshiganj',
      'Rajbari',
      'Shariatpur',
    ],
  },
  {
    id: 'chattogram',
    name: 'Chattogram Division',
    districts: [
      'Chattogram (Chittagong)',
      'Cox\'s Bazar',
      'Cumilla (Comilla)',
      'Brahmanbaria',
      'Chandpur',
      'Feni',
      'Lakshmipur',
      'Noakhali',
      'Bandarban',
      'Khagrachhari',
      'Rangamati',
    ],
  },
  {
    id: 'rajshahi',
    name: 'Rajshahi Division',
    districts: [
      'Rajshahi',
      'Bogura (Bogra)',
      'Pabna',
      'Sirajganj',
      'Naogaon',
      'Natore',
      'Chapainawabganj',
      'Joypurhat',
    ],
  },
  {
    id: 'khulna',
    name: 'Khulna Division',
    districts: [
      'Khulna',
      'Jashore (Jessore)',
      'Kushtia',
      'Bagerhat',
      'Satkhira',
      'Jhenaidah',
      'Chuadanga',
      'Magura',
      'Meherpur',
      'Narail',
    ],
  },
  {
    id: 'barishal',
    name: 'Barishal Division',
    districts: [
      'Barishal (Barisal)',
      'Patuakhali',
      'Bhola',
      'Pirojpur',
      'Barguna',
      'Jhalokati',
    ],
  },
  {
    id: 'sylhet',
    name: 'Sylhet Division',
    districts: [
      'Sylhet',
      'Moulvibazar',
      'Habiganj',
      'Sunamganj',
    ],
  },
  {
    id: 'rangpur',
    name: 'Rangpur Division',
    districts: [
      'Rangpur',
      'Dinajpur',
      'Gaibandha',
      'Kurigram',
      'Nilphamari',
      'Lalmonirhat',
      'Panchagarh',
      'Thakurgaon',
    ],
  },
  {
    id: 'mymensingh',
    name: 'Mymensingh Division',
    districts: [
      'Mymensingh',
      'Jamalpur',
      'Netrokona',
      'Sherpur',
    ],
  },
];

export const ALL_BANGLADESH_OPTION = 'All Bangladesh (Nationwide)';

// Flat list of all 64 districts
export const ALL_BANGLADESH_DISTRICTS: string[] = BANGLADESH_DIVISIONS.reduce<string[]>(
  (acc, div) => [...acc, ...div.districts],
  []
);

/**
 * Helper to find division name for a given district name
 */
export function getDivisionForDistrict(districtName: string): string | null {
  if (!districtName) return null;
  const clean = districtName.toLowerCase().trim();
  for (const div of BANGLADESH_DIVISIONS) {
    if (div.districts.some((d) => d.toLowerCase() === clean || d.toLowerCase().includes(clean))) {
      return div.name;
    }
  }
  return null;
}

/**
 * Filter districts by search query
 */
export function searchBangladeshDistricts(query: string): string[] {
  if (!query || !query.trim()) return ALL_BANGLADESH_DISTRICTS;
  const q = query.toLowerCase().trim();
  return ALL_BANGLADESH_DISTRICTS.filter((d) => d.toLowerCase().includes(q));
}
