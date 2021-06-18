source env/bin/activate

pm2 start objects.py --interpreter python3 --name objects
pm2 start clothing.py --interpreter python3 --name clothing
pm2 start explore.py --interpreter python3 --name explore
pm2 start ocr.py --interpreter python3 --name ocr
pm2 start navigation.py --interpreter python3 --name navigation

cd socket-image-server 
pm2 start server.js --name socket-image
cd ..

cd socket-audio-server 
pm2 start server.js --name socket-audio
cd ..