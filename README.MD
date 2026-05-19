# PCB Defect Detection

Sistema distribuído para detecção automática de defeitos em placas de circuito impresso (PCBs) utilizando redes neurais.

## Visão Geral

Este projeto consiste em:

1. **Treinamento de Modelos** — Comparação de 4 arquiteturas de redes neurais (YOLO11, Faster R-CNN, RetinaNet, RT-DETR)
2. **Sistema Web** — Dashboard industrial para análise e monitoramento de defeitos em PCBs

## Arquitetura

| Serviço | Tecnologia | Porta | Descrição |
|---|---|---|---|
| Frontend | React + Vite + TypeScript | 5173 | Interface web (dashboard) |
| Backend | Node.js + Fastify + TypeScript | 3000 | API principal (orquestração) |
| ML Service | Python + FastAPI | 8000 | Inferência dos modelos de ML |
| Database | MySQL 8.0 | 3306 | Armazenamento de dados |

## Pré-requisitos

- [Docker](https://docs.docker.com/get-docker/) e [Docker Compose](https://docs.docker.com/compose/install/)
- [Node.js 24+](https://nodejs.org/) (para desenvolvimento local sem Docker)
- [Python 3.11+](https://www.python.org/) (para desenvolvimento local sem Docker)

### Com Docker (recomendado)

```bash
# 1. Copie o arquivo de variáveis de ambiente
cp .env.example .env

# 2. Suba todos os serviços
docker compose up --build

# 3. Acesse os serviços:
#    Frontend:      http://localhost:5173
#    Backend API:   http://localhost:3000/docs  (Swagger UI)
#    ML Service:    http://localhost:8000/docs  (Swagger UI)
```

### Desenvolvimento Local (sem Docker)

#### Treinamento de Modelos
```bash
# Instale o Miniconda e crie o ambiente
conda env create -f environment.yml
conda activate pcb-defect

# Adicione o Kernel ao Jupyter
python -m ipykernel install --user --name pcb-defect --display-name "Python (pcb-defect)"
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

#### Backend
```bash
cd backend
npm install
npm run dev
```

#### ML Service
```bash
cd ml-service
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Tipos de Defeitos Detectados

| Defeito | Descrição |
|---|---|
| Missing Hole | Furo ausente na placa |
| Mouse Bite | Mordida de rato (borda irregular) |
| Open Circuit | Circuito aberto |
| Short | Curto-circuito |
| Spur | Esporão (protuberância indesejada) |
| Spurious Copper | Cobre espúrio (resíduo de cobre) |
