import flask
import os
import numpy as np 
import io
import argparse
import matplotlib.pyplot as plt
from matplotlib.pyplot import imshow
import scipy.io
import scipy.misc
import numpy as np
import pandas as pd
import PIL
import base64
import tensorflow.compat.v1 as tf
tf.disable_v2_behavior()

from PIL import Image
from flask import Flask
from io import BytesIO
from keras import backend as K
from keras.layers import Input, Lambda, Conv2D
from keras.models import load_model, Model
from yolo.yolo_utils import read_classes, read_anchors, generate_colors, preprocess_image, draw_boxes, scale_boxes
from yolo.models.keras_yolo import yolo_head, yolo_boxes_to_corners, preprocess_true_boxes, yolo_loss, yolo_body

app = Flask(__name__)

class_names = read_classes("./data/yolo/coco_classes.txt")
anchors = read_anchors("./data/yolo/yolo_anchors.txt")

graph = tf.get_default_graph()
sess = tf.Session(graph=graph)

def yolo_filter_boxes(box_confidence, boxes, box_class_probs, threshold = .6):
    box_scores = box_confidence * box_class_probs

    box_classes = K.argmax(box_scores, axis = -1)
    box_class_scores = K.max(box_scores, axis = -1, keepdims = None)

    filtering_mask = box_class_scores >= threshold

    scores = tf.boolean_mask(box_class_scores, filtering_mask)
    boxes = tf.boolean_mask(boxes, filtering_mask)
    classes = tf.boolean_mask(box_classes, filtering_mask)

    return scores, boxes, classes

def iou(box1, box2):
    (box1_x1, box1_y1, box1_x2, box1_y2) = box1
    (box2_x1, box2_y1, box2_x2, box2_y2) = box2

    xi1 = max(box1_x1, box2_x1)
    yi1 = max(box1_y1, box2_y1)
    xi2 = min(box1_x2, box2_x2)
    yi2 = min(box1_y2, box2_y2)
    inter_width = max(xi2 - xi1, 0)
    inter_height = max(yi2 - yi1, 0)
    inter_area = inter_width * inter_height

    box1_area = (box1_y2 - box1_y1) * (box1_x2 - box1_x1)
    box2_area = (box2_y2 - box2_y1) * (box2_x2 - box2_x1)
    union_area = (box1_area + box2_area) - inter_area

    iou = inter_area / union_area

    return iou

def yolo_non_max_suppression(scores, boxes, classes, max_boxes = 10, iou_threshold = 0.5):
    max_boxes_tensor = K.variable(max_boxes, dtype='int32')
    K.get_session().run(tf.variables_initializer([max_boxes_tensor]))

    nms_indices = tf.image.non_max_suppression(boxes, scores, max_boxes_tensor, iou_threshold, name=None)

    scores = K.gather(scores, nms_indices)
    boxes = K.gather(boxes, nms_indices)
    classes = K.gather(classes, nms_indices)

    return scores, boxes, classes

def yolo_eval(yolo_outputs, image_shape, max_boxes=10, score_threshold=.6, iou_threshold=.5):
    box_confidence, box_xy, box_wh, box_class_probs = yolo_outputs

    boxes = yolo_boxes_to_corners(box_xy, box_wh)

    scores, boxes, classes = yolo_filter_boxes(box_confidence, boxes, box_class_probs, score_threshold)

    boxes = scale_boxes(boxes, image_shape)

    scores, boxes, classes = yolo_non_max_suppression(scores, boxes, classes, max_boxes, iou_threshold)

    return scores, boxes, classes

import time

def get_area(points, total_area):
    return (points[2]-points[0]) * (points[3]-points[1])/total_area


def inference(image):
    start_time = time.monotonic()

    image, image_data = preprocess_image(image, model_image_size = (608, 608))
    image_shape = image.size
    image_shape = list(map(float, list(image_shape)))

    with graph.as_default():
        sess = K.get_session()
        start_time = time.monotonic()
        out_scores, out_boxes, out_classes = sess.run(fetches=[scores, boxes, classes],
                                                 feed_dict={yolo_model.input: image_data,
                                                           K.learning_phase(): 0})
    colors = generate_colors(class_names)

    image_boxes = Image.new('RGB', image.size)
    draw_boxes(image_boxes, out_scores, out_boxes, out_classes, class_names, colors)

    image_output = image_boxes.convert("RGBA")
    datas = image_output.getdata()

    image_data = []
    for item in datas:
        if item[0] == 0 and item[1] == 0 and item[2] == 0:
            image_data.append((0, 0, 0, 0))
        else:
            image_data.append(item)

    image_output.putdata(image_data)

    buffered = BytesIO()
    image_output.save(buffered, format="PNG")

    total_area = image_output.size[0]*image_output.size[1]
    boxes_found = [{'area': get_area(item[0], total_area), 'label': class_names[item[1]], 'prob': item[2]} for item in zip(out_boxes.tolist(), out_classes, out_scores.tolist())]

    return {'boxes': boxes_found,
            'image': base64.b64encode(buffered.getvalue()).decode('utf-8')}


@app.route('/inference', methods=['POST', 'GET'])
def inference_route():
    return inference(Image.open(flask.request.files['file']))

@app.route('/')
def main():
    return 'Navigation Inference Model'

with graph.as_default():
    K.set_session(sess)
    yolo_model = load_model("./data/yolo/yolo.h5")
    yolo_model._make_predict_function()
    yolo_outputs = yolo_head(yolo_model.output, anchors, len(class_names))
    scores, boxes, classes = yolo_eval(yolo_outputs, (640., 480.))

if __name__ == '__main__':
    app.run(port=5005, threaded=False, debug=False)