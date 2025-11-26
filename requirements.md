# Market Compensation Survey System - Requirements Document

## 1. Project Overview
The Market Compensation Survey System is a web-based application designed to streamline the process of collecting, analyzing, and reporting on market salary data for specific job positions. It automates the "crawling" (via AI simulation) of recruitment data and performs statistical analysis to derive key compensation benchmarks (P25, P50, P75).

## 2. Functional Requirements

### 2.1 Data Collection (Crawling Simulation)
*   **Target Definitions:** The system allows defining target job positions with specific attributes:
    *   Job Name (e.g., Cross-border Supplier Development)
    *   Job Category
    *   Responsibilities Snippet
    *   Search Keywords
    *   Competitor List
*   **Simulated Crawling:** Due to browser limitations, the system uses the Gemini API to generate realistic market data based on the defined keywords and competitors.
*   **Data Points:** For each crawled job, the system captures:
    *   External Job Title
    *   Company Name
    *   Base Location (City)
    *   Monthly Salary Range (Min/Max)
    *   Months Per Year (e.g., 12, 13, 14 salary structure)
    *   Benefits (e.g., Meal allowance, Overtime pay)

### 2.2 Data Analysis & Calculation
*   **Data Aggregation:** Consolidates data per target position.
*   **Filtering:** Users can filter the dataset used for calculation by:
    *   **Base Location:** (e.g., Guangzhou, Shenzhen, Fuzhou).
    *   **Competitors:** Filter specifically for defined competitor companies vs. general market data.
*   **Statistical Formulas:**
    *   **Linear Interpolation Method:**
        *   Sort data ascending ($n$ items).
        *   Calculate Position $L = (Percentile / 100) * (n + 1)$.
        *   Interpolate value between floor($L$) and ceil($L$).
    *   **Metrics:** Low (Min), P25, P50 (Median), P75, High (Max).
    *   **Dimensions:** Both Monthly Salary and Total Annual Compensation.

### 2.3 Visualization
*   **Raw Data View:** A tabular view of all collected job postings for transparency.
*   **Summary Dashboard:**
    *   Card-based layout for each Target Position.
    *   Comparative tables for Monthly vs. Yearly stats.
    *   Visual Bar Charts comparing Median (P50) salaries across positions.

## 3. Non-Functional Requirements
*   **UI/UX:** Minimalist, clean interface using Tailwind CSS.
*   **Performance:** Client-side calculation for instant feedback when filtering.
*   **Reliability:** Fallback mechanisms for API generation failures.
*   **Privacy:** No real user data is stored; session-based data handling.

## 4. Technical Stack
*   **Frontend:** React 18, TypeScript, Vite.
*   **Styling:** Tailwind CSS.
*   **Charts:** Recharts.
*   **AI Integration:** Google Gemini API (via `@google/genai`).
