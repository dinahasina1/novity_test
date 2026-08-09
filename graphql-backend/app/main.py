from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.db.database import init_db


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    yield


def create_app() -> FastAPI:
    application = FastAPI(title="Bowling GraphQL", version="0.1.0", lifespan=lifespan)
    return application


app = create_app()
