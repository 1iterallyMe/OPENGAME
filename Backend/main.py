from fastapi import FastAPI, HTTPException
import uvicorn
from pydantic import BaseModel

app = FastAPI()

Games = []

@app.get(
        "/Games",
        tags=["Игры"],
        summary="Получить все игры",
        )
def get_Games():
    return Games

@app.get(
        "/Games/{game_id}",
        tags=["Игры"],
        summary="Получить игру по ID",
        )
def get_game_by_id(game_id: int):
    for game in Games:
        if game["id"] == game_id:
            return game
    raise HTTPException(status_code=404, detail="Game not found")

class NewGame(BaseModel):
    name: str
    linkgame: str
    title: str
    linkimage: str

@app.post(
        "/Games",
        tags=["Игры"],
        summary="Добавить новую игру",
        )
def add_game(newgame: NewGame):
    Games.append({
        "id": len(Games) + 1,
        "namegame": newgame.name,
        "linkgame": newgame.linkgame,
        "title": newgame.title,
        "linkimage": newgame.linkimage,
    })
    return {"success": True , "message": "Игра добавлена"}