"""
Manufacturing Vertical Logic - Defect detection, quality control
"""
import logging
from typing import Dict, List, Optional
import time
from collections import defaultdict

logger = logging.getLogger(__name__)


class ManufacturingProcessor:
    def __init__(self, config: Dict, alert_manager):
        """
        Initialize manufacturing processor
        
        Args:
            config: Manufacturing vertical configuration
            alert_manager: AlertManager instance for triggering alerts
        """
        self.config = config
        self.alert_manager = alert_manager
        self.classes_of_interest = config.get('classes_of_interest', ['product', 'defect', 'scratch', 'dent'])
        self.defect_threshold = config.get('defect_threshold', 3)
        self.alert_cooldown = config.get('alert_cooldown', 10)
        
        # Tracking
        self.recent_products = []  # Track products over last N frames
        self.defect_history = defaultdict(int)  # defect_type -> count
        
        # Metrics
        self.metrics = {
            "products_inspected": 0,
            "products_passed": 0,
            "products_failed": 0,
            "defects_found": 0,
            "scratch_count": 0,
            "dent_count": 0,
            "other_defects": 0,
            "pass_rate": 100.0
        }
        
        self.total_products = 0
        self.total_passed = 0
    
    def process(self, inference_result: Dict) -> Dict:
        """
        Process manufacturing/quality control detections
        
        Args:
            inference_result: Result from inference engine
            
        Returns:
            Updated metrics
        """
        detections = inference_result.get('detections', [])
        
        # Reset frame counters
        products = []
        defects = []
        
        # Separate products and defects
        for det in detections:
            class_name = det.get('class', '').lower()
            
            if 'product' in class_name or 'item' in class_name or 'part' in class_name:
                products.append(det)
            elif any(d in class_name for d in ['defect', 'scratch', 'dent', 'crack', 'damage']):
                defects.append(det)
        
        self.metrics["products_inspected"] = len(products)
        self.metrics["defects_found"] = len(defects)
        
        # Count defect types
        self.metrics["scratch_count"] = 0
        self.metrics["dent_count"] = 0
        self.metrics["other_defects"] = 0
        
        for defect in defects:
            class_name = defect.get('class', '').lower()
            
            if 'scratch' in class_name:
                self.metrics["scratch_count"] += 1
                self.defect_history['scratch'] += 1
            elif 'dent' in class_name:
                self.metrics["dent_count"] += 1
                self.defect_history['dent'] += 1
            else:
                self.metrics["other_defects"] += 1
                self.defect_history['other'] += 1
        
        # Check each product for defects
        self._inspect_products(products, defects)
        
        # Check if defect rate is above threshold
        self._check_defect_threshold(defects)
        
        # Update pass rate
        if self.total_products > 0:
            self.metrics["pass_rate"] = round((self.total_passed / self.total_products) * 100, 1)
        
        return self.metrics.copy()
    
    def _inspect_products(self, products: List[Dict], defects: List[Dict]):
        """Inspect products for defects"""
        passed = 0
        failed = 0
        
        if not products:
            return
        
        for product in products:
            product_bbox = product['bbox']
            
            # Check if any defects are within or near product bbox
            product_has_defect = False
            defects_in_product = []
            
            for defect in defects:
                defect_bbox = defect['bbox']
                
                # Check if defect overlaps with product
                if self._boxes_overlap(product_bbox, defect_bbox):
                    product_has_defect = True
                    defects_in_product.append(defect)
            
            self.total_products += 1
            
            if product_has_defect:
                failed += 1
                
                # Trigger alert for defective product
                defect_types = [d.get('class', 'unknown') for d in defects_in_product]
                
                self.alert_manager.trigger(
                    vertical="manufacturing",
                    alert_type="DEFECT_DETECTED",
                    severity="HIGH",
                    message=f"Defective product detected: {', '.join(defect_types)}",
                    confidence=max([d.get('confidence', 0.5) for d in defects_in_product]),
                    cooldown=self.alert_cooldown,
                    metadata={
                        "product_bbox": product_bbox,
                        "defect_count": len(defects_in_product),
                        "defect_types": defect_types
                    }
                )
            else:
                passed += 1
                self.total_passed += 1
        
        self.metrics["products_passed"] = passed
        self.metrics["products_failed"] = failed
    
    def _boxes_overlap(self, box1: Dict, box2: Dict) -> bool:
        """Check if two bounding boxes overlap"""
        # Check if boxes don't overlap
        if (box1['x2'] < box2['x1'] or  # box1 is left of box2
            box1['x1'] > box2['x2'] or  # box1 is right of box2
            box1['y2'] < box2['y1'] or  # box1 is above box2
            box1['y1'] > box2['y2']):   # box1 is below box2
            return False
        return True
    
    def _check_defect_threshold(self, defects: List[Dict]):
        """Check if defect count exceeds threshold"""
        if len(defects) >= self.defect_threshold:
            self.alert_manager.trigger(
                vertical="manufacturing",
                alert_type="HIGH_DEFECT_RATE",
                severity="CRITICAL",
                message=f"Unusually high defect rate detected: {len(defects)} defects in current frame",
                confidence=0.9,
                cooldown=self.alert_cooldown * 2,  # Longer cooldown for critical alerts
                metadata={
                    "defect_count": len(defects),
                    "threshold": self.defect_threshold,
                    "defect_history": dict(self.defect_history)
                }
            )
    
    def get_metrics(self) -> Dict:
        """Get current metrics"""
        metrics = self.metrics.copy()
        metrics["total_products_overall"] = self.total_products
        metrics["total_passed_overall"] = self.total_passed
        return metrics
    
    def reset_metrics(self):
        """Reset cumulative metrics"""
        self.total_products = 0
        self.total_passed = 0
        self.defect_history.clear()
        self.metrics["pass_rate"] = 100.0
