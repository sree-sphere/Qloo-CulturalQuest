# CulturalQuest 🌍

A gamified cultural exploration platform that helps new migrants and cultural enthusiasts discover authentic local experiences through AI-powered recommendations, interactive chat, and immersive rewards system.

CulturalQuest blends Qloo’s Taste AI™ with OpenAI’s ChatGPT and ElevenLabs TTS to redefine personalized discovery. CulturalQuest uses advanced recommendation‑system techniques (semantic embeddings, MMR, affinity‑diversity trade‑off) with an engaging, points‑n‑badges UX.

---

## 🎯 Why CulturalQuest?

### Inspiration

As a migrant child in Austin, TX in late 2000s, I relied on a site called **[Sulekha](https://us.sulekha.com/)**—a one-stop guide to local stores, eateries, rentals, contact details, festivals (melas), and cultural spots—for navigating life as a migrant. It helped thousands of newcomers build familiarity in a new city through culturally relevant information.

Today, Austin is home to **≈296,000 foreign-born residents** (14% of the city's total population, by [Vera Institute](https://vera-institute.files.svdcdn.com/production/downloads/publications/profile-foreign-born-population-austin.pdf)).

**CulturalQuest** evolves that vision with Qloo’s Taste AI™ and LLMs to deliver real-time, privacy-first recommendations that resonate with users’ heritage and evolving tastes.

### Character Assets

- The **Sahayak** (meaning “helper”) assistant character draws inspiration from the anime/J‑drama **_Trillion Game_**, where the AI named “Turinin” guides customers toward their best-fit choices through intuitive intelligence and contextual suggestions.
- **Images:** generated using my profile image as reference, with FLUX.1‑Kontext‑Dev space on Hugging Face:  
  https://huggingface.co/spaces/black-forest-labs/FLUX.1-Kontext-Dev  
- **Videos:** rendered via ChatGPT’s video API.

---

## ✨ Features

- **Contextual Recommendations**  
  - Uses a **semantic similarity** pipeline via SentenceTransformer embeddings (`all-MiniLM-L6-v2`) + **cosine similarity**  
  - Applies **Maximal Marginal Relevance (MMR)** two‑phase selection to balance **relevance** (λ≈0.7) and **novelty/diversity** (λ≈0.3)  
  - Supports high‑affinity “top‑k” picks and diversified fill‑ins for rich discovery  

- **Cultural Gamification**  
  - Points, levels, badges (like “Festival of Lights Explorer”) via `qloo_gamification_sdk.ts`  
  - User affinity vector updates on interactions (likes/unlikes) with learning‑rate adjustments  

- **AI Chat Assistant**  
  - `chat/route.ts` proxy to ChatGPT, enriched with:  
    - Full API context (entities’ descriptions, hours, amenities)  
    - User profile metadata (demographics, preferences, streaks)  
  - Streaming responses with live video/photo backgrounds  

- **Text‑to‑Speech Playback**  
  - `/api/tts` (`tts/route.ts`) calls ElevenLabs to generate audio blobs  
  - Synchronized video overlays and fallback to static imagery  

- **Modes**  
  - “Nostalgic” (similarity-based reordering) mode caches & reorders recommendations by user‑liked similarity scores
  - “Adventure” (diversity-driven discovery) 
  - “Social” mode filters recommendations by user profile-based affinity vectors and uses chat for itinerary

---

## Tech Stack

- **Frontend**: Next.js + TypeScript + React + Tailwind CSS  
- **Backend**: Next.js API routes (`route.ts`)  
  - `chat/route.ts` → OpenAI Chat API  
  - `tts/route.ts`  → ElevenLabs TTS API  
- **Python ML Engine** (`smart_diversification.py`):  
  - `sentence-transformers`  
  - `scikit‑learn` (cosine_similarity)  
  - NumPy for diversity metrics  
- **SDKs**:  
  - `@devma/qloo` + `QlooCulturalGamification`  
- **Environment**:  
  - Conda (`qloo-ts`) for Python  
  - Node.js (≥14) for Next.js  

---

## Folder Tree

```
.
├── public/
│   ├── qloo_assets/…                       # Avatar Images and Assistant video responses
│   └── …  
├── src/
│   ├── app/
│   │   └── api/
│   │       ├── chat/route.ts               # ChatGPT API streaming proxy
│   │       └── tts/route.ts                # ElevenLabs TTS proxy
│   ├── components/
│   │   └── cultural_gamification_ui.tsx    # React Gamification UI component (main)
│   └── lib/
│       └── qloo_gamification_sdk.ts        # Qloo SDK wrapper
├── smart_diversification.py                # Offline diversification script
├── requirements.txt
├── package.json                            # Node.js deps & scripts
├── tsconfig.json
└── README.md
```

---

## Setup
### Prerequisites

- Node.js 18+
- npm or yarn

### API Keys for:

- Qloo API
- OpenAI GPT
- ElevenLabs

### Environment Variables
Create a .env.local file:
```
NEXT_PUBLIC_QLOO_API_KEY=
OPENAI_API_KEY=
ELEVENLABS_API_KEY=
```

## Installation
Conda Environment (Python)
```
conda create -n qloo-ts python=3.10
conda activate qloo-ts
pip install -r requirements.txt
```
```
# Optional: full reproducibility
conda env export --name qloo-ts > environment.yml
```

Node.js Setup (Next.js + TypeScript): default on http://localhost:3000
```
npm install
npm run dev
```

---