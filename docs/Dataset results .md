# 🌾 Dataset Profile & Empirical Statistical Results
**Intelligent Pest Outbreak Prediction & Early Warning Framework**  
*Source Authority: ICAR (Indian Council of Agricultural Research) & TNAU (Tamil Nadu Agricultural University)*

---

## 1. Dataset Overview & Scope

The core dataset contains historical agro-climatic and insect surveillance observations collected across India’s primary agricultural research stations between **1959 and 2011**.

| Characteristic | Specification / Quantitative Metric |
|---|---|
| **Total Surveillance Records** | **35,499** weekly field observations |
| **Temporal Coverage** | **1959 – 2011** (52 continuous agricultural seasons) |
| **Monitored Crops** | **Rice (Paddy)** ($N = 19,404$ / $54.7\%$) & **Cotton** ($N = 16,095$ / $45.3\%$) |
| **Geographic Coverage** | **12 ICAR & State Agricultural University Research Stations** across 6 Agro-Ecological Zones |
| **Engineered Feature Space** | **97 Features** (35 Numerical Micro-Climatic, 5 Categorical, 57 Temporal & Lagged) |
| **Target Label** | Binary Outbreak Indicator at week $t+1$ (`outbreak_next_week`: $0$ = Normal, $1$ = Outbreak) |
| **Surveillance Class Balance** | **53.7% No Outbreak** ($N = 19,065$) vs **46.3% Outbreak** ($N = 16,434$) |

---

## 2. Temporal Partitioning (Zero-Leakage Holdout)

To reflect real-world operational forecasting where future climate and insect generations are strictly unknown, temporal holdout splitting was enforced instead of randomized K-fold splitting:

```
Total Surveillance Data: 35,499 Observations
├── Training & Tuning Partition (1959 – 2006): 27,439 Records (77.3%)
│    └── Outbreak Prevalence: 44.9%
└── Strict Temporal Holdout Test (2007 – 2011): 8,060 Records (22.7%)
     └── Outbreak Prevalence: 50.9% (Evaluates true model generalization)
```

---

## 3. Micro-Meteorological & Physiological Variables

Summary statistics across the 35,499 surveillance records:

| Micro-Climatic Variable | Unit | Mean | Std Dev | Min | Median (p50) | Max | Agronomic Significance |
|---|---|---|---|---|---|---|---|
| **Maximum Temperature ($T_{\max}$)** | °C | 32.24 | 4.96 | 10.90 | 31.70 | 46.60 | High daytime thermal boundary |
| **Minimum Temperature ($T_{\min}$)** | °C | 20.47 | 5.60 | 0.80 | 22.10 | 32.20 | Nighttime developmental cooling |
| **Morning Relative Humidity ($\text{RH}_{\text{morning}}$)** | % | 78.72 | 15.53 | 9.30 | 84.40 | 100.00 | Egg hatching & sporulation trigger |
| **Evening Relative Humidity ($\text{RH}_{\text{evening}}$)** | % | 54.30 | 18.20 | 5.00 | 55.00 | 100.00 | Diurnal humidity desiccation gradient |
| **Weekly Precipitation ($\text{Rainfall}$)** | mm | 18.60 | 34.50 | 0.00 | 0.00 | 480.00 | Monsoon flood / canopy dampening |
| **Wind Velocity** | km/h | 4.60 | 2.80 | 0.20 | 4.10 | 28.50 | Adult insect dispersion vector |
| **Accumulated Degree-Days (GDD)** | °C-day | 15.02 | 5.17 | 0.00 | 15.55 | 30.55 | Physiological heat above $T_{\text{base}}$ |
| **Vapor Pressure Deficit (VPD)** | kPa | 1.29 | 0.83 | 0.10 | 1.03 | 5.43 | Transpirational drying pressure |
| **Field Pest Count / Hill / Trap** | count | 420.61 | 2944.24 | 0.00 | 1.77 | 98,605.00 | Field population density metric |

---

## 4. Insect Pest Species Distribution

Top 10 economic insect pests and pathogens documented in the ICAR surveillance registry:

| Rank | Target Pest Species | Common Name | Host Crop | Recorded Observations | Outbreak Frequency |
|---|---|---|---|---|---|
| 1 | *Helicoverpa armigera* | American Bollworm | Cotton | 4,394 | 48.2% |
| 2 | *Scirpophaga incertulas* | Yellow Stem Borer | Rice | 4,333 | 47.6% |
| 3 | *Orseolia oryzae* | Gall Midge | Rice | 3,016 | 41.3% |
| 4 | *Nephotettix virescens* | Green Leafhopper | Rice | 2,287 | 39.8% |
| 5 | *Pectinophora gossypiella* | Pink Bollworm | Cotton | 2,236 | 51.4% |
| 6 | *Magnaporthe oryzae* | Leaf Blast | Rice | 2,090 | 43.1% |
| 7 | *Amrasca biguttula* | Cotton Jassid | Cotton | 1,974 | 45.0% |
| 8 | *Nilaparvata lugens* | Brown Planthopper | Rice | 1,958 | 53.2% |
| 9 | *Cnaphalocrocis medinalis* | Rice Leaf Folder | Rice | 1,716 | 44.5% |
| 10 | *Bemisia tabaci* | Whitefly | Cotton | 1,508 | 54.8% |

---

## 5. Station-Wise Surveillance Ingestion

Surveillance observations geographically mapped across 12 monitoring stations:

| Research Center / Station Code | State / Agro-Climatic Region | Dominant Crop | Total Records | Station Contribution |
|---|---|---|---|---|
| **RARS Maruteru** | Andhra Pradesh (Godavari Delta) | Rice | 7,053 | 19.87% |
| **RARS Lam (Guntur)** | Andhra Pradesh (Krishna Zone) | Cotton | 5,902 | 16.63% |
| **ICAR-IIRR Rajendranagar** | Telangana (Deccan Plateau) | Rice | 5,539 | 15.60% |
| **ICAR-CICR Nagpur** | Maharashtra (Central Vidarbha) | Cotton | 3,328 | 9.37% |
| **VNMKV Parbhani** | Maharashtra (Marathwada) | Cotton | 2,748 | 7.74% |
| **IGKV Raipur** | Chhattisgarh (Eastern Plateau) | Rice | 2,132 | 6.01% |
| **Dr. PDKV Akola** | Maharashtra (Western Vidarbha) | Cotton | 2,028 | 5.71% |
| **PAU Ludhiana** | Punjab (Trans-Gangetic Plain) | Rice / Cotton | 1,976 | 5.57% |
| **CICR RS Sirsa** | Haryana (Semi-Arid North) | Cotton | 1,881 | 5.30% |
| **ICAR-NRRI Cuttack** | Odisha (Coastal Eastern Plain) | Rice | 1,456 | 4.10% |
| **CSK HPKV Palampur** | Himachal Pradesh (Western Himalayas) | Rice | 1,248 | 3.52% |
| **TNAU Coimbatore** | Tamil Nadu (Western Agro Zone) | Rice / Cotton | 208 | 0.59% |

---

## 6. Key Empirical Findings

1. **Monsoon Surge Window (SMW 32–42):** 68% of critical Rice Brown Planthopper and Yellow Stem Borer outbreaks concentrate between August and October, coinciding with morning relative humidity exceeding 85% and diurnal temperature swings under 7°C.
2. **Thermal Base Threshold Verification:** Empirical GDD accumulation above species $T_{\text{base}}$ demonstrated strong predictive power ($r = 0.44$ correlation with one-week-ahead pest velocity).
3. **Atmospheric Moisture Stagnation (Low VPD):** Extended periods where $\text{VPD} < 0.8\text{ kPa}$ coupled with rainfall lags $\ge 20\text{ mm}$ were followed by rapid hopperburn and whitefly escalations within 7 to 10 days.
