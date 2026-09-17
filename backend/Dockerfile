# このDockerfileはリポジトリルートをビルドコンテキストとして実行する(app/とbackend/両方を参照するため)。
#   docker build -f backend/Dockerfile -t <tag> .

# --- frontend build stage ---
# フロントエンドのビルド成果物をSpring Bootのstaticリソースとして同梱し、
# EC2 1台でフロントエンド画面とAPIの両方を配信できるようにする(Phase 1はS3/CloudFrontを使わない)。
FROM node:22-alpine AS frontend-build
WORKDIR /app

COPY app/package.json app/package-lock.json ./
RUN npm ci

COPY app/ ./
# 同一オリジンから配信するため相対パスでAPIを呼ぶ(CORS設定不要)
ENV VITE_API_BASE_URL=""
RUN npm run build

# --- backend build stage ---
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /workspace

COPY backend/pom.xml .
RUN mvn -B dependency:go-offline

COPY backend/src ./src
COPY --from=frontend-build /app/dist ./src/main/resources/static
RUN mvn -B -DskipTests package

# --- runtime stage ---
FROM eclipse-temurin:21-jre
WORKDIR /app

COPY --from=build /workspace/target/*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
