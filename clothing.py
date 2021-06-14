from flask import Flask
from PIL import Image
import flask
import os
import csv
import numpy as np 
import io
import cv2 as cv
import tensorflow.compat.v1 as tf

from keras.preprocessing import image
from keras.models import load_model
from keras.applications import resnet50
from keras.preprocessing.image import img_to_array
from keras.applications.imagenet_utils import decode_predictions

tf.enable_eager_execution(
    config=None, device_policy=None, execution_mode=None
)
app = Flask(__name__)

resnet_model = resnet50.ResNet50(weights='imagenet')
pattern_model = load_model('./data/clothing-weights/pattern.h5')
color_model = load_model('./data/clothing-weights/color.h5')

valid_clothing = ['loafer','abaya','academic_gown','apron','bib','bikini','brassiere','breastplate','bulletproof_vest','cardigan','chain_mail','cloak','clog','cowboy_boot','cowboy_hat','cuirass','fur_coat','gown','hoopskirt','jean','jersey','kimono','knee_pad','lab_coat','maillot','maillot','mask','military_uniform','miniskirt','mitten','overskirt','oxygen_mask','pajama','poncho','running_shoe','sandal','sarong','ski_mask','sock','suit','sunglasses','sweatshirt','swimming_trunks','trench_coat','vestment','wig']

def crop_center(pil_img, crop_width, crop_height):
    img_width, img_height = pil_img.size
    return pil_img.crop(((img_width - crop_width) // 2,
                         (img_height - crop_height) // 2,
                         (img_width + crop_width) // 2,
                         (img_height + crop_height) // 2))

def inference_clothing(pil_image):
    pil_image = pil_image.resize((224, 224), Image.BILINEAR)    
    image_data = image.img_to_array(pil_image)
    
    image_data = np.expand_dims(image_data, axis = 0)
    result_resnet = resnet_model.predict(image_data)
    label = decode_predictions(result_resnet)
    
    clothing_types = [{'label': str(item[1]).replace('_', ' ').title(),'prob': float(item[2])} for item in 
                      label[0] if str(item[1]) in valid_clothing]
    
    if not clothing_types:
        return {
            'clothing': None
        }
    return {
        'clothing': clothing_types[0]
    }
    
def inference_patterns_and_colors(pil_image):
    pil_image = pil_image.resize((64, 64), Image.BILINEAR)
    image_data = image.img_to_array(pil_image)
    image_data = np.expand_dims(image_data, axis = 0)
    
    # Perform inference
    result_pattern = pattern_model.predict_classes(image_data)
    result_color = color_model.predict_classes(image_data)
                           
    pattern_classes = ['Floral', 'Graphics', 'Plaid', 'Solid', 'Spotted', 'Striped']            
    prediction_pattern = pattern_classes[int(result_pattern)]
    
    color_classes =  ['Black', 'Blue', 'Brown', 'Cyan', 'Gray', 'Green', 'More than 1 color', 'Orange', 'Pink', 'Purple', 'Red', 'White', 'Yellow']
    prediction_color = color_classes[int(result_color)]
    
    return {
        'color': prediction_color,
        'pattern': prediction_pattern,
    }
    
def inference(image):    
    IMAGE_SIZE = 500
    image = image.convert('RGB')
    aspect_ratio = IMAGE_SIZE/image.size[0]
    
    image = image.resize((IMAGE_SIZE, int(image.size[1]*aspect_ratio)), Image.BILINEAR)
    image = crop_center(image, IMAGE_SIZE, IMAGE_SIZE)
    
    prediction_clothing = inference_clothing(image)
    prediction_style = inference_patterns_and_colors(image)
    
    if not prediction_clothing['clothing']:
        return {}
    return {**prediction_clothing, **prediction_style}
    

@app.route('/inference', methods=['POST'])
def inference_route():    
    return inference(Image.open(flask.request.files['file']))
    
@app.route('/')
def main_route():
    return 'Clothing Inference Model'

if __name__ == '__main__':
    app.run(port=5001)