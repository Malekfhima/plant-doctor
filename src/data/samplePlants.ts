import { BotanicalDiagnosis, HerbariumPlant } from '../types/botanical';

export const SAMPLE_DIAGNOSES: BotanicalDiagnosis[] = [
  {
    id: 'diag-monstera-01',
    commonName: 'Monstera Deliciosa',
    latinTaxonomy: 'Monstera deliciosa Liebm.',
    family: 'Araceae',
    condition: 'Septoria Leaf Spot (Septoria sp.) & Moisture Stress',
    severity: 'critical',
    confidence: 96.4,
    pathologyType: 'Fungal Pathogen',
    summary: 'Concentric necrotic lesions with chlorotic halos localized along primary leaf veins, symptomatic of early-stage Septoria fungal infection compounded by root saturation.',
    symptoms: [
      'Circular dark brown to black lesions with distinct yellow chlorotic halos',
      'Marginal tissue necrosis along distal fenestrations',
      'Localized loss of chlorophyll in interveinal zones'
    ],
    afflictedImageUrl: 'https://images.unsplash.com/photo-1614594975525-e45190c55d0b?auto=format&fit=crop&w=1000&q=80',
    healthyImageUrl: 'https://images.unsplash.com/photo-1617173944883-6ffbd35d584d?auto=format&fit=crop&w=1000&q=80',
    telemetry: {
      sunlight: { current: 1850, optimalMin: 2500, optimalMax: 4000, unit: 'Lux', status: 'low' },
      moisture: { current: 78, optimalMin: 45, optimalMax: 60, unit: '%', status: 'critical' },
      temperature: { current: 21.5, optimalMin: 20, optimalMax: 28, unit: '°C', status: 'optimal' }
    },
    treatmentProtocol: [
      {
        step: 1,
        title: 'Immediate Specimen Isolation',
        action: 'Quarantine specimen from adjacent foliage to halt fungal spore transmission via ambient air currents and watering splashback.',
        timeframe: 'Immediate (0-2h)',
        completed: true
      },
      {
        step: 2,
        title: 'Surgical Debridement & Antifungal Wash',
        action: 'Excise lesions with sterilized shears (70% isopropyl). Apply organic copper octanoate fungicide or cold-pressed neem emulsion to both leaf surfaces.',
        timeframe: 'Day 1',
        completed: false
      },
      {
        step: 3,
        title: 'Root Aeration & Moisture Modulation',
        action: 'Withhold irrigation until root ball reaches 35% moisture. Elevate ambient air circulation and increase indirect photon flux.',
        timeframe: 'Days 2-14',
        completed: false
      }
    ],
    prevention: 'Never mist foliage in low-airflow conditions. Bottom-water exclusively to prevent standing water on leaf margins.',
    scannedAt: '2026-11-09T07:42:00Z',
    notes: 'Specimen in East Atrium, pot #M-12. Showing active sporulation along lower fenestrations.'
  },
  {
    id: 'diag-calathea-02',
    commonName: 'Calathea Orbifolia',
    latinTaxonomy: 'Goeppertia orbifolia (Linden) Borchs.',
    family: 'Marantaceae',
    condition: 'Two-Spotted Spider Mite (Tetranychus urticae)',
    severity: 'critical',
    confidence: 94.8,
    pathologyType: 'Pest Infestation',
    summary: 'Microscopic stippling and silvery chlorotic mottling across abaxial leaf epidermis, accompanied by fine silk webbing along secondary venation.',
    symptoms: [
      'Dense silver-yellow stippling on leaf surface caused by mesophyll feeding',
      'Micro-webbing spanning leaf petioles and abaxial ribbing',
      'Inward rolling of leaf margins due to rapid cellular transpiration loss'
    ],
    afflictedImageUrl: 'https://images.unsplash.com/photo-1598880940371-c756e015fea1?auto=format&fit=crop&w=1000&q=80',
    healthyImageUrl: 'https://images.unsplash.com/photo-1509423350716-97f9360b4e09?auto=format&fit=crop&w=1000&q=80',
    telemetry: {
      sunlight: { current: 3100, optimalMin: 2000, optimalMax: 3500, unit: 'Lux', status: 'optimal' },
      moisture: { current: 32, optimalMin: 55, optimalMax: 70, unit: '%', status: 'low' },
      temperature: { current: 27.2, optimalMin: 18, optimalMax: 24, unit: '°C', status: 'excessive' }
    },
    treatmentProtocol: [
      {
        step: 1,
        title: 'High-Pressure Foliar Rinse',
        action: 'Wash specimen undersides thoroughly with tepid water (22°C) to mechanically dislodge 80%+ of adult arachnid population.',
        timeframe: 'Immediate',
        completed: false
      },
      {
        step: 2,
        title: 'Insecticidal Soap / Horticultural Oil',
        action: 'Coat adaxial and abaxial surfaces with potassium salts of fatty acids or pure cold-pressed karanja oil.',
        timeframe: 'Day 1 & repeat Day 5',
        completed: false
      },
      {
        step: 3,
        title: 'Introduce Phytoseiulus persimilis',
        action: 'Deploy beneficial predatory mites to hunt residual nymphs and ovum clusters without toxic chemical residue.',
        timeframe: 'Day 7',
        completed: false
      }
    ],
    prevention: 'Elevate relative ambient humidity above 60%. Spider mites proliferate exponentially in dry, arid microclimates.',
    scannedAt: '2026-11-08T14:15:00Z',
    notes: 'Abaxial foliage inspection confirmed nymph movement under 20x loupe.'
  },
  {
    id: 'diag-ficus-03',
    commonName: 'Fiddle Leaf Fig',
    latinTaxonomy: 'Ficus lyrata Warb.',
    family: 'Moraceae',
    condition: 'Physiological Edema & Light Deficiency',
    severity: 'medium',
    confidence: 91.2,
    pathologyType: 'Physiological / Abiotic',
    summary: 'Ruptured leaf parenchymal cells presenting as reddish-brown pinhead indentations along new foliage, symptomatic of irregular turgor pressure and insufficient photon flux.',
    symptoms: [
      'Reddish-purple speckles (ruptured vacuoles) on juvenile unfurled leaves',
      'Mild epinastic downward leaf drooping',
      'Extended internodal elongation (etiolation) toward nearest window'
    ],
    afflictedImageUrl: 'https://images.unsplash.com/photo-1545241047-6083a3684587?auto=format&fit=crop&w=1000&q=80',
    healthyImageUrl: 'https://images.unsplash.com/photo-1597055181300-e3633a917c9c?auto=format&fit=crop&w=1000&q=80',
    telemetry: {
      sunlight: { current: 1400, optimalMin: 4500, optimalMax: 8000, unit: 'Lux', status: 'low' },
      moisture: { current: 82, optimalMin: 40, optimalMax: 55, unit: '%', status: 'critical' },
      temperature: { current: 22.0, optimalMin: 20, optimalMax: 26, unit: '°C', status: 'optimal' }
    },
    treatmentProtocol: [
      {
        step: 1,
        title: 'Standardize Irrigation Cadence',
        action: 'Permit top 5cm of soil substrate to dry completely between saturations. Ensure nursery pot drains freely.',
        timeframe: 'Week 1',
        completed: false
      },
      {
        step: 2,
        title: 'Relocate to High-Lux Southern Exposure',
        action: 'Gradually acclimatize specimen to 4,500 - 7,000 Lux bright filtered light to accelerate transpiration rate.',
        timeframe: 'Immediate',
        completed: false
      },
      {
        step: 3,
        title: 'Incorporate Silica & Calcium Fertilizer',
        action: 'Supplement monthly feeding with soluble potassium silicate to strengthen cellular cell walls against turgor blowouts.',
        timeframe: 'Day 14',
        completed: false
      }
    ],
    prevention: 'Avoid dramatic swings between prolonged drought and sudden hyper-saturation.',
    scannedAt: '2026-11-07T11:00:00Z',
    notes: 'Older foliage intact; only terminal growth exhibits cellular edema.'
  },
  {
    id: 'diag-anthurium-04',
    commonName: 'Anthurium Clarinervium',
    latinTaxonomy: 'Anthurium clarinervium Matuda',
    family: 'Araceae',
    condition: 'Optimal Botanical Vitality',
    severity: 'low',
    confidence: 98.7,
    pathologyType: 'Optimal Vitality',
    summary: 'Specimen displays exceptional turgor, deep emerald lamina with pristine silvery-white primary venation, and zero observable pathogen signatures.',
    symptoms: [
      'Velvety, dark cordate leaf blades with crisp contrasting veins',
      'Uniform stomatal distribution with healthy transpirational balance',
      'Active emergent cataphyll signaling upcoming vegetative flush'
    ],
    afflictedImageUrl: 'https://images.unsplash.com/photo-1509423350716-97f9360b4e09?auto=format&fit=crop&w=1000&q=80',
    healthyImageUrl: 'https://images.unsplash.com/photo-1509423350716-97f9360b4e09?auto=format&fit=crop&w=1000&q=80',
    telemetry: {
      sunlight: { current: 3200, optimalMin: 2500, optimalMax: 4500, unit: 'Lux', status: 'optimal' },
      moisture: { current: 52, optimalMin: 45, optimalMax: 65, unit: '%', status: 'optimal' },
      temperature: { current: 23.4, optimalMin: 20, optimalMax: 26, unit: '°C', status: 'optimal' }
    },
    treatmentProtocol: [
      {
        step: 1,
        title: 'Maintain Current Cultural Protocol',
        action: 'Specimen exhibits ideal metabolic balance. Continue bi-weekly orchid bark aeration and rainwater irrigation.',
        timeframe: 'Ongoing',
        completed: true
      },
      {
        step: 2,
        title: 'Preventative Abaxial Leaf Dusting',
        action: 'Gently clean lamina with distilled water and soft microfiber cloth to maximize photosynthetic photon capture.',
        timeframe: 'Every 14 days',
        completed: false
      }
    ],
    prevention: 'Maintain high chunky substrate (perlite, pumice, pine bark) to safeguard epiphyte root oxygenation.',
    scannedAt: '2026-11-06T16:30:00Z',
    notes: 'Greenhouse bench A-4. Prime cultivar specimen.'
  }
];

export const INITIAL_HERBARIUM: HerbariumPlant[] = [
  {
    id: 'plant-1',
    commonName: 'Monstera Deliciosa',
    latinTaxonomy: 'Monstera deliciosa Liebm.',
    family: 'Araceae',
    category: 'Aroids',
    location: 'Living Room East Bay',
    healthStatus: 'critical',
    vitalityScore: 68,
    lastWatered: '2026-11-05T09:00:00Z',
    waterIntervalDays: 7,
    imageUrl: 'https://images.unsplash.com/photo-1614594975525-e45190c55d0b?auto=format&fit=crop&w=800&q=80',
    lastDiagnosis: SAMPLE_DIAGNOSES[0],
    careLog: [
      { id: 'log-1', date: '2026-11-09', type: 'diagnose', note: 'Optical scan detected Septoria Leaf Spot. Quarantine initiated.' },
      { id: 'log-2', date: '2026-11-05', type: 'water', note: 'Thorough soak (500ml filtered water).' }
    ]
  },
  {
    id: 'plant-2',
    commonName: 'Calathea Orbifolia',
    latinTaxonomy: 'Goeppertia orbifolia (Linden) Borchs.',
    family: 'Marantaceae',
    category: 'Exotics',
    location: 'Study North Desk',
    healthStatus: 'critical',
    vitalityScore: 61,
    lastWatered: '2026-11-07T08:30:00Z',
    waterIntervalDays: 5,
    imageUrl: 'https://images.unsplash.com/photo-1598880940371-c756e015fea1?auto=format&fit=crop&w=800&q=80',
    lastDiagnosis: SAMPLE_DIAGNOSES[1],
    careLog: [
      { id: 'log-3', date: '2026-11-08', type: 'diagnose', note: 'Two-spotted spider mites identified on abaxial veins.' },
      { id: 'log-4', date: '2026-11-07', type: 'water', note: 'Rainwater flush + humidity tray refresh.' }
    ]
  },
  {
    id: 'plant-3',
    commonName: 'Fiddle Leaf Fig',
    latinTaxonomy: 'Ficus lyrata Warb.',
    family: 'Moraceae',
    category: 'Ficus',
    location: 'Studio Corner',
    healthStatus: 'medium',
    vitalityScore: 79,
    lastWatered: '2026-11-02T10:00:00Z',
    waterIntervalDays: 10,
    imageUrl: 'https://images.unsplash.com/photo-1545241047-6083a3684587?auto=format&fit=crop&w=800&q=80',
    lastDiagnosis: SAMPLE_DIAGNOSES[2],
    careLog: [
      { id: 'log-5', date: '2026-11-07', type: 'diagnose', note: 'Edema detected on terminal juvenile leaves.' }
    ]
  },
  {
    id: 'plant-4',
    commonName: 'Anthurium Clarinervium',
    latinTaxonomy: 'Anthurium clarinervium Matuda',
    family: 'Araceae',
    category: 'Aroids',
    location: 'Greenhouse Cabinet Top',
    healthStatus: 'low',
    vitalityScore: 98,
    lastWatered: '2026-11-06T15:00:00Z',
    waterIntervalDays: 6,
    imageUrl: 'https://images.unsplash.com/photo-1509423350716-97f9360b4e09?auto=format&fit=crop&w=800&q=80',
    lastDiagnosis: SAMPLE_DIAGNOSES[3],
    careLog: [
      { id: 'log-6', date: '2026-11-06', type: 'diagnose', note: 'Optimal botanical health confirmed. Zero pathogen traces.' }
    ]
  },
  {
    id: 'plant-5',
    commonName: 'Philodendron Pink Princess',
    latinTaxonomy: 'Philodendron erubescens "Pink Princess"',
    family: 'Araceae',
    category: 'Aroids',
    location: 'South Greenhouse Shelf',
    healthStatus: 'low',
    vitalityScore: 94,
    lastWatered: '2026-11-08T11:00:00Z',
    waterIntervalDays: 7,
    imageUrl: 'https://images.unsplash.com/photo-1622383563227-04401ab4e5ea?auto=format&fit=crop&w=800&q=80',
    careLog: [
      { id: 'log-7', date: '2026-11-08', type: 'water', note: 'Nutrient solution flush (EC 1.1 mS/cm).' }
    ]
  },
  {
    id: 'plant-6',
    commonName: 'Sansevieria Trifasciata',
    latinTaxonomy: 'Dracaena trifasciata (Prain) Mabb.',
    family: 'Asparagaceae',
    category: 'Succulents',
    location: 'Bedroom Hallway',
    healthStatus: 'low',
    vitalityScore: 97,
    lastWatered: '2026-10-24T12:00:00Z',
    waterIntervalDays: 21,
    imageUrl: 'https://images.unsplash.com/photo-1593482892290-f54927ae1bf6?auto=format&fit=crop&w=800&q=80',
    careLog: [
      { id: 'log-8', date: '2026-10-24', type: 'water', note: 'Minimal winter watering.' }
    ]
  }
];
