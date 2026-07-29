import rawSpots from '@/data/rest-spots.json';
import { Chair, RestSpot, restSpotToChair } from '@/types/chair';

export const restSpots = rawSpots as RestSpot[];
export const chairs: Chair[] = restSpots.map(restSpotToChair);
