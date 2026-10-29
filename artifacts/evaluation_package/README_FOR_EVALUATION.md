# 📊 Project Evaluation Visual Artifacts Package
## Intelligent Pest Outbreak Prediction & Early Warning Framework (ICAR & TNAU)

This directory contains the **official high-resolution (300 DPI) evaluation plots, performance benchmarks, and architectural schematics** prepared for project evaluation, academic defense, and Google Drive submission.

---

### 📂 Evaluation Image Artifacts Inventory

| File Name | Evaluation Category | Key Insight / Result Shown |
|---|---|---|
| **`01_confusion_matrix_champion.png`** | Model Accuracy & Confusion Matrix | **Random Forest Champion** performance on 8,060 temporal holdout samples (2007–2011). **3,737 True Positives**, **3,554 True Negatives**. Accuracy: **90.46%**, Precision: **90.33%**, Sensitivity/Recall: **91.01%**, Specificity: **89.88%**, F1-Score: **90.67%**. |
| **`02_roc_curves_comparison.png`** | Multi-Model ROC Benchmark | Comparative ROC curves across all 7 candidate models. Random Forest (**AUC = 0.9560**), LightGBM (**0.9580**), XGBoost (**0.9583**), Quad-Ensemble (**0.9581**), Decision Tree (**0.9466**), ExtraTrees (**0.9475**), Logistic Regression (**0.9321**). |
| **`03_precision_recall_curves_benchmark.png`** | Precision-Recall (Class Imbalance) | Essential for epidemiological outbreak surveillance. Random Forest achieves **PR-AUC = 0.9530**, retaining high precision (>90%) across critical high-recall early-warning regimes. |
| **`04_model_benchmark_comparison_barchart.png`** | Overall Comparative Benchmark | Side-by-side grouped bar chart evaluating 7 algorithms across 5 core metrics (**Accuracy, Precision, Recall, F1-Score, ROC-AUC**). Proves why Random Forest was selected as production champion. |
| **`05_false_negative_rate_risk_analysis.png`** | Agronomic Safety & Missed Outbreaks | Demonstrates that Random Forest achieves the **lowest False Negative Rate (FNR = 8.99%)**, preventing catastrophic undetected infestations (compared to 12.27% for ExtraTrees). |
| **`06_shap_summary_plot.png`** | Explainable AI (XAI) | TreeSHAP global attribution plot showing non-linear micro-climatic and physiological drivers of outbreak probability. |
| **`07_top20_feature_importance_ranking.png`** | Feature Importance & Selection | Ranked horizontal bar chart of the Top 20 predictors (out of 97 engineered features) with agronomic categorization badges (Thermodynamic GDD/VPD, Surveillance Dynamics, Micro-climate, Seasonality). |
| **`08_bioclimatic_correlation_heatmap.png`** | Micro-Climatic Thermodynamics | Pearson correlation matrix across 13 core environmental and phenological variables on 35,499 records. Highlights strong positive association between high humidity persistence, GDD, and pest pressure. |
| **`09_seasonal_pest_risk_trajectory.png`** | Pest Phenology & Seasonality | Multi-pest trajectory across Standard Meteorological Weeks (SMW 1–52) showing distinct Kharif monsoon surges (SMW 34–42) for Brown Planthopper, Bollworm, and Whitefly. |
| **`10_national_surveillance_network_map.png`** | Geographic Surveillance Network | Map of the 11 ICAR/TNAU research stations (Cuttack, Maruteru, Lam, Nagpur, Akola, Ludhiana, Raipur, Rajendranagar, Sirsa, Parbhani, Palampur) across diverse agro-ecological zones with monitored crops and current risk tiers. |
| **`11_system_architecture_pipeline.png`** | System Architecture & Flow | End-to-end 5-stage architectural flow: Data Ingestion → Bio-Climatic Feature Engineering → ML Engine → FastAPI REST Core → React Dashboard & SMS/WhatsApp Advisory Dispatch. |
| **`12_temporal_holdout_split_and_dataset_profile.png`** | Experimental Rigor & Dataset Profile | Breakdown of the 35,499 surveillance records, showing strict temporal holdout split (Train ≤ 2006: 27,439 records / 77.3%; Test 2007–2011: 8,060 records / 22.7%), crop distribution, and target class balance. |

---

### 💡 Quick Summary for Viva / Project Presentation

- **Total Historical Records:** 35,499 surveillance observations (ICAR & TNAU).
- **Validation Protocol:** Strict **Temporal Holdout Split** (Train on data up to 2006, test strictly on unseen future seasons 2007–2011) to eliminate data leakage.
- **Champion Model:** **Random Forest Classifier** with **90.67% F1-score**, **95.60% ROC-AUC**, and lowest Missed Outbreak Rate (**8.99%**).
- **Bio-Climatic Features:** Growing Degree-Days (GDD), Vapor Pressure Deficit (VPD), Diurnal Temperature Range, and 1–2 week lagged pest velocity.
- **Explainability:** TreeSHAP (`shap.TreeExplainer`) provides full interpretability for agricultural extension officers and agronomists.

