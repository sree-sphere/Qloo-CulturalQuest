export interface Place {
  name: string;
  entity_id: string;
  properties: {
    address?: string;
    website?: string;
    phone?: string;
    business_rating?: number;
    is_closed?: boolean;
    menu_url?: string;
    keywords?: Array<{ name: string; count: number }>;
  };
}

export interface QlooResponse<T> {
  success: boolean;
  results: {
    entities: T[];
  };
}
