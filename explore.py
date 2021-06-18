from flask import Flask
from PIL import Image
import flask
import os
import numpy as np 
import io

import torch
import torch.nn as nn
import torch.nn.functional as F
import torchvision.models as models
import torchvision.transforms as transforms
import torchvision as tv
import urllib

from transformers import BertTokenizer

app = Flask(__name__)

DEVICE = 'cuda' if torch.cuda.is_available() else 'cpu'
MAX_DIM = 299

tokenizer = BertTokenizer.from_pretrained('bert-base-uncased')
start_token = tokenizer.convert_tokens_to_ids(tokenizer._cls_token)
end_token = tokenizer.convert_tokens_to_ids(tokenizer._sep_token)
image_transform = None

class Config(object):
    def __init__(self):

        # Learning Rates
        self.lr_backbone = 1e-5
        self.lr = 1e-4

        # Epochs
        self.epochs = 30
        self.lr_drop = 20
        self.start_epoch = 0
        self.weight_decay = 1e-4

        # Backbone
        self.backbone = 'resnet101'
        self.position_embedding = 'sine'
        self.dilation = True

        # Basic
        self.device = 'cuda'
        self.seed = 42
        self.batch_size = 32
        self.num_workers = 8
        self.checkpoint = './checkpoint.pth'
        self.clip_max_norm = 0.1

        # Transformer
        self.hidden_dim = 256
        self.pad_token_id = 0
        self.max_position_embeddings = 128
        self.layer_norm_eps = 1e-12
        self.dropout = 0.1
        self.vocab_size = 30522

        self.enc_layers = 6
        self.dec_layers = 6
        self.dim_feedforward = 2048
        self.nheads = 8
        self.pre_norm = True

        # Dataset
        self.limit = -1

def setup_model():
    global image_transform
    image_transform = tv.transforms.Compose([
        tv.transforms.Lambda(resize_image),
        tv.transforms.ToTensor(),
        tv.transforms.Normalize((0.5, 0.5, 0.5), (0.5, 0.5, 0.5))
    ])
    model = torch.hub.load('saahiluppal/catr', 'v3', pretrained=True)
    if torch.cuda.is_available():
        model.cuda()
    model.eval()
    return model

def create_caption_and_mask(start_token, max_length):
    caption_template = torch.zeros((1, max_length), dtype=torch.long)
    mask_template = torch.ones((1, max_length), dtype=torch.bool)

    caption_template[:, 0] = start_token
    mask_template[:, 0] = False

    return caption_template, mask_template

@torch.no_grad()
def get_caption(model, image):
    caption, cap_mask = create_caption_and_mask(start_token, config.max_position_embeddings)
    if DEVICE == 'cuda':
        image = image.to(DEVICE)
        caption = caption.to(DEVICE)
        cap_mask = cap_mask.to(DEVICE)

    for i in range(config.max_position_embeddings - 1):

        predictions = model(image, caption, cap_mask)
        predictions = predictions[:, i, :]
        predicted_id = torch.argmax(predictions, axis=-1)

        # If is end token
        if predicted_id[0] == 102:
            return caption

        caption[:, i+1] = predicted_id[0]
        cap_mask[:, i+1] = False

    return caption

def resize_image(image):
    if image.mode != 'RGB':
        image = image.convert("RGB")

    shape = np.array(image.size, dtype=np.float)
    long_dim = max(shape)
    scale = MAX_DIM / long_dim

    new_shape = (shape * scale).astype(int)
    image = image.resize(new_shape)

    return image

def inference(input_image):
    global image_transform
    image = image_transform(input_image)
    image = image.unsqueeze(0)

    caption = get_caption(model, image)

    result = tokenizer.decode(caption[0].tolist(), skip_special_tokens=True)
    return {'text': result.capitalize()}

@app.route('/inference', methods=['POST'])
def inference_route():
    return inference(Image.open(flask.request.files['file']))
    
@app.route('/')
def main():
    return 'Explore Inference Model'

model = setup_model()
config = Config()

if __name__ == '__main__':
    app.run(port=5003)