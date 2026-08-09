from contextlib import asynccontextmanager

from fastapi import FastAPI
from strawberry.fastapi import GraphQLRouter

from app.db.database import init_db
from app.graphql.schema import schema


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    yield


def create_app() -> FastAPI:
    application = FastAPI(title="Bowling GraphQL", version="0.1.0", lifespan=lifespan)
    application.include_router(GraphQLRouter(schema), prefix="/graphql")
    return application


app = create_app()
