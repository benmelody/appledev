FROM node:18-bullseye

# Cài đặt các công cụ biên dịch zsign trên Linux
RUN apt-get update && apt-get install -y \
    git \
    g++ \
    make \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Tải và biên dịch zsign tự động
RUN git clone https://github.com/zhlynn/zsign.git /tmp/zsign \
    && cd /tmp/zsign/build/linux \
    && make \
    && cp ../bin/zsign /usr/local/bin/zsign \
    && rm -rf /tmp/zsign

WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .

EXPOSE 3000
CMD ["node", "server.js"]
