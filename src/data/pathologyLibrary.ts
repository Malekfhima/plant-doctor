import { PathologyEntry } from '../types/botanical';

export const PATHOLOGY_DATABASE: PathologyEntry[] = [
  {
    id: 'path-septoria',
    name: 'Septoria Leaf Spot',
    latinName: 'Septoria sp. / S. cannabis',
    type: 'Fungal Pathogen',
    severity: 'critical',
    afflictedPlantFamilies: ['Araceae (Monstera, Philodendron)', 'Solanaceae', 'Cannabaceae'],
    visualIndicators: [
      'Circular necrotic spots with dark brown/black perimeter',
      'Distinct bright chlorotic (yellow) halos around lesions',
      'Tiny black fruiting bodies (pycnidia) in center of mature spots'
    ],
    causes: [
      'Prolonged leaf wetness exceeding 6 hours in poor air circulation',
      'Fungal spore splash from overhead watering',
      'Warm ambient temperatures between 20°C and 28°C'
    ],
    organicTreatment: [
      'Debride and dispose of severely infected leaves (sterilize pruners with 70% isopropyl)',
      'Apply liquid copper octanoate or Serenade biofungicide (Bacillus subtilis)',
      'Foliar spray of cold-pressed neem oil (0.5% concentration) as secondary protectant'
    ],
    preventativeMeasures: [
      'Bottom-water specimens or use sub-irrigation to eliminate foliar splash',
      'Increase laminar air circulation with low-velocity oscillating fans',
      'Space plants at least 30cm apart to lower microclimate relative humidity'
    ],
    afflictedImageUrl: 'https://images.unsplash.com/photo-1614594975525-e45190c55d0b?auto=format&fit=crop&w=800&q=80',
    healthyImageUrl: 'https://images.unsplash.com/photo-1617173944883-6ffbd35d584d?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'path-spider-mites',
    name: 'Two-Spotted Spider Mite',
    latinName: 'Tetranychus urticae Koch',
    type: 'Pest Infestation',
    severity: 'critical',
    afflictedPlantFamilies: ['Marantaceae (Calathea)', 'Araceae', 'Moraceae (Ficus)', 'Rosaceae'],
    visualIndicators: [
      'Dense fine pale speckling/stippling across upper leaf lamina',
      'Silky micro-webbing spanning leaf axils and petiole joints',
      'Brittle, dulled leaf texture accompanied by curling leaf edges'
    ],
    causes: [
      'Dry microclimates with relative humidity under 45%',
      'Elevated ambient temperatures accelerating reproductive cycles (reproduces in 5 days at 30°C)',
      'Inflow from new unquarantined nursery specimens'
    ],
    organicTreatment: [
      'Mechanical dislodgement with room-temperature shower spray to knock off 80%+ colonies',
      'Thorough drench of insecticidal soap (potassium laurate) on abaxial leaf surfaces',
      'Biological control: release Phytoseiulus persimilis or Neoseiulus californicus predatory mites'
    ],
    preventativeMeasures: [
      'Maintain ambient relative humidity above 55-65%',
      'Wipe down leaf undersides with damp microfiber cloth twice monthly',
      'Quarantine all newly introduced specimens for minimum 21 days'
    ],
    afflictedImageUrl: 'https://images.unsplash.com/photo-1598880940371-c756e015fea1?auto=format&fit=crop&w=800&q=80',
    healthyImageUrl: 'https://images.unsplash.com/photo-1509423350716-97f9360b4e09?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'path-bacterial-blight',
    name: 'Bacterial Leaf Blight',
    latinName: 'Xanthomonas campestris',
    type: 'Bacterial Infection',
    severity: 'critical',
    afflictedPlantFamilies: ['Araceae (Anthurium, Syngonium)', 'Begoniaceae', 'Gesneriaceae'],
    visualIndicators: [
      'Water-soaked, greasy-looking angular lesions bounded by leaf veins',
      'Rapid yellowing progressing from leaf margins inward with V-shaped necrotic wedges',
      'Bacterial ooze or sticky droplets emerging from hydathodes under high humidity'
    ],
    causes: [
      'Bacteria entering natural hydathodes or wounds caused by trimming',
      'Warm greenhouse conditions with persistent high relative humidity (>85%)',
      'Cross-contamination via shared pruning tools or overhead misting'
    ],
    organicTreatment: [
      'Isolate specimen immediately; bacterial blight spreads aggressively through water droplets',
      'Excise afflicted tissues 2-3cm beyond the diseased margin with flamed blades',
      'Apply copper hydroxide bactericide spray or Streptomyces lydicus bio-inoculant'
    ],
    preventativeMeasures: [
      'Avoid foliar misting completely; maintain airflow across leaf surfaces',
      'Sterilize shears in 10% bleach or 70% alcohol between every individual cut',
      'Reduce night-time humidity to prevent guttation droplet accumulation'
    ],
    afflictedImageUrl: 'https://images.unsplash.com/photo-1598880940371-c756e015fea1?auto=format&fit=crop&w=800&q=80',
    healthyImageUrl: 'https://images.unsplash.com/photo-1509423350716-97f9360b4e09?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'path-iron-chlorosis',
    name: 'Interveinal Iron Chlorosis',
    latinName: 'Physiological Fe-Deficiency / Alkaline Lockout',
    type: 'Nutritional Deficiency',
    severity: 'medium',
    afflictedPlantFamilies: ['Ericaceae', 'Rutaceae (Citrus)', 'Araceae', 'Gardenia'],
    visualIndicators: [
      'Pronounced yellowing of juvenile leaves while fine network of veins remains dark green',
      'In severe stages, leaves turn creamy-white with necrotic brown margins',
      'Older lower leaves often retain normal green coloration'
    ],
    causes: [
      'Root zone substrate pH higher than 6.8 locking out trivalent iron',
      'Cold, waterlogged soil retarding metabolic root uptake',
      'Excess phosphorus or calcium competing for root absorption sites'
    ],
    organicTreatment: [
      'Administer chelated iron (Fe-EDDHA for alkaline soil or Fe-DTPA for neutral substrates)',
      'Correct irrigation water pH to 5.8 - 6.2 with organic citric acid or vinegar dilution',
      'Apply seaweed kelp extract foliar spray for micronutrient co-factors'
    ],
    preventativeMeasures: [
      'Monitor potting mix pH twice annually with digital probe',
      'Ensure soil has good porosity (perlite, orchid bark, pumice) to prevent anaerobic compaction',
      'Avoid hard municipal tap water with high bicarbonate alkalinity'
    ],
    afflictedImageUrl: 'https://images.unsplash.com/photo-1545241047-6083a3684587?auto=format&fit=crop&w=800&q=80',
    healthyImageUrl: 'https://images.unsplash.com/photo-1597055181300-e3633a917c9c?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'path-powdery-mildew',
    name: 'Powdery Mildew',
    latinName: 'Podosphaera / Erysiphe sp.',
    type: 'Fungal Pathogen',
    severity: 'medium',
    afflictedPlantFamilies: ['Begoniaceae', 'Rosaceae', 'Cucurbitaceae', 'Crassulaceae'],
    visualIndicators: [
      'Talcum-powder-like white or gray fungal patches on upper leaf surfaces and stems',
      'Distorted new leaves that fail to unfurl symmetrically',
      'Premature senescence and leaf drop as fungal mycelium leaches carbohydrates'
    ],
    causes: [
      'High relative humidity at night coupled with dry, warm daytime conditions',
      'Stagnant microclimates in dense canopies without airflow',
      'Excessive nitrogen fertilization stimulating lush, susceptible growth'
    ],
    organicTreatment: [
      'Spray potassium bicarbonate solution (5g/liter water) with a drop of organic castile soap',
      'Diluted milk spray (1 part whole milk to 9 parts water; protein acts as natural solar fungicide)',
      'Prune interior canopy leaves to open air pathways'
    ],
    preventativeMeasures: [
      'Ensure continuous gentle ambient air movement around plant canopy',
      'Water base of plant in morning so substrate surface dries before sundown',
      'Avoid high-nitrogen fertilizers during low-light seasonal periods'
    ],
    afflictedImageUrl: 'https://images.unsplash.com/photo-1622383563227-04401ab4e5ea?auto=format&fit=crop&w=800&q=80',
    healthyImageUrl: 'https://images.unsplash.com/photo-1622383563227-04401ab4e5ea?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'path-root-rot',
    name: 'Pythium Root & Crown Rot',
    latinName: 'Pythium ultimum / Phytophthora cinnamomi',
    type: 'Fungal Pathogen',
    severity: 'critical',
    afflictedPlantFamilies: ['Araceae', 'Moraceae', 'Arecaceae (Palms)', 'Orchidaceae'],
    visualIndicators: [
      'Sudden generalized wilting despite wet, saturated substrate',
      'Black, mushy root radicles that slough off leaving thread-like vascular core',
      'Foul, sour anaerobic odor emanating from the drainage holes'
    ],
    causes: [
      'Chronic over-saturation filling soil micropores and asphyxiating root hairs',
      'Pots lacking drainage holes or standing in decorative outer caches full of runoff',
      'Dense, un-aerated peat-heavy substrate with decayed organic structure'
    ],
    organicTreatment: [
      'Unpot plant immediately; wash root system gently under running water',
      'Excise all decayed, discolored root matter back to firm white tissue with sterile tools',
      'Submerge remaining root ball in 3% hydrogen peroxide solution (1:4 with water) for 15 minutes',
      'Repot into fresh, coarse aroid mix (orchid bark, perlite, pumice, horticultural charcoal)'
    ],
    preventativeMeasures: [
      'Strictly inspect soil moisture before watering using deep wooden skewer or digital probe',
      'Always empty cache pot saucers within 20 minutes of watering',
      'Use porous unglazed terracotta planters for species sensitive to wet feet'
    ],
    afflictedImageUrl: 'https://images.unsplash.com/photo-1545241047-6083a3684587?auto=format&fit=crop&w=800&q=80',
    healthyImageUrl: 'https://images.unsplash.com/photo-1617173944883-6ffbd35d584d?auto=format&fit=crop&w=800&q=80'
  }
];
