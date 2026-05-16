# Mlinzi wa Bajeti — County Budget Watchdog

**Ulinzi wa Fedha za Umma (Protecting Public Funds)**

Built for **Google Agentathon 2025**.

---

## 🇰🇪 The Problem
Kenya's 47 county governments manage billions of shillings in public funds. Every year, budgets are published as impenetrable 400+ page PDFs. For the average ward resident, journalist, or civic advocate, it is nearly impossible to:
1. Find specific allocations for their local projects.
2. Compare what was "promised" in the budget vs. what was actually "spent" in the Controller of Budget (OCOB) reports.
3. Hold officials accountable due to the technical jargon and sheer volume of data.

**Mlinzi wa Bajeti** (Swahili for "Budget Watchdog") solves this by turning complex fiscal documents into a plain-language accountability engine.

## Agent Architecture

### The Watchdog Agent
The core of the application is an AI Agent powered by **Gemini 1.5 Pro**. It is designed with a "Relentless Accountability" persona.

*   **Intelligence Base**: Gemini 1.5 Pro's massive context window allows it to "read" entire county budget PDFs and OCOB implementation reports simultaneously.
*   **Tools & Skills**:
    *   **PDF Reasoning**: Extracts exact line items, program codes, and page citations.
    *   **Discrepancy Engine**: A logic layer that calculates the gap between `Approved Allocation` and `Actual Expenditure`.
    *   **Multilingual NLP**: Automatically detects and responds in English or Swahili (standard 8 reading level).
    *   **SMS Generator**: Formats complex findings into 160-character alerts optimized for ward-level propagation.

### Communication Flow
1. **User Query**: Input in English or Swahili (e.g., *"Pesa ya barabara iko wapi?"*).
2. **Context Retrieval**: The agent scans the loaded budget PDF and implementation report.
3. **Fact Extraction**: Identifies the specific department (e.g., Roads) and its financial metrics.
4. **Accountability Check**: Compares the two figures and checks for Gazette Amendments.
5. **Human-Centric Output**: Provides a response with citations and a relatable comparison (e.g., "This gap could have built 5 clinics").

## Local Setup

To run Mlinzi wa Bajeti locally:

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/your-repo/mlinzi-wa-bajeti.git
    cd mlinzi-wa-bajeti
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Configure API Key**:
    Create a `.env` file in the root directory and add your Gemini API key:
    ```env
    GEMINI_API_KEY=your_actual_api_key_here
    ```

4.  **Start Development Server**:
    ```bash
    npm run dev
    ```
    The app will be available at `http://localhost:3000`.

## How to Interact

1.  **Select County & Year**: Use the dashboard header to select a county (e.g., Makueni) and the target Financial Year.
2.  **Check the Radar**: The "Discrepancy Radar" automatically flags departments with high spending gaps (>40%).
3.  **Ask Questions**: Use the chat panel to ask specific questions like "How much went to health?" or "Who is the MCA for Ward X?"
4.  **Generate Alerts**: Click "English SMS" or "Kiswahili SMS" to get a ready-to-send accountability message for your local WhatsApp groups or SMS lists.
5.  **Flag This**: Use the red "Flag This" buttons on the radar to get a deep-dive explanation of a specific financial anomaly.

## Data Handling & Political Neutrality Policy

*   **Fact-First Integrity**: Mlinzi wa Bajeti never speculates. If a figure isn't in the provided official documents, the agent states it is "unavailable" and directs the user to file an Access to Information request.
*   **Neutral Terminology**: The agent uses neutral, factual terms like "unaccounted for," "spending gap," or "variation." It avoids words like "stolen" or "corruption," leaving the conclusion of intent to the proper authorities while providing the evidence.
*   **Source Transparency**: Every answer includes a citation (Page #, Department, Document Title) to ensure the data can be manually verified by journalists or officials.
*   **Privacy**: No user data is stored. All analysis happens in-session.

## Team Members & Roles

*   **Anne Mwema**: Data Scientist
*   **Faith Mwikali**: Developer

*   **Stephanie Makori**: DevOps
*   **Fauzan Said**: Cloud Engineer

*   **James Munyoki**: Developer
*   


---
*Built for Google Agentathon 2025 · "Civic Brutalism meets Kenyan Government Accountability"*
