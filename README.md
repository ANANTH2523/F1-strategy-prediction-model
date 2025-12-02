<div align="center">
   
![PHOTO-2025-11-26-11-41-33](https://github.com/user-attachments/assets/34a1a3c0-3f38-44d6-b941-a9ca54f2ed3d)

![PHOTO-2025-11-26-11-41-33](https://github.com/user-attachments/assets/e19ffecb-b39e-473b-a000-7dbab21b3130)

![PHOTO-2025-11-26-11-41-33](https://github.com/user-attachments/assets/a31d9019-d075-4100-ad4d-77505a2263b9)

![PHOTO-2025-11-26-11-42-19](https://github.com/user-attachments/assets/46bbb05a-dc5a-4b52-94eb-bde9d087faa5)

![PHOTO-2025-11-26-11-42-19](https://github.com/user-attachments/assets/d8e5651c-1cc6-4418-927c-7dd31edff793)

</div>

# F1 Race Strategy Analyst (2026 Edition)

An AI-powered Formula 1 race strategy predictor and simulator, updated for the **2026 season**.

## Features

- **2026 Driver Lineup**: Full 22-car grid including **Audi**, **Cadillac**, and **Racing Bulls**.
- **AI Scenario Generation**: Generate realistic race scenarios with Gemini AI.
- **Custom Scenarios**: Manually configure track, weather, and grid positions.
- **Strategy Analysis**: Get optimal pit stop strategies (Plan A & Plan B).
- **Race Simulation**: Simulate the full race lap-by-lap with tire wear modeling.

## Run Locally

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- A [Google Gemini API Key](https://aistudio.google.com/app/apikey)

### Installation

1.  **Clone the repository:**

    ```bash
    git clone <repository-url>
    cd F1-strategy-prediction-model-1
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Configure Environment Variables:**
    Create a `.env.local` file in the root directory and add your API key:

    ```env
    GEMINI_API_KEY=your_actual_api_key_here
    ```

4.  **Run the development server:**

    ```bash
    npm run dev
    ```

5.  **Open the app:**
    Visit `http://localhost:5173` in your browser.

## Deployment (Vercel)

This project is optimized for deployment on [Vercel](https://vercel.com).

1.  Push your code to a GitHub repository.
2.  Import the project into Vercel.
3.  **Environment Variables**: In the Vercel project settings, add the following environment variable:
    - `GEMINI_API_KEY`: Your Google Gemini API Key.
    - (Optional) `GOOGLE_AI_API_KEY`: Alternative name supported by the app.
4.  Deploy!

## Troubleshooting

- **Blank Screen?** Ensure your API key is correctly set in `.env.local` (locally) or Vercel Environment Variables (production). The app requires a valid key to initialize the AI client.
- **2026 Drivers Missing?** Ensure you are on the latest version of the code. The "Custom Input" form and AI generation are hardcoded to use the 2026 grid data.
