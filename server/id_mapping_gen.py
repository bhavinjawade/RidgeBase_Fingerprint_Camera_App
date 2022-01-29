from random import seed
import random
seed(2910)

li = random.sample(range(10000, 99999), 1000)

values = [(i, li[i]) for i in range(0,1000)]
with open("mapping.csv", 'w+') as f:
    for i in values:
        f.write(str(i[0] + 1) + "," + str(i[1]) + "\n")
