## Inspiration
Millions of people around the world suffer from visual impairments, making their lives much more challenging. Trivial tasks that we take for granted, such as choosing which clothes to wear before going to work or picking something up in the grocery store, are incredibly more difficult, time-consuming and more prone to errors for people with visual impairments. No one would like to wear mismatched clothes or to buy the wrong fruit in the grocery store, right?

But it is much more challenging than that. For instance, how would you:

- Choose the right product (gluten-free bread or semi-skimmed milk, for instance)?
- Choose what to eat when most restaurant menus don't have a braille version?
- Read a document or letter you have just received by post?
- Navigate without visual aids in a city?
- Know what to buy in stores?
- Tell if a product has expired in your fridge?

To solve these problems (and beyond), we introduce Around You: a mobile app using machine learning that allows visually impaired people to interact with the world in a more fast, practical, and intuitive way, almost restoring their visual perception.

## What it does

It works by identifying objects, clothes, colours, patterns, products, menus, documents and more using only the smartphone camera, a 5G internet connection and the smartphone speaker. The user just points the camera to what s/he wants to see and the app says to the user what is happening around. There are various modes available and more to come!

![Features and modes](https://challengepost-s3-challengepost.netdna-ssl.com/photos/production/software_photos/001/566/606/datas/gallery.jpg)


### Clothing Mode

Command to enable: ```Start clothing mode```

In this mode, the app detects different types of clothes, colors, and patterns in order to help users making better clothing choices. Users just need to point to clothes and tap anywhere on the screen and the app will then speak out loud the detection.

### Navigation/Walking Mode

Command to enable: ```Start walking mode```

Walking Mode can help users navigate safely by monitoring moving cars.

### Shopping Mode

Command to enable: ```Start shopping mode```

Shopping Mode helps users finding and buying things. Users just need to say **where's (object name)** and the app will monitor in real-time until the object is found.

### Objects Mode

Command to enable: ```Start objects mode```

Objects Mode helps users finding objects. Users just need to say **where's (object name)** and the app will monitor in real-time until the object is found.

### Labels Mode

Command to enable: ```Start labels mode```

Labels Mode helps users choose the right product for them. Users just need to point the camera to the product, tap anywhere on the screen, and then the app says the most relevant info from the product (names, nouns, brands, adjectives)


### Menu Mode

Command to enable: ```Start menu mode```

Menu Mode helps users reading menus to help them decide what to eat. Users just need to point the camera to the menu, tap anywhere on the screen, and then the app says the menu items with their prices. Users can tap again at any moment to interrupt the speaking.

### Numbers Mode

Command to enable: ```Start numbers mode```

Numbers Mode helps users reading numbers (especially phone numbers)

### Explore Mode

Command to enable: ```Start explore mode```

Explore Mode helps users exploring and understanding the world around them. They can imagine what’s around from the description and better enjoy going out.

When the user needs to stop current mode s/he just needs to say: ```stop``` or ```exit```.

## How we built it

Instead of doing the machine learning processing in the device, we offload all the processing to the cloud, which allows faster release of new features and models, and allows the app to work even on less-capable devices.

When connected to AWS Wavelength via a 5G network, Around You provides an almost instantaneous interaction with the world, making the lives of people with visual impairments easier, faster, and more importantly, more enjoyable.

The various servers, APIs, and models are shown in the following architecture diagram and explained in the next sections.

![Architecture](https://challengepost-s3-challengepost.netdna-ssl.com/photos/production/software_photos/001/566/597/datas/gallery.jpg)

### NginX (Wavelength Zone)

This NginX serves as a reverse proxy for incoming requests from the mobile app connected to the 5G carrier network. Its main function is to route the requests (audio or video) to the specific Socket.IO server.

### Socket.IO Audio

The audio from the app is streamed to the Socket.IO server (```Node.JS```) for continuous real-time speech-to-text recognition.

The server uses Voice Activity Detection (VAD) to detect when the user started saying something and when s/he has stopped speaking. The chunks of audio are then streamed continuously to DeepSpeech model (```TensorFlow```), which is a model based on Baidu's Deep Speech research paper. When the user has finished speaking, the detection is then finished and the result is processed to detect which actions should be performed. The detected actions are then returned to the app.

### Socket.IO Video

The video from the app is streamed to the Socket.IO server (```Node.JS```) for continuous real-time image recognition.

This server acts as an API gateway by receiving an incoming image with the current mode and then routing the image for processing in the mode-specific APIs, which are described next.

### Clothing API

The Clothing API was built with ```Python``` and ```Flask```. It uses three machine-learning models for detecting clothes, colors, and patterns:

- Clothing model is ResNet50 pre-trained model with ImageNet and fine-tuned with StreetStyle dataset
- Color model is a CNN model fine-tuned with StreetStyle dataset
- Pattern model is a CNN model fine-tuned with StreetStyle dataset

### Shopping & Objects API

The Shopping & Objects API was built with ```Python``` and ```Flask```. It uses ```Inception V3``` model fine-tuned with ImageNet for detecting objects.

### Menus, Labels, and Numbers API

The Menu, Labels & Numbers API was built with ```Python``` and ```Flask```. It uses ```Tesseract``` OCR model for extracting text from images.

- For the menu mode, only lines with prices are extracted
- For the labels mode, only nouns, adjectives, and brand names are extracted
- For the numbers mode, only numbers are extracted

### Explore API

The Explore API was built with ```Python``` and ```Flask```. It uses CATR (CAption TRansformer) model for generating captions from images. The model has been trained with the COCO (Common Objects in Context) dataset.

### NginX proxy Server (us-east-1 Zone)

The NginX server in the parent region is used to route requests to the Wavelength Zone when the user is not connected to a 5G network.

### Mobile App

The app is a Progressive Web App, which allows the app to be developed in HTML5 and Javascript, but can be added to the users' home Screen (Available from Safari iOS). The audio is synthesized using Text-to-Speech API available in iOS Webkit Javascript API. Video and audio are also capture using APIs available on iOS Webkit Javascript API.

### Audio Flow
![Architecture - Audio flow](https://challengepost-s3-challengepost.netdna-ssl.com/photos/production/software_photos/001/566/598/datas/gallery.jpg)

### Video/Image Flow
![Architecture - Image flow](https://challengepost-s3-challengepost.netdna-ssl.com/photos/production/software_photos/001/566/599/datas/gallery.jpg)

### Infrastructure
![Servers](https://challengepost-s3-challengepost.netdna-ssl.com/photos/production/software_photos/001/566/596/datas/gallery.jpg)


## Challenges we ran into
Testing was a challenge as I didn't have direct access to a 5G network. Therefore I had to setup a proxy in the parent region to allow the mobile app to connect to the Wavelength Zone, which was a bit tricky to setup. Also, it was challenging to incorporate so many different machine learning models and to deal with real-time streaming of video and audio.

## Accomplishments that we're proud of
I'm proud of being able to build such a variety of relevant and complex features in such a short period of time. The developed solution and architecture can be easily extended to include more models and tools in order to help visually impaired people even more.

## What we learned
I have learned a lot in this project, including:

- More advanced AWS configurations and how to use AWS Wavelength Zones
- More in-depth knowledge of 5G
- More advanced image and audio processing
- Improved training/deploying machine learning models skills

## What's next for Around You
- Develop indoor navigation mode for better navigation indoors
- Develop peoples' mode for recognizing peoples face and emotion
