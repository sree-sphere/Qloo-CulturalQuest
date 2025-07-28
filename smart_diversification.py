# smart_diversification.py
import json
import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import os
from typing import List, Dict, Any, Tuple
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SmartDiversificationEngine:
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        self.model = SentenceTransformer(model_name)
        logger.info(f"Loaded SentenceTransformer model: {model_name}")
    
    def extract_entity_features(self, entity: Dict[str, Any]) -> str:
        """Extract meaningful features from entity for embedding"""
        features = []
        
        # Basic info
        features.append(entity.get('name', ''))
        features.append(entity.get('properties', {}).get('description', ''))
        
        # Cuisine/category from tags
        tags = entity.get('tags', [])
        cuisine_tags = [tag['name'] for tag in tags if 'cuisine' in tag.get('type', '') or 'category' in tag.get('type', '')]
        features.extend(cuisine_tags)
        
        # Specialty dishes
        specialty_dishes = entity.get('properties', {}).get('specialty_dishes', [])
        dish_names = [dish['name'] for dish in specialty_dishes]
        features.extend(dish_names)
        
        # Good for tags
        good_for = entity.get('properties', {}).get('good_for', [])
        good_for_tags = [item['name'] for item in good_for]
        features.extend(good_for_tags)
        
        # Amenities and offerings
        amenity_tags = [tag['name'] for tag in tags if 'amenity' in tag.get('type', '') or 'offerings' in tag.get('type', '')]
        features.extend(amenity_tags)
        
        return ' '.join(filter(None, features))
    
    def calculate_mmr_scores(
        self, 
        entities: List[Dict[str, Any]], 
        user_preferences: List[str],
        selected_entities: List[Dict[str, Any]] = None,
        lambda_param: float = 0.7
    ) -> List[Tuple[int, float]]:
        """
        Calculate MMR scores for entities
        lambda_param: relevance vs diversity trade-off (higher = more relevance focus)
        """
        if selected_entities is None:
            selected_entities = []
        
        # Create embeddings
        entity_features = [self.extract_entity_features(entity) for entity in entities]
        user_query = ' '.join(user_preferences)
        
        # Get embeddings
        entity_embeddings = self.model.encode(entity_features)
        user_embedding = self.model.encode([user_query])
        
        # Calculate relevance scores (similarity to user preferences)
        relevance_scores = cosine_similarity(entity_embeddings, user_embedding).flatten()
        
        mmr_scores = []
        
        for i, entity in enumerate(entities):
            relevance = relevance_scores[i]
            
            # Calculate diversity (minimum similarity to selected entities)
            if selected_entities:
                selected_features = [self.extract_entity_features(sel) for sel in selected_entities]
                selected_embeddings = self.model.encode(selected_features)
                
                similarities = cosine_similarity([entity_embeddings[i]], selected_embeddings).flatten()
                max_similarity = np.max(similarities) if len(similarities) > 0 else 0
            else:
                max_similarity = 0
            
            # MMR formula: λ * relevance - (1-λ) * max_similarity
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
        Diversify recommendations using MMR
        """
        if not entities:
            return []
        
        selected = []
        remaining = entities.copy()
        
        # Step 1: Select high-affinity items first
        for _ in range(min(n_high_affinity, len(remaining))):
            mmr_scores = self.calculate_mmr_scores(
                remaining, user_preferences, selected, lambda_param
            )
            
            # Sort by MMR score (descending)
            mmr_scores.sort(key=lambda x: x[1], reverse=True)
            
            if mmr_scores:
                best_idx = mmr_scores[0][0]
                selected.append(remaining.pop(best_idx))
        
        # Step 2: Fill remaining slots with diversity focus (lower lambda)
        diversity_lambda = 0.3  # More emphasis on diversity
        
        while len(selected) < min(n_total, len(entities)) and remaining:
            mmr_scores = self.calculate_mmr_scores(
                remaining, user_preferences, selected, diversity_lambda
            )
            
            mmr_scores.sort(key=lambda x: x[1], reverse=True)
            
            if mmr_scores:
                best_idx = mmr_scores[0][0]
                selected.append(remaining.pop(best_idx))
            else:
                break
        
        return selected
    
    def analyze_diversity(self, entities: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze diversity metrics of selected entities"""
        if not entities:
            return {}
        
        # Extract cuisines/categories
        cuisines = set()
        price_ranges = []
        ratings = []
        
        for entity in entities:
            # Get cuisine from tags
            tags = entity.get('tags', [])
            for tag in tags:
                if 'cuisine' in tag.get('type', '') or 'category' in tag.get('type', ''):
                    cuisines.add(tag['name'])
            
            # Price and rating
            price_range = entity.get('properties', {}).get('price_range', {})
            if price_range:
                price_ranges.append((price_range.get('from', 0) + price_range.get('to', 0)) / 2)
            
            rating = entity.get('properties', {}).get('business_rating', 0)
            if rating:
                ratings.append(rating)
        
        return {
            'unique_cuisines': len(cuisines),
            'cuisine_types': list(cuisines),
            'price_range_std': np.std(price_ranges) if price_ranges else 0,
            'rating_range': (min(ratings), max(ratings)) if ratings else (0, 0),
            'total_entities': len(entities)
        }

def load_sample_data(file_path: str) -> List[Dict[str, Any]]:
    """Load sample recommendation data"""
    try:
        with open(file_path, 'r') as f:
            data = json.load(f)
        
        # Extract entities from various possible structures
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
    # Initialize the diversification engine
    engine = SmartDiversificationEngine()
    
    # Load sample data (you'll provide this JSON file)
    entities = load_sample_data('results_diversified.json')
    
    if not entities:
        logger.error("No entities loaded. Please check your sample_recommendations.json file")
        return
    
    # User preferences (simulating the mockUser preferences)
    user_preferences = [
        "Indian cuisine", "Thai food", "Italian restaurant", 
        "vegetarian options", "heritage sites", "cultural experiences",
        "authentic dining", "festival foods"
    ]
    
    # Apply smart diversification
    diversified = engine.diversify_recommendations(
        entities=entities,
        user_preferences=user_preferences,
        n_total=8,
        n_high_affinity=3,
        lambda_param=0.7
    )
    
    # Analyze diversity
    diversity_metrics = engine.analyze_diversity(diversified)
    
    # Save results
    results = {
        'diversified_recommendations': diversified,
        'diversity_metrics': diversity_metrics,
        'total_original': len(entities),
        'total_selected': len(diversified)
    }
    
    with open('diversified_results.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    # Print summary
    print("\n🎯 Smart Diversification Results:")
    print(f"Original entities: {len(entities)}")
    print(f"Diversified selection: {len(diversified)}")
    print(f"Unique cuisines: {diversity_metrics.get('unique_cuisines', 0)}")
    print(f"Cuisine types: {', '.join(diversity_metrics.get('cuisine_types', []))}")
    print(f"Price diversity (std): {diversity_metrics.get('price_range_std', 0):.2f}")
    print(f"Rating range: {diversity_metrics.get('rating_range', (0, 0))}")
    
    print("\n📍 Top 5 Diversified Recommendations:")
    for i, entity in enumerate(diversified[:5]):
        name = entity.get('name', 'Unknown')
        rating = entity.get('properties', {}).get('business_rating', 0)
        description = entity.get('properties', {}).get('description', 'No description')
        print(f"{i+1}. {name} (★{rating}) - {description[:80]}...")

if __name__ == "__main__":
    main()