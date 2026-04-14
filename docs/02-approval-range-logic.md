# 승인 범위(Range of Approval) 자동계산 로직

> Reference: **ISO 9606-1:2012 / KS B ISO 9606-1:2012**
> 입력: `test_records` 1건 (시험 기록서)
> 출력: `approval_ranges` 1건 (범위) + `designation_string` + `reference_no`

---

## 0. 전체 파이프라인 (High-level Flow)

```
┌──────────────────────────────┐
│ (1) Test Record 입력/검증    │  필수변수 누락·모순 체크
└──────────────┬───────────────┘
               │ pass
               ▼
┌──────────────────────────────┐
│ (2) Pre-check: 합격 여부     │  VT/RT/Bend/Macro 등 NDE 결과
└──────────────┬───────────────┘
               │ overall_result = pass
               ▼
┌──────────────────────────────────────────────────────────┐
│ (3) 필수변수별 Range 계산 (병렬 가능)                     │
│   ├─ Process         (Table 1)                            │
│   ├─ Product Type    (Table 2) + Pipe Diameter (Table 3)  │
│   ├─ Weld Type       (Table 2)                            │
│   ├─ Material Group  (Table 3 / ISO TR 15608 grouping)    │
│   ├─ Filler Group    (Table 4)                            │
│   ├─ Filler Designation & Shielding Gas (Table 4 footnote)│
│   ├─ Thickness       (Table 5: BW / Table 6: FW)          │
│   ├─ Welding Position(Table 6)                            │
│   └─ Weld Detail ss/bs/nb/mb (Table 7)                    │
└──────────────┬───────────────────────────────────────────┘
               ▼
┌──────────────────────────────┐
│ (4) Range 통합 + Normalize    │  배열화, 정렬, de-dup
└──────────────┬───────────────┘
               ▼
┌──────────────────────────────┐
│ (5) Designation & Ref No 생성 │
│   EN ISO 9606-1 135 P BW FM1  │
│   S t2.3 PC ss nb              │
└──────────────┬───────────────┘
               ▼
┌──────────────────────────────┐
│ (6) DB 저장 + calc_log(JSONB) │
└──────────────────────────────┘
```

---

## 1. Pre-check (시험 합격 여부)

```python
def is_qualified(tr: TestRecord) -> bool:
    # ISO 9606-1 §7 시험결과
    required = [tr.vt_result]                         # 육안 필수
    if tr.weld_type == "BW":
        required += [tr.rt_or_ut(), tr.bending_or_fracture()]
    else:  # FW
        required += [tr.macro_or_fracture()]
    if tr.job_knowledge_tested:
        required += [tr.job_knowledge]
    return all(r == "pass" for r in required)
```

합격 아님 → 인증서 생성 불가 (`test_records.overall_result='fail'` 로 저장, 여기서 종료).

---

## 2. 필수변수별 Range 계산

### 2.1 Process (ISO 4063)

기본 원칙: **시험한 공정만 승인** (mechanised 141 등의 root+filler 조합은 예외 규정).

```
qualified_processes = {tested_process}
```

### 2.2 Product Type (P/T) & Pipe Diameter

`ref_product_types`: `P` (plate), `T` (pipe/tube).

| 시험   | 승인 product                                                      |
| ------ | ------------------------------------------------------------------ |
| Pipe D > 25 mm, 회전되지 않는 용접(fixed) | Plate + Pipe (D ≥ 0.5·D_test, 최소 25mm)  |
| Pipe D ≤ 25 mm                             | Pipe (D_test ~ 2·D_test)                 |
| Plate                                      | Plate + **Pipe D ≥ 500 mm** (모든 자세)  |
|                                            | + **Pipe D ≥ 150 mm** (PA, PC 자세)      |

```python
def product_range(tr):
    if tr.product_type == "T":
        D = tr.outside_diameter_mm
        if D <= 25:
            return {"types":["T"], "D_min":D, "D_max":2*D}
        else:
            return {"types":["P","T"], "D_min":max(25, 0.5*D), "D_max": None}
    else:  # Plate
        return {"types":["P","T"], "D_min":500, "D_max":None,
                "note":"D≥150mm PA·PC 자세에 한함"}
```

### 2.3 Weld Type (BW / FW)

- **BW 시험 → BW + FW 승인**
- **FW 시험 → FW 만 승인**
- BW 를 Plate / T 에서 따로 시험했을 때의 자세 범위 차이는 §2.7 참조.

### 2.4 Material Group (ISO/TR 15608)

ISO 9606-1 Table 3(모재 그룹별 상호인정표)에 따라 계산.
핵심 패턴 (요약; `rule_tables.payload` 에 상세히 저장):

| 시험 그룹     | 승인 그룹                       |
| ------------- | ------------------------------- |
| 1.1           | 1.1, 1.2, 1.4(조건부)           |
| 1.2           | 1.1, 1.2                        |
| 1.3 / 1.4     | 해당 그룹                       |
| 8.1           | 8.1, 8.2                        |
| 8.2           | 8.1, 8.2                        |
| 21~26 (Al)    | 그룹별 개별 규정                |

```python
qualified_material_groups = rules.table3_lookup(tr.material_group)
```

### 2.5 Filler Group (FM1~FM7) — Table 4

| 시험 FM | 승인 FM         |
| ------- | --------------- |
| FM1     | FM1, FM2        |
| FM2     | FM1, FM2        |
| FM3     | FM1, FM2, FM3   |
| FM4     | FM4             |
| FM5     | FM5, FM6        |
| FM6     | FM6             |
| FM7     | FM7             |

### 2.6 Filler Designation & Shielding Gas

- **Designation**: 시험시 사용한 코드(S solid, M metal-cored, B basic flux-cored, R/P/V/W/Y/Z) **만** 승인.
  - 예외: `B` 시험 → `B` 및 `S`도 승인되는 등의 footnote 존재 → `rule_tables` 로 처리.
- **Shielding gas (EN ISO 14175)**: "**Similar shielding gas**" 라는 문구로 인증서에 기재.
  - 그룹 동일성만 저장(M21 → M 시리즈 허용 등).

### 2.7 Thickness (Table 5 BW / Table 6 FW)

**Butt Weld (BW)**

| 시험 두께 t (mm)  | 승인 범위                      |
| ----------------- | ------------------------------ |
| t < 3             | t ~ 2t                         |
| 3 ≤ t ≤ 12        | 3 ~ 2t (또는 t·2 의 최대값)    |
| t > 12            | ≥ 5 mm                         |

**Fillet Weld (FW)**

| 시험 두께 t       | 승인 범위          |
| ----------------- | ------------------ |
| t < 3             | t ~ 2t             |
| t ≥ 3             | ≥ 3 mm             |

> 예: t=2.3 mm BW → **2.3 ~ 4.6 mm** (인증서 샘플의 "2.3 to 4.6mm" 와 일치)

```python
def thickness_range(tr):
    t = tr.thickness_mm
    if tr.weld_type == "BW":
        if t < 3:      return (t, 2*t)
        if t <= 12:    return (3, 2*t)
        return (5, None)
    else:  # FW
        if t < 3: return (t, 2*t)
        return (3, None)
```

### 2.8 Welding Position — Table 4 (Positions) / Table 5

포지션 표 (BW 기준 요약, 실제로는 BW vs FW, 플레이트 vs 파이프 4가지 매트릭스):

| 시험 자세  | 승인 자세 (BW, Plate)             | 승인 자세 (BW, Pipe)                   |
| ---------- | ---------------------------------- | --------------------------------------- |
| PA         | PA                                 | PA (회전)                               |
| PC         | PA, PC                             | PA, PC                                  |
| PE         | PA, PB, PC, PE                     | PA, PB, PC, PE                          |
| PF         | PA, PC, PF                         | PA, PC, PF                              |
| PG         | PG                                 | PA, PG                                  |
| H-L045     | (Pipe 전용) PA, PB, PC, PE, PF     | 거의 모든 자세                          |
| J-L045     | (Pipe 전용) PA, PB, PC, PE, PG     |                                         |

```python
qualified_positions = rules.table_positions.lookup(
    weld_type=tr.weld_type,
    product=tr.product_type,
    tested=tr.position)
```

> 인증서 예시: 시험 PC(Plate, BW) → Range `PA, PC` ✔

### 2.9 Weld Detail (ss / bs, nb / mb)

| 시험 조건 | 승인 조건                                         |
| --------- | -------------------------------------------------- |
| ss nb     | ss nb, ss mb, bs (가장 넓음)                       |
| ss mb     | ss mb, bs                                          |
| bs        | bs                                                 |

```python
detail_range = {
 "ss nb": ["ss nb","ss mb","bs"],
 "ss mb": ["ss mb","bs"],
 "bs"   : ["bs"],
}[tr.weld_detail]
```

> 인증서 예시: 시험 `ss nb` → Range `ss nb, ss mb, bs` ✔

---

## 3. 통합 & Normalize

```python
approval = ApprovalRange(
    processes              = [tr.process],
    product_types          = product_range(tr)["types"],
    diameter_min_mm        = product_range(tr).get("D_min"),
    diameter_max_mm        = product_range(tr).get("D_max"),
    weld_types             = ["BW","FW"] if tr.weld_type=="BW" else ["FW"],
    material_groups        = material_group_range(tr),
    filler_groups          = filler_group_range(tr),
    filler_designations    = filler_designation_range(tr),
    shielding_gases        = [tr.shielding_gas + " (similar)"],
    thickness_min_mm       = thickness_range(tr)[0],
    thickness_max_mm       = thickness_range(tr)[1],
    positions              = position_range(tr),
    weld_details           = detail_range,
)
```

---

## 4. Designation & Reference No 생성

**Designation** (인증서 상단):

```
EN ISO 9606-1  <process>  <P|T>  <BW|FW>  FM<n>  <S|M|B…>  t<thk>  <position>  <ss nb|…>
예) EN ISO 9606-1 135 P BW FM1 S t2.3 PC ss nb
```

**Reference No** (조직 규칙; 설정 가능):

```
{STANDARD}-{ORG_CODE}-{WELDER_NO_SUFFIX}-{PROCESS}-t{THK}-{WELDTYPE}-{POSITION}
예) EN 9606-1-RM-140-135-t2.3-BW-PC
```

두 포맷 모두 조직별 템플릿으로 `organizations.settings` 에 저장 → 엔진에서 렌더.

---

## 5. 유효기간(Validity)

ISO 9606-1 §9:

- 기본 유효기간: **3년** (단, 고용주/검사기관이 6개월마다 확인 시).
- 본 샘플은 **2년 (§9.3 / employer+IWE)** 규칙을 사용.
  - `valid_from = welding_date`
  - `valid_until = welding_date + 2년 - 1일`
- 연장 기록은 `certificate_prolongations` 테이블에 누적.

---

## 6. 계산 로그(Audit)

`approval_ranges.calc_log` (JSONB) 예시:

```json
{
  "engine_version": "1.0.0",
  "rule_set": "ISO-9606-1-2012",
  "steps": [
    {"var":"thickness","input":2.3,"rule":"BW t<3 → (t,2t)","output":[2.3,4.6]},
    {"var":"position","input":"PC","rule":"Table5 BW Plate PC→[PA,PC]","output":["PA","PC"]},
    {"var":"weld_detail","input":"ss nb","output":["ss nb","ss mb","bs"]}
  ]
}
```

분쟁/재심사 시 어떤 규칙이 적용됐는지 재현 가능.

---

## 7. 의사코드 (엔트리포인트)

```python
def calculate_approval(tr: TestRecord, rule_set: RuleSet) -> ApprovalRange:
    if not is_qualified(tr):
        raise NotQualified(tr.fail_reason)

    ar = ApprovalRange(rule_set_id=rule_set.id, test_record_id=tr.id)

    ar.processes            = [tr.process]
    ar.weld_types           = ["BW","FW"] if tr.weld_type=="BW" else ["FW"]

    prod = product_range(tr, rule_set)
    ar.product_types        = prod["types"]
    ar.diameter_min_mm      = prod.get("D_min")
    ar.diameter_max_mm      = prod.get("D_max")

    ar.material_groups      = rule_set.lookup("material_group", tr.material_group)
    ar.filler_groups        = rule_set.lookup("filler_group",  tr.filler_group)
    ar.filler_designations  = rule_set.lookup("filler_design", tr.filler_designation)
    ar.shielding_gases      = [f"{tr.shielding_gas} (similar)"]

    ar.thickness_min_mm, ar.thickness_max_mm = thickness_range(tr, rule_set)
    ar.positions            = rule_set.lookup("position", tr.weld_type, tr.product_type, tr.position)
    ar.weld_details         = rule_set.lookup("weld_detail", tr.weld_detail)

    ar.designation_string   = render_designation(tr, ar)
    ar.reference_no         = render_reference_no(tr, ar)
    ar.calc_log             = collect_steps()
    return ar
```

---

## 8. 구현 단계 로드맵 (다음 작업 분할 — subagent 병렬화 후보)

| # | 작업                                       | 추천 Subagent          |
| - | ------------------------------------------ | ---------------------- |
| 1 | 백엔드 프로젝트 부트스트랩 + DB 마이그레이션 | general-purpose        |
| 2 | 참조 테이블 시드 (ISO 9606-1 규칙 JSON)    | general-purpose        |
| 3 | 승인범위 계산 엔진 구현 + 유닛테스트       | general-purpose + simplify |
| 4 | 시험기록 CRUD API                          | general-purpose        |
| 5 | 엑셀/PDF 템플릿 렌더링                     | general-purpose        |
| 6 | IWE 서명·QR 발급 + 진위확인 공개페이지     | general-purpose        |
| 7 | 규칙 테이블 관리 UI (규격 개정 대응)       | general-purpose        |
| 8 | 테스트 케이스: 샘플 인증서 2건 회귀검증    | Explore + simplify     |

샘플 인증서(첨부) 로 즉시 회귀 테스트 가능:

- **Input**: process=135, P, BW, FM1, S, t=2.3, PC, ss nb, gas=M21, material=1.1
- **Expected Range**:
  - Product: `P, T (D≥500 / D≥75)` , weld: `BW`, FM1,2 → **FM1, FM2**, S/M,
    thickness `2.3 ~ 4.6 mm`, position `PA, PC`, detail `ss nb, ss mb, bs`
  - Designation: `EN ISO 9606-1 135 P BW FM1 S t2.3 PC ss nb` ✔

