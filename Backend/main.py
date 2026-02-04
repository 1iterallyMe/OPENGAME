from fastapi import FastAPI, Depends
import uvicorn

from pydantic import BaseModel

from sqlalchemy import select
from typing import Annotated
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker , AsyncSession
from sqlalchemy.orm import declarative_base, Mapped, mapped_column 

engine = create_async_engine("sqlite+aiosqlite:///./game.db", echo=True)

new_session = async_sessionmaker(engine, expire_on_commit=False)

app = FastAPI()

async def get_session():
    async with new_session() as session:
        yield session

SessionDep = Annotated[AsyncSession, Depends(get_session)]


Base = declarative_base()

class GameModel(Base):
    __tablename__ = "games"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    namegame: Mapped[str] = mapped_column()
    linkgame: Mapped[str] = mapped_column()
    title: Mapped[str] = mapped_column()
    linkimage: Mapped[str] = mapped_column()

@app.post("/setup_database")
async def setup_database():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    return {"ok": True}

class GameAddSchema(BaseModel):
    namegame: str
    linkgame: str
    title: str
    linkimage: str

class GameSchema(GameAddSchema):
    id:int

@app.post("/Games" )
async def add_game(data: GameAddSchema, session: SessionDep):
    new_game = GameModel(
        namegame=data.namegame,
        linkgame=data.linkgame,
        title=data.title,
        linkimage=data.linkimage
    )
    session.add(new_game)
    await session.commit()
    return {"ok": True}


@app.get("/Games")
async def get_games(session: SessionDep):
    query = select(GameModel)
    result = await session.execute(query)
    return result.scalars().all()