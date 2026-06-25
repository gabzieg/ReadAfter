# ReadAfter 📱🚀

**ReadAfter** is a full-stack application (Python/FastAPI Backend and React Native/Expo Mobile App) that allows downloading, processing, and analyzing social media videos using AI APIs.

---

## 🛠️ Tech Stack

- **Mobile:** React Native, Expo, React Navigation, Axios
- **Backend:** Python, FastAPI, SQLite
- **Artificial Intelligence:** Integration with AI APIs for frame analysis and transcription

---

## 🚀 Getting Started

Follow this guide to run the backend and the mobile app on your machine quickly.

### Prerequisites
- [Node.js](https://nodejs.org/) (Version 18+ recommended)
- [Python](https://www.python.org/) (Version 3.10+)
- An API Key for your preferred AI service (e.g., Google AI Studio, OpenAI, etc., depending on your backend implementation).
- The [Expo Go App](https://expo.dev/go) installed on your phone (for physical testing) or a configured Android/iOS Emulator.

### 1. Clone and Setup

Clone the repository:
```bash
git clone https://github.com/YourUsername/ReadAfter.git
cd ReadAfter
```

Configure the environment variables:
```bash
cp .env.example .env
```
👉 Open the generated `.env` file and fill in your `GOOGLE_API_KEY` (or the respective key for your AI provider). Adjust the IP in `EXPO_PUBLIC_API_URL` if you are testing via a physical phone on your local Wi-Fi.

### 2. Running the Backend (API)

Open a terminal in the project root, install the dependencies, and start the server:

```bash
# Create and activate the virtual environment
python -m venv venv

# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the application
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
The API is now available at `http://localhost:8000`.

### 3. Running the Mobile App (Frontend)

Open **another** terminal in the project root:

```bash
# Install Node dependencies
npm install

# Start the Expo Metro server
npm start
```
After running `npm start`, scan the **QR Code** using the **Expo Go** app on your phone, or press `a` / `i` to open it on an emulator.

---

## 🤝 Contributing

Pull Requests are welcome! Feel free to open an issue or submit a PR if you have improvements, bug fixes, or new AI integrations.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
