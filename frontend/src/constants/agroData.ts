import { Station } from '../types/dashboard';

export const STATIONS: Record<string, Station> = {
  Cuttack: { code: 'CUTTACK', name: 'ICAR-NRRI Cuttack (Odisha)', lat: 20.4625, lon: 85.8830, primary_crops: ['Rice'] },
  Maruteru: { code: 'MARUTERU', name: 'RARS Maruteru (Andhra Pradesh)', lat: 16.6310, lon: 81.7370, primary_crops: ['Rice'] },
  Lam: { code: 'LAM', name: 'RARS Lam, Guntur (Andhra Pradesh)', lat: 16.3500, lon: 80.4400, primary_crops: ['Cotton', 'Chilli'] },
  Nagpur: { code: 'NAGPUR', name: 'ICAR-CICR Nagpur (Maharashtra)', lat: 21.1458, lon: 79.0882, primary_crops: ['Cotton'] },
  Akola: { code: 'AKOLA', name: 'Dr. PDKV Akola (Maharashtra)', lat: 20.7002, lon: 77.0082, primary_crops: ['Cotton', 'Pulses'] },
  Ludhiana: { code: 'LUDHIANA', name: 'PAU Ludhiana (Punjab)', lat: 30.9010, lon: 75.8573, primary_crops: ['Rice', 'Wheat', 'Cotton'] },
  Raipur: { code: 'RAIPUR', name: 'IGKV Raipur (Chhattisgarh)', lat: 21.2514, lon: 81.6296, primary_crops: ['Rice'] },
  Rajendranagar: { code: 'RAJENDRANAGAR', name: 'ICAR-IIRR Hyderabad (Telangana)', lat: 17.3190, lon: 78.4060, primary_crops: ['Rice'] },
  Sirsa: { code: 'SIRSA', name: 'CICR RS Sirsa (Haryana)', lat: 29.5349, lon: 75.0289, primary_crops: ['Cotton'] },
  Parbhani: { code: 'PARBHANI', name: 'VNMKV Parbhani (Maharashtra)', lat: 19.2608, lon: 76.7749, primary_crops: ['Cotton', 'Sorghum'] },
  Palampur: { code: 'PALAMPUR', name: 'CSK HPKV Palampur (Himachal Pradesh)', lat: 32.1109, lon: 76.5363, primary_crops: ['Rice', 'Maize'] },
};

export const PESTS_BY_CROP: Record<string, string[]> = {
  Rice: [
    'Brown Planthopper',
    'Yellow Stem Borer',
    'Leaf Folder',
    'Gall Midge',
    'Green Leafhopper',
    'Gundhi Bug',
  ],
  Cotton: [
    'American Bollworm',
    'Pink Bollworm',
    'Spotted Bollworm',
    'Whitefly',
    'Cotton Aphid',
    'Thrips',
  ],
  Maize: [
    'Fall Armyworm',
    'Stem Borer',
    'Shoot Fly',
  ],
};

export const RISK_COLORS = {
  LOW: '#10b981',
  MODERATE: '#3b82f6',
  HIGH: '#f59e0b',
  CRITICAL: '#ef4444',
};

export const RISK_BADGES = {
  LOW: { label: 'LOW ACTIVITY', icon: '✅', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
  MODERATE: { label: 'MODERATE RISK', icon: 'ℹ️', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
  HIGH: { label: 'HIGH RISK', icon: '⚠️', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  CRITICAL: { label: 'OUTBREAK WARNING', icon: '🚨', color: 'bg-rose-500/10 text-rose-400 border-rose-500/30 animate-pulse' },
};
