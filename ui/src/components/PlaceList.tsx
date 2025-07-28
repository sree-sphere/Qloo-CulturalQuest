import React from 'react';
import { Place } from '../models/qloo';

interface Props {
  places: Place[];
}

export function PlaceList({ places }: Props) {
  if (places.length === 0) {
    return <p>No recommendations found.</p>;
  }
  return (
    <ul>
      {places.map(p => (
        <li key={p.entity_id}>
          <strong>{p.name}</strong><br />
          {p.properties.address}<br />
          Rating: {p.properties.business_rating ?? 'N/A'}
        </li>
      ))}
    </ul>
  );
}
