import React, { useState } from 'react';
import { Place } from './models/qloo'; 
import { getPlaces } from './api/qlooApi';
import { PlaceList } from './components/PlaceList';
import { Gamification } from './components/Gamification';
import { ChatBox } from './components/ChatBox';

function App() {
  const [places, setPlaces] = useState<Place[]>([]);

  async function fetchItalianRome() {
    const data = await getPlaces(
      'urn:tag:genre:restaurant:Italian',
      'Rome',
      5
    );
    setPlaces(data);
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Cultural Travel Companion</h1>

      <section>
        <h2>1. Recommendations</h2>
        <button onClick={fetchItalianRome}>
          Load Italian Restaurants in Rome
        </button>
        <PlaceList places={places} />
      </section>

      <section>
        <Gamification />
      </section>

      <section>
        <ChatBox userId="user1" />
      </section>
    </div>
  );
}

export default App;
