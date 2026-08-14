from fastapi import FastAPI, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.routers import auth, jobs

app = FastAPI(title="Job Application Tracker API")

app.include_router(auth.router)
app.include_router(jobs.router)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Pydantic validation failures (bad input) come back as 422 by default;
    the spec calls for 400, so we normalize it here.

    jsonable_encoder is required (not a raw dict) because pydantic-core
    populates each error's "ctx" with the original exception instance when a
    custom @field_validator raises a plain ValueError/AssertionError, and
    that instance is not JSON-serializable on its own.
    """
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content=jsonable_encoder({"detail": exc.errors()}),
    )


@app.get("/health", tags=["health"])
def health_check():
    return {"status": "ok"}
