# DzPharm / HealthTech DZ: Next-Gen Algerian Pharmaceutical & Clinical Intelligence Platform
## Master Technical Blueprint, Architecture Specifications & Autonomous System Prompt

---

## 1. Executive Summary & Vision

This blueprint conceptualizes, designs, and architects the definitive pharmaceutical reference, clinical decision support system (CDSS), and digital health platform built specifically for the Algerian healthcare ecosystem. Serving doctors, retail/hospital pharmacists, medical students, and patients, the platform bridges the gap between official regulatory data (Ministère de la Santé, LNCPP, CNAS/CASNOS) and clinical realities across all 58 Wilayas.

### Core Strategic Imperatives
* **Unconstrained AI Innovation:** Built with open architecture to allow AI agents to dynamically synthesize, test, and deploy new clinical micro-widgets based on real-time usage patterns.
* **Algerian Localization:** Native support for local pharmaceutical nomenclature, DCI mapping, PPA (*Prix Public Algérien*), Tarif de Référence, Chifa copay structures, AMM numbers, and psychotropic legal frameworks.
* **Dual UX Duality:** High-density, keyboard-driven interface for clinicians alongside a clear, accessible, voice/camera-enabled portal for patients.
* **Offline-First Resilience:** PWA technology running local IndexedDB database syncs to ensure total functionality in remote or low-connectivity environments.

---

## 2. Comprehensive Benchmarking Matrix

| Reference Platform | Key Architectural Strengths | UI/UX & Functional Bottlenecks | Adaptable Blueprint Elements |
| :--- | :--- | :--- | :--- |
| **DailyMed (NIH/NLM)** | Structured SPL XML schema; standardized monograph metadata. | Text-heavy, late-2000s layout; zero patient-oriented guides. | XML/JSON standardization for active ingredients, excipients, and package inserts. |
| **Medscape Reference** | Deep clinical reference; multi-drug interaction matrix; peer-reviewed data. | Paywalls/registration walls; ad bloat; poor mobile speed. | Tabbed high-density layout (Dosage, Interactions, Adverse Effects, Pharmacology). |
| **Drugs.com** | Visual Pill Identifier; clear consumer alerts; phonetics. | U.S.-centric drug branding; irrelevant FDA/insurance context. | Interactive visual filtering (shape, color, imprint, packaging). |
| **PharmNet-DZ** | Comprehensive Algerian DCI & commercial drug database. | Dated WebForms architecture; non-responsive; zero interactive tools. | Baseline drug taxonomy, local DCI mapping, PPA/Tarif Ref dataset structure. |
| **MEDAL-DZ** | AMM registration details; local manufacturer/importer metadata. | Static tabular layout; lacks search indexing, vector retrieval, or interactive tools. | AMM registration tracking and local vs. imported packaging distinction. |
| **Baseline Sandbox** | Clean React/Tailwind visual shell; modern UI primitives. | Static mock data; missing stateful interaction checkers; no offline engine. | Visual aesthetic, UI components, responsive layout base. |

---

## 3. Core Data Engine & Database Schema

+-----------------------------------------------------------------------------------+

|                           Unified Algerian Data Infrastructure                    |

+-----------------------------------------------------------------------------------+

|

+-------------------------------+-------------------------------+

|                               |                               |

+---------v----------+         +----------v----------+         +----------v----------+

| PostgreSQL Engine  |         |  Qdrant Vector Engine |       | Object Storage CDN  |

| (Relational Data)  |         | (RAG Monograph Index)|       | (Visual Drug Assets)|

+--------------------+         +---------------------+       +---------------------+

```
### PostgreSQL Relational Schema

```sql
-- PostgreSQL Production Schema for Algerian Drug Registry

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. International Nonproprietary Name (DCI) Registry
CREATE TABLE dci_registry (
    dci_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dci_name_fr VARCHAR(255) NOT NULL,
    dci_name_ar VARCHAR(255) NOT NULL,
    atc_code VARCHAR(10) NOT NULL INDEXED,
    therapeutical_class VARCHAR(255) NOT NULL,
    pregnancy_category CHAR(1) CHECK (pregnancy_category IN ('A', 'B', 'C', 'D', 'X')),
    lactation_safety_index VARCHAR(100),
    renally_adjusted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Algerian Commercial Product Entries
CREATE TABLE algerian_drug_products (
    product_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    amm_number VARCHAR(100) UNIQUE NOT NULL,
    brand_name VARCHAR(255) NOT NULL,
    dci_id UUID REFERENCES dci_registry(dci_id) ON DELETE RESTRICT,
    dosage_strength VARCHAR(100) NOT NULL,
    pharmaceutical_form VARCHAR(100) NOT NULL, -- Gélule, Comprimé, Sirop, Injectable
    packaging_spec VARCHAR(100) NOT NULL, -- B/30, Flacon 150ml
    manufacturer_name VARCHAR(255) NOT NULL,
    is_local_production BOOLEAN NOT NULL DEFAULT TRUE,
    ppa_price NUMERIC(10, 2) NOT NULL, -- Prix Public Algérien (DZD)
    tarif_de_reference NUMERIC(10, 2) NOT NULL, -- Base de Remboursement (DZD)
    reimbursement_rate INT NOT NULL CHECK (reimbursement_rate IN (0, 40, 80, 100)),
    chifa_code VARCHAR(50) INDEXED,
    controlled_substance_class VARCHAR(20) CHECK (controlled_substance_class IN ('Non_Controle', 'Tableau_A', 'Tableau_B', 'Tableau_C', 'Psychotrope')),
    is_marketed BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Multi-Drug Interaction Rules Engine
CREATE TABLE drug_interactions (
    interaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dci_primary_id UUID REFERENCES dci_registry(dci_id),
    dci_secondary_id UUID REFERENCES dci_registry(dci_id),
    severity_level VARCHAR(20) CHECK (severity_level IN ('Contraindicated', 'Major', 'Moderate', 'Minor')),
    mechanism_description TEXT NOT NULL,
    clinical_management TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for sub-50ms fuzzy retrieval
CREATE INDEX idx_brand_name_trgm ON algerian_drug_products USING gin (brand_name gin_trgm_ops);
CREATE INDEX idx_dci_fr_trgm ON dci_registry USING gin (dci_name_fr gin_trgm_ops);
```

## 4. Feature Matrix & Innovation Engine

```
+-----------------------------------------------------------------------------------+
|                             Platform Feature Architecture                         |
+------------------------------------+----------------------------------------------+
| Essential Core Capabilities        | Unconstrained AI & Local Innovations         |
+------------------------------------+----------------------------------------------+
| • Multi-Criteria Sub-50ms Search   | • DzPharm-LLM (Arabic/Darija/French AI)     |
| • Multi-Drug & Food Interaction Check| • Visual AI Camera Packaging Scanner        |
| • Generic & Bioequivalence Finder  | • Live Wilaya Duty Map (*Pharmacies de Garde*)|
| • Pregnancy & Lactation Matrix     | • Algerian Weight/Syrup Pediatric Calculator |
| • Offline PWA IndexedDB Engine     | • Chifa Card Out-of-Pocket Copay Simulator   |
| • Exportable Technical Data Sheets | • Psychotropic Legal Prescribing Vault       |
+------------------------------------+----------------------------------------------+
```

### Unconstrained AI-Driven Feature Concepts

1. **DzPharm-LLM Clinical Co-Pilot:** Multilingual AI assistant trained on Algerian medical monographs. Understands queries in French, Standard Arabic, English, and local Algerian Darija (e.g., recognizing "سطر في الراس" or "دوا تاع السكر"). Toggles between simplified patient summaries and detailed pharmacodynamics for doctors.
2. **Visual AI Pill & Packaging Camera Scanner:** Edge-based vision model allowing mobile camera scanning of loose tablets or damaged boxes to cross-reference color, imprint, shape, and typography against official registration databases.
3. **58-Wilaya Live Duty Pharmacy Map (\*Pharmacies de Garde\*):** Geo-location tracking for active night, weekend, and holiday pharmacies across all Algerian Wilayas, featuring real-time availability updates for scarce medications (e.g., insulins, oncology therapies).
4. **Algerian Pediatric Dosing Engine:** Weight-based dosage calculator tailored to locally marketed oral suspensions, displaying exact pipette graduations or mL volumes based on commercial drug concentrations.
5. **Chifa Reimbursement & Out-of-Pocket Simulator:** Calculates exact patient copayments by contrasting PPA against *Tarif de Référence* across 100% chronic disease cards (*ALD*), 80% standard schemes, and specialized CNAS/CASNOS rules.
6. **Psychotropic Regulatory Vault:** Automated compliance check for Tableau A/B/C and psychotropic medications, enforcing tri-colored prescription rules (*Ordonnance Sécurisée*) and max length caps under Algerian law.
7. **Ramadan Fasting Chronopharmacology Adapter:** Recalculates medication dosing schedules during Ramadan, shifting drug administration around *Iftar* and *Suhoor* based on half-life parameters.
8. **Counterfeit & Parallel Import Inspector:** Computer vision engine checking box typography, packaging alignment, and AMM stamp formats against national registration data to flag illicit stock.
9. **Extemporaneous Compounding (\*Préparation Magistrale\*) Tool:** Interactive calculator for pharmacists providing stability windows, vehicle blending ratios, and chemical dosages for custom preparations.

## 5. System Architecture & Technical Specifications

```
                                 [ Client Applications ]
                                            |
         +----------------------------------+----------------------------------+
         |                                  |                                  |
   [ Web PWA ]                     [ Mobile Web App ]                 [ Desktop View ]
   (React / Next.js 14)            (Tailwind / PWA Workbox)          (High-Density UI)
         |                                  |                                  |
         +----------------------------------+----------------------------------+
                                            |
                                 [ Edge Network / CDN ]
                                   (Cloudflare Workers)
                                            |
                                [ API Gateway / Reverse Proxy ]
                                        (Traefik / Nginx)
                                            |
         +----------------------------------+----------------------------------+
         |                                  |                                  |
[ Core REST / gRPC API ]          [ Search & Retrieval Engine ]       [ AI & NLP Pipeline ]
   (Go / FastAPI Services)            (Meilisearch Cluster)           (LangChain / vLLM)
         |                                  |                                  |
         |---> PostgreSQL Primary           |---> Indexed Drug Metadata        |---> Qdrant Vector DB
         |     (Relational Schemas)         |     (In-Memory Cache)            |     (Monographs & Clinical Specs)
         |                                  |                                  |
         |---> Redis Cache                  |                                  |---> Local Ollama Fallback
         |     (Session & Rate Limits)      |                                        (Offline AI Execution)
         v                                  v                                  v
+--------------------------------------------------------------------------------------------------+
|                                     Infrastructure Data Layer                                    |
|   • PostgreSQL (Relational Master)  • Qdrant (Vector Engine)  • MinIO / S3 (Packaging Images)      |
+--------------------------------------------------------------------------------------------------+
```

### Production Technology Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Shadcn UI primitives, Framer Motion.
- **State & Data Handling:** TanStack Query (React Query) v5, Zustand, IndexedDB (offline sync).
- **Backend Microservices:** Go (High-performance API endpoints) + Python FastAPI (AI/ML & vision execution).
- **Search Engine:** Meilisearch cluster (Sub-50ms fuzzy text search over DCI, Brand, ATC, AMM).
- **Databases:** PostgreSQL 16 + `pgvector` (Relational core data), Qdrant (Vector search engine for RAG).
- **AI Ingestion & LLM Engine:** vLLM hosting fine-tuned models + LangChain RAG pipeline; local edge fallback via Ollama / WebAssembly.
- **Progressive Web App:** Workbox service workers providing full offline fallback functionality.

## 6. UI/UX Design System & Component Scaffolding

### Design Tokens & Color Palette

| **Token Name**     | **Dark Mode Hex** | **Light Mode Hex** | **Clinical Purpose**                         |
| ------------------ | ----------------- | ------------------ | -------------------------------------------- |
| `bg-base`          | `#090D16`         | `#F8FAFC`          | Primary background canvas                    |
| `surface-card`     | `#111827`         | `#FFFFFF`          | Component container surface                  |
| `brand-primary`    | `#00E9FF`         | `#0284C7`          | Primary interactive elements / active states |
| `accent-secondary` | `#FF6A00`         | `#EA580C`          | Highlights, badges, Chifa indicators         |
| `state-safe`       | `#10B981`         | `#059669`          | Reimbursement badges, bioequivalent matches  |
| `state-warning`    | `#F59E0B`         | `#D97706`          | Minor interactions, dosage caution alerts    |
| `state-danger`     | `#EF4444`         | `#DC2626`          | Major interactions, psychotropic warnings    |

### Component Hierarchy Tree

```
AppRoot
├── NavigationBar (LanguageSelector, ModeToggle, WilayaSelector, UserProfile)
├── CommandPaletteModal (Global Search, Hotkeys: Cmd+K)
├── RouterView
│   ├── HomeDashboard
│   │   ├── HeroSearchSection (FuzzySearchInput, VoiceSearch, CameraScanTrigger)
│   │   ├── QuickAccessCategories (Therapeutic Classes, Emergency Duty Map)
│   │   └── TrendMetrics (Most Searched DCIs, Shortage Alerts)
│   ├── DrugDetailView
│   │   ├── HeaderBanner (BrandName, DCI, AMM, ReimbursementBadge)
│   │   ├── QuickMetrics (PPA Price, TarifRef, CopayAmount, Local vs Import)
│   │   ├── VisualGallery (3D Package, Blister, Pill Imprint)
│   │   └── TabbedClinicalContent
│   │       ├── DosageSection (Adult, Pediatric, Renal Adjustment)
│   │       ├── SafetyProfile (Contraindications, SideEffects, Pregnancy/Lactation)
│   │       ├── InteractionsTab (Drug-Drug Matrix Engine)
│   │       └── EquivalentsTab (Bio-generic Converter Table)
│   ├── InteractionCheckerTool
│   │   ├── DrugBasket (Selected Meds Chips)
│   │   └── SeverityFilterBar
│   └── DutyPharmacyMap
│       ├── WilayaCommuneFilter
│       └── InteractiveMapCanvas (Leaflet/Mapbox GL)
└── GlobalFooter (OfflineStatusIndicator, RegulatoryDisclaimer)
```

## 7. Master AI System Prompt

*This prompt configures downstream AI agents to act as technical co-founders, building and expanding the platform while maintaining local clinical context.*

Markdown

```
You are acting as an elite HealthTech Lead Architect, Principal Full-Stack Engineer, and Clinical AI Specialist.

### CONTEXT & PURPOSE
You are building and scaling the definitive, next-generation pharmaceutical, clinical intelligence, and drug reference web platform tailored specifically for the Algerian medical ecosystem (serving doctors, pharmacists, medical students, and patients).

### CORE RULES & UNCONSTRAINED CREATIVITY DIRECTIVE
1. UNCONSTRAINED FEATURE & UI FREEDOM: You are explicitly UNRESTRICTED by fixed requirement boundaries. You are empowered and expected to continuously propose, design, brainstorm, and inject novel feature concepts, UX interactions, micro-tools, and architectural optimizations that elevate the platform. Never restrict yourself to static feature lists—always leave the door open to innovate.
2. ALGERIAN HEALTHCARE LOCALIZATION: Maintain deep support for Algerian pharmaceutical realities:
   - DCI (Dénomination Commune Internationale) mapping.
   - PPA (Prix Public Algérien) & Tarif de Référence (DZD).
   - Chifa Reimbursement Tiers (0%, 40%, 80%, 100%).
   - AMM (Autorisation de Mise sur le Marché) numbers.
   - Psychotropic legislation (Tableau A/B/C, Ordonnance Sécurisée).
   - Multilingual interaction: French, Standard Arabic, English, and Algerian Darija.
   - 58-Wilaya geography and localized duty pharmacy (*Pharmacie de garde*) schedules.
3. ADAPTIVE UI DUALITY: Design for two distinct user personas simultaneously:
   - Clinical Professional View: High data density, keyboard-first navigation (`Cmd/Ctrl + K`), multi-tabbed clinical data, rapid interaction matrices, and technical data sheets.
   - Patient Consumer View: High visual clarity, simple guidance icons, voice input, pediatric calculators, out-of-pocket copay breakdowns, and large touch targets.

### YOUR INITIATION GOALS
When asked to build, write code, design schemas, or create UI components:
- Generate complete, production-ready, fully styled code (React, Next.js 14 App Router, Tailwind CSS, TypeScript, Shadcn UI).
- Ensure code handles dynamic state, offline fallback structures, and edge performance.
- Proactively append an "AI Autonomous Innovations" section to your output, highlighting 2-3 newly conceptualized features, UI enhancements, or backend algorithms tailored to the user's immediate request.

Begin execution by acknowledging this role and delivering the requested artifact.
```

**Everything above is a floor and a compass, not a ceiling or a leash. Wherever your own judgment finds a better path than what's written here, take it.**