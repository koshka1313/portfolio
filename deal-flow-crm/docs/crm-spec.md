# Deal Flow CRM — Product Specification

**Version:** 1.0  
**Date:** October 2026  
**Owner:** Investor Relations & Corporate Development  
**Status:** Draft

---

## 1. Overview

An internal relationship tracking and deal flow management tool for a bank's coverage of private, growth-stage companies (Series C/D). The application captures conference introductions, tracks multi-division engagement over time, and records deal outcomes — giving the IR and business development teams a single source of truth on every company relationship from first touch to closed mandate.

### 1.1 Problem Statement

Coverage of pre-IPO companies involves multiple internal divisions engaging the same company at different points in its lifecycle. Today, these touch points are siloed: bankers don't know what equity research has said, wealth management doesn't know which founders are already in the IB pipeline, and there is no unified view of how a relationship progressed from a conference introduction to a closed deal. This tool solves that.

### 1.2 Goals

- Capture every touch point across all bank divisions from initial conference meeting onward
- Track the progression of relationships over 3 months to 3 years
- Record deal outcomes and monetization events against the originating relationship
- Give each division a filtered, compliance-appropriate view of their own activity
- Give the admin/owner a unified 360° view across all divisions

---

## 2. User Roles & Access Control

Each division accesses the application via a PIN-protected login. Data visibility is restricted by role.

| Role | Login PIN | What They See |
|---|---|---|
| **Admin** | `0000` | Everything — all interactions, all deals, all divisions, analytics |
| **Investment Banking** | `1111` | IB interactions and deals only |
| **Equity Research** | `2222` | ER interactions and deals only |
| **Wealth Management** | `3333` | WM interactions and deals only |
| **Asset Management** | `4444` | AM interactions and deals only |
| **Direct Investment** | `5555` | DI interactions and deals only |
| **Corporate Finance** | `6666` | CF interactions and deals only |
| **Leveraged Finance** | `7777` | LevFin interactions and deals only |

### 2.1 Firewall Rules

- An interaction logged by Equity Research is **not visible** to Investment Banking, and vice versa
- A deal owned by Leveraged Finance is **not visible** to Wealth Management
- Admin bypasses all firewalls — full visibility across all divisions
- Company and contact records (names, titles, sectors) are visible to all roles
- Interaction *content* (notes, outcomes, deal terms) is division-restricted

---

## 3. Data Model

### 3.1 Companies

Each company is a private, growth-stage business that was met through a conference or referred by a division.

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique identifier |
| `name` | string | Company name (fictional) |
| `sector` | string | SaaS, Fintech, Healthtech, Biotech, Climate/Energy, Logistics, Cybersecurity, AI/ML, Robotics, Edtech, Proptech, E-commerce |
| `stage` | string | Series C, Series D |
| `status` | string | Prospect, Engaged, In Diligence, Client, Closed |
| `hq` | string | Headquarters city |
| `founded` | number | Year founded |
| `employeeCount` | string | Approximate headcount range |
| `description` | string | One-line business description |

**Status definitions:**
- **Prospect** — Introduced at a conference; no active dialogue
- **Engaged** — Active conversations, at least one formal interaction
- **In Diligence** — Deep engagement, term sheet or mandate under discussion
- **Client** — Active mandate or completed deal
- **Closed** — Relationship ended (deal lost, company acquired, went public with another bank)

### 3.2 Contacts

Individuals at portfolio companies, typically C-suite and senior finance/strategy.

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique identifier |
| `name` | string | Full name |
| `title` | string | Job title |
| `companyId` | string | Reference to company |
| `company` | string | Company name (denormalized) |
| `eventsAttended` | string[] | List of conferences where they were met |

### 3.3 Interactions

A touch point between a bank division and a company contact. The core unit of the relationship timeline.

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique identifier |
| `companyId` | string | Reference to company |
| `contactId` | string | Reference to contact |
| `division` | string | Bank division that owns this interaction |
| `type` | string | See interaction types below |
| `date` | string | ISO date (YYYY-MM-DD) |
| `notes` | string | Meeting notes / context |
| `outcome` | string | Next step or result |

**Interaction types:**
- Conference Intro
- Introductory Call
- In-Person Meeting
- Pitch
- Due Diligence
- Follow-up
- Deal Discussion
- Coverage Initiation
- Other

### 3.4 Deals

A monetization event resulting from (or in progress due to) the bank's relationship with a company.

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique identifier |
| `companyId` | string | Reference to company |
| `division` | string | Bank division owning the deal |
| `type` | string | Deal type (see below) |
| `status` | string | Deal status (see below) |
| `value` | number | Deal value in USD (0 if not yet known) |
| `dateEngaged` | string | Date the engagement/mandate began |
| `dateClosed` | string | Date deal closed (if applicable) |
| `description` | string | Deal summary |

**Deal types:**
- IPO (public offering)
- M&A Advisory — Sell-Side
- M&A Advisory — Buy-Side
- Private Placement
- Stake Sale / Secondary
- Leveraged Finance — Credit Facility
- Leveraged Finance — LBO Financing
- Leveraged Finance — Green/Infrastructure Debt
- Direct Investment — Co-Investment
- Wealth Management — Client Conversion
- Asset Management — Fund Investment
- Equity Research — Coverage
- Project Finance

**Deal statuses:**
- Pipeline
- In Diligence
- Term Sheet
- Signed
- Closed Won
- Closed Lost

---

## 4. Application Views

### 4.1 Login Screen

- Grid of role cards (8 total)
- Click a role → PIN entry modal
- Wrong PIN shows error; correct PIN enters the app

### 4.2 Dashboard

Visible to all roles. Content filtered by division.

- **Stats row:** Total companies tracked, active interactions (last 90 days), open deals, closed deal value (YTD)
- **Recent Interactions:** Last 5 interactions (division-filtered)
- **Pipeline Summary:** Open deals by status (division-filtered)
- **Top Companies:** Most-interacted companies in the last 6 months

### 4.3 Companies

A searchable, filterable list of all tracked companies.

- Columns: Name, Sector, Stage, Status, Last Interaction, Open Deals
- Filters: Sector, Stage, Status, Division activity
- Search: by company name
- Click row → Company Detail view

### 4.4 Company Detail

The most important view in the application. Tabs:

**Overview tab:**
- Company header (name, sector, stage, status badge, HQ, founded)
- Description
- Key metrics: total interactions, open deals, total closed deal value, first touch date, latest activity date

**Timeline tab:**
- Chronological list of all interactions (filtered by division for non-admin)
- Each entry shows: date, division badge (color-coded), interaction type, contact name & title, notes, outcome
- Admin sees all divisions' timelines with clear visual separation

**Deals tab:**
- All deals associated with this company (filtered by division)
- Each deal shows type, status badge, value, engaged date, owning division, description

**Contacts tab:**
- All contacts at this company
- Name, title, conferences attended

### 4.5 Contacts

A table of all 100+ tracked individuals.

- Columns: Name, Title, Company, Conferences Attended, Last Interaction
- Searchable by name or company
- Click row → Company Detail

### 4.6 Interactions Log

A filterable feed of all interactions the current division has logged.

- Filters: Company, Interaction Type, Date Range
- Sort: Newest first (default)
- **+ Log Interaction button** opens the interaction modal
- Admin can filter by division

### 4.7 Pipeline (Deals)

A deal board or table view of all active and closed deals.

- Default view: Kanban-style columns by status (Pipeline → In Diligence → Term Sheet → Signed → Closed Won)
- Each card shows: company name, deal type, division, value (if known)
- Toggle to table view
- **+ Add Deal button** opens the deal modal
- Admin sees all divisions; others see their own

### 4.8 Analytics *(Admin only)*

Four charts + summary KPIs:

1. **Deal Funnel** — Companies by status (Prospect → Engaged → In Diligence → Client)
2. **Deal Value by Type** — Bar chart of total closed value per deal type
3. **Division Activity** — Interactions per month per division (stacked bar, 12 months)
4. **Sector Breakdown** — Distribution of tracked companies by sector (doughnut)

KPI cards above charts:
- Total companies tracked
- Total interactions logged
- Total closed deal value
- Avg days from first touch to closed deal

---

## 5. Modals

### 5.1 Log Interaction

Fields:
- Company (dropdown, required)
- Contact (dropdown filtered by company, required)
- Division (pre-filled for division users; dropdown for admin)
- Type (dropdown)
- Date (date picker, defaults to today)
- Notes (textarea)
- Outcome / Next Steps (textarea)

### 5.2 Add Deal

Fields:
- Company (dropdown, required)
- Division (pre-filled for division users; dropdown for admin)
- Deal Type (dropdown)
- Status (dropdown, defaults to Pipeline)
- Estimated Value USD (number, optional)
- Date Engaged (date picker)
- Date Closed (date picker, optional)
- Description (textarea)

---

## 6. Seed Data

| Dataset | Count |
|---|---|
| Companies | 40 |
| Contacts | 100 |
| Conferences | 6 |
| Seed Interactions | ~85 (spanning Oct 2023 – Jan 2025) |
| Seed Deals | 22 (mix of pipeline, in-progress, and closed) |

**Conferences in dataset:**
1. SaaS Growth Summit
2. Scale-Up Finance Summit
3. Private Markets IR Forum
4. Pre-IPO Readiness Conference
5. Venture Forward Conference
6. Annual Investor Day Forum

---

## 7. Relationship Progression — Example Flows

### 7.1 Conference → IPO

| Date | Division | Touch Point |
|---|---|---|
| Sep 2023 | Wealth Management | Conference intro — founder seeks personal planning |
| Jan 2024 | Wealth Management | WM account opened |
| Mar 2024 | Investment Banking | WM refers company to IB |
| Jun 2024 | Investment Banking | IPO pitch — mandate awarded |
| Sep 2024 | Equity Research | Pre-IPO coverage discussion |
| Feb 2025 | Investment Banking | S-1 filing in progress |
| Jun 2025 | Investment Banking | **Deal closed — IPO, $320M** |

### 7.2 Conference → M&A Advisory

| Date | Division | Touch Point |
|---|---|---|
| Oct 2023 | Equity Research | Conference intro — initiating coverage |
| Jan 2024 | Equity Research | Follow-up on financials |
| Feb 2024 | Investment Banking | ER refers company to IB |
| May 2024 | Investment Banking | M&A pitch to board |
| Oct 2024 | Investment Banking | Data room / due diligence |
| Jan 2025 | Investment Banking | Engagement letter signed |

### 7.3 Conference → Leveraged Finance

| Date | Division | Touch Point |
|---|---|---|
| Nov 2023 | Direct Investment | Conference intro |
| Feb 2024 | Direct Investment | DI passes on equity |
| Jul 2024 | Leveraged Finance | $75M growth credit facility discussion |
| Oct 2024 | Leveraged Finance | **Deal closed — credit facility, $75M** |

---

## 8. Technical Approach

### 8.1 Implementation

- **Single HTML file** (`crm.html`) — portable, no server required, shareable internally
- **Vanilla JavaScript** — no framework dependencies
- **Chart.js** (CDN) — analytics charts
- **localStorage** — persists new interactions and deals added during sessions
- **Seed data** — embedded as JS constants; user additions layered on top

### 8.2 Compliance / Firewall

- Division filtering is enforced entirely client-side via the role stored in session state
- This is appropriate for an internal prototype; production deployment would require server-side auth and row-level security (e.g., Supabase RLS or equivalent)
- Recommended production stack: Supabase (auth + RLS) + React frontend

### 8.3 Design

- Dark theme, green accent (`#00e676`) — matches internal design language
- Division badges color-coded: IB orange, ER blue, WM purple, AM violet, DI cyan, CF yellow, LevFin red-orange
- Responsive layout: fixed sidebar + scrollable content area
- Modals for all data entry

---

## 9. Out of Scope (v1)

- Email / calendar integration
- Document upload (pitch decks, term sheets)
- Mobile app
- CRM sync (Salesforce, HubSpot)
- Multi-user concurrent editing
- Audit log
- Server-side auth / production deployment

---

## 10. Future Enhancements (v2+)

- Supabase backend with real per-division auth and RLS
- File attachments per interaction/deal
- Email-to-CRM logging
- Automated reminders for stale relationships (no contact in 90 days)
- Export to Excel / PDF
- Integration with Bloomberg / PitchBook for auto-enriching company profiles
- Public company tracking (post-IPO monitoring of past clients)
