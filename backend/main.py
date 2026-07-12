import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from api.routes import router
from auth.routes import router as auth_router

app = FastAPI()

# Local dev origins are always allowed. Add the deployed frontend by setting
# FRONTEND_ORIGIN (comma-separated for more than one, e.g. a preview + prod URL).
ALLOWED_ORIGINS = ["http://localhost:3000", "http://localhost:3001"] + [
    o.strip() for o in os.getenv("FRONTEND_ORIGIN", "").split(",") if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """Return crashes as JSON WITH CORS headers.

    Without this, an unhandled exception produces a bare 500 that lacks
    Access-Control-Allow-Origin, so the browser reports a misleading CORS
    error instead of the real failure.
    """
    origin = request.headers.get("origin", "")
    headers = {}
    if origin in ALLOWED_ORIGINS:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {type(exc).__name__}"},
        headers=headers,
    )


app.include_router(auth_router)
app.include_router(router)
