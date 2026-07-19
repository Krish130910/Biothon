# Dataset Card: Diabetes Risk Screening (V2 Research)

> **Lifecycle status:** `RESEARCH_ONLY` — not validated for clinical use.

## 1. Current State

| Item | Status |
|---|---|
| Synthetic prototype dataset (`diabetes_data.csv`) | Permanently removed |
| Synthetic model artifact | Permanently removed |
| Authentic ICMR-INDIAB sample | Loaded externally; not tracked in Git |
| Trained model artifact (`models/diabetes_model.joblib`) | **Installed** — `RESEARCH_ONLY` |
| Live endpoint status | **Returns `status: complete` with `screeningProbability`** |

A Logistic Regression screening model has been trained on 490 rows from the
authentic ICMR-INDIAB sample. 10 rows with a missing composite diabetes
outcome were dropped prior to training; no target values were imputed.

## 2. Intended Use and Task

- **Intended Task:** Research-only pre-laboratory screening prioritisation —
  identifying individuals who may benefit from a recommended laboratory HbA1c
  confirmation test.
- **Not a diagnosis tool.** This model does not diagnose diabetes and must not
  be used as a substitute for clinical assessment or laboratory testing.
- **Prohibited Use:** Real-world clinical diagnosis, prescription, clinical
  decision support, or any user-facing risk communication without licensed
  physician oversight and a formal validation study.

## 3. Dataset Characteristics

| Property | Value |
|---|---|
| Source | ICMR-INDIAB (Indian Council of Medical Research – India Diabetes Study) |
| Raw rows available | 500 |
| Rows used for training | **490** (10 dropped: missing `diabetes_composite` target) |
| Target variable | `diabetes_composite` (Stata variable `v36`) |
| Format | Stata `.dta` file, supplied externally, not committed to Git |
| Geography | Regional Indian cohort — **not nationally representative** |
| External validation cohort | **None available** |

### Predictor Variables Used

| Variable | Stata code | Coefficient | Training median |
|---|---|---|---|
| `age_years` | v4 | +0.0440 | 45.0 |
| `bmi` | v8 | +0.0413 | 23.47 |
| `waist_cm` | v9 | +0.0297 | 87.0 |
| `systolic_bp` | v10 | +0.0165 | 129.0 |
| `diastolic_bp` | v11 | −0.0179 | 83.0 |
| `sex` | v5 | −0.0434 | 0.0 (male) |
| *(intercept)* | — | −8.5899 | — |

All coefficient values are read directly from
`models/diabetes_model_metadata.json` and not hardcoded in documentation.

### Leakage Policy

All predictor variables were validated against the leakage policy in
`training/audit_icmr_sample.py` before training. The following categories
are **categorically forbidden** as predictors:

- Any glucose / HbA1c / OGTT / fasting blood sugar measurement
- Any composite outcome or correlated outcome column (`prediabetes`,
  `hypertension`, `dyslipidaemia`, etc.)

## 4. Model Evaluation

Evaluation was performed using **5-fold stratified cross-validation** (no
single train/test split). All metrics are averages across the 5 held-out
folds.

| Metric | Mean | ± Std (across 5 folds) |
|---|---|---|
| ROC-AUC | **0.7476** | ± 0.0391 |
| Brier score | **0.1040** | ± 0.0031 |

Source: `models/diabetes_model_metadata.json`
(`cross_validation.roc_auc_mean`, `roc_auc_std`, `brier_score_mean`,
`brier_score_std`).

## 5. Coefficient Directionality

The learned coefficients show clinically plausible directionality for a
research-stage screening model:

- **Age, BMI, waist circumference** — all positive, consistent with
  well-established risk factors for type-2 diabetes in Indian population
  studies.
- **Blood pressure coefficients** — `systolic_bp` is positive (+0.0165)
  while `diastolic_bp` is slightly negative (−0.0179) when both are
  included simultaneously. This is an expected multicollinearity effect:
  systolic and diastolic BP are correlated (~0.6–0.8 in typical cohorts),
  so the model partitions the shared variance between them. The combined
  direction of both terms is consistent with hypertension being a diabetes
  risk marker; the individual signs should not be interpreted in isolation.
- **Sex** — negative coefficient (−0.0434, coded male=0 / female=1)
  reflects the sex-stratified prevalence pattern in this specific cohort.
  This should not be interpreted as a general clinical claim.

> **Important:** Coefficient magnitudes depend on predictor scale and are
> not directly comparable across features without standardisation. Do not
> use individual coefficients as standalone clinical evidence.

## 6. Limitations

- **RESEARCH_ONLY:** Not validated for clinical use.
- **Small sample:** 490 rows — estimates have meaningful variance (AUC
  std ± 0.039 across folds).
- **No external validation:** Performance on independent cohorts is unknown.
- **Regional sample:** Nationally representative performance cannot be
  claimed.
- **Missing features at inference time:** `waist_cm` is not collected in
  the V2 assessment schema and is imputed from the training median (87.0 cm)
  at inference time. This may reduce accuracy for individuals whose waist
  circumference differs substantially from the cohort median.
- **No clinical outcome validation:** This model has not been evaluated
  against prospective clinical outcomes.

## 7. How to Retrain

Once a researcher supplies an updated dataset file:

```bash
.\.venv\Scripts\python.exe health-intelligence\training\train_icmr.py \
    --data-path "C:\path\to\private\icmr_indiab_sample.dta"
```

The script validates the leakage policy, runs 5-fold CV, fits a final
model, and saves both `models/diabetes_model.joblib` and
`models/diabetes_model_metadata.json`. The FastAPI service loads the
new artifact automatically on next startup.
