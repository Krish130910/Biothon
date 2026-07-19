# Model Cards Directory

This directory contains performance and governance cards for individual
clinical prediction engines and machine learning classifiers within the V2
platform.

## 1. Card Template Fields

Each model card must document:

- **Intended Use**: Target population, permitted scope, explicitly
  prohibited uses.
- **Underlying Formulation**: Model architecture or equation (e.g.
  Framingham, FINDRISC, Logistic Regression).
- **Evaluation Details**: Validation strategy, metrics, demographic bounds.
- **Lifecycle Status**: One of `RESEARCH_ONLY`, `VALIDATION_CANDIDATE`, or
  an approved production state.
- **Limitations**: Sample size, generalisability, missing features,
  multicollinearity effects.

---

## 2. Active Models

### Diabetes Screening — Logistic Regression (RESEARCH_ONLY)

| Field | Value |
|---|---|
| **Lifecycle** | `RESEARCH_ONLY` |
| **Model type** | `LogisticRegression(C=1.0, solver=lbfgs)` |
| **Training date** | 2026-07-19 |
| **Training dataset** | ICMR-INDIAB sample (490 rows after target-missing drop) |
| **Target variable** | `diabetes_composite` (v36) |
| **Validation strategy** | 5-fold stratified cross-validation |
| **ROC-AUC** | **0.7476 ± 0.0391** (mean ± std across folds) |
| **Brier score** | **0.1040 ± 0.0031** (mean ± std across folds) |
| **Artifact** | `health-intelligence/models/diabetes_model.joblib` |
| **Metadata** | `health-intelligence/models/diabetes_model_metadata.json` |

**Predictors used:**

| Feature | Coefficient | Direction |
|---|---|---|
| `age_years` | +0.0440 | ↑ older → higher risk |
| `bmi` | +0.0413 | ↑ higher BMI → higher risk |
| `waist_cm` | +0.0297 | ↑ larger waist → higher risk |
| `systolic_bp` | +0.0165 | ↑ higher systolic → higher risk |
| `diastolic_bp` | −0.0179 | Negative when conditioned on systolic (multicollinearity — see data card) |
| `sex` | −0.0434 | Female coded as 1; negative reflects cohort-specific prevalence |
| *(intercept)* | −8.5899 | — |

All numbers are read from `models/diabetes_model_metadata.json`; see
[`docs/data-cards/diabetes.md`](../data-cards/diabetes.md) for the full
dataset card including leakage policy, limitations, and retraining
instructions.

**Key limitations:**
- Not validated for clinical use.
- Small sample (490 rows) — AUC std ± 0.039 across folds.
- No external validation cohort.
- Regional Indian sample — national representativeness not established.
- `waist_cm` is not collected in the V2 assessment schema; it is imputed
  from the training cohort median (87.0 cm) at inference time.

---

### Cardiovascular Risk Engine (Framingham)

- **Type:** Rule-based (V1 scoring)
- **Formulation:** Framingham General Cardiovascular Risk Score
- **Lifecycle:** V1 production (not ML; governed by V1 freeze tests)

### Hypertension Estimator

- **Type:** Evidence-based rules (V1 scoring)
- **Lifecycle:** V1 production (not ML; governed by V1 freeze tests)

---

## 3. Governance Rules

- No synthetic data may be used to train user-facing models.
- Every model artifact must carry a `lifecycle_status` field in its
  metadata JSON. Artifacts without a recognised status are rejected at
  load time by `health-intelligence/app/main.py`.
- Accepted lifecycle states: `RESEARCH_ONLY`, `VALIDATION_CANDIDATE`.
- Raw datasets must remain outside Git (see `.gitignore` and
  `health-intelligence/README.md`).
- Missing or rejected models produce `status: model-unavailable` —
  the service never crashes or fabricates a score.
- Every training run must receive an explicit `--data-path` argument;
  no hardcoded paths are permitted in `train_icmr.py`.
