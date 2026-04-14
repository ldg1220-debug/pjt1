# 용접사 인증서 발행 플랫폼 — DB 스키마 설계

> Standard: **ISO 9606-1:2012 / KS B ISO 9606-1:2012**
> 목적: 용접사 자격 시험 기록서(입력) → 승인 범위 자동계산 → 승인 시험 인증서(엑셀/PDF) 출력

---

## 1. 설계 원칙

1. **입력(시험 기록) / 계산(승인 범위) / 출력(인증서)** 를 논리적으로 분리.
2. ISO 9606-1 의 **필수변수(essential variables)** 는 enum/참조테이블로 정규화 → 규격 개정 시 테이블만 갱신.
3. 인증서는 **발행 시점 snapshot 을 보존** (welder 이름·소속 변경 등으로 과거 인증서가 변질되면 안 됨).
4. **검증 가능성 (traceability)**: 인증서 → 시험기록 → 계산 로직 버전 추적 가능해야 함.
5. IWE 서명·인장, WPS, 이미지(사진) 등 **파일 자산** 은 별도 스토리지 경로를 DB 에 보관.

---

## 2. 테이블 목록 (ERD 개요)

```
[organizations] ─┬─< [users]                         # 플랫폼 사용자(IWE 등)
                 └─< [employers]                     # 용접사 고용사(소속)

[welders] ──< [test_records] ──< [approval_ranges] ──1:1── [certificates]
   │              │
   │              └─< [test_record_attachments]     # 사진·원본
   │
   └─< [welder_photos]

[certificates] ──< [certificate_prolongations]     # 자격 연장 기록(9.3 / 9.2)
                 └─< [certificate_revisions]       # 재발행 이력

# --- 참조(Lookup) 테이블 --------------------------------
[ref_welding_processes]     # ISO 4063 : 111, 135, 136, 141 …
[ref_product_types]          # P(Plate), T(Tube/Pipe)
[ref_weld_types]             # BW, FW
[ref_material_groups]        # CEN ISO/TR 15608 : 1.1, 1.2, 8.1 …
[ref_filler_groups]          # FM1 ~ FM7
[ref_filler_designations]    # S(solid), M(metal-cored), B(basic flux-cored), R/P/V/W/Y/Z, N(no filler)
[ref_shielding_gases]        # EN ISO 14175 : M21, C1, I1 …
[ref_positions]              # PA, PB, PC, PD, PE, PF, PG, H-L045, J-L045
[ref_weld_details]           # ss nb, ss mb, bs, gouging 여부
[ref_test_types]             # VT, RT, UT, MT, PT, Bend, Fracture, Macro

[rule_sets]                  # 승인 범위 계산 규칙 버전(ISO 9606-1:2012, :2017 …)
[rule_tables]                # rule_sets 밑 Table 1~6 데이터(JSON)
```

---

## 3. 테이블 스키마

### 3.1 `organizations` — 플랫폼 운영 조직(예: 로만시스㈜)

| 컬럼              | 타입             | 설명                               |
| ----------------- | ---------------- | ---------------------------------- |
| id (PK)           | UUID             |                                    |
| name              | VARCHAR(200)     | 로만시스㈜                         |
| name_en           | VARCHAR(200)     | Romansys Co., Ltd.                 |
| team              | VARCHAR(100)     | 생산기술팀                         |
| logo_path         | VARCHAR(500)     | 인증서 좌상단 로고                 |
| seal_path         | VARCHAR(500)     | IWE 인장 이미지                    |
| iwe_code          | VARCHAR(50)      | 예: IWE 등록번호                   |
| created_at / updated_at | TIMESTAMPTZ |                                    |

### 3.2 `users` — 플랫폼 사용자

| 컬럼               | 타입         | 설명                                   |
| ------------------ | ------------ | -------------------------------------- |
| id (PK)            | UUID         |                                        |
| organization_id FK | UUID         | organizations.id                       |
| email              | VARCHAR(255) | UNIQUE                                 |
| password_hash      | VARCHAR(255) |                                        |
| full_name          | VARCHAR(100) | 예: Lee Donggeon                       |
| role               | ENUM         | `iwe`, `admin`, `operator`, `viewer`   |
| signature_path     | VARCHAR(500) | 수기 서명 스캔본(인증서 자동 서명용)   |
| is_active          | BOOLEAN      |                                        |

### 3.3 `employers` — 용접사 소속회사

| 컬럼       | 타입         | 설명                |
| ---------- | ------------ | ------------------- |
| id (PK)    | UUID         |                     |
| name       | VARCHAR(200) | 디에스텍, 현성기업  |
| name_en    | VARCHAR(200) |                     |
| biz_reg_no | VARCHAR(30)  | 사업자등록번호       |

### 3.4 `welders` — 용접사 마스터

| 컬럼              | 타입         | 설명                                      |
| ----------------- | ------------ | ----------------------------------------- |
| id (PK)           | UUID         |                                           |
| employer_id FK    | UUID         |                                           |
| welder_no         | VARCHAR(50)  | 용접사 No. (예: RM-WD-24140) UNIQUE       |
| name_ko           | VARCHAR(50)  | 김영태                                    |
| name_en           | VARCHAR(100) | KIM YOUNG TAI                             |
| birth_date        | DATE         | 1970-07-25                                |
| birth_place       | VARCHAR(100) | Chwang WON                                |
| id_method         | VARCHAR(100) | 주민등록증/Personal ID No. 등             |
| photo_path        | VARCHAR(500) | 증명사진                                   |

### 3.5 `test_records` — 용접사 자격 시험 기록서 (입력 원본)

| 컬럼                       | 타입         | 설명                                                 |
| -------------------------- | ------------ | ---------------------------------------------------- |
| id (PK)                    | UUID         |                                                      |
| serial_no                  | INT          | 연번 (프로젝트 내 1, 2, …)                            |
| test_date                  | DATE         | TEST 시행일                                          |
| project_name               | VARCHAR(300) | 프로젝트 및 제작품목 (예: 코레일 디젤 전기기관차 대차) |
| welder_id FK               | UUID         |                                                      |
| welder_no_override         | VARCHAR(50)  | 기록 시점의 번호(추적용)                              |
| **TEST Piece Detail**      |              |                                                      |
| process_id FK              | INT          | ref_welding_processes (135, 111 …)                   |
| product_type_id FK         | INT          | ref_product_types (P/T)                              |
| weld_type_id FK            | INT          | ref_weld_types (BW/FW)                               |
| thickness_mm               | NUMERIC(6,2) | 시험재 두께 t (예: 2.3)                              |
| deposited_thickness_mm     | NUMERIC(6,2) | 용접 두께 (s)                                        |
| outside_diameter_mm        | NUMERIC(7,2) | 파이프 D (plate 면 NULL)                             |
| position_id FK             | INT          | ref_positions (PA, PC, PF …)                         |
| filler_group_id FK         | INT          | ref_filler_groups (FM1 …)                            |
| filler_designation_id FK   | INT          | ref_filler_designations (S, M, B …)                  |
| shielding_gas_id FK        | INT          | ref_shielding_gases (M21 …)                          |
| material_group_id FK       | INT          | ref_material_groups (1.1 …)                          |
| weld_detail_id FK          | INT          | ref_weld_details (ss nb, ss mb, bs)                  |
| backing_gouging            | VARCHAR(20)  | N/A, 3P, gouging 여부                                |
| wps_no                     | VARCHAR(50)  | 예: WPS-RM005                                        |
| **NDE / 기계시험 결과**   |              |                                                      |
| vt_result                  | ENUM         | pass/fail/na                                         |
| rt_result                  | ENUM         |                                                      |
| ut_result                  | ENUM         |                                                      |
| mt_result                  | ENUM         |                                                      |
| pt_result                  | ENUM         |                                                      |
| bending_result             | ENUM         |                                                      |
| fracture_result            | ENUM         |                                                      |
| macro_result               | ENUM         |                                                      |
| additional_test_result     | ENUM         |                                                      |
| job_knowledge              | ENUM         | acceptable / not_acceptable / not_tested             |
| **판정**                  |              |                                                      |
| overall_result             | ENUM         | pass / fail                                          |
| fail_reason                | TEXT         |                                                      |
| remarks                    | TEXT         | 비고                                                 |
| examiner_user_id FK        | UUID         | users.id (IWE 서명자)                                |
| examining_body             | VARCHAR(200) | 예: IWE 국제용접기술자                               |
| test_location              | VARCHAR(200) | Chilseo-myeon, Haman-gun …                           |
| created_at / updated_at    | TIMESTAMPTZ  |                                                      |

> **복합 인덱스**: (`welder_id`, `test_date`, `serial_no`)
> **제약**: `thickness_mm > 0`, `overall_result='pass'` 일 때만 `certificates` 생성 허용(앱 레벨)

### 3.6 `approval_ranges` — 시험 1건의 자동계산 승인 범위

| 컬럼                         | 타입         | 설명                                                 |
| ---------------------------- | ------------ | ---------------------------------------------------- |
| id (PK)                      | UUID         |                                                      |
| test_record_id FK UNIQUE     | UUID         | 1:1                                                  |
| rule_set_id FK               | INT          | 계산 당시 규칙 버전                                  |
| calc_version                 | VARCHAR(20)  | 엔진 버전(예: 1.0.0)                                 |
| **승인 범위**                |              |                                                      |
| processes                    | INT[]        | 허용 process 코드(보통 본인 하나)                    |
| product_types                | CHAR(1)[]    | 예: {P,T} 또는 {P}                                    |
| weld_types                   | VARCHAR(4)[] | {BW,FW} 또는 {FW}                                    |
| filler_groups                | VARCHAR(10)[]| 예: {FM1, FM2}                                       |
| filler_designations          | VARCHAR(10)[]| 예: {S, M, B, R, P, V, W, Y, Z}                      |
| shielding_gases              | VARCHAR(20)[]| "Similar shielding gas" 판정용 그룹                  |
| thickness_min_mm             | NUMERIC(6,2) | 예: 2.3                                              |
| thickness_max_mm             | NUMERIC(6,2) | 예: 4.6 (t<3 → 2t)                                   |
| diameter_min_mm              | NUMERIC(7,2) | D≥500 / D≥75 등, plate 계열이면 NULL                  |
| diameter_max_mm              | NUMERIC(7,2) | 제한 없으면 NULL                                     |
| positions                    | VARCHAR(10)[]| 예: {PA, PC}                                          |
| weld_details                 | VARCHAR(10)[]| 예: {ss nb, ss mb, bs}                               |
| material_groups              | VARCHAR(10)[]| 예: {1.1, 1.2, 8.1}                                   |
| **부록(Designation·참고)**   |              |                                                      |
| designation_string           | TEXT         | 예: `EN ISO 9606-1 135 P BW FM1 S t2.3 PC ss nb`     |
| reference_no                 | VARCHAR(100) | `EN 9606-1-RM-140-135-t2.3-BW-PC`                    |
| calc_log                     | JSONB        | 어떤 규칙이 적용되었는지 단계별 로그(감사용)         |
| created_at                   | TIMESTAMPTZ  |                                                      |

### 3.7 `certificates` — 용접사 승인 시험 인증서 (출력 snapshot)

| 컬럼                     | 타입         | 설명                                                |
| ------------------------ | ------------ | --------------------------------------------------- |
| id (PK)                  | UUID         |                                                     |
| approval_range_id FK     | UUID         |                                                     |
| certificate_no           | VARCHAR(100) | UNIQUE (예: RM-WD-24140-2026-0001)                  |
| issued_date              | DATE         | Date of issue (2026-01-13)                          |
| welding_date             | DATE         | Date of Welding (2026-01-12)                        |
| valid_from / valid_until | DATE         | 2026-01-12 ~ 2028-01-11 (2년)                       |
| welder_snapshot          | JSONB        | 발급 시점 welder 정보 사본                          |
| employer_snapshot        | JSONB        |                                                     |
| range_snapshot           | JSONB        | approval_ranges 전체 사본                           |
| wps_no                   | VARCHAR(50)  |                                                     |
| status                   | ENUM         | active / suspended / expired / revoked              |
| revoked_reason           | TEXT         |                                                     |
| excel_path               | VARCHAR(500) |                                                     |
| pdf_path                 | VARCHAR(500) |                                                     |
| qr_token                 | VARCHAR(64)  | 진위확인용 QR                                       |
| issued_by_user_id FK     | UUID         | IWE 서명자                                          |
| created_at               | TIMESTAMPTZ  |                                                     |

### 3.8 `certificate_prolongations` — 자격 유효기간 연장(9.2 / 9.3)

| 컬럼                 | 타입         | 설명                                                |
| -------------------- | ------------ | --------------------------------------------------- |
| id (PK)              | UUID         |                                                     |
| certificate_id FK    | UUID         |                                                     |
| type                 | ENUM         | `employer_6m` (9.2 / 6개월), `examiner_2y` (9.3 / 2년) |
| prolongation_date    | DATE         |                                                     |
| signed_by            | VARCHAR(100) |                                                     |
| position_or_title    | VARCHAR(100) |                                                     |
| signature_path       | VARCHAR(500) |                                                     |
| new_valid_until      | DATE         | 연장 후 만료일                                      |

### 3.9 `certificate_revisions` — 재발행 이력(오타·정보변경)

| id / certificate_id / revision_no / changes (JSONB) / reason / created_by / created_at |

### 3.10 참조 테이블 (대표)

`ref_welding_processes`

| code (PK) | name         | name_en                     |
| --------- | ------------ | --------------------------- |
| 111       | 피복아크용접 | SMAW / MMA                  |
| 135       | MAG          | MAG / GMAW solid wire       |
| 136       | 플럭스코어드 | FCAW gas-shielded           |
| 141       | TIG          | GTAW                        |
| 311       | 가스용접     | OFW                         |

`ref_positions`

| code | description     |
| ---- | --------------- |
| PA   | Flat            |
| PB   | Horizontal      |
| PC   | Horizontal-Vert |
| PD   | Horiz. Overhead |
| PE   | Overhead        |
| PF   | Vertical Up     |
| PG   | Vertical Down   |
| H-L045 | Pipe 45° up   |
| J-L045 | Pipe 45° down |

`ref_filler_groups` (FM1~FM7), `ref_weld_types` (BW/FW), `ref_weld_details` (ss nb / ss mb / bs), `ref_material_groups` (CEN ISO/TR 15608) 등 모두 유사한 형태.

### 3.11 `rule_sets` / `rule_tables` — 규칙 버전 관리

```sql
rule_sets(id, code, standard, year, effective_from, effective_to, is_active)
rule_tables(id, rule_set_id, table_key, payload JSONB)
   -- table_key 예: 'filler_group_range', 'thickness_range_bw',
   --              'position_range', 'diameter_range', 'weld_detail_range'
```

승인 범위 계산 엔진은 **코드가 아니라 `rule_tables.payload` 를 읽어** 결정하므로, 규격 개정 시 DB 업데이트만으로 대응 가능.

---

## 4. 핵심 인덱스 / 제약 요약

- `welders.welder_no` UNIQUE
- `certificates.certificate_no` UNIQUE
- `test_records (welder_id, test_date)` INDEX
- `approval_ranges.test_record_id` UNIQUE (1:1)
- `certificates.valid_until` INDEX (만료 임박 조회용)
- `test_records.overall_result='pass'` 여부 CHECK trigger: fail 이면 certificate 생성 불가

---

## 5. 보관 파일 구조(스토리지)

```
/storage/
 ├─ welders/{welder_id}/photo.jpg
 ├─ test_records/{id}/macro.jpg, rt.pdf …
 ├─ certificates/{cert_no}.xlsx
 ├─ certificates/{cert_no}.pdf
 └─ signatures/{user_id}.png
```

---

## 6. 다음 문서

- `02-approval-range-logic.md` : ISO 9606-1 Table 1~6 을 기반으로 **승인 범위를 어떻게 계산하는지** 의사코드·플로우차트.
