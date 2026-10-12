# Presupuesto de Infraestructura y Plan de QA

## 1. Presupuesto Mensual Estimado (Producción Básica)
- **Servidor WebSockets/Backend (AWS ECS Fargate):** $15.00 USD (1 vCPU, 2GB RAM).
- **Base de Datos Gestionada (AWS RDS PostgreSQL):** $12.00 USD (db.t4g.micro, Multi-AZ desactivado).
- **Hosting Frontend (Firebase Hosting):** $0.00 USD (Capa gratuita - Capacidad de transferencia excedente a $0.08 por GB).
- **Redis Cloud (Elasticache):** $6.00 USD (Capa cache para Pub/Sub horizontal).
- **Costo Total Estimado:** **$33.00 USD / mes**.

## 2. Estrategia de Control de Calidad
- **Pruebas Unitarias:** Cobertura de lógica del canvas y serialización de trazos con Jest.
- **Pruebas de Integración:** Conexión y broadcast asíncrono con Socket.IO Mock.
- **Pruebas de Carga:** Simulación de 500 usuarios concurrentes dibujando simultáneamente usando Autocannon.