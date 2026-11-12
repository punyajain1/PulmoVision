Train each model where its data already lives or where it runs fastest. The survey model trains on your Mac. The X-ray, CT and BERT models train on Kaggle Notebooks, which is free. The report LLM step uses the free Gemini API.

| Order | Model | Where | GPU? | Rough GPU time |
|---|---|---|---|---|
| 1 | Survey | Your Mac | No | 0 |
| 2 | Chest X-ray | Kaggle Notebook | Yes (T4/P100) | 8–12 h total |
| 3 | Report extraction | Mac (rules, annotation) + Gemini free API + Kaggle (BERT) | BERT only | about 1 h |
| 4 | CT nodule | Kaggle CPU session (preprocessing) + Kaggle GPU (training) | Training only | 3–5 h |

Altogether that's about 15–20 GPU hours. Kaggle gives about 30 GPU hours a week, so this fits in one or two weeks of quota.

I wrote this from memory without looking anything up. Before you rely on them, check the dataset slugs, free-tier limits and library function signatures. Run every step on a small subset first.

---

## One-time setup

**Kaggle**
1. Create an account at kaggle.com. **Verify your phone number** (Settings → Phone verification). Without it you get no GPU and no internet in notebooks.
2. Create an API token: Settings → API → Create New Token. Move the downloaded `kaggle.json` into place:
   ```bash
   pip install kaggle
   mkdir -p ~/.kaggle && mv ~/Downloads/kaggle.json ~/.kaggle/ && chmod 600 ~/.kaggle/kaggle.json
   ```
3. How Kaggle notebooks work:
   - Sessions last at most 12 hours.
   - Anything written to `/kaggle/working` (up to 20 GB) is kept when you click **Save Version**.
   - **"Save & Run All (Commit)"** runs the whole notebook in the background, so you can close the browser.
   - **CPU-only sessions don't use GPU quota.** Do all preprocessing on CPU.
   - One notebook's output can be another's input: Add Input → Notebook Output.

**Colab (backup)**
- Use it when Kaggle's quota runs out.
- Always mount Google Drive and save checkpoints there, because Colab deletes the runtime's files when it disconnects.

---

## Model 1: Survey model (your Mac)

**Why the Mac:** 276 rows of tabular data. Even full nested cross-validation takes minutes on a CPU.

**Step 1: Get the data**
```bash
cd ml-service
kaggle datasets download -d mysarahmadbhat/lung-cancer -p data --unzip
mv "data/survey lung cancer.csv" data/lung_cancer.csv
```

**Step 2: Environment**
```bash
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
pip install shap imbalanced-learn xgboost
```

**Step 3: Fix the dtype bug before training.** In `app/utils/data_utils.py`, change both `.astype(int)` calls on binary columns to `.astype("int64")`. In `scripts/train.py`, pass `scoring="balanced_accuracy"` to `forward_feature_selection`. Without these two changes, training on a different OS gives a different feature space, and selection collapses to `GENDER_F` again.

**Step 4: Retrain the deployed model**
```bash
python scripts/train.py
```
This writes `artifacts/bagging_model.joblib` and `preprocessing.joblib`. Check `artifacts/model_metadata.json`. ROC-AUC should now be well above 0.5, and more than one feature should be selected.

**Step 5: Nested cross-validation for the paper.** Save this as `ml-service/training/survey/nested_cv.py`:
```python
import numpy as np
from sklearn.model_selection import RepeatedStratifiedKFold, StratifiedKFold, GridSearchCV, cross_validate
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.feature_selection import SequentialFeatureSelector
from sklearn.ensemble import BaggingClassifier
from sklearn.tree import DecisionTreeClassifier
from app.utils.data_utils import load_raw_dataset, clean_dataset

df = clean_dataset(load_raw_dataset("data/lung_cancer.csv"), "LUNG_CANCER")
X, y = df.drop(columns="LUNG_CANCER"), df["LUNG_CANCER"].values
binary = [c for c in X.columns if c not in ("GENDER", "AGE")]

pre = ColumnTransformer([
    ("age", StandardScaler(), ["AGE"]),
    ("bin", "passthrough", binary),
    ("sex", OneHotEncoder(drop="if_binary"), ["GENDER"]),
])
pipe = Pipeline([
    ("pre", pre),
    ("sfs", SequentialFeatureSelector(
        DecisionTreeClassifier(max_depth=4, class_weight="balanced", random_state=42),
        direction="forward", n_features_to_select="auto", tol=0.001,
        scoring="balanced_accuracy", cv=5)),
    ("clf", BaggingClassifier(DecisionTreeClassifier(class_weight="balanced"),
                              n_estimators=100, random_state=42)),
])
search = GridSearchCV(
    pipe,
    {"clf__max_samples": [0.5, 1.0], "clf__estimator__max_depth": [3, 5, None]},
    cv=StratifiedKFold(5, shuffle=True, random_state=1), scoring="roc_auc")

outer = RepeatedStratifiedKFold(n_splits=5, n_repeats=10, random_state=42)
res = cross_validate(search, X, y, cv=outer, n_jobs=-1,
                     scoring=["roc_auc", "average_precision", "balanced_accuracy",
                              "recall", "neg_brier_score"])
for k, v in res.items():
    if k.startswith("test_"):
        print(f"{k[5:]:20s} {np.mean(v):.3f} ± {np.std(v):.3f}")
```
Run it with `PYTHONPATH=. python training/survey/nested_cv.py` from inside `ml-service/`. Expect a few minutes. Then repeat it with the other selectors and classifiers from the plan (experiments S1–S7), and add SHAP on the final model.

**Bring back:** `artifacts/*.joblib`, `artifacts/*.json` and the `results/` files.

---

## Model 2: Chest X-ray model (Kaggle)

**Why Kaggle:** NIH ChestX-ray14 (about 45 GB) is already hosted there, so you don't download anything.

### Notebook A: Pre-resize images (CPU session, no GPU quota)
Reading 112k full-size PNGs every epoch is the bottleneck on Kaggle's 4 CPUs. Resize them once into a single array file.

1. New Notebook → Add Input → search **"NIH Chest X-rays"** (`nih-chest-xrays/data`). Accelerator: **None**.
2. Code:
```python
import pandas as pd, numpy as np, glob, os
from PIL import Image
from concurrent.futures import ProcessPoolExecutor

ROOT = "/kaggle/input/data"
df = pd.read_csv(f"{ROOT}/Data_Entry_2017.csv")
paths = {os.path.basename(p): p for p in glob.glob(f"{ROOT}/images_*/images/*.png")}
df["path"] = df["Image Index"].map(paths)
assert df["path"].notna().all()

S = 256
arr = np.lib.format.open_memmap("/kaggle/working/cxr256.npy", mode="w+",
                                dtype=np.uint8, shape=(len(df), S, S))
def load(p): return np.asarray(Image.open(p).convert("L").resize((S, S), Image.BILINEAR))
with ProcessPoolExecutor(4) as ex:
    for i, img in enumerate(ex.map(load, df["path"], chunksize=256)):
        arr[i] = img
arr.flush()
df.drop(columns="path").to_csv("/kaggle/working/meta.csv", index=False)
```
3. **Save Version → Save & Run All.** It takes about 30–60 minutes and produces a 7.3 GB `cxr256.npy`.

### Notebook B: Train (GPU)
1. New Notebook → Add Input → **Notebook Output** of Notebook A, plus the original NIH dataset (for the split lists). Accelerator: **GPU T4** or **P100**.
2. Labels and patient-level split:
```python
import numpy as np, pandas as pd, torch, torch.nn as nn, torch.nn.functional as F
from sklearn.metrics import roc_auc_score

meta = pd.read_csv("/kaggle/input/<notebook-A>/meta.csv")
imgs = np.load("/kaggle/input/<notebook-A>/cxr256.npy", mmap_mode="r")
LABELS = ["Atelectasis","Cardiomegaly","Effusion","Infiltration","Mass","Nodule","Pneumonia",
          "Pneumothorax","Consolidation","Edema","Emphysema","Fibrosis","Pleural_Thickening","Hernia"]
Y = np.stack([meta["Finding Labels"].str.contains(l).values for l in LABELS], 1).astype("float32")

test_names = set(open("/kaggle/input/data/test_list.txt").read().split())
is_test = meta["Image Index"].isin(test_names).values
trval_patients = meta.loc[~is_test, "Patient ID"].unique()
rng = np.random.default_rng(42)
val_patients = set(rng.choice(trval_patients, size=len(trval_patients) // 10, replace=False))
is_val = (~is_test) & meta["Patient ID"].isin(val_patients).values
is_train = (~is_test) & (~is_val)

# no patient in two splits
sets = [set(meta.loc[m, "Patient ID"]) for m in (is_train, is_val, is_test)]
assert not (sets[0] & sets[1]) and not (sets[0] & sets[2]) and not (sets[1] & sets[2])
```
3. Dataset, model and training loop:
```python
import torchvision, torchvision.transforms.v2 as T
MEAN, STD = torch.tensor([0.485,0.456,0.406]).view(3,1,1), torch.tensor([0.229,0.224,0.225]).view(3,1,1)

class CXR(torch.utils.data.Dataset):
    def __init__(s, idx, train):
        s.idx = np.where(idx)[0]
        s.tf = T.Compose([T.RandomResizedCrop(224, scale=(0.8, 1.0), ratio=(0.95, 1.05)),
                          T.RandomAffine(degrees=10, translate=(0.05, 0.05)),
                          T.ColorJitter(0.2, 0.2)]) if train else T.CenterCrop(224)
    def __len__(s): return len(s.idx)
    def __getitem__(s, i):
        j = s.idx[i]
        x = torch.from_numpy(np.array(imgs[j])).unsqueeze(0).float().div(255).repeat(3, 1, 1)
        return (s.tf(x) - MEAN) / STD, torch.from_numpy(Y[j])

dl = lambda m, tr: torch.utils.data.DataLoader(CXR(m, tr), batch_size=64, shuffle=tr,
                                               num_workers=4, pin_memory=True)
train_dl, val_dl, test_dl = dl(is_train, True), dl(is_val, False), dl(is_test, False)

model = torchvision.models.densenet121(weights="DEFAULT")
model.classifier = nn.Linear(1024, len(LABELS))
model = model.cuda()
pos = Y[is_train].mean(0)
loss_fn = nn.BCEWithLogitsLoss(pos_weight=torch.tensor((1 - pos) / pos).cuda())
opt = torch.optim.AdamW(model.parameters(), lr=1e-4, weight_decay=1e-5)
scaler = torch.cuda.amp.GradScaler()

def evaluate(loader):
    model.eval(); P, T_ = [], []
    with torch.no_grad(), torch.autocast("cuda"):
        for x, y in loader:
            P.append(torch.sigmoid(model(x.cuda())).float().cpu()); T_.append(y)
    P, T_ = torch.cat(P).numpy(), torch.cat(T_).numpy()
    return {l: roc_auc_score(T_[:, k], P[:, k]) for k, l in enumerate(LABELS)}, P, T_

best = 0
for epoch in range(15):
    model.train()
    for x, y in train_dl:
        opt.zero_grad()
        with torch.autocast("cuda"):
            loss = loss_fn(model(x.cuda()), y.cuda())
        scaler.scale(loss).backward(); scaler.step(opt); scaler.update()
    aucs, _, _ = evaluate(val_dl)
    mean_auc = np.mean(list(aucs.values()))
    print(epoch, round(mean_auc, 4), "Nodule", round(aucs["Nodule"], 4), "Mass", round(aucs["Mass"], 4))
    if mean_auc > best:
        best = mean_auc; torch.save(model.state_dict(), "/kaggle/working/best.pt")
```
Expect roughly 10–20 minutes per epoch on a T4. Commit the notebook so it runs in the background, and save the checkpoint every epoch as shown.

4. **Test-set AUC with 95% CI** (bootstrap resampling by patient):
```python
model.load_state_dict(torch.load("/kaggle/working/best.pt"))
_, P, Tt = evaluate(test_dl)
pid = meta.loc[is_test, "Patient ID"].values
upids = np.unique(pid); groups = {p: np.where(pid == p)[0] for p in upids}
for name in ["Nodule", "Mass"]:
    k = LABELS.index(name); boots = []
    for _ in range(1000):
        idx = np.concatenate([groups[p] for p in rng.choice(upids, len(upids))])
        if Tt[idx, k].min() != Tt[idx, k].max():
            boots.append(roc_auc_score(Tt[idx, k], P[idx, k]))
    print(name, round(roc_auc_score(Tt[:, k], P[:, k]), 4), np.percentile(boots, [2.5, 97.5]).round(4))
```

5. **Export to ONNX with heatmap support.** DenseNet ends with global average pooling followed by one linear layer. For that architecture, Grad-CAM equals CAM: a weighted sum of the last feature maps using the classifier weights. So export the feature maps alongside the logits, and the server can draw heatmaps without PyTorch:
```python
class Export(nn.Module):
    def __init__(s, m): super().__init__(); s.m = m
    def forward(s, x):
        f = F.relu(s.m.features(x))
        return s.m.classifier(F.adaptive_avg_pool2d(f, 1).flatten(1)), f

model.eval().cpu()
torch.onnx.export(Export(model), torch.randn(1, 3, 224, 224), "/kaggle/working/cxr_densenet121.onnx",
                  input_names=["image"], output_names=["logits", "features"],
                  dynamic_axes={"image": {0: "batch"}}, opset_version=17)
np.save("/kaggle/working/classifier_weights.npy", model.classifier.weight.detach().numpy())
```
On the server: `cam = relu(sum_k W[class, k] * features[k])`, upsampled to the image size.

6. **External test on JSRT.**
   - Download JSRT from the JSRT website (free registration) and check its terms of use.
   - Convert the images to PNG and upload them as a **private** Kaggle dataset.
   - Run the Nodule output on the 154 nodule and 93 non-nodule images, and report AUC with CI.

**Bring back:** `cxr_densenet121.onnx`, `classifier_weights.npy`, a metadata JSON (AUCs, CIs, thresholds chosen on the validation set, seed, library versions). These go in `ml-service/artifacts/xray/v1.0.0/`. Pull the files to your Mac with:
```bash
kaggle kernels output <your-username>/<notebook-b> -p ml-service/artifacts/xray/v1.0.0
```

---

## Model 4: Report extraction (Mac + Gemini + Kaggle)

This comes before CT because it needs very little compute.

**Step 1: Data (Mac)**
```bash
kaggle datasets download -d raddar/chest-xrays-indiana-university -p ml-service/data/iu --unzip
```
Use `indiana_reports.csv`. It has `findings`, `impression` and `MeSH` columns. Keep only reports with text in findings or impression.

**Step 2: Gold annotation, 300 reports (Mac, free)**
- `pip install label-studio && label-studio start`. Or use a Google Sheet with one column per schema field (from the upgrade plan).
- Pick 300 reports at random with a fixed seed: **200 as test, never used for training or prompts**, and 100 as dev and few-shot examples.
- Have two people annotate the same reports, and compute Cohen's kappa per field with `sklearn.metrics.cohen_kappa_score`.

**Step 3: Rules baseline (Mac, seconds)**
- Write regex patterns for each finding, negation cues ("no", "without", "negative for", "free of") and uncertainty cues ("possible", "cannot exclude", "may represent").
- Use a size regex `(\d+(\.\d+)?)\s?(mm|cm)` and a lobe regex.
- Size and location extraction stays rule-based for every approach.

**Step 4: LLM extraction (Gemini free API)**
1. Create a key at Google AI Studio (aistudio.google.com), with no billing account attached. `pip install google-genai`.
2. Use whichever Flash model AI Studio currently lists. Send the JSON schema, 5–10 dev examples, and the instruction "quote evidence verbatim".
3. Request JSON output, and reject any `evidence` string that isn't an exact substring of the report.
4. Free tiers have per-minute and per-day request limits, which change. Add a sleep between calls and cache every response to disk, so restarts don't repeat work.
5. Only send the public IU reports. Free-tier data may be used by Google, so never send real patient text.

**Step 5: BERT, trained on "silver" labels (Kaggle GPU, about 1 hour)**
- Run the LLM, with rules as a cross-check, on all remaining reports (about 3,500, **excluding the 200 test reports**) to create silver labels.
- Fine-tune `emilyalsentzer/Bio_ClinicalBERT` as one classifier for all findings. The input is `"<finding name> [SEP] <report text>"`, and the output is 4 classes: present / absent / uncertain / not_mentioned.
- That gives about 3,500 × 6 ≈ 21k training pairs. Use 3 epochs, `max_length=256`, and the Hugging Face `Trainer` with `fp16=True` on a T4. It takes about 15–30 minutes.
- Evaluate all three approaches (rules, LLM, BERT) on the **200 gold** reports.
- This is legitimate because the test set is human-labelled and was never seen during training.

**Step 6: OCR robustness test (Mac)**
- Install Tesseract: `brew install tesseract`, then `pip install pytesseract pillow reportlab`.
- Render the 200 test reports three ways: as a PDF, as a clean image, and as a degraded image (blur, noise, ±3° rotation, JPEG compression).
- OCR each version and rerun the extractors, then report the F1 drop.

**Bring back:** the BERT folder from `save_pretrained`, about 430 MB. Store it on the Hugging Face Hub (free), not in Git, and download it at startup. Also bring back the rules module and the prompt file, all under `ml-service/artifacts/report/v1.0.0/`.

---

## Model 3: CT nodule model (Kaggle, CPU first, then GPU)

**Why this approach:** LIDC-IDRI is about 124 GB, which is too large to store anywhere for free. Instead, download one scan at a time, cut out small nodule patches, and delete the scan. The patches total under 1 GB.

### Notebook C: Patch extraction (CPU session, internet ON, no GPU quota)
```python
!pip install -q pylidc tcia_utils scipy
import numpy as np; np.int = int; np.bool = bool   # pylidc uses aliases removed in newer numpy
import os, shutil, json, scipy.ndimage as ndi
import pylidc as pl
from tcia_utils import nbia

DICOM_DIR = "/kaggle/tmp/LIDC"; OUT = "/kaggle/working"
os.makedirs(DICOM_DIR, exist_ok=True)
open(os.path.expanduser("~/.pylidcrc"), "w").write(f"[dicom]\npath = {DICOM_DIR}\nwarn = True\n")

PATCH_MM, SIZE = 48, 48
done = set(json.load(open(f"{OUT}/done.json"))) if os.path.exists(f"{OUT}/done.json") else set()
records, patches = [], []

scans = pl.query(pl.Scan).filter(pl.Scan.slice_thickness <= 2.5).all()
for scan in scans[:150]:                     # ~150 scans per session; continue in later sessions
    if scan.series_instance_uid in done: continue
    target = os.path.join(DICOM_DIR, scan.patient_id)
    nbia.downloadSeries([scan.series_instance_uid], input_type="list", path=target)
    try:
        vol = scan.to_volume()               # HU, shape (rows, cols, slices)
        sp = np.array([scan.pixel_spacing, scan.pixel_spacing, scan.slice_spacing])
        for n, anns in enumerate(scan.cluster_annotations()):
            if len(anns) < 3: continue       # keep nodules seen by >=3 radiologists
            c = np.mean([a.centroid for a in anns], 0)
            half = np.ceil(PATCH_MM / 2 / sp).astype(int)
            lo, hi = np.round(c).astype(int) - half, np.round(c).astype(int) + half
            pad = [(max(0, -l), max(0, h - s)) for l, h, s in zip(lo, hi, vol.shape)]
            v = np.pad(vol, pad, constant_values=-1000)
            lo2 = lo + [p[0] for p in pad]
            crop = v[lo2[0]:lo2[0] + 2*half[0], lo2[1]:lo2[1] + 2*half[1], lo2[2]:lo2[2] + 2*half[2]]
            crop = ndi.zoom(crop, np.array([SIZE] * 3) / crop.shape, order=1)
            crop = (np.clip(crop, -1000, 400) + 1000) / 1400
            ratings = [a.malignancy for a in anns]
            patches.append(crop.astype(np.float16))
            records.append(dict(patient=scan.patient_id, series=scan.series_instance_uid, nodule=n,
                                ratings=ratings, median=float(np.median(ratings)),
                                mean=float(np.mean(ratings)),
                                diameter_mm=float(np.mean([a.diameter for a in anns]))))
        done.add(scan.series_instance_uid)
    finally:
        shutil.rmtree(target, ignore_errors=True)

np.save(f"{OUT}/patches_part1.npy", np.stack(patches))
json.dump(records, open(f"{OUT}/records_part1.json", "w"))
json.dump(sorted(done), open(f"{OUT}/done.json", "w"))
```
- Check `tcia_utils` `downloadSeries` against its current docs. Also confirm that pylidc finds the files under `DICOM_DIR/<patient_id>/...`. Test on 2–3 scans before committing a long run.
- Commit the notebook. In later sessions, attach the previous output as input, load `done.json`, and process the next batch. There are about 1,000 scans in total.
- **All radiologist ratings are saved, not a fixed label.** You can then build the label variants from the paper plan later (exclude rating 3, count 3 as benign, mean rating) without re-extracting anything.
- **Alternative:** run the same script on your Mac overnight if you have about 5 GB free. Only one scan is on disk at a time.

### Notebook D: Train (GPU)
```python
!pip install -q monai
import numpy as np, json, torch, torch.nn as nn
from monai.networks.nets import resnet18
from sklearn.model_selection import StratifiedGroupKFold
from sklearn.metrics import roc_auc_score

X = np.concatenate([np.load(p) for p in ["…/patches_part1.npy", "…/patches_part2.npy"]])
R = sum([json.load(open(p)) for p in ["…/records_part1.json", "…/records_part2.json"]], [])
med = np.array([r["median"] for r in R]); keep = med != 3        # main label rule
X, y = X[keep], (med[keep] >= 4).astype("float32")
groups = np.array([r["patient"] for r in R])[keep]

def augment(x):                                   # x: (B,1,48,48,48)
    for ax in (2, 3, 4):
        if torch.rand(1) < 0.5: x = x.flip(ax)
    return x + 0.02 * torch.randn_like(x)

for fold, (tr, va) in enumerate(StratifiedGroupKFold(5, shuffle=True, random_state=42).split(X, y, groups)):
    model = resnet18(spatial_dims=3, n_input_channels=1, num_classes=1).cuda()
    opt = torch.optim.AdamW(model.parameters(), lr=3e-4)
    lossf = nn.BCEWithLogitsLoss(pos_weight=torch.tensor([(y[tr] == 0).sum() / (y[tr] == 1).sum()]).cuda())
    Xt, yt = torch.tensor(X[tr]).float().unsqueeze(1), torch.tensor(y[tr])
    best = 0
    for epoch in range(60):
        model.train()
        for i in torch.randperm(len(tr)).split(32):
            xb = augment(Xt[i].cuda())
            loss = lossf(model(xb).squeeze(1), yt[i].cuda())
            opt.zero_grad(); loss.backward(); opt.step()
        model.eval()
        with torch.no_grad():
            p = torch.sigmoid(model(torch.tensor(X[va]).float().unsqueeze(1).cuda()).squeeze(1)).cpu().numpy()
        auc = roc_auc_score(y[va], p)
        if auc > best: best = auc; torch.save(model.state_dict(), f"/kaggle/working/ct_fold{fold}.pt")
    print("fold", fold, "best AUC", round(best, 4))
```
- This takes minutes per fold, because the patches are small.
- Picking the best epoch on the validation fold makes these fold AUCs slightly optimistic. For the paper, also hold out 15% of patients as a final test set (as the plan says), and choose epochs and thresholds on an inner split.
- **2.5D model:** take the three central orthogonal slices of each patch as a 3-channel 2D image and fine-tune a pretrained ResNet-18. It uses the same training loop.
- **Radiomics baseline:** use `pyradiomics` with a nodule mask. Sometimes its pip install fails on newer Python versions. If it does, use simple intensity and texture features (mean, SD and percentiles of HU, GLCM features from `scikit-image`) with your Bagging classifier. Don't use pylidc's radiologist-rated features (spiculation, subtlety), because they leak the radiologists' judgment into the input.
- **Export:** export the final model to ONNX the same way as for X-ray. Also save 10–20 held-out test patches with their records. These become the app's **demo gallery**.

**Bring back:** `ct_model.onnx`, the demo patches, and metadata, into `ml-service/artifacts/ct/v1.0.0/`.

---

## After each model, every time
1. Record the seed, library versions, GPU type, dataset version and the exact split files in `metadata.json`.
2. Save every number the paper will use (tables, CIs, curves) from the notebook into `results/`. Don't copy numbers by hand.
3. Download the notebook (`.ipynb`) into `ml-service/training/<model>/`, so the repo contains the exact code that produced each result.
4. Keep large weights on the Hugging Face Hub or as private Kaggle Datasets, not in Git.

## About NLST alternatives (unverified, check before use)
Two public datasets may give you NLST-style data without a CDAS application:
- **LUNA25 challenge data:** low-dose CT nodules from NLST with malignancy labels, plus age and sex. It was released on Zenodo.
- **Duke Lung Cancer Screening Dataset:** also on Zenodo.

The CT images in TCIA's NLST collection may also be downloadable directly, even though the full clinical data still needs CDAS. If LUNA25 is available with suitable labels, it could replace LIDC-IDRI for Model 3 and give stronger, pathology-based labels. Check each dataset's licence first.

If you'd like, I can add the dtype fix and the nested-CV script to the repo now, then write the Kaggle notebooks one at a time as `.ipynb` files under `ml-service/training/`.