# RidgeBase Fingerprint Acquistion Mobile App

This repository consists of the contactless fingerprint acquisition app used to acquire the [RidgeBase Dataset](https://www.buffalo.edu/cubs/research/datasets/ridgebase-benchmark-dataset.html)

The repository consists of a front-end application built using React Expo and back-end built on python flask. The front-end sends the acquired image to the backend for storage and no image is store on the local device. Details of the app can be found in this [WIFS 2021 paper](https://ieeexplore.ieee.org/document/9648393).

## Instructions:
1. Clone the repository
2. Start the client app:
```cmd
cd client
npm start or expo start
```
3. Start the server app:
```cmd
cd server
python3 api.py
```
4. Insert the server address endpoint in the client code: `App.tsx`
5. Generate a id mapping file comma separated and replace it with mapping.csv in server folder.

## Citation

If you use RidgeBase dataset or the acquistion app in your research please cite following research papers:

```
B. Jawade, D. Mohan, S. Setlur, N. Ratha and V. Govindaraju
"RidgeBase: A Cross-Sensor Multi-Finger Contactless Fingerprint
Dataset," 2022 IEEE International Joint Conference on Biometrics
(IJCB), 2022
```

```
B. Jawade, A. Agarwal, S. Setlur and N. Ratha, "Multi Loss Fusion For Matching Smartphone Captured Contactless Finger Images," 2021 IEEE International Workshop on Information Forensics and Security (WIFS), 2021, pp. 1-6, doi:10.1109/WIFS53200.2021.9648393.
```


