import json
import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import os
import argparse
from typing import List, Dict, Any, Tuple
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SmartDiversificationEngine:
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        self.model = SentenceTransformer(model_name)
        logger.info(f"Loaded SentenceTransformer model: {model_name}")
    
    def extract_entity_features(self, entity: Dict[str, Any]) -> str:
        """
        Flatten an entity into a descriptive string combining name, description, tags, etc.
        Handles both original format and Qloo API format.
        """
        features = []
        
        # Handle different entity formats
        name = entity.get('name', '')
        features.append(name)
        
        # Description from properties or direct
        description = (
            entity.get('properties', {}).get('description', '') or 
            entity.get('description', '')
        )
        features.append(description)
        
        # Tags handling
        tags = entity.get('tags', [])
        if tags:
            # Cuisine/category tags
            cuisine_tags = [
                tag.get('name', '') for tag in tags 
                if 'cuisine' in tag.get('type', '') or 'category' in tag.get('type', '')
            ]
            features.extend(cuisine_tags)
            
            # Amenity tags
            amenity_tags = [
                tag.get('name', '') for tag in tags 
                if 'amenity' in tag.get('type', '') or 'offerings' in tag.get('type', '')
            ]
            features.extend(amenity_tags)
        
        # Specialty dishes
        properties = entity.get('properties', {})
        specialty_dishes = properties.get('specialty_dishes', [])
        if specialty_dishes:
            dish_names = [dish.get('name', '') for dish in specialty_dishes]
            features.extend(dish_names)
        
        # Good for tags
        good_for = properties.get('good_for', [])
        if good_for:
            good_for_tags = [item.get('name', '') for item in good_for]
            features.extend(good_for_tags)
        
        # Address/location info
        address = properties.get('address', '')
        if address:
            features.append(address)
        
        # Business type (for Qloo entities)
        entity_type = entity.get('type', '')
        if entity_type:
            features.append(entity_type)
        
        return ' '.join(filter(None, features))
    
    def calculate_mmr_scores(
        self, 
        entities: List[Dict[str, Any]], 
        user_preferences: List[str],
        selected_entities: List[Dict[str, Any]] = None,
        lambda_param: float = 0.7
    ) -> List[Tuple[int, float]]:
        """
        Compute MMR (Maximal Marginal Relevance) score for each entity.
        """
        if selected_entities is None:
            selected_entities = []
        
        entity_features = [self.extract_entity_features(entity) for entity in entities]
        user_query = ' '.join(user_preferences)
        
        # Generate embeddings
        entity_embeddings = self.model.encode(entity_features)
        user_embedding = self.model.encode([user_query])
        
        # Calculate relevance scores
        relevance_scores = cosine_similarity(entity_embeddings, user_embedding).flatten()
        mmr_scores = []
        
        for i, _ in enumerate(entities):
            relevance = relevance_scores[i]
            
            # Calculate diversity penalty
            if selected_entities:
                selected_features = [self.extract_entity_features(sel) for sel in selected_entities]
                selected_embeddings = self.model.encode(selected_features)
                similarities = cosine_similarity([entity_embeddings[i]], selected_embeddings).flatten()
                max_similarity = np.max(similarities) if similarities.size > 0 else 0
            else:
                max_similarity = 0
            
            # MMR formula
            mmr_score = lambda_param * relevance - (1 - lambda_param) * max_similarity
            mmr_scores.append((i, mmr_score))
        
        return mmr_scores
    
    def diversify_recommendations(
        self,
        entities: List[Dict[str, Any]],
        user_preferences: List[str],
        n_total: int = 8,
        n_high_affinity: int = 3,
        lambda_param: float = 0.7
    ) -> List[Dict[str, Any]]:
        """
        Select diversified recommendations using two-phase MMR.
        """
        if not entities:
            return []
        
        selected = []
        remaining = entities.copy()
        
        # Phase 1: High-affinity items
        for _ in range(min(n_high_affinity, len(remaining))):
            mmr_scores = self.calculate_mmr_scores(remaining, user_preferences, selected, lambda_param)
            mmr_scores.sort(key=lambda x: x[1], reverse=True)
            
            if mmr_scores:
                best_idx = mmr_scores[0][0]
                selected.append(remaining.pop(best_idx))
        
        # Phase 2: Diversity-focused items
        diversity_lambda = 0.3
        
        while len(selected) < min(n_total, len(entities)) and remaining:
            mmr_scores = self.calculate_mmr_scores(remaining, user_preferences, selected, diversity_lambda)
            mmr_scores.sort(key=lambda x: x[1], reverse=True)
            
            if mmr_scores:
                best_idx = mmr_scores[0][0]
                selected.append(remaining.pop(best_idx))
            else:
                break
        
        return selected
    
    def analyze_diversity(self, entities: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Analyze diversity metrics of selected recommendations.
        """
        if not entities:
            return {}
        
        cuisines = set()
        price_ranges = []
        ratings = []
        entity_types = set()
        
        for entity in entities:
            # Extract cuisines from tags
            tags = entity.get('tags', [])
            for tag in tags:
                tag_type = tag.get('type', '')
                if 'cuisine' in tag_type or 'category' in tag_type:
                    cuisines.add(tag.get('name', ''))
            
            # Extract entity types
            entity_type = entity.get('type', '')
            if entity_type:
                entity_types.add(entity_type)
            
            # Price ranges
            properties = entity.get('properties', {})
            price_range = properties.get('price_range', {})
            if price_range and isinstance(price_range, dict):
                price_from = price_range.get('from', 0)
                price_to = price_range.get('to', 0)
                if price_from or price_to:
                    price_ranges.append((price_from + price_to) / 2)
            
            # Ratings
            rating = properties.get('business_rating', 0)
            if rating and rating > 0:
                ratings.append(rating)
        
        return {
            'unique_cuisines': len(cuisines),
            'cuisine_types': list(cuisines),
            'unique_entity_types': len(entity_types),
            'entity_types': list(entity_types),
            'price_range_std': np.std(price_ranges) if price_ranges else 0,
            'rating_range': (min(ratings), max(ratings)) if ratings else (0, 0),
            'avg_rating': np.mean(ratings) if ratings else 0,
            'total_entities': len(entities)
        }

def load_data(file_path: str) -> List[Dict[str, Any]]:
    """Load entities from JSON file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        entities = []
        if isinstance(data, dict):
            if 'entities' in data:
                entities = data['entities']
            elif 'results' in data and 'entities' in data['results']:
                entities = data['results']['entities']
        elif isinstance(data, list):
            entities = data
        
        logger.info(f"Loaded {len(entities)} entities from {file_path}")
        return entities
    
    except Exception as e:
        logger.error(f"Error loading data from {file_path}: {e}")
        return []

def main():
    parser = argparse.ArgumentParser(description='Smart Diversification Engine')
    parser.add_argument('--input', required=True, help='Input JSON file path')
    parser.add_argument('--output', required=True, help='Output JSON file path')
    parser.add_argument('--preferences', required=True, help='User preferences as JSON string')
    parser.add_argument('--n_total', type=int, default=8, help='Total number of recommendations')
    parser.add_argument('--n_high_affinity', type=int, default=3, help='Number of high-affinity items')
    parser.add_argument('--lambda_param', type=float, default=0.7, help='MMR lambda parameter')
    
    args = parser.parse_args()
    
    # Initialize engine
    engine = SmartDiversificationEngine()
    
    # Load entities
    entities = load_data(args.input)
    if not entities:
        logger.error("No entities loaded")
        return
    
    # Parse user preferences
    try:
        user_preferences = json.loads(args.preferences)
    except json.JSONDecodeError:
        logger.error("Invalid preferences JSON")
        return
    
    # Run diversification
    diversified = engine.diversify_recommendations(
        entities=entities,
        user_preferences=user_preferences,
        n_total=args.n_total,
        n_high_affinity=args.n_high_affinity,
        lambda_param=args.lambda_param
    )
    
    # Analyze diversity
    diversity_metrics = engine.analyze_diversity(diversified)
    
    # Prepare results
    results = {
        'diversified_recommendations': diversified,
        'diversity_metrics': diversity_metrics,
        'total_original': len(entities),
        'total_selected': len(diversified),
        'parameters': {
            'n_total': args.n_total,
            'n_high_affinity': args.n_high_affinity,
            'lambda_param': args.lambda_param
        }
    }
    
    # Save results
    with open(args.output, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    
    logger.info(f"Diversified results saved to {args.output}")
    print(json.dumps({
        'success': True,
        'total_original': len(entities),
        'total_selected': len(diversified),
        'diversity_score': diversity_metrics.get('unique_cuisines', 0)
    }))

if __name__ == "__main__":
    main()