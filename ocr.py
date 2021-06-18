from flask import Flask
from PIL import Image
import flask
import os
import io
import re

import cv2 
import pytesseract
import numpy as np
from nltk import pos_tag
from nltk.corpus import words

app = Flask(__name__)

all_words = words.words()

with open('./data/brands.txt') as f:
    brands_words = [line.strip() for line in f.readlines()]

def get_grayscale(image):
    return cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

def thresholding(image):
    return cv2.threshold(image, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]

def process(img, pipeline, show_image=False):
    output = img
    for item in pipeline:
        output = item(output)
        if show_image:
            plt.imshow(output)
            plt.show()
    return output

def inference(file):    
    npimg = np.fromfile(file, np.uint8)
    img = cv2.imdecode(npimg, cv2.IMREAD_COLOR)
    
    pipeline = [
        get_grayscale,
        thresholding,    
    ]

    output = process(img, pipeline)
    custom_config = r'--oem 3 --psm 6'
    results = pytesseract.image_to_string(output, config=custom_config).split('\n')
    
    return results
    
def get_valid_words(lines):
    valid_words = []
    for line in lines:
        words = line.split()
        for word in words:
            if word.lower() in all_words:
                tag = pos_tag([word.lower()])[0]
                if tag[1][0] in ['J', 'N', 'V'] and len(word) > 2:
                    valid_words.append(word)
            if word.lower() in brands_words:
                valid_words.append(word)
                
    return valid_words

@app.route('/inference', methods=['POST', 'GET'])
def inference_route():        
    output = inference(flask.request.files['file'])    
    mode = flask.request.form.get('mode', 'reading')
        
    if mode == 'labels':
        words = get_valid_words(output)
        return {
            'ocr': ' '.join(words),
        }
    elif mode == 'numbers':
        def get_numbers(line):
            return re.findall(r"[\d]+", line)
        return {
            'ocr': [' '.join(get_numbers(line)) for line in output if get_numbers(line)]
        }
    elif mode == 'reading':
        return {
            'ocr': output
        }
    elif mode == 'menu':
        def has_price(line):
            return '$' in line or '£' in line or '€' in line
        
        relevant_lines = [line for line in output if has_price(line)]
        return {
            'ocr': relevant_lines,
        }
    else:
        return {
            'ocr': '',
        } 
    
@app.route('/')
def main():
    return 'OCR Inference Model'

if __name__ == '__main__':
    app.run(port=5004)