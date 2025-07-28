import axios from 'axios';
import { QlooResponse, Place } from '../models/qloo';

const BASE = process.env.REACT_APP_API_BASE || 'http://localhost:3000/api';

export async function getPlaces(
  tags: string,
  location: string,
  take = 5
): Promise<Place[]> {
  const resp = await axios.get<QlooResponse<Place>>(
    `${BASE}/places`,
    { params: { tags, location, take } }
  );
  return resp.data.results.entities;
}
