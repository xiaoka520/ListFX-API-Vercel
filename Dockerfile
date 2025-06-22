# Dockerfile
FROM vercel/php:8.2

# 修复 libssl 依赖问题
RUN apt-get update && \
    apt-get install -y libssl1.1 && \
    ln -s /usr/lib/x86_64-linux-gnu/libssl.so.1.1 /usr/lib/x86_64-linux-gnu/libssl.so.10 && \
    ln -s /usr/lib/x86_64-linux-gnu/libcrypto.so.1.1 /usr/lib/x86_64-linux-gnu/libcrypto.so.10

# 复制项目文件
COPY . /var/task
