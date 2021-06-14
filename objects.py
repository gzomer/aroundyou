import flask
import os
import numpy as np 
import io
import torch
import torch.nn as nn
import torch.nn.functional as F
import torchvision.models as models
import torchvision.transforms as transforms
import urllib

from collections import defaultdict
from flask import Flask
from PIL import Image
from torch.utils.data import DataLoader, Dataset

app = Flask(__name__)

DEVICE = 'cuda' if torch.cuda.is_available() else 'cpu'

CATEGORIES = None
SHOPPING_CATEGORIES = [
    'acorn_squash',
    'banana',
    'fig',
    'jackfruit',
    'lemon',
    'orange',
    'pineapple',
    'pomegranate',
    'strawberry',
    'zucchini',
    'artichoke',
    'bell_pepper',
    'broccoli',
    'butternut_squash',
    'cauliflower',
    'cucumber',
    'head_cabbage',
    'french_loaf',
    'bagel',
    'beer_bottle',
    'burrito',
    'milk',
    'water_bottle',
    'corn',
    'pizza',
    'pop_bottle',
    'red_wine',
    'saltshaker',
    'wine_bottle',
    'toilet_tissue',
]

SHOPPING_CATEGORIES = [item.replace('_',' ') for item in SHOPPING_CATEGORIES]

def setup_model():
    global CATEGORIES
    model = torch.hub.load('pytorch/vision:v0.9.0', 'inception_v3', pretrained=True)
    
    if not os.path.exists('imagenet_classes.txt'):
        url, filename = ("https://raw.githubusercontent.com/pytorch/hub/master/imagenet_classes.txt", "./data/imagenet_classes.txt")
        try: urllib.URLopener().retrieve(url, filename)
        except: urllib.request.urlretrieve(url, filename)
    
    # Read the categories
    with open('./data/imagenet_classes.txt', 'r', encoding='utf8') as f:
        CATEGORIES = [s.strip() for s in f.readlines()]
        
    model.eval()
    return model
            
class ImageGrid(Dataset):
    def __init__(self, input_image, grid_size):
        def divide_img_blocks(img, n_blocks=(grid_size, grid_size)):
            horizontal = np.array_split(img, n_blocks[0])
            images = []
            for block in horizontal:
                try:
                    images.extend(np.array_split(block, n_blocks[1], axis=1))
                except:
                    pass
            return images

        images = divide_img_blocks(np.array(input_image))

        images_batch = []
        for image in images:
            images_batch.append(Image.fromarray(np.uint8(image)).convert('RGB'))

        preprocess = transforms.Compose([
            transforms.Resize(299),
            transforms.CenterCrop(299),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])
        
        self.x = [preprocess(item) for item in images_batch]

    def __len__(self):
        return len(self.x)

    def __getitem__(self, index):
        return self.x[index]
    
    
def inference_grid(input_image):
    global CATEGORIES
    
    image_dataset = ImageGrid(input_image, 3)
    dataloader = DataLoader(image_dataset, batch_size=32)
    outputs = []
    
    for input_batch in dataloader:
        input_batch = input_batch.to(DEVICE)
        model.to(DEVICE)
        
        with torch.no_grad():
            model_outputs = model(input_batch)
            outputs.extend([torch.nn.functional.softmax(out, dim=0) for out in model_outputs])
    
    results = defaultdict(float)
    count = defaultdict(int)
    
    for output in outputs:
        prob, cat_id = torch.topk(output, 1000)
        cat_id = CATEGORIES[cat_id[0]]
        if cat_id not in SHOPPING_CATEGORIES:
            continue
                        
        prob = prob[0].item()
        results[cat_id] += prob        
        count[cat_id] += 1
    
    results = sorted([{'label': k, 'prob':v/count[k],'weight':v} for k, v in results.items()], key=lambda x:x['weight'], reverse=True) 
    
    return {'results':results}    

@app.route('/inference', methods=['POST'])
def inference_route():
    return inference_grid(Image.open(flask.request.files['file']))
    
@app.route('/')
def main():
    return 'Objects Inference Model'

model = setup_model()

if __name__ == '__main__':
    app.run(port=5002)