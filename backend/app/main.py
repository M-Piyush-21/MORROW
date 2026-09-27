from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.config import settings
from backend.app.routers import (
    dashboard,
    forecasts,
    health,
    model,
    products,
    restock,
)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Backend API for Morrow: Retail demand forecasting, inventory optimization, and MLOps model serving.",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# CORS Middleware - allow all in cloud deployments
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers under /api (standard)
app.include_router(health.router, prefix=settings.API_V1_PREFIX)
app.include_router(dashboard.router, prefix=settings.API_V1_PREFIX)
app.include_router(products.router, prefix=settings.API_V1_PREFIX)
app.include_router(forecasts.router, prefix=settings.API_V1_PREFIX)
app.include_router(restock.router, prefix=settings.API_V1_PREFIX)
app.include_router(model.router, prefix=settings.API_V1_PREFIX)

# Also register routers at root in case reverse proxy (Vercel) strips /api prefix
app.include_router(health.router)
app.include_router(dashboard.router)
app.include_router(products.router)
app.include_router(forecasts.router)
app.include_router(restock.router)
app.include_router(model.router)


@app.get("/")
@app.get("/api")
def root():
    return {
        "project": "Morrow",
        "tagline": "A little ahead of demand.",
        "status": "operational",
        "api_docs": "/api/docs",
        "health_check": "/api/health",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
