import json
import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import os
import argparse
from typing import List, Dict, Any, Tuple
import logging
import tempfile
import subprocess
import hashlib
import re
import shutil

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DiversificationEngine:
    def __init__(self, model_path: str = "./saved_models/all-MiniLM-L6-v2"):
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"SentenceTransformer model not found at: {model_path}")
        self.model = SentenceTransformer(model_path)
        self.vw_model_path = "/tmp/user_preference_model.vw"
        self.vw_temp_dir = tempfile.mkdtemp()
        
        self.vw_available = self._check_vw_availability()
        
        logger.info(f"Loaded SentenceTransformer model from disk: {model_path}")
        logger.info(f"VW temp directory: {self.vw_temp_dir}")
        logger.info(f"VW available: {self.vw_available}")
    
    def _check_vw_availability(self) -> bool:
        try:
            result = subprocess.run(['vw', '--version'], 
                                  capture_output=True, 
                                  text=True, 
                                  timeout=5)
            return result.returncode == 0
        except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
            logger.warning("Vowpal Wabbit (vw) not found. Falling back to embedding-only recommendations.")
            return False
    
    def _vectorize_entity_for_vw(self, entity: Dict[str, Any]) -> str:
        """Convert entity to VW feature format with feature engineering"""
        if not self.vw_available:
            return ""
            
        features = []
        
        # Basic features
        name = entity.get('name', '').lower()
        features.append(f"name_len:{len(name)}")
        
        # Embeddings like cuisines' features
        entity_text = self.extract_entity_features(entity)
        embedding = self.model.encode([entity_text])[0]
        
        # Quantizing embeddings into buckets for VW
        for i, val in enumerate(embedding[:50]):
            bucket = int(val * 10)  # Quantized to -10 to 10 range
            features.append(f"emb_{i}:{bucket}")
        
        # Tags being categorical features
        tags = entity.get('tags', [])
        for tag in tags:
            tag_name = re.sub(r'[^a-zA-Z0-9]', '_', tag.get('name', ''))
            tag_type = re.sub(r'[^a-zA-Z0-9]', '_', tag.get('type', ''))
            features.append(f"tag_{tag_type}_{tag_name}")
        
        # Price and rating buckets
        props = entity.get('properties', {})
        rating = props.get('business_rating', 0)
        if rating > 0:
            rating_bucket = min(int(rating), 5)
            features.append(f"rating_bucket:{rating_bucket}")
        
        price_range = props.get('price_range', {})
        if price_range:
            avg_price = (price_range.get('from', 0) + price_range.get('to', 0)) / 2
            price_bucket = min(int(avg_price / 10), 10)
            features.append(f"price_bucket:{price_bucket}")
        
        return " ".join(features)
    
    def _train_vw_model(self, interactions: List[Dict], user_preferences: List[str]):
        """Train VW model on user interactions with creative contextual bandits"""
        if not self.vw_available:
            logger.info("VW not available, skipping model training")
            return False
            
        training_file = f"{self.vw_temp_dir}/training.vw"
        
        with open(training_file, 'w') as f:
            for interaction in interactions:
                entity = interaction.get('entity', {})
                reward = 1.0 if interaction.get('liked', False) else -0.5
                
                # Using preferences as context
                context_features = []
                for pref in user_preferences:
                    clean_pref = re.sub(r'[^a-zA-Z0-9]', '_', pref.lower())
                    context_features.append(f"pref_{clean_pref}")
                
                entity_features = self._vectorize_entity_for_vw(entity)
                context_str = " ".join(context_features)
                
                # VW format: [reward] |context [context_features] |entity [entity_features]
                vw_line = f"{reward} |context {context_str} |entity {entity_features}\n"
                f.write(vw_line)
        
        # Train VW model with hyperparameters
        cmd = [
            "vw", 
            training_file,
            "--final_regressor", self.vw_model_path,
            "--loss_function", "squared",
            "--learning_rate", "0.1",
            "--l2", "0.001",
            "--interactions", "ce",  # context-entity interactions
            "--quiet"
        ]
        
        try:
            subprocess.run(cmd, check=True, capture_output=True, timeout=30)
            logger.info("VW model trained successfully")
            return True
        except (subprocess.CalledProcessError, subprocess.TimeoutExpired) as e:
            logger.warning(f"VW training failed: {e}")
            return False
    
    def _predict_vw_score(self, entity: Dict[str, Any], user_preferences: List[str]) -> float:
        """Get VW prediction for entity"""
        if not self.vw_available or not os.path.exists(self.vw_model_path):
            return 0.5  # Default score between MMR (0) and VW (1)
        
        test_file = f"{self.vw_temp_dir}/test.vw"
        pred_file = f"{self.vw_temp_dir}/predictions.txt"
        
        # test instance
        context_features = []
        for pref in user_preferences:
            clean_pref = re.sub(r'[^a-zA-Z0-9]', '_', pref.lower())
            context_features.append(f"pref_{clean_pref}")
        
        entity_features = self._vectorize_entity_for_vw(entity)
        context_str = " ".join(context_features)
        
        with open(test_file, 'w') as f:
            f.write(f"|context {context_str} |entity {entity_features}\n")
        
        # Get prediction
        cmd = [
            "vw", 
            test_file,
            "--initial_regressor", self.vw_model_path,
            "--predictions", pred_file,
            "--quiet"
        ]
        
        try:
            subprocess.run(cmd, check=True, capture_output=True, timeout=10)
            with open(pred_file, 'r') as f:
                score = float(f.read().strip())
            return max(0, min(1, (score + 1) / 2))  # Normalize to 0-1
        except:
            return 0.5
    
    def _fallback_preference_scoring(self, entity: Dict[str, Any], user_preferences: List[str]) -> float:
        """Fallback scoring when VW is not available"""
        entity_text = self.extract_entity_features(entity).lower()
        preference_text = ' '.join(user_preferences).lower()
        
        # Matching score
        preference_words = set(preference_text.split())
        entity_words = set(entity_text.split())
        
        if not preference_words:
            return 0.5
        
        # Calculate Jaccard set/binary similarity for NLP
        intersection = len(preference_words.intersection(entity_words))
        union = len(preference_words.union(entity_words))
        
        jaccard_score = intersection / union if union > 0 else 0
        
        # Boost
        tag_boost = 0
        tags = entity.get('tags', [])
        for tag in tags:
            tag_name = tag.get('name', '').lower()
            for pref in user_preferences:
                if pref.lower() in tag_name or tag_name in pref.lower():
                    tag_boost += 0.1
        
        return min(1.0, jaccard_score + tag_boost)
    
    def extract_entity_features(self, entity: Dict[str, Any]) -> str:
        features = []
        
        name = entity.get('name', '')
        features.append(name)
        
        description = (
            entity.get('properties', {}).get('description', '') or 
            entity.get('description', '')
        )
        features.append(description)
        
        tags = entity.get('tags', [])
        if tags:
            cuisine_tags = [
                tag.get('name', '') for tag in tags 
                if 'cuisine' in tag.get('type', '') or 'category' in tag.get('type', '')
            ]
            features.extend(cuisine_tags)
            
            amenity_tags = [
                tag.get('name', '') for tag in tags 
                if 'amenity' in tag.get('type', '') or 'offerings' in tag.get('type', '')
            ]
            features.extend(amenity_tags)
        
        properties = entity.get('properties', {})
        specialty_dishes = properties.get('specialty_dishes', [])
        if specialty_dishes:
            dish_names = [dish.get('name', '') for dish in specialty_dishes]
            features.extend(dish_names)
        
        good_for = properties.get('good_for', [])
        if good_for:
            good_for_tags = [item.get('name', '') for item in good_for]
            features.extend(good_for_tags)
        
        address = properties.get('address', '')
        if address:
            features.append(address)
        
        entity_type = entity.get('type', '')
        if entity_type:
            features.append(entity_type)
        
        return ' '.join(filter(None, features))
    
    def calculate_mmr_scores(
        self, 
        entities: List[Dict[str, Any]], 
        user_preferences: List[str],
        selected_entities: List[Dict[str, Any]] = None,
        lambda_param: float = 0.7,
        interactions: List[Dict] = None
    ) -> List[Tuple[int, float]]:
        """Enhanced MMR with VW predictions or fallback scoring"""
        if selected_entities is None:
            selected_entities = []
        
        # Train VW model
        vw_trained = False
        if self.vw_available and interactions and len(interactions) > 2:
            vw_trained = self._train_vw_model(interactions, user_preferences)
        
        entity_features = [self.extract_entity_features(entity) for entity in entities]
        user_query = ' '.join(user_preferences)
        
        # Generate embeddings
        entity_embeddings = self.model.encode(entity_features)
        user_embedding = self.model.encode([user_query])
        
        # Calculate relevance scores
        base_relevance = cosine_similarity(entity_embeddings, user_embedding).flatten()
        
        mmr_scores = []
        
        for i, entity in enumerate(entities):
            # Base relevance from embeddings
            relevance = base_relevance[i]
            
            # Enhanced with VW predictions / scoring
            if vw_trained:
                vw_score = self._predict_vw_score(entity, user_preferences)
                # Blending embedding similarity with personalized VW score
                relevance = 0.6 * relevance + 0.4 * vw_score
                logger.debug(f"Entity {entity.get('name', '')}: base={base_relevance[i]:.3f}, vw={vw_score:.3f}, blended={relevance:.3f}")
            else:
                # Fallback preference scoring
                fallback_score = self._fallback_preference_scoring(entity, user_preferences)
                relevance = 0.7 * relevance + 0.3 * fallback_score
                logger.debug(f"Entity {entity.get('name', '')}: base={base_relevance[i]:.3f}, fallback={fallback_score:.3f}, blended={relevance:.3f}")
            
            # Diversity penalty
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
        lambda_param: float = 0.7,
        interactions: List[Dict] = None
    ) -> List[Dict[str, Any]]:
        """Diversification: Instead of always returning top-n by affinity or similarity: Use Maximum Marginal Relevance (MMR) & VW to diversify recommendations. Like picking 3 high-affinity entities + 2 serendipitous ones from new cuisines."""
        if not entities:
            return []
        
        enhancement_type = "VW" if self.vw_available else "fallback"
        logger.info(f"Diversifying {len(entities)} entities with {enhancement_type} enhancement (interactions: {len(interactions) if interactions else 0})")
        
        selected = []
        remaining = entities.copy()
        
        # Phase 1: High-affinity items
        for _ in range(min(n_high_affinity, len(remaining))):
            mmr_scores = self.calculate_mmr_scores(
                remaining, user_preferences, selected, lambda_param, interactions
            )
            mmr_scores.sort(key=lambda x: x[1], reverse=True)
            if mmr_scores:
                best_idx = mmr_scores[0][0]
                selected.append(remaining.pop(best_idx))
        
        # Phase 2: Diversity focused items
        diversity_lambda = 0.3
        while len(selected) < min(n_total, len(entities)) and remaining:
            mmr_scores = self.calculate_mmr_scores(
                remaining, user_preferences, selected, diversity_lambda, interactions
            )
            mmr_scores.sort(key=lambda x: x[1], reverse=True)
            if mmr_scores:
                best_idx = mmr_scores[0][0]
                selected.append(remaining.pop(best_idx))
            else:
                break
        return selected
    
    def analyze_diversity(self, entities: List[Dict[str, Any]]) -> Dict[str, Any]:
        if not entities:
            return {}
        
        cuisines = set()
        price_ranges = []
        ratings = []
        entity_types = set()
        
        for entity in entities:
            tags = entity.get('tags', [])
            for tag in tags:
                tag_type = tag.get('type', '')
                if 'cuisine' in tag_type or 'category' in tag_type:
                    cuisines.add(tag.get('name', ''))
            
            entity_type = entity.get('type', '')
            if entity_type:
                entity_types.add(entity_type)
            
            properties = entity.get('properties', {})
            price_range = properties.get('price_range', {})
            if price_range and isinstance(price_range, dict):
                price_from = price_range.get('from', 0)
                price_to = price_range.get('to', 0)
                if price_from or price_to:
                    price_ranges.append((price_from + price_to) / 2)
            
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
    parser = argparse.ArgumentParser(description='Smart Diversification Engine with VW Enhancement')
    parser.add_argument('--input', required=True, help='Input JSON file path')
    parser.add_argument('--output', required=True, help='Output JSON file path')
    parser.add_argument('--preferences', required=True, help='User preferences as JSON string')
    parser.add_argument('--interactions', help='User interactions as JSON string')
    parser.add_argument('--n_total', type=int, default=8, help='Total number of recommendations')
    parser.add_argument('--n_high_affinity', type=int, default=3, help='Number of high-affinity items')
    parser.add_argument('--lambda_param', type=float, default=0.7, help='MMR lambda parameter')
    
    args = parser.parse_args()
    
    # initialize engine (will check VW availability automatically)
    engine = DiversificationEngine()
    
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
    
    # Parse interactions if provided
    interactions = []
    if args.interactions:
        try:
            interactions = json.loads(args.interactions)
        except json.JSONDecodeError:
            logger.warning("Invalid interactions JSON, proceeding without")
    
    # Run diversification
    diversified = engine.diversify_recommendations(
        entities=entities,
        user_preferences=user_preferences,
        n_total=args.n_total,
        n_high_affinity=args.n_high_affinity,
        lambda_param=args.lambda_param,
        interactions=interactions
    )
    
    # Analyze diversity
    diversity_metrics = engine.analyze_diversity(diversified)
    
    # Results
    results = {
        'diversified_recommendations': diversified,
        'diversity_metrics': diversity_metrics,
        'total_original': len(entities),
        'total_selected': len(diversified),
        'vw_enhanced': engine.vw_available and len(interactions) > 0,
        'enhancement_type': 'vw' if engine.vw_available else 'fallback',
        'parameters': {
            'n_total': args.n_total,
            'n_high_affinity': args.n_high_affinity,
            'lambda_param': args.lambda_param
        }
    }
    
    with open(args.output, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    
    logger.info(f"Diversified results saved to {args.output}")
    print(json.dumps({
        'success': True,
        'total_original': len(entities),
        'total_selected': len(diversified),
        'diversity_score': diversity_metrics.get('unique_cuisines', 0),
        'vw_enhanced': engine.vw_available and len(interactions) > 0,
        'enhancement_type': 'vw' if engine.vw_available else 'fallback'
    }))

if __name__ == "__main__":
    main()