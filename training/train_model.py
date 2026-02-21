"""
VisionSync AI - Model Training Script
Fine-tunes YOLOv8 on vertical-specific datasets.

Usage:
    python train_model.py --vertical safety
    python train_model.py --vertical safety --epochs 50 --model yolov8s.pt
    python train_model.py --vertical safety --resume
"""

import os
import sys
import json
import argparse
import shutil
from datetime import datetime
from pathlib import Path

def get_project_root():
    """Get VisionSync project root directory"""
    return Path(__file__).parent.parent

def find_data_yaml(vertical: str, datasets_dir: str) -> str:
    """Find data.yaml for a vertical"""
    # Check common locations
    candidates = [
        os.path.join(datasets_dir, vertical, "data.yaml"),
        os.path.join(datasets_dir, vertical, f"{vertical}.yaml"),
    ]
    
    for c in candidates:
        if os.path.exists(c):
            return c
    
    # Search recursively
    for root, dirs, files in os.walk(os.path.join(datasets_dir, vertical)):
        for f in files:
            if f == "data.yaml" or f.endswith(".yaml"):
                return os.path.join(root, f)
    
    return None


def train_model(
    vertical: str,
    base_model: str = "yolov8n.pt",
    epochs: int = 50,
    batch_size: int = 16,
    img_size: int = 640,
    resume: bool = False,
    device: str = "",  # auto-detect
    patience: int = 15,
    workers: int = 4,
    freeze: int = 0,
):
    """
    Train YOLOv8 model on a vertical-specific dataset.
    
    Args:
        vertical: safety, traffic, or manufacturing
        base_model: Base model to fine-tune (yolov8n.pt, yolov8s.pt, yolov8m.pt)
        epochs: Number of training epochs
        batch_size: Batch size (reduce if GPU OOM)
        img_size: Image size for training
        resume: Resume from last checkpoint
        device: Device to train on ('', '0', 'cpu')
        patience: Early stopping patience
        workers: Number of data loader workers
        freeze: Number of layers to freeze (0 = train all)
    """
    try:
        from ultralytics import YOLO
    except ImportError:
        print("ERROR: ultralytics not installed. Run: pip install ultralytics")
        sys.exit(1)

    project_root = get_project_root()
    datasets_dir = os.path.join(os.path.dirname(__file__), "datasets")
    
    # Find data.yaml
    data_yaml = find_data_yaml(vertical, datasets_dir)
    if data_yaml is None:
        print(f"ERROR: No data.yaml found for vertical '{vertical}'")
        print(f"       Expected at: {os.path.join(datasets_dir, vertical, 'data.yaml')}")
        print(f"       Run first: python download_dataset.py --vertical {vertical} --api-key YOUR_KEY")
        sys.exit(1)
    
    print(f"""
╔══════════════════════════════════════════════════════════╗
║           VisionSync AI - Model Training                ║
╠══════════════════════════════════════════════════════════╣
║  Vertical:    {vertical:<42} ║
║  Base Model:  {base_model:<42} ║
║  Epochs:      {epochs:<42} ║
║  Batch Size:  {batch_size:<42} ║
║  Image Size:  {img_size:<42} ║
║  Device:      {device or 'auto':<42} ║
║  Data YAML:   {os.path.basename(data_yaml):<42} ║
║  Freeze:      {freeze:<42} ║
╚══════════════════════════════════════════════════════════╝
    """)
    
    # Output directories
    output_dir = os.path.join(os.path.dirname(__file__), "runs")
    run_name = f"visionsync_{vertical}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    # Load model
    if resume:
        last_checkpoint = os.path.join(output_dir, "detect", "latest", "weights", "last.pt")
        if os.path.exists(last_checkpoint):
            print(f"Resuming from: {last_checkpoint}")
            model = YOLO(last_checkpoint)
        else:
            print(f"No checkpoint found at {last_checkpoint}, starting fresh")
            model = YOLO(base_model)
    else:
        model = YOLO(base_model)
    
    # Train
    print(f"\n🚀 Starting training...")
    print(f"   Output: {os.path.join(output_dir, 'detect', run_name)}\n")
    
    results = model.train(
        data=data_yaml,
        epochs=epochs,
        batch=batch_size,
        imgsz=img_size,
        device=device if device else None,
        project=os.path.join(output_dir, "detect"),
        name=run_name,
        patience=patience,
        workers=workers,
        freeze=freeze,
        
        # Augmentation settings for better generalization
        hsv_h=0.015,       # HSV-Hue augmentation
        hsv_s=0.7,         # HSV-Saturation augmentation
        hsv_v=0.4,         # HSV-Value augmentation
        degrees=10.0,      # Rotation
        translate=0.1,     # Translation
        scale=0.5,         # Scale
        fliplr=0.5,        # Horizontal flip
        mosaic=1.0,        # Mosaic augmentation
        mixup=0.1,         # MixUp augmentation
        
        # Performance
        amp=True,           # Automatic Mixed Precision
        cache=False,        # Don't cache (saves RAM)
        
        # Logging
        verbose=True,
        plots=True,
        save=True,
        save_period=10,     # Save checkpoint every 10 epochs
    )
    
    # Get best model path
    best_model = os.path.join(output_dir, "detect", run_name, "weights", "best.pt")
    
    if os.path.exists(best_model):
        print(f"\n{'='*60}")
        print(f"✅ Training complete!")
        print(f"   Best model: {best_model}")
        print(f"   Results:    {os.path.join(output_dir, 'detect', run_name)}")
        print(f"{'='*60}")
        
        # Copy to backend/models/
        models_dir = os.path.join(project_root, "backend", "models")
        os.makedirs(models_dir, exist_ok=True)
        dest = os.path.join(models_dir, f"visionsync_{vertical}_best.pt")
        shutil.copy2(best_model, dest)
        print(f"\n📦 Model copied to: {dest}")
        
        # Validate
        print(f"\n🔍 Running validation...")
        model_val = YOLO(best_model)
        metrics = model_val.val(data=data_yaml, imgsz=img_size)
        
        print(f"\n📊 Validation Results:")
        print(f"   mAP50:     {metrics.box.map50:.4f}")
        print(f"   mAP50-95:  {metrics.box.map:.4f}")
        print(f"   Precision:  {metrics.box.mp:.4f}")
        print(f"   Recall:     {metrics.box.mr:.4f}")
        
        # Update config.json
        update_config(vertical, dest, project_root)
        
        return best_model
    else:
        print(f"\n❌ Training may have failed. Check logs in {output_dir}")
        return None


def update_config(vertical: str, model_path: str, project_root: Path):
    """Update config.json with the new model path"""
    config_path = os.path.join(project_root, "config.json")
    
    try:
        with open(config_path, 'r') as f:
            config = json.load(f)
        
        # Make path relative to backend/
        rel_path = os.path.relpath(model_path, os.path.join(project_root, "backend"))
        rel_path = rel_path.replace("\\", "/")
        
        old_model = config["verticals"][vertical].get("model", "yolov8n.pt")
        config["verticals"][vertical]["model"] = rel_path
        
        with open(config_path, 'w') as f:
            json.dump(config, f, indent=2)
        
        print(f"\n⚙️  Config updated:")
        print(f"   {vertical}.model: '{old_model}' → '{rel_path}'")
        
    except Exception as e:
        print(f"\n⚠️  Could not update config.json: {e}")
        print(f"   Manually set verticals.{vertical}.model to: {model_path}")


def export_model(model_path: str, format: str = "onnx"):
    """Export trained model to other formats (ONNX, TFLite, etc.)"""
    from ultralytics import YOLO
    model = YOLO(model_path)
    
    print(f"\n📤 Exporting to {format.upper()}...")
    export_path = model.export(format=format)
    print(f"   Exported: {export_path}")
    return export_path


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train VisionSync AI models")
    parser.add_argument("--vertical", type=str, required=True,
                       choices=["safety", "traffic", "manufacturing"],
                       help="Which vertical to train")
    parser.add_argument("--model", type=str, default="yolov8n.pt",
                       help="Base model (yolov8n.pt, yolov8s.pt, yolov8m.pt)")
    parser.add_argument("--epochs", type=int, default=50,
                       help="Number of training epochs (default: 50)")
    parser.add_argument("--batch", type=int, default=16,
                       help="Batch size (reduce for GPU OOM, default: 16)")
    parser.add_argument("--imgsz", type=int, default=640,
                       help="Image size (default: 640)")
    parser.add_argument("--device", type=str, default="",
                       help="Device: '' (auto), '0' (GPU 0), 'cpu'")
    parser.add_argument("--resume", action="store_true",
                       help="Resume from last checkpoint")
    parser.add_argument("--patience", type=int, default=15,
                       help="Early stopping patience (default: 15)")
    parser.add_argument("--freeze", type=int, default=0,
                       help="Freeze first N layers (0=train all, 10=freeze backbone)")
    parser.add_argument("--export", type=str, default=None,
                       choices=["onnx", "tflite", "coreml", "engine"],
                       help="Export after training")
    
    args = parser.parse_args()
    
    best = train_model(
        vertical=args.vertical,
        base_model=args.model,
        epochs=args.epochs,
        batch_size=args.batch,
        img_size=args.imgsz,
        device=args.device,
        resume=args.resume,
        patience=args.patience,
        freeze=args.freeze,
    )
    
    if best and args.export:
        export_model(best, args.export)
